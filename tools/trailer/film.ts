// Films trailer shots: opens the game in Chrome with the director on (src/phaser/dev/Director.ts),
// stages each shot from shots/, steps it frame by frame and pipes every frame into ffmpeg, then
// writes the sounds it made beside the clip.
//
//   npx tsx tools/trailer/film.ts <shot|prefix*> [...]   film these shots (all with "all")
//   npx tsx tools/trailer/film.ts --list                 the shots there are
//   options: --still (one frame per shot at its middle, as a PNG, for checking a setup quickly)
//            --port 3117 (where the game is served: PORT=3117 node server.js)
//
// Out: tools/trailer/out/shots/<name>.mp4 and <name>.audio.json (out/ is not kept in git).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import * as esbuild from 'esbuild';
import puppeteer from 'puppeteer-core';
import type { Page, CDPSession } from 'puppeteer-core';
import ffmpegPath from 'ffmpeg-static';
import { SHOTS } from './shots';
import { CHROME, GL_ARGS } from './cards';

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out', 'shots');
const W = 1920;
const H = 1080;

const args = process.argv.slice(2);
const opt = (name: string, def: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const flag = (name: string) => {
  const i = args.indexOf(name);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
};
const PORT = opt('--port', '3117');
const STILL = flag('--still');
const LIST = flag('--list');

function pick(): string[] {
  const names = Object.keys(SHOTS);
  if (LIST) {
    for (const n of names) console.log(n.padEnd(28), `${SHOTS[n].dur}s`, SHOTS[n].note ?? '');
    process.exit(0);
  }
  if (!args.length) {
    console.error('Which shots? (--list shows them; "all" films every one)');
    process.exit(1);
  }
  const out: string[] = [];
  for (const a of args) {
    const hit = a === 'all' ? names : a.endsWith('*') ? names.filter(n => n.startsWith(a.slice(0, -1))) : names.filter(n => n === a);
    if (!hit.length) throw new Error(`no shot '${a}'`);
    out.push(...hit);
  }
  return [...new Set(out)];
}

/** The shot scripts, bundled for the page (they only use the director they're handed). */
async function shotBundle(): Promise<string> {
  const r = await esbuild.build({
    entryPoints: [path.join(__dirname, 'shots', 'index.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'TRAILER',
    target: 'es2020',
    platform: 'browser',
  });
  return r.outputFiles[0].text;
}

/** A seeded Math.random, so a shot comes out the same every take. */
function seedRandom(seed: number): void {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function film(page: Page, cdp: CDPSession, name: string, bundle: string): Promise<void> {
  const shot = SHOTS[name];
  await page.evaluateOnNewDocument(seedRandom, shot.seed ?? 7);
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.clear();
      localStorage.setItem('qfv-view', 'iso');
    } catch {
      // nothing kept between shots anyway
    }
  });
  await page.goto(`http://localhost:${PORT}/?director`, { waitUntil: 'load' });
  await page.waitForFunction('window.director', { timeout: 90_000 });
  await page.addScriptTag({ content: bundle });
  await page.evaluate(
    (n: string, clean: boolean, settle: number) => {
      const w = window as unknown as { director: any; TRAILER: any };
      const d = w.director;
      d.setClean(clean);
      w.TRAILER.SHOTS[n].setup(d);
      d.clearLog();
      d.settle(settle);
      d.rollCamera();
      d.frame(0);
    },
    name,
    shot.clean !== false,
    shot.settle ?? 1
  );
  const frames = Math.round(shot.dur * 60);
  fs.mkdirSync(OUT, { recursive: true });
  if (STILL) {
    // three stills: near the start, the middle and near the end
    let at = 0;
    for (const [k, f] of [0.1, 0.5, 0.9].entries()) {
      const to = Math.floor(frames * f);
      await page.evaluate((n: number) => (window as any).director.frame(n), to - at);
      at = to;
      const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT, `${name}.s${k}.png`), Buffer.from(r.data, 'base64'));
    }
    console.log(`${name}: stills`);
    return;
  }
  const out = path.join(OUT, `${name}.mp4`);
  const ff = spawn(ffmpegPath as unknown as string, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'fast', '-crf', '12', '-tune', 'animation', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise<void>((ok, bad) => ff.on('close', (c: number | null) => (c === 0 ? ok() : bad(new Error(`ffmpeg ${c}`)))));
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    if (i) await page.evaluate(() => (window as any).director.frame(1));
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    if (!ff.stdin.write(Buffer.from(r.data, 'base64'))) await new Promise(ok => ff.stdin.once('drain', ok));
    if (i % 60 === 59) process.stdout.write(`\r${name}: ${((i + 1) / 60).toFixed(0)}/${shot.dur}s  (${(((i + 1) / (Date.now() - t0)) * 1000).toFixed(1)} fps)   `);
  }
  ff.stdin.end();
  await done;
  const audio = await page.evaluate(() => (window as any).director.audio);
  fs.writeFileSync(path.join(OUT, `${name}.audio.json`), JSON.stringify({ shot: name, dur: shot.dur, events: audio }));
  console.log(`\r${name}: ${shot.dur}s in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${audio.length} sounds`);
}

(async () => {
  const names = pick();
  // the game as it is now (the director lives in it)
  execFileSync(process.execPath, ['build.js'], { cwd: ROOT, stdio: 'ignore' });
  const bundle = await shotBundle();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [...GL_ARGS, `--window-size=${W},${H}`, '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
    protocolTimeout: 600_000,
  });
  try {
    for (const name of names) {
      const page = await browser.newPage();
      page.on('pageerror', (e: unknown) => console.error(`\n[${name}] page error:`, e instanceof Error ? e.message : e));
      page.on('console', m => {
        if (m.type() === 'error') console.error(`\n[${name}] console:`, m.text().slice(0, 300));
      });
      const cdp = await page.createCDPSession();
      await film(page, cdp, name, bundle);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
