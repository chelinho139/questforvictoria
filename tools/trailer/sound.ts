// The trailer's sound, mixed in Node: the game's own sound effects (rendered from the same
// recipes the game plays: src/phaser/audio) laid where each shot heard them, the rain and wind
// loops following the weather, extra sounds the edit asks for, and the music, decoded by ffmpeg.
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { soundSamples } from '../../src/phaser/audio/sounds';
import { loopSamples } from '../../src/phaser/audio/ambience';
import { RATE as GAME_RATE } from '../../src/phaser/audio/synth';
import type { LoopId } from '../../src/phaser/audio/ambience';
import type { SoundId, UiSound } from '../../src/sim/types';
import type { AudioEvent } from '../../src/phaser/dev/Director';

export const SR = 48000;

/** A stereo buffer. */
export class Stereo {
  readonly l: Float32Array;
  readonly r: Float32Array;
  constructor(readonly n: number) {
    this.l = new Float32Array(n);
    this.r = new Float32Array(n);
  }
  get seconds(): number {
    return this.n / SR;
  }
}

/** Decode any audio file to 48 kHz stereo. */
export function decode(file: string): Stereo {
  const r = spawnSync(ffmpegPath as unknown as string, ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`couldn't decode ${file}: ${r.stderr}`);
  const f = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4);
  const s = new Stereo(f.length / 2);
  for (let i = 0; i < s.n; i++) {
    s.l[i] = f[2 * i];
    s.r[i] = f[2 * i + 1];
  }
  return s;
}

/** Gain over time: [seconds, gain] points, straight lines between (held before the first and after the last). */
export type Envelope = [number, number][];

export function envAt(env: Envelope, t: number): number {
  if (t <= env[0][0]) return env[0][1];
  for (let i = 1; i < env.length; i++) {
    const [t1, g1] = env[i];
    if (t <= t1) {
      const [t0, g0] = env[i - 1];
      return t1 > t0 ? g0 + ((g1 - g0) * (t - t0)) / (t1 - t0) : g1;
    }
  }
  return env[env.length - 1][1];
}

/**
 * Add a mono sound into a mix at `at` seconds: resampled from the game's rate to the mix's
 * (times `rate`, as the game varies its pitch), at `gain`, panned like Web Audio's StereoPanner.
 * `env` (times relative to the mix) rides on top; `until` cuts it off (with a short fade).
 */
export function addMono(mix: Stereo, src: Float32Array, at: number, gain: number, pan: number, rate = 1, env?: Envelope, until = Infinity): void {
  const step = (GAME_RATE * rate) / SR;
  const x = (Math.max(-1, Math.min(1, pan)) + 1) / 2;
  const gl = Math.cos((x * Math.PI) / 2) * gain;
  const gr = Math.sin((x * Math.PI) / 2) * gain;
  const start = Math.round(at * SR);
  const len = Math.floor((src.length - 1) / step);
  const stop = Math.min(mix.n, start + len, Math.round(until * SR) + Math.round(0.08 * SR));
  const cut = Math.round(until * SR);
  for (let i = Math.max(0, start); i < stop; i++) {
    const p = (i - start) * step;
    const k = Math.floor(p);
    const f = p - k;
    let v = src[k] * (1 - f) + src[k + 1] * f;
    if (env) v *= envAt(env, i / SR);
    if (i > cut) v *= 1 - (i - cut) / (0.08 * SR);
    mix.l[i] += v * gl;
    mix.r[i] += v * gr;
  }
}

/** Add a stereo source (music) at `at`, reading it from `from` seconds, with a gain envelope in mix time. */
export function addStereo(mix: Stereo, src: Stereo, at: number, from: number, dur: number, env: Envelope): void {
  const s0 = Math.round(at * SR);
  const f0 = Math.round(from * SR);
  const n = Math.round(dur * SR);
  for (let i = 0; i < n; i++) {
    const o = s0 + i;
    const k = f0 + i;
    if (o < 0 || o >= mix.n || k < 0 || k >= src.n) continue;
    const g = envAt(env, o / SR);
    mix.l[o] += src.l[k] * g;
    mix.r[o] += src.r[k] * g;
  }
}

/** The interface's own sounds (heard only by the hero they happen to): no place in a shot without the interface. */
export const UI_SOUNDS = new Set<SoundId>([
  'levelUp', 'talent', 'questAccept', 'questReady', 'questComplete', 'journal', 'pickup', 'coins', 'equip', 'eat',
  'cook', 'smelt', 'smith', 'woodwork', 'build', 'perfect', 'error', 'died', 'respawn', 'open', 'close',
] satisfies UiSound[]);

/** One of the game's sounds (a take of it), by id. */
export function gameSound(id: SoundId, take = 0): Float32Array {
  return soundSamples(id, take);
}

