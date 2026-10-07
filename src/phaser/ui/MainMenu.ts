import { HD_HERO_IDS } from '../render/art';
import type { HdHeroId, HeroCanvases } from '../render/hdHeroes';
import type { CharInfo } from '../../net/protocol';
import { heroArt } from './NewCharacter';
import { esc } from './html';
import { CLASSES } from '../../data/classes';
import { LANGS, LANG_NAMES, getLang, setLang, onLang, keepNames } from '../../i18n';

export type MenuPick = 'single' | 'multi';

/** The heroes that stand for playing together. */
const PARTY: HdHeroId[] = ['k2', 'hood', 'traveller'];

/**
 * The first choice after loading, under the logo: Single Player | Multi Player. Single player
 * shows the character you played last (in their gear); multi player shows a small party.
 * Both lead to the same character screen. Arrow keys switch, Enter picks.
 */
export class MainMenu {
  private root: HTMLDivElement | null = null;
  private raf = 0;
  private sel: number;
  private picks: HTMLButtonElement[] = [];
  private canvases: HTMLCanvasElement[] = [];
  private single: HeroCanvases;
  private party: HeroCanvases[];
  private offLang: (() => void) | null = null;
  private readonly onKey = (e: KeyboardEvent) => {
    // Enter on a language button picks that language, not a game
    if ((e.target as HTMLElement | null)?.closest?.('.mainmenu-lang')) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      this.select(1 - this.sel);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.pick(this.sel === 0 ? 'single' : 'multi');
    }
  };

  constructor(
    /** The single-player character played last, if any. */
    private readonly last: CharInfo | null,
    private readonly onPick: (p: MenuPick) => void,
    /** Which one starts selected (the side you came back from). */
    first: MenuPick = 'single'
  ) {
    this.sel = first === 'single' ? 0 : 1;
    const look =
      last && (HD_HERO_IDS as string[]).includes(last.look)
        ? (last.look as HdHeroId)
        : HD_HERO_IDS[0];
    this.single = heroArt(look, last?.equip);
    this.party = PARTY.map(id => heroArt(id));
  }

  open(): void {
    const root = document.createElement('div');
    root.className = 'mainmenu';
    const s = this.last;
    if (s) keepNames(s.name);
    root.innerHTML = `
      <div class="mainmenu-row" role="menu" aria-label="Main menu">
        <button type="button" class="mainmenu-pick" role="menuitem">
          <canvas width="192" height="96" aria-hidden="true"></canvas>
          <b>Single Player</b>
          <small>${s ? `${esc(s.name)} · Level ${s.level} ${CLASSES[s.cls]?.name ?? 'Warrior'}` : 'Your own adventure'}</small>
          <small>${s ? esc(s.place) : 'your characters in this browser'}</small>
        </button>
        <div class="mainmenu-div" aria-hidden="true"></div>
        <button type="button" class="mainmenu-pick" role="menuitem">
          <canvas width="192" height="96" aria-hidden="true"></canvas>
          <b>Multi Player</b>
          <small>Up to 8 friends together</small>
          <small>your characters on this server</small>
        </button>
      </div>
      <p class="mainmenu-hint">Arrow keys choose · Enter plays</p>
      <div class="mainmenu-lang" role="group" aria-label="Language">${LANGS.map(
        l => `<button type="button" data-lang="${l}" lang="${l}" translate="no">${LANG_NAMES[l]}</button>`
      ).join('')}</div>`;
    document.body.append(root);
    this.root = root;
    const langs = [...root.querySelectorAll<HTMLButtonElement>('.mainmenu-lang button')];
    const showLang = () => langs.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
    langs.forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang as (typeof LANGS)[number])));
    showLang();
    this.offLang = onLang(showLang);
    this.picks = [...root.querySelectorAll<HTMLButtonElement>('.mainmenu-pick')];
    this.canvases = this.picks.map(b => b.querySelector('canvas')!);
    this.picks.forEach((b, i) => {
      b.addEventListener('mouseenter', () => this.select(i));
      b.addEventListener('focus', () => this.select(i));
      b.addEventListener('click', () => this.pick(i === 0 ? 'single' : 'multi'));
    });
    window.addEventListener('keydown', this.onKey);
    this.select(this.sel);
    this.picks[this.sel].focus();
    const tick = (now: number) => {
      this.draw(now);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private select(i: number): void {
    this.sel = i;
    this.picks.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
  }

  private pick(p: MenuPick): void {
    if (!this.root) return;
    this.close();
    this.onPick(p);
  }

  /** The heroes idle; the selected side walks. */
  private draw(now: number): void {
    const frame = (a: HeroCanvases, walking: boolean, offset: number) =>
      walking
        ? a.walk[Math.floor((now + offset) / 110) % a.walk.length]
        : a.anims.idle[Math.floor((now + offset) / 380) % a.anims.idle.length];
    const one = this.canvases[0];
    const c1 = one.getContext('2d')!;
    c1.imageSmoothingEnabled = false;
    c1.clearRect(0, 0, one.width, one.height);
    const f = frame(this.single, this.sel === 0, 0);
    c1.drawImage(
      f,
      Math.round((one.width - f.width * 2) / 2),
      one.height - f.height * 2 - 4,
      f.width * 2,
      f.height * 2
    );
    const many = this.canvases[1];
    const c2 = many.getContext('2d')!;
    c2.imageSmoothingEnabled = false;
    c2.clearRect(0, 0, many.width, many.height);
    // the two at the back first, then the one in front
    for (const i of [0, 2, 1]) {
      const a = this.party[i];
      const g = frame(a, this.sel === 1, i * 170);
      const x = Math.round(many.width / 2 + (i - 1) * 48 - g.width);
      c2.drawImage(
        g,
        x,
        many.height - g.height * 2 - 4 - (i === 1 ? 0 : 6),
        g.width * 2,
        g.height * 2
      );
    }
  }

  close(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    this.offLang?.();
    this.offLang = null;
    this.root?.remove();
    this.root = null;
  }
}
