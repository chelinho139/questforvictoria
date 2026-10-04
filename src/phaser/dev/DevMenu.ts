import type Phaser from 'phaser';
import type { Sim } from '../../sim/Sim';
import { KINDS } from '../../data/enemies';
import type { EnemyKind } from '../../data/enemies';
import { phaseName } from '../../sim/daylight';
import type { Lighting } from '../lighting/Lighting';
import type { Clouds } from '../render/Clouds';
import type { Effects } from '../render/Effects';
import { PIXEL_SCALE } from '../config';
import { DIAL_R } from '../render/DayDial';
import { spriteStyle, STYLE_LABELS, CANDIDATE_STYLES, HD_HERO_IDS, HD_HERO_LABELS, hdHeroId } from '../render/art';
import type { HdHeroId } from '../render/hdHeroes';
import type { SpriteStyle } from '../render/art';
import { StyleBoard } from './styleBoard';
import { PC_KEYS } from '../../data/actionBar';
import { xpToNext } from '../../data/talents';
import { REGIONS } from '../../data/regions';
import type { Sfx } from '../audio/Sfx';
import type { Music } from '../audio/Music';
import { TRACKS, TRACK_IDS, MOOD_NAMES } from '../../data/music';
import type { TrackId } from '../../data/music';
import type { SoundId, FollowSound, UiSound, WorldSound, WeatherSound } from '../../sim/types';
import { WEATHER_KINDS, WEATHER_NAMES } from '../../sim/weather';
import type { WeatherKind } from '../../sim/weather';
import type { CreatureSounds } from '../../data/enemies';
import { NPCS } from '../../data/npcs';
import type { NpcId } from '../../data/npcs';
import { SPELLS, SPELL_ORDER } from '../../data/spells';
import type { SpellKey } from '../../data/spells';
import { SKILLS, ACTIONS, isSkill } from '../../data/skills';
import { CLASS_IDS, CLASSES } from '../../data/classes';

/** Everything the panel can change that is worth keeping across reloads. */
/** The documents in docs/, served by server.js in the book viewer. Add new specs here (and to SPECS in server.js). */
const DOC_LINKS: [string, string][] = [
  ['The Lore', '/lore.html'],
  ['Prologue & Act I', '/act1.html'],
  ['Online co-op plan', '/online.html'],
  ['The archer', '/archer.html'],
  ['Credits', '/credits.html'],
];

interface DevSettings {
  open: boolean;
  /** Day-speed multiplier over the 10-minute day; 0 = paused. */
  speed: number;
  lighting: boolean;
  strength: number;
  clouds: boolean;
  god: boolean;
  infiniteMana: boolean;
  noCooldowns: boolean;
  moveSpeed: number;
  freezeEnemies: boolean;
  showPath: boolean;
  fps: boolean;
  /** Go straight into the game on load (read by the boot scene). */
  skipIntro: boolean;
  /** Advanced: show Rev (the skill sequencer) on the action bar and enable its keys. */
  rev: boolean;
  /** The backup art styles: their buttons here, and the Y / H keys in game. */
  artReview: boolean;
  /** Sound effects, 0 (off) to 1. */
  volume: number;
  /** Music, 0 (off) to 1. */
  music: number;
}

const DEFAULTS: DevSettings = {
  skipIntro: false,
  rev: false,
  artReview: false,
  open: false,
  speed: 1,
  lighting: true,
  strength: 1,
  clouds: true,
  god: false,
  infiniteMana: false,
  noCooldowns: false,
  moveSpeed: 1,
  freezeEnemies: false,
  showPath: false,
  fps: false,
  volume: 0.7,
  music: 0.55,
};

/** The sound board's names for what follows a cast (the casts go by their spell's name). */
const FOLLOW_UPS: Partial<Record<SpellKey, [FollowSound, string][]>> = {
  mount: [
    ['mounted', 'the horse comes'],
    ['dismount', 'getting off'],
  ],
  quickshot: [['hitArrow', 'lands']],
  aimedshot: [['hitAimed', 'lands']],
  barbed: [['hitBarbed', 'lands']],
  concussive: [['hitConcussive', 'lands']],
  silence: [['hitSilence', 'lands']],
  killshot: [['hitKillshot', 'lands']],
  volley: [['hitVolley', 'lands']],
  pierce: [['hitPierce', 'lands']],
  rapidfire: [['hitArrow', 'lands']],
  deadeye: [['hitDeadeye', 'lands']],
  beartrap: [['trapSnap', 'springs']],
};

