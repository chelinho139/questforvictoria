/**
 * Windows docked on the left (crafting, quests, controls) share that space: opening one
 * closes the others. The inventory keeps the right side to itself.
 */
export interface Panel {
  readonly isOpen: boolean;
  toggle(force?: boolean): void;
}

const left = new Set<Panel>();

export function dockLeft(p: Panel): void {
  left.add(p);
}

export function undockLeft(p: Panel): void {
  left.delete(p);
}

/** Call when a left window opens. */
export function openedLeft(p: Panel): void {
  for (const o of left) if (o !== p && o.isOpen) o.toggle(false);
}
