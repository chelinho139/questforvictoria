// Cuts a trailer together from its edit list (edits/*.ts): each item (a filmed shot, a title
// card, the logo) rendered to an exact-length segment with its captions, fades and grade; the
// segments joined with cuts, crossfades, dips and flashes; the sound mixed on the same timeline
// (sound.ts) and brought to streaming loudness; out/trailers/<name>.mp4.
//
//   npx tsx tools/trailer/edit.ts <edit> [...]      (--port 3117 for the logo; the game must be served)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { captionPng, closeCards, logoPng } from './cards';
import { Stereo, SR, addShot, addStereo, addMono, decode, duck, gameSound, limit, sum, wav } from './sound';
import type { Envelope } from './sound';
import type { Edit, Item, Grade } from './edits/types';
import type { AudioEvent } from '../../src/phaser/dev/Director';
import { EDITS } from './edits';

const FF = ffmpegPath as unknown as string;
const HERE = __dirname;
const SHOTS = path.join(HERE, 'out', 'shots');
const SEG = path.join(HERE, 'out', 'seg');
const OUT = path.join(HERE, 'out', 'trailers');
const MUSIC = path.join(HERE, 'out', 'music');
const FPS = 60;

const args = process.argv.slice(2);
const pi = args.indexOf('--port');
const PORT = pi >= 0 ? args.splice(pi, 2)[1] : '3117';

function ff(argv: string[], what: string): string {
  const r = spawnSync(FF, ['-hide_banner', '-y', ...argv], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`ffmpeg (${what}) failed:\n${r.stderr.slice(-3000)}`);
  return r.stderr;
}

const frames = (s: number) => Math.round(s * FPS);
const eq = (g: Grade) => `eq=brightness=${g.b ?? 0}:contrast=${g.c ?? 1}:saturation=${g.s ?? 1}:gamma=${g.g ?? 1}`;

/** Each item's length: from its own mark to the next one's when both have them, else its own. */
function resolve(edit: Edit): Edit {
  const half = (it: Item) => (it.t === 'fade' ? (it.td ?? 0.5) / 2 : 0);
  const items = edit.items.map((it, i) => {
    const next = edit.items[i + 1];
    if (it.at !== undefined && next?.at !== undefined) return { ...it, dur: next.at + half(next) - (it.at - half(it)) };
    if (it.dur === undefined) throw new Error(`${edit.name}: item ${i} needs a length (or marks on it and the next)`);
    return it;
  });
  // the shots must have been filmed long enough
  items.forEach((it, i) => {
    if (!('shot' in it)) return;
    const meta = path.join(SHOTS, `${it.shot}.audio.json`);
    if (!fs.existsSync(meta)) return;
    const have = (JSON.parse(fs.readFileSync(meta, 'utf8')) as { dur: number }).dur;
    if ((it.in ?? 0) + it.dur! > have + 0.25) console.warn(`\n${edit.name}: item ${i} (${it.shot}) wants ${((it.in ?? 0) + it.dur!).toFixed(2)} s of a ${have} s shot`);
  });
  return { ...edit, items };
}

/** Where each item sits on the timeline (a crossfade overlaps the one before). */
function timeline(items: Item[]): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let t = 0;
  for (const it of items) {
    const start = it.t === 'fade' && out.length ? t - (it.td ?? 0.5) : t;
    out.push({ start, end: start + it.dur! });
    t = start + it.dur!;
  }
  return out;
}

