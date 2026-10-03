import Phaser from 'phaser';
import { SceneKeys } from '../SceneKeys';
import { Sim } from '../../sim/Sim';
import { isoX, isoY, T } from '../../sim/map';
import { PIXEL_SCALE, PLATFORM } from '../config';
import { BAR_KEYS, PC_KEYS } from '../../data/actionBar';
import { WorldRenderer } from '../render/WorldRenderer';
import { Effects } from '../render/Effects';
import { Clouds } from '../render/Clouds';
import { Lighting } from '../lighting/Lighting';
import { DevMenu, devArtReview } from '../dev/DevMenu';
import { InventoryWindow } from '../ui/InventoryWindow';
import { CraftingWindow } from '../ui/CraftingWindow';
import { DialogWindow } from '../ui/DialogWindow';
import { TradeWindow } from '../ui/TradeWindow';
import { PROPS } from '../../data/props';
import { QuestTracker } from '../ui/QuestTracker';
import { QuestWindow } from '../ui/QuestWindow';
import { ControlsWindow } from '../ui/ControlsWindow';
import { TalentWindow } from '../ui/TalentWindow';
import { SpellbookWindow } from '../ui/SpellbookWindow';
import { DAY_PRESETS } from '../../sim/daylight';
import { Tile } from '../../sim/map';
import { TOWER_H, applyStyleTextures, applyHeroTextures, buildRegionGround } from '../render/textures';
import { CANDIDATE_STYLES, STYLE_LABELS, spriteStyle, setSpriteStyle, writeSpriteStyle, HD_HERO_IDS, HD_HERO_LABELS, hdHeroId, setHdHeroId, isHdStyle, setHeroGear } from '../render/art';
import type { SpriteStyle } from '../render/art';
import type { HdHeroId } from '../render/hdHeroes';
import type { BuiltWorld } from '../render/textures';
import type { MobileHudScene } from './MobileHudScene';
import { readSave, writeSave } from '../saveStore';
import type { NetSim } from '../../net/NetSim';
import { OnlineBadge } from '../ui/OnlineBadge';
import { SceneBox } from '../ui/SceneBox';
import { BossBar } from '../ui/BossBar';

/** Runs the simulation, renders the world and handles keyboard input. */
export class GameScene extends Phaser.Scene {
  private sim!: Sim;
  private world!: WorldRenderer;
  private effects!: Effects;
  private clouds!: Clouds;
  private lighting!: Lighting;
  private dev!: DevMenu;
  private inventory!: InventoryWindow;
  private trade!: TradeWindow;
  private crafting!: CraftingWindow;
  private dialog!: DialogWindow;
  private quests!: QuestTracker;
  private questLog!: QuestWindow;
  private controls!: ControlsWindow;
  private talents!: TalentWindow;
  private spellbook!: SpellbookWindow;
  private sceneBox!: SceneBox;
  private bossBar!: BossBar;
  /** Where the camera looks (eased toward the hero, or what a scene shows). */
  private camAt: { x: number; y: number } | null = null;
  /** Seconds left of easing back to the hero after a scene. */
  private camEase = 0;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;

  constructor() {
    super(SceneKeys.Game);
  }

