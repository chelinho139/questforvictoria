import type { SoundId, VoiceSound } from '../../sim/types';
import type { NpcId } from '../../data/npcs';
import { Biquad, RATE, Track, master } from './synth';

/**
 * Every sound in the game, as a recipe for the synthesizer (synth.ts). A spell's key is the
 * sound of casting it; arrows add the sound of landing (`hit…`). Sounds are built from a
 * few shared pieces (a whoosh, a thump, a bowstring, a voice…), so the warrior's blows, the
 * archer's arrows, the goblins and the dead each sound like one family.
 *
 * `loud` sets how loud a sound is against the others (1: the biggest finishing blows);
 * the renderer brings each one to it, so levels inside a recipe only balance its parts.
 */
export interface Recipe {
  /** Seconds, with room for any echo. */
  len: number;
  /** Loudness 0..1. */
  loud: number;
  /** Seconds before it can play again (a held key that keeps failing shouldn't buzz). */
  gap?: number;
  /** Takes to render, one picked each time it plays (a voice shouldn't say the same twice). */
  takes?: number;
  make: (s: Track) => void;
}

// ---------------------------------------------------------------- the pieces

/** A note `n` semitones from A4, in Hz. */
const hz = (n: number) => 440 * Math.pow(2, n / 12);

/** A blade or a body cutting the air: band-passed noise swelling and sweeping. */
function whoosh(s: Track, at: number, d: number, f0: number, f1: number, v: number, q = 1.2): void {
  s.noise({ at, v, a: d * 0.45, d: d * 0.55, filter: 'bandpass', f: f0, f1, q });
}

/** A blow landing on a body: a dull thump dropping in pitch, and the slap of the contact. */
function thump(s: Track, at: number, f: number, v: number, d = 0.12): void {
  s.tone({ at, f: f * 2.2, f1: f, slide: 0.03, v, a: 0.001, d });
  s.noise({ at, v: v * 0.6, d: 0.03, filter: 'lowpass', f: 2500 });
}

/** Bone or armour giving way: a gritty, rattling burst. */
function crunch(s: Track, at: number, v: number, d = 0.1, f = 1200): void {
  s.noise({ at, v, d, filter: 'bandpass', f, f1: f * 0.5, q: 0.9, am: [90, 0.6] });
}

/** A war drum: a skin's boom and its slap. */
function drum(s: Track, at: number, f: number, v: number, d = 0.4): void {
  s.tone({ at, f: f * 1.8, f1: f, slide: 0.05, v, a: 0.002, d });
  s.tone({ at, f: f * 3.6, f1: f * 2, slide: 0.05, v: v * 0.3, a: 0.002, d: d * 0.4 });
  s.noise({ at, v: v * 0.35, d: 0.06, filter: 'lowpass', f: 900 });
}

/**
 * Many tiny grains of noise: tearing cloth and flesh, crackling sparks, rustling leaves.
 * `rate` grains a second, their pitch moving from f0 to f1; they swell fast and thin out.
 */
function crackle(
  s: Track,
  at: number,
  d: number,
  v: number,
  rate: number,
  f0: number,
  f1 = f0,
  q = 1.5
): void {
  const n = Math.round(rate * d);
  for (let i = 0; i < n; i++) {
    const p = s.random();
    const env = Math.min(1, p * 6) * (1 - p);
    s.noise({
      at: at + p * d,
      v: v * env * (0.4 + 0.6 * s.random()),
      d: 0.003 + 0.008 * s.random(),
      filter: 'bandpass',
      f: (f0 + (f1 - f0) * p) * (0.8 + 0.4 * s.random()),
      q,
    });
  }
}

/** A spell snuffed out: a hiss falling away under a sinking note. */
function fizzle(s: Track, at: number, d: number, v: number): void {
  s.noise({ at, v, a: 0.01, d, filter: 'bandpass', f: 4000, f1: 350, q: 2.5 });
  s.tone({ at, f: 900, f1: 180, v: v * 0.35, a: 0.005, d, wave: 'tri' });
}

/** Soft bell-like notes one after another: magic, healing, mana. */
function chime(s: Track, at: number, notes: number[], step: number, v: number, d = 0.5): void {
  notes.forEach((f, i) => {
    s.tone({ at: at + i * step, f, v, a: 0.01, d });
    s.tone({ at: at + i * step, f: f * 2.01, v: v * 0.25, a: 0.01, d: d * 0.6 });
  });
}

/** A whistle through the fingers: a pure note with a little breath on it. */
function whistle(s: Track, at: number, d: number, f: number, f1: number, v: number): void {
  s.tone({ at, f, f1, v, a: 0.025, d, vib: [7, 0.012] });
  s.noise({ at, v: v * 0.12, a: 0.02, d, filter: 'bandpass', f, f1, q: 6 });
}

/** An arrow cutting the air: a thin, falling hiss. */
function zip(s: Track, at: number, d: number, v: number, f = 4200, q = 4): void {
  s.noise({ at, v, a: d * 0.3, d: d * 0.7, filter: 'bandpass', f, f1: f * 0.6, q });
}

/** A bowstring let go: the string's twang, its slap on the bracer, the arrow leaving. */
function twang(s: Track, at: number, f: number, v: number, d = 0.25): void {
  s.pluck({ at, f, v, d, bright: 0.4, damp: 0.995 });
  s.noise({ at, v: v * 0.6, d: 0.02, filter: 'bandpass', f: 1800, q: 1.2 });
  zip(s, at + 0.005, 0.12, v * 0.35);
}

/** An arrow going home: a short woody knock, the head's click and a thud. */
function thunk(s: Track, at: number, v: number, f = 150): void {
  s.noise({ at, v: v * 0.8, d: 0.05, filter: 'bandpass', f: 900, q: 1.4 });
  s.noise({ at, v: v * 0.4, d: 0.012, filter: 'highpass', f: 3000 });
  s.tone({ at, f: f * 1.6, f1: f, slide: 0.025, v, a: 0.001, d: 0.09 });
}

/** A hoof on hard ground: a hollow knock. */
function hoof(s: Track, at: number, v: number): void {
  s.noise({ at, v, d: 0.04, filter: 'bandpass', f: 1100, q: 3 });
  s.tone({ at, f: 420, f1: 300, v: v * 0.7, a: 0.001, d: 0.05 });
  s.tone({ at, f: 140, f1: 90, v: v * 0.5, a: 0.001, d: 0.07 });
}

/**
 * Thunder rolling away: overlapping swells of deep noise, each a little later, lower and
 * softer, every one wobbling as it rolls. Kept above 150 Hz enough that small speakers carry it.
 */
function rumble(s: Track, at: number, d: number, v: number, f: number, n = 7): void {
  for (let i = 0; i < n; i++) {
    const p = i / n;
    s.noise({
      at: at + p * d * 0.55 + s.random() * 0.2,
      v: v * (1 - p * 0.5) * (0.6 + 0.4 * s.random()),
      a: 0.08 + 0.35 * s.random(),
      d: d * (0.45 + 0.3 * s.random()),
      filter: 'lowpass',
      f: f * (1 - p * 0.35),
      f1: f * 0.5,
      q: 1.1,
      am: [2.5 + 6 * s.random(), 0.55],
    });
  }
}

/** A ratchet's tooth: a tiny steel click. */
function click(s: Track, at: number, v: number): void {
  s.noise({ at, v, d: 0.008, filter: 'highpass', f: 2500 });
  s.tone({ at, f: 2300, v: v * 0.4, a: 0.0005, d: 0.02 });
}

/**
 * A plucked note (a harp, a lute): its harmonics, the high ones dying first. Built from
 * sines rather than a plucked string so it stays in tune with the bells.
 */
function note(s: Track, at: number, f: number, v: number, d: number): void {
  for (let k = 1; k <= 5; k++)
    s.tone({ at, f: f * k, v: v / Math.pow(k, 1.3), a: 0.002, d: d / Math.pow(k, 0.7) });
}

/** A bell: a clear note with a touch of the inharmonic ring above it. */
function bell(s: Track, at: number, f: number, v: number, d: number): void {
  s.tone({ at, f, v, a: 0.003, d });
  s.tone({ at, f: f * 2, v: v * 0.35, a: 0.003, d: d * 0.6 });
  s.tone({ at, f: f * 2.76, v: v * 0.12, a: 0.002, d: d * 0.35 });
}

/** A horn: two buzzing, slightly detuned saws, their brightness tamed. */
function brass(s: Track, at: number, f: number, v: number, d: number): void {
  for (const det of [1, 1.004])
    s.tone({
      at,
      f: f * det,
      v: v / 2,
      a: 0.03,
      d,
      wave: 'saw',
      lp: Math.min(2400, f * 5),
      vib: [5, 0.004],
    });
}

/** Parchment: a sweep of dry rustle. */
function paper(s: Track, at: number, d: number, v: number): void {
  s.noise({ at, v: v * 0.6, a: d * 0.4, d: d * 0.6, filter: 'bandpass', f: 1500, f1: 4000, q: 1 });
  crackle(s, at, d, v, 160, 2500, 5000, 1.5);
}

