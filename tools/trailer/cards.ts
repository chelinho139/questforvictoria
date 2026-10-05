// Text for the trailers: each caption drawn by Chrome (with the lore's and the game's own web
// fonts) onto a transparent 1920x1080 PNG that the edit lays over the picture; and the game's logo,
// taken from the game itself.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer-core';
import type { Browser } from 'puppeteer-core';

export const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, 'out', 'cards');

/** How a line of text looks. */
export type Style =
  /** The story, told (IM Fell English, warm parchment white). */
  | 'lore'
  | 'loreSmall'
  /** Gameplay callouts in the game's own lettering, gold like the logo. */
  | 'feature'
  | 'featureSmall'
  /** The mystery: cold, quiet, italic. */
  | 'whisper'
  /** A line someone says, with their name over it. */
  | 'voice'
  /** A signature in a fine hand. */
  | 'sign';

export interface Caption {
  text: string;
  style: Style;
  /** Who says it (style 'voice'). */
  who?: string;
  /** Where on the frame. */
  pos?: 'center' | 'low' | 'high' | 'lowLeft';
  /** Seconds into the item it appears, and how long it stays (default: the whole item). */
  at?: number;
  dur?: number;
  /** Fade in / out seconds. */
  fade?: number;
}

const FONTS =
  'https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Pixelify+Sans:wght@500;700&family=Silkscreen:wght@400;700&family=Pinyon+Script&display=block';

const CSS = `
html, body { margin: 0; width: 1920px; height: 1080px; background: transparent; overflow: hidden; }
.frame { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; padding: 0 220px; box-sizing: border-box; text-align: center; }
.center { justify-content: center; }
.low { justify-content: flex-end; padding-bottom: 152px; }
.high { justify-content: flex-start; padding-top: 130px; }
.lowLeft { justify-content: flex-end; align-items: flex-start; text-align: left; padding: 0 0 110px 130px; }
.lore { font-family: 'IM Fell English', serif; font-size: 58px; line-height: 1.25; color: #f1e8d2; letter-spacing: 0.01em;
  text-shadow: 0 0 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9); }
.loreSmall { font-family: 'IM Fell English', serif; font-style: italic; font-size: 42px; line-height: 1.3; color: #e6dcc4;
  text-shadow: 0 0 16px rgba(0,0,0,0.9), 0 2px 3px rgba(0,0,0,0.9); }
.feature { font-family: 'Pixelify Sans', sans-serif; font-weight: 700; font-size: 84px; letter-spacing: 0.06em; text-transform: uppercase;
  color: #ffd24a; -webkit-text-stroke: 3px #3a1606; paint-order: stroke fill;
  text-shadow: 0 6px 0 #1e0c04, 0 0 30px rgba(0,0,0,0.75); }
.featureSmall { font-family: 'Pixelify Sans', sans-serif; font-weight: 500; font-size: 40px; letter-spacing: 0.04em; color: #fce6b4;
  -webkit-text-stroke: 2px #1e0c04; paint-order: stroke fill; text-shadow: 0 3px 0 #1e0c04, 0 0 20px rgba(0,0,0,0.8); margin-top: 18px; }
.whisper { font-family: 'IM Fell English', serif; font-style: italic; font-size: 50px; line-height: 1.3; color: #d5dbe8; letter-spacing: 0.02em;
  text-shadow: 0 0 22px rgba(0,0,0,0.95), 0 2px 3px rgba(0,0,0,0.9); }
.voice .who { font-family: 'IM Fell English SC', serif; font-size: 30px; letter-spacing: 0.18em; color: #b9a98a; margin-bottom: 10px;
  text-shadow: 0 0 14px rgba(0,0,0,0.95); }
.voice .line { font-family: 'IM Fell English', serif; font-style: italic; font-size: 48px; line-height: 1.3; color: #efe7d6;
  text-shadow: 0 0 18px rgba(0,0,0,0.95), 0 2px 3px rgba(0,0,0,0.9); }
.sign { font-family: 'Pinyon Script', cursive; font-size: 96px; color: #ece3d0; text-shadow: 0 0 20px rgba(0,0,0,0.9); }
`;

function html(c: Caption): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
  const body =
    c.style === 'voice'
      ? `<div class="voice">${c.who ? `<div class="who">${esc(c.who)}</div>` : ''}<div class="line">${esc(c.text)}</div></div>`
      : c.style === 'feature' && c.text.includes('|')
        ? `<div class="feature">${esc(c.text.split('|')[0])}</div><div class="featureSmall">${esc(c.text.split('|')[1])}</div>`
        : `<div class="${c.style}">${esc(c.text)}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${CSS}</style></head>
<body><div class="frame ${c.pos ?? 'center'}">${body}</div></body></html>`;
}

export function captionKey(c: Caption): string {
  return crypto.createHash('sha1').update(JSON.stringify([c.text, c.style, c.who ?? '', c.pos ?? 'center', CSS])).digest('hex').slice(0, 12);
}

let browser: Browser | null = null;
async function chrome(): Promise<Browser> {
  browser ??= await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'], defaultViewport: { width: 1920, height: 1080 } });
  return browser;
}

export async function closeCards(): Promise<void> {
  await browser?.close();
  browser = null;
}

/** The caption as a transparent PNG (made once, kept by its look). */
export async function captionPng(c: Caption): Promise<string> {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${captionKey(c)}.png`);
  if (fs.existsSync(file)) return file;
  const page = await (await chrome()).newPage();
  await page.setContent(html(c), { waitUntil: 'load' });
  await page.evaluate(async () => {
    const faces = ['58px "IM Fell English"', 'italic 58px "IM Fell English"', '30px "IM Fell English SC"', 'bold 84px "Pixelify Sans"', '500 40px "Pixelify Sans"', '96px "Pinyon Script"'];
    await Promise.all(faces.map(f => document.fonts.load(f)));
    await document.fonts.ready;
  });
  await page.screenshot({ path: file as `${string}.png`, omitBackground: true });
  await page.close();
  return file;
}

/** The game's logo, as the game draws it (needs the game served at `port`). */
export async function logoPng(port: string): Promise<string> {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'logo.png');
  if (fs.existsSync(file)) return file;
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=d3d11', '--enable-gpu'], defaultViewport: { width: 1280, height: 720 } });
  const page = await b.newPage();
  await page.goto(`http://localhost:${port}/?director`, { waitUntil: 'load' });
  await page.waitForFunction('window.director', { timeout: 90_000 });
  const url = (await page.evaluate('window.director.logo()')) as string;
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  await b.close();
  return file;
}
