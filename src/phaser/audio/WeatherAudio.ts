import type { WeatherSound } from '../../sim/types';
import { RATE } from './synth';
import { SOUNDS, soundSamples } from './sounds';
import { LOOP_IDS, loopSamples } from './ambience';
import type { LoopId } from './ambience';

/** How fast the loops follow the weather (seconds to most of the way). */
const FOLLOW = 0.6;
/** Indoors the rain is on the roof: everything through this low-pass, and quieter. */
const ROOF_HZ = 650;
const ROOF_GAIN = 0.65;

/**
 * The weather's sound: the rain and wind loops (ambience.ts) mixed by how hard it rains and
 * blows, and thunder after lightning, all through the sound effects' volume. Indoors it is
 * muffled, as heard through a roof.
 */
export class WeatherAudio {
  private readonly bus: GainNode;
  private readonly roof: BiquadFilterNode;
  private readonly loops = new Map<LoopId, { src: AudioBufferSourceNode; gain: GainNode; v: number }>();
  private readonly buffers = new Map<string, AudioBuffer>();
  private indoor: boolean | null = null;

  constructor(
    private readonly ctx: AudioContext,
    out: AudioNode
  ) {
    this.roof = ctx.createBiquadFilter();
    this.roof.type = 'lowpass';
    this.roof.frequency.value = 20000;
    this.bus = ctx.createGain();
    this.bus.connect(this.roof);
    this.roof.connect(out);
  }

  /** Follow the weather: `rain` and `storm` 0..1; indoors, muffled. */
  update(rain: number, storm: number, indoor: boolean): void {
    const ctx = this.ctx;
    if (ctx.state !== 'running') return;
    if (indoor !== this.indoor) {
      this.indoor = indoor;
      this.roof.frequency.setTargetAtTime(indoor ? ROOF_HZ : 20000, ctx.currentTime, 0.15);
      this.bus.gain.setTargetAtTime(indoor ? ROOF_GAIN : 1, ctx.currentTime, 0.15);
    }
    // light rain is the patter; the harder it rains, and the stormier, the more of it is roar
    const heavy = Math.max(storm, Math.min(1, Math.max(0, (rain - 0.7) / 0.3)));
    const want: Record<LoopId, number> = {
      rain: Math.min(1, rain * 1.5) * (1 - 0.45 * heavy),
      downpour: rain * heavy * 0.85,
      // only a storm really blows; rain alone just stirs the air
      wind: Math.min(1, 0.1 * rain + 0.6 * storm),
    };
    for (const id of LOOP_IDS) this.setLoop(id, want[id]);
  }

  private setLoop(id: LoopId, v: number): void {
    let l = this.loops.get(id);
    if (!l) {
      if (v < 0.001) return;
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.buffer(id, loopSamples(id));
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain);
      gain.connect(this.bus);
      // each loop starts somewhere in itself, so the three don't line up the same every time
      src.start(0, Math.random() * src.buffer.duration);
      l = { src, gain, v: -1 };
      this.loops.set(id, l);
    }
    // (only when it has moved: every frame would pile up automation events)
    if (Math.abs(v - l.v) < 0.005 && (v > 0 || l.v === 0)) return;
    l.v = v;
    l.gain.gain.setTargetAtTime(v, this.ctx.currentTime, FOLLOW / 3);
  }

  /** Thunder, `delay` seconds from now, `pan` -1..1 (where the flash was), `take` the variant. */
  thunder(id: WeatherSound, delay: number, pan: number, take: number, gain = 1): void {
    const ctx = this.ctx;
    if (ctx.state !== 'running') return;
    const k = Math.max(0, Math.min((SOUNDS[id].takes ?? 1) - 1, take));
    const src = ctx.createBufferSource();
    src.buffer = this.buffer(`${id}:${k}`, soundSamples(id, k));
    src.playbackRate.value = 0.94 + Math.random() * 0.1;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    const nodes: AudioNode[] = [src, g];
    if (typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-0.8, Math.min(0.8, pan));
      g.connect(p);
      nodes.push(p);
    }
    nodes[nodes.length - 1].connect(this.bus);
    src.onended = () => {
      for (const n of nodes) n.disconnect();
    };
    src.start(ctx.currentTime + Math.max(0, delay));
  }

  private buffer(key: string, data: Float32Array): AudioBuffer {
    let b = this.buffers.get(key);
    if (!b) {
      b = this.ctx.createBuffer(1, data.length, RATE);
      b.getChannelData(0).set(data);
      this.buffers.set(key, b);
    }
    return b;
  }

  destroy(): void {
    for (const l of this.loops.values()) {
      l.src.stop();
      l.src.disconnect();
      l.gain.disconnect();
    }
    this.loops.clear();
    this.bus.disconnect();
    this.roof.disconnect();
  }
}
