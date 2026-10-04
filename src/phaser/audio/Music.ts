import Phaser from 'phaser';
import type { Sim } from '../../sim/Sim';
import { MusicDirector, moodFor, musicFile } from '../../data/music';
import type { Mood, MusicCue, TrackId } from '../../data/music';

/** The music sits under the game: even at the top of its slider it plays this loud (about half as loud, as heard, as the tracks are made). */
const LEVEL = 0.3;

/** One of the two players: a track streaming from its file, through its own fader. */
interface Deck {
  el: HTMLAudioElement;
  gain: GainNode;
  track: TrackId | null;
  /** Context time it has faded out by and stops at (0: not stopping). */
  stopAt: number;
}

/**
 * The music, as data/music.ts's MusicDirector decides it: each track streams from its file
 * (a whole track decoded would take tens of megabytes), through Phaser's Web Audio context
 * and its own volume, so fades are smooth and the settings slider works everywhere. Two decks,
 * so a boss's music can cut in over a track fading out.
 */
export class Music {
  private readonly ctx: AudioContext | null = null;
  private readonly out: GainNode | null = null;
  private readonly decks: Deck[] = [];
  private current: Deck | null = null;
  readonly director = new MusicDirector();
  /** Paused because the tab is hidden: resume on return. */
  private hiddenPause = false;
  private readonly onVisibility = () => this.visibility();
  /** A browser that refused to start a track lets it start on the next click or key. */
  private readonly onGesture = () => this.retry();

  constructor(
    game: Phaser.Game,
    private readonly sim: Sim
  ) {
    const mgr = game.sound;
    if (!(mgr instanceof Phaser.Sound.WebAudioSoundManager)) return;
    this.ctx = mgr.context;
    this.out = this.ctx.createGain();
    this.out.connect(mgr.destination);
    for (let i = 0; i < 2; i++) {
      const el = new Audio();
      el.preload = 'auto';
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      this.ctx.createMediaElementSource(el).connect(gain);
      gain.connect(this.out);
      const deck: Deck = { el, gain, track: null, stopAt: 0 };
      el.addEventListener('ended', () => {
        deck.track = null;
        if (deck !== this.current) return;
        this.current = null;
        this.director.ended();
      });
      this.decks.push(deck);
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pointerdown', this.onGesture, true);
    window.addEventListener('keydown', this.onGesture, true);
  }

  /** 0..1, as the settings slider shows it (heard on a curve, like the sound effects). */
  setVolume(v: number): void {
    if (this.out) this.out.gain.value = LEVEL * v * v;
  }

  /** The kind of place you're in now. */
  get mood(): Mood {
    const def = this.sim.regionDef;
    return moodFor({ ring: def.ring, indoor: !!def.indoor, night: this.sim.isNight, boss: !!this.sim.activeBoss, music: def.music });
  }

  /** Every frame. Waits for the browser to allow sound (the first click or key). */
  update(dt: number): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    for (const cue of this.director.update(dt, this.mood)) this.cue(cue);
    for (const d of this.decks)
      if (d.stopAt && ctx.currentTime >= d.stopAt) {
        d.stopAt = 0;
        d.track = null;
        d.el.pause();
        // let go of the stream
        d.el.removeAttribute('src');
        d.el.load();
      }
  }

  /** Play a track now (the settings panel's music board). */
  play(track: TrackId): void {
    if (this.ctx?.state === 'running') for (const cue of this.director.force(track)) this.cue(cue);
  }

  private cue(c: MusicCue): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (c.kind === 'stop') {
      if (this.current) this.fadeOut(this.current, c.fade);
      this.current = null;
      return;
    }
    const old = this.current;
    if (old) this.fadeOut(old, c.fadeOut);
    const d = this.decks.find(x => x !== old) ?? this.decks[0];
    d.stopAt = 0;
    d.track = c.track;
    d.el.src = musicFile(c.track);
    d.el.loop = c.loop;
    d.gain.gain.cancelScheduledValues(now);
    d.gain.gain.setValueAtTime(0, now);
    d.gain.gain.linearRampToValueAtTime(1, now + c.fadeIn);
    this.current = d;
    this.start(d);
  }

  private fadeOut(d: Deck, s: number): void {
    const now = this.ctx!.currentTime;
    const g = d.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + s);
    d.stopAt = now + s;
  }

  private start(d: Deck): void {
    if (document.hidden) {
      this.hiddenPause = true;
      return;
    }
    // refused (no click or key yet in this browser's eyes): retry() tries again on the next one
    d.el.play().catch(() => undefined);
  }

  private retry(): void {
    const d = this.current;
    if (d?.track && d.el.paused && !document.hidden) d.el.play().catch(() => undefined);
  }

  /** A hidden tab stops the game; the music waits for it too. */
  private visibility(): void {
    const d = this.current;
    if (document.hidden) {
      if (d?.track && !d.el.paused) {
        d.el.pause();
        this.hiddenPause = true;
      }
    } else if (this.hiddenPause) {
      this.hiddenPause = false;
      if (d?.track) d.el.play().catch(() => undefined);
    }
  }

  destroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pointerdown', this.onGesture, true);
    window.removeEventListener('keydown', this.onGesture, true);
    for (const d of this.decks) {
      d.el.pause();
      d.el.removeAttribute('src');
      d.el.load();
      d.gain.disconnect();
    }
    this.out?.disconnect();
  }
}
