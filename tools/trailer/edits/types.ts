import type { Caption } from '../cards';
import type { SoundId } from '../../../src/sim/types';

/** How an item comes in after the one before: a cut, a crossfade, up out of black, or a white flash. */
export type Transition = 'cut' | 'fade' | 'black' | 'flash';

/** A colour grade (ffmpeg eq): brightness -1..1, contrast, saturation, gamma (1: unchanged). */
export interface Grade {
  b?: number;
  c?: number;
  s?: number;
  g?: number;
}

interface Common {
  /**
   * The moment on the timeline this item takes over (a cut; the middle of a crossfade): with
   * marks on an item and the next, its length follows from them, so cuts land on the music.
   */
  at?: number;
  /** Seconds (when the marks don't say). */
  dur?: number;
  /** How it comes in (default cut) and over how long. */
  t?: Transition;
  td?: number;
  /** Fade to black over its last seconds. */
  fadeOut?: number;
  text?: Caption[];
}

export interface ShotItem extends Common {
  shot: string;
  /** Where in the filmed shot to start (seconds). */
  in?: number;
  grade?: Grade;
  /** The shot's own sound effects' level (default 1; 0 silent). */
  sfx?: number;
}

export interface CardItem extends Common {
  /** Text on black (the captions go in `text`). */
  card: true;
}

export interface LogoItem extends Common {
  logo: true;
  /** Logo pixels per game pixel (default 5). */
  scale?: number;
}

/** Three shots filmed the same way in different views, in a 2x2 split screen (the fourth corner is left dark for a caption); the sound is the first shot's. */
export interface GridItem extends Common {
  grid: [string, string, string];
  in?: number;
  sfx?: number;
}

export type Item = ShotItem | CardItem | LogoItem | GridItem;

/** A stretch of music on the timeline. */
export interface MusicCue {
  /** A track in out/music (its id). */
  track: string;
  /** Timeline seconds it starts at, and seconds into the track it starts from. */
  at: number;
  from?: number;
  dur: number;
  gain?: number;
  fadeIn?: number;
  fadeOut?: number;
}

/** One of the game's sounds, placed on the timeline (a bell toll on a title, a voice). */
export interface SfxCue {
  id: SoundId;
  at: number;
  gain?: number;
  pan?: number;
  take?: number;
  rate?: number;
}

export interface Edit {
  /** Output file name (out/trailers/<name>.mp4). */
  name: string;
  title: string;
  items: Item[];
  music: MusicCue[];
  sfx?: SfxCue[];
  /** Levels: music, the shots' effects; ducking: how far the music dips under loud effects (0: none). */
  mix?: { music?: number; fx?: number; duck?: number };
  /** Keep the interface's own sounds (a perfect tap, crafting, gear on) from the shots: for a trailer that shows the interface. */
  uiSounds?: boolean;
  /** Black bars top and bottom, px of 1080 (a scope look). */
  letterbox?: number;
  /** A grade over everything, and a vignette. */
  grade?: Grade;
  vignette?: boolean;
}