/** A coin landing on others. */
function coin(s: Track, at: number, f: number, v: number): void {
  s.metal({ at, f, v: v * 0.5, d: 0.2, ratios: [1, 2.42, 3.9, 5.6] });
  s.noise({ at, v: v * 0.3, d: 0.006, filter: 'highpass', f: 4000 });
}

/** Mouth shapes, as formants: [Hz, level, Q]. */
type Formants = [number, number, number][];
const AH: Formants = [
  [800, 1, 6],
  [1150, 0.7, 8],
  [2600, 0.35, 12],
];
const OH: Formants = [
  [550, 1, 6],
  [880, 0.6, 8],
  [2450, 0.25, 12],
];
const UH: Formants = [
  [350, 1, 5],
  [800, 0.5, 7],
  [2250, 0.2, 10],
];
const EE: Formants = [
  [300, 1, 6],
  [2250, 0.5, 12],
  [3000, 0.3, 14],
];
const EH: Formants = [
  [530, 1, 6],
  [1840, 0.6, 10],
  [2480, 0.3, 12],
];
/** A cow's mouth: low and nasal. */
const MOO: Formants = [
  [300, 1, 4],
  [650, 0.6, 6],
  [2400, 0.15, 10],
];

/**
 * A throat: a buzz that climbs to `peak` in the first quarter and falls to `f1`, through
 * the mouth's formants. `rough` rattles it (a growl), `breath` adds air.
 */
function voice(
  s: Track,
  o: {
    at: number;
    d: number;
    f: number;
    peak: number;
    f1: number;
    mouth: Formants;
    v: number;
    rough?: number;
    roughHz?: number;
    breath?: number;
    /** Vibrato depth (a fraction of the pitch): an old voice trembles. */
    vib?: number;
    /** Seconds to come in (a bark is quick, a groan slow). */
    a?: number;
  }
): void {
  const n = Math.round(o.d * RATE);
  const vib = o.vib ?? 0.012;
  const a = o.a ?? 0.04;
  const src = new Float32Array(n);
  // up to the peak over the first quarter, down to f1 over the rest, a sample at a time
  const n1 = Math.max(1, Math.round(n / 4));
  const up = Math.pow(o.peak / o.f, 1 / n1);
  const down = Math.pow(o.f1 / o.peak, 1 / Math.max(1, n - n1));
  let f = o.f;
  let ph = 0;
  let drift = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    f *= i < n1 ? up : down;
    // a voice never holds still: a slow wander and a little vibrato
    if (i % 256 === 0) drift = drift * 0.8 + (s.random() - 0.5) * 0.02;
    ph += (f * (1 + drift + vib * Math.sin(2 * Math.PI * 5.5 * t))) / RATE;
    ph -= Math.floor(ph);
    let x = 2 * ph - 1 + (o.breath ?? 0.2) * (s.random() * 2 - 1);
    if (o.rough) {
      const r = Math.sin(2 * Math.PI * (o.roughHz ?? 30) * t + 3 * Math.sin(2 * Math.PI * 7 * t));
      x *= 1 - o.rough * (0.5 + 0.5 * r);
    }
    src[i] = x * Math.min(1, t / a) * Math.min(1, (o.d - t) / (o.d * 0.35));
  }
  const out = new Float32Array(n);
  for (const [ff, g, q] of o.mouth) {
    const b = new Biquad('bandpass', ff, q);
    for (let i = 0; i < n; i++) out[i] += b.run(src[i]) * g;
  }
  s.mix(o.at, out, o.v);
}

/** A bubble in something wet: a quick note sliding up (or down, as it bursts). */
function bubble(s: Track, at: number, f0: number, f1: number, v: number, d = 0.06): void {
  s.tone({ at, f: f0, f1, slide: d * 0.8, v, a: 0.003, d });
}

/** Bone on bone: a dry, hollow click. */
function clack(s: Track, at: number, v: number, f = 1300): void {
  s.noise({ at, v, d: 0.01, filter: 'bandpass', f: f * 1.8, q: 3 });
  s.tone({ at, f, v: v * 0.5, a: 0.001, d: 0.025 });
}

/** Dry bones rattling: `n` clacks over `d` seconds, crowded at the start. */
function rattle(s: Track, at: number, d: number, v: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const p = s.random();
    clack(s, at + p * p * d, v * (1 - 0.7 * p) * (0.5 + 0.5 * s.random()), 900 + 1400 * s.random());
  }
}

/** How someone sounds when they talk. */
interface Speaker {
  /** Pitch, Hz. */
  f: number;
  /** Mouth size: formants scaled (a woman's higher, a big man's lower). */
  mouth: number;
  /** Seconds a syllable. */
  syl: number;
  /** How far each syllable strays up or down. */
  lilt: number;
  rough?: number;
  breath?: number;
  /** An old voice's tremble. */
  vib?: number;
  /** How far the phrase falls by its end. */
  fall?: number;
  drive?: number;
  /** An echo: a chapel, a belfry. */
  room?: number;
}

/**
 * Talking, in no language at all: three to five syllables (a word or two, not a speech),
 * each a mouth shape with a little consonant in front, wandering up and down and falling
 * at the end of the phrase.
 */
function babble(s: Track, o: Speaker): void {
  const mouths = [AH, EH, EE, OH, UH];
  const n = 3 + Math.floor(s.random() * 3);
  let t = 0.02;
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const f = o.f * (1.06 - (0.06 + (o.fall ?? 0.1)) * p) * (1 + (s.random() * 2 - 1) * o.lilt);
    const d = o.syl * (0.75 + 0.5 * s.random());
    const shape = mouths[Math.floor(s.random() * mouths.length)];
    const mouth: Formants = shape.map(([ff, g, q]) => [ff * o.mouth, g, q]);
    // a hiss (s, sh), a stop (t, k, p), or straight into the vowel
    const c = s.random();
    if (c < 0.3) s.noise({ at: t, v: 0.2, d: 0.035, filter: 'highpass', f: 3500 * o.mouth });
    else if (c < 0.65)
      s.noise({ at: t, v: 0.3, d: 0.012, filter: 'bandpass', f: 1200 + 2400 * s.random(), q: 1.5 });
    voice(s, {
      at: t + 0.012,
      d,
      f,
      peak: f * 1.03,
      f1: f * 0.97,
      mouth,
      v: 1,
      rough: o.rough,
      breath: o.breath ?? 0.2,
      vib: o.vib,
      a: Math.min(0.03, d * 0.3),
    });
    // a little pause now and then
    t += d * 0.9 + (s.random() < 0.15 ? 0.07 : 0);
  }
  if (o.drive) s.drive(o.drive);
  if (o.room) s.reverb(o.room, 1.2);
}

/** Each speaker's voice: the people of the Greenmarch and Millbrook, and one who was. */
const SPEAKERS: Record<NpcId | 'bellringer', Speaker> = {
  // Warden Aldric: old, gravelly, unhurried
  aldric: { f: 98, mouth: 1, syl: 0.12, lilt: 0.07, rough: 0.25, breath: 0.35 },
  // Nan Merrow, the queen's old nurse: high, and trembling
  nan: { f: 225, mouth: 1.16, syl: 0.13, lilt: 0.1, breath: 0.4, vib: 0.045 },
  // Maud Ashdown, the widow: soft, trailing off
  maud: { f: 195, mouth: 1.13, syl: 0.12, lilt: 0.05, breath: 0.3, fall: 0.18 },
  // Sergeant Pike: loud, clipped, official
  pike: { f: 138, mouth: 1.02, syl: 0.075, lilt: 0.08, rough: 0.12, breath: 0.12, drive: 2 },
  // Father Odo: calm and sing-song, as if in his chapel
  odo: { f: 118, mouth: 1, syl: 0.11, lilt: 0.16, breath: 0.2, room: 0.25 },
  // Tobin the peddler: quick and chatty, all ups and downs
  tobin: { f: 165, mouth: 1.05, syl: 0.068, lilt: 0.2, breath: 0.18 },
  // Bram the smith: big, deep, few words
  bram: { f: 84, mouth: 0.94, syl: 0.1, lilt: 0.05, rough: 0.35, breath: 0.25, drive: 1.5 },
  // the Bell-Ringer: hollow, slow, not quite alive
  bellringer: {
    f: 68,
    mouth: 0.9,
    syl: 0.18,
    lilt: 0.04,
    rough: 0.3,
    breath: 0.5,
    vib: 0.03,
    fall: 0.2,
    room: 0.45,
  },
};

/** Everyone's voices: four takes each, so nobody says the same thing twice running. */
const VOICES = Object.fromEntries(
  (Object.keys(SPEAKERS) as (keyof typeof SPEAKERS)[]).map(who => {
    const o = SPEAKERS[who];
    const recipe: Recipe = {
      len: 7 * o.syl + 0.6 + (o.room ? 1 : 0),
      loud: 0.45,
      takes: 4,
      make: s => babble(s, o),
    };
    return [`${who}Voice`, recipe];
  })
) as Record<VoiceSound, Recipe>;

