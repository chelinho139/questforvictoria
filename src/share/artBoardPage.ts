/**
 * Standalone, shareable art board (no game engine): the same forest drawn in every candidate
 * style, with favourites and notes a reviewer can copy back as one message. Built into a
 * single HTML file by tools/build-art-board.js.
 */
import type { StyleKit } from '../phaser/render/styles/common';
import { VARIANT_KITS } from '../phaser/render/styles/abstractVariants';
import { ABSTRACT_STYLE_KITS } from '../phaser/render/styles/abstractStyles';
import { SILHOUETTE_ROUND, SILHOUETTE_ROWS, SILHOUETTE_SET_ASIDE, SHORTLIST, SHORTLIST_VARIANTS } from '../phaser/render/styles/silhouetteRound';
import { build, drawLineup, drawScene, K, LINE_W, LINE_H, SCENE_W, SCENE_H } from '../phaser/dev/styleBoard';
import type { Built } from '../phaser/dev/styleBoard';

interface Group {
  id: string;
  title: string;
  blurb: string;
  kits: StyleKit[];
  /** Where the group sits: the open view (default), the collapsed full round, or earlier rounds. */
  where?: 'round' | 'earlier';
}

// the current round: Silhouette, one row per axis
const CURRENT = [...SILHOUETTE_ROUND, ...SHORTLIST, ...SHORTLIST_VARIANTS];
const inCurrent = new Set(CURRENT.map(k => k.id));
const TOP = new Set(VARIANT_KITS.map(k => k.id));
const GROUPS: Group[] = [
  {
    id: 'shortlist',
    title: 'Shortlist',
    blurb: 'The favourites plus D2, the detailed traveller: the eight looks still in the running.',
    kits: SHORTLIST,
  },
  {
    id: 'variants',
    title: 'New variants',
    blurb: 'Six new looks built only from the shortlist: the cute and abstract characters in the Ink and Rich palettes, and the big hooded head redrawn at D2’s level of detail.',
    kits: SHORTLIST_VARIANTS,
  },
  {
    id: 'cute',
    title: 'Cute',
    blurb: 'Cute RPG proportions. S1 is 2.5 heads tall; S1b and S1c go shorter, with the head about half the height, as in classic overworld sprites.',
    kits: SILHOUETTE_ROWS.cute,
    where: 'round',
  },
  {
    id: 'big-head',
    title: 'Big head, small body',
    blurb: 'Short and cute without being wide: a big round head, more than half the height, on a slim three-pixel body with short legs.',
    kits: SILHOUETTE_ROWS.bigHead,
    where: 'round',
  },
  {
    id: 'slim-cute',
    title: 'Slim cute',
    blurb: 'A slightly smaller head with dot eyes on a narrow body and thin legs, about 2.5 heads tall.',
    kits: SILHOUETTE_ROWS.slim,
    where: 'round',
  },
  { id: 'young', title: 'Young', blurb: 'A youthful adventurer at 3 heads tall: head, torso and legs about a third each, in three outfits.', kits: SILHOUETTE_ROWS.young, where: 'round' },
  { id: 'abstract', title: 'Abstract', blurb: 'Figures built from separate floating blocks, with no arms. The variants push it toward cute and toward 3-head proportions.', kits: SILHOUETTE_ROWS.abstract, where: 'round' },
  { id: 'colour', title: 'Colour', blurb: 'The original Silhouette character with only the palette changed. Same forest, same daylight.', kits: SILHOUETTE_ROWS.colour, where: 'round' },
  { id: 'detail', title: 'Detail', blurb: 'The original (about 4 heads tall) next to two versions with twice as many pixels: more shading, folds, gear and textured ground.', kits: SILHOUETTE_ROWS.detail, where: 'round' },
  {
    id: 'set-aside',
    title: 'Round 4: shapes set aside',
    blurb: 'Stretched, caped drifter and scout, from the previous pass on shapes.',
    kits: SILHOUETTE_SET_ASIDE,
    where: 'earlier',
  },
  {
    id: 'round-3',
    title: 'Round 3: variants',
    blurb: 'Variants of the three styles picked from round 2, including cute takes.',
    kits: VARIANT_KITS.filter(k => !inCurrent.has(k.id)),
    where: 'earlier',
  },
  {
    id: 'round-2',
    title: 'Round 2: other styles',
    blurb: 'The other styles from round 2, set aside.',
    kits: ABSTRACT_STYLE_KITS.filter(k => !TOP.has(k.id) && !inCurrent.has(k.id)),
    where: 'earlier',
  },
];