/**
 * A shot's sounds into the mix: the shot's [from, from + dur) seconds placed at `at`, at `gain`
 * (the sound effects' level) under `env`. Sounds that start before the cut ring out a little past
 * it; the rain and wind follow the levels the shot logged, easing as the game's do.
 */
export function addShot(mix: Stereo, events: AudioEvent[], at: number, from: number, dur: number, gain: number, env: Envelope, ui = false): void {
  const end = at + dur;
  for (const e of events) {
    if (!('id' in e)) continue;
    if (UI_SOUNDS.has(e.id) && (!ui || e.id === 'error')) continue;
    if (e.t < from - 0.05 || e.t >= from + dur) continue;
    addMono(mix, soundSamples(e.id, e.take), at + (e.t - from), e.gain * gain, e.pan, e.rate, env, end + 0.6);
  }
  // the weather: each loop's level stepped by the log, eased (Web Audio setTargetAtTime, a third of 0.6 s)
  const loops = events.filter((e): e is Extract<AudioEvent, { loops: unknown }> => 'loops' in e);
  if (!loops.length) return;
  const ids: LoopId[] = ['rain', 'downpour', 'wind'];
  for (const id of ids) {
    const src = loopSamples(id);
    let level = 0;
    // the level at the cut-in point (as it was eased toward by then)
    for (const e of loops) if (e.t <= from) level = e.loops[id];
    if (!loops.some(e => e.loops[id] > 0.001)) continue;
    const step = GAME_RATE / SR;
    const k = 1 - Math.exp(-1 / (SR * 0.2));
    let li = 0;
    const s0 = Math.round(at * SR);
    const n = Math.round(dur * SR);
    // start somewhere in the loop, as the game does
    let p = (from * GAME_RATE) % src.length;
    let goal = level;
    for (let i = 0; i < n; i++) {
      const t = from + i / SR;
      while (li < loops.length && loops[li].t <= t) goal = loops[li++].loops[id];
      level += (goal - level) * k;
      const o = s0 + i;
      p += step;
      if (p >= src.length - 1) p -= src.length - 1;
      if (o < 0 || o >= mix.n || level < 1e-4) continue;
      const q = Math.floor(p);
      const v = (src[q] * (1 - (p - q)) + src[q + 1] * (p - q)) * level * gain * envAt(env, o / SR);
      // the loops are mono; give them a little width with a tiny delay on one side
      mix.l[o] += v;
      const d = o - 7;
      if (d >= 0) mix.r[d] += v;
    }
  }
}

/** Sum of several mixes, each at a gain. */
export function sum(n: number, parts: [Stereo, number][]): Stereo {
  const out = new Stereo(n);
  for (const [s, g] of parts)
    for (let i = 0; i < Math.min(n, s.n); i++) {
      out.l[i] += s.l[i] * g;
      out.r[i] += s.r[i] * g;
    }
  return out;
}

/** Duck `music` under `fx` (a sidechain): when the effects are loud, the music dips by up to `depth`. */
export function duck(music: Stereo, fx: Stereo, depth = 0.45, threshold = 0.08): void {
  const att = 1 - Math.exp(-1 / (SR * 0.01));
  const rel = 1 - Math.exp(-1 / (SR * 0.35));
  let env = 0;
  for (let i = 0; i < music.n; i++) {
    const v = Math.max(Math.abs(fx.l[i] ?? 0), Math.abs(fx.r[i] ?? 0));
    env += (v - env) * (v > env ? att : rel);
    const over = Math.max(0, Math.min(1, (env - threshold) / (threshold * 3)));
    const g = 1 - depth * over;
    music.l[i] *= g;
    music.r[i] *= g;
  }
}

/** Soft limit (tanh above a knee), so peaks round off instead of clipping. */
export function limit(s: Stereo, ceiling = 0.95): void {
  for (const ch of [s.l, s.r])
    for (let i = 0; i < ch.length; i++) {
      const v = ch[i];
      const a = Math.abs(v);
      if (a > ceiling * 0.8) ch[i] = Math.sign(v) * (ceiling * 0.8 + ceiling * 0.2 * Math.tanh((a - ceiling * 0.8) / (ceiling * 0.2)));
    }
}

/** 32-bit float WAV bytes. */
export function wav(s: Stereo): Buffer {
  const n = s.n;
  const data = Buffer.alloc(n * 8);
  for (let i = 0; i < n; i++) {
    data.writeFloatLE(s.l[i], i * 8);
    data.writeFloatLE(s.r[i], i * 8 + 4);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(3, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 8, 28);
  h.writeUInt16LE(8, 32);
  h.writeUInt16LE(32, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
