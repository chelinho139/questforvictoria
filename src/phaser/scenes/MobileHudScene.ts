import Phaser from 'phaser';
import { playerName } from '../player';
import { SceneKeys } from '../SceneKeys';
import { GCD, WIN } from '../../sim/Sim';
import type { Sim } from '../../sim/Sim';
import type { Enemy, ButtonId, SimEvents, LogClass } from '../../sim/types';
import { isSkill } from '../../data/skills';
import type { WheelKey } from '../../data/skills';
import { isoX, isoY } from '../../sim/map';
import { Colors, Fonts, hex, PIXEL_SCALE, logicalSize } from '../config';
import { Tex } from '../render/textures';
import { CLASSES } from '../../data/classes';
import { t } from '../../i18n';

type Text = Phaser.GameObjects.Text;
type Graphics = Phaser.GameObjects.Graphics;

interface WheelConf {
  cx: number;
  cy: number;
  /** Button radius. */
  r: number;
  a0: number;
  a1: number;
  r0: number;
  r1: number;
  nameY: number;
  hasRev: boolean;
  iconSize: number;
  labelY: number;
}

/** Button cluster anchored to the bottom-right corner of a W x H logical view. */
function wheelLayout(W: number, H: number): Record<ButtonId, WheelConf> {
  return {
    1: { cx: W - 67, cy: H - 211, r: 33, a0: 165, a1: 310, r0: 44, r1: 100, nameY: H - 336, hasRev: false, iconSize: 32, labelY: H - 168 },
    2: { cx: W - 82, cy: H - 100, r: 45, a0: 122, a1: 262, r0: 60, r1: 142, nameY: H - 48, hasRev: true, iconSize: 48, labelY: H - 43 },
  };
}
const RING_R = 52;
const JOY_R = 48;
const DEG = Math.PI / 180;
const WHITE = 0xffffff;
const HOLD_MS = 140;
const LOG_LINES = 5;

interface WheelItemView {
  k: WheelKey;
  x: number;
  y: number;
  icon: Phaser.GameObjects.Image;
  label: Text;
  cd: Text;
}

/**
 * The one-thumb touch HUD: plates, chips, log, joystick, the two action buttons with
 * their hold-to-open wheels, floaters, banners. Owns all pointer input (buttons, wheel
 * aiming, map taps, joystick). Kept for the mobile build.
 */
export class MobileHudScene extends Phaser.Scene {
  private sim!: Sim;
  private gWheel!: Graphics;
  private gBase!: Graphics;
  private gTop!: Graphics;

  private pHp!: Text;
  private pMp!: Text;
  private eName!: Text;
  private eHp!: Text;
  private eCast!: Text;
  private stats!: Text;
  private mountLabel!: Text;
  private mountIcon!: Phaser.GameObjects.Image;
  private btnIcon!: Record<ButtonId, Phaser.GameObjects.Image>;
  private btnLabel!: Record<ButtonId, Text>;
  private btnCd!: Record<ButtonId, Text>;
  private revBadge!: Text;
  private wName!: Text;
  private wSub!: Text;
  private bannerText!: Text;
  private deadText!: Text;
  private chipTexts: Text[] = [];
  private logTexts: Text[] = [];
  private logLines: { text: string; cls: LogClass }[] = [];

  // button feedback timers (scene time in ms)
  private downUntil: Record<ButtonId, number> = { 1: 0, 2: 0 };
  private errUntil: Record<ButtonId, number> = { 1: 0, 2: 0 };
  private flashUntil: Record<ButtonId, number> = { 1: 0, 2: 0 };
  private flashCol: Record<ButtonId, string> = { 1: '#fff', 2: '#fff' };

  // pointer state
  private press: { b: ButtonId; id: number } | null = null;
  private pressTimer: Phaser.Time.TimerEvent | null = null;
  private openBtn: 0 | ButtonId = 0;
  private hot: WheelKey | null = null;
  private ptr: { x: number; y: number } | null = null;
  private wheelItems: WheelItemView[] = [];
  private joy: { id: number; x: number; y: number } | null = null;
  private knob = { dx: 0, dy: 0 };
  private joyRest = { x: 82, y: 614 };
  private joyLabel!: Text;
  private offs: Array<() => void> = [];
  private W = 360;
  private H = 720;
  private wheels: Record<ButtonId, WheelConf> = wheelLayout(360, 720);
  private mount = { cx: 324, cy: 36, r: 22 };

