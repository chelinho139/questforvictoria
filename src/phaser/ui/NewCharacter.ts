import { HD_HEROES, hdHeroFrames } from '../render/hdHeroes';
import type { HdHeroId, HeroCanvases } from '../render/hdHeroes';
import { HD_HERO_IDS } from '../render/art';
import { regrade } from '../render/regrade';
import { NAME_MAX } from '../player';
import { STARTER } from '../../data/items';
import type { ItemId, Slot } from '../../data/items';
import { CLASSES, CLASS_IDS } from '../../data/classes';
import type { ClassId } from '../../data/classes';
import type { Difficulty } from '../../data/difficulty';
import { DifficultyPick } from './DifficultyPick';

/** A new character: what they're called, their class, which hero they look like, and how hard their adventure is. */
export interface NewChoice {
  name: string;
  hero: HdHeroId;
  cls: ClassId;
  difficulty: Difficulty;
}

/** Hero frames in some gear (the starting kit by default), recoloured the way the game shows them (HD · Silhouette colours). */
export function heroArt(
  id: HdHeroId,
  gear: Partial<Record<Slot, ItemId | null>> = STARTER.worn
): HeroCanvases {
  const f = hdHeroFrames(id, gear);
  const re = (list: HTMLCanvasElement[]) => list.map(cv => regrade(cv));
  return {
    walk: re(f.walk),
    anims: {
      idle: re(f.anims.idle),
      attack: re(f.anims.attack),
      shoot: re(f.anims.shoot),
      jump: re(f.anims.jump),
      flip: re(f.anims.flip),
    },
  };
}

/** The big preview's show reel: idle, walk, attack (an archer's shot), jump and a backflip, then repeat. */
function reel(a: HeroCanvases, shoots = false): [HTMLCanvasElement, number][] {
  const out: [HTMLCanvasElement, number][] = [];
  const add = (list: HTMLCanvasElement[], ms: number, loops = 1) => {
    for (let l = 0; l < loops; l++) for (const cv of list) out.push([cv, ms]);
  };
  add(a.anims.idle, 380, 2);
  add(a.walk, 100, 3);
  const hit = shoots ? a.anims.shoot : a.anims.attack;
  add(hit, shoots ? 150 : 110);
  out.push([hit[hit.length - 1], 300]);
  add(a.anims.jump, 170);
  add(a.anims.flip, 110);
  out.push([a.walk[0], 400]);
  return out;
}

/** Draw a frame centred and bottom-aligned (tumble frames centred) at a whole-number scale. */
export function paint(
  target: HTMLCanvasElement,
  frame: HTMLCanvasElement,
  scale: number,
  centred = false
): void {
  const c = target.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, target.width, target.height);
  const w = frame.width * scale;
  const h = frame.height * scale;
  const x = Math.round((target.width - w) / 2);
  const y = centred
    ? Math.round((target.height - h) / 2 - scale * 4)
    : target.height - h - scale * 2;
  c.drawImage(frame, x, y, w, h);
}

/**
 * Making a character, the same screen for single player and multi player: a name, a class,
 * one of the HD heroes, and in single player how hard their adventure is (online, the room
 * decides). Every hero card plays its idle animation; the large preview runs the
 * selected hero through every animation. Arrow keys change the hero, Enter creates, Esc goes
 * back. Making it may be refused (a name taken), and the screen stays open saying why.
 */
