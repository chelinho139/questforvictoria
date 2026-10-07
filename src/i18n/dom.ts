import Phaser from 'phaser';
import { t, onLang, getLang, setLang, detectLang, missing } from './index';
import type { Lang } from './index';

/**
 * The browser's half of the translation (see README.md): the game writes English, and
 * this puts every bit of it on screen in the player's language.
 *
 * - Phaser texts: `Text.setText` translates what it is given (a text that should stay as it
 *   is, a player's name, sets `noTranslate`).
 * - The page (every window is HTML): a MutationObserver translates each text node and the
 *   attributes below as they appear or change, except inside `translate="no"`.
 *
 * Each remembers its English, so switching language translates everything on screen again.
 */
const ATTRS = ['title', 'placeholder', 'aria-label', 'data-label'];

interface Done {
  src: string;
  out: string;
}
const texts = new WeakMap<Text, Done>();
const attrs = new WeakMap<Element, Map<string, Done>>();

function leftAlone(el: Element | null): boolean {
  return !el || !!el.closest('script, style, textarea, [translate="no"]');
}

/** Translate a text node, unless what it holds is our own translation already. */
function text(n: Text, again = false): void {
  const done = texts.get(n);
  const cur = n.data;
  if (done && cur === done.out && !again) return;
  if (leftAlone(n.parentElement)) return;
  const src = done && cur === done.out ? done.src : cur;
  const out = t(src);
  texts.set(n, { src, out });
  if (out !== cur) n.data = out;
}

function attr(el: Element, name: string, again = false): void {
  const cur = el.getAttribute(name);
  if (cur === null) return;
  let map = attrs.get(el);
  const done = map?.get(name);
  if (done && cur === done.out && !again) return;
  if (leftAlone(el)) return;
  const src = done && cur === done.out ? done.src : cur;
  const out = t(src);
  if (!map) attrs.set(el, (map = new Map()));
  map.set(name, { src, out });
  if (out !== cur) el.setAttribute(name, out);
}

/** Everything under `root`. */
function walk(root: Node, again = false): void {
  if (root.nodeType === Node.TEXT_NODE) return text(root as Text, again);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (leftAlone(el)) return;
  for (const a of ATTRS) if (el.hasAttribute(a)) attr(el, a, again);
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) text(n as Text, again);
    else for (const a of ATTRS) if ((n as Element).hasAttribute(a)) attr(n as Element, a, again);
  }
}

type Translatable = Phaser.GameObjects.Text & { i18nSrc?: string | string[]; noTranslate?: boolean };

function patchPhaser(): void {
  const proto = Phaser.GameObjects.Text.prototype as Translatable;
  const setText = proto.setText;
  proto.setText = function (this: Translatable, value: string | string[]) {
    this.i18nSrc = value;
    if (this.noTranslate || getLang() === 'en') return setText.call(this, value);
    const out = typeof value === 'string' ? t(value) : Array.isArray(value) ? value.map(v => (typeof v === 'string' ? t(v) : v)) : value;
    return setText.call(this, out);
  };
}

/** Set every Phaser text again from its English. */
function phaserAgain(game: Phaser.Game): void {
  const visit = (list: Phaser.GameObjects.GameObject[]) => {
    for (const o of list) {
      if (o instanceof Phaser.GameObjects.Text) {
        const tx = o as Translatable;
        if (tx.i18nSrc !== undefined) tx.setText(tx.i18nSrc);
      } else if (o instanceof Phaser.GameObjects.Container) visit(o.list);
    }
  };
  for (const s of game.scene.getScenes(false)) visit(s.children.list);
  // labels are laid out by their width: let every scene lay out again
  game.scale.refresh();
}

/** Leave this text as it is in every language (a player's name). */
export function keepAsIs<T extends Phaser.GameObjects.Text>(text: T): T {
  (text as Translatable).noTranslate = true;
  return text;
}

let game: Phaser.Game | null = null;

/**
 * Start translating: the language from before (or the computer's), Phaser's texts, and the
 * page. Call before the game is made.
 */
export function startTranslating(): void {
  setLang(detectLang(), false);
  patchPhaser();
  walk(document.body);
  new MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'characterData') text(r.target as Text);
      else if (r.type === 'attributes') attr(r.target as Element, r.attributeName!);
      else r.addedNodes.forEach(n => walk(n));
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  onLang(() => {
    walk(document.body, true);
    if (game) phaserAgain(game);
  });
  // for poking at from the console: qfvI18n.missing() lists what showed untranslated
  (window as unknown as { qfvI18n: unknown }).qfvI18n = { missing, setLang: (l: Lang) => setLang(l), lang: getLang };
}

/** The running game, so a change of language reaches its texts too. */
export function translateGame(g: Phaser.Game): void {
  game = g;
}