  constructor() {
    super(SceneKeys.MobileHud);
  }

  /** True while a touch is steering the player; the game scene then leaves inputMove alone. */
  get joystickActive(): boolean {
    return this.joy !== null;
  }

  create(): void {
    this.sim = this.registry.get('sim') as Sim;
    this.gWheel = this.add.graphics().setDepth(10);
    this.gBase = this.add.graphics().setDepth(20);
    this.gTop = this.add.graphics().setDepth(100);

    // plates
    this.txt(14, 14, `${playerName()} · ${CLASSES[this.sim.cls].name} · Lv ${this.sim.level}`, 'display', 9, Colors.ink);
    this.pHp = this.txt(14 + 132 - 3, 25, '', 'body', 13, '#fff').setOrigin(1, 0);
    this.pMp = this.txt(14 + 132 - 3, 39, '', 'body', 13, '#fff').setOrigin(1, 0);
    this.eName = this.txt(180, 14, 'Tap an enemy', 'display', 9, Colors.ink).setOrigin(0.5, 0);
    this.eHp = this.txt(105 + 150 - 3, 25, '', 'body', 13, '#fff').setOrigin(1, 0);
    this.eCast = this.txt(180, 54, 'Fireball', 'body', 12, Colors.purple).setOrigin(0.5, 0).setVisible(false);
    this.stats = this.txt(14, 704, '', 'display', 7, Colors.muted);
    for (let i = 0; i < 7; i++) {
      this.chipTexts.push(
        this.txt(14, 66, '', 'body', 14, Colors.muted).setPadding(6, 1, 6, 1).setBackgroundColor('rgba(0,0,0,.55)').setVisible(false)
      );
    }
    for (let i = 0; i < LOG_LINES; i++) {
      this.logTexts.push(this.txt(14, 464 + i * 16, '', 'body', 15, Colors.muted).setWordWrapWidth(186));
    }

    // mount button
    this.mountIcon = this.add.image(0, 0, Tex.icon('mount')).setDisplaySize(24, 24).setDepth(21);
    this.mountLabel = this.txt(0, 0, 'Mount', 'display', 7, Colors.ink).setOrigin(0.5, 0);

    // joystick
    this.joyLabel = this.txt(0, 0, 'MOVE', 'display', 8, Colors.dim).setOrigin(0.5);

    // action buttons
    const mk = (b: ButtonId) => {
      const c = this.wheels[b];
      return {
        icon: this.add.image(0, 0, Tex.icon('slash')).setDisplaySize(c.iconSize, c.iconSize).setDepth(21),
        label: this.txt(0, 0, '', 'display', 8, Colors.ink).setOrigin(0.5, 0),
        cd: this.txt(0, 0, '', 'display', 16, '#fff').setOrigin(0.5).setDepth(22),
      };
    };
    const b1 = mk(1);
    const b2 = mk(2);
    this.btnIcon = { 1: b1.icon, 2: b2.icon };
    this.btnLabel = { 1: b1.label, 2: b2.label };
    this.btnCd = { 1: b1.cd, 2: b2.cd };
    this.revBadge = this.txt(0, 0, 'REV', 'display', 8, '#1a1205')
      .setOrigin(0.5)
      .setPadding(6, 2, 6, 2)
      .setBackgroundColor(Colors.gold)
      .setShadow(0, 0, '#000', 0, false, false)
      .setDepth(23)
      .setVisible(false);

    // wheel labels, banner, death
    this.wName = this.txt(0, 0, '', 'display', 11, Colors.ink).setOrigin(0.5, 0).setDepth(61).setVisible(false);
    this.wSub = this.txt(0, 0, '', 'display', 8, Colors.muted).setOrigin(0.5, 0).setDepth(61).setVisible(false);
    this.bannerText = this.txt(0, 0, '', 'display', 22, Colors.gold).setOrigin(0.5).setDepth(90).setAlpha(0);
    this.deadText = this.txt(0, 0, 'YOU DIED', 'display', 20, Colors.ink).setOrigin(0.5).setDepth(110).setVisible(false);

    this.layout();
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

  /** Anchor every element to the current logical view size. Runs on create and resize. */
  private layout(): void {
    const { w, h } = logicalSize(this.scale);
    this.W = w;
    this.H = h;
    this.cameras.main.setZoom(PIXEL_SCALE).centerOn(w / 2, h / 2);
    this.wheels = wheelLayout(w, h);
    this.mount = { cx: w - 36, cy: 36, r: 22 };
    this.joyRest = { x: 82, y: h - 106 };
    this.mountIcon.setPosition(this.mount.cx, this.mount.cy);
    this.mountLabel.setPosition(this.mount.cx, this.mount.cy + this.mount.r + 3);
    this.eName.setX(w / 2);
    this.eHp.setX(w / 2 + 75 - 3);
    this.eCast.setX(w / 2);
    for (const b of [1, 2] as ButtonId[]) {
      const c = this.wheels[b];
      this.btnIcon[b].setPosition(c.cx, c.cy);
      this.btnLabel[b].setPosition(c.cx, c.labelY);
      this.btnCd[b].setPosition(c.cx, c.cy);
    }
    this.revBadge.setPosition(this.wheels[2].cx, this.wheels[2].cy - this.wheels[2].r - 6);
    this.wName.setX(w / 2);
    this.wSub.setX(w / 2);
    this.bannerText.setPosition(w / 2, h * 0.32);
    this.deadText.setPosition(w / 2, h / 2);
    this.stats.setPosition(w / 2, h - 16).setOrigin(0.5, 0);
    for (let i = 0; i < LOG_LINES; i++) this.logTexts[i].setPosition(14, h - 20 - (LOG_LINES - i) * 16);
    if (this.openBtn) this.buildWheelItems(this.openBtn);
  }

  // ---------- helpers ----------
  private txt(x: number, y: number, str: string, font: 'display' | 'body', size: number, color: string): Text {
    return this.add
      .text(x, y, str, { fontFamily: Fonts[font], fontSize: size + 'px', color })
      .setResolution(PIXEL_SCALE)
      .setShadow(0, 1, '#000', 0, false, true)
      .setDepth(21);
  }

  private toLogical(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    const v = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return { x: v.x, y: v.y };
  }

  /** World coordinates to HUD (logical screen) coordinates via the game camera. */
  private worldToHud(wx: number, wy: number): { x: number; y: number } {
    const wv = this.scene.get(SceneKeys.Game).cameras.main.worldView;
    return { x: isoX(wx, wy) - wv.x, y: isoY(wx, wy) - wv.y };
  }

  private inCircle(p: { x: number; y: number }, c: { cx: number; cy: number; r: number }): boolean {
    return Math.hypot(p.x - c.cx, p.y - c.cy) <= c.r;
  }

  // ---------- sim events ----------
  private bindSim(): void {
    const on = <K extends keyof SimEvents>(k: K, fn: (p: SimEvents[K]) => void) => this.offs.push(this.sim.events.on(k, fn));
    on('log', ({ text, cls }) => {
      this.logLines.push({ text, cls });
      while (this.logLines.length > LOG_LINES) this.logLines.shift();
      this.refreshLog();
    });
    on('banner', ({ text, cls }) => this.showBanner(text, cls === 'bad' ? Colors.hp : cls === 'cool' ? Colors.teal : Colors.gold));
    on('floater', f => {
      const sp = this.worldToHud(f.x, f.y);
      const style = { size: 15, color: '#fff', dur: 900 };
      if (f.cls === 'crit') Object.assign(style, { size: 21, color: Colors.gold });
      else if (f.cls === 'heal') style.color = Colors.ok;
      else if (f.cls === 'hurt') style.color = Colors.hp;
      else if (f.cls === 'dot') Object.assign(style, { size: 12, color: '#ff7a72' });
      else if (f.cls === 'aa') Object.assign(style, { size: 12, color: '#d3dcea' });
      else if (f.cls === 'name') Object.assign(style, { size: 11, dur: 700 });
      if (f.color) style.color = f.color;
      const t = this.txt(sp.x + (Math.random() * 20 - 10), sp.y - 30, f.text, 'display', style.size, style.color)
        .setOrigin(0.5)
        .setShadow(0, 2, '#000', 0, false, true)
        .setDepth(80);
      this.tweens.add({ targets: t, y: t.y - 54, alpha: 0, duration: style.dur, ease: 'Linear', onComplete: () => t.destroy() });
    });
    // something said out loud (a companion calling out): over the speaker's head a moment, drifting up
    on('say', p => {
      const sp = this.worldToHud(p.x, p.y);
      const t = this.txt(sp.x, sp.y - 58, p.text, 'display', 12, '#fce6b4')
        .setOrigin(0.5, 1)
        .setAlign('center')
        .setWordWrapWidth(200)
        .setShadow(0, 2, '#000', 0, false, true)
        .setDepth(80);
      this.tweens.add({ targets: t, y: t.y - 16, duration: 3200, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, delay: 2600, duration: 600, onComplete: () => t.destroy() });
    });
    on('castFlash', ({ btn, color }) => {
      this.flashUntil[btn] = this.time.now + 300;
      this.flashCol[btn] = color;
    });
    on('nudge', ({ btn, err }) => {
      this.downUntil[btn] = this.time.now + (err ? 220 : 70);
      if (err) this.errUntil[btn] = this.time.now + 220;
    });
    on('loadout', () => {
      if (this.openBtn) this.buildWheelItems(this.openBtn);
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
      const col = line.cls === 'c' ? Colors.gold : line.cls === 'h' ? Colors.hp : line.cls === 't' ? Colors.teal : lastLine ? Colors.ink : Colors.muted;
      t.setText(line.text).setColor(col).setAlpha(lastLine ? 1 : 0.75);
    }
  }

  private showBanner(text: string, color: string): void {
    const t = this.bannerText;
    this.tweens.killTweensOf(t);
    t.setText(text).setColor(color).setShadow(0, 3, '#000', 0, false, true).setAlpha(0).setScale(0.8);
    this.tweens.chain({
      targets: t,
      tweens: [
        { scale: 1.05, alpha: 1, duration: 180 },
        { scale: 1, duration: 450 },
        { alpha: 0, duration: 270 },
      ],
    });
  }

  // ---------- pointer input ----------
  private bindPointer(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    this.input.on(Phaser.Input.Events.GAME_OUT, () => {
      if (this.joy) this.endJoystick();
    });
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    const p = this.toLogical(pointer);
    if (this.inCircle(p, this.mount)) {
      this.sim.mountToggle();
      return;
    }
    for (const b of [1, 2] as ButtonId[]) {
      if (this.inCircle(p, this.wheels[b])) {
        if (this.press) return;
        this.press = { b, id: pointer.id };
        this.pressTimer = this.time.delayedCall(HOLD_MS, () => {
          if (this.press && this.press.b === b) this.openWheel(b);
        });
        return;
      }
    }
    // map: target or joystick
    const hit = this.hitEnemy(p);
    if (hit) {
      this.sim.setTarget(hit);
      return;
    }
    if (this.joy) return;
    this.joy = { id: pointer.id, x: p.x, y: p.y };
    this.knob = { dx: 0, dy: 0 };
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    const p = this.toLogical(pointer);
    if (this.press && pointer.id === this.press.id && this.openBtn === this.press.b) {
      this.ptr = p;
      this.hot = this.wheelPick(this.wheels[this.openBtn], p);
    }
    if (this.joy && pointer.id === this.joy.id) {
      let dx = p.x - this.joy.x;
      let dy = p.y - this.joy.y;
      const l = Math.hypot(dx, dy);
      if (l > 40) {
        dx = (dx / l) * 40;
        dy = (dy / l) * 40;
      }
      this.knob = { dx, dy };
      if (l < 8) {
        this.sim.inputMove.x = 0;
        this.sim.inputMove.y = 0;
      } else {
        this.sim.inputMove.x = dx / 40;
        this.sim.inputMove.y = dy / 40;
      }
    }
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (this.press && pointer.id === this.press.id) {
      this.pressTimer?.remove(false);
      this.pressTimer = null;
      const b = this.press.b;
      if (this.openBtn === b) {
        if (this.hot) this.sim.pickFromWheel(b, this.hot);
        this.closeWheel();
      } else this.sim.tapButton(b);
      this.press = null;
    }
    if (this.joy && pointer.id === this.joy.id) this.endJoystick();
  }

  private endJoystick(): void {
    this.joy = null;
    this.knob = { dx: 0, dy: 0 };
    this.sim.inputMove.x = 0;
    this.sim.inputMove.y = 0;
  }

  private hitEnemy(p: { x: number; y: number }): Enemy | null {
    let hit: Enemy | null = null;
    let bd = 30;
    for (const e of this.sim.enemies) {
      // an ambusher still up in the canopy can't be seen, so can't be clicked
      if (!e.alive || e.hid) continue;
      const sp = this.worldToHud(e.x, e.y);
      const d = Math.hypot(sp.x - p.x, sp.y - 6 * e.def.scale - p.y);
      if (d < bd + 6 * e.def.scale) {
        bd = d;
        hit = e;
      }
    }
    return hit;
  }

  // ---------- wheels ----------
  private wheelKeys(b: ButtonId): WheelKey[] {
    return b === 1 ? this.sim.w1.slice() : this.sim.revEnabled ? [...this.sim.w2, 'rev'] : this.sim.w2.slice();
  }

  private itemPos(c: WheelConf, i: number, n: number): [number, number] {
    const step = (c.a1 - c.a0) / n;
    const am = c.a0 + (i + 0.5) * step;
    const rm = (c.r0 + c.r1) / 2 + 4;
    return [c.cx + rm * Math.cos(am * DEG), c.cy + rm * Math.sin(am * DEG)];
  }

  private wheelPick(c: WheelConf, p: { x: number; y: number }): WheelKey | null {
    const dx = p.x - c.cx;
    const dy = p.y - c.cy;
    const d = Math.hypot(dx, dy);
    if (d < 22) return null;
    let a = Math.atan2(dy, dx) / DEG;
    if (a < 0) a += 360;
    if (a < c.a0 - 8 || a > c.a1 + 8) return null;
    const items = this.wheelKeys(this.openBtn as ButtonId);
    const n = items.length;
    const step = (c.a1 - c.a0) / n;
    const i = Math.max(0, Math.min(n - 1, Math.floor((a - c.a0) / step)));
    return items[i];
  }

  private openWheel(b: ButtonId): void {
    this.openBtn = b;
    this.hot = null;
    this.ptr = null;
    this.sim.timeScale = 0.3;
    this.buildWheelItems(b);
    const c = this.wheels[b];
    this.wName.setY(c.nameY).setVisible(true);
    this.wSub.setY(c.nameY + 14).setVisible(true);
  }

  private closeWheel(): void {
    this.openBtn = 0;
    this.hot = null;
    this.ptr = null;
    this.sim.timeScale = 1;
    this.destroyWheelItems();
    this.wName.setVisible(false);
    this.wSub.setVisible(false);
  }

  private destroyWheelItems(): void {
    for (const it of this.wheelItems) {
      it.icon.destroy();
      it.label.destroy();
      it.cd.destroy();
    }
    this.wheelItems = [];
  }

  private buildWheelItems(b: ButtonId): void {
    this.destroyWheelItems();
    const c = this.wheels[b];
    const keys = this.wheelKeys(b);
    const size = c.r1 < 120 ? 26 : 34;
    keys.forEach((k, i) => {
      const [x, y] = this.itemPos(c, i, keys.length);
      this.wheelItems.push({
        k, x, y,
        icon: this.add.image(x, y, Tex.icon(k)).setDisplaySize(size, size).setDepth(60),
        label: this.txt(x, y + size / 2 + 3, this.sim.info(k).n, 'display', 7, Colors.ink).setOrigin(0.5, 0).setDepth(60),
        cd: this.txt(x, y, '', 'display', 13, '#fff').setOrigin(0.5).setDepth(61),
      });
    });
  }

  private drawWheel(): void {
    if (!this.openBtn) return;
    const g = this.gWheel;
    const c = this.wheels[this.openBtn];
    const s = this.sim;
    g.fillStyle(0x04060a, 0.55).fillRect(0, 0, this.W, this.H);
    const n = this.wheelItems.length;
    const step = (c.a1 - c.a0) / n;
    this.wheelItems.forEach((it, i) => {
      const a0 = (c.a0 + i * step) * DEG;
      const a1 = (c.a0 + i * step + step - 2) * DEG;
      const bad = it.k !== 'rev' && s.unavailable(it.k);
      const isHot = this.hot === it.k || (it.k === 'rev' && s.rev && !this.hot);
      if (bad) g.fillStyle(hex(Colors.hp), isHot ? 0.45 : 0.22);
      else if (isHot) g.fillStyle(hex(Colors.ink), 0.34);
      else g.fillStyle(0x06090f, 0.85);
      g.lineStyle(1.5, hex('#7d879c'), 1);
      g.beginPath();
      g.arc(c.cx, c.cy, c.r1, a0, a1, false);
      g.arc(c.cx, c.cy, c.r0, a1, a0, true);
      g.closePath();
      g.fillPath();
      g.strokePath();
      it.icon.setScale(1).setDisplaySize(c.r1 < 120 ? 26 : 34, c.r1 < 120 ? 26 : 34);
      if (isHot) it.icon.setScale(it.icon.scaleX * 1.3, it.icon.scaleY * 1.3);
      it.icon.setAlpha(bad ? 0.45 : 1);
      const rem = it.k === 'rev' ? 0 : s.cdRemaining(it.k);
      it.cd.setText(rem > 0 ? String(Math.ceil(rem)) : '');
    });
    g.lineStyle(1.5, hex('#f4f1e6'), 0.25).strokeCircle(c.cx, c.cy, c.r0 - 4);
    if (this.ptr) {
      const dx = this.ptr.x - c.cx;
      const dy = this.ptr.y - c.cy;
      const d = Math.hypot(dx, dy) || 1;
      const L = Math.min(d, c.r0 - 6);
      g.lineStyle(3, WHITE, 0.85).lineBetween(c.cx, c.cy, c.cx + (dx / d) * L, c.cy + (dy / d) * L);
    }
    g.fillStyle(WHITE, 1).fillCircle(c.cx, c.cy, 5);

    if (!this.hot) {
      this.wName.setText('');
      this.wSub.setText('hold and aim');
    } else if (this.hot === 'rev') {
      this.wName.setText(s.rev ? 'Turn Rev off' : 'Turn Rev on');
      this.wSub.setText('each tap, the next step');
    } else {
      const inf = s.info(this.hot);
      const why = s.canDo(this.hot);
      this.wName.setText(inf.n);
      // the reason without the spell's name (it's over it), in the player's language
      const name = t(inf.n);
      this.wSub.setText(why ? t(why).replace(name + ': ', '').replace(name + ' ', '') : inf.desc);
    }
  }

  // ---------- frame ----------
  override update(time: number): void {
    const g = this.gBase;
    g.clear();
    this.gWheel.clear();
    this.gTop.clear();
    this.drawPlates(g);
    this.drawChips(g);
    this.drawMount(g);
    this.drawJoystick(g);
    this.drawRing(g);
    this.drawButton(g, 1, time);
    this.drawButton(g, 2, time);
    this.drawWheel();
    this.drawOverlays();
    const s = this.sim;
    this.stats.setText(`KILLS ${s.kills}   PERFECT ${s.perf}   GOLD ${s.gold}`);
  }

  private bar(g: Graphics, x: number, y: number, w: number, h: number, frac: number, col: string): void {
    g.fillStyle(0x000000, 0.6).fillRect(x, y, w, h);
    g.lineStyle(1, hex(Colors.line2), 1).strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
    g.lineStyle(2, hex('#0a0d14'), 1).strokeRect(x, y, w, h);
    g.fillStyle(hex(col), 1).fillRect(x + 2, y + 2, Math.max(0, (w - 4) * Math.min(1, frac)), h - 4);
  }

  private drawPlates(g: Graphics): void {
    const s = this.sim;
    this.bar(g, 14, 28, 132, 10, s.hp / s.hpMax, Colors.hp);
    this.bar(g, 14, 42, 132, 10, s.mp / s.mpMax, Colors.mp);
    this.pHp.setText(String(Math.round(s.hp)));
    this.pMp.setText(String(Math.round(s.mp)));
    const tg = s.target;
    if (tg && tg.alive) {
      this.eName.setText(tg.n).setAlpha(1);
      const dx = this.W / 2 - this.eName.displayWidth / 2 - 9;
      g.lineStyle(2, hex(Colors.gold), 1).strokePoints([{ x: dx, y: 15 }, { x: dx + 4, y: 19 }, { x: dx, y: 23 }, { x: dx - 4, y: 19 }], true);
      this.bar(g, this.W / 2 - 75, 28, 150, 10, tg.hp / tg.hpMax, Colors.hp);
      this.eHp.setText(String(Math.round(tg.hp)));
      const casting = tg.castT > 0;
      this.eCast.setVisible(casting);
      if (casting) this.bar(g, this.W / 2 - 75, 42, 150, 10, 1 - tg.castT / tg.castTotal, Colors.purple);
    } else {
      this.eName.setText('Tap an enemy').setAlpha(0.55);
      this.eHp.setText('');
      this.eCast.setVisible(false);
    }
  }

  private drawChips(g: Graphics): void {
    const s = this.sim;
    const chips: [string, string][] = [];
    if (s.buffT > 0) chips.push(['War Cry ' + s.buffT.toFixed(1) + 's', Colors.gold]);
    if (s.invT > 0) chips.push(['Dodge', Colors.teal]);
    if (s.bleedT > 0) chips.push(['Bleed ' + s.bleedT.toFixed(1) + 's', '#ff7a72']);
    const tg = s.target;
    if (tg && tg.alive && tg.stunT > 0) chips.push(['Stunned', Colors.muted]);
    if (tg && tg.alive && s.dist(s, tg) >= s.aaReach) chips.push(['Out of range', Colors.muted]);
    if (s.rev) chips.push(['Rev', Colors.ember]);
    if (s.mounted) chips.push(['Mounted ×1.8', Colors.purple]);
    let y = 66;
    this.chipTexts.forEach((t, i) => {
      const c = chips[i];
      if (!c) {
        t.setVisible(false);
        return;
      }
      t.setVisible(true).setPosition(14, y).setText(c[0]).setColor(c[1]);
      g.lineStyle(1, hex(c[1] === Colors.muted ? Colors.line2 : c[1]), 1).strokeRect(t.x, t.y, t.displayWidth, t.displayHeight);
      y += t.displayHeight + 4;
    });
  }

  private drawMount(g: Graphics): void {
    const s = this.sim;
    const m = this.mount;
    g.fillStyle(0x121826, 0.4).fillCircle(m.cx, m.cy, m.r);
    if (s.mountT > 0) this.pie(g, m.cx, m.cy, m.r, 1 - s.mountT, hex(Colors.purple), 0.5);
    g.lineStyle(2, s.mounted ? hex(Colors.gold) : hex(Colors.ink), s.mounted ? 1 : 0.55).strokeCircle(m.cx, m.cy, m.r);
    if (s.mounted) g.lineStyle(2, hex(Colors.gold), 0.35).strokeCircle(m.cx, m.cy, m.r + 3);
    this.mountLabel.setText(s.mounted ? 'Dismount' : s.mountT > 0 ? 'Mounting' : 'Mount').setColor(s.mounted ? Colors.gold : Colors.ink);
    this.mountIcon.setVisible(true);
  }

  private pie(g: Graphics, cx: number, cy: number, r: number, frac: number, col: number, alpha: number): void {
    if (frac <= 0) return;
    g.fillStyle(col, alpha);
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac), false);
    g.closePath();
    g.fillPath();
  }