export class NewCharacter {
  private root: HTMLDivElement | null = null;
  private raf = 0;
  private sel: number;
  private readonly art = new Map<string, HeroCanvases>();
  private cards: HTMLButtonElement[] = [];
  private cardCanvases: HTMLCanvasElement[] = [];
  private big!: HTMLCanvasElement;
  private title!: HTMLElement;
  private about!: HTMLElement;
  private input!: HTMLInputElement;
  private hint!: HTMLElement;
  private reelFrames: [HTMLCanvasElement, number][] = [];
  private reelI = 0;
  private reelT = 0;
  /** Waiting for the character to be made (online, the server). */
  private busy = false;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.make();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.back();
      return;
    }
    if (document.activeElement === this.input && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))
      return;
    const cols = 4;
    const n = HD_HERO_IDS.length;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
    if (step) {
      e.preventDefault();
      this.select((this.sel + step + n) % n);
    }
  };

  constructor(
    private readonly opts: {
      /** 'Single Player' or 'Multi Player', for the title. */
      mode: string;
      /** The hero picked at first. */
      hero: HdHeroId;
      /** Ask how hard their adventure is (single player: each character has their own). */
      difficulty?: boolean;
      /** Make the character: null when made (the screen closes), or why not (it stays open). */
      onCreate: (c: NewChoice) => Promise<string | null> | string | null;
      /** Back to your characters. */
      onBack: () => void;
    }
  ) {
    this.sel = Math.max(0, HD_HERO_IDS.indexOf(opts.hero));
  }

  /** Warrior, archer or sorceress: the class card picked. */
  private cls: ClassId = 'warrior';
  /** Normal, hard or nightmare (when asked). */
  private readonly diff = new DifficultyPick();

  /** A hero in the chosen class's starting kit (a sword, or a bow). */
  private artOf(id: HdHeroId): HeroCanvases {
    const key = `${id}|${this.cls}`;
    let a = this.art.get(key);
    if (!a) {
      a = heroArt(id, CLASSES[this.cls].starter);
      this.art.set(key, a);
    }
    return a;
  }

  open(): void {
    const root = document.createElement('div');
    root.className = 'select';
    root.innerHTML = `
      <div class="select-panel" role="dialog" aria-labelledby="select-title">
        <header id="select-title">${this.opts.mode} · New character</header>
        <div class="select-body">
          <div class="select-show">
            <canvas class="select-big" width="216" height="216" aria-hidden="true"></canvas>
            <h2 class="select-name"></h2>
            <p class="select-about"></p>
          </div>
          <div class="select-side">
            <label class="select-field" for="select-input">Name
              <input id="select-input" type="text" maxlength="${NAME_MAX}" autocomplete="off" spellcheck="false" placeholder="Name your character">
            </label>
            <div class="select-field">Class
              <div class="select-classes" role="radiogroup" aria-label="Class">${CLASS_IDS.map(
                c =>
                  `<button type="button" class="select-class" role="radio" data-cls="${c}"><b>${CLASSES[c].name}</b><small>${CLASSES[c].blurb}</small></button>`
              ).join('')}</div>
              <p class="select-class-about"></p>
            </div>
            <div class="select-grid" role="listbox" aria-label="Heroes"></div>
            <p class="select-hint">Arrow keys pick a hero · Enter creates</p>
          </div>
        </div>
        <footer><button type="button" class="lobby-back">← Back</button><button type="button" class="select-go">Create character</button></footer>
      </div>`;
    document.body.append(root);
    this.root = root;
    this.big = root.querySelector('.select-big')!;
    this.title = root.querySelector('.select-name')!;
    this.about = root.querySelector('.select-about')!;
    this.input = root.querySelector('#select-input')!;
    this.hint = root.querySelector('.select-hint')!;
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
      b.addEventListener('dblclick', () => this.make());
      grid.append(b);
      this.cards.push(b);
      this.cardCanvases.push(cv);
    });
    for (const b of root.querySelectorAll<HTMLButtonElement>('.select-class'))
      b.addEventListener('click', () => this.pickClass(b.dataset.cls as ClassId));
    this.pickClass(this.cls);
    if (this.opts.difficulty) grid.before(this.diff.el);
    root.querySelector('.select-go')!.addEventListener('click', () => this.make());
    root.querySelector('.lobby-back')!.addEventListener('click', () => this.back());
    window.addEventListener('keydown', this.onKey);
    this.select(this.sel);
    this.input.focus();
    let last = performance.now();
    const tick = (now: number) => {
      this.draw(now, now - last);
      last = now;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Warrior, archer or sorceress: the cards and the preview show the class's starting kit. */
  private pickClass(cls: ClassId): void {
    this.cls = cls;
    if (!this.root) return;
    for (const b of this.root.querySelectorAll<HTMLButtonElement>('.select-class'))
      b.setAttribute('aria-checked', String(b.dataset.cls === cls));
    this.root.querySelector('.select-class-about')!.textContent = CLASSES[cls].about;
    this.select(this.sel);
  }

  private select(i: number): void {
    this.sel = i;
    const id = HD_HERO_IDS[i];
    this.cards.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    this.title.textContent = HD_HEROES[id].label;
    this.about.textContent =
      HD_HEROES[id].about.charAt(0).toUpperCase() + HD_HEROES[id].about.slice(1) + '.';
    this.reelFrames = reel(this.artOf(id), CLASSES[this.cls].aa.ranged);
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

  /** Ask for the character, and stay open with the reason if it can't be made. */
  private make(): void {
    if (!this.root || this.busy) return;
    const name = this.input.value.trim();
    if (!name) return this.say('Give your character a name.');
    this.busy = true;
    this.say('Making your character…', false);
    void Promise.resolve(
      this.opts.onCreate({ name, hero: HD_HERO_IDS[this.sel], cls: this.cls, difficulty: this.diff.value })
    ).then(err => {
      this.busy = false;
      if (err) this.say(err);
      else this.close();
    });
  }

  private say(text: string, bad = true): void {
    if (!this.root) return;
    this.hint.textContent = text;
    this.hint.classList.toggle('bad', bad);
    if (bad) this.input.focus();
  }

  private back(): void {
    this.close();
    this.opts.onBack();
  }

  close(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    this.root?.remove();
    this.root = null;
  }
}