/** Render one item to its own segment (cached by what it is). */
async function segment(edit: Edit, it: Item, i: number): Promise<string> {
  const caps = await Promise.all((it.text ?? []).map(c => captionPng(c)));
  const names = 'shot' in it ? [it.shot] : 'grid' in it ? it.grid : [];
  const srcs = names.map(n => path.join(SHOTS, `${n}.mp4`));
  for (const [j, f] of srcs.entries()) if (!fs.existsSync(f)) throw new Error(`${edit.name}: shot ${names[j]} hasn't been filmed (film.ts)`);
  const src = srcs.map(f => f + fs.statSync(f).mtimeMs).join();
  const logo = 'logo' in it ? await logoPng(PORT) : '';
  const key = crypto
    .createHash('sha1')
    .update(JSON.stringify(it) + src + caps.join() + (logo ? fs.statSync(logo).mtimeMs : '') + 'v3')
    .digest('hex')
    .slice(0, 14);
  fs.mkdirSync(SEG, { recursive: true });
  const out = path.join(SEG, `${edit.name}-${String(i).padStart(2, '0')}-${key}.mp4`);
  if (fs.existsSync(out)) return out;
  const dur = it.dur!;
  const n = frames(dur);
  const inputs: string[] = [];
  const f: string[] = [];
  if ('grid' in it) {
    // three views in a 2x2 split screen, the fourth corner dark (for a caption), thin dark lines between
    for (const f of srcs) inputs.push('-i', f);
    inputs.push('-f', 'lavfi', '-i', `color=c=0x0b0d12:s=960x540:r=${FPS}:d=${dur + 0.5}`);
    srcs.forEach((_, j) => f.push(`[${j}:v]trim=start=${it.in ?? 0}:duration=${dur + 0.5},setpts=PTS-STARTPTS,fps=${FPS},scale=960:540:flags=lanczos,format=yuv420p[g${j}]`));
    f.push(
      `[3:v]format=yuv420p[g3]`,
      `[g0][g1][g2][g3]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0,drawbox=x=957:y=0:w=6:h=ih:color=0x0b0d12:t=fill,drawbox=x=0:y=537:w=iw:h=6:color=0x0b0d12:t=fill,format=yuv420p[b0]`
    );
  } else if ('shot' in it) {
    inputs.push('-i', srcs[0]);
    f.push(`[0:v]trim=start=${it.in ?? 0}:duration=${dur + 0.5},setpts=PTS-STARTPTS,fps=${FPS}${it.grade ? ',' + eq(it.grade) : ''},format=yuv420p[b0]`);
  } else if ('logo' in it) {
    inputs.push('-f', 'lavfi', '-i', `color=c=black:s=1920x1080:r=${FPS}:d=${dur + 0.5}`, '-loop', '1', '-framerate', String(FPS), '-t', String(dur + 0.5), '-i', logo);
    const k = it.scale ?? 5;
    f.push(`[1:v]scale=iw*${k}:ih*${k}:flags=neighbor,format=rgba[lg]`, `[0:v][lg]overlay=(W-w)/2:(H-h)/2-20,format=yuv420p[b0]`);
  } else {
    inputs.push('-f', 'lavfi', '-i', `color=c=black:s=1920x1080:r=${FPS}:d=${dur + 0.5}`);
    f.push(`[0:v]format=yuv420p[b0]`);
  }
  let cur = 'b0';
  const base = inputs.filter(a => a === '-i').length;
  caps.forEach((png, j) => {
    const c = it.text![j];
    const a = c.at ?? 0;
    const d = c.dur ?? dur - a;
    const fd = c.fade ?? 0.5;
    inputs.push('-loop', '1', '-framerate', String(FPS), '-t', String(dur + 0.5), '-i', png);
    const idx = base + j;
    f.push(
      `[${idx}:v]format=rgba,fade=t=in:st=${a}:d=${fd}:alpha=1,fade=t=out:st=${Math.max(a, a + d - fd)}:d=${fd}:alpha=1[c${j}]`,
      `[${cur}][c${j}]overlay=0:0:enable='between(t,${a},${a + d})'[o${j}]`
    );
    cur = `o${j}`;
  });
  const tail: string[] = [];
  if (it.t === 'black') tail.push(`fade=t=in:st=0:d=${it.td ?? 0.5}`);
  if (it.fadeOut) tail.push(`fade=t=out:st=${dur - it.fadeOut}:d=${it.fadeOut}`);
  if (it.t === 'flash') {
    inputs.push('-f', 'lavfi', '-i', `color=c=white:s=1920x1080:r=${FPS}:d=1`);
    const idx = inputs.filter(a => a === '-i').length - 1;
    f.push(`[${idx}:v]format=rgba,fade=t=out:st=0:d=${it.td ?? 0.3}:alpha=1[fl]`, `[${cur}][fl]overlay=0:0:shortest=0:eof_action=pass[fx]`);
    cur = 'fx';
  }
  f.push(`[${cur}]${tail.length ? tail.join(',') + ',' : ''}format=yuv420p[v]`);
  ff([...inputs, '-filter_complex', f.join(';'), '-map', '[v]', '-frames:v', String(n), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'fast', '-crf', '12', '-pix_fmt', 'yuv420p', out], `segment ${i}`);
  return out;
}

