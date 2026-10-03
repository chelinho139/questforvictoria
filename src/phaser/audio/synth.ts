/**
 * A tiny offline synthesizer: sounds are rendered sample by sample into a Float32Array,
 * the way the art is painted pixel by pixel. No Web Audio and no Phaser here, so the
 * recipes run (and are tested) in Node too.
 *
 * Everything is mono at RATE; Sfx pans and places each sound when it plays.
 */

/** Sample rate the sounds are rendered at (Web Audio resamples to the device's). */
export const RATE = 44100;

/** A deterministic random generator (each sound renders the same every time). */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export type FilterType = 'lowpass' | 'highpass' | 'bandpass';

/** An RBJ-cookbook biquad. */
export class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  constructor(
    private readonly type: FilterType,
    f: number,
    q = 0.707
  ) {
    this.set(f, q);
  }

  set(f: number, q: number): void {
    const w = (2 * Math.PI * Math.min(Math.max(f, 10), RATE * 0.45)) / RATE;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    let b0: number, b1: number, b2: number;
    if (this.type === 'lowpass') {
      b1 = 1 - cos;
      b0 = b2 = b1 / 2;
    } else if (this.type === 'highpass') {
      b1 = -(1 + cos);
      b0 = b2 = (1 + cos) / 2;
    } else {
      // constant 0 dB peak gain
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
    }
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  run(x: number): number {
    const y =
      this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/** Glide from a to b over p in 0..1: exponential for frequencies (both > 0), else straight. */
function glide(a: number, b: number, p: number): number {
  if (a === b) return a;
  return a > 0 && b > 0 ? a * Math.pow(b / a, p) : a + (b - a) * p;
}

/** Attack, then an exponential fall to silence over `d` (−60 dB at the end): call once a sample. */
function envelope(a: number, d: number): () => number {
  const na = Math.round(a * RATE);
  const nd = Math.max(1, Math.round(d * RATE));
  // the exponential, a sample at a time (Math.exp on every sample is most of a render)
  const k = Math.exp(-6.9 / nd);
  let i = 0;
  let e = 1;
  return () => {
    if (i < na) return i++ / na;
    const u = (i++ - na) / nd;
    if (u >= 1) return 0;
    const out = e * (1 - u * u * u);
    e *= k;
    return out;
  };
}

export type Wave = 'sine' | 'tri' | 'saw' | 'square';

function wave(w: Wave, ph: number): number {
  switch (w) {
    case 'sine':
      return Math.sin(2 * Math.PI * ph);
    case 'tri':
      return 1 - 4 * Math.abs(ph - 0.5);
    case 'saw':
      return 2 * ph - 1;
    case 'square':
      return ph < 0.5 ? 1 : -1;
  }
}

export interface ToneOpts {
  /** Start, seconds. */
  at?: number;
  /** Frequency, and where it glides to over `d` (or over `slide` seconds). */
  f: number;
  f1?: number;
  slide?: number;
  wave?: Wave;
  /** Level. */
  v: number;
  /** Attack and decay, seconds. */
  a?: number;
  d: number;
  /** Vibrato: [rate Hz, depth as a fraction of the frequency]. */
  vib?: [number, number];
  /** Low-pass the tone (tames saws and squares). */
  lp?: number;
}

export interface NoiseOpts {
  at?: number;
  v: number;
  a?: number;
  d: number;
  /** Filter and its centre / corner frequency, gliding to f1 over the sound. */
  filter?: FilterType;
  f?: number;
  f1?: number;
  q?: number;
  /** Tremolo: [rate Hz, depth 0..1], for rips, rattles and purrs. */
  am?: [number, number];
}

/** A mono sound being rendered. */
export class Track {
  readonly data: Float32Array;
  private readonly rand: () => number;

  constructor(seconds: number, seed = 1) {
    this.data = new Float32Array(Math.ceil(seconds * RATE));
    this.rand = rng(seed);
  }

  get seconds(): number {
    return this.data.length / RATE;
  }

  /** A random number in 0..1 (seeded: the same sound every render). */
  random(): number {
    return this.rand();
  }

  /** Mix rendered samples into the track from `at`, at level `v`. */
  mix(at: number, buf: Float32Array, v: number): void {
    const [i0, i1] = this.span(at, buf.length / RATE);
    for (let i = i0, j = 0; i < i1 && j < buf.length; i++, j++) this.data[i] += buf[j] * v;
  }

  /**
   * The samples from `at` for `dur` seconds that fall inside the track. (Each sound below
   * loops over its span itself: a callback a sample was most of the rendering time.)
   */
  private span(at: number, dur: number): [number, number] {
    const i0 = Math.max(0, Math.round(at * RATE));
    return [i0, Math.min(this.data.length, Math.round((at + dur) * RATE))];
  }

  /** An oscillator with a pitch glide, vibrato and an attack/decay envelope. */
  tone(o: ToneOpts): void {
    const a = o.a ?? 0.004;
    const [i0, i1] = this.span(o.at ?? 0, a + o.d);
    const w = o.wave ?? 'sine';
    const lp = o.lp ? new Biquad('lowpass', o.lp) : null;
    const env = envelope(a, o.d);
    // the glide, a sample at a time: exponential when both ends are above zero
    const f1 = o.f1 ?? o.f;
    const ns = Math.max(1, Math.round((o.slide ?? a + o.d) * RATE));
    const expo = o.f > 0 && f1 > 0;
    const step = expo ? Math.pow(f1 / o.f, 1 / ns) : (f1 - o.f) / ns;
    const vibW = o.vib ? (2 * Math.PI * o.vib[0]) / RATE : 0;
    const vibD = o.vib ? o.vib[1] : 0;
    const d = this.data;
    let f = o.f;
    let ph = 0;
    for (let i = i0, j = 0; i < i1; i++, j++) {
      ph += (vibD ? f * (1 + vibD * Math.sin(vibW * j)) : f) / RATE;
      ph -= Math.floor(ph);
      if (j < ns) f = expo ? f * step : f + step;
      const s = wave(w, ph) * o.v * env();
      d[i] += lp ? lp.run(s) : s;
    }
  }

  /** White noise through a (sweeping) filter, with an envelope. */
  noise(o: NoiseOpts): void {
    const a = o.a ?? 0.002;
    const total = a + o.d;
    const [i0, i1] = this.span(o.at ?? 0, total);
    const f0 = o.f ?? 1000;
    const q = o.q ?? 0.707;
    const flt = o.filter ? new Biquad(o.filter, f0, q) : null;
    const sweep = flt && o.f1 !== undefined ? o.f1 : null;
    const env = envelope(a, o.d);
    const amW = o.am ? (2 * Math.PI * o.am[0]) / RATE : 0;
    const amD = o.am ? o.am[1] : 0;
    const n = total * RATE;
    const d = this.data;
    for (let i = i0, j = 0; i < i1; i++, j++) {
      if (flt && sweep !== null && j % 16 === 0) flt.set(glide(f0, sweep, j / n), q);
      let s = this.rand() * 2 - 1;
      if (flt) s = flt.run(s);
      let g = o.v * env();
      if (amD) g *= 1 - amD * (0.5 + 0.5 * Math.sin(amW * j));
      d[i] += s * g;
    }
  }

  /**
   * A plucked string (Karplus–Strong): a burst of noise circulating in a delay line one
   * period long, softened a little each time round. `bright` 0..1 is how much of the
   * burst's top end it keeps; `damp` how fast it dies.
   */
  pluck(o: { at?: number; f: number; v: number; d: number; bright?: number; damp?: number }): void {
    const n = Math.max(2, Math.round(RATE / o.f));
    const line = new Float32Array(n);
    const lp = new Biquad('lowpass', 800 + 7000 * (o.bright ?? 0.5));
    for (let i = 0; i < n; i++) line[i] = lp.run(this.rand() * 2 - 1);
    const keep = 0.5 * (o.damp ?? 0.996);
    const env = envelope(0, o.d);
    const [i0, i1] = this.span(o.at ?? 0, o.d);
    const d = this.data;
    let k = 0;
    for (let i = i0, j = 0; i < i1; i++, j++) {
      const nx = k + 1 === n ? 0 : k + 1;
      const out = line[k];
      line[k] = keep * (line[k] + line[nx]);
      k = nx;
      d[i] += out * o.v * (j < 40 ? j / 40 : 1) * env();
    }
  }

  /**
   * Struck metal: inharmonic partials (a bar's or a bell's), the high ones dying first.
   * `ratios` default to a free bar's modes.
   */
  metal(o: { at?: number; f: number; v: number; d: number; ratios?: number[] }): void {
    const ratios = o.ratios ?? [1, 2.756, 5.404, 8.933];
    ratios.forEach((r, i) =>
      this.tone({ at: o.at, f: o.f * r, v: o.v / (1 + i * 0.7), a: 0.001, d: o.d / (1 + i * 0.8) })
    );
  }

  /** Soft-saturate everything from `at` (growls, crunches). */
  drive(amount: number, at = 0): void {
    const k = Math.tanh(amount);
    const d = this.data;
    for (let i = Math.round(at * RATE); i < d.length; i++) d[i] = Math.tanh(amount * d[i]) / k;
  }

  /** Run the whole track through a filter (in place). */
  filter(type: FilterType, f: number, q = 0.707): void {
    const b = new Biquad(type, f, q);
    for (let i = 0; i < this.data.length; i++) this.data[i] = b.run(this.data[i]);
  }

  /** A room: a small Schroeder reverb (four combs, two all-passes) mixed in at `wet`. */
  reverb(wet: number, size = 1): void {
    const x = this.data;
    const out = new Float32Array(x.length);
    const combs = [1116, 1188, 1277, 1356].map(n => Math.round(n * size * (RATE / 44100)));
    for (const n of combs) {
      const buf = new Float32Array(n);
      let k = 0;
      let lp = 0;
      for (let i = 0; i < x.length; i++) {
        const y = buf[k];
        lp = y * 0.6 + lp * 0.4;
        buf[k] = x[i] + lp * 0.8;
        out[i] += y / combs.length;
        if (++k === n) k = 0;
      }
    }
    for (const n of [556, 441].map(m => Math.round(m * (RATE / 44100)))) {
      const buf = new Float32Array(n);
      let k = 0;
      for (let i = 0; i < x.length; i++) {
        const b = buf[k];
        const y = -out[i] + b;
        buf[k] = out[i] + b * 0.5;
        out[i] = y;
        if (++k === n) k = 0;
      }
    }
    for (let i = 0; i < x.length; i++) x[i] += out[i] * wet;
  }
}

/**
 * How loud a sound is, roughly as heard: the RMS of its loudest 50 ms, after a filter that
 * discounts the deep bass the ear barely hears (a lighter K-weighting).
 */
export function loudness(data: Float32Array): number {
  const hp = new Biquad('highpass', 150, 0.5);
  const w = data.map(x => hp.run(x));
  const win = Math.round(0.05 * RATE);
  let sum = 0;
  let best = 0;
  for (let i = 0; i < w.length; i++) {
    sum += w[i] * w[i];
    if (i >= win) sum -= w[i - win] * w[i - win];
    best = Math.max(best, sum);
  }
  return Math.sqrt(best / win);
}

export function peak(data: Float32Array): number {
  let p = 0;
  for (const x of data) p = Math.max(p, Math.abs(x));
  return p;
}

/** The loudness `loud` 1 stands for: about −12 dBFS, leaving room for peaks. */
const FULL = 0.25;

/**
 * Finish a sound: bring it to its loudness (`loud` 0..1 of the loudest sounds), round off
 * any peak over the top with a soft knee, and fade the last few ms so it ends in silence.
 */
export function master(tr: Track, loud: number): Float32Array {
  const d = tr.data;
  const now = loudness(d);
  const g = now > 0 ? (FULL * loud) / now : 0;
  const knee = 0.8;
  for (let i = 0; i < d.length; i++) {
    const x = d[i] * g;
    const m = Math.abs(x);
    d[i] = m <= knee ? x : Math.sign(x) * (knee + (1 - knee) * Math.tanh((m - knee) / (1 - knee)));
  }
  const fade = Math.min(d.length, Math.round(0.01 * RATE));
  for (let i = 0; i < fade; i++) d[d.length - 1 - i] *= i / fade;
  return d;
}
