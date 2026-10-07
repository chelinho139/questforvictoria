import Phaser from 'phaser';
import { applyResize, createConfig } from './phaser/config';
import { BootScene } from './phaser/scenes/BootScene';
import { GameScene } from './phaser/scenes/GameScene';
import { PcHudScene } from './phaser/scenes/PcHudScene';
import { MobileHudScene } from './phaser/scenes/MobileHudScene';
import { startTranslating, translateGame } from './i18n/dom';

function start(): void {
  const game = new Phaser.Game(createConfig([BootScene, GameScene, PcHudScene, MobileHudScene]));
  translateGame(game);
  game.events.once(Phaser.Core.Events.READY, () => {
    applyResize(game.scale);
    window.addEventListener('resize', () => applyResize(game.scale));
  });
  // Handy for poking at the running game from the browser console.
  (window as unknown as { qfv: Phaser.Game }).qfv = game;
}

// English or Spanish (the player's choice, else the computer's), from the first text on.
startTranslating();

// Make sure the pixel fonts are usable before any Text object renders with them.
const fonts = document.fonts;
if (fonts && fonts.load) {
  Promise.all([
    fonts.load('12px Silkscreen'),
    fonts.load('12px VT323'),
    fonts.load('12px "Pixelify Sans"'),
    fonts.load('bold 12px "Pixelify Sans"'),
  ])
    .catch(() => undefined)
    .then(start);
} else {
  start();
}
