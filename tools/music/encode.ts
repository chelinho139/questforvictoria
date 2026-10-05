// Fetches every track in src/data/music.ts from where it was found, trims the silence at both
// ends, evens out the loudness (two-pass loudnorm, so the music's own swells are kept) and writes
// public/music/<id>.mp3. Needs ffmpeg on the PATH.
// Usage: npm run music            (only tracks not yet written)
//        npm run music -- --all   (every track again)
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TRACKS, TRACK_IDS, musicFile } from '../../src/data/music';

const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(os.tmpdir(), 'qfv-music');
/** Loudness every track is brought to (LUFS), its ceiling and range; the settings slider turns it down from there. */
const TARGET = 'I=-18:TP=-2:LRA=11';
const TRIM = 'silenceremove=start_periods=1:start_threshold=-60dB,areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse';
const all = process.argv.includes('--all');

fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(path.join(ROOT, 'public', 'music'), { recursive: true });
for (const id of TRACK_IDS) {
  const t = TRACKS[id];
  const out = path.join(ROOT, 'public', musicFile(id));
  if (!all && fs.existsSync(out)) continue;
  const raw = path.join(CACHE, id + path.extname(new URL(t.from).pathname));
  if (!fs.existsSync(raw)) execFileSync('curl', ['-sfL', '-m', '300', '-o', raw, t.from]);
  // first pass: measure (loudnorm reports on stderr)
  const err = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', raw, '-vn', '-af', `${TRIM},loudnorm=${TARGET}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const m = JSON.parse(err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1)) as Record<string, string>;
  // second pass: the same gain over the whole track
  const norm = `loudnorm=${TARGET}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-i', raw, '-vn', '-map_metadata', '-1', '-af', `${TRIM},${norm}`, '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-q:a', '6', out]);
  const secs = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], { encoding: 'utf8' }));
  console.log(`${id.padEnd(12)} ${(fs.statSync(out).size / 1e6).toFixed(1)} MB  ${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}  was ${m.input_i} LUFS  ${t.title}`);
}
