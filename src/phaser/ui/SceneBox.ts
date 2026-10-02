import type { Sim } from '../../sim/Sim';

/**
 * While a scene plays (data/scenes.ts): black bars top and bottom, and a box with who is
 * speaking and what they say. A click anywhere, Space or Enter moves to the next line.
 */
export class SceneBox {
  private readonly root: HTMLDivElement;
  private readonly box: HTMLDivElement;
  private readonly whoEl: HTMLElement;
  private readonly textEl: HTMLElement;
  private readonly off: () => void;
  private readonly onKey = (e: KeyboardEvent) => {
    if (!this.sim.scene) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.sim.sceneNext();
    }
  };

  constructor(private readonly sim: Sim) {
    const root = (this.root = document.createElement('div'));
    root.className = 'scene';
    root.hidden = true;
    root.innerHTML = `<div class="scene-bar top"></div><div class="scene-bar bottom"></div>
      <div class="scene-box" hidden><b class="scene-who"></b><p class="scene-text"></p><i class="scene-next">Click or press Space ▸</i></div>`;
    document.body.append(root);
    this.box = root.querySelector('.scene-box')!;
    this.whoEl = root.querySelector('.scene-who')!;
    this.textEl = root.querySelector('.scene-text')!;
    root.addEventListener('pointerdown', e => {
      e.stopPropagation();
      this.sim.sceneNext();
    });
    window.addEventListener('keydown', this.onKey, true);
    this.off = this.sim.events.on('scene', () => this.render());
    this.render();
  }

  private render(): void {
    const sc = this.sim.scene;
    this.root.hidden = !sc;
    const line = sc?.line;
    this.box.hidden = !line;
    if (line) {
      this.whoEl.textContent = line.who;
      this.whoEl.hidden = !line.who;
      this.textEl.textContent = line.text;
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKey, true);
    this.off();
    this.root.remove();
  }
}
