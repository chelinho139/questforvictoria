import Phaser from 'phaser';
import { SceneKeys } from '../SceneKeys';
import type { Sim } from '../../sim/Sim';
import type { Enemy, SimEvents, LogClass } from '../../sim/types';
import { isSkill } from '../../data/skills';
import type { Key, WheelKey } from '../../data/skills';
import { BAR_KEYS, PC_KEYS } from '../../data/actionBar';
import type { SpellKey } from '../../data/spells';
import { dragSpell } from '../ui/spellDrag';
import { isoX, isoY, fromIso } from '../../sim/map';
import { Colors, Fonts, hex, PIXEL_SCALE, logicalSize } from '../config';
import { Tex } from '../render/textures';
import { drawSquareSweep } from '../render/hud';
import type { Graphics, Text } from '../render/hud';
import { DayDial, DIAL_R } from '../render/DayDial';
import { UI, Ink, panel, uiText } from '../render/uiKit';
import { portraitCrop } from '../render/art';
import { playerName } from '../player';
import { xpToNext } from '../../data/talents';
import type { TreeState, RockState, NpcState, ObjectState } from '../../sim/types';

type NineSlice = Phaser.GameObjects.NineSlice;
type Image = Phaser.GameObjects.Image;

const GAP = 4;
const LOG_LINES = 6;
const PANEL_H = 64;

// draw order, back to front
const D = { panel: 10, slot: 11, bars: 12, art: 13, sweep: 14, ring: 15, text: 16, tipPanel: 60, tipText: 61, floater: 80, banner: 90, overlay: 100, dead: 110 };

/** Bar fill ramps: highlight row, body, shade row. */
const FILL = {
  hp: ['#ff8a80', '#e0403a', '#9a2020'],
  mp: ['#9ccaff', '#3f86e8', '#2a5eb0'],
  cast: ['#d8c4ff', '#a07af0', '#6a4ab8'],
  xp: ['#e8d4ff', '#a07af0', '#6a4ab8'],
};

interface SlotView {
  /** What the slot casts (null: an empty bar slot). */
  key: WheelKey | null;
  /** Its place on the action bar (-1 for the Rev slot and menu buttons). */
  index: number;
  x: number;
  y: number;
  bg: NineSlice;
  ring: NineSlice;
  icon: Image;
  bind: Text;
  cd: Text;
}

interface UnitFrame {
  x: number;
  panel: NineSlice;
  slot: NineSlice;
  portrait: Image;
  name: Text;
  sub: Text;
  hpBg: NineSlice;
  hpIcon: Image;
  hpText: Text;
  mpBg?: NineSlice;
  mpIcon?: Image;
  mpText?: Text;
}

/**
 * PC HUD in a Stardew / Terraria style: parchment unit frames top-left, the day dial with
 * a gold and tally box top-right, a wooden action bar with inset slots at the bottom,
 * parchment tooltips, and outlined combat text over the world. Owns mouse input: slot
 * clicks, targeting, click-to-move and the menu bar.
 */
export class PcHudScene extends Phaser.Scene {
  private sim!: Sim;
  private gBars!: Graphics;
  private gSweep!: Graphics;
  private gTop!: Graphics;
  private W = 1280;
  private H = 720;
  private slotSize = 40;
  private panelW = 262;

  private player!: UnitFrame;
  private target!: UnitFrame;
  private castTag!: NineSlice;
  private castBg!: NineSlice;
  private castText!: Text;
  private chips: { tag: NineSlice; text: Text }[] = [];

  private dial!: DayDial;
  private info!: NineSlice;
  private tally: { icon: Image; text: Text }[] = [];

  private barBack!: NineSlice;
  private revBack!: NineSlice;
  private revTag!: NineSlice;
  private revState!: Text;
  private slots: SlotView[] = [];
  private revSlot!: SlotView;
  /** Whether the Rev slot is laid out (it is an advanced option, hidden by default). */
  private revShown = false;
  private tipPanel!: NineSlice;
  private tipName!: Text;
  private tipDesc!: Text;
  private hover: WheelKey | null = null;
  private pressed: WheelKey | null = null;
  /** The bar slot under the pointer (it may be empty), and the one a dragged spell is over. */
  private hoverSlot: SlotView | null = null;
  private dropSlot = -1;
  private downUntil = new Map<WheelKey, number>();
  private errUntil = new Map<WheelKey, number>();
  private flashUntil = new Map<WheelKey, number>();
  private flashCol = new Map<WheelKey, string>();

  /** Menu bar in the bottom-right corner: one button per window. */
  private menuBack!: NineSlice;
  private menu: { view: SlotView; win: string; name: string; desc: string; bind: string }[] = [];
  private menuSize = 30;
  private menuHover = -1;
  /** Experience bar above the action bar. */
  private xpBg!: NineSlice;
  private xpHover = false;

  private logTexts: Text[] = [];
  private logLines: { text: string; cls: LogClass }[] = [];
  private bannerText!: Text;
  private deadText!: Text;
  private offs: Array<() => void> = [];
  /** Pointer that started a click-to-move and is still held: the goal keeps following it. */
  private steering: { pointer: Phaser.Input.Pointer; lastT: number } | null = null;

  constructor() {
    super(SceneKeys.PcHud);
  }

