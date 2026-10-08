import Phaser from 'phaser';
import { STRUCTURES } from '../../data/crafting';
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
import type { ClassId } from '../../data/classes';
import type { Difficulty } from '../../data/difficulty';
import { OnlineBadge } from '../ui/OnlineBadge';
import { SceneBox } from '../ui/SceneBox';
import { BossBar } from '../ui/BossBar';
import { DuelWindow } from '../ui/DuelWindow';
import { PlayerTradeWindow } from '../ui/PlayerTradeWindow';
import { Sfx } from '../audio/Sfx';
import { Music } from '../audio/Music';
import { WeatherAudio } from '../audio/WeatherAudio';
import { WeatherFx } from '../render/WeatherFx';
import { View3D, VIEW_MODES, VIEW_NAMES } from '../view3d/View3D';
import type { ViewMode } from '../view3d/View3D';
import { fromIso } from '../../sim/map';
import { Director, directorWanted } from '../dev/Director';

const VIEW_KEY = 'qfv-view';
/** How far the wheel zooms the 2D view: out to this, in to that (1: the game's own scale). */
const ISO_ZOOM = [0.6, 2.5] as const;

function readView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY) as ViewMode | null;
    return v && VIEW_MODES.includes(v) ? v : 'iso';
  } catch {
    return 'iso';
  }
}

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
  /** Duels: another player's card, and the bar while a duel is on. */
  private duel!: DuelWindow;
  /** Trading with another player: the request's bar, and the table. */
  private barter!: PlayerTradeWindow;
  private sfx!: Sfx;
  private music!: Music;
  /** Rain, storms and lightning on screen, and their sound. */
  private weather!: WeatherFx;
  /** Where the camera looks (eased toward the hero, or what a scene shows). */
  private camAt: { x: number; y: number } | null = null;
  /** Seconds left of easing back to the hero after a scene. */
  private camEase = 0;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'COMMA' | 'PERIOD' | 'Q' | 'E', Phaser.Input.Keyboard.Key>;
  /** The world in 3D (the diorama and PoV views), while one of them is on. */
  private view3d: View3D | null = null;
  private viewMode: ViewMode = 'iso';
  /** The 2D view's own zoom on top of the pixel scale (the wheel: down backs away, up pulls in). */
  private isoZoom = 1;
  private readonly onWheel = (e: WheelEvent): void => {
    if (this.viewMode !== 'iso') return;
    const k = Math.exp(Math.sign(e.deltaY) * 0.12);
    this.isoZoom = Math.max(ISO_ZOOM[0], Math.min(ISO_ZOOM[1], this.isoZoom / k));
  };
  /** The region's ground as built for the 2D view (the 3D views lay the same art flat). */
  private built!: BuiltWorld;
  /** Filming a trailer (dev, `?director`): the director runs the clock and may hold the camera. */
  private director: Director | null = null;

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
      // a new character starts their adventure as their class, as hard as they chose
      else
        this.sim.startAs(
          (this.registry.get('localClass') as ClassId | undefined) ?? 'warrior',
          (this.registry.get('localDifficulty') as Difficulty | undefined) ?? 'normal'
        );
    }
    // the hero wears what the sim has equipped: redraw them whenever the gear changes
    this.wearGear();
    this.sim.events.on('bag', () => this.wearGear());
    const built = buildRegionGround(this, this.sim.map, this.sim.regionDef.ring);
    this.built = built;
    this.world = new WorldRenderer(this, this.sim, built);
    this.effects = new Effects(this, this.sim);
    this.clouds = new Clouds(this, this.sim.map.cols, this.sim.map.rows);
    this.cameras.main.setZoom(PIXEL_SCALE).setRoundPixels(true).setBackgroundColor('#0b1220');
    // coming from the loading screen: fade up from black
    if (this.registry.get('fadeIn')) this.cameras.main.fadeIn(500, 0, 0, 0);
    this.lighting = new Lighting(this, this.cameras.main, this.sim.day);
    this.lighting.setRing(this.sim.regionDef.ring, !!this.sim.regionDef.indoor, !!this.sim.regionDef.dusk);
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
    this.sfx = new Sfx(this.game, this.sim);
    this.music = new Music(this.game, this.sim);
    this.weather = new WeatherFx(this, this.sim);
    const bus = this.sfx.bus;
    if (bus) this.weather.setAudio(new WeatherAudio(bus.ctx, bus.out));
    this.dev = new DevMenu(this.game, this.sim, this.lighting, this.clouds, this.effects, this.sfx, this.music);
    this.registry.set('dev', this.dev);
    this.inventory = new InventoryWindow(this.game, this.sim);
    this.registry.set('inventory', this.inventory);
    this.crafting = new CraftingWindow(this.game, this.sim);
    this.registry.set('crafting', this.crafting);
    this.trade = new TradeWindow(this.sim);
    this.dialog = new DialogWindow(this.game, this.sim, this.sfx, id => this.trade.open(id));
    this.questLog = new QuestWindow(this.sim);
    this.registry.set('questLog', this.questLog);
    this.controls = new ControlsWindow();
    this.registry.set('controls', this.controls);
    this.talents = new TalentWindow(this.game, this.sim);
    this.registry.set('talents', this.talents);
    this.spellbook = new SpellbookWindow(this.game, this.sim);
    this.registry.set('spellbook', this.spellbook);
    this.quests = new QuestTracker(this.sim, () => this.questLog.toggle(true));
    this.sceneBox = new SceneBox(this.sim, this.sfx);
    this.bossBar = new BossBar(this.sim);
    this.duel = new DuelWindow(this.sim, () => (this.registry.get('hudTop') as number | undefined) ?? 40);
    this.registry.set('duel', this.duel);
    // the trade request's bar goes under the duel's when both are up
    this.barter = new PlayerTradeWindow(this.sim, () => {
      const top = (this.registry.get('hudTop') as number | undefined) ?? 40;
      const duel = this.duel.barBottom;
      return duel ? duel + 6 : top;
    });
    this.shown = this.windows().map(w => w.isOpen);
    // a scene's fades win over any fade already running (a new game's opening scene starts in
    // black while the fade up from the loading screen is still going: Phaser would ignore it)
    this.sim.events.on('sceneFade', ({ dir, s }) => this.cameras.main.fadeEffect.start(dir === 'out', s * 1000, 0, 0, 0, true));
    let inScene = false;
    const onScene = () => {
      // a scene starting clears the screen: every window is put away (dialog and trade close themselves)
      if (this.sim.scene && !inScene) {
        for (const w of [this.inventory, this.crafting, this.questLog, this.controls, this.talents, this.spellbook]) if (w.isOpen) w.toggle(false);
        if (this.dev.isOpen) this.dev.setOpen(false);
      }
      inScene = !!this.sim.scene;
      // the quest list steps aside with the HUD (see update)
      document.body.classList.toggle('in-scene', inScene);
      // a scene that ended (or was cut short by loading a save) never leaves the screen black
      const fade = this.cameras.main.fadeEffect;
      if (!this.sim.scene && !this.sim.exiting && fade.isComplete && fade.direction) this.cameras.main.fadeIn(400, 0, 0, 0);
    };
    this.sim.events.on('scene', onScene);
    // a new game's opening scene has already started (in startAs, above)
    onScene();
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
    this.registry.set('setView', (m: ViewMode) => this.setView(m));
    this.registry.set('getView', () => this.viewMode);
    this.registry.set('cycleView', (dir: 1 | -1) => this.cycleView(dir));
    this.setView(readView(), true);
    this.game.canvas.addEventListener('wheel', this.onWheel, { passive: true });
    if (directorWanted()) this.director = new Director(this.game, () => ({ sim: this.sim, sfx: this.sfx, weather: this.weather, lighting: this.lighting }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
      this.game.canvas.removeEventListener('wheel', this.onWheel);
      this.effects.destroy();
      this.clouds.destroy();
      this.lighting.destroy();
      this.weather.destroy();
      this.sfx.destroy();
      this.music.destroy();
      this.view3d?.destroy();
      this.view3d = null;
      this.registry.set('view3d', null);
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
      document.body.classList.remove('in-scene');
      this.bossBar.destroy();
      this.duel.destroy();
      this.registry.remove('duel');
      this.barter.destroy();
      this.sim.events.clear();
    });
  }

  /** Fires and forges glow warm at night; a campfire's light shrinks as it burns out, or is smothered. */
  private lightStructures(): void {
    const want = new Set<string>();
    for (const s of this.sim.structures) {
      // a fire put out gives no light; one being smothered fades as it goes
      if (s.out) continue;
      const id = 'build' + s.id;
      want.add(id);
      const fire = !!STRUCTURES[s.kind].fire;
      const k = (fire && s.t < 6 ? Math.max(0, s.t / 6) : 1) * (1 - 0.8 * (s.smother ?? 0));
      this.lighting.setLight({
        id,
        x: isoX(s.x, s.y),
        y: isoY(s.x, s.y) - (fire ? 8 : 12),
        wx: s.x,
        wy: s.y,
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

  /** The grey lantern carries its own small, pale light through the trees. */
  private lightWanderers(): void {
    for (const w of this.sim.wanderers) {
      if (w.id !== 'lantern') continue;
      const id = 'wanderer:' + w.id;
      if (w.alpha <= 0.02) {
        if (this.wandererLit.delete(id)) this.lighting.removeLight(id);
        continue;
      }
      this.wandererLit.add(id);
      this.lighting.setLight({
        id,
        x: isoX(w.x, w.y) + 3 * w.face,
        y: isoY(w.x, w.y) - 14,
        wx: w.x,
        wy: w.y,
        radius: 104,
        r: 0.05,
        g: 0.08,
        b: 0.2,
        intensity: Math.min(1, w.alpha * 1.2),
        flickerHz: 5,
        flickerAmount: 0.1,
      });
    }
  }

  private wandererLit = new Set<string>();

  /** The windows that open and close with a sound. */
  private windows(): { isOpen: boolean }[] {
    return [this.inventory, this.crafting, this.trade, this.barter, this.dialog, this.questLog, this.controls, this.talents, this.spellbook, this.dev];
  }

  /** Which windows were open last frame. */
  private shown: boolean[] = [];

  /** A window opening or closing makes a sound, however it happened (a key, a button, Esc, another window taking its place). */
  private soundWindows(): void {
    const now = this.windows().map(w => w.isOpen);
    if (now.some((o, i) => o && !this.shown[i])) this.sfx.play('open');
    else if (now.some((o, i) => !o && this.shown[i])) this.sfx.play('close');
    this.shown = now;
  }

  /** Draw the hero in their current equipment (HD styles show gear on the sprite). */
  private wearGear(): void {
    if (setHeroGear(this.sim.equip) && isHdStyle(spriteStyle())) {
      applyHeroTextures(this, spriteStyle());
      this.view3d?.refreshTextures();
    }
  }

  /**
   * How the world is seen: the 2D isometric art, or the 3D views (render/view3d): a diorama
   * that turns (`,` and `.`, right-drag, the wheel zooms) or close behind the hero.
   */
  setView(mode: ViewMode, quiet = false): void {
    this.viewMode = mode;
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      // private browsing: the view just isn't remembered
    }
    const three = mode !== 'iso';
    if (three && !this.view3d) {
      try {
        this.view3d = new View3D(this, this.sim, this.lighting, this.effects, this.weather);
        this.view3d.setRegion(this.world, this.built);
      } catch (e) {
        // no WebGL for a second canvas: stay in 2D
        console.warn('3D view unavailable', e);
        this.view3d = null;
        if (!quiet) this.sim.log('The 3D views need WebGL.', 'h');
        this.viewMode = 'iso';
        return this.setView('iso', true);
      }
    }
    if (!three && this.view3d) {
      this.view3d.destroy();
      this.view3d = null;
    }
    this.view3d?.setMode(mode as Exclude<ViewMode, 'iso'>);
    this.registry.set('view3d', this.view3d);
    // the 2D world steps aside; the camera stays (its fades still cover the 3D view)
    this.world.layer.setVisible(!three);
    this.clouds.setSuppressed(three);
    this.lighting.setSuspended(three);
    this.cameras.main.setBackgroundColor(three ? 'rgba(0,0,0,0)' : '#0b1220');
    this.sim.hero.walkFlat = three;
    if (!quiet) this.sim.log(`View: ${VIEW_NAMES[mode]}  (${PC_KEYS.view.bind} for the next one${three ? ', , and . turn it' : ''})`, 't');
  }

  private cycleView(dir: 1 | -1): void {
    const n = VIEW_MODES.length;
    this.setView(VIEW_MODES[(VIEW_MODES.indexOf(this.viewMode) + dir + n) % n]);
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
    this.view3d?.refreshTextures();
    this.sim.log(`Art style: ${STYLE_LABELS[style]}  (${PC_KEYS.artStyle.bind} for the next one)`);
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
      this.view3d?.refreshTextures();
    }
    this.sim.log(`Hero: ${HD_HERO_LABELS[id]}  (H for the next one)`);
  }

  private cycleHdHero(dir: 1 | -1): void {
    const n = HD_HERO_IDS.length;
    // from a non-HD style, H starts on the current choice instead of skipping it
    const i = HD_HERO_IDS.indexOf(hdHeroId());
    this.setHdHero(isHdStyle(spriteStyle()) ? HD_HERO_IDS[(i + dir + n) % n] : HD_HERO_IDS[i]);
  }

  /** Y (with the backup art styles switched on): step through the art styles. */
  private cycleArtStyle(dir: 1 | -1): void {
    const n = CANDIDATE_STYLES.length;
    this.setArtStyle(CANDIDATE_STYLES[(CANDIDATE_STYLES.indexOf(spriteStyle()) + dir + n) % n]);
  }

  private onResize(): void {
    this.cameras.main.setZoom(PIXEL_SCALE);
    this.view3d?.resize();
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
    for (const ev of ['quests', 'level', 'region', 'bag', 'talents', 'flags', 'loadout', 'difficulty'] as const) this.sim.events.on(ev, soon);
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
    const built = buildRegionGround(this, this.sim.map, this.sim.regionDef.ring);
    this.built = built;
    this.world = new WorldRenderer(this, this.sim, built);
    this.world.layer.setVisible(!this.view3d);
    this.view3d?.setRegion(this.world, built);
    this.placeStaticLights(built);
    this.lighting.setRing(this.sim.regionDef.ring, !!this.sim.regionDef.indoor, !!this.sim.regionDef.dusk);
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
        wx: o.wx,
        wy: o.wy,
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
      this.lighting.setLight({ id, x: isoX(c * T + 16, r * T + 16), y: isoY(c * T + 16, r * T + 16) - 20, wx: c * T + 16, wy: r * T + 16, radius: 130, r: 0, g: 0.05, b: 0.32, intensity: 1, flickerHz: 7, flickerAmount: 0.14 });
    }
    // lit windows spill a little warm light in front of the house
    for (const p of this.sim.props) {
      const def = PROPS[p.kind];
      if (!def.lit) continue;
      const id = 'prop' + i++;
      this.staticLights.push(id);
      const wx = (p.c + def.w / 2) * T;
      const wy = (p.r + def.h) * T + 6;
      this.lighting.setLight({ id, x: isoX(wx, wy), y: isoY(wx, wy) - 26, wx, wy, radius: 84, r: 0, g: 0.06, b: 0.3, intensity: 0.75, flickerHz: 3, flickerAmount: 0.05 });
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
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,COMMA,PERIOD,Q,E') as GameScene['keys'];
    kb.addCapture([KC.SPACE, KC.TAB, KC.UP, KC.DOWN, KC.LEFT, KC.RIGHT]);
    return kb;
  }

  /** PC: action bar slots plus Rev, target, jump and dodge keys (see data/actionBar.ts). */
  private setupPcKeyboard(): void {
    const kb = this.setupMovementKeys();
    if (!kb) return;
    // each bar key casts whatever you have put in its slot (in the point-of-view view Q and E
    // turn instead: their slots cast with a click)
    const turns: string[] = [PC_KEYS.povTurnLeft.code, PC_KEYS.povTurnRight.code];
    BAR_KEYS.forEach((b, i) =>
      kb.on('keydown-' + b.code, () => {
        if (this.viewMode === 'pov' && turns.includes(b.code)) return;
        this.sim.castBarSlot(i);
      })
    );
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
    kb.on('keydown-' + PC_KEYS.view.code, (ev: KeyboardEvent) => this.cycleView(ev.shiftKey ? -1 : 1));
    kb.on('keydown-' + PC_KEYS.turnLeft.code, () => this.view3d?.turnStep(-1));
    kb.on('keydown-' + PC_KEYS.turnRight.code, () => this.view3d?.turnStep(1));
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
      if (this.view3d) {
        // a 3D view walks relative to its camera (PoV: A and D turn); the sim reads the keys as a
        // direction on the 2D screen, so hand it the one that walks that way on the ground
        const k = this.keys;
        const turn = k ? (k.PERIOD.isDown || k.E.isDown ? 1 : 0) - (k.COMMA.isDown || k.Q.isDown ? 1 : 0) : 0;
        const d = this.view3d.steer(mx, my, this.view3d.mode === 'pov' ? turn : 0, dt);
        const sx = d.x - d.y;
        const sy = (d.x + d.y) / 2;
        const l = Math.hypot(sx, sy);
        mx = l ? sx / l : 0;
        my = l ? sy / l : 0;
      }
      this.sim.inputMove.x = mx;
      this.sim.inputMove.y = my;
    }

    this.sim.tick(dt);
    this.soundWindows();
    this.music.update(dt);
    // the HUD steps aside while a scene plays (the black bars would cut through it), and for a clean shot
    const hud = this.scene.get(PLATFORM === 'pc' ? SceneKeys.PcHud : SceneKeys.MobileHud);
    const hideHud = !!this.sim.scene || !!this.director?.clean;
    if (hud && hud.sys.settings.visible === hideHud) hud.sys.setVisible(!hideHud);

    // the camera follows the hero, or eases over to what a scene is showing
    const look = this.sim.scene?.look;
    // on the hero: the same whole pixel the hero is drawn at, so they never shimmer against the screen
    const hero = this.world.heroScreen();
    const want = look ? { x: isoX(look.x, look.y), y: isoY(look.x, look.y) + 20 } : { x: hero.x, y: hero.y + 20 };
    if (this.sim.scene) this.camEase = 0.8;
    else this.camEase = Math.max(0, this.camEase - dt);
    if (!this.camAt || this.camEase <= 0) this.camAt = want;
    else {
      const k = Math.min(1, dt * 4);
      this.camAt = { x: this.camAt.x + (want.x - this.camAt.x) * k, y: this.camAt.y + (want.y - this.camAt.y) * k };
    }
    const shake = (this.sim.shake > 0 ? Math.random() * 6 - 3 : 0) + this.weather.shake;
    // filming: the director may hold the camera (where, and how close)
    const shot = this.director?.camera() ?? null;
    const zoom = PIXEL_SCALE * (shot?.zoom ?? (this.viewMode === 'iso' ? this.isoZoom : 1));
    if (this.cameras.main.zoom !== zoom) this.cameras.main.setZoom(zoom);
    // (the director's camera glides between whole pixels: a slow pan doesn't step)
    if (shot) this.cameras.main.centerOn(shot.x + shake, shot.y);
    else this.cameras.main.centerOn(Math.round(this.camAt.x + shake), Math.round(this.camAt.y));
    this.world.draw(time);
    if (!this.view3d) this.effects.draw();
    this.weather.update(dt, !this.view3d);
    this.lighting.setWeather(this.weather.gloom, this.weather.flash);
    this.clouds.setWeather(this.weather.gloom, this.sim.weather.storm);
    this.clouds.update(dt);
    // the player carries a small neutral light so night stays playable; a lantern adds a warm pool
    const px = isoX(this.sim.x, this.sim.y);
    const py = isoY(this.sim.x, this.sim.y) - 10;
    if (this.director?.playerLight === false) this.lighting.removeLight('player');
    else this.lighting.setLight({ id: 'player', x: px, y: py, wx: this.sim.x, wy: this.sim.y, radius: 110, r: 0, g: 0, b: 0, intensity: 0.9 });
    if (this.sim.gear.light > 0)
      this.lighting.setLight({ id: 'lantern', x: px, y: py, wx: this.sim.x, wy: this.sim.y, radius: 110 + this.sim.gear.light, r: 0.02, g: 0.06, b: 0.16, intensity: 0.75, flickerHz: 5, flickerAmount: 0.06 });
    else this.lighting.removeLight('lantern');
    this.lightStructures();
    this.lightWanderers();
    // the grey postman carries a faint cold light of his own
    for (const w of this.sim.wanderers) {
      const id = 'wanderer:' + w.id;
      if (w.alpha > 0.05) this.lighting.setLight({ id, x: isoX(w.x, w.y), y: isoY(w.x, w.y) - 16, wx: w.x, wy: w.y, radius: 46, r: 0.2, g: 0.1, b: 0, intensity: w.alpha * 0.7 });
      else this.lighting.removeLight(id);
    }
    if (this.view3d) {
      this.lighting.tick(dt);
      // the 3D camera follows the hero, or the 2D camera's eased point while a scene shows something
      const at = this.sim.scene || this.camEase > 0 ? fromIso(this.camAt.x, this.camAt.y - 20) : { x: this.sim.x, y: this.sim.y };
      this.view3d.update(time, dt, at);
    } else this.lighting.update(dt);
    this.bossBar.update();
    this.duel.update();
    this.barter.update();
    this.dev.update();
  }
}
