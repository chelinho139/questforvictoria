import type { Director } from '../../../src/phaser/dev/Director';

/** One shot of a trailer: staged in setup (cues with d.at, per-frame with d.each), then filmed for `dur` seconds. */
export interface Shot {
  /** Film seconds. */
  dur: number;
  /** Game seconds run unfilmed before the camera rolls (default 1). */
  settle?: number;
  /** Hide the interface (default true). */
  clean?: boolean;
  /** Math.random's seed, so every take is the same. */
  seed?: number;
  note?: string;
  setup(d: Director): void;
}

export type { Director };