// ------------------------------------------------------------ labels
function label(kit: StyleKit): { code: string; title: string; tag: string } {
  const [code, rest = ''] = kit.name.split(' · ');
  const title = rest.includes(': ') ? rest.slice(rest.indexOf(': ') + 2) : rest;
  // current-round titles already say what they are; only the original gets a tag there
  const tag = inCurrent.has(kit.id)
    ? /^\d$/.test(code) ? 'Current' : ''
    : /cute/i.test(rest) ? 'Cute' : /^\d$/.test(code) && TOP.has(kit.id) ? 'Original' : '';
  return { code, title: title.charAt(0).toUpperCase() + title.slice(1), tag };
}

// ------------------------------------------------------------ feedback state (per viewer draft)
interface State {
  name: string;
  picks: string[];
  notes: Record<string, string>;
  overall: string;
}
const KEY = 'qfv-art-board-feedback';
const state: State = load();
function load(): State {
  const blank: State = { name: '', picks: [], notes: {}, overall: '' };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...blank, ...JSON.parse(raw) } : blank;
  } catch {
    return blank;
  }
}
function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private window or blocked storage: the draft just isn't remembered */
  }
}

const kitById = new Map<string, StyleKit>();
GROUPS.forEach(g => g.kits.forEach(k => kitById.set(k.id, k)));
const named = (id: string) => {
  const k = kitById.get(id);
  if (!k) return id;
  const l = label(k);
  return `${l.code} ${l.title}`;
};

function summary(): string {
  const lines = ['Quest For Victoria art feedback' + (state.name.trim() ? ` from ${state.name.trim()}` : '')];
  lines.push('', 'Favourites: ' + (state.picks.length ? state.picks.map(named).join(', ') : 'none yet'));
  const notes = Object.entries(state.notes).filter(([, v]) => v.trim());
  if (notes.length) {
    lines.push('', 'Notes:');
    for (const [id, v] of notes) lines.push(`- ${named(id)}: ${v.trim()}`);
  }
  if (state.overall.trim()) lines.push('', 'Overall:', state.overall.trim());
  return lines.join('\n');
}

// ------------------------------------------------------------ DOM
const $ = <T extends Element>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

const built: { b: Built; card: HTMLElement; visible: boolean }[] = [];
// a look can appear in more than one group (the favourites), so controls are kept per look id
const starButtons = new Map<string, HTMLButtonElement[]>();
const noteFields = new Map<string, HTMLTextAreaElement[]>();
const push = <T>(m: Map<string, T[]>, id: string, v: T) => m.set(id, [...(m.get(id) ?? []), v]);
const commentButtons: HTMLButtonElement[] = [];

function renderGroups(): void {
  const main = $<HTMLElement>('#groups');
  const round = $<HTMLElement>('#round');
  const earlier = $<HTMLElement>('#earlier');
  const nav = $<HTMLElement>('#jump');
  for (const g of GROUPS) {
    const sec = el('section', 'family');
    sec.id = g.id;
    const head = el('header', 'family-head');
    head.append(el('h2', '', g.title), el('p', 'family-count', `${g.kits.length} looks`), el('p', 'family-blurb', g.blurb));
    const grid = el('div', 'grid');
    for (const kit of g.kits) grid.append(card(kit, g.id));
    sec.append(head, grid);
    (g.where === 'earlier' ? earlier : g.where === 'round' ? round : main).append(sec);
    if (g.where) continue;
    const a = el('a', '', g.title);
    a.href = '#' + g.id;
    nav.append(a);
  }
  const count = (where: Group['where']) => GROUPS.filter(g => g.where === where).reduce((n, g) => n + g.kits.length, 0);
  $<HTMLElement>('#round-count').textContent = `all ${count('round')} looks of the Silhouette round, row by row`;
  $<HTMLElement>('#earlier-count').textContent = `${count('earlier')} looks we explored before this round`;
  const full = el('a', '', 'Full round');
  full.href = '#full-round';
  full.addEventListener('click', () => (($<HTMLDetailsElement>('#full-round').open = true)));
  nav.append(full);
  const back = el('a', '', 'Earlier rounds');
  back.href = '#earlier-rounds';
  back.addEventListener('click', () => (($<HTMLDetailsElement>('#earlier-rounds').open = true)));
  nav.append(back);
}