/** Join the segments: cuts, and crossfades where an item says so; then the bars and the grade over all. */
function join(edit: Edit, segs: string[], out: string, audio: string): void {
  const inputs: string[] = [];
  for (const s of segs) inputs.push('-i', s);
  inputs.push('-i', audio);
  // every stream on one clock (xfade wants its two inputs alike, and concat changes the timebase)
  const f: string[] = segs.map((_, i) => `[${i}:v]setpts=PTS-STARTPTS,fps=${FPS},settb=1/${FPS}[s${i}]`);
  let acc = 's0';
  let accDur = edit.items[0].dur!;
  for (let i = 1; i < segs.length; i++) {
    const it = edit.items[i];
    const lab = `j${i}`;
    if (it.t === 'fade') {
      const td = it.td ?? 0.5;
      f.push(`[${acc}][s${i}]xfade=transition=fade:duration=${td}:offset=${(accDur - td).toFixed(4)},settb=1/${FPS}[${lab}]`);
      accDur += it.dur! - td;
    } else {
      f.push(`[${acc}][s${i}]concat=n=2:v=1:a=0,settb=1/${FPS}[${lab}]`);
      accDur += it.dur!;
    }
    acc = lab;
  }
  const look: string[] = [];
  if (edit.grade) look.push(eq(edit.grade));
  if (edit.vignette) look.push('vignette=angle=PI/5:mode=forward');
  if (edit.letterbox) look.push(`drawbox=x=0:y=0:w=iw:h=${edit.letterbox}:color=black:t=fill`, `drawbox=x=0:y=ih-${edit.letterbox}:w=iw:h=${edit.letterbox}:color=black:t=fill`);
  f.push(`[${acc}]${look.length ? look.join(',') + ',' : ''}format=yuv420p[v]`);
  ff(
    [
      ...inputs,
      '-filter_complex',
      f.join(';'),
      '-map',
      '[v]',
      '-map',
      `${segs.length}:a`,
      '-r',
      String(FPS),
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '16',
      '-tune',
      'animation',
      '-pix_fmt',
      'yuv420p',
      '-profile:v',
      'high',
      '-c:a',
      'aac',
      // (at 256k the encoder's low-pass rings: true peaks come out ~4 dB over the mix's)
      '-b:a',
      '320k',
      '-movflags',
      '+faststart',
      '-t',
      accDur.toFixed(3),
      out,
    ],
    'join'
  );
}