/** The sound board's names for the interface's sounds. */
const UI_SOUNDS: Record<UiSound, string> = {
  levelUp: 'Level up',
  talent: 'Talent learned',
  questAccept: 'Quest taken',
  questReady: 'Quest goals done',
  questComplete: 'Quest handed in',
  journal: 'Journal entry',
  pickup: 'Item picked up',
  coins: 'Gold',
  equip: 'Gear on or off',
  eat: 'Eating',
  cook: 'Cooking',
  smelt: 'Smelting',
  smith: 'Smithing',
  woodwork: 'Woodwork (bows)',
  build: 'Building',
  perfect: 'Perfect timing',
  error: "Can't do that",
  died: 'You die',
  respawn: 'You respawn',
  open: 'Window opens',
  close: 'Window closes',
};

/** The sound board's names for the world's sounds. */
const WORLD_SOUNDS: Record<WorldSound, string> = {
  autoSwing: 'Auto-attack: a swing',
  autoShot: 'Auto-attack: a shot',
  heroHurt: 'A blow lands on you',
  chop: 'Chopping',
  treeFall: 'A tree falls',
  mine: 'Mining',
  rockBreak: 'A rock breaks',
  fireball: 'Fireball',
  fireballHit: 'Fireball · lands',
  bellToll: 'The bell tolls',
};

/** The sound board's names for thunder. */
const WEATHER_SOUNDS: Record<WeatherSound, string> = {
  thunderNear: 'Thunder · close by',
  thunder: 'Thunder · out of sight',
  thunderFar: 'Thunder · far off',
};

/** What the sound board calls a creature's moments. */
const CREATURE_MOMENTS: Record<keyof CreatureSounds, string> = {
  idle: 'wanders',
  rise: 'rises',
  notice: 'notices you',
  cast: 'casts',
  attack: 'attacks',
  hurt: 'hurt',
  die: 'dies',
};

const STORAGE_KEY = 'qfv-dev-settings';
const SPEEDS: [number, string][] = [
  [0, 'Pause'],
  [1, '1×'],
  [10, '10×'],
  [60, '60×'],
  [600, '600×'],
];
const TIMES: [number, string][] = [
  [0.25, 'Dawn'],
  [0.5, 'Noon'],
  [0.78, 'Sunset'],
  [0, 'Midnight'],
];

/** Whether the backup art styles are on (dev setting; the game is drawn in HD · Silhouette). */
export function devArtReview(): boolean {
  return load().artReview;
}

/** Whether the loading screen should be skipped (dev setting). */
export function devSkipIntro(): boolean {
  return load().skipIntro;
}

function load(): DevSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DevSettings>) };
  } catch {
    /* storage blocked: fall back to defaults */
  }
  return { ...DEFAULTS };
}

