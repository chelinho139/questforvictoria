import { HD_HEROES, hdHeroFrames } from '../render/hdHeroes';
import type { HdHeroId, HeroCanvases } from '../render/hdHeroes';
import { HD_HERO_IDS } from '../render/art';
import { regrade } from '../render/regrade';
import { NAME_MAX } from '../player';
import { STARTER } from '../../data/items';

export interface Choice {
  name: string;
  hero: HdHeroId;
  /** Carry on from the saved game, or start a new one (which replaces it). */
  mode: 'continue' | 'new';
}

/** What the start screen says about the saved game, if there is one. */
export interface SavedGame {
  level: number;
  place: string;
  when: string;
}

/** Hero frames in the starting gear, recoloured the way the game shows them (HD · Silhouette colours). */
function heroArt(id: HdHeroId): HeroCanvases {
  const f = hdHeroFrames(id, STARTER.worn);
  const re = (list: HTMLCanvasElement[]) => list.map(cv => regrade(cv));
  return { walk: re(f.walk), anims: { idle: re(f.anims.idle), attack: re(f.anims.attack), jump: re(f.anims.jump), flip: re(f.anims.flip) } };
}

/** The big preview's show reel: idle, walk, attack, jump and a backflip, then repeat. */
function reel(a: HeroCanvases): [HTMLCanvasElement, number][] {
  const out: [HTMLCanvasElement, number][] = [];
  const add = (list: HTMLCanvasElement[], ms: number, loops = 1) => {
    for (let l = 0; l < loops; l++) for (const cv of list) out.push([cv, ms]);
  };
  add(a.anims.idle, 380, 2);
  add(a.walk, 100, 3);
  add(a.anims.attack, 110);
  out.push([a.anims.attack[a.anims.attack.length - 1], 300]);
  add(a.anims.jump, 170);
  add(a.anims.flip, 110);
  out.push([a.walk[0], 400]);
  return out;
}

/** Draw a frame centred and bottom-aligned (tumble frames centred) at a whole-number scale. */
function paint(target: HTMLCanvasElement, frame: HTMLCanvasElement, scale: number, centred = false): void {
  const c = target.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, target.width, target.height);
  const w = frame.width * scale;
  const h = frame.height * scale;
  const x = Math.round((target.width - w) / 2);
  const y = centred ? Math.round((target.height - h) / 2 - scale * 4) : target.height - h - scale * 2;
  c.drawImage(frame, x, y, w, h);
}

/**
 * The start screen: type a name and pick one of the HD heroes. Every hero card plays its
 * idle animation; the large preview runs the selected hero through every animation.
 * Arrow keys change the hero, Enter starts.
 */