function card(kit: StyleKit, group: string): HTMLElement {
  const l = label(kit);
  const c = el('article', 'card');
  c.id = `look-${group}-${kit.id}`;
  const art = el('div', 'art');
  const line = el('canvas');
  line.width = LINE_W * K;
  line.height = LINE_H * K;
  line.setAttribute('aria-label', `${l.title}: hero, cow and slime close up`);
  const scene = el('canvas');
  scene.width = SCENE_W * K;
  scene.height = SCENE_H * K;
  scene.setAttribute('aria-label', `${l.title}: the forest scene`);
  art.append(line, scene);

  const meta = el('div', 'meta');
  const h = el('h3');
  h.append(el('span', 'code', l.code), document.createTextNode(l.title));
  if (l.tag) h.append(el('span', 'tag', l.tag));
  const blurb = el('p', 'blurb', kit.blurb);

  const actions = el('div', 'actions');
  const star = el('button', 'star');
  star.type = 'button';
  star.addEventListener('click', () => {
    const i = state.picks.indexOf(kit.id);
    if (i >= 0) state.picks.splice(i, 1);
    else state.picks.push(kit.id);
    save();
    refresh();
  });
  push(starButtons, kit.id, star);
  const comment = el('button', 'ghost', 'Comment');
  comment.type = 'button';
  comment.hidden = true;
  comment.addEventListener('click', () => void openComment(c));
  commentButtons.push(comment);
  actions.append(star, comment);

  const noteId = `note-${group}-${kit.id}`;
  const noteLabel = el('label', 'note-label', 'Note');
  noteLabel.htmlFor = noteId;
  const note = el('textarea', 'note');
  note.id = noteId;
  note.rows = 2;
  note.placeholder = 'What works, what doesn’t?';
  note.value = state.notes[kit.id] ?? '';
  note.addEventListener('input', () => {
    state.notes[kit.id] = note.value;
    for (const other of noteFields.get(kit.id) ?? []) if (other !== note) other.value = note.value;
    save();
    refresh();
  });
  push(noteFields, kit.id, note);

  meta.append(h, blurb, actions, noteLabel, note);
  c.append(art, meta);
  built.push({ b: build(kit, line, scene), card: c, visible: true });
  return c;
}

function refresh(): void {
  for (const [id, buttons] of starButtons) {
    const on = state.picks.includes(id);
    for (const b of buttons) {
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? '★ Favourite' : '☆ Favourite';
      b.closest('.card')?.classList.toggle('picked', on);
    }
  }
  const notes = Object.values(state.notes).filter(v => v.trim()).length;
  const n = state.picks.length;
  $<HTMLElement>('#tally').textContent = `${n} favourite${n === 1 ? '' : 's'} · ${notes} note${notes === 1 ? '' : 's'}`;
  $<HTMLTextAreaElement>('#summary').value = summary();
}

// ------------------------------------------------------------ copy
async function copy(status: HTMLElement): Promise<void> {
  const text = summary();
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = 'Copied. Paste it into your reply.';
  } catch {
    const area = $<HTMLTextAreaElement>('#summary');
    area.focus();
    area.select();
    status.textContent = 'Copy was blocked here. The text is selected below: press Ctrl+C or ⌘C.';
    document.getElementById('feedback')?.scrollIntoView({ behavior: 'smooth' });
  }
}

// ------------------------------------------------------------ comments (only where the viewer offers them)
interface ClaudeHost {
  use(name: string): Promise<unknown>;
}
interface CommentsNs {
  openComposer(target: { element: Element }): Promise<{ opened: boolean }>;
}
let comments: CommentsNs | null = null;
async function openComment(target: Element): Promise<void> {
  if (!comments) return;
  try {
    await comments.openComposer({ element: target });
  } catch {
    /* composer unavailable in this view; notes still work */
  }
}
function lightUpComments(): void {
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  if (!host?.use) return;
  host
    .use('comments')
    .then(ns => {
      if (!ns) return;
      comments = ns as CommentsNs;
      commentButtons.forEach(b => (b.hidden = false));
    })
    .catch(() => {});
}

// ------------------------------------------------------------ animation
function animate(): void {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame = 0;
  const draw = (all = false) => {
    for (const x of built)
      if (all || x.visible) {
        drawLineup(x.b, frame);
        drawScene(x.b, frame);
      }
  };
  draw(true);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        const x = built.find(b => b.card === e.target);
        if (x) x.visible = e.isIntersecting;
      }
    });
    built.forEach(x => io.observe(x.card));
  }
  if (still) return;
  window.setInterval(() => {
    frame++;
    draw();
  }, 300);
}

// ------------------------------------------------------------ boot
function boot(): void {
  renderGroups();
  const name = $<HTMLInputElement>('#reviewer');
  name.value = state.name;
  name.addEventListener('input', () => {
    state.name = name.value;
    save();
    refresh();
  });
  const overall = $<HTMLTextAreaElement>('#overall');
  overall.value = state.overall;
  overall.addEventListener('input', () => {
    state.overall = overall.value;
    save();
    refresh();
  });
  const status = $<HTMLElement>('#copy-status');
  const barStatus = $<HTMLElement>('#bar-status');
  $<HTMLButtonElement>('#copy').addEventListener('click', () => void copy(status));
  $<HTMLButtonElement>('#bar-copy').addEventListener('click', () => void copy(barStatus));
  refresh();
  animate();
  lightUpComments();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
