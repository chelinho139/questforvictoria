/**
 * The game's English text, found in the source, against the translations in src/i18n/<lang>/.
 *
 *   npm run i18n                      what is still missing in Spanish, area by area
 *   npm run i18n -- --lang es --skeleton quests
 *                                     add the missing keys of one area to src/i18n/es/quests.json
 *                                     (empty, for a translator to fill in; existing ones are kept)
 *   npm run i18n -- --list ui         every string found in an area, with where it is
 *
 * It reads the TypeScript with the compiler's parser and keeps what looks like words for a
 * person: string literals with a space or a capital, template literals (each ${…} becomes
 * {0}, {1}…, the way src/i18n templates are written) and 'a' + b + 'c' chains. HTML in a
 * template is split at its tags into the text runs the screen shows. It finds most of the
 * game's text, not all of it, and some of what it finds is never shown: translators read
 * the code around each string (see --list) and add or drop keys by hand. In the browser,
 * qfvI18n.missing() lists what reached the screen untranslated.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(__dirname, '..', '..');

/** Which source files each dictionary file (src/i18n/<lang>/<area>.json) covers. */
export const AREAS: Record<string, string[]> = {
  names: [],
  quests: ['src/data/quests.ts'],
  npcs: ['src/data/npcs.ts', 'src/data/companions.ts'],
  story: ['src/data/scenes.ts', 'src/data/docs.ts', 'src/data/story.ts'],
  world: ['src/data/regions/*.ts', 'src/data/props.ts', 'src/data/trees.ts'],
  items: ['src/data/items.ts', 'src/data/crafting.ts', 'src/data/enemies.ts', 'src/data/classes.ts'],
  skills: ['src/data/talents.ts', 'src/data/spells.ts', 'src/data/skills.ts', 'src/data/actionBar.ts'],
  sim: ['src/sim/*.ts', 'src/net/*.ts', 'src/server/*.ts'],
  ui: [
    'src/phaser/ui/*.ts',
    'src/phaser/scenes/*.ts',
    'src/phaser/render/splash.ts',
    'src/phaser/render/DayDial.ts',
    'src/phaser/render/WorldRenderer.ts',
    'src/phaser/*.ts',
    'src/data/music.ts',
  ],
  settings: ['src/phaser/dev/DevMenu.ts', 'src/phaser/render/art.ts'],
};

