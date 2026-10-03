import { Biquad, RATE, Track } from './synth';
import type { FilterType } from './synth';

/**
 * The weather's endless sounds, rendered like the rest (synth.ts) but as seamless loops: the
 * patter of rain, a downpour's roar and the wind of a storm. WeatherAudio fades them in and
 * out with the weather.
 */
export type LoopId = 'rain' | 'downpour' | 'wind';
export const LOOP_IDS: LoopId[] = ['rain', 'downpour', 'wind'];

interface LoopRecipe {
  /** Seconds before it repeats. */
  len: number;
  /** Its level, as RMS: well under the action (a sword swing is about 0.1, the loudest blows 0.25). */
  rms: number;
  make: (s: Track, len: number) => void;
}

/** Seconds of the end crossfaded into the start, so the seam can't be heard. */
const XF = 0.5;

/** Noise that never stops, through a filter; `gain` and `freq` (if given) follow the clock. */
function bed(s: Track, v: number, type: FilterType, f: number, q = 0.707, gain?: (t: number) => number, freq?: (t: number) => number): void {
  const b = new Biquad(type, f, q);
  const d = s.data;
  let g = gain ? gain(0) : 1;
  for (let i = 0; i < d.length; i++) {
    if (i % 64 === 0) {
      const t = i / RATE;
      if (freq) b.set(freq(t), q);
      if (gain) g = gain(t);
    }
    d[i] += b.run(s.random() * 2 - 1) * v * g;
  }
}

/** Raindrops: `rate` a second, ticks of noise at random pitches, most soft and a few close and loud. */
function drops(s: Track, rate: number, v: number, f0: number, f1: number): void {
  const n = Math.round(rate * s.seconds);
  for (let i = 0; i < n; i++) {
    const loud = Math.pow(s.random(), 3);
    s.noise({
      at: s.random() * s.seconds,
      v: v * (0.15 + 0.85 * loud),
      a: 0.0005,
      d: 0.002 + 0.007 * s.random(),
      filter: 'bandpass',
      f: f0 + (f1 - f0) * s.random(),
      q: 1.5 + 3 * s.random(),
    });
  }
}

/** Drops into puddles: a tiny rising "plip". */
function plips(s: Track, rate: number, v: number): void {
  const n = Math.round(rate * s.seconds);
  for (let i = 0; i < n; i++) {
    const f = 1500 + 2500 * s.random();
    s.tone({ at: s.random() * s.seconds, f, f1: f * 1.35, slide: 0.02, v: v * (0.4 + 0.6 * s.random()), a: 0.0008, d: 0.025 });
  }
}

/** A sine that comes round a whole number of times in the loop (so it joins up). */
const cyc = (len: number, n: number, ph = 0) => (t: number) => Math.sin((2 * Math.PI * n * t) / len + ph);

const LOOPS: Record<LoopId, LoopRecipe> = {
  rain: {
    len: 7,
    rms: 0.022,
    make: (s, len) => {
      // a soft, steady hush of rain some way off, the odd drop nearer; dark, so it stays behind the game
      bed(s, 0.6, 'lowpass', 1700, 0.5);
      bed(s, 0.45, 'lowpass', 500, 0.707, t => 0.9 + 0.1 * cyc(len, 2, 1)(t));
      drops(s, 150, 0.3, 800, 2800);
      plips(s, 1.5, 0.08);
      s.filter('lowpass', 3200);
    },
  },
  downpour: {
    len: 7,
    rms: 0.032,
    make: (s, len) => {
      // heavy rain: a deep, even rush that swells a little
      const surge = (t: number) => 0.9 + 0.06 * cyc(len, 3, 0.4)(t) + 0.04 * cyc(len, 7, 2)(t);
      bed(s, 0.8, 'lowpass', 1100, 0.5, surge);
      bed(s, 0.6, 'lowpass', 320, 0.707, surge);
      drops(s, 350, 0.25, 700, 2400);
      s.filter('lowpass', 2600);
    },
  },
  wind: {
    len: 12,
    rms: 0.022,
    make: (s, len) => {
      // a low wind that rises and falls gently (no whistle)
      const gust = (t: number) => 0.6 + 0.22 * cyc(len, 2, 1)(t) + 0.08 * cyc(len, 5, 2.5)(t);
      bed(s, 1, 'bandpass', 300, 1.1, t => 0.6 + 0.4 * gust(t), t => 200 + 180 * gust(t));
      bed(s, 0.5, 'lowpass', 160);
      s.filter('lowpass', 900);
    },
  },
};

/** Render a loop: its length plus the crossfade, the end then laid over the start, brought to its level. */
export function renderLoop(id: LoopId): Float32Array {
  const r = LOOPS[id];
  let seed = 11;
  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const s = new Track(r.len + XF, seed);
  r.make(s, r.len);
  const src = s.data;
  const n = Math.round(r.len * RATE);
  const x = Math.round(XF * RATE);
  const out = src.slice(0, n);
  // the end runs on into the start: fade one into the other (equal power: it's noise)
  for (let i = 0; i < x; i++) {
    const a = i / x;
    out[i] = src[i] * Math.sqrt(a) + src[n + i] * Math.sqrt(1 - a);
  }
  let sum = 0;
  for (const v of out) sum += v * v;
  const g = r.rms / Math.sqrt(sum / out.length || 1);
  for (let i = 0; i < out.length; i++) {
    const v = out[i] * g;
    out[i] = Math.abs(v) <= 0.8 ? v : Math.sign(v) * (0.8 + 0.2 * Math.tanh((Math.abs(v) - 0.8) / 0.2));
  }
  return out;
}

const rendered = new Map<LoopId, Float32Array>();

/** A loop, rendered once (the loading screen renders them: loopJobs). */
export function loopSamples(id: LoopId): Float32Array {
  let d = rendered.get(id);
  if (!d) rendered.set(id, (d = renderLoop(id)));
  return d;
}

/** The loading screen's steps: one loop each. */
export function loopJobs(): { label: string; run: () => void }[] {
  return LOOP_IDS.map(id => ({ label: 'Gathering the rain clouds…', run: () => void loopSamples(id) }));
}