function save(s: DevSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * Settings panel (O, ` or the cog on the menu bar).
 * Plain DOM over the canvas: real sliders, no custom widget code. Changes apply live
 * and are saved to localStorage so a test setup survives a reload.
 */
export class DevMenu {
  private readonly s: DevSettings = load();
  private readonly root: HTMLDivElement;
  private readonly fpsEl: HTMLDivElement;
  private readonly clockLabel: HTMLSpanElement;
  private readonly weatherLabel: HTMLParagraphElement;
  private readonly musicLabel: HTMLParagraphElement;
  private readonly weatherBtns: HTMLButtonElement[] = [];
  private readonly clockSlider: HTMLInputElement;
  private readonly speedBtns: HTMLButtonElement[] = [];
  private draggingClock = false;
  private lastSync = 0;
  private fpsTimer = 0;
  private readonly onResize = () => this.position();
  /** Side-by-side comparison of candidate art directions. */
  readonly styleBoard = new StyleBoard();
  private readonly styleBtns: HTMLButtonElement[] = [];
  private shownStyle: SpriteStyle | null = null;
  private readonly heroBtns: HTMLButtonElement[] = [];
  private shownHero: HdHeroId | null = null;
  private reviewEl: HTMLElement | null = null;

  constructor(
    private readonly game: Phaser.Game,
    private readonly sim: Sim,
    private readonly lighting: Lighting,
    private readonly clouds: Clouds,
    private readonly effects: Effects,
    private readonly sfx: Sfx,
    private readonly music: Music
  ) {
    this.root = el('div', 'dev');
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Settings');
    // keep clicks on the panel from also reaching the game
    this.root.addEventListener('mousedown', e => e.stopPropagation());
    this.root.addEventListener('pointerdown', e => e.stopPropagation());

    const head = el('header');
    head.append(el('span', '', 'Settings'));
    const close = el('button', 'dev-x', '×');
    close.title = 'Close';
    close.addEventListener('click', () => this.setOpen(false));
    head.append(close);
    this.root.append(head);

    // ---- time
    // ---- documents: the story and the build specs, read in the book viewer (a new tab, so the game keeps running)
    const docs = this.section('Documents');
    const dBtns = el('div', 'dev-btns');
    for (const [label, url] of DOC_LINKS) dBtns.append(this.button(label, () => window.open(url, '_blank')));
    docs.append(dBtns);

    const time = this.section('Time');
    const clockRow = el('div', 'dev-row');
    clockRow.append(el('span', 'dev-k', 'Clock'));
    this.clockLabel = el('span', 'dev-v');
    clockRow.append(this.clockLabel);
    time.append(clockRow);
    this.clockSlider = el('input');
    this.clockSlider.type = 'range';
    this.clockSlider.min = '0';
    this.clockSlider.max = '1439';
    this.clockSlider.step = '1';
    this.clockSlider.setAttribute('aria-label', 'Time of day');
    this.clockSlider.addEventListener('pointerdown', () => (this.draggingClock = true));
    this.clockSlider.addEventListener('pointerup', () => (this.draggingClock = false));
    this.clockSlider.addEventListener('input', () => {
      this.sim.setDay(Number(this.clockSlider.value) / 1440);
      this.syncClock(true);
    });
    this.clockSlider.addEventListener('change', () => {
      this.draggingClock = false;
      this.clockSlider.blur();
    });
    time.append(this.clockSlider);
    const presets = el('div', 'dev-btns');
    for (const [t, label] of TIMES) {
      presets.append(
        this.button(label, () => {
          this.sim.setDay(t);
          this.syncClock(true);
        })
      );
    }
    time.append(presets);
    const speedRow = el('div', 'dev-row');
    speedRow.append(el('span', 'dev-k', 'Day speed'));
    time.append(speedRow);
    const seg = el('div', 'dev-seg');
    for (const [v, label] of SPEEDS) {
      const b = this.button(label, () => {
        this.s.speed = v;
        this.apply();
      });
      b.dataset.speed = String(v);
      this.speedBtns.push(b);
      seg.append(b);
    }
    time.append(seg);

    // ---- weather: what the sky is doing, and holding it
    const sky = this.section('Weather');
    // (a line of its own: it's longer than a row's value)
    this.weatherLabel = el('p', 'dev-note');
    sky.append(this.weatherLabel);
    const skySeg = el('div', 'dev-seg');
    for (const k of [null, ...WEATHER_KINDS]) {
      const b = this.button(k ? WEATHER_NAMES[k] : 'Auto', () => {
        this.sim.setWeather(k);
        this.syncClock(true);
      });
      b.dataset.weather = k ?? '';
      this.weatherBtns.push(b);
      skySeg.append(b);
    }
    sky.append(skySeg);
    const skyBtns = el('div', 'dev-btns');
    skyBtns.append(this.button('Strike lightning', () => this.sim.weather.strikeNow('near')));
    sky.append(skyBtns);
    sky.append(el('p', 'dev-note', 'Auto: dry spells, rain, and now and then a storm, on their own. The others hold the weather until Auto.'));

    // ---- view: the 2D art, or the experimental 3D views
    const view = this.section('View (experimental)');
    const viewSeg = el('div', 'dev-seg');
    const views: [string, string][] = [['iso', 'Isometric'], ['diorama', 'Diorama 3D'], ['pov', 'Point of view']];
    for (const [id, label] of views) {
      const b = this.button(label, () => {
        (this.game.registry.get('setView') as ((m: string) => void) | undefined)?.(id);
        this.syncViewButtons();
      });
      b.dataset.view = id;
      this.viewBtns.push(b);
      viewSeg.append(b);
    }
    view.append(viewSeg);
    view.append(el('p', 'dev-note', `${PC_KEYS.view.bind} or the button left of the day dial switches. In 3D: , and . turn, right-drag turns and tilts, the wheel zooms; in point of view ${PC_KEYS.povTurnLeft.bind} and ${PC_KEYS.povTurnRight.bind} turn and A and D step sideways.`));
    const v3 = el('div', 'dev-btns');
    v3.append(
      this.button('Sharp / chunky pixels', () => {
        const v = this.game.registry.get('view3d') as { chunky: boolean; setChunky(v: boolean): void } | null;
        v?.setChunky(!v.chunky);
      }),
      this.button('Reset camera', () => (this.game.registry.get('view3d') as { resetCamera(): void } | null)?.resetCamera())
    );
    view.append(v3);
    this.syncViewButtons();

    // ---- look
    const look = this.section('Graphics');
    look.append(this.switchRow(`Backup art styles (${PC_KEYS.artStyle.bind} / ${PC_KEYS.hdHero.bind})`, 'artReview'));
    const review = el('div', 'dev-review');
    review.hidden = !this.s.artReview;
    this.reviewEl = review;
    look.append(review);
    const styleRow = el('div', 'dev-row');
    styleRow.append(el('span', 'dev-k', `Art style (${PC_KEYS.artStyle.bind} cycles)`));
    review.append(styleRow);
    const styleSeg = el('div', 'dev-btns');
    for (const style of CANDIDATE_STYLES) {
      const b = this.button(STYLE_LABELS[style], () => {
        const set = this.game.registry.get('setArtStyle') as ((s: SpriteStyle) => void) | undefined;
        set?.(style);
        this.syncStyleButtons();
      });
      b.dataset.style = style;
      this.styleBtns.push(b);
      styleSeg.append(b);
    }
    this.syncStyleButtons();
    review.append(styleSeg);
    const heroRow = el('div', 'dev-row');
    heroRow.append(el('span', 'dev-k', 'HD hero (H cycles)'));
    review.append(heroRow);
    const heroSeg = el('div', 'dev-btns');
    for (const id of HD_HERO_IDS) {
      const b = this.button(HD_HERO_LABELS[id], () => {
        const set = this.game.registry.get('setHdHero') as ((h: HdHeroId) => void) | undefined;
        set?.(id);
        this.syncStyleButtons();
      });
      b.dataset.hero = id;
      this.heroBtns.push(b);
      heroSeg.append(b);
    }
    review.append(heroSeg);
    this.syncStyleButtons();
    const boardRow = el('div', 'dev-btns');
    boardRow.append(this.button('Compare art styles', () => this.styleBoard.toggle()));
    review.append(boardRow);
    look.append(this.switchRow('Day / night lighting', 'lighting'));
    look.append(this.slider('Darkness', 'strength', 0, 1, 0.05, v => Math.round(v * 100) + '%'));
    look.append(this.switchRow('Clouds', 'clouds'));

    // ---- sound: the volumes, the music playing, and every spell's sounds to listen to
    const sound = this.section('Sound');
    const pct = (v: number) => (v ? Math.round(v * 100) + '%' : 'Off');
    sound.append(this.slider('Music', 'music', 0, 1, 0.05, pct));
    sound.append(this.slider('Effects', 'volume', 0, 1, 0.05, pct));
    this.musicLabel = el('p', 'dev-note');
    sound.append(this.musicLabel);
    const tune = el('div', 'dev-row');
    const track = el('select');
    track.setAttribute('aria-label', 'A track to hear');
    for (const id of TRACK_IDS) {
      const o = el('option', '', `${TRACKS[id].title} · ${TRACKS[id].artist}`);
      o.value = id;
      track.append(o);
    }
    track.addEventListener('change', () => track.blur());
    tune.append(track, this.button('Play', () => this.music.play(track.value as TrackId)));
    sound.append(tune);
    const board = el('div', 'dev-row');
    const pick = el('select');
    pick.setAttribute('aria-label', 'A sound to hear');
    const option = (parent: HTMLElement, id: SoundId, label: string) => {
      const o = el('option', '', label);
      o.value = id;
      parent.append(o);
    };
    for (const cls of [...CLASS_IDS, undefined]) {
      const group = el('optgroup');
      group.label = cls ? CLASSES[cls].name : 'Everyone';
      for (const k of SPELL_ORDER.filter(k => SPELLS[k].cls === cls)) {
        const name = isSkill(k) ? SKILLS[k].n : ACTIONS[k].n;
        option(group, k, name);
        for (const [id, what] of FOLLOW_UPS[k] ?? []) option(group, id, `${name} · ${what}`);
      }
      pick.append(group);
    }
    const ui = el('optgroup');
    ui.label = 'Interface';
    for (const [id, label] of Object.entries(UI_SOUNDS)) option(ui, id as UiSound, label);
    pick.append(ui);
    const outside = el('optgroup');
    outside.label = 'World';
    for (const [id, label] of Object.entries(WORLD_SOUNDS)) option(outside, id as WorldSound, label);
    pick.append(outside);
    // each creature's sounds (one that sounds like another, the test boss, adds none)
    const beasts = el('optgroup');
    beasts.label = 'Creatures';
    const listed = new Set<SoundId>();
    for (const def of Object.values(KINDS))
      for (const [moment, label] of Object.entries(CREATURE_MOMENTS)) {
        const id = def.sounds[moment as keyof CreatureSounds];
        if (!id || listed.has(id)) continue;
        listed.add(id);
        option(beasts, id, `${def.n} · ${label}`);
      }
    pick.append(beasts);
    const weather = el('optgroup');
    weather.label = 'Weather';
    for (const [id, label] of Object.entries(WEATHER_SOUNDS)) option(weather, id as WeatherSound, label);
    pick.append(weather);
    const people = el('optgroup');
    people.label = 'Voices';
    for (const id of Object.keys(NPCS) as NpcId[]) option(people, `${id}Voice`, NPCS[id].name);
    option(people, 'bellringerVoice', KINDS.bellringer.n);
    pick.append(people);
    const hear = () => this.sfx.play(pick.value as SoundId);
    pick.addEventListener('change', () => {
      hear();
      pick.blur();
    });
    board.append(pick, this.button('Play', hear));
    sound.append(board);

    // ---- player
    const player = this.section('Player');
    player.append(this.switchRow('God mode', 'god'));
    player.append(this.switchRow('Infinite mana', 'infiniteMana'));
    player.append(this.switchRow('No cooldowns', 'noCooldowns'));
    player.append(this.slider('Move speed', 'moveSpeed', 0.5, 3, 0.1, v => Math.round(v * 100) + '%'));
    const pBtns = el('div', 'dev-btns');
    pBtns.append(this.button('Full heal', () => this.sim.healFull()));
    pBtns.append(this.button('+1 level', () => this.sim.gainXp(xpToNext(this.sim.level) - this.sim.xp)));
    pBtns.append(this.button('+100 XP', () => this.sim.gainXp(100)));
    pBtns.append(this.button('Reset talents', () => this.sim.resetTalents()));
    pBtns.append(this.button('To start', () => this.sim.teleportToStart()));
    player.append(pBtns);

    // ---- loot: test drops, pickup and gear without hunting for it
    const loot = this.section('Loot');
    const lBtns = el('div', 'dev-btns');
    lBtns.append(this.button('Drop random loot', () => this.sim.dropRandomLoot()));
    lBtns.append(
      this.button('Drop ×5', () => {
        for (let i = 0; i < 5; i++) this.sim.dropRandomLoot();
      })
    );
    loot.append(lBtns);

    // ---- world
    const world = this.section('Enemies');
    world.append(this.switchRow('Freeze enemies', 'freezeEnemies'));
    const wBtns = el('div', 'dev-btns');
    wBtns.append(this.button('Kill all', () => this.sim.killAllEnemies()));
    wBtns.append(this.button('Respawn all', () => this.sim.respawnAllEnemies()));
    wBtns.append(this.button('Reset game', () => this.sim.reset()));
    world.append(wBtns);
    const spawnRow = el('div', 'dev-row');
    spawnRow.append(el('span', 'dev-k', 'Spawn near me'));
    world.append(spawnRow);
    const sBtns = el('div', 'dev-btns');
    for (const kind of Object.keys(KINDS) as EnemyKind[]) {
      sBtns.append(this.button(KINDS[kind].n.replace('Goblin ', ''), () => this.sim.spawnNear(kind)));
    }
    world.append(sBtns);

    // ---- regions: travel anywhere (the same way an exit does: fade, rebuild, arrive)
    const regions = this.section('Regions');
    const rBtns = el('div', 'dev-btns');
    for (const [id, def] of Object.entries(REGIONS)) {
      rBtns.append(this.button(def.name, () => this.sim.events.emit('exit', { to: id, at: 'start' })));
    }
    regions.append(rBtns);

    // ---- advanced options: things not needed until higher levels
    const adv = this.section('Advanced');
    adv.append(this.switchRow('Rev on the action bar', 'rev'));
    adv.append(el('p', 'dev-note', `Rev fires your skills in sequence: ${PC_KEYS.revStep.bind} next step · ${PC_KEYS.revToggle.bind} on/off · ${PC_KEYS.revAuto.bind} auto.`));

    // ---- debug
    const debug = this.section('Debug');
    debug.append(this.switchRow('Show walk path', 'showPath'));
    debug.append(this.switchRow('FPS counter', 'fps'));
    debug.append(this.switchRow('Skip loading screen', 'skipIntro'));

    const foot = el('footer', '', 'O or ` toggles this panel · T cycles time · L lighting');
    this.root.append(foot);
    document.body.append(this.root);

    this.fpsEl = el('div', 'dev-fps');
    this.fpsEl.hidden = true;
    document.body.append(this.fpsEl);

    window.addEventListener('resize', this.onResize);
    this.apply();
    this.setOpen(this.s.open);
  }

  private readonly viewBtns: HTMLButtonElement[] = [];

  /** Mark the view in use. */
  syncViewButtons(): void {
    const cur = (this.game.registry.get('getView') as (() => string) | undefined)?.() ?? 'iso';
    for (const b of this.viewBtns) b.setAttribute('aria-pressed', String(b.dataset.view === cur));
  }

  // ---------- building blocks ----------
  private section(title: string): HTMLElement {
    const sec = el('section');
    sec.append(el('h3', '', title));
    this.root.append(sec);
    return sec;
  }

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const b = el('button', '', label);
    b.type = 'button';
    b.addEventListener('click', () => {
      onClick();
      // don't leave focus on the button, or Space (jump) would press it again
      b.blur();
    });
    return b;
  }

  private switchRow(label: string, key: 'lighting' | 'clouds' | 'god' | 'infiniteMana' | 'noCooldowns' | 'freezeEnemies' | 'showPath' | 'fps' | 'skipIntro' | 'rev' | 'artReview'): HTMLElement {
    const row = el('div', 'dev-row');
    const id = 'dev-' + key;
    const text = el('label', 'dev-k', label);
    text.htmlFor = id;
    const sw = el('button', 'sw');
    sw.id = id;
    sw.type = 'button';
    sw.setAttribute('role', 'switch');
    sw.dataset.key = key;
    sw.addEventListener('click', () => {
      this.s[key] = !this.s[key];
      this.apply();
      sw.blur();
    });
    row.append(text, sw);
    return row;
  }

  private slider(label: string, key: 'strength' | 'moveSpeed' | 'volume' | 'music', min: number, max: number, step: number, fmt: (v: number) => string): HTMLElement {
    const wrap = el('div', 'dev-col');
    const row = el('div', 'dev-row');
    row.append(el('span', 'dev-k', label));
    const val = el('span', 'dev-v');
    val.dataset.valueFor = key;
    row.append(val);
    const input = el('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(this.s[key]);
    input.dataset.key = key;
    input.setAttribute('aria-label', label);
    input.addEventListener('input', () => {
      this.s[key] = Number(input.value);
      this.apply();
    });
    input.addEventListener('change', () => input.blur());
    this.formatters[key] = fmt;
    wrap.append(row, input);
    return wrap;
  }

  private readonly formatters: Partial<Record<'strength' | 'moveSpeed' | 'volume' | 'music', (v: number) => string>> = {};

  // ---------- state ----------
  /** Push settings into the game and refresh every control. */
  private apply(): void {
    const s = this.s;
    this.sim.setDaySpeed(s.speed);
    this.lighting.setStrength(s.strength);
    this.lighting.setEnabled(s.lighting);
    this.clouds.setVisible(s.clouds);
    Object.assign(this.sim.cheats, {
      god: s.god,
      infiniteMana: s.infiniteMana,
      noCooldowns: s.noCooldowns,
      freezeEnemies: s.freezeEnemies,
      moveSpeed: s.moveSpeed,
    });
    this.effects.showPath = s.showPath;
    this.sfx.setVolume(s.volume);
    this.music.setVolume(s.music);
    this.sim.setRevEnabled(s.rev);
    this.fpsEl.hidden = !s.fps;
    if (this.reviewEl) this.reviewEl.hidden = !s.artReview;
    // switching the backups off goes back to the game's art
    if (!s.artReview && this.reviewEl && spriteStyle() !== 'hdsil') {
      const set = this.game.registry.get('setArtStyle') as ((st: SpriteStyle) => void) | undefined;
      set?.('hdsil');
    }

    for (const b of this.speedBtns) b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s.speed));
    this.root.querySelectorAll<HTMLButtonElement>('.sw').forEach(sw => {
      const k = sw.dataset.key as keyof DevSettings;
      sw.setAttribute('aria-checked', String(Boolean(s[k])));
    });
    this.root.querySelectorAll<HTMLSpanElement>('[data-value-for]').forEach(v => {
      const k = v.dataset.valueFor as 'strength' | 'moveSpeed' | 'volume' | 'music';
      v.textContent = this.formatters[k]?.(s[k]) ?? String(s[k]);
    });
    save(s);
  }

  /** What the music is doing: the track playing, or how long the quiet lasts. */
  private syncMusic(): void {
    const d = this.music.director;
    const where = d.mood ? MOOD_NAMES[d.mood] : MOOD_NAMES[this.music.mood];
    const quiet = Math.max(0, Math.ceil(d.wait));
    const text = d.track
      ? `Now: ${TRACKS[d.track].title} · ${where}`
      : d.mood
        ? `Quiet for ${Math.floor(quiet / 60)}:${String(quiet % 60).padStart(2, '0')} · ${where}`
        : `Starts with your first click or key · ${where}`;
    if (this.musicLabel.textContent !== text) this.musicLabel.textContent = text;
  }

  /** Keep the clock readout (and slider, unless being dragged) in step with the game. */
  private syncClock(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastSync < 100) return;
    this.lastSync = now;
    const day = this.sim.day;
    this.clockLabel.textContent = `${day.clock} · ${phaseName(day.t)} · Day ${day.day}`;
    if (!this.draggingClock) this.clockSlider.value = String(Math.floor(day.t * 1440));
    const w = this.sim.weather;
    const pct = (v: number) => Math.round(v * 100) + '%';
    this.weatherLabel.textContent = `Now: ${WEATHER_NAMES[w.kind]} · rain ${pct(w.rain)} · storm ${pct(w.storm)}${w.forced ? ' (held)' : w.coming !== w.kind ? ' · ' + WEATHER_NAMES[w.coming].toLowerCase() + ' coming' : ''}`;
    const held: WeatherKind | '' = w.forced ?? '';
    for (const b of this.weatherBtns) b.setAttribute('aria-pressed', String(b.dataset.weather === held));
  }

  /** Sit below the day dial and above the action bar, whatever the pixel scale. */
  private position(): void {
    const k = PIXEL_SCALE / (window.devicePixelRatio || 1);
    // dial + its label + the stats line underneath
    const top = Math.round((16 + 2 * DIAL_R + 58) * k);
    const bottom = Math.round((40 + 40) * k);
    this.root.style.top = top + 'px';
    this.root.style.maxHeight = Math.max(160, window.innerHeight - top - bottom) + 'px';
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  setOpen(open: boolean): void {
    this.root.hidden = !open;
    this.s.open = open;
    save(this.s);
    if (open) {
      this.position();
      this.syncClock(true);
    }
  }

  toggle(): void {
    this.setOpen(!this.isOpen);
  }

  /** Call every frame. */
  private syncStyleButtons(): void {
    this.shownStyle = spriteStyle();
    this.shownHero = hdHeroId();
    for (const b of this.styleBtns) b.setAttribute('aria-pressed', String(b.dataset.style === this.shownStyle));
    for (const b of this.heroBtns) b.setAttribute('aria-pressed', String(b.dataset.hero === this.shownHero));
  }

  update(): void {
    if (this.isOpen) {
      this.syncClock();
      this.syncMusic();
      // U changes the view outside the menu
      this.syncViewButtons();
    }
    // the V key changes the style outside the menu
    if (this.shownStyle !== spriteStyle() || this.shownHero !== hdHeroId()) this.syncStyleButtons();
    if (this.s.fps) {
      const now = performance.now();
      if (now - this.fpsTimer > 250) {
        this.fpsTimer = now;
        this.fpsEl.textContent = Math.round(this.game.loop.actualFps) + ' FPS';
      }
    }
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.styleBoard.close();
    this.root.remove();
    this.fpsEl.remove();
  }
}
