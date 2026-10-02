import { PixelCanvas } from './pixelPainter';

/**
 * Terraria-proportioned hero and cow, hand-placed pixel by pixel (no procedural
 * shading): big head with hair and one visible eye, armoured torso, cape, boots.
 * Sprites face right; the renderer flips them.
 */

// ---------------------------------------------------------------- hero (20×33)
const HERO: Record<string, string> = {
  // hair
  y: '#5a2e14', h: '#8a4e26', H: '#b87038',
  // skin and eye
  S: '#ffd8b4', s: '#f2b88c', k: '#d08c64', W: '#ffffff', E: '#2a4a8a',
  // steel plate
  A: '#f0f4fa', a: '#c6cfdc', m: '#8f9ab0', n: '#5d6680',
  // red cape and tabard
  R: '#e05a48', r: '#b8322a', q: '#7c1e1e',
  // leather
  L: '#b47a44', l: '#865228', d: '#56331a',
  // gold
  G: '#ffe07a', g: '#d8a03a',
  // trousers
  P: '#7a88aa', p: '#56648a', x: '#3a4462',
  // sword blade
  B: '#f4f8fc', b: '#b8c4d4',
};

/** Head, torso, belt, plate skirt, crossguard (rows 0–23). Legs and blade are added per frame. */
const HERO_TOP = [
  '......yhhhhy........',
  '....yhhHHHHhhy......',
  '...yhHHHHHHHHhy.....',
  '..yhHHHHHHHHHHhy....',
  '..yhhHhhhhhhhhhy....',
  '..yhhhhSSSSSSSSs....',
  '..yhhhhSSSSSWESs....',
  '..yhhhhSSSSSWESs....',
  '...yhhhSSSSSSSSs....',
  '...yyhhsSSSSSSs.....',
  '....yyhkssssssk.....',
  '.......kkkkkk.......',
  '...RrqnaAammaAa.....',
  '...RrqnaAamaAAan....',
  '...RrqnaAammmmmn....',
  '...RrqnaARrmnan.....',
  '...RrqnaARrmnan.....',
  '...RrqnaARrmnan.....',
  '...RrqnamRrmnan.....',
  '...RrqnamRrmnanG....',
  '...RrqkLLlGllSsl....',
  '...Rrqkdddgddskl....',
  '...Rrq.ammmmngGGGg..',
  '...Rrq.nnnnnn..Bb...',
];

/** 4 walk frames: stand, stride, stand, stride the other way. */
export function hero(): HTMLCanvasElement[] {
  const strides: [number, number][] = [[0, 0], [-2, 2], [0, 0], [2, -2]];
  return strides.map(([bd, fd]) => {
    const p = new PixelCanvas(20, 33);
    const put = (x: number, y: number, ch: string) => {
      if (ch !== '.') p.px(x, y, HERO[ch]);
    };
    HERO_TOP.forEach((row, y) => [...row].forEach((ch, x) => put(x, y, ch)));
    // cape tail hangs behind the legs
    for (const [x, y, ch] of [[3, 24, 'R'], [4, 24, 'r'], [5, 24, 'q'], [3, 25, 'R'], [4, 25, 'r'], [5, 25, 'q'], [4, 26, 'r'], [5, 26, 'q'], [5, 27, 'q']] as [number, number, string][]) put(x, y, ch);
    // back leg (darker), then front leg over it
    for (let y = 24; y <= 29; y++) {
      put(7 + bd, y, 'p');
      put(8 + bd, y, 'p');
      put(9 + bd, y, 'x');
    }
    for (const y of [30, 31]) ['d', 'l', 'l', 'd'].forEach((c, i) => put(6 + bd + i, y, c));
    for (let x = 6 + bd; x <= 9 + bd; x++) put(x, 32, 'd');
    for (let y = 24; y <= 29; y++) {
      put(10 + fd, y, 'P');
      put(11 + fd, y, 'P');
      put(12 + fd, y, 'p');
    }
    for (const y of [30, 31]) ['L', 'L', 'l', 'l'].forEach((c, i) => put(10 + fd + i, y, c));
    put(14 + fd, 31, 'l');
    for (let x = 10 + fd; x <= 14 + fd; x++) put(x, 32, 'd');
    // sword blade in front of everything
    for (let y = 24; y <= 30; y++) {
      put(15, y, 'B');
      put(16, y, 'b');
    }
    put(15, 31, 'B');
    return p.outline('auto', 0.22).toCanvas();
  });
}

// ---------------------------------------------------------------- cow (30×20)
const COW = {
  W: '#ffffff', w: '#efe9dc', v: '#d3c9b3', V: '#aa9e86',
  K: '#3a3432', k: '#26201f',
  p: '#f7b8b4', P: '#d98c8a', n: '#7a3a3a', e: '#1a1414',
  h: '#f6ecca', H: '#c4b28a', f: '#4a3a2a',
};

/** Black-and-white cow built from clean rounded shapes. 2 walk frames. */
export function cow(): HTMLCanvasElement[] {
  const poses = [
    [4, 8, 16, 20],
    [3, 9, 15, 21],
  ];
  return poses.map(legs => {
    const p = new PixelCanvas(30, 20);
    const C = COW;
    // tail with a black tuft, behind the body
    p.line(2, 6, 1, 10, C.v);
    p.rect(0, 11, 2, 3, C.K).px(1, 11, C.k);
    // legs: far pair darker
    legs.forEach((x, i) => {
      const far = i % 2 === 1;
      p.rect(x, 14, 3, 4, far ? C.v : C.w);
      p.vline(x + 2, 14, 17, far ? C.V : C.v);
      p.rect(x, 18, 3, 2, C.f);
    });
    // body: rounded box, lit on top, shaded underneath
    p.rect(3, 4, 19, 11, C.w).rect(2, 5, 21, 9, C.w);
    p.hline(4, 19, 4, C.W).hline(3, 6, 5, C.W);
    p.hline(3, 21, 13, C.v).hline(4, 20, 14, C.V);
    // black patches, hand placed so they read as markings, not noise
    p.rect(5, 6, 4, 3, C.K).px(4, 7, C.K).px(6, 9, C.K).px(7, 9, C.K).px(9, 7, C.K).px(5, 6, C.k);
    p.rect(12, 9, 4, 3, C.K).px(11, 10, C.K).px(16, 10, C.K).px(13, 12, C.V).px(14, 12, C.K);
    p.rect(17, 5, 3, 2, C.K).px(18, 7, C.K).px(17, 5, C.k);
    // udder
    p.rect(11, 15, 3, 1, C.p).px(12, 16, C.P);
    // neck shadow where the head meets the body
    p.vline(21, 6, 10, C.v);
    // head
    p.rect(22, 2, 6, 9, C.w).rect(21, 3, 8, 7, C.w);
    p.hline(22, 27, 2, C.W);
    p.px(27, 3, C.K).px(26, 3, C.K).px(27, 4, C.K);
    // ear flopping back, horns, eye
    p.rect(19, 3, 2, 2, C.v).px(19, 4, C.P);
    p.vline(22, 0, 1, C.h).px(23, 1, C.H);
    p.vline(26, 0, 1, C.h).px(27, 1, C.H);
    p.px(24, 5, C.e).px(24, 4, C.V);
    // pink snout with nostrils
    p.rect(24, 8, 5, 3, C.p).rect(25, 7, 3, 1, C.p);
    p.hline(24, 28, 10, C.P);
    p.px(25, 9, C.n).px(27, 9, C.n);
    return p.outline('auto', 0.26).toCanvas();
  });
}