  create(): void {
    this.sim = this.registry.get('sim') as Sim;
    this.gBars = this.add.graphics().setDepth(D.bars);
    this.gSweep = this.add.graphics().setDepth(D.sweep);
    this.gTop = this.add.graphics().setDepth(D.overlay);

    this.player = this.unitFrame(true);
    this.player.name.setText(playerName());
    this.player.sub.setText('Warrior · Lv 1');
    this.player.portrait.setTexture(Tex.knight);
    this.target = this.unitFrame(false);
    this.castTag = panel(this, UI.tag, 0, 0, 10, 10).setDepth(D.panel).setVisible(false);
    this.castBg = panel(this, UI.bar, 0, 0, 10, 8).setDepth(D.slot).setVisible(false);
    this.castText = this.text(0, 0, '', 10, Ink.dark, { bold: true }).setOrigin(0, 0.5).setVisible(false);
    for (let i = 0; i < 7; i++) {
      this.chips.push({
        tag: panel(this, UI.tag, 0, 0, 10, 10).setDepth(D.panel).setVisible(false),
        text: this.text(0, 0, '', 10, Ink.dark, { bold: true }).setVisible(false),
      });
    }

    // day dial with its info box
    this.info = panel(this, UI.panel, 0, 0, 10, 10).setDepth(D.panel);
    this.dial = new DayDial(this, D.slot, { labelColor: Ink.dark });
    for (const key of [UI.coin, UI.skull, UI.star]) {
      this.tally.push({ icon: this.add.image(0, 0, key).setOrigin(0, 0.5).setDepth(D.art), text: this.text(0, 0, '0', 11, Ink.dark, { bold: true }).setOrigin(0, 0.5) });
    }

    // action bar
    this.barBack = panel(this, UI.wood, 0, 0, 10, 10).setDepth(D.panel);
    this.revBack = panel(this, UI.wood, 0, 0, 10, 10).setDepth(D.panel);
    this.revTag = panel(this, UI.tag, 0, 0, 10, 10).setDepth(D.panel);
    this.revState = this.text(0, 0, '', 9, Ink.dark, { bold: true }).setOrigin(0.5);
    const mkSlot = (key: WheelKey | null, bind: string, index = -1): SlotView => ({
      key,
      index,
      x: 0,
      y: 0,
      bg: panel(this, UI.slot, 0, 0, 10, 10).setDepth(D.slot),
      ring: panel(this, UI.ring, 0, 0, 10, 10).setDepth(D.ring).setVisible(false),
      icon: this.add.image(0, 0, Tex.icon(key ?? 'rev')).setDepth(D.art).setVisible(!!key),
      bind: this.text(0, 0, bind, 9, Ink.mid, { bold: true }),
      cd: this.text(0, 0, '', 14, '#ffffff', { bold: true, stroke: true }).setOrigin(0.5),
    });
    // the bar's contents come from the sim (you arrange them from the spellbook)
    this.slots = BAR_KEYS.map((b, i) => mkSlot(null, b.bind, i));
    this.registry.set('hudBar', { indexAt: (x: number, y: number) => this.barIndexAtClient(x, y), highlight: (i: number) => (this.dropSlot = i) });
    this.revSlot = mkSlot('rev', PC_KEYS.revStep.bind);
    this.xpBg = panel(this, UI.bar, 0, 0, 10, 7).setDepth(D.slot);
    // the menu bar: windows, each with its key
    this.menuBack = panel(this, UI.wood, 0, 0, 10, 10).setDepth(D.panel);
    const MENU: [string, string, string, string, string][] = [
      ['bag', 'inventory', 'Inventory', 'Your gear and your bag.', PC_KEYS.inventory.bind],
      ['spellbook', 'spellbook', 'Spellbook', 'Every spell; drag them onto your bar.', PC_KEYS.spellbook.bind],
      ['talents', 'talents', 'Talents', 'Spend a point every level in three trees.', PC_KEYS.talents.bind],
      ['craft', 'crafting', 'Crafting', 'Build a campfire or forge; cook, smelt and smith.', PC_KEYS.crafting.bind],
      ['quests', 'questLog', 'Quests', 'In progress, to pick up, and completed.', PC_KEYS.journal.bind],
      ['settings', 'dev', 'Settings', 'Graphics, time of day, advanced options.', PC_KEYS.settings.bind],
      ['help', 'controls', 'Controls', 'Every key in one place.', PC_KEYS.controls.bind],
    ];
    this.menu = MENU.map(([icon, win, name, desc, bind]) => {
      const view = mkSlot('rev', bind);
      view.icon.setTexture(Tex.icon(icon));
      return { view, win, name, desc, bind };
    });
    this.tipPanel = panel(this, UI.panel, 0, 0, 10, 10).setDepth(D.tipPanel).setVisible(false);
    this.tipName = this.text(0, 0, '', 12, Ink.dark, { bold: true }).setDepth(D.tipText).setVisible(false);
    this.tipDesc = this.text(0, 0, '', 10, Ink.mid).setDepth(D.tipText).setVisible(false);

    for (let i = 0; i < LOG_LINES; i++) this.logTexts.push(this.text(0, 0, '', 11, '#ffffff', { stroke: true }).setWordWrapWidth(330));
    this.bannerText = this.text(0, 0, '', 26, Colors.gold, { stroke: true, bold: true, font: Fonts.title }).setOrigin(0.5).setDepth(D.banner).setAlpha(0);
    this.deadText = this.text(0, 0, 'YOU DIED', 40, '#e8584a', { stroke: true, bold: true, font: Fonts.title }).setOrigin(0.5).setDepth(D.dead).setVisible(false);

    this.layout();
    if (this.registry.get('fadeIn')) this.cameras.main.fadeIn(500, 0, 0, 0);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.logLines = this.sim.logHistory.slice();
    this.refreshLog();
    this.bindSim();
    this.bindPointer();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      this.offs.forEach(f => f());
    });
  }

  private text(x: number, y: number, str: string, size: number, color: string, opts: { stroke?: boolean; bold?: boolean; font?: string } = {}): Text {
    return uiText(this, x, y, str, size, color, opts).setDepth(D.text);
  }

  private unitFrame(withMana: boolean): UnitFrame {
    const f: UnitFrame = {
      x: 0,
      panel: panel(this, UI.panel, 0, 0, 10, PANEL_H).setDepth(D.panel),
      slot: panel(this, UI.slot, 0, 0, 48, 48).setDepth(D.slot),
      portrait: this.add.image(0, 0, Tex.knight).setOrigin(0).setDepth(D.art),
      name: this.text(0, 0, '', 13, Ink.dark, { bold: true }),
      sub: this.text(0, 0, '', 10, Ink.soft),
      hpBg: panel(this, UI.bar, 0, 0, 10, 11).setDepth(D.slot),
      hpIcon: this.add.image(0, 0, UI.heart).setOrigin(0).setDepth(D.art),
      hpText: this.text(0, 0, '', 10, '#ffffff', { bold: true, stroke: true }).setOrigin(0.5),
    };
    if (withMana) {
      f.mpBg = panel(this, UI.bar, 0, 0, 10, 9).setDepth(D.slot);
      f.mpIcon = this.add.image(0, 0, UI.mana).setOrigin(0).setDepth(D.art);
      f.mpText = this.text(0, 0, '', 9, '#ffffff', { bold: true, stroke: true }).setOrigin(0.5);
    }
    return f;
  }

  // ---------- layout ----------
  private layout(): void {
    const { w, h } = logicalSize(this.scale);
    this.W = w;
    this.H = h;
    this.cameras.main.setZoom(PIXEL_SCALE).centerOn(w / 2, h / 2);

    // unit frames shrink on narrow windows so they never reach the dial
    this.panelW = Math.max(200, Math.min(262, Math.floor((w - 24 - 8 - 130) / 2)));
    this.placeFrame(this.player, 12);
    this.placeFrame(this.target, 12 + this.panelW + 8);

    // info box pinned to the top-right corner, the day dial centred above it, gear to its left
    const infoW = 118;
    const infoX = w - 12 - infoW;
    this.dial.setPosition(infoX + infoW / 2, 16 + DIAL_R + 6);
    const infoY = this.dial.cy + DIAL_R + 9;
    this.info.setPosition(infoX, infoY).setSize(infoW, 42);
    this.dial.placeLabel(this.dial.cx, infoY + 7);
    const colW = (infoW - 16) / 3;
    this.tally.forEach((t, i) => {
      const x = infoX + 9 + i * colW;
      t.icon.setPosition(x, infoY + 29);
      t.text.setPosition(x + 13, infoY + 29);
    });

    // action bar: (Rev slot +) 12 slots + the bag button, centred as a group, slots shrink if needed
    const rev = (this.revShown = this.sim.revEnabled);
    const n = this.slots.length;
    // menu bar first: it owns the bottom-right corner
    const M = (this.menuSize = w < 760 ? 26 : 30);
    const menuW = this.menu.length * M + (this.menu.length - 1) * GAP;
    const menuX = w - 12 - 10 - menuW;
    // the action bar (skills only, the Rev slot left of it when on) fits in what is left
    const maxRight = menuX - 10 - 14;
    const room = maxRight - 12;
    const gaps = 20 + (rev ? 30 + 20 : 0);
    this.slotSize = Math.max(24, Math.min(36, Math.floor((room - gaps - GAP * (n - 1)) / (n + (rev ? 1 : 0)))));
    const S = this.slotSize;
    const barW = n * S + (n - 1) * GAP;
    const groupW = (rev ? S + 30 : 0) + barW;
    // centred on the screen when it clears the menu bar, else as far right as it can go
    let revX = Math.round((w - groupW) / 2);
    if (revX + groupW + 10 > maxRight) revX = Math.max(22, maxRight - 10 - groupW);
    const x0 = revX + (rev ? S + 30 : 0);
    for (const o of [this.revBack, this.revTag, this.revState, this.revSlot.bg, this.revSlot.icon, this.revSlot.bind, this.revSlot.cd]) o.setVisible(rev);
    if (!rev) this.revSlot.ring.setVisible(false);
    const y = h - S - 14;
    this.barBack.setPosition(x0 - 10, y - 10).setSize(barW + 20, S + 20);
    this.xpBg.setPosition(x0 - 4, y - 19).setSize(barW + 8, 7);
    this.revBack.setPosition(revX - 10, y - 10).setSize(S + 20, S + 20);
    this.revTag.setPosition(revX - 10, y - 28).setSize(S + 20, 16);
    this.revState.setPosition(revX + S / 2, y - 20);
    this.slots.forEach((s, i) => this.placeSlot(s, x0 + i * (S + GAP), y));
    this.placeSlot(this.revSlot, revX, y);

    // menu bar, bottom-aligned with the action bar; windows stay above both
    const my = h - M - 14;
    this.menuBack.setPosition(menuX - 10, my - 10).setSize(menuW + 20, M + 20);
    this.menu.forEach((m, i) => this.placeMenu(m.view, menuX + i * (M + GAP), my));
    const bottom = ((h - (Math.min(y, my) - 10)) * PIXEL_SCALE) / (window.devicePixelRatio || 1) + 10;
    for (const k of ['inventory', 'crafting', 'questLog', 'controls', 'spellbook']) (this.registry.get(k) as { setBottom(px: number): void } | undefined)?.setBottom(bottom);

    // combat log sits above the Rev label so the two never overlap
    this.logBottom = y - 36;
    this.refreshLog();
    this.bannerText.setPosition(w / 2, h * 0.3);
    this.deadText.setPosition(w / 2, h * 0.42);
  }

  private placeFrame(f: UnitFrame, x: number): void {
    const pw = this.panelW;
    f.x = x;
    f.panel.setPosition(x, 12).setSize(pw, PANEL_H);
    f.slot.setPosition(x + 8, 20);
    const cx = x + 64;
    f.name.setPosition(cx, 16);
    f.sub.setPosition(cx, 18);
    const barW = pw - 64 - 24;
    f.hpIcon.setPosition(cx, 36);
    f.hpBg.setPosition(cx + 13, 35).setSize(barW, 11);
    f.hpText.setPosition(cx + 13 + barW / 2, 40.5);
    if (f.mpBg && f.mpIcon && f.mpText) {
      f.mpIcon.setPosition(cx + 1, 48);
      f.mpBg.setPosition(cx + 13, 50).setSize(barW, 9);
      f.mpText.setPosition(cx + 13 + barW / 2, 54.5);
    }
  }

  private placeSlot(s: SlotView, x: number, y: number): void {
    const S = this.slotSize;
    s.x = x;
    s.y = y;
    s.bg.setPosition(x, y).setSize(S, S);
    s.ring.setPosition(x - 1, y - 1).setSize(S + 2, S + 2);
    s.icon.setPosition(x + S / 2, y + S / 2);
    s.bind.setPosition(x + 4, y + 1);
    s.cd.setPosition(x + S / 2, y + S / 2);
  }

  /** World coordinates to HUD (logical screen) coordinates via the game camera. */
  private worldToHud(wx: number, wy: number): { x: number; y: number } {
    const wv = this.scene.get(SceneKeys.Game).cameras.main.worldView;
    return { x: isoX(wx, wy) - wv.x, y: isoY(wx, wy) - wv.y };
  }

  // ---------- sim events ----------
  private bindSim(): void {
    const on = <K extends keyof SimEvents>(k: K, fn: (p: SimEvents[K]) => void) => this.offs.push(this.sim.events.on(k, fn));
    on('log', ({ text, cls }) => {
      this.logLines.push({ text, cls });
      while (this.logLines.length > LOG_LINES) this.logLines.shift();
      this.refreshLog();
    });
    on('banner', ({ text, cls }) => this.showBanner(text, cls === 'bad' ? '#ff7a6a' : cls === 'cool' ? '#7ae8e4' : '#ffd866'));
    on('floater', f => {
      const sp = this.worldToHud(f.x, f.y);
      const style = { size: 14, color: '#ffffff', dur: 900 };
      if (f.cls === 'crit') Object.assign(style, { size: 19, color: '#ffd866' });
      else if (f.cls === 'heal') style.color = '#8ae07a';
      else if (f.cls === 'hurt') style.color = '#ff6a5a';
      else if (f.cls === 'dot') Object.assign(style, { size: 11, color: '#ff8a80' });
      else if (f.cls === 'aa') Object.assign(style, { size: 11, color: '#e4ecf6' });
      else if (f.cls === 'name') Object.assign(style, { size: 10, dur: 700 });
      if (f.color) style.color = f.color;
      const t = this.text(sp.x + (Math.random() * 20 - 10), sp.y - 30, f.text, style.size, style.color, { bold: true, stroke: true })
        .setOrigin(0.5)
        .setDepth(D.floater);
      this.tweens.add({ targets: t, y: t.y - 54, alpha: 0, duration: style.dur, ease: 'Linear', onComplete: () => t.destroy() });
    });
    on('castFlash', ({ key, color }) => {
      this.flashUntil.set(key, this.time.now + 300);
      this.flashCol.set(key, color);
    });
    on('nudge', ({ key, err }) => {
      this.downUntil.set(key, this.time.now + (err ? 220 : 70));
      if (err) this.errUntil.set(key, this.time.now + 220);
    });
  }

  private refreshLog(): void {
    const n = this.logLines.length;
    for (let i = 0; i < LOG_LINES; i++) {
      const t = this.logTexts[i];
      const li = i - (LOG_LINES - n);
      const line = li >= 0 ? this.logLines[li] : null;
      if (!line) {
        t.setText('');
        continue;
      }
      const lastLine = li === n - 1;
      const col = line.cls === 'c' ? '#ffd866' : line.cls === 'h' ? '#ff7a6a' : line.cls === 't' ? '#7ae8e4' : '#ffffff';
      t.setText(line.text).setColor(col).setAlpha(lastLine ? 1 : 0.8);
    }
    // stack upward from the bottom by each line's real height, so wrapped lines never overlap
    let yy = this.logBottom;
    for (let i = LOG_LINES - 1; i >= 0; i--) {
      const t = this.logTexts[i];
      if (!t.text) continue;
      yy -= Math.max(15, Math.ceil(t.height) + 1);
      t.setPosition(14, yy);
    }
  }

  /** Bottom edge of the combat log (above the Rev label and the action bar). */
  private logBottom = 0;

  private showBanner(text: string, color: string): void {
    const t = this.bannerText;
    this.tweens.killTweensOf(t);
    t.setText(text).setColor(color).setAlpha(0).setScale(0.8);
    this.tweens.chain({
      targets: t,
      tweens: [
        { scale: 1.05, alpha: 1, duration: 180 },
        { scale: 1, duration: 450 },
        { alpha: 0, duration: 270 },
      ],
    });
  }

  // ---------- pointer ----------
  private bindPointer(): void {
    // right-click moves too, so keep the browser's context menu out of the way
    this.input.mouse?.disableContextMenu();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }

  private toLogical(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    const v = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return { x: v.x, y: v.y };
  }

  /** The bar slot at a point in page (client) coordinates, or -1. */
  private barIndexAtClient(cx: number, cy: number): number {
    const r = this.game.canvas.getBoundingClientRect();
    const p = { x: ((cx - r.left) * this.W) / r.width, y: ((cy - r.top) * this.H) / r.height };
    const S = this.slotSize;
    return this.slots.findIndex(s => p.x >= s.x && p.x < s.x + S && p.y >= s.y && p.y < s.y + S);
  }

  private slotAt(p: { x: number; y: number }): SlotView | null {
    const S = this.slotSize;
    for (const s of this.revShown ? [...this.slots, this.revSlot] : this.slots) {
      if (p.x >= s.x && p.x < s.x + S && p.y >= s.y && p.y < s.y + S) return s;
    }
    return null;
  }

  /** Index of the menu button under the pointer, or -1. */
  private menuAt(p: { x: number; y: number }): number {
    const M = this.menuSize;
    return this.menu.findIndex(m => p.x >= m.view.x && p.x < m.view.x + M && p.y >= m.view.y && p.y < m.view.y + M);
  }

  /** A menu button: like an action slot, at the menu bar's size. */
  private placeMenu(s: SlotView, x: number, y: number): void {
    const M = this.menuSize;
    s.x = x;
    s.y = y;
    s.bg.setPosition(x, y).setSize(M, M);
    s.ring.setPosition(x - 1, y - 1).setSize(M + 2, M + 2);
    s.icon.setPosition(x + M / 2, y + M / 2 + 1);
    s.bind.setPosition(x + 3, y);
    s.cd.setPosition(x + M / 2, y + M / 2);
  }

  private toggleWindow(win: string): void {
    (this.registry.get(win) as { toggle(): void } | undefined)?.toggle();
  }

  private inside(p: { x: number; y: number }, o: NineSlice): boolean {
    return o.visible && p.x >= o.x && p.x < o.x + o.width && p.y >= o.y && p.y < o.y + o.height;
  }

  /** HUD panels that should swallow clicks instead of moving the player. */
  private overHud(p: { x: number; y: number }): boolean {
    return [this.player.panel, this.target.panel, this.castTag, this.info, this.barBack, this.revBack, this.revTag, this.menuBack].some(o => this.inside(p, o));
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    // clicks on DOM overlays (the dev panel) are not game clicks
    if (pointer.downElement !== this.game.canvas) return;
    const p = this.toLogical(pointer);
    if (this.dial.contains(p)) return;
    const mi = this.menuAt(p);
    if (mi >= 0) {
      this.toggleWindow(this.menu[mi].win);
      return;
    }
    const slot = this.slotAt(p);
    if (slot) {
      const book = this.registry.get('spellbook') as { isOpen: boolean } | undefined;
      if (slot.index >= 0 && slot.key && book?.isOpen) {
        // spellbook open: move the spell along the bar, or drop it off the bar to remove it
        const k = slot.key as SpellKey;
        const ev = pointer.event as PointerEvent;
        dragSpell(
          this.textures.get(Tex.icon(k)).getSourceImage() as HTMLCanvasElement,
          ev,
          (x, y) => (this.dropSlot = this.barIndexAtClient(x, y)),
          (x, y) => {
            this.dropSlot = -1;
            const to = this.barIndexAtClient(x, y);
            if (to < 0) this.sim.setBarSlot(slot.index, null);
            else if (to !== slot.index) this.sim.setBarSlot(to, k);
          }
        );
        return;
      }
      if (!slot.key) return;
      this.pressed = slot.key;
      if (slot.key === 'rev') this.sim.revStep();
      else this.sim.castKey(slot.key as Key);
      return;
    }
    if (this.overHud(p)) return;
    const hit = this.hitEnemy(p);
    if (hit) {
      this.sim.setTarget(hit);
      return;
    }
    const obj = this.hitObject(p);
    if (obj) {
      this.sim.useObject(obj.id);
      return;
    }
    const npc = this.hitNpc(p);
    if (npc) {
      this.sim.talkTo(npc.id);
      return;
    }
    for (const w of this.sim.wanderers) {
      if (w.alpha < 0.1) continue;
      const sp = this.worldToHud(w.x, w.y);
      if (Math.abs(p.x - sp.x) <= 12 && sp.y + 6 - p.y >= -2 && sp.y + 6 - p.y <= 40) {
        this.sim.touchWanderer(w.id);
        return;
      }
    }
    const tree = this.hitTree(p);
    if (tree) {
      this.sim.startChop(tree);
      return;
    }
    const rock = this.hitRock(p);
    if (rock) {
      this.sim.startMine(rock);
      return;
    }
    // ground: walk there; keep holding to steer toward the cursor
    this.moveToPointer(pointer, true);
    this.steering = { pointer, lastT: performance.now() };
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    const p = this.toLogical(pointer);
    const slot = this.slotAt(p);
    this.hover = slot ? slot.key : null;
    this.hoverSlot = slot;
    this.menuHover = this.menuAt(p);
    this.xpHover = this.inside(p, this.xpBg);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    this.pressed = null;
    if (this.steering && pointer === this.steering.pointer) this.steering = null;
  }

  /**
   * While the button is held, re-aim at the cursor a few times a second. Runs every
   * frame rather than on mouse movement, so holding still keeps walking toward the
   * cursor as the camera scrolls.
   */
  private updateSteering(): void {
    const st = this.steering;
    if (!st) return;
    if (!st.pointer.isDown) {
      this.steering = null;
      return;
    }
    const now = performance.now();
    if (now - st.lastT < 120) return;
    st.lastT = now;
    this.moveToPointer(st.pointer, false);
  }

  /** Screen pointer -> game camera -> world ground point -> click-to-move. */
  private moveToPointer(pointer: Phaser.Input.Pointer, marker: boolean): void {
    const cam = this.scene.get(SceneKeys.Game).cameras.main;
    const wp = cam.getWorldPoint(pointer.x, pointer.y);
    const w = fromIso(wp.x, wp.y);
    this.sim.moveTo(w.x, w.y, marker);
  }

  /** A standing tree under the pointer: its trunk and the lower part of its crown. */
  /** Someone under the pointer (their sprite, about 22×36). */
  /** A page, notice board or chest under the pointer. */
  private hitObject(p: { x: number; y: number }): ObjectState | null {
    for (const o of this.sim.objects) {
      const sp = this.worldToHud(o.x, o.y);
      const dx = Math.abs(p.x - sp.x);
      const dy = sp.y + 6 - p.y;
      const tall = o.kind === 'board' ? 36 : o.kind === 'chest' || o.kind === 'thorn' ? 18 : 10;
      if (dx <= (o.kind === 'page' || o.kind === 'letter' ? 10 : 13) && dy >= -6 && dy <= tall) return o;
    }
    return null;
  }

  private hitNpc(p: { x: number; y: number }): NpcState | null {
    for (const n of this.sim.npcs) {
      const sp = this.worldToHud(n.x, n.y);
      const dx = Math.abs(p.x - sp.x);
      const dy = sp.y + 6 - p.y;
      if (dx <= 12 && dy >= -2 && dy <= 40) return n;
    }
    return null;
  }

  /** A standing rock under the pointer (the boulder sprite, not its whole tile). */
  private hitRock(p: { x: number; y: number }): RockState | null {
    let hit: RockState | null = null;
    let bd = Infinity;
    for (const k of this.sim.rocks) {
      if (k.brokenT > 0) continue;
      const sp = this.worldToHud(k.x, k.y);
      const dx = Math.abs(p.x - sp.x);
      const dy = sp.y - p.y;
      if (dx > 15 || dy < -6 || dy > 20) continue;
      const d = dx + Math.abs(dy - 6) * 0.5;
      if (d < bd) {
        bd = d;
        hit = k;
      }
    }
    return hit;
  }

  private hitTree(p: { x: number; y: number }): TreeState | null {
    let hit: TreeState | null = null;
    let bd = Infinity;
    for (const t of this.sim.trees) {
      if (t.stumpT > 0) continue;
      const sp = this.worldToHud(t.x, t.y);
      const dx = Math.abs(p.x - sp.x);
      const dy = sp.y + 6 - p.y;
      if (dx > 13 || dy < -4 || dy > 46) continue;
      const d = dx + Math.abs(dy - 18) * 0.3;
      if (d < bd) {
        bd = d;
        hit = t;
      }
    }
    return hit;
  }

  private hitEnemy(p: { x: number; y: number }): Enemy | null {
    let hit: Enemy | null = null;
    let bd = 30;
    for (const e of this.sim.enemies) {
      if (!e.alive) continue;
      const sp = this.worldToHud(e.x, e.y);
      const d = Math.hypot(sp.x - p.x, sp.y - 6 * e.def.scale - p.y);
      if (d < bd + 6 * e.def.scale) {
        bd = d;
        hit = e;
      }
    }
    return hit;
  }

  // ---------- frame ----------
  override update(time: number): void {
    this.updateSteering();
    this.gBars.clear();
    this.gSweep.clear();
    this.gTop.clear();
    this.drawPlayerFrame();
    this.drawTargetFrame();
    this.drawChips();
    this.drawBar(time);
    this.drawBagBtn();
    this.drawTooltip();
    this.drawOverlays();
    const s = this.sim;
    this.dial.update(s.day, time);
    this.tally[0].text.setText(String(s.gold));
    this.tally[1].text.setText(String(s.kills));
    this.tally[2].text.setText(String(s.perf));
  }

  /** Glossy bar fill inside a bar inset: highlight row, body, shade row. */
  private fillBar(bg: NineSlice, frac: number, ramp: string[]): void {
    const w = Math.round((bg.width - 2) * Math.max(0, Math.min(1, frac)));
    if (w <= 0) return;
    const g = this.gBars;
    const x = bg.x + 1;
    const y = bg.y + 1;
    const h = bg.height - 2;
    g.fillStyle(hex(ramp[1]), 1).fillRect(x, y, w, h);
    g.fillStyle(hex(ramp[0]), 1).fillRect(x, y, w, 1);
    if (h > 4) g.fillStyle(hex(ramp[2]), 1).fillRect(x, y + h - 1, w, 1);
  }

  /** Fit a texture into the 48px portrait slot at a whole-number scale (crisp pixels). */
  private fitPortrait(img: Image, slot: NineSlice, crop?: { x: number; y: number; w: number; h: number }): void {
    const fr = img.frame;
    const c = crop ?? { x: 0, y: 0, w: fr.width, h: fr.height };
    const k = Math.max(1, Math.floor(Math.min(40 / c.w, 40 / c.h)));
    if (crop) img.setCrop(c.x, c.y, c.w, c.h);
    else img.setCrop();
    img.setScale(k).setPosition(Math.round(slot.x + 24 - (c.x + c.w / 2) * k), Math.round(slot.y + 24 - (c.y + c.h / 2) * k));
  }

  private drawPlayerFrame(): void {
    const s = this.sim;
    const f = this.player;
    f.sub.setText(`Warrior · Lv ${s.level}`);
    f.sub.setX(f.name.x + f.name.width + 6);
    // head-and-shoulders crop of the knight
    // re-set every frame so a mid-game art style change picks up the new hero size
    f.portrait.setTexture(Tex.knight);
    this.fitPortrait(f.portrait, f.slot, portraitCrop());
    this.fillBar(f.hpBg, s.hp / s.hpMax, FILL.hp);
    f.hpText.setText(`${Math.round(s.hp)} / ${s.hpMax}`);
    if (f.mpBg && f.mpText) {
      this.fillBar(f.mpBg, s.mp / s.mpMax, FILL.mp);
      f.mpText.setText(String(Math.round(s.mp)));
    }
  }

  private drawTargetFrame(): void {
    const tg = this.sim.target;
    const f = this.target;
    const has = !!tg && tg.alive;
    f.portrait.setVisible(has);
    f.hpBg.setVisible(has);
    f.hpIcon.setVisible(has);
    f.hpText.setVisible(has);
    f.sub.setVisible(false);
    const casting = has && tg!.castT > 0;
    this.castTag.setVisible(casting);
    this.castBg.setVisible(casting);
    this.castText.setVisible(casting);
    if (!has || !tg) {
      f.name.setText('No target').setColor(Ink.soft).setY(32);
      return;
    }
    f.name.setText(tg.n).setColor(Ink.dark).setY(16);
    f.portrait.setTexture(tg.def.tex);
    this.fitPortrait(f.portrait, f.slot);
    this.fillBar(f.hpBg, tg.hp / tg.hpMax, FILL.hp);
    f.hpText.setText(`${Math.round(tg.hp)} / ${tg.hpMax}`);
    if (casting) {
      const x = f.x + 8;
      const y = 12 + PANEL_H + 4;
      const w = this.panelW - 16;
      this.castTag.setPosition(x, y).setSize(w, 18);
      this.castText.setPosition(x + 6, y + 9).setText('Fireball');
      const bx = x + 8 + this.castText.width + 6;
      this.castBg.setPosition(bx, y + 5).setSize(x + w - 6 - bx, 8);
      this.fillBar(this.castBg, 1 - tg.castT / tg.castTotal, FILL.cast);
    }
  }

  private drawChips(): void {
    const s = this.sim;
    const chips: [string, string][] = [];
    if (s.buffT > 0) chips.push(['War Cry ' + s.buffT.toFixed(1) + 's', '#a8701e']);
    if (s.invT > 0) chips.push(['Dodge', '#1f7a78']);
    if (s.bleedT > 0) chips.push(['Bleed ' + s.bleedT.toFixed(1) + 's', Ink.red]);
    const tg = s.target;
    if (tg && tg.alive && tg.stunT > 0) chips.push(['Stunned', Ink.mid]);
    if (tg && tg.alive && s.dist(s, tg) >= 48) chips.push(['Out of range', Ink.mid]);
    if (s.mounted) chips.push(['Mounted ×1.8', '#6a4ab8']);
    let x = 12;
    const y = 12 + PANEL_H + 4;
    this.chips.forEach((c, i) => {
      const chip = chips[i];
      c.tag.setVisible(!!chip);
      c.text.setVisible(!!chip);
      if (!chip) return;
      c.text.setText(chip[0]).setColor(chip[1]).setPosition(x + 5, y + 2);
      const w = Math.ceil(c.text.width) + 10;
      c.tag.setPosition(x, y).setSize(w, 17);
      x += w + 4;
    });
  }

  private drawSlot(sl: SlotView, now: number): void {
    const s = this.sim;
    const S = this.slotSize;
    const k = sl.key;
    if (!k) {
      // an empty slot: lit while a dragged spell is over it
      const lit = this.dropSlot === sl.index || this.hoverSlot === sl;
      sl.bg.setTexture(lit ? UI.slotHot : UI.slot).setY(sl.y);
      sl.bind.setY(sl.y + 1);
      sl.cd.setText('');
      sl.ring.setVisible(this.dropSlot === sl.index).setY(sl.y - 1).setTint(hex(Colors.gold)).setAlpha(1);
      return;
    }
    const isRev = k === 'rev';
    const down = now < (this.downUntil.get(k) ?? 0) || this.pressed === k;
    const err = now < (this.errUntil.get(k) ?? 0);
    const off = down ? 1 : 0;
    const nextRev = !isRev && s.rev && s.revPick() === k;
    const unavailable = !isRev && s.unavailable(k);
    const unusable = !isRev && !unavailable && s.canDo(k) !== null;

    sl.bg.setTexture(this.hover === k ? UI.slotHot : UI.slot).setY(sl.y + off);
    sl.icon.setY(sl.y + S / 2 + off).setAlpha(unavailable ? 0.4 : unusable ? 0.7 : 1);
    if (isSkill(k) && s.mp < (s.info(k).c ?? 0)) sl.icon.setTint(0x7f9fe0);
    else sl.icon.clearTint();
    sl.bind.setY(sl.y + 1 + off);

    // real cooldown only; the global cooldown is not shown
    let rem = 0;
    let frac = 0;
    if (!isRev) {
      rem = s.cdRemaining(k);
      const tot = s.info(k).cd || 1;
      frac = rem > 0 ? rem / tot : 0;
    }
    if (frac > 0) drawSquareSweep(this.gSweep, sl.x + 2, sl.y + 2 + off, S - 4, frac, 0.5);
    sl.cd.setY(sl.y + S / 2 + off).setText(rem > 0 ? String(Math.ceil(rem)) : '');

    // highlight ring: red on error, gold while Rev is on, orange on the next Rev step,
    // the cast colour for a moment after casting
    let ring: number | null = null;
    let alpha = 1;
    const fu = this.flashUntil.get(k) ?? 0;
    if (err) ring = hex('#d8402c');
    else if (now < fu) {
      ring = hex(this.flashCol.get(k) ?? '#ffffff');
      alpha = (fu - now) / 300;
    } else if (isRev && s.rev) ring = hex('#f2c14e');
    else if (nextRev) ring = hex('#ff8c42');
    if (this.dropSlot >= 0 && this.dropSlot === sl.index) {
      ring = hex(Colors.gold);
      alpha = 1;
    }
    sl.ring.setVisible(ring !== null).setY(sl.y - 1 + off);
    if (ring !== null) sl.ring.setTint(ring).setAlpha(alpha);
  }

  /** Show what the sim has in each bar slot. */
  private syncBar(): void {
    this.slots.forEach((sl, i) => {
      const k = this.sim.bar[i];
      if (sl.key === k) return;
      sl.key = k;
      if (k) sl.icon.setTexture(Tex.icon(k)).setVisible(true);
      else sl.icon.setVisible(false);
    });
  }

  private drawBar(now: number): void {
    const s = this.sim;
    // turning Rev on or off in the dev panel re-lays the bar
    if (this.revShown !== s.revEnabled) this.layout();
    this.syncBar();
    for (const sl of this.slots) this.drawSlot(sl, now);
    if (!this.revShown) return;
    this.drawSlot(this.revSlot, now);
    this.revState.setText(s.rev ? (s.revAuto ? 'REV AUTO' : 'REV ON') : 'REV OFF').setColor(s.rev ? '#a8701e' : Ink.mid);
  }

  /** Menu buttons light up while their window is open (and on hover); Talents glows while points wait. */
  private drawBagBtn(): void {
    const pulse = 0.55 + 0.45 * Math.sin(this.time.now / 220);
    this.menu.forEach((m, i) => {
      const open = (this.registry.get(m.win) as { isOpen: boolean } | undefined)?.isOpen ?? false;
      const hover = this.menuHover === i;
      const waiting = m.win === 'talents' && !open && this.sim.talentPoints > 0;
      m.view.bg.setTexture(hover ? UI.slotHot : UI.slot);
      m.view.ring
        .setVisible(open || hover || waiting)
        .setTint(hex(open || waiting ? Colors.gold : '#fce6b4'))
        .setAlpha(waiting && !hover ? pulse : 1);
    });
    // experience towards the next level
    const s = this.sim;
    this.fillBar(this.xpBg, s.xp / xpToNext(s.level), FILL.xp);
  }

  private drawTooltip(): void {
    const k = this.hover;
    if (k === null && this.xpHover) {
      const s = this.sim;
      this.tipPanel.setVisible(true);
      this.tipName.setVisible(true).setText(`Level ${s.level}`);
      this.tipDesc.setVisible(true).setText(`${s.xp} / ${xpToNext(s.level)} experience to level ${s.level + 1}.`).setColor(Ink.mid);
      const w = Math.ceil(Math.max(this.tipName.width, this.tipDesc.width)) + 22;
      const h = Math.ceil(this.tipName.height + this.tipDesc.height) + 18;
      const x = Math.round(Math.max(8, Math.min(this.W - w - 8, this.toLogical(this.input.activePointer).x - w / 2)));
      const y = Math.round(this.xpBg.y - h - 6);
      this.tipPanel.setPosition(x, y).setSize(w, h);
      this.tipName.setPosition(x + 11, y + 8);
      this.tipDesc.setPosition(x + 11, y + 9 + this.tipName.height);
      return;
    }
    if (k === null && this.menuHover >= 0) {
      const m = this.menu[this.menuHover];
      const b = m.view;
      this.tipPanel.setVisible(true);
      this.tipName.setVisible(true).setText(`${m.name}  [${m.bind}]`);
      this.tipDesc.setVisible(true).setText(m.desc).setColor(Ink.mid);
      const w = Math.ceil(Math.max(this.tipName.width, this.tipDesc.width)) + 22;
      const h = Math.ceil(this.tipName.height + this.tipDesc.height) + 18;
      const x = Math.round(Math.max(8, Math.min(this.W - w - 8, b.x + this.menuSize / 2 - w / 2)));
      const y = Math.round(b.y - 10 - h - 6);
      this.tipPanel.setPosition(x, y).setSize(w, h);
      this.tipName.setPosition(x + 11, y + 8);
      this.tipDesc.setPosition(x + 11, y + 9 + this.tipName.height);
      return;
    }
    const empty = k === null && this.hoverSlot && this.hoverSlot.index >= 0 ? this.hoverSlot : null;
    const show = k !== null || !!empty;
    this.tipPanel.setVisible(show);
    this.tipName.setVisible(show);
    this.tipDesc.setVisible(show);
    if (empty) {
      this.tipName.setText(`Empty slot  [${BAR_KEYS[empty.index].bind}]`);
      this.tipDesc.setText(`Drag a spell here from your spellbook (${PC_KEYS.spellbook.bind}).`).setColor(Ink.mid);
      this.placeTip(empty);
      return;
    }
    if (!k) return;
    const s = this.sim;
    if (k === 'rev') {
      this.tipName.setText('Rev · next step  [' + PC_KEYS.revStep.bind + ']');
      this.tipDesc.setText(`Each press casts the next skill of your sequence.\n${PC_KEYS.revToggle.bind} toggles Rev, ${PC_KEYS.revAuto.bind} toggles auto.`).setColor(Ink.mid);
    } else {
      const inf = s.info(k);
      const why = s.canDo(k);
      const at = this.slots.find(x => x.key === k);
      const bind = at ? BAR_KEYS[at.index].bind : '';
      this.tipName.setText(inf.n + '  [' + bind + ']');
      this.tipDesc.setText(why ?? inf.desc).setColor(why ? Ink.red : Ink.mid);
    }
    const sl = k === 'rev' ? this.revSlot : this.slots.find(x => x.key === k);
    if (sl) this.placeTip(sl);
  }

  private placeTip(sl: SlotView): void {
    const w = Math.ceil(Math.max(this.tipName.width, this.tipDesc.width)) + 22;
    const h = Math.ceil(this.tipName.height + this.tipDesc.height) + 18;
    const x = Math.round(Math.max(8, Math.min(this.W - w - 8, sl.x + this.slotSize / 2 - w / 2)));
    const y = Math.round(sl.y - 10 - h - 6);
    this.tipPanel.setPosition(x, y).setSize(w, h);
    this.tipName.setPosition(x + 11, y + 8);
    this.tipDesc.setPosition(x + 11, y + 9 + this.tipName.height);
  }

  private drawOverlays(): void {
    const s = this.sim;
    const g = this.gTop;
    if (s.flash > 0) g.fillStyle(hex(Colors.hp), 0.25).fillRect(0, 0, this.W, this.H);
    const dead = s.dead > 0;
    if (dead) g.fillStyle(0x500000, 0.55).fillRect(0, 0, this.W, this.H);
    this.deadText.setVisible(dead);
  }
}
