/**
 * Dragging a spell icon with the mouse (from the spellbook, or along the bar while the
 * spellbook is open): a ghost of the icon follows the pointer, `over` reports where it is,
 * and `drop` gets the place it was let go (client coordinates).
 */
export function dragSpell(
  src: CanvasImageSource & { width: number; height: number },
  start: { clientX: number; clientY: number },
  over: (x: number, y: number) => void,
  drop: (x: number, y: number) => void
): void {
  const ghost = document.createElement('canvas');
  ghost.width = ghost.height = 44;
  ghost.className = 'spell-ghost';
  const c = ghost.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const k = Math.max(1, Math.floor(44 / Math.max(src.width, src.height)));
  c.drawImage(src, (44 - src.width * k) / 2, (44 - src.height * k) / 2, src.width * k, src.height * k);
  const place = (x: number, y: number) => {
    ghost.style.left = `${x - 22}px`;
    ghost.style.top = `${y - 22}px`;
  };
  place(start.clientX, start.clientY);
  document.body.append(ghost);
  const move = (e: PointerEvent) => {
    place(e.clientX, e.clientY);
    over(e.clientX, e.clientY);
  };
  const up = (e: PointerEvent) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    ghost.remove();
    drop(e.clientX, e.clientY);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}