// ---------------------------------------------------------------- the recipes

export const SOUNDS: Record<SoundId, Recipe> = {
  // ------------------------------------------------------------ the warrior's
  thrust: {
    len: 0.35,
    loud: 0.5,
    make: s => {
      whoosh(s, 0, 0.08, 1800, 4200, 0.8, 1.5);
      // the blade's edge
      s.noise({ v: 0.25, a: 0.01, d: 0.1, filter: 'bandpass', f: 5200, f1: 6500, q: 8 });
      thump(s, 0.06, 150, 0.7, 0.08);
    },
  },
  slash: {
    len: 0.5,
    loud: 0.6,
    make: s => {
      // two cuts, as the crescents cross
      whoosh(s, 0, 0.14, 700, 2400, 1, 1.1);
      thump(s, 0.09, 120, 0.8, 0.1);
      whoosh(s, 0.13, 0.13, 900, 2800, 0.7, 1.1);
      thump(s, 0.21, 135, 0.6, 0.09);
    },
  },
  rend: {
    len: 0.55,
    loud: 0.6,
    make: s => {
      whoosh(s, 0, 0.12, 900, 2600, 0.9);
      thump(s, 0.08, 130, 0.6, 0.08);
      // the tear
      crackle(s, 0.09, 0.28, 0.9, 260, 1800, 900, 1.2);
      s.noise({ at: 0.12, v: 0.3, d: 0.2, filter: 'lowpass', f: 600 });
    },
  },
  charge: {
    len: 0.7,
    loud: 0.75,
    make: s => {
      // the rush, the blow, the stun ringing in its ears
      s.noise({ v: 1, a: 0.12, d: 0.06, filter: 'bandpass', f: 300, f1: 1800, q: 0.8 });
      thump(s, 0.13, 85, 1, 0.18);
      crunch(s, 0.13, 0.5, 0.08, 1000);
      s.metal({ at: 0.14, f: 1650, v: 0.25, d: 0.45, ratios: [1, 2.32, 4.25] });
    },
  },
  mount: {
    len: 0.7,
    loud: 0.45,
    make: s => {
      // calling the horse: fweet, fwee-oo
      whistle(s, 0, 0.12, 1400, 2300, 0.8);
      whistle(s, 0.2, 0.35, 2300, 1600, 0.8);
    },
  },
  warcry: {
    len: 1.3,
    loud: 0.85,
    make: s => {
      drum(s, 0, 62, 1, 0.45);
      // "HAAAH!"
      s.noise({ v: 0.3, d: 0.06, filter: 'bandpass', f: 1500, q: 0.8 });
      voice(s, { at: 0.03, d: 0.75, f: 150, peak: 215, f1: 165, mouth: AH, v: 1.4, breath: 0.25 });
      s.drive(1.8);
      s.reverb(0.2, 1.1);
    },
  },
  interrupt: {
    len: 0.8,
    loud: 0.7,
    make: s => {
      // steel on steel, and the spell dying in its hands
      s.noise({ v: 0.5, d: 0.02, filter: 'highpass', f: 2500 });
      thump(s, 0, 140, 0.6, 0.06);
      s.metal({ f: 880, v: 0.7, d: 0.55 });
      fizzle(s, 0.05, 0.35, 0.45);
    },
  },
  execute: {
    len: 0.9,
    loud: 0.85,
    make: s => {
      // a cross cut, then the chop
      whoosh(s, 0, 0.1, 600, 2200, 0.9);
      whoosh(s, 0.06, 0.1, 700, 2600, 0.8);
      thump(s, 0.09, 70, 0.7, 0.25);
      crunch(s, 0.09, 0.8, 0.14, 900);
      s.drive(1.5, 0.08);
      s.reverb(0.18);
    },
  },
  whirlwind: {
    len: 0.8,
    loud: 0.7,
    make: s => {
      // three turns of the blade, each a little faster and higher, over the spin's roar
      for (let k = 0; k < 3; k++)
        whoosh(s, k * 0.15, 0.17, 600 + k * 200, 2200 + k * 400, 0.9 - k * 0.1, 1.3);
      s.noise({
        v: 0.35,
        a: 0.15,
        d: 0.4,
        filter: 'bandpass',
        f: 500,
        f1: 1400,
        q: 0.7,
        am: [6.6, 0.7],
      });
      s.noise({ at: 0.05, v: 0.12, a: 0.1, d: 0.3, filter: 'bandpass', f: 5500, q: 6 });
    },
  },
  mortal: {
    len: 1.1,
    loud: 0.9,
    make: s => {
      // a crushing blow, and the gold bolt crackling over it
      whoosh(s, 0, 0.09, 500, 1800, 0.8);
      thump(s, 0.08, 55, 0.7, 0.35);
      crunch(s, 0.08, 0.9, 0.12, 800);
      crackle(s, 0.08, 0.35, 0.6, 160, 4200, 2200, 2);
      s.metal({ at: 0.08, f: 520, v: 0.3, d: 0.6, ratios: [1, 2.76, 5.4] });
      s.drive(1.6, 0.07);
      s.reverb(0.22, 1.2);
    },
  },
  sunder: {
    len: 0.7,
    loud: 0.7,
    make: s => {
      whoosh(s, 0, 0.1, 800, 2400, 0.7);
      thump(s, 0.08, 110, 0.8, 0.12);
      // the plate rings, cracks and gives
      s.metal({ at: 0.08, f: 610, v: 0.6, d: 0.35, ratios: [1, 2.31, 3.89, 5.73] });
      s.noise({ at: 0.08, v: 0.8, d: 0.015, filter: 'highpass', f: 3000 });
      s.noise({ at: 0.1, v: 0.5, a: 0.01, d: 0.22, filter: 'bandpass', f: 1300, f1: 380, q: 9 });
    },
  },
  deathblow: {
    len: 1.4,
    loud: 1,
    make: s => {
      // the heave, the swing, the fall of it
      s.noise({ v: 0.8, a: 0.1, d: 0.05, filter: 'bandpass', f: 400, f1: 1600, q: 1 });
      whoosh(s, 0.08, 0.1, 700, 2600, 1);
      thump(s, 0.15, 48, 0.7, 0.5);
      crunch(s, 0.15, 1, 0.18, 750);
      s.metal({ at: 0.15, f: 330, v: 0.35, d: 0.8 });
      s.drive(2, 0.14);
      s.reverb(0.3, 1.3);
    },
  },
  bloodrage: {
    len: 1.2,
    loud: 0.65,
    make: s => {
      // the heart pounds, the blood goes, the mana comes
      s.tone({ f: 75, f1: 48, slide: 0.06, v: 1, a: 0.004, d: 0.14, wave: 'tri', lp: 400 });
      s.tone({
        at: 0.16,
        f: 70,
        f1: 45,
        slide: 0.06,
        v: 0.75,
        a: 0.004,
        d: 0.16,
        wave: 'tri',
        lp: 400,
      });
      s.noise({ at: 0.02, v: 0.4, d: 0.18, filter: 'lowpass', f: 700, am: [40, 0.5] });
      chime(s, 0.3, [hz(0), hz(4), hz(7), hz(12)], 0.06, 0.25, 0.5);
      s.reverb(0.15);
    },
  },
  berserk: {
    len: 1.4,
    loud: 0.9,
    make: s => {
      drum(s, 0, 55, 1, 0.4);
      drum(s, 0.14, 52, 0.9, 0.5);
      // a roar, lower and rougher than the war cry
      voice(s, {
        at: 0.04,
        d: 0.85,
        f: 100,
        peak: 140,
        f1: 85,
        mouth: OH,
        v: 1.6,
        rough: 0.5,
        roughHz: 32,
        breath: 0.35,
      });
      s.drive(3);
      s.reverb(0.2);
    },
  },
  shieldbash: {
    len: 0.7,
    loud: 0.8,
    make: s => {
      // the shield's face, then its iron rim
      thump(s, 0, 95, 1, 0.16);
      s.noise({ v: 0.7, d: 0.09, filter: 'bandpass', f: 420, q: 4 });
      s.tone({ f: 260, f1: 220, v: 0.5, a: 0.001, d: 0.12 });
      s.metal({ at: 0.002, f: 1250, v: 0.35, d: 0.4, ratios: [1, 1.59, 2.14, 2.65] });
    },
  },
  laststand: {
    len: 1.5,
    loud: 0.7,
    make: s => {
      // feet set, armour settles, and a warm chord rises
      drum(s, 0, 58, 0.55, 0.5);
      s.metal({ f: 700, v: 0.25, d: 0.3 });
      [hz(-12), hz(-8), hz(-5), hz(0)].forEach((f, i) =>
        s.tone({ at: 0.05 + i * 0.06, f, v: 0.22, a: 0.12, d: 0.9, wave: 'tri', lp: 2500 })
      );
      s.reverb(0.2);
    },
  },
  // ------------------------------------------------------------ the archer's
  quickshot: {
    len: 0.35,
    loud: 0.5,
    make: s => twang(s, 0, 190, 0.8, 0.18),
  },
  aimedshot: {
    len: 0.5,
    loud: 0.62,
    make: s => {
      // a deeper draw: a lower string, a longer flight
      twang(s, 0, 125, 1, 0.32);
      zip(s, 0.01, 0.2, 0.3, 3600);
    },
  },
  barbed: {
    len: 0.4,
    loud: 0.55,
    make: s => {
      twang(s, 0, 165, 0.85, 0.22);
      // the barbs
      s.metal({ at: 0.01, f: 3100, v: 0.12, d: 0.12, ratios: [1, 1.34] });
    },
  },
  concussive: {
    len: 0.45,
    loud: 0.58,
    make: s => {
      twang(s, 0, 140, 0.9, 0.25);
      // the blunt head pushes the air
      whoosh(s, 0.01, 0.16, 300, 700, 0.4, 0.9);
    },
  },
  mark: {
    len: 0.8,
    loud: 0.5,
    make: s => {
      // closing in on the prey, then a bright ping: marked
      s.tone({ f: 600, f1: 1800, slide: 0.38, v: 0.3, a: 0.2, d: 0.2, wave: 'tri' });
      s.tone({ f: 606, f1: 1820, slide: 0.38, v: 0.2, a: 0.2, d: 0.2, wave: 'tri' });
      s.metal({ at: 0.38, f: 1760, v: 0.5, d: 0.4, ratios: [1, 2, 3.01] });
    },
  },
  silence: {
    len: 0.35,
    loud: 0.52,
    make: s => twang(s, 0, 180, 0.8, 0.18),
  },
  killshot: {
    len: 0.5,
    loud: 0.68,
    make: s => {
      twang(s, 0, 115, 1, 0.32);
      zip(s, 0.01, 0.22, 0.35, 3300);
    },
  },
  volley: {
    len: 0.7,
    loud: 0.75,
    make: s => {
      // four strings, then the arrows climbing together
      for (const [at, f] of [
        [0, 150],
        [0.035, 172],
        [0.07, 138],
        [0.11, 160],
      ])
        twang(s, at, f, 0.7, 0.22);
      s.noise({
        at: 0.02,
        v: 0.35,
        a: 0.2,
        d: 0.25,
        filter: 'bandpass',
        f: 1200,
        f1: 3800,
        q: 1.5,
      });
    },
  },
  pierce: {
    len: 0.8,
    loud: 0.8,
    make: s => {
      // the heaviest string, and a heavy shaft shrieking away
      twang(s, 0, 92, 1, 0.42);
      zip(s, 0.01, 0.45, 0.5, 5200, 7);
      s.tone({ at: 0.02, f: 3400, f1: 2300, v: 0.12, a: 0.03, d: 0.4 });
    },
  },
  rapidfire: {
    len: 0.7,
    loud: 0.55,
    make: s => {
      // three arrows, a beat apart (as they fly)
      for (const [at, f] of [
        [0, 205],
        [0.18, 195],
        [0.36, 215],
      ])
        twang(s, at, f, 0.75, 0.15);
    },
  },
  deadeye: {
    len: 0.9,
    loud: 0.75,
    make: s => {
      // one perfect shot: the arrow sings as it goes
      twang(s, 0, 105, 1, 0.38);
      s.tone({ at: 0.01, f: 2900, f1: 3100, v: 0.18, a: 0.04, d: 0.5, vib: [9, 0.008] });
      zip(s, 0.01, 0.3, 0.35, 4500);
    },
  },
  beartrap: {
    len: 0.7,
    loud: 0.55,
    make: s => {
      // winding the jaws open, tooth by tooth, until they lock
      for (let k = 0; k < 4; k++) click(s, k * 0.065, 0.5 + k * 0.08);
      s.metal({ at: 0.3, f: 980, v: 0.45, d: 0.3, ratios: [1, 2.42, 3.9] });
      thump(s, 0.3, 130, 0.4, 0.06);
    },
  },
  predator: {
    len: 1.2,
    loud: 0.8,
    make: s => {
      // a beast's growl
      drum(s, 0, 50, 0.6, 0.4);
      voice(s, {
        at: 0,
        d: 0.8,
        f: 72,
        peak: 88,
        f1: 62,
        mouth: UH,
        v: 1.8,
        rough: 0.8,
        roughHz: 24,
        breath: 0.5,
      });
      s.drive(2.5);
      s.reverb(0.15);
    },
  },
  disengage: {
    len: 0.6,
    loud: 0.6,
    make: s => {
      // push off, fly back, land
      s.noise({ v: 0.25, d: 0.05, filter: 'lowpass', f: 1200 });
      whoosh(s, 0, 0.26, 500, 1600, 1, 0.9);
      thump(s, 0.28, 105, 0.6, 0.1);
      s.noise({ at: 0.28, v: 0.3, d: 0.12, filter: 'bandpass', f: 2500, q: 0.8 });
    },
  },
  camouflage: {
    len: 1.3,
    loud: 0.5,
    make: s => {
      // into the leaves, and a soft fall of notes as you fade
      crackle(s, 0, 0.7, 0.8, 150, 4500, 3000, 1.2);
      chime(s, 0.15, [hz(7), hz(4), hz(0)], 0.12, 0.15, 0.6);
      s.reverb(0.12);
    },
  },
  // ------------------------------------------------------------ what follows
  mounted: {
    len: 1,
    loud: 0.55,
    make: s => {
      // the horse canters up (da-da-dum, da-da-dum) and snorts
      for (const [at, v] of [
        [0, 0.6],
        [0.09, 0.7],
        [0.17, 1],
        [0.38, 0.6],
        [0.46, 0.7],
        [0.54, 1],
      ])
        hoof(s, at, v);
      s.noise({ at: 0.68, v: 0.5, a: 0.02, d: 0.25, filter: 'lowpass', f: 900, am: [30, 0.7] });
    },
  },
  dismount: {
    len: 0.4,
    loud: 0.4,
    make: s => {
      // boots on the ground, a creak of leather
      thump(s, 0, 110, 0.8, 0.1);
      s.noise({ at: 0.01, v: 0.3, a: 0.02, d: 0.08, filter: 'bandpass', f: 1500, q: 1.5 });
    },
  },
  hitArrow: {
    len: 0.2,
    loud: 0.42,
    make: s => thunk(s, 0, 0.9),
  },
  hitAimed: {
    len: 0.25,
    loud: 0.55,
    make: s => {
      thunk(s, 0, 1, 130);
      crunch(s, 0, 0.4, 0.06, 1100);
    },
  },
  hitBarbed: {
    len: 0.35,
    loud: 0.5,
    make: s => {
      thunk(s, 0, 0.9);
      crackle(s, 0.02, 0.18, 0.7, 260, 1700, 900, 1.2);
    },
  },
  hitConcussive: {
    len: 0.6,
    loud: 0.55,
    make: s => {
      // a blunt bonk, and the world going slow
      thump(s, 0, 110, 0.6, 0.08);
      s.noise({ v: 0.7, d: 0.08, filter: 'bandpass', f: 520, q: 5 });
      s.tone({ f: 260, f1: 190, v: 0.5, a: 0.001, d: 0.1 });
      s.tone({ at: 0.06, f: 950, f1: 520, v: 0.18, a: 0.02, d: 0.45, vib: [7, 0.04], wave: 'tri' });
    },
  },
  hitSilence: {
    len: 0.6,
    loud: 0.52,
    make: s => {
      thunk(s, 0, 0.8);
      fizzle(s, 0.02, 0.3, 0.5);
      s.metal({ at: 0.02, f: 1900, v: 0.2, d: 0.35, ratios: [1, 2.01, 2.98] });
    },
  },
  hitKillshot: {
    len: 0.8,
    loud: 0.85,
    make: s => {
      thunk(s, 0, 1, 120);
      thump(s, 0, 60, 0.6, 0.25);
      crunch(s, 0, 0.9, 0.14, 900);
      s.drive(1.5);
      s.reverb(0.18);
    },
  },
  hitVolley: {
    len: 0.5,
    loud: 0.68,
    make: s => {
      // the arrows coming down all around
      for (let k = 0; k < 7; k++)
        thunk(s, s.random() * 0.2, 0.5 + 0.4 * s.random(), 130 + 60 * s.random());
    },
  },
  hitPierce: {
    len: 0.3,
    loud: 0.55,
    make: s => {
      // in, and through
      thunk(s, 0, 1, 140);
      whoosh(s, 0.005, 0.1, 2500, 1200, 0.35, 1.5);
    },
  },
  hitDeadeye: {
    len: 1.1,
    loud: 0.95,
    make: s => {
      s.noise({ v: 1, d: 0.012, filter: 'highpass', f: 2500 });
      thump(s, 0, 52, 0.7, 0.4);
      crunch(s, 0, 1, 0.16, 800);
      s.metal({ f: 360, v: 0.25, d: 0.6 });
      s.drive(1.8);
      s.reverb(0.25);
    },
  },
  trapSnap: {
    len: 0.55,
    loud: 0.75,
    make: s => {
      // steel jaws slamming shut, one a hair after the other
      s.noise({ v: 1, d: 0.012, filter: 'highpass', f: 2000 });
      s.metal({ f: 1150, v: 0.6, d: 0.32, ratios: [1, 2.42, 3.9, 5.1] });
      thump(s, 0, 120, 0.6, 0.08);
      s.metal({ at: 0.035, f: 1420, v: 0.35, d: 0.2 });
    },
  },
  // ------------------------------------------------------------ the interface
  // Tuned to D major, so the jingles sit together; these are only heard by you.
  levelUp: {
    len: 2.2,
    loud: 0.8,
    make: s => {
      // a harp runs up two octaves, then a bright chord rings out and sparkles
      [-7, -3, 0, 5, 9, 12].forEach((n, i) => note(s, i * 0.055, hz(n), 0.6, 0.6));
      for (const n of [-7, 5, 9, 12]) brass(s, 0.33, hz(n), 0.22, 1.1);
      for (const n of [17, 21, 24])
        s.tone({ at: 0.33, f: hz(n), v: 0.07, a: 0.02, d: 1.2, vib: [6, 0.004] });
      crackle(s, 0.33, 1, 0.25, 60, 7000, 9000, 3);
      s.reverb(0.25);
    },
  },
  talent: {
    len: 1.4,
    loud: 0.6,
    make: s => {
      // power flowing in: a rising glow, then two clear bells
      s.tone({
        f: hz(-12),
        f1: hz(12),
        slide: 0.35,
        v: 0.25,
        a: 0.15,
        d: 0.35,
        wave: 'tri',
        vib: [8, 0.01],
      });
      s.noise({ v: 0.12, a: 0.25, d: 0.2, filter: 'bandpass', f: 800, f1: 5000, q: 2 });
      bell(s, 0.35, hz(12), 0.5, 0.9);
      bell(s, 0.42, hz(19), 0.35, 0.8);
      crackle(s, 0.35, 0.6, 0.2, 50, 6000, 8000, 3);
      s.reverb(0.25);
    },
  },
  questAccept: {
    len: 0.9,
    loud: 0.55,
    make: s => {
      // the parchment, and two notes up: off you go
      paper(s, 0, 0.18, 0.5);
      note(s, 0.08, hz(0), 0.7, 0.5);
      note(s, 0.2, hz(5), 0.7, 0.7);
      s.reverb(0.15);
    },
  },
  questReady: {
    len: 1,
    loud: 0.6,
    make: s => {
      // done: a bright little run of bells
      [5, 9, 12].forEach((n, i) => bell(s, i * 0.08, hz(n), 0.5, 0.6));
      s.reverb(0.18);
    },
  },
  questComplete: {
    len: 2.2,
    loud: 0.85,
    make: s => {
      // a fanfare (da-da-DAAA) and the reward's coins
      for (const at of [0, 0.15]) {
        brass(s, at, hz(0), 0.5, 0.12);
        brass(s, at, hz(-12), 0.3, 0.12);
      }
      for (const n of [-7, 5, 9, 12]) brass(s, 0.3, hz(n), 0.35, 1.2);
      for (const [at, f, v] of [
        [0.32, 2100, 0.6],
        [0.38, 2600, 0.5],
        [0.45, 2350, 0.4],
      ])
        coin(s, at, f, v);
      s.reverb(0.25);
    },
  },
  journal: {
    len: 0.9,
    loud: 0.45,
    make: s => {
      // a page turns, and a soft note: something to read
      paper(s, 0, 0.3, 0.7);
      bell(s, 0.18, hz(7), 0.4, 0.6);
      s.reverb(0.12);
    },
  },
  pickup: {
    len: 0.25,
    loud: 0.38,
    make: s => {
      // into the bag: a quick note up
      s.tone({ f: hz(5), f1: hz(17), slide: 0.05, v: 0.6, a: 0.003, d: 0.08, wave: 'tri' });
      s.noise({ v: 0.25, d: 0.02, filter: 'bandpass', f: 1500, q: 1 });
    },
  },
  coins: {
    len: 0.5,
    loud: 0.42,
    make: s => {
      for (const [at, f, v] of [
        [0, 2100, 1],
        [0.05, 2600, 0.8],
        [0.1, 2350, 0.7],
        [0.16, 2800, 0.5],
      ])
        coin(s, at, f, v);
    },
  },
  equip: {
    len: 0.4,
    loud: 0.45,
    make: s => {
      // leather and buckles
      s.noise({ v: 0.6, a: 0.02, d: 0.12, filter: 'bandpass', f: 1300, q: 1, am: [35, 0.5] });
      thump(s, 0.02, 160, 0.4, 0.06);
      s.metal({ at: 0.08, f: 1900, v: 0.35, d: 0.15, ratios: [1, 2.6, 4.1] });
    },
  },
  eat: {
    len: 0.65,
    loud: 0.42,
    make: s => {
      // three bites and a gulp
      for (const [at, v] of [
        [0, 1],
        [0.16, 0.8],
        [0.3, 0.6],
      ]) {
        s.noise({ at, v: v * 0.6, d: 0.06, filter: 'bandpass', f: 1800, q: 0.8 });
        crackle(s, at, 0.07, v * 0.6, 300, 3000, 2000);
      }
      s.tone({ at: 0.47, f: 320, f1: 160, v: 0.5, a: 0.005, d: 0.09 });
    },
  },
  cook: {
    len: 1,
    loud: 0.45,
    make: s => {
      // set down on the coals, and it sizzles
      s.noise({ v: 0.4, d: 0.05, filter: 'lowpass', f: 900 });
      s.noise({ v: 0.5, a: 0.03, d: 0.8, filter: 'highpass', f: 3500 });
      crackle(s, 0, 0.8, 0.6, 120, 4000, 2500, 2);
    },
  },
  smelt: {
    len: 1.4,
    loud: 0.55,
    make: s => {
      // the bellows (twice), the fire roaring up, the metal running and bubbling
      for (const at of [0, 0.32])
        s.noise({ at, v: 0.6, a: 0.15, d: 0.12, filter: 'lowpass', f: 300, f1: 900 });
      s.noise({
        at: 0.1,
        v: 0.5,
        a: 0.1,
        d: 0.6,
        filter: 'bandpass',
        f: 350,
        q: 0.8,
        am: [9, 0.4],
      });
      s.noise({ at: 0.75, v: 0.35, a: 0.02, d: 0.5, filter: 'highpass', f: 3000 });
      for (let k = 0; k < 5; k++)
        bubble(
          s,
          0.8 + s.random() * 0.4,
          110 + 120 * s.random(),
          260 + 150 * s.random(),
          0.35,
          0.05
        );
    },
  },
  smith: {
    len: 1.1,
    loud: 0.6,
    make: s => {
      // the hammer on the anvil, twice, then the quench
      for (const at of [0, 0.24]) {
        s.metal({ at, f: 1050, v: 0.6, d: 0.45, ratios: [1, 2.8, 4.6, 6.3] });
        s.noise({ at, v: 0.5, d: 0.01, filter: 'highpass', f: 3000 });
        thump(s, at, 200, 0.3, 0.05);
      }
      s.noise({ at: 0.5, v: 0.35, a: 0.01, d: 0.45, filter: 'highpass', f: 2500 });
    },
  },
  woodwork: {
    len: 1,
    loud: 0.5,
    make: s => {
      // three strokes of the knife along the wood, then the string tied on
      for (const at of [0, 0.16, 0.32])
        s.noise({
          at,
          v: 0.6,
          a: 0.02,
          d: 0.08,
          filter: 'bandpass',
          f: 2600,
          f1: 1800,
          q: 2,
          am: [70, 0.5],
        });
      s.pluck({ at: 0.55, f: 220, v: 0.7, d: 0.3, bright: 0.8, damp: 0.997 });
      thump(s, 0.55, 180, 0.3, 0.05);
    },
  },
  build: {
    len: 0.6,
    loud: 0.55,
    make: s => {
      // logs and stones set down
      for (const [at, f] of [
        [0, 140],
        [0.1, 170],
        [0.22, 120],
      ]) {
        thump(s, at, f, 0.6, 0.08);
        s.noise({ at, v: 0.5, d: 0.05, filter: 'bandpass', f: 700, q: 2 });
      }
    },
  },
  perfect: {
    len: 0.6,
    loud: 0.5,
    make: s => {
      // timed just right: two bright bells
      bell(s, 0, hz(19), 0.5, 0.4);
      bell(s, 0.06, hz(24), 0.5, 0.5);
    },
  },
  error: {
    len: 0.25,
    loud: 0.38,
    gap: 0.4,
    make: s => {
      // a soft "nope": two low notes, down
      s.tone({ f: hz(-14), v: 0.6, a: 0.004, d: 0.07, wave: 'tri', lp: 1200 });
      s.tone({ at: 0.08, f: hz(-19), v: 0.6, a: 0.004, d: 0.1, wave: 'tri', lp: 1200 });
    },
  },
  died: {
    len: 2.2,
    loud: 0.7,
    make: s => {
      // a low drum, and three notes falling in a minor key
      drum(s, 0, 50, 0.6, 0.7);
      for (const [at, n] of [
        [0.05, 0],
        [0.35, -4],
        [0.65, -7],
        [0.65, -19],
      ])
        s.tone({ at, f: hz(n), v: 0.3, a: 0.04, d: 0.9, wave: 'tri', lp: 1500 });
      s.reverb(0.35, 1.3);
    },
  },
  respawn: {
    len: 1.6,
    loud: 0.5,
    make: s => {
      // a breath of air, a chord fading in, a bell: back on your feet
      s.noise({ v: 0.25, a: 0.5, d: 0.5, filter: 'bandpass', f: 400, f1: 3000, q: 1.5 });
      [-7, -3, 0, 5].forEach((n, i) =>
        s.tone({ at: 0.1 + i * 0.08, f: hz(n), v: 0.18, a: 0.25, d: 0.8 })
      );
      bell(s, 0.55, hz(12), 0.3, 0.7);
      s.reverb(0.25);
    },
  },
  open: {
    len: 0.25,
    loud: 0.32,
    make: s => {
      // a cover lifts, a page settles
      s.noise({ v: 0.7, a: 0.05, d: 0.06, filter: 'bandpass', f: 700, f1: 2200, q: 1.2 });
      s.noise({ at: 0.1, v: 0.4, d: 0.015, filter: 'bandpass', f: 3000, q: 1.5 });
    },
  },
  close: {
    len: 0.2,
    loud: 0.3,
    make: s => {
      // and comes down
      s.noise({ v: 0.5, a: 0.03, d: 0.03, filter: 'bandpass', f: 1600, f1: 600, q: 1.2 });
      thump(s, 0.05, 150, 0.6, 0.06);
    },
  },
  // ------------------------------------------------------------ the world
  autoSwing: {
    len: 0.35,
    loud: 0.38,
    make: s => {
      whoosh(s, 0, 0.1, 900, 2600, 0.9, 1.3);
      thump(s, 0.07, 140, 0.6, 0.07);
    },
  },
  autoShot: {
    len: 0.3,
    loud: 0.36,
    make: s => twang(s, 0, 178, 0.7, 0.15),
  },
  heroHurt: {
    len: 0.35,
    loud: 0.45,
    gap: 0.08,
    make: s => {
      // a blow landing on you: a thud, and your gear rattling
      thump(s, 0, 115, 1, 0.12);
      s.noise({ at: 0.005, v: 0.4, d: 0.09, filter: 'bandpass', f: 2600, q: 1.2, am: [45, 0.6] });
    },
  },
  chop: {
    len: 0.45,
    loud: 0.55,
    make: s => {
      // the axe bites: a crack, the knock of the trunk, chips flying
      s.noise({ v: 0.8, d: 0.006, filter: 'highpass', f: 2500 });
      s.noise({ v: 0.8, d: 0.07, filter: 'bandpass', f: 650, q: 3 });
      s.tone({ f: 240, f1: 210, v: 0.5, a: 0.001, d: 0.14 });
      s.tone({ f: 470, v: 0.25, a: 0.001, d: 0.08 });
      crackle(s, 0.01, 0.08, 0.4, 250, 3000, 2000);
    },
  },
  treeFall: {
    len: 1.8,
    loud: 0.8,
    make: s => {
      // the trunk groans and splits, the crown rushes down, and the ground takes it
      s.noise({
        v: 0.6,
        a: 0.15,
        d: 0.15,
        filter: 'bandpass',
        f: 380,
        f1: 220,
        q: 9,
        am: [14, 0.6],
      });
      crackle(s, 0.05, 0.3, 0.7, 120, 1800, 900, 1.2);
      s.noise({ at: 0.15, v: 0.6, a: 0.2, d: 0.08, filter: 'bandpass', f: 900, f1: 400, q: 0.8 });
      thump(s, 0.38, 50, 0.45, 0.4);
      s.noise({ at: 0.38, v: 0.8, d: 0.35, filter: 'lowpass', f: 2500 });
      crackle(s, 0.38, 0.5, 0.5, 120, 4000, 2500);
      s.reverb(0.2);
    },
  },
  mine: {
    len: 0.4,
    loud: 0.55,
    make: s => {
      // the pick on stone: a bright clink, the knock, chips of rock
      s.metal({ f: 2350, v: 0.5, d: 0.12, ratios: [1, 2.6, 4.3] });
      s.noise({ v: 0.7, d: 0.04, filter: 'bandpass', f: 1300, q: 2 });
      thump(s, 0, 180, 0.4, 0.05);
      crackle(s, 0.01, 0.1, 0.4, 200, 4500, 3000, 2);
    },
  },
  rockBreak: {
    len: 1.2,
    loud: 0.75,
    make: s => {
      // a crack, and the rock tumbles apart
      s.noise({ v: 0.5, d: 0.01, filter: 'highpass', f: 2000 });
      thump(s, 0, 70, 0.5, 0.25);
      s.noise({ at: 0.01, v: 0.7, a: 0.03, d: 0.5, filter: 'lowpass', f: 700, am: [25, 0.5] });
      crackle(s, 0.02, 0.6, 0.8, 100, 1500, 600, 1.2);
      crackle(s, 0.25, 0.6, 0.3, 40, 5000, 4000, 3);
      s.reverb(0.12);
    },
  },
  fireball: {
    len: 0.6,
    loud: 0.6,
    make: s => {
      // a ball of witch-fire leaving the staff
      s.noise({
        v: 0.8,
        a: 0.05,
        d: 0.35,
        filter: 'bandpass',
        f: 500,
        f1: 1400,
        q: 1,
        am: [20, 0.4],
      });
      s.tone({
        f: hz(-14),
        f1: hz(-2),
        slide: 0.3,
        v: 0.25,
        a: 0.02,
        d: 0.35,
        wave: 'tri',
        vib: [11, 0.04],
      });
      crackle(s, 0, 0.4, 0.4, 100, 3000, 2000, 2);
    },
  },
  fireballHit: {
    len: 1.1,
    loud: 0.75,
    make: s => {
      thump(s, 0, 60, 0.8, 0.3);
      s.noise({ v: 1, a: 0.005, d: 0.45, filter: 'lowpass', f: 2200, f1: 500 });
      crackle(s, 0, 0.5, 0.5, 120, 3500, 1500);
      s.tone({ f: hz(-2), f1: hz(-19), slide: 0.4, v: 0.2, a: 0.005, d: 0.4, wave: 'tri' });
      s.reverb(0.2);
    },
  },
  bellToll: {
    len: 1.7,
    loud: 1,
    make: s => {
      // Millbrook's bell, gone wrong: the clapper's dull knock, then each stroke swells up out
      // of silence and stops dead, as if the sound were sucked back into the bronze
      thump(s, 0, 90, 0.5, 0.3);
      const strike = hz(-19);
      const partials: [number, number][] = [
        [0.5, 0.6],
        [1, 0.8],
        [1.19, 0.5],
        [1.5, 0.3],
        [2, 0.9],
        [2.52, 0.35],
        [3, 0.3],
        [4.17, 0.2],
      ];
      partials.forEach(([r, v], i) =>
        s.tone({ f: strike * r, v: v * 0.4, a: 0.35, d: 1.6 / (1 + i * 0.25) })
      );
      // the rush of it being drawn back in
      s.noise({ at: 1.05, v: 0.4, a: 0.4, d: 0.05, filter: 'bandpass', f: 2200, f1: 700, q: 1 });
      const cut = Math.round(1.45 * RATE);
      const fade = Math.round(0.03 * RATE);
      for (let i = cut; i < s.data.length; i++) s.data[i] *= Math.max(0, 1 - (i - cut) / fade);
    },
  },
  // ------------------------------------------------------------ the creatures
  slimeIdle: {
    len: 0.5,
    loud: 0.32,
    make: s => {
      // blorp
      bubble(s, 0, 170, 420, 0.8, 0.07);
      bubble(s, 0.11, 230, 520, 0.5, 0.06);
      s.noise({ v: 0.25, d: 0.1, filter: 'lowpass', f: 900 });
    },
  },
  slimeAttack: {
    len: 0.5,
    loud: 0.5,
    make: s => {
      // it gathers itself and flops onto you
      s.noise({ v: 0.6, a: 0.04, d: 0.12, filter: 'lowpass', f: 1200, am: [40, 0.6] });
      bubble(s, 0, 200, 500, 0.6, 0.08);
      s.noise({ at: 0.12, v: 0.7, d: 0.12, filter: 'bandpass', f: 800, q: 1 });
    },
  },
  slimeHurt: {
    len: 0.4,
    loud: 0.42,
    gap: 0.3,
    make: s => {
      s.noise({ v: 0.8, d: 0.12, filter: 'lowpass', f: 1500, am: [60, 0.7] });
      bubble(s, 0.01, 520, 210, 0.6, 0.08);
    },
  },
  slimeDie: {
    len: 0.9,
    loud: 0.58,
    make: s => {
      // it bursts
      bubble(s, 0, 600, 150, 0.7, 0.12);
      s.noise({ v: 0.9, d: 0.3, filter: 'lowpass', f: 2000, f1: 600 });
      for (let k = 0; k < 6; k++)
        bubble(
          s,
          0.08 + s.random() * 0.4,
          300 + 600 * s.random(),
          700 + 600 * s.random(),
          0.25,
          0.04
        );
    },
  },
  cowIdle: {
    len: 1.2,
    loud: 0.5,
    make: s =>
      voice(s, {
        at: 0,
        d: 0.95,
        f: 118,
        peak: 132,
        f1: 104,
        mouth: MOO,
        v: 1,
        rough: 0.12,
        breath: 0.15,
        a: 0.12,
      }),
  },
  cowHurt: {
    len: 0.8,
    loud: 0.5,
    gap: 0.4,
    make: s =>
      voice(s, {
        at: 0,
        d: 0.5,
        f: 160,
        peak: 195,
        f1: 140,
        mouth: MOO,
        v: 1,
        rough: 0.2,
        breath: 0.2,
        a: 0.03,
      }),
  },
  cowDie: {
    len: 1.5,
    loud: 0.55,
    make: s => {
      voice(s, {
        at: 0,
        d: 0.9,
        f: 145,
        peak: 150,
        f1: 90,
        mouth: MOO,
        v: 1,
        rough: 0.3,
        breath: 0.25,
        a: 0.05,
      });
      thump(s, 0.75, 70, 0.9, 0.3);
      s.noise({ at: 0.75, v: 0.4, d: 0.2, filter: 'lowpass', f: 800 });
    },
  },
  goblinNotice: {
    len: 0.7,
    loud: 0.55,
    make: s => {
      // "hee-hee-hee!"
      for (const [at, f] of [
        [0, 380],
        [0.11, 420],
        [0.22, 460],
      ])
        voice(s, {
          at,
          d: 0.09,
          f,
          peak: f * 1.1,
          f1: f,
          mouth: EE,
          v: 1,
          rough: 0.35,
          breath: 0.35,
          a: 0.01,
        });
    },
  },
  goblinAttack: {
    len: 0.4,
    loud: 0.45,
    make: s => {
      // a dagger's quick slash, and a grunt
      whoosh(s, 0, 0.08, 2000, 4500, 0.8, 1.6);
      voice(s, {
        at: 0.01,
        d: 0.1,
        f: 330,
        peak: 360,
        f1: 300,
        mouth: AH,
        v: 0.8,
        rough: 0.3,
        a: 0.01,
      });
    },
  },
  goblinHurt: {
    len: 0.4,
    loud: 0.45,
    gap: 0.3,
    make: s =>
      voice(s, {
        at: 0,
        d: 0.18,
        f: 420,
        peak: 540,
        f1: 340,
        mouth: EE,
        v: 1,
        rough: 0.25,
        breath: 0.3,
        a: 0.01,
      }),
  },
  goblinDie: {
    len: 1,
    loud: 0.55,
    make: s => {
      voice(s, {
        at: 0,
        d: 0.55,
        f: 460,
        peak: 500,
        f1: 210,
        mouth: AH,
        v: 1,
        rough: 0.3,
        breath: 0.3,
        a: 0.01,
      });
      thump(s, 0.45, 120, 0.6, 0.12);
    },
  },
  shamanNotice: {
    len: 0.9,
    loud: 0.55,
    make: s => {
      // a higher cackle, and a glint of magic
      for (const [at, f] of [
        [0, 470],
        [0.1, 520],
        [0.2, 580],
      ])
        voice(s, {
          at,
          d: 0.08,
          f,
          peak: f * 1.1,
          f1: f,
          mouth: EH,
          v: 1,
          rough: 0.3,
          breath: 0.35,
          a: 0.01,
        });
      bell(s, 0.3, hz(14), 0.25, 0.5);
    },
  },
  shamanAttack: {
    len: 0.45,
    loud: 0.45,
    make: s => {
      // a swing of the staff and its knock
      whoosh(s, 0, 0.12, 500, 1500, 0.8);
      s.noise({ at: 0.08, v: 0.6, d: 0.05, filter: 'bandpass', f: 700, q: 3 });
      s.tone({ at: 0.08, f: 300, f1: 260, v: 0.4, a: 0.001, d: 0.08 });
    },
  },
  shamanCast: {
    len: 1.1,
    loud: 0.55,
    make: s => {
      // a chanted word, and the fire gathering in the staff
      voice(s, {
        at: 0,
        d: 0.7,
        f: 230,
        peak: 260,
        f1: 220,
        mouth: OH,
        v: 1,
        rough: 0.15,
        breath: 0.25,
        vib: 0.03,
      });
      s.tone({ at: 0.1, f: 200, f1: 700, v: 0.18, a: 0.5, d: 0.3, wave: 'tri', vib: [9, 0.03] });
      crackle(s, 0.2, 0.7, 0.4, 80, 3000, 4500, 2);
      s.reverb(0.15);
    },
  },
  shamanHurt: {
    len: 0.4,
    loud: 0.45,
    gap: 0.3,
    make: s =>
      voice(s, {
        at: 0,
        d: 0.17,
        f: 480,
        peak: 600,
        f1: 400,
        mouth: EH,
        v: 1,
        rough: 0.25,
        breath: 0.3,
        a: 0.01,
      }),
  },
  shamanDie: {
    len: 1.1,
    loud: 0.55,
    make: s => {
      voice(s, {
        at: 0,
        d: 0.6,
        f: 520,
        peak: 560,
        f1: 240,
        mouth: EH,
        v: 1,
        rough: 0.3,
        breath: 0.3,
        a: 0.01,
      });
      // the staff clattering down
      for (const at of [0.48, 0.58]) {
        s.noise({ at, v: 0.5, d: 0.04, filter: 'bandpass', f: 800, q: 3 });
        s.tone({ at, f: 320, v: 0.3, a: 0.001, d: 0.06 });
      }
    },
  },
  ogreNotice: {
    len: 1.4,
    loud: 0.8,
    make: s => {
      // a roar
      voice(s, {
        at: 0,
        d: 0.85,
        f: 78,
        peak: 98,
        f1: 68,
        mouth: OH,
        v: 1.6,
        rough: 0.6,
        roughHz: 28,
        breath: 0.45,
        a: 0.06,
      });
      s.drive(2.5);
      s.reverb(0.2);
    },
  },
  ogreAttack: {
    len: 0.5,
    loud: 0.6,
    make: s => {
      // the club comes round, with a grunt behind it
      whoosh(s, 0, 0.18, 300, 1100, 1, 0.9);
      voice(s, { at: 0, d: 0.12, f: 85, peak: 92, f1: 80, mouth: AH, v: 1.2, rough: 0.5, a: 0.01 });
    },
  },
  ogreHurt: {
    len: 0.5,
    loud: 0.55,
    gap: 0.35,
    make: s => {
      voice(s, {
        at: 0,
        d: 0.25,
        f: 92,
        peak: 100,
        f1: 76,
        mouth: AH,
        v: 1.4,
        rough: 0.45,
        breath: 0.3,
        a: 0.01,
      });
      s.drive(1.5);
    },
  },
  ogreDie: {
    len: 2,
    loud: 0.8,
    make: s => {
      // a long groan, and a great weight hitting the ground
      voice(s, {
        at: 0,
        d: 1.1,
        f: 88,
        peak: 92,
        f1: 52,
        mouth: OH,
        v: 1.4,
        rough: 0.5,
        breath: 0.35,
        a: 0.03,
      });
      thump(s, 1, 45, 0.8, 0.4);
      s.noise({ at: 1, v: 0.5, d: 0.3, filter: 'lowpass', f: 700 });
      s.drive(1.8);
      s.reverb(0.2);
    },
  },
  boneRise: {
    len: 1.3,
    loud: 0.55,
    make: s => {
      // the earth parting, bones knocking together, and a low moan from under it all
      s.noise({ v: 0.5, a: 0.2, d: 0.5, filter: 'lowpass', f: 500 });
      crackle(s, 0, 0.6, 0.5, 80, 1500, 800, 1.2);
      rattle(s, 0.2, 0.7, 0.6, 14);
      s.tone({
        at: 0.1,
        f: 110,
        f1: 98,
        v: 0.18,
        a: 0.3,
        d: 0.6,
        wave: 'tri',
        lp: 800,
        vib: [5, 0.03],
      });
    },
  },
  skeletonNotice: {
    len: 0.5,
    loud: 0.45,
    make: s => {
      // its jaw chattering
      for (let k = 0; k < 6; k++) clack(s, k / 14, 0.7 - k * 0.06, 1500 + 200 * s.random());
    },
  },
  skeletonAttack: {
    len: 0.4,
    loud: 0.45,
    make: s => {
      // a rusty blade, and the creak of the arm swinging it
      whoosh(s, 0, 0.1, 1200, 3200, 0.8, 1.3);
      rattle(s, 0, 0.15, 0.4, 4);
    },
  },
  skeletonHurt: {
    len: 0.4,
    loud: 0.45,
    gap: 0.3,
    make: s => {
      s.noise({ v: 0.6, d: 0.03, filter: 'bandpass', f: 1800, q: 4 });
      s.tone({ f: 900, v: 0.3, a: 0.001, d: 0.05 });
      rattle(s, 0.01, 0.18, 0.8, 7);
    },
  },
  skeletonDie: {
    len: 1.1,
    loud: 0.6,
    make: s => {
      // it comes apart, bone by bone, into the dust
      rattle(s, 0, 0.7, 1, 26);
      thump(s, 0.3, 110, 0.4, 0.1);
      s.noise({ at: 0.2, v: 0.3, a: 0.05, d: 0.4, filter: 'bandpass', f: 1500, q: 0.6 });
    },
  },
  houndNotice: {
    len: 0.7,
    loud: 0.6,
    make: s => {
      // two rough barks from a dry throat
      for (const [at, f] of [
        [0, 210],
        [0.2, 195],
      ])
        voice(s, {
          at,
          d: 0.13,
          f,
          peak: f * 1.28,
          f1: f * 0.85,
          mouth: AH,
          v: 1.3,
          rough: 0.6,
          roughHz: 40,
          breath: 0.4,
          a: 0.008,
        });
      rattle(s, 0, 0.4, 0.3, 6);
      s.drive(2);
    },
  },
  houndAttack: {
    len: 0.4,
    loud: 0.5,
    make: s => {
      // a snarl and the jaws snapping shut
      voice(s, {
        at: 0,
        d: 0.15,
        f: 120,
        peak: 130,
        f1: 110,
        mouth: UH,
        v: 1.2,
        rough: 0.7,
        roughHz: 45,
        breath: 0.5,
        a: 0.01,
      });
      for (const at of [0.08, 0.14]) {
        s.noise({ at, v: 0.7, d: 0.008, filter: 'highpass', f: 2500 });
        s.tone({ at, f: 1300, v: 0.35, a: 0.001, d: 0.02 });
      }
    },
  },
  houndHurt: {
    len: 0.4,
    loud: 0.5,
    gap: 0.3,
    make: s => {
      voice(s, {
        at: 0,
        d: 0.15,
        f: 520,
        peak: 680,
        f1: 420,
        mouth: EE,
        v: 1,
        rough: 0.2,
        breath: 0.3,
        a: 0.008,
      });
      rattle(s, 0.02, 0.15, 0.4, 4);
    },
  },
  houndDie: {
    len: 1.1,
    loud: 0.55,
    make: s => {
      // a whine falling away, and the bones giving way
      voice(s, {
        at: 0,
        d: 0.5,
        f: 620,
        peak: 640,
        f1: 260,
        mouth: EE,
        v: 1,
        rough: 0.25,
        breath: 0.3,
        a: 0.01,
      });
      rattle(s, 0.35, 0.6, 0.8, 18);
    },
  },
  ringerNotice: {
    len: 2,
    loud: 0.75,
    make: s => {
      // a groan from the belfry's dark, and the bell humming with it
      voice(s, {
        at: 0,
        d: 1.1,
        f: 70,
        peak: 78,
        f1: 62,
        mouth: OH,
        v: 1.4,
        rough: 0.3,
        breath: 0.5,
        a: 0.2,
        vib: 0.03,
      });
      s.tone({ f: hz(-31), v: 0.12, a: 0.3, d: 1.2 });
      s.reverb(0.4, 1.3);
    },
  },
  ringerAttack: {
    len: 0.6,
    loud: 0.6,
    make: s => {
      whoosh(s, 0, 0.2, 300, 1200, 1, 0.9);
      voice(s, { at: 0, d: 0.15, f: 75, peak: 82, f1: 70, mouth: AH, v: 1.2, rough: 0.4, a: 0.01 });
    },
  },
  ringerHurt: {
    len: 0.8,
    loud: 0.55,
    gap: 0.4,
    make: s => {
      voice(s, {
        at: 0,
        d: 0.32,
        f: 80,
        peak: 84,
        f1: 66,
        mouth: OH,
        v: 1.4,
        rough: 0.35,
        breath: 0.4,
        a: 0.02,
      });
      s.metal({ f: 440, v: 0.12, d: 0.6, ratios: [1, 1.19, 2, 3] });
      s.reverb(0.25);
    },
  },
  ringerDie: {
    len: 3.2,
    loud: 0.9,
    make: s => {
      // a long last groan, and the cracked bell answering out of tune
      voice(s, {
        at: 0,
        d: 1.8,
        f: 80,
        peak: 84,
        f1: 40,
        mouth: OH,
        v: 1.4,
        rough: 0.35,
        breath: 0.5,
        a: 0.05,
        vib: 0.04,
      });
      for (const [r, v] of [
        [1, 0.3],
        [1.13, 0.25],
        [2.07, 0.2],
        [2.9, 0.12],
      ])
        s.tone({ at: 0.3, f: hz(-19) * r, v, a: 0.01, d: 2, vib: [3, 0.006] });
      s.noise({ at: 0.3, v: 0.2, d: 1.2, filter: 'bandpass', f: 600, q: 4, am: [17, 0.8] });
      s.reverb(0.4, 1.3);
    },
  },
  // ------------------------------------------------------------ the weather
  thunderNear: {
    len: 4.6,
    loud: 0.95,
    takes: 2,
    make: s => {
      // the bolt splits the air right here: a ripping crack, the slam, then the roll
      s.noise({ v: 0.5, a: 0.002, d: 0.02, filter: 'highpass', f: 1800 });
      crackle(s, 0, 0.5, 0.8, 600, 4200, 900, 1.1);
      s.noise({ at: 0.01, v: 0.8, a: 0.01, d: 0.6, filter: 'bandpass', f: 1300, f1: 280, q: 0.7, am: [38, 0.6] });
      thump(s, 0.03, 62, 0.45, 0.8);
      rumble(s, 0.12, 4.5, 2.2, 480);
      s.reverb(0.3, 1.8);
    },
  },
  thunder: {
    len: 5,
    loud: 0.7,
    takes: 2,
    make: s => {
      // a strike out of sight: a tearing roll that swells and grumbles away
      crackle(s, 0, 0.7, 0.45, 200, 1500, 450, 1);
      s.noise({ v: 0.55, a: 0.08, d: 0.9, filter: 'bandpass', f: 700, f1: 220, q: 0.6, am: [22, 0.5] });
      rumble(s, 0.05, 5, 1, 420);
      s.reverb(0.35, 1.8);
    },
  },
  thunderFar: {
    len: 5.4,
    loud: 0.4,
    takes: 2,
    make: s => {
      // far off: only the low roll arrives, soft and long
      rumble(s, 0, 5.5, 1, 360, 6);
      s.reverb(0.3, 1.8);
    },
  },
  // ------------------------------------------------------------ the people
  ...VOICES,
};

