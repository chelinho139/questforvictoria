import Phaser from 'phaser';
import { SceneKeys } from '../SceneKeys';
import { textureJobs, applyStyleTextures } from '../render/textures';
import type { TextureJob } from '../render/textures';
import { readSpriteStyle, setSpriteStyle, writeSpriteStyle, spriteStyle, hdHeroId, setHdHeroId } from '../render/art';
import { CharacterSelect } from '../ui/CharacterSelect';
import type { Choice } from '../ui/CharacterSelect';
import { playerName, setPlayerName } from '../player';
import { buildUiKit } from '../render/uiKit';
import { buildLogo, Splash } from '../render/splash';
import { devSkipIntro, devArtReview } from '../dev/DevMenu';
import { readSave } from '../saveStore';
import { REGIONS } from '../../data/regions';

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
    if (loaded) splash.setLabel('Ready!');
    if (loaded && (elapsed >= MIN_SPLASH_MS || this.wantsSkip)) {
      if (this.chosen === null) this.openStartScreen();
      if (!this.chosen) return;
      this.leaving = true;
      this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.finish());
    }
  }

  /** Name and hero, over the still-animating night sky. */
  private openStartScreen(): void {
    this.chosen = false;
    this.splash?.setLabel('');
    const save = readSave();
    const saved = save
      ? { level: save.level, place: REGIONS[save.region]?.name ?? 'somewhere', when: new Date(save.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }
      : null;
    new CharacterSelect({ name: playerName(), hero: hdHeroId() }, choice => this.applyChoice(choice), saved).open();
  }

  /** Save the name and hero; the HD heroes live in the HD style, so switch to it if needed. */
  private applyChoice(choice: Choice): void {
    setPlayerName(choice.name);
    this.registry.set('startMode', choice.mode);
    const heroChanged = choice.hero !== hdHeroId();
    setHdHeroId(choice.hero);
    const styleChanged = spriteStyle() !== 'hdsil';
    if (styleChanged) {
      setSpriteStyle('hdsil');
      writeSpriteStyle('hdsil');
    }
    if (heroChanged || styleChanged) applyStyleTextures(this, spriteStyle());
    this.chosen = true;
  }

  private finish(): void {
    this.registry.set('fadeIn', !!this.splash);
    this.scene.start(SceneKeys.Game);
  }
}