/** The trailer's sound: the music, the shots' own sound, extra cues; ducked, limited, at -14 LUFS. */
function mix(edit: Edit, out: string): void {
  const tl = timeline(edit.items);
  const total = tl[tl.length - 1].end + 1;
  const n = Math.ceil(total * SR);
  const music = new Stereo(n);
  const tracks = new Map<string, Stereo>();
  for (const m of edit.music) {
    let src = tracks.get(m.track);
    if (!src) tracks.set(m.track, (src = decode(path.join(MUSIC, `${m.track}.mp3`))));
    const fi = m.fadeIn ?? 0.05;
    const fo = m.fadeOut ?? 0.05;
    const g = m.gain ?? 1;
    const env: Envelope = [
      [m.at, 0],
      [m.at + fi, g],
      [m.at + m.dur - fo, g],
      [m.at + m.dur, 0],
    ];
    addStereo(music, src, m.at, m.from ?? 0, m.dur, env);
  }
  const fx = new Stereo(n);
  edit.items.forEach((it, i) => {
    if (!('shot' in it || 'grid' in it) || it.sfx === 0) return;
    const file = path.join(SHOTS, `${'shot' in it ? it.shot : it.grid[0]}.audio.json`);
    if (!fs.existsSync(file)) return;
    const events = (JSON.parse(fs.readFileSync(file, 'utf8')) as { events: AudioEvent[] }).events;
    const { start, end } = tl[i];
    const fin = it.t === 'fade' || it.t === 'black' ? (it.td ?? 0.5) : 0.03;
    const fout = it.fadeOut ?? 0.03;
    const env: Envelope = [
      [start, 0],
      [start + fin, 1],
      [end - fout, 1],
      [end + 0.4, 0],
    ];
    addShot(fx, events, start, it.in ?? 0, it.dur!, it.sfx ?? 1, env, !!edit.uiSounds);
  });
  for (const c of edit.sfx ?? []) addMono(fx, gameSound(c.id, c.take ?? 0), c.at, c.gain ?? 1, c.pan ?? 0, c.rate ?? 1);
  const lv = edit.mix ?? {};
  // how loud each part is where it plays (dB RMS over its louder half), to balance them by
  const level = (s: Stereo) => {
    const blocks: number[] = [];
    for (let i = 0; i + SR / 2 <= s.n; i += SR / 2) {
      let e = 0;
      for (let k = i; k < i + SR / 2; k++) e += s.l[k] * s.l[k] + s.r[k] * s.r[k];
      blocks.push(e / SR);
    }
    blocks.sort((a, b) => b - a);
    const top = blocks.slice(0, Math.max(1, blocks.length >> 1));
    return (10 * Math.log10(top.reduce((a, b) => a + b, 0) / top.length + 1e-12)).toFixed(1);
  };
  console.log(`\n${edit.name}: music ${level(music)} dB, effects ${level(fx)} dB (before levels)`);
  if (lv.duck) duck(music, fx, lv.duck);
  const all = sum(n, [
    [music, lv.music ?? 0.8],
    [fx, lv.fx ?? 0.9],
  ]);
  limit(all, 0.98);
  const raw = out.replace(/\.wav$/, '.raw.wav');
  fs.writeFileSync(raw, wav(all));
  // two passes: measure, then one gain for the whole (the trailer's dynamics stay)
  const TARGET = 'I=-14:TP=-1.5:LRA=14';
  const err = ff(['-i', raw, '-af', `loudnorm=${TARGET}:print_format=json`, '-f', 'null', '-'], 'measure');
  const m = JSON.parse(err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1)) as Record<string, string>;
  ff(
    ['-i', raw, '-af', `loudnorm=${TARGET}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=192000,alimiter=limit=0.7:level=false:latency=1,aresample=48000`, '-ar', String(SR), '-c:a', 'pcm_f32le', out],
    'loudness'
  );
  fs.unlinkSync(raw);
}

async function cut(raw: Edit): Promise<void> {
  const t0 = Date.now();
  const edit = resolve(raw);
  const segs: string[] = [];
  for (const [i, it] of edit.items.entries()) {
    process.stdout.write(`\r${edit.name}: segment ${i + 1}/${edit.items.length}   `);
    segs.push(await segment(edit, it, i));
  }
  fs.mkdirSync(OUT, { recursive: true });
  const audio = path.join(SEG, `${edit.name}.wav`);
  process.stdout.write(`\r${edit.name}: mixing the sound          `);
  mix(edit, audio);
  process.stdout.write(`\r${edit.name}: joining                  `);
  const out = path.join(OUT, `${edit.name}.mp4`);
  join(edit, segs, out, audio);
  const tl = timeline(edit.items);
  console.log(`\r${edit.name}: ${tl[tl.length - 1].end.toFixed(1)} s → ${path.relative(process.cwd(), out)} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

(async () => {
  const names = args.length ? args : Object.keys(EDITS);
  for (const n of names) {
    const e = EDITS[n];
    if (!e) throw new Error(`no edit '${n}' (there are: ${Object.keys(EDITS).join(', ')})`);
    await cut(e);
  }
  // a page to watch them side by side (serve out/trailers and open it)
  fs.copyFileSync(path.join(HERE, 'compare.html'), path.join(OUT, 'index.html'));
  await closeCards();
})().catch(async e => {
  console.error('\n', e);
  await closeCards();
  process.exit(1);
});