export class CharacterSelect {
  private root: HTMLDivElement | null = null;
  private raf = 0;
  private sel: number;
  private readonly art = new Map<HdHeroId, HeroCanvases>();
  private cards: HTMLButtonElement[] = [];
  private cardCanvases: HTMLCanvasElement[] = [];
  private big!: HTMLCanvasElement;
  private title!: HTMLElement;
  private about!: HTMLElement;
  private input!: HTMLInputElement;
  private reelFrames: [HTMLCanvasElement, number][] = [];
  private reelI = 0;
  private reelT = 0;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.finish(this.saved ? 'continue' : 'new');
      return;
    }
    if (document.activeElement === this.input && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    const cols = 4;
    const n = HD_HERO_IDS.length;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
    if (step) {
      e.preventDefault();
      this.select((this.sel + step + n) % n);
    }
  };

  /** Pressed New game once over an existing save: the next press confirms. */
  private confirmNew = false;

  constructor(
    private readonly start: Omit<Choice, 'mode'>,
    private readonly onDone: (c: Choice) => void,
    private readonly saved: SavedGame | null = null
  ) {
    this.sel = Math.max(0, HD_HERO_IDS.indexOf(start.hero));
  }

  private artOf(id: HdHeroId): HeroCanvases {
    let a = this.art.get(id);
    if (!a) {
      a = heroArt(id);
      this.art.set(id, a);
    }
    return a;
  }

  open(): void {
    const root = document.createElement('div');
    root.className = 'select';
    root.innerHTML = `
      <div class="select-panel" role="dialog" aria-labelledby="select-title">
        <header id="select-title">Choose your hero</header>
        <div class="select-body">
          <div class="select-show">
            <canvas class="select-big" width="216" height="216" aria-hidden="true"></canvas>
            <h2 class="select-name"></h2>
            <p class="select-about"></p>
          </div>
          <div class="select-side">
            <label class="select-field" for="select-input">Your name
              <input id="select-input" type="text" maxlength="${NAME_MAX}" autocomplete="off" spellcheck="false">
            </label>
            <div class="select-grid" role="listbox" aria-label="Heroes"></div>
            <p class="select-hint">Arrow keys pick a hero · Enter starts</p>
          </div>
        </div>
        <footer>${
          this.saved
            ? `<button type="button" class="select-continue">Continue · Level ${this.saved.level}, ${this.saved.place}<small>saved ${this.saved.when}</small></button><button type="button" class="select-go select-new">New game</button>`
            : `<button type="button" class="select-go">Start adventure</button>`
        }</footer>
      </div>`;
    document.body.append(root);
    this.root = root;
    this.big = root.querySelector('.select-big')!;
    this.title = root.querySelector('.select-name')!;
    this.about = root.querySelector('.select-about')!;
    this.input = root.querySelector('#select-input')!;
    this.input.value = this.start.name;
    const grid = root.querySelector('.select-grid')!;
    HD_HERO_IDS.forEach((id, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'select-card';
      b.setAttribute('role', 'option');
      const cv = document.createElement('canvas');
      cv.width = 96;
      cv.height = 96;
      const label = document.createElement('span');
      label.textContent = HD_HEROES[id].label;
      b.append(cv, label);
      b.addEventListener('click', () => this.select(i));
      b.addEventListener('dblclick', () => this.finish(this.saved ? 'continue' : 'new'));
      grid.append(b);
      this.cards.push(b);
      this.cardCanvases.push(cv);
    });
    root.querySelector('.select-go')!.addEventListener('click', () => this.finish('new'));
    root.querySelector('.select-continue')?.addEventListener('click', () => this.finish('continue'));
    window.addEventListener('keydown', this.onKey);
    this.select(this.sel);
    this.input.focus();
    this.input.select();
    let last = performance.now();
    const tick = (now: number) => {
      this.draw(now, now - last);
      last = now;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private select(i: number): void {
    this.sel = i;
    const id = HD_HERO_IDS[i];
    this.cards.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    this.title.textContent = HD_HEROES[id].label;
    this.about.textContent = HD_HEROES[id].about.charAt(0).toUpperCase() + HD_HEROES[id].about.slice(1) + '.';
    this.reelFrames = reel(this.artOf(id));
    this.reelI = 0;
    this.reelT = 0;
  }

  private draw(now: number, dt: number): void {
    // cards: idle loops
    HD_HERO_IDS.forEach((id, k) => {
      const idle = this.artOf(id).anims.idle;
      paint(this.cardCanvases[k], idle[Math.floor(now / 380) % idle.length], 2);
    });
    // big preview: the show reel
    this.reelT += dt;
    while (this.reelT > this.reelFrames[this.reelI][1]) {
      this.reelT -= this.reelFrames[this.reelI][1];
      this.reelI = (this.reelI + 1) % this.reelFrames.length;
    }
    const [frame] = this.reelFrames[this.reelI];
    const flip = this.artOf(HD_HERO_IDS[this.sel]).anims.flip.includes(frame);
    paint(this.big, frame, 4, flip);
  }

  private finish(mode: Choice['mode']): void {
    if (!this.root) return;
    // a new game over a save asks once more, on the button itself
    if (mode === 'new' && this.saved && !this.confirmNew) {
      this.confirmNew = true;
      const b = this.root.querySelector<HTMLButtonElement>('.select-new')!;
      b.textContent = 'Replace the saved game?';
      b.classList.add('warn');
      return;
    }
    const choice: Choice = { name: this.input.value.trim().slice(0, NAME_MAX) || this.start.name, hero: HD_HERO_IDS[this.sel], mode };
    this.close();
    this.onDone(choice);
  }

  close(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    this.root?.remove();
    this.root = null;
  }
}
