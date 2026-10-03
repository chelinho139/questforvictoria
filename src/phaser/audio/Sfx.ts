import Phaser from 'phaser';
import type { Sim } from '../../sim/Sim';
import type { SoundId } from '../../sim/types';
import { isoX, isoY } from '../../sim/map';
import { RATE } from './synth';
import { SOUNDS, soundSamples } from './sounds';

/** Full volume within this many screen pixels of your hero; silent from FAR. */
const NEAR = 160;
const FAR = 720;
/** Screen pixels to one side for a sound to be panned all the way (it never quite is). */
const PAN_SPAN = 420;
/** Sounds playing at once; more are dropped. */
const VOICES = 24;
/** The same sound again within this many seconds is dropped (a volley through a crowd), unless its recipe says otherwise. */
const REPEAT = 0.03;

/**
 * Plays the game's sounds through Phaser's Web Audio context (the loading screen has already
 * rendered them: soundJobs in sounds.ts). A sound from
 * somewhere in the world is louder the nearer it is to your hero, panned to where it is on
 * screen, and a touch higher or lower than the last, so repeats don't sound stamped out; a
 * sound for you alone (a level, a quest) plays as it is.
 */
export class Sfx {
  private readonly ctx: AudioContext | null = null;
  private readonly out: GainNode | null = null;
  private readonly buffers = new Map<SoundId, AudioBuffer>();
  private readonly lastAt = new Map<SoundId, number>();
  private voices = 0;
  private readonly off: () => void;

  constructor(
    game: Phaser.Game,
    private readonly sim: Sim
  ) {
    const mgr = game.sound;
    if (mgr instanceof Phaser.Sound.WebAudioSoundManager) {
      this.ctx = mgr.context;
      this.out = this.ctx.createGain();
      this.out.connect(mgr.destination);
    }
    this.off = sim.events.on('sound', ({ id, x, y }) => this.play(id, x, y));
  }

  /** 0..1, as the settings slider shows it (heard on a curve, so half sounds about half as loud). */
  setVolume(v: number): void {
    if (this.out) this.out.gain.value = v * v;
  }

  /** Play a sound, from a place in the world (or right here). */
  play(id: SoundId, x?: number, y?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.out || ctx.state !== 'running' || this.out.gain.value <= 0) return;
    let gain = 1;
    let pan = 0;
    if (x !== undefined && y !== undefined) {
      const dx = isoX(x, y) - isoX(this.sim.x, this.sim.y);
      const dy = isoY(x, y) - isoY(this.sim.x, this.sim.y);
      const d = Math.hypot(dx, dy);
      if (d >= FAR) return;
      const k = d <= NEAR ? 1 : 1 - (d - NEAR) / (FAR - NEAR);
      gain = k * k;
      pan = Math.max(-1, Math.min(1, dx / PAN_SPAN)) * 0.7;
    }
    const now = ctx.currentTime;
    if (now - (this.lastAt.get(id) ?? -1) < (SOUNDS[id].gap ?? REPEAT) || this.voices >= VOICES)
      return;
    this.lastAt.set(id, now);
    const src = ctx.createBufferSource();
    src.buffer = this.buffer(ctx, id);
    // sounds out in the world vary a little; yours (the jingles) stay in tune with each other
    if (x !== undefined) src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.08;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    const nodes: AudioNode[] = [src, g];
    if (pan && typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      nodes.push(p);
    }
    nodes[nodes.length - 1].connect(this.out);
    this.voices++;
    src.onended = () => {
      this.voices--;
      for (const n of nodes) n.disconnect();
    };
    src.start();
  }

  private buffer(ctx: AudioContext, id: SoundId): AudioBuffer {
    let b = this.buffers.get(id);
    if (!b) {
      const data = soundSamples(id);
      b = ctx.createBuffer(1, data.length, RATE);
      b.getChannelData(0).set(data);
      this.buffers.set(id, b);
    }
    return b;
  }

  destroy(): void {
    this.off();
    this.out?.disconnect();
  }
}