const rendered = new Map<string, Float32Array>();

/** A take of a sound, rendered once (the loading screen renders them all: soundJobs). */
export function soundSamples(id: SoundId, take = 0): Float32Array {
  const key = `${id}:${take}`;
  let d = rendered.get(key);
  if (!d) rendered.set(key, (d = renderSound(id, take)));
  return d;
}

/** Every take of every sound. */
export function allTakes(): [SoundId, number][] {
  return (Object.keys(SOUNDS) as SoundId[]).flatMap(id =>
    Array.from({ length: SOUNDS[id].takes ?? 1 }, (_, k): [SoundId, number] => [id, k])
  );
}

/** The loading screen's steps: every sound, a few at a time, so the bar keeps moving. */
export function soundJobs(): { label: string; run: () => void }[] {
  const all = allTakes();
  const labels = [
    'Tuning the bowstrings…',
    'Whetting the war cries…',
    'Rattling the bones…',
    'Teaching the bards…',
  ];
  const per = 6;
  const n = Math.ceil(all.length / per);
  return Array.from({ length: n }, (_, i) => ({
    label: labels[Math.floor((i * labels.length) / n)],
    run: () => all.slice(i * per, (i + 1) * per).forEach(([id, k]) => soundSamples(id, k)),
  }));
}

/** Render a take of a sound to samples at RATE, at its loudness. */
export function renderSound(id: SoundId, take = 0): Float32Array {
  const r = SOUNDS[id];
  // a seed per sound and take, so each always comes out the same
  let seed = 7 + take * 7919;
  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const tr = new Track(r.len, seed);
  r.make(tr);
  return master(tr, r.loud);
}
