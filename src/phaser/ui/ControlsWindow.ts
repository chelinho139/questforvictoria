import { BAR_KEYS, PC_KEYS } from '../../data/actionBar';
import { dockLeft, undockLeft, openedLeft } from './panels';

/** Every key in one place (the book on the menu bar, or /), docked on the left. */
export class ControlsWindow {
  private readonly root: HTMLDivElement;
  private open = false;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) this.toggle(false);
  };

  constructor() {
    const root = (this.root = document.createElement('div'));
    root.className = 'craft controls';
    root.hidden = true;
    const k = (key: string) => `<kbd>${key}</kbd>`;
    const row = (keys: string, what: string) => `<li><span>${keys}</span>${what}</li>`;
    const bar = BAR_KEYS.map(b => k(b.bind)).join('');
    root.innerHTML = `<header><span>Controls</span><button type="button" class="inv-x" title="Close (/ or Esc)">×</button></header><div class="craft-list">
      <section><h3><span>Moving</span></h3><ul>
        ${row(`${k('W')}${k('A')}${k('S')}${k('D')}`, 'Walk (or the arrow keys)')}
        ${row('Click', 'Walk there; hold to steer')}
        ${row(k(PC_KEYS.jump.bind), 'Jump')}
        ${row(k('M'), 'Mount or dismount')}
      </ul></section>
      <section><h3><span>Fighting</span></h3><ul>
        ${row('Click', 'Target an enemy')}
        ${row(k(PC_KEYS.target.bind), 'Next target')}
        ${row(bar, `Your action bar: whatever you put in each slot (spellbook, ${k(PC_KEYS.spellbook.bind)})`)}
      </ul></section>
      <section><h3><span>The world</span></h3><ul>
        ${row('Click', 'Talk to people, chop trees, mine rocks')}
        ${row(k(PC_KEYS.gather.bind), 'Chop or mine whatever is closest')}
        ${row('Walk over', 'Pick up items')}
      </ul></section>
      <section><h3><span>Windows</span></h3><ul>
        ${row(k(PC_KEYS.inventory.bind), 'Inventory')}
        ${row(k(PC_KEYS.spellbook.bind), 'Spellbook')}
        ${row(k(PC_KEYS.talents.bind), 'Talents')}
        ${row(k(PC_KEYS.crafting.bind), 'Crafting')}
        ${row(k(PC_KEYS.journal.bind), 'Quests')}
        ${row(k(PC_KEYS.settings.bind), 'Settings')}
        ${row(k(PC_KEYS.controls.bind), 'Controls (this window)')}
        ${row(k('Esc'), 'Close a window')}
      </ul></section>
      <section><h3><span>View (experimental)</span></h3><ul>
        ${row(k(PC_KEYS.view.bind), 'Isometric, 3D diorama, or point of view')}
        ${row(`${k(PC_KEYS.turnLeft.bind)}${k(PC_KEYS.turnRight.bind)}`, 'Turn the 3D view')}
        ${row('Right-drag', 'Turn and tilt the 3D view (a right-click still walks)')}
        ${row('Wheel', 'Zoom the 3D view')}
        ${row(`${k(PC_KEYS.povTurnLeft.bind)}${k(PC_KEYS.povTurnRight.bind)}`, 'Point of view: turn (those bar slots then cast with a click)')}
        ${row(`${k('A')}${k('D')}`, 'Point of view: step sideways')}
      </ul></section>
      <section><h3><span>Advanced</span></h3><ul>
        ${row(`${k(PC_KEYS.revStep.bind)}${k(PC_KEYS.revToggle.bind)}${k(PC_KEYS.revAuto.bind)}`, 'Rev: next step, on/off, auto (turn Rev on in Settings)')}
        ${row(`${k(PC_KEYS.timeCycle.bind)}${k(PC_KEYS.lightToggle.bind)}`, 'Time of day, lighting')}
      </ul></section>
    </div>`;
    document.body.append(root);
    root.querySelector('.inv-x')!.addEventListener('click', () => this.toggle(false));
    root.addEventListener('pointerdown', e => e.stopPropagation());
    window.addEventListener('keydown', this.onKey);
    dockLeft(this);
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.root.hidden = !this.open;
    if (this.open) openedLeft(this);
  }

  setBottom(px: number): void {
    this.root.style.bottom = Math.max(12, Math.round(px)) + 'px';
  }

  destroy(): void {
    undockLeft(this);
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }
}
