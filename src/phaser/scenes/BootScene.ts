import Phaser from 'phaser';
import { SceneKeys } from '../SceneKeys';
import { textureJobs, applyStyleTextures } from '../render/textures';
import type { TextureJob } from '../render/textures';
import { readSpriteStyle, setSpriteStyle, writeSpriteStyle, spriteStyle, hdHeroId, playLook } from '../render/art';
import { Lobby } from '../ui/Lobby';
import { SinglePlayer } from '../ui/SinglePlayer';
import { MainMenu } from '../ui/MainMenu';
import type { MenuPick } from '../ui/MainMenu';
import { playAs } from '../player';
import { buildUiKit } from '../render/uiKit';
import { buildLogo, Splash } from '../render/splash';
import { devSkipIntro, devArtReview } from '../dev/DevMenu';
import { lastLocalChar, createLocalChar, localCharInfos } from '../saveStore';
import type { CharInfo } from '../../net/protocol';

/** The loading screen stays up at least this long so the logo can be seen. */
const MIN_SPLASH_MS = 1600;
const FADE_MS = 350;

/**
 * Loading screen. Shows the logo over a night sky while the procedural textures are
 * generated one step per frame (the bar follows real progress), then asks for a name and
 * a hero (the start screen) and fades into the game. Any key or click skips the remaining
 * wait once loading has finished. "Skip loading screen" in the dev menu skips both.
 */
export class BootScene extends Phaser.Scene {
  private jobs: TextureJob[] = [];
  private next = 0;
  private labelShown = false;
  private splash: Splash | null = null;
  private startT = 0;
  private leaving = false;
  private wantsSkip = false;
  /** null until the start screen opens; then whether the player has confirmed. */
  private chosen: boolean | null = null;

  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    // the game is drawn in HD · Silhouette colours; the other styles are kept as backups,
    // reachable only with the dev switch on
    setSpriteStyle(devArtReview() ? readSpriteStyle() : 'hdsil');
    buildUiKit(this);
    this.jobs = textureJobs(this);
    if (devSkipIntro()) {
      // straight in: the single-player character played last (or a first one)
      const ch = lastLocalChar() ?? this.firstLocalChar();
      if (ch) {
        this.registry.set('localChar', ch.id);
        playAs(ch.name);
        playLook(ch.look);
      }
      for (const j of this.jobs) j.run();
      this.finish();
      return;
    }
    buildLogo(this);
    this.splash = new Splash(this);
    this.startT = this.time.now;
    const skip = () => (this.wantsSkip = true);
    this.input.keyboard?.on('keydown', skip);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, skip);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this));
  }

  private onResize(): void {
    this.splash?.layout();
  }

  override update(time: number): void {
    const splash = this.splash;
    if (!splash || this.leaving) return;
    // one step per frame: show its label for a frame, then run it
    if (this.next < this.jobs.length) {
      const job = this.jobs[this.next];
      if (!this.labelShown) {
        splash.setLabel(job.label);
        this.labelShown = true;
      } else {
        job.run();
        this.next++;
        this.labelShown = false;
      }
    }
    const elapsed = time - this.startT;
    splash.update(time, elapsed, this.next / this.jobs.length);
    const loaded = this.next >= this.jobs.length && splash.full;
    if (loaded && this.chosen === null) splash.setLabel('Ready!');
    if (loaded && (elapsed >= MIN_SPLASH_MS || this.wantsSkip)) {
      if (this.chosen === null) this.openStartScreen();
      if (!this.chosen) return;
      this.leaving = true;
      this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.finish());
    }
  }

  /** With the start skipped and no characters yet: make one (named Hero). */
  private firstLocalChar(): CharInfo | null {
    const made = createLocalChar('Hero', hdHeroId());
    return typeof made === 'string' ? null : (localCharInfos().find(c => c.id === made.id) ?? null);
  }

  /** Single Player | Multi Player, under the logo, over the still-animating night sky. */
  private openStartScreen(first: MenuPick = 'single'): void {
    this.chosen = false;
    this.splash?.hideBar();
    new MainMenu(lastLocalChar(), p => (p === 'single' ? this.openSinglePlayer() : this.openLobby()), first).open();
  }

  /** Single player: your characters in this browser; Play starts the chosen one's game. */
  private openSinglePlayer(): void {
    new SinglePlayer(
      ch => {
        this.playLocal(ch);
        this.chosen = true;
      },
      () => this.openStartScreen('single')
    ).open();
  }

  /** Play this single-player character: their game, their name and look. */
  private playLocal(ch: CharInfo): void {
    this.registry.set('localChar', ch.id);
    this.wear(ch);
  }

  /**
   * Online: your characters, then the rooms. The game starts once the server has shown us
   * the world, as the chosen character.
   */
  private openLobby(): void {
    new Lobby(
      (sim, ch) => {
        this.wear(ch);
        this.registry.set('netSim', sim);
        this.chosen = true;
      },
      () => this.openStartScreen('multi')
    ).open();
  }

  /** Be this character for this visit: their name on the HUD, their look (the HD heroes live in the HD style). */
  private wear(ch: CharInfo): void {
    playAs(ch.name);
    playLook(ch.look);
    if (spriteStyle() !== 'hdsil') {
      setSpriteStyle('hdsil');
      writeSpriteStyle('hdsil');
    }
    applyStyleTextures(this, spriteStyle());
  }

  private finish(): void {
    this.registry.set('fadeIn', !!this.splash);
    this.scene.start(SceneKeys.Game);
  }
}
