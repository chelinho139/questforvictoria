import type { Sim } from '../../sim/Sim';
import type { VoiceSound } from '../../sim/types';
import type { Sfx } from '../audio/Sfx';
import { NPCS } from '../../data/npcs';
import type { NpcId } from '../../data/npcs';
import { KINDS } from '../../data/enemies';

/** The voice a scene's speaker talks in, found by the name shown (the narrator has none). */
function voiceOf(who: string): VoiceSound | null {
  const npc = (Object.keys(NPCS) as NpcId[]).find(id => NPCS[id].name === who);
  if (npc) return `${npc}Voice`;
  if (who === KINDS.thane.n) return 'thaneVoice';
  return who === KINDS.bellringer.n ? 'bellringerVoice' : null;
}

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
  /** The line last shown (a new one is spoken). */
  private said = '';
  private readonly onKey = (e: KeyboardEvent) => {
    if (!this.sim.scene) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.sim.sceneNext();
    }
  };

  constructor(
    private readonly sim: Sim,
    private readonly sfx: Sfx
  ) {
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
      // only the lines that matter are said aloud (data/scenes.ts)
      const voice = line.voice ? voiceOf(line.who) : null;
      if (voice && line.text !== this.said) this.sfx.say(voice);
    }
    this.said = line?.text ?? '';
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKey, true);
    this.off();
    this.root.remove();
  }
}
