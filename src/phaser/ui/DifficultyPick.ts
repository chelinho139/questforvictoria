import { DIFFICULTIES, DIFFICULTY_IDS } from '../../data/difficulty';
import type { Difficulty } from '../../data/difficulty';

/**
 * Normal | Hard | Nightmare, with a line saying what the one picked does. Starting a
 * campaign shows it: a new single-player character, and opening a room online.
 */
export class DifficultyPick {
  readonly el: HTMLDivElement;
  private readonly about: HTMLParagraphElement;

  constructor(public value: Difficulty = 'normal') {
    const el = document.createElement('div');
    el.className = 'select-field select-diff';
    el.innerHTML = `Difficulty
      <div class="select-diffs" role="radiogroup" aria-label="Difficulty">${DIFFICULTY_IDS.map(
        d => `<button type="button" class="select-pick" role="radio" data-diff="${d}"><b>${DIFFICULTIES[d].name}</b></button>`
      ).join('')}</div>
      <p class="select-class-about"></p>`;
    this.el = el;
    this.about = el.querySelector('p')!;
    for (const b of el.querySelectorAll<HTMLButtonElement>('[data-diff]'))
      b.addEventListener('click', () => this.pick(b.dataset.diff as Difficulty));
    this.pick(value);
  }

  pick(d: Difficulty): void {
    this.value = d;
    for (const b of this.el.querySelectorAll<HTMLButtonElement>('[data-diff]'))
      b.setAttribute('aria-checked', String(b.dataset.diff === d));
    this.about.textContent = DIFFICULTIES[d].blurb;
  }
}