function files(globs: string[]): string[] {
  const out: string[] = [];
  for (const g of globs) {
    const dir = path.join(ROOT, path.dirname(g));
    const base = path.basename(g);
    if (!base.includes('*')) {
      out.push(path.join(ROOT, g));
      continue;
    }
    const re = new RegExp('^' + base.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    for (const f of fs.readdirSync(dir).sort()) if (re.test(f)) out.push(path.join(dir, f));
  }
  return out;
}

/** Calls whose string arguments are names for the code, never words on the screen. */
const CODE_CALLS = new Set([
  'querySelector',
  'querySelectorAll',
  'getElementById',
  'createElement',
  'addEventListener',
  'removeEventListener',
  'setAttribute',
  'getAttribute',
  'removeAttribute',
  'getItem',
  'setItem',
  'removeItem',
  'on',
  'off',
  'once',
  'emit',
  'get',
  'set',
  'has',
  'add',
  'remove',
  'toggle',
  'contains',
  'includes',
  'startsWith',
  'endsWith',
  'split',
  'replace',
  'test',
  'match',
  'require',
  'load',
  'image',
  'exists',
  'getContext',
  'fetch',
  'sound',
  'hear',
  'play',
  'flag',
  'hasFlag',
  'setFlag',
  'cry',
  'scene',
  'playScene',
]);

/** Does a plain string look like words for a person? */
function texty(s: string): boolean {
  if (!/[A-Za-z]/.test(s)) return false;
  if (!/\s/.test(s) && s.length > 15) return false; // map rows, data
  if (/^[a-z0-9_\-:.\/#@*]+$/.test(s)) return false; // ids, keys, paths
  if (/^#[0-9a-f]{3,8}$/i.test(s) || /rgba?\(|hsla?\(/.test(s)) return false;
  if (/^\d+px|^bold \d|^normal \d|\d+px ['"A-Z]/.test(s)) return false; // fonts
  if (/^[\w-]+(\s[\w-]+)*$/.test(s) && /-/.test(s) && !/[A-Z]/.test(s)) return false; // css classes
  if (/^[a-z]+(-[a-z]+)*(\s[a-z]+(-[a-z]+)*)*$/.test(s) && s.split(' ').every(w => /-/.test(w))) return false;
  if (/[;{}]/.test(s) && /:/.test(s)) return false; // css
  if (/^https?:|^\/\w|\.(png|json|ogg|mp3|html|ts|js)$/.test(s)) return false;
  return /\s/.test(s) || /^[A-Z¡¿]/.test(s) || /[.!?…]$/.test(s);
}

/** The text runs of an HTML fragment (its tags and entities taken out). */
function htmlRuns(s: string): string[] {
  if (!/<[a-z/!]/i.test(s)) return [s];
  return s
    .split(/<[^>]*>/)
    .map(x => x.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"))
    .map(x => x.replace(/\s+/g, ' ').trim())
    .filter(x => x && /[A-Za-z]/.test(x.replace(/\{\d+\}/g, '')));
}

/** Number a template's holes from {0} again (a run cut out of a longer template). */
function renumber(s: string): string {
  let i = 0;
  const seen = new Map<string, number>();
  return s.replace(/\{(\d+)\}/g, (_, n: string) => {
    if (!seen.has(n)) seen.set(n, i++);
    return `{${seen.get(n)}}`;
  });
}

export interface Found {
  text: string;
  file: string;
  line: number;
}

function callName(n: ts.Node): string | null {
  if (!ts.isCallExpression(n) && !ts.isNewExpression(n)) return null;
  const e = n.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return null;
}

/** Is this literal somewhere only the code reads it? */
function codeOnly(n: ts.Node): boolean {
  const p = n.parent;
  if (!p) return false;
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p) || ts.isExternalModuleReference(p)) return true;
  if (ts.isPropertyAssignment(p) && p.name === n) return true;
  if (ts.isElementAccessExpression(p) && p.argumentExpression === n) return true;
  if (ts.isCaseClause(p)) return true;
  if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.InKeyword].includes(p.operatorToken.kind)) return true;
  const call = callName(p);
  const callee = ts.isCallExpression(p) ? p.expression : null;
  if (callee && ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === 'console') return true;
  if (call && CODE_CALLS.has(call) && (p as ts.CallExpression).arguments?.[0] === n) return true;
  if (call === 'el' && (p as ts.CallExpression).arguments.indexOf(n as ts.Expression) < 2) return true; // el(tag, class, text)
  return false;
}

/** Flatten a + b + c into its parts. */
function plusParts(n: ts.Expression): ts.Expression[] {
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken) return [...plusParts(n.left), ...plusParts(n.right)];
  if (ts.isParenthesizedExpression(n)) {
    const inner = n.expression;
    if (ts.isBinaryExpression(inner) && inner.operatorToken.kind === ts.SyntaxKind.PlusToken) return plusParts(inner);
  }
  return [n];
}
const isStr = (n: ts.Node): n is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral => ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n);

export function extract(file: string): Found[] {
  const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const out: Found[] = [];
  const done = new Set<ts.Node>();
  const rel = path.relative(ROOT, file);
  const push = (text: string, at: ts.Node) => {
    for (const run of htmlRuns(text)) {
      const r = renumber(run);
      if (!/[A-Za-z]/.test(r.replace(/\{\d+\}/g, ''))) continue;
      if (!r.includes('{') && !texty(r)) continue;
      out.push({ text: r, file: rel, line: src.getLineAndCharacterOfPosition(at.getStart()).line + 1 });
    }
  };
  const visit = (n: ts.Node): void => {
    if (done.has(n)) return;
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken && !(ts.isBinaryExpression(n.parent) && n.parent.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
      const parts = plusParts(n);
      if (parts.some(isStr)) {
        let i = 0;
        const text = parts.map(p => (isStr(p) ? p.text : `{${i++}}`)).join('');
        if (/[A-Za-z]{2,}/.test(text.replace(/\{\d+\}/g, '')) && !codeOnly(n)) {
          parts.filter(isStr).forEach(p => done.add(p));
          if (/\s/.test(text.replace(/\{\d+\}/g, ''))) push(text, n);
        }
      }
    }
    if (isStr(n) && !done.has(n)) {
      if (!codeOnly(n) && texty(n.text)) push(n.text, n);
    } else if (ts.isTemplateExpression(n)) {
      const text = n.head.text + n.templateSpans.map((sp, i) => `{${i}}` + sp.literal.text).join('');
      if (!codeOnly(n)) push(text, n);
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
  return out;
}

export function areaStrings(area: string): Found[] {
  const seen = new Set<string>();
  const out: Found[] = [];
  for (const f of files(AREAS[area] ?? [])) for (const s of extract(f)) if (!seen.has(s.text)) (seen.add(s.text), out.push(s));
  return out;
}

function dictFile(lang: string, area: string): string {
  return path.join(ROOT, 'src', 'i18n', lang, area + '.json');
}

function readDict(file: string): Record<string, string> {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

function allDicts(lang: string): Record<string, string> {
  const dir = path.join(ROOT, 'src', 'i18n', lang);
  const all: Record<string, string> = {};
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) Object.assign(all, readDict(path.join(dir, f)));
  return all;
}

function main(): void {
  const args = process.argv.slice(2);
  const opt = (k: string) => {
    const i = args.indexOf(k);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const lang = opt('--lang') ?? 'es';
  const list = opt('--list');
  if (list) {
    for (const s of areaStrings(list)) console.log(`${s.file}:${s.line}\t${JSON.stringify(s.text)}`);
    return;
  }
  const skel = opt('--skeleton');
  if (skel) {
    const file = dictFile(lang, skel);
    const dict = readDict(file);
    const known = allDicts(lang);
    let added = 0;
    for (const s of areaStrings(skel)) {
      if (s.text in dict) continue;
      dict[s.text] = known[s.text] ?? '';
      added++;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(dict, null, 2) + '\n');
    console.log(`${path.relative(ROOT, file)}: ${added} added, ${Object.keys(dict).length} in all`);
    return;
  }
  const known = allDicts(lang);
  let missing = 0;
  for (const area of Object.keys(AREAS)) {
    const found = areaStrings(area);
    const miss = found.filter(s => !known[s.text]);
    missing += miss.length;
    if (!found.length) continue;
    console.log(`${area}: ${found.length - miss.length}/${found.length} translated`);
    for (const s of miss.slice(0, 40)) console.log(`  ${s.file}:${s.line}  ${JSON.stringify(s.text)}`);
    if (miss.length > 40) console.log(`  … and ${miss.length - 40} more (--list ${area})`);
  }
  console.log(missing ? `${missing} strings found in the source have no ${lang} translation.` : `Everything found has a ${lang} translation.`);
}

if (require.main === module) main();
