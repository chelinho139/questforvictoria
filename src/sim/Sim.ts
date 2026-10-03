import type { Key, SkillKey, ActionKey, WheelKey } from '../data/skills';
import type { EnemyKind } from '../data/enemies';
import type { RegionDef } from '../data/regions';
import type { Cond, Effect } from '../data/story';
import type { Recipe, StructureKind } from '../data/crafting';
import type { NpcId } from '../data/npcs';
import type { TalentFx, TreeId } from '../data/talents';
import type { SpellKey } from '../data/spells';
import type { ClassId } from '../data/classes';
import type { ItemId, Slot, Stats } from '../data/items';
import type { SaveData } from './save';
import type { RegionMap } from './map';
import type { Pt } from './pathfind';
import { Emitter } from './Emitter';
import { Game } from './Game';
import { Hero } from './Hero';
import type { KeyInfo } from './Hero';
import type { Region } from './Region';
import type { Enemy, Fx, Particle, ButtonId, SimEvents, Stack, Drop, TreeState, RockState, Structure, NpcState, QuestProgress, QuestStatus, ObjectState, PropState, Hazard, WandererState, LogClass, Trap } from './types';

export { GCD, WIN, AA_RANGE, JUMP_DUR, JUMP_HEIGHT, FLIP_DUR, FLIP_HEIGHT, FLIP_CHANCE, ATK_ANIM, AA_PERIOD, TALK_REACH } from './Hero';
export type { KeyInfo } from './Hero';
export { RISE_DUR } from './Region';
export { goalTarget } from './Game';

/** The settings panel's switches (Sim.cheats). */
export interface CheatSwitches {
  god: boolean;
  infiniteMana: boolean;
  noCooldowns: boolean;
  moveSpeed: number;
  freezeEnemies: boolean;
}

/**
 * The game as one player's screen sees it: their hero, the region around them and the story
 * they share. The scenes, the HUD and the windows read it and call its methods. Underneath
 * runs a Game (the same one a server runs for a room) with this player's Hero in it; the
 * events of the hero, its region and the room arrive here as one stream. Knows nothing about
 * Phaser.
 */
export class Sim {
  readonly events = new Emitter<SimEvents>();
  readonly game = new Game();
  readonly hero: Hero;
  /** Effects and particles to draw, fed by the region (the screen animates them itself). */
  fx: Fx[] = [];
  parts: Particle[] = [];
  /** Playing in a room on a server (NetSim), rather than here in the browser. */
  readonly online: boolean = false;
  private offRegion: (() => void)[] = [];
  /** The region whose events the hero hears. */
  private heard: Region | null = null;

  /** `replica`: the world arrives from a server (NetSim builds it); don't start a game here. */
  constructor(replica = false) {
    const h = new Hero(this.game, 'local', 'Hero');
    this.hero = h;
    this.game.heroes.push(h);
    // the hero's own events, and the room's, pass straight through
    for (const k of ['log', 'banner', 'castFlash', 'nudge', 'loadout', 'died', 'bag', 'talk', 'level', 'talents', 'respawned', 'exit', 'trade', 'sound'] as const) {
      h.events.on(k, p => this.events.emit(k, p as never));
    }
    h.events.on('region', p => {
      this.listenToRegion();
      this.events.emit('region', p);
    });
    for (const k of ['quests', 'flags', 'journal'] as const) this.game.events.on(k, p => this.events.emit(k, p as never));
    if (replica) return;
    this.game.reset(h);
    this.listenToRegion();
  }