  create(): void {
    // online, the lobby has already joined a room: play in it (the server keeps the game)
    const net = this.registry.get('netSim') as NetSim | undefined;
    this.registry.remove('netSim');
    this.sim = net ?? new Sim();
    this.registry.set('sim', this.sim);
    // single player: the chosen character's adventure (a new one starts on the lakeshore)
    const charId = net ? null : ((this.registry.get('localChar') as string | undefined) ?? null);
    if (charId) {
      const save = readSave(charId);
      if (save) this.sim.loadSave(save);
    }
    // the hero wears what the sim has equipped: redraw them whenever the gear changes
    this.wearGear();
    this.sim.events.on('bag', () => this.wearGear());
    const built = buildRegionGround(this, this.sim.map);
    this.world = new WorldRenderer(this, this.sim, built);
    this.effects = new Effects(this, this.sim);
    this.clouds = new Clouds(this, this.sim.map.cols, this.sim.map.rows);
    this.cameras.main.setZoom(PIXEL_SCALE).setRoundPixels(true);
    // coming from the loading screen: fade up from black
    if (this.registry.get('fadeIn')) this.cameras.main.fadeIn(500, 0, 0, 0);
    this.lighting = new Lighting(this, this.cameras.main, this.sim.day);
    this.lighting.setRing(this.sim.regionDef.ring, !!this.sim.regionDef.indoor);
    this.placeStaticLights(built);
    // travel: fade out through an exit, swap the region, rebuild the world, fade back in
    this.sim.events.on('exit', ({ to, at }) => this.travel(to, at));
    this.sim.events.on('region', () => {
      this.rebuildWorld();
      this.camAt = null;
    });
    if (net) {
      const badge = new OnlineBadge(net);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => badge.destroy());
    } else if (charId) this.setupAutosave(charId);
    this.dev = new DevMenu(this.game, this.sim, this.lighting, this.clouds, this.effects);
    this.registry.set('dev', this.dev);
    this.inventory = new InventoryWindow(this.game, this.sim);
    this.registry.set('inventory', this.inventory);
    this.crafting = new CraftingWindow(this.game, this.sim);
    this.registry.set('crafting', this.crafting);
    this.trade = new TradeWindow(this.sim);
    this.dialog = new DialogWindow(this.game, this.sim, id => this.trade.open(id));
    this.questLog = new QuestWindow(this.sim);
    this.registry.set('questLog', this.questLog);
    this.controls = new ControlsWindow();
    this.registry.set('controls', this.controls);
    this.talents = new TalentWindow(this.game, this.sim);
    this.registry.set('talents', this.talents);
    this.spellbook = new SpellbookWindow(this.game, this.sim);
    this.registry.set('spellbook', this.spellbook);
    this.quests = new QuestTracker(this.sim, () => this.questLog.toggle(true));
    this.sceneBox = new SceneBox(this.sim);
    this.bossBar = new BossBar(this.sim);
    this.sim.events.on('sceneFade', ({ dir, s }) => (dir === 'out' ? this.cameras.main.fadeOut(s * 1000, 0, 0, 0) : this.cameras.main.fadeIn(s * 1000, 0, 0, 0)));
    // a scene that ended (or was cut short by loading a save) never leaves the screen black
    this.sim.events.on('scene', () => {
      const fade = this.cameras.main.fadeEffect;
      if (!this.sim.scene && !this.sim.exiting && fade.isComplete && fade.direction) this.cameras.main.fadeIn(400, 0, 0, 0);
    });
    this.sim.events.on('journal', ({ doc }) => {
      if (this.sim.flags['journalHint']) return;
      this.sim.setFlag('journalHint');
      this.sim.log('Press J and open the Journal tab to read it.', 'h');
      void doc;
    });
    this.sim.events.on('talk', ({ npc }) => this.dialog.open(npc));
    this.registry.set('setArtStyle', (style: SpriteStyle) => this.setArtStyle(style));
    this.registry.set('setHdHero', (id: HdHeroId) => this.setHdHero(id));
    // direct link to the art board: http://localhost:3000/#styles
    if (location.hash === '#styles') this.dev.styleBoard.open(0);
    this.input.keyboard?.on('keydown-BACKTICK', () => this.dev.toggle());
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    if (PLATFORM === 'pc') this.setupPcKeyboard();
    else this.setupMobileKeyboard();
    this.scene.launch(PLATFORM === 'pc' ? SceneKeys.PcHud : SceneKeys.MobileHud);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
      this.effects.destroy();
      this.clouds.destroy();
      this.lighting.destroy();
      this.dev.destroy();
      this.inventory.destroy();
      this.crafting.destroy();
      this.dialog.destroy();
      this.trade.destroy();
      this.quests.destroy();
      this.questLog.destroy();
      this.controls.destroy();
      this.talents.destroy();
      this.spellbook.destroy();
      this.sceneBox.destroy();
      this.bossBar.destroy();
      this.sim.events.clear();
    });
  }

  /** Campfires and forges glow warm at night; a campfire's light shrinks as it burns out. */
  private lightStructures(): void {
    const want = new Set<string>();
    for (const s of this.sim.structures) {
      const id = 'build' + s.id;
      want.add(id);
      const fire = s.kind === 'campfire';
      const k = fire && s.t < 6 ? Math.max(0, s.t / 6) : 1;
      this.lighting.setLight({
        id,
        x: isoX(s.x, s.y),
        y: isoY(s.x, s.y) - (fire ? 8 : 12),
        radius: (fire ? 130 : 80) * (0.4 + 0.6 * k),
        r: 0,
        g: 0.05,
        b: 0.35,
        intensity: k,
        flickerHz: fire ? 9 : 4,
        flickerAmount: fire ? 0.16 : 0.08,
      });
    }
    for (const id of this.structureLights) if (!want.has(id)) this.lighting.removeLight(id);
    this.structureLights = want;
  }

  private structureLights = new Set<string>();

  /** Draw the hero in their current equipment (HD styles show gear on the sprite). */
  private wearGear(): void {
    if (setHeroGear(this.sim.equip) && isHdStyle(spriteStyle())) applyHeroTextures(this, spriteStyle());
  }

  /**
   * Switch the art style mid-game: redraw every style texture in place, then let the
   * renderer pick up new sizes.
   */
  setArtStyle(style: SpriteStyle): void {
    if (style === spriteStyle()) return;
    writeSpriteStyle(style);
    setSpriteStyle(style);
    applyStyleTextures(this, style);
    this.world.refreshStyle();
    this.sim.log(`Art style: ${STYLE_LABELS[style]}  (V for the next one)`);
  }

  /**
   * Pick the hero the HD styles draw. From a non-HD style this switches to HD · Silhouette
   * colours, since the HD heroes only exist in the HD styles.
   */
  setHdHero(id: HdHeroId): void {
    setHdHeroId(id);
    const style = spriteStyle();
    if (!isHdStyle(style)) {
      this.setArtStyle('hdsil');
    } else {
      applyStyleTextures(this, style);
      this.world.refreshStyle();
    }
    this.sim.log(`Hero: ${HD_HERO_LABELS[id]}  (H for the next one)`);
  }

  private cycleHdHero(dir: 1 | -1): void {
    const n = HD_HERO_IDS.length;
    // from a non-HD style, H starts on the current choice instead of skipping it
    const i = HD_HERO_IDS.indexOf(hdHeroId());
    this.setHdHero(isHdStyle(spriteStyle()) ? HD_HERO_IDS[(i + dir + n) % n] : HD_HERO_IDS[i]);
  }

  /** V: step through the art styles. */
  private cycleArtStyle(dir: 1 | -1): void {
    const n = CANDIDATE_STYLES.length;
    this.setArtStyle(CANDIDATE_STYLES[(CANDIDATE_STYLES.indexOf(spriteStyle()) + dir + n) % n]);
  }

  private onResize(): void {
    this.cameras.main.setZoom(PIXEL_SCALE);
  }

  /**
   * Autosave: shortly after anything that matters (a quest, a level, a region, gear, a
   * story flag), every 30 seconds while playing, and when the tab is hidden or closed.
   */
  private setupAutosave(charId: string): void {
    let pending = 0;
    const saveNow = () => {
      window.clearTimeout(pending);
      pending = 0;
      writeSave(charId, this.sim.toSave());
    };
    const soon = () => {
      window.clearTimeout(pending);
      pending = window.setTimeout(saveNow, 800);
    };
    for (const ev of ['quests', 'level', 'region', 'bag', 'talents', 'flags', 'loadout'] as const) this.sim.events.on(ev, soon);
    const timer = window.setInterval(saveNow, 30_000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', saveNow);
    this.registry.set('saveNow', saveNow);
    saveNow();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.clearInterval(timer);
      window.clearTimeout(pending);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', saveNow);
    });
  }

  /** Through an exit: fade to black, enter the next region (which rebuilds the world), fade in. */
  private travel(to: string, at: string): void {
    const cam = this.cameras.main;
    cam.fadeOut(280, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.sim.enterRegion(to, at);
      if (!this.sim.online) {
        cam.fadeIn(380, 0, 0, 0);
        return;
      }
      // online the server moves the hero: fade in when the new region arrives (or give up waiting)
      let wait = 0;
      const done = () => {
        off();
        window.clearTimeout(wait);
        cam.fadeIn(380, 0, 0, 0);
      };
      const off = this.sim.events.on('region', done);
      wait = window.setTimeout(done, 2500);
    });
  }

  /** A new region: build its ground, redraw the world, move the lights and clouds. */
  private rebuildWorld(): void {
    this.world.destroy();
    const built = buildRegionGround(this, this.sim.map);
    this.world = new WorldRenderer(this, this.sim, built);
    this.placeStaticLights(built);
    this.lighting.setRing(this.sim.regionDef.ring, !!this.sim.regionDef.indoor);
    this.clouds.relayout(this.sim.map.cols, this.sim.map.rows);
    this.sim.log(this.sim.regionDef.name + '.', 't');
  }

  private staticLights: string[] = [];

  /** Torches on the castle towers: warm, flickering pools (in projected coordinates). */
  private placeStaticLights(built: BuiltWorld): void {
    for (const id of this.staticLights) this.lighting.removeLight(id);
    this.staticLights = [];
    let i = 0;
    for (const o of built.objects) {
      if (o.kind !== Tile.Tower) continue;
      const id = 'tower' + i++;
      this.staticLights.push(id);
      this.lighting.setLight({
        id,
        x: isoX(o.wx, o.wy),
        y: isoY(o.wx, o.wy) - TOWER_H - 10,
        radius: 150,
        r: 0, g: 0.05, b: 0.35,
        intensity: 1,
        flickerHz: 6,
        flickerAmount: 0.12,
      });
    }
    // torches and braziers indoors
    for (const [c, r] of this.sim.regionDef.lights ?? []) {
      const id = 'torch' + i++;
      this.staticLights.push(id);
      this.lighting.setLight({ id, x: isoX(c * T + 16, r * T + 16), y: isoY(c * T + 16, r * T + 16) - 20, radius: 130, r: 0, g: 0.05, b: 0.32, intensity: 1, flickerHz: 7, flickerAmount: 0.14 });
    }
    // lit windows spill a little warm light in front of the house
    for (const p of this.sim.props) {
      const def = PROPS[p.kind];
      if (!def.lit) continue;
      const id = 'prop' + i++;
      this.staticLights.push(id);
      const wx = (p.c + def.w / 2) * T;
      const wy = (p.r + def.h) * T + 6;
      this.lighting.setLight({ id, x: isoX(wx, wy), y: isoY(wx, wy) - 26, radius: 84, r: 0, g: 0.06, b: 0.3, intensity: 0.75, flickerHz: 3, flickerAmount: 0.05 });
    }
  }

  private cycleTime(): void {
    const t = this.sim.day.t;
    let best = 0;
    let bd = Infinity;
    DAY_PRESETS.forEach((p, idx) => {
      const d = Math.abs(p.t - t);
      const wd = Math.min(d, 1 - d);
      if (wd < bd) {
        bd = wd;
        best = idx;
      }
    });
    const next = DAY_PRESETS[(best + 1) % DAY_PRESETS.length];
    this.sim.setDay(next.t);
    this.sim.log('Time set to ' + next.label + '.');
  }

  private setupMovementKeys(): Phaser.Input.Keyboard.KeyboardPlugin | null {
    const kb = this.input.keyboard;
    if (!kb) return null;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as GameScene['keys'];
    kb.addCapture([KC.SPACE, KC.TAB, KC.UP, KC.DOWN, KC.LEFT, KC.RIGHT]);
    return kb;
  }

  /** PC: action bar slots plus Rev, target, jump and dodge keys (see data/actionBar.ts). */
  private setupPcKeyboard(): void {
    const kb = this.setupMovementKeys();
    if (!kb) return;
    // each bar key casts whatever you have put in its slot
    BAR_KEYS.forEach((b, i) => kb.on('keydown-' + b.code, () => this.sim.castBarSlot(i)));
    kb.on('keydown-' + PC_KEYS.revStep.code, () => this.sim.revStep());
    kb.on('keydown-' + PC_KEYS.revToggle.code, () => this.sim.setRev(!this.sim.rev));
    kb.on('keydown-' + PC_KEYS.revAuto.code, () => this.sim.setRevAuto(!this.sim.revAuto));
    kb.on('keydown-' + PC_KEYS.target.code, () => this.sim.cycleTarget());
    kb.on('keydown-' + PC_KEYS.jump.code, () => this.sim.jump());
    kb.on('keydown-' + PC_KEYS.timeCycle.code, () => this.cycleTime());
    // the backup art styles (and hero swapping mid-game) only with the dev switch on
    kb.on('keydown-' + PC_KEYS.artStyle.code, (ev: KeyboardEvent) => devArtReview() && this.cycleArtStyle(ev.shiftKey ? -1 : 1));
    kb.on('keydown-' + PC_KEYS.hdHero.code, (ev: KeyboardEvent) => devArtReview() && this.cycleHdHero(ev.shiftKey ? -1 : 1));
    kb.on('keydown-' + PC_KEYS.gather.code, () => this.sim.gatherNearest());
    kb.on('keydown-' + PC_KEYS.inventory.code, () => this.inventory.toggle());
    kb.on('keydown-' + PC_KEYS.crafting.code, () => this.crafting.toggle());
    kb.on('keydown-' + PC_KEYS.journal.code, () => this.questLog.toggle());
    kb.on('keydown-' + PC_KEYS.settings.code, () => this.dev.toggle());
    kb.on('keydown-' + PC_KEYS.talents.code, () => this.talents.toggle());
    kb.on('keydown-' + PC_KEYS.spellbook.code, () => this.spellbook.toggle());
    kb.on('keydown-' + PC_KEYS.controls.code, () => this.controls.toggle());
    kb.on('keydown-' + PC_KEYS.lightToggle.code, () => {
      this.lighting.setEnabled(!this.lighting.isEnabled());
      this.sim.log(this.lighting.isEnabled() ? 'Lighting on.' : 'Lighting off.');
    });
  }

  /** Mobile build tested on a desktop browser: keys mirror the two on-screen buttons. */
  private setupMobileKeyboard(): void {
    const kb = this.setupMovementKeys();
    if (!kb) return;
    kb.on('keydown-SPACE', () => this.sim.jump());
    kb.on('keydown-F', () => this.sim.tapButton(2));
    kb.on('keydown-E', () => this.sim.tapButton(1));
    kb.on('keydown-TAB', () => this.sim.cycleTarget());
    kb.on('keydown-M', () => this.sim.mountToggle());
    kb.on('keydown-R', () => this.sim.setRev(!this.sim.rev));
    kb.on('keydown-V', () => this.sim.setRevAuto(!this.sim.revAuto));
    const digits = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
    digits.forEach((name, i) => kb.on('keydown-' + name, () => this.sim.castSlot(i)));
  }

  override update(time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    const mobileHud = PLATFORM === 'mobile' ? (this.scene.get(SceneKeys.MobileHud) as MobileHudScene | null) : null;
    if (!mobileHud || !mobileHud.joystickActive) {
      let mx = 0;
      let my = 0;
      if (this.keys) {
        if (this.keys.A.isDown || this.keys.LEFT.isDown) mx -= 1;
        if (this.keys.D.isDown || this.keys.RIGHT.isDown) mx += 1;
        if (this.keys.W.isDown || this.keys.UP.isDown) my -= 1;
        if (this.keys.S.isDown || this.keys.DOWN.isDown) my += 1;
        const l = Math.hypot(mx, my);
        if (l > 1) {
          mx /= l;
          my /= l;
        }
      }
      this.sim.inputMove.x = mx;
      this.sim.inputMove.y = my;
    }

    this.sim.tick(dt);

    // the camera follows the hero, or eases over to what a scene is showing
    const look = this.sim.scene?.look;
    const want = look ? { x: isoX(look.x, look.y), y: isoY(look.x, look.y) + 20 } : { x: isoX(this.sim.x, this.sim.y), y: isoY(this.sim.x, this.sim.y) + 20 };
    if (this.sim.scene) this.camEase = 0.8;
    else this.camEase = Math.max(0, this.camEase - dt);
    if (!this.camAt || this.camEase <= 0) this.camAt = want;
    else {
      const k = Math.min(1, dt * 4);
      this.camAt = { x: this.camAt.x + (want.x - this.camAt.x) * k, y: this.camAt.y + (want.y - this.camAt.y) * k };
    }
    const shake = this.sim.shake > 0 ? Math.random() * 6 - 3 : 0;
    this.cameras.main.centerOn(Math.round(this.camAt.x + shake), Math.round(this.camAt.y));
    this.world.draw(time);
    this.effects.draw();
    this.clouds.update(dt);
    // the player carries a small neutral light so night stays playable; a lantern adds a warm pool
    const px = isoX(this.sim.x, this.sim.y);
    const py = isoY(this.sim.x, this.sim.y) - 10;
    this.lighting.setLight({ id: 'player', x: px, y: py, radius: 110, r: 0, g: 0, b: 0, intensity: 0.9 });
    if (this.sim.gear.light > 0)
      this.lighting.setLight({ id: 'lantern', x: px, y: py, radius: 110 + this.sim.gear.light, r: 0.02, g: 0.06, b: 0.16, intensity: 0.75, flickerHz: 5, flickerAmount: 0.06 });
    else this.lighting.removeLight('lantern');
    this.lightStructures();
    // the grey postman carries a faint cold light of his own
    for (const w of this.sim.wanderers) {
      const id = 'wanderer:' + w.id;
      if (w.alpha > 0.05) this.lighting.setLight({ id, x: isoX(w.x, w.y), y: isoY(w.x, w.y) - 16, radius: 46, r: 0.2, g: 0.1, b: 0, intensity: w.alpha * 0.7 });
      else this.lighting.removeLight(id);
    }
    this.lighting.update(dt);
    this.bossBar.update();
    this.dev.update();
  }
}