  private drawJoystick(g: Graphics): void {
    const live = this.joy !== null;
    const cx = live ? this.joy!.x : this.joyRest.x;
    const cy = live ? this.joy!.y : this.joyRest.y;
    g.lineStyle(2, live ? hex(Colors.teal) : hex(Colors.line2), 1).strokeCircle(cx, cy, JOY_R);
    g.fillStyle(live ? hex(Colors.teal) : WHITE, live ? 0.25 : 0.14).fillCircle(cx + this.knob.dx, cy + this.knob.dy, 17);
    g.lineStyle(2, live ? hex(Colors.teal) : WHITE, live ? 1 : 0.25).strokeCircle(cx + this.knob.dx, cy + this.knob.dy, 17);
    this.joyLabel.setPosition(cx, cy).setColor(live ? Colors.teal : Colors.dim).setVisible(!live || (this.knob.dx === 0 && this.knob.dy === 0));
  }

  private drawRing(g: Graphics): void {
    const s = this.sim;
    const c = this.wheels[2];
    const ready = s.t >= GCD;
    const ang = ready ? ((s.t - GCD) % GCD) / GCD : s.t / GCD;
    g.lineStyle(5, hex('#1a1410'), 1).strokeCircle(c.cx, c.cy, RING_R);
    const arc = (frac: number, col: number, alpha: number) => {
      if (frac <= 0) return;
      g.lineStyle(5, col, alpha);
      g.beginPath();
      g.arc(c.cx, c.cy, RING_R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac), false);
      g.strokePath();
    };
    arc(ready ? 1 : ang, hex('#c8c2b2'), 1);
    arc(WIN / GCD, hex(Colors.gold), 0.9);
    const a = ang * Math.PI * 2 - Math.PI / 2;
    const dx = c.cx + RING_R * Math.cos(a);
    const dy = c.cy + RING_R * Math.sin(a);
    g.fillStyle(WHITE, ready ? 1 : 0.35).fillCircle(dx, dy, 5);
    g.lineStyle(1.5, 0x000000, ready ? 1 : 0.35).strokeCircle(dx, dy, 5);
  }

  private drawButton(g: Graphics, b: ButtonId, now: number): void {
    const s = this.sim;
    const c = this.wheels[b];
    const off = now < this.downUntil[b] ? 4 : 0;
    const cy = c.cy + off;
    const isRev = b === 2 && s.rev;
    const key = b === 2 ? (s.rev ? s.revPick() : s.sel2) : s.sel1;
    const inf = s.info(key);

    if (!off) g.fillStyle(0x000000, 0.45).fillCircle(c.cx, c.cy + 5, c.r);
    g.fillStyle(0x121826, 0.45).fillCircle(c.cx, cy, c.r);
    // cooldown / GCD shade, clockwise from the top
    const rem = s.cdRemaining(key);
    const tot = inf.cd || 1;
    const gcdF = s.t >= GCD ? 0 : 1 - s.t / GCD;
    const f = Math.max(rem > 0 ? rem / tot : 0, isSkill(key) ? gcdF : 0);
    this.pie(g, c.cx, cy, c.r, f, 0x000000, 0.4);
    const err = now < this.errUntil[b];
    g.lineStyle(2, err ? hex(Colors.hp) : isRev ? hex(Colors.gold) : hex(Colors.ink), err || isRev ? 1 : 0.55).strokeCircle(c.cx, cy, c.r);
    if (now < this.flashUntil[b]) {
      const a = (this.flashUntil[b] - now) / 300;
      g.lineStyle(6, hex(this.flashCol[b]), a * 0.8).strokeCircle(c.cx, cy, c.r + 3);
    }
    this.btnIcon[b].setTexture(Tex.icon(key)).setDisplaySize(c.iconSize, c.iconSize).setPosition(c.cx, cy);
    this.btnCd[b].setPosition(c.cx, cy).setText(rem > 0 ? String(Math.ceil(rem)) : '');
    const label = this.openBtn === 2 && b === 2 ? 'Release to cast' : isRev ? 'Rev · ' + inf.n : inf.n;
    this.btnLabel[b].setText(label).setY(c.labelY + off);
    if (b === 2) this.revBadge.setVisible(isRev).setY(c.cy - c.r - 6 + off);
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