  /** Hear the region the hero stands in (again after every change of region). */
  protected listenToRegion(): void {
    // the region itself, not just its id: starting over builds a new Greenmarch
    const r = this.game.region(this.hero.regionId);
    if (r === this.heard && this.offRegion.length) return;
    for (const off of this.offRegion) off();
    this.offRegion = [];
    this.heard = r;
    this.fx = [];
    this.parts = [];
    const on = r.events;
    this.offRegion.push(
      on.on('floater', p => this.events.emit('floater', p)),
      on.on('scene', p => this.events.emit('scene', p)),
      on.on('sceneFade', p => this.events.emit('sceneFade', p)),
      on.on('bossPhase', p => this.events.emit('bossPhase', p)),
      on.on('sound', p => this.events.emit('sound', p)),
      on.on('fx', f => this.fx.push({ t: 0, ...f })),
      on.on('burst', b => this.burst(b.x, b.y, b.n, b.col, b.spd, b.life, b.size, b.g)),
      on.on('shake', p => (this.hero.shake = Math.max(this.hero.shake, p.s)))
    );
  }

  private burst(x: number, y: number, n: number, col: string, spd: number, life: number, size: number, g: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = spd * (0.4 + Math.random() * 0.6);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.4), max: life, col, size, g });
    }
  }

  protected updateFx(dt: number): void {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      if (f.t >= f.dur) this.fx.splice(i, 1);
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.g * dt;
      p.life -= dt;
      if (p.life <= 0) this.parts.splice(i, 1);
    }
  }

  /** The region the hero stands in. */
  protected get R(): Region {
    return this.game.region(this.hero.regionId);
  }

  // ---------- the loop, travel, saving ----------
  tick(dt: number): void {
    this.game.tick(dt);
    this.listenToRegion();
    this.updateFx(dt * this.game.timeScale);
  }
  enterRegion(id: string, spot: string): void {
    this.game.moveHero(this.hero, id, spot);
  }
  toSave(): SaveData {
    return this.game.toSave(this.hero);
  }
  loadSave(d: SaveData): boolean {
    const ok = this.game.loadSave(d, this.hero);
    this.listenToRegion();
    this.events.emit('scene', {});
    return ok;
  }
  reset(): void {
    this.game.reset(this.hero);
    this.listenToRegion();
    this.events.emit('loadout', {});
  }

  /** A new game as a hero of this class (a new single-player character). */
  startAs(cls: ClassId): void {
    this.hero.cls = cls;
    this.reset();
  }

  /** Warrior or archer. */
  get cls(): ClassId {
    return this.hero.cls;
  }

  /** How far the auto-attack reaches (a bowshot for an archer). */
  get aaReach(): number {
    return this.hero.aaReach;
  }

  // ---------- the world around the hero ----------
  get region(): string {
    return this.hero.regionId;
  }
  get regionDef(): RegionDef {
    return this.R.def;
  }
  get map(): RegionMap {
    return this.R.map;
  }
  get enemies(): Enemy[] {
    return this.R.enemies;
  }
  get trees(): TreeState[] {
    return this.R.trees;
  }
  get rocks(): RockState[] {
    return this.R.rocks;
  }
  get structures(): Structure[] {
    return this.R.structures;
  }
  /** The items on the ground this hero can see (their own loot, and anyone's). */
  get drops(): Drop[] {
    return this.R.drops.filter(d => !d.owner || d.owner === this.hero.id);
  }
  get npcs(): NpcState[] {
    return this.R.npcs;
  }
  get objects(): ObjectState[] {
    return this.R.objects;
  }
  get props(): PropState[] {
    return this.R.props;
  }
  get hazards(): Hazard[] {
    return this.R.hazards;
  }
  /** The other heroes in the hero's region (online, the other players). */
  get others(): Hero[] {
    return this.game.heroes.filter(o => o !== this.hero && o.regionId === this.hero.regionId);
  }
  /** Bear traps set in the hero's region. */
  get traps(): Trap[] {
    return this.R.traps;
  }
  get wanderers(): WandererState[] {
    return this.R.wanderers;
  }
  get scene(): Region['scene'] {
    return this.R.scene;
  }
  get isNight(): boolean {
    return this.R.isNight;
  }
  get day(): Game['day'] {
    return this.game.day;
  }
  get timeScale(): number {
    return this.game.timeScale;
  }
  set timeScale(v: number) {
    this.game.timeScale = v;
  }
  sceneNext(): void {
    this.R.sceneNext();
  }
  touchWanderer(id: string): void {
    this.R.touchWanderer(id, this.hero);
  }
  spawnNear(kind: EnemyKind): void {
    this.R.spawnNear(kind, this.hero);
  }
  killAllEnemies(): void {
    for (const e of this.R.enemies) if (e.alive) this.hero.dmgEnemy(e, e.hp, 'crit');
  }
  respawnAllEnemies(): void {
    this.R.respawnAll();
  }

  // ---------- the story ----------
  get flags(): Record<string, number> {
    return this.game.flags;
  }
  get quests(): Record<string, QuestProgress> {
    return this.game.quests;
  }
  get journal(): string[] {
    return this.game.journal;
  }
  check(c?: Cond): boolean {
    return this.game.check(c, this.hero);
  }
  setFlag(name: string, v = 1): void {
    this.game.setFlag(name, v);
  }
  applyEffect(e?: Effect): void {
    this.game.applyEffect(e, this.hero);
  }
  goalCount(id: string, i: number): number {
    return this.game.goalCount(id, i, this.hero);
  }
  questStatus(id: string): QuestStatus {
    return this.game.questStatus(id, this.hero);
  }
  turnInOf(id: string): NpcId {
    return this.game.turnInOf(id);
  }
  questsOf(npc: NpcId): { id: string; status: QuestStatus }[] {
    return this.game.questsOf(npc, this.hero);
  }
  npcMark(npc: NpcId): '?' | '!' | '…' | null {
    return this.game.npcMark(npc, this.hero);
  }
  acceptQuest(id: string): void {
    this.game.acceptQuest(id, this.hero);
  }
  completeQuest(id: string): boolean {
    return this.game.completeQuest(id, this.hero);
  }

  /** Dev: set the time of day (0..1). */
  setDay(t: number): void {
    this.game.day.set(t);
  }
  /** Dev: run the day faster (0 stops it). */
  setDaySpeed(speed: number): void {
    this.game.day.setSpeed(speed);
  }

  // ---------- the hero ----------
  private cheatSwitches: CheatSwitches | null = null;
  /** Dev switches: the hero's own, and the game's (freeze). */
  get cheats(): CheatSwitches {
    return (this.cheatSwitches ??= this.makeCheats());
  }
  protected makeCheats(): CheatSwitches {
    return ((sim: Sim) => ({
    get god() {
      return sim.hero.cheats.god;
    },
    set god(v: boolean) {
      sim.hero.cheats.god = v;
    },
    get infiniteMana() {
      return sim.hero.cheats.infiniteMana;
    },
    set infiniteMana(v: boolean) {
      sim.hero.cheats.infiniteMana = v;
    },
    get noCooldowns() {
      return sim.hero.cheats.noCooldowns;
    },
    set noCooldowns(v: boolean) {
      sim.hero.cheats.noCooldowns = v;
    },
    get moveSpeed() {
      return sim.hero.cheats.moveSpeed;
    },
    set moveSpeed(v: number) {
      sim.hero.cheats.moveSpeed = v;
    },
    get freezeEnemies() {
      return sim.game.cheats.freezeEnemies;
    },
    set freezeEnemies(v: boolean) {
      sim.game.cheats.freezeEnemies = v;
    },
  }))(this);
  }

  get logHistory(): { text: string; cls: LogClass }[] {
    return this.hero.logHistory;
  }
  get x(): number {
    return this.hero.x;
  }
  set x(v: number) {
    this.hero.x = v;
  }
  get y(): number {
    return this.hero.y;
  }
  set y(v: number) {
    this.hero.y = v;
  }
  get face(): 1 | -1 {
    return this.hero.face;
  }
  get walk(): number {
    return this.hero.walk;
  }
  get hp(): number {
    return this.hero.hp;
  }
  get hpMax(): number {
    return this.hero.hpMax;
  }
  get mp(): number {
    return this.hero.mp;
  }
  get mpMax(): number {
    return this.hero.mpMax;
  }
  get t(): number {
    return this.hero.t;
  }
  get buffT(): number {
    return this.hero.buffT;
  }
  get invT(): number {
    return this.hero.invT;
  }
  get bleedT(): number {
    return this.hero.bleedT;
  }
  get dead(): number {
    return this.hero.dead;
  }
  get flash(): number {
    return this.hero.flash;
  }
  get shake(): number {
    return this.hero.shake;
  }
  get kills(): number {
    return this.hero.kills;
  }
  get perf(): number {
    return this.hero.perf;
  }
  get gold(): number {
    return this.hero.gold;
  }
  get level(): number {
    return this.hero.level;
  }
  get xp(): number {
    return this.hero.xp;
  }
  get talents(): Record<string, number> {
    return this.hero.talents;
  }
  get tal(): TalentFx {
    return this.hero.tal;
  }
  get bar(): (SpellKey | null)[] {
    return this.hero.bar;
  }
  get bag(): (Stack | null)[] {
    return this.hero.bag;
  }
  get equip(): Record<Slot, ItemId | null> {
    return this.hero.equip;
  }
  get gear(): Stats {
    return this.hero.gear;
  }
  get target(): Enemy | null {
    return this.hero.target;
  }
  get mounted(): boolean {
    return this.hero.mounted;
  }
  get mountT(): number {
    return this.hero.mountT;
  }
  get jumpFlip(): boolean {
    return this.hero.jumpFlip;
  }
  get rev(): boolean {
    return this.hero.rev;
  }
  get revAuto(): boolean {
    return this.hero.revAuto;
  }
  get revEnabled(): boolean {
    return this.hero.revEnabled;
  }
  get path(): Pt[] | null {
    return this.hero.path;
  }
  get inputMove(): { x: number; y: number } {
    return this.hero.inputMove;
  }
  get exiting(): { to: string; at: string } | null {
    return this.hero.exiting;
  }
  get chopTree(): TreeState | null {
    return this.hero.chopTree;
  }
  get mineRock(): RockState | null {
    return this.hero.mineRock;
  }
  get moving(): boolean {
    return this.hero.moving;
  }
  get moveGoal(): Pt | null {
    return this.hero.moveGoal;
  }
  get attackP(): number {
    return this.hero.attackP;
  }
  get airborne(): boolean {
    return this.hero.airborne;
  }
  get jumpP(): number {
    return this.hero.jumpP;
  }
  get jumpZ(): number {
    return this.hero.jumpZ;
  }
  get armor(): number {
    return this.hero.armor;
  }
  get critMult(): number {
    return this.hero.critMult;
  }
  get playerSpeed(): number {
    return this.hero.playerSpeed;
  }
  get talentPoints(): number {
    return this.hero.talentPoints;
  }
  get activeBoss(): Enemy | null {
    return this.hero.activeBoss;
  }
  get w1(): ActionKey[] {
    return this.hero.w1;
  }
  get w2(): Key[] {
    return this.hero.w2;
  }
  get seq(): SkillKey[] {
    return this.hero.seq;
  }
  get sel1(): ActionKey {
    return this.hero.sel1;
  }
  get sel2(): Key {
    return this.hero.sel2;
  }
  get met(): Set<NpcId> {
    return this.hero.met;
  }

  log(text: string, cls: LogClass = ''): void {
    this.hero.log(text, cls);
  }
  dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return this.hero.dist(a, b);
  }
  info(k: WheelKey): KeyInfo {
    return this.hero.info(k);
  }
  cdRemaining(k: WheelKey): number {
    return this.hero.cdRemaining(k);
  }
  unavailable(k: WheelKey): boolean {
    return this.hero.unavailable(k);
  }
  canDo(k: WheelKey): string | null {
    return this.hero.canDo(k);
  }
  knows(k: SpellKey): boolean {
    return this.hero.knows(k);
  }
  revPick(): SkillKey {
    return this.hero.revPick();
  }
  revList(): SkillKey[] {
    return this.hero.revList();
  }
  revIdx(): number {
    return this.hero.revIdx();
  }
  setTarget(e: Enemy | null): void {
    this.hero.setTarget(e);
  }
  cycleTarget(): void {
    this.hero.cycleTarget();
  }
  setRevEnabled(on: boolean): void {
    this.hero.setRevEnabled(on);
  }
  setRev(on: boolean): void {
    this.hero.setRev(on);
  }
  setRevAuto(on: boolean): void {
    this.hero.setRevAuto(on);
  }
  revStep(): void {
    this.hero.revStep();
  }
  castKey(k: Key): boolean {
    return this.hero.castKey(k);
  }
  castSlot(i: number): void {
    this.hero.castSlot(i);
  }
  castBarSlot(i: number): void {
    this.hero.castBarSlot(i);
  }
  setBarSlot(i: number, k: SpellKey | null): void {
    this.hero.setBarSlot(i, k);
  }
  setSeqPreset(name: string): void {
    this.hero.setSeqPreset(name);
  }
  tapButton(b: ButtonId): void {
    this.hero.tapButton(b);
  }
  pickFromWheel(b: ButtonId, k: WheelKey): void {
    this.hero.pickFromWheel(b, k);
  }
  mountToggle(): void {
    this.hero.mountToggle();
  }
  jump(): void {
    this.hero.jump();
  }
  dodge(): void {
    this.hero.dodge();
  }
  moveTo(x: number, y: number, marker = true): boolean {
    return this.hero.moveTo(x, y, marker);
  }
  stopMoving(): void {
    this.hero.stopMoving();
  }
  gatherNearest(): void {
    this.hero.gatherNearest();
  }
  startChop(tree: TreeState): void {
    this.hero.startChop(tree);
  }
  startMine(rock: RockState): void {
    this.hero.startMine(rock);
  }
  useObject(id: string): void {
    this.hero.useObject(id);
  }
  talkTo(id: NpcId): void {
    this.hero.talkTo(id);
  }
  nearNpc(id: NpcId): boolean {
    return this.hero.nearNpc(id);
  }
  talked(id: NpcId): boolean {
    return this.hero.talked(id);
  }
  asked(id: NpcId, i: number): void {
    this.hero.asked(id, i);
  }
  readDoc(id: string): void {
    this.game.readDoc(id);
  }
  count(id: ItemId): number {
    return this.hero.count(id);
  }
  addItem(id: ItemId, n: number): number {
    return this.hero.addItem(id, n);
  }
  useSlot(i: number): void {
    this.hero.useSlot(i);
  }
  equipFromBag(i: number): void {
    this.hero.equipFromBag(i);
  }
  unequip(slot: Slot): void {
    this.hero.unequip(slot);
  }
  sellValue(id: ItemId): number {
    return this.hero.sellValue(id);
  }
  buy(npc: NpcId, id: ItemId): boolean {
    return this.hero.buy(npc, id);
  }
  sell(npc: NpcId, slot: number, all = false): boolean {
    return this.hero.sell(npc, slot, all);
  }
  nearStation(kind: StructureKind): Structure | null {
    return this.hero.nearStation(kind);
  }
  craftProblem(r: Recipe): string | null {
    return this.hero.craftProblem(r);
  }
  craft(id: string): boolean {
    return this.hero.craft(id);
  }
  gainXp(n: number): void {
    this.hero.gainXp(n);
  }
  talentsSpent(tree?: TreeId): number {
    return this.hero.talentsSpent(tree);
  }
  talentProblem(id: string): string | null {
    return this.hero.talentProblem(id);
  }
  learnTalent(id: string): boolean {
    return this.hero.learnTalent(id);
  }
  resetTalents(): void {
    this.hero.resetTalents();
  }
  healFull(): void {
    this.hero.healFull();
  }
  teleportToStart(): void {
    this.hero.teleportToStart();
  }
  dropRandomLoot(): void {
    this.hero.dropRandomLoot();
  }
}
