import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  TRACKS,
  TRACK_IDS,
  PLAYLISTS,
  MusicDirector,
  moodFor,
  musicFile,
  GAP_S,
  FADE_S,
  BREATH_S,
  FIRST_S,
  SETTLE_S,
  BOSS_LINGER_S,
} from '../src/data/music';
import type { Mood, MusicCue, TrackId } from '../src/data/music';
import { REGIONS } from '../src/data/regions';

const ROOT = path.join(__dirname, '..');
const DT = 0.05;

/** Seconds of play in one place, gathering the cues. */
function run(d: MusicDirector, mood: Mood, seconds: number): MusicCue[] {
  const cues: MusicCue[] = [];
  for (let t = 0; t < seconds; t += DT) cues.push(...d.update(DT, mood));
  return cues;
}
const plays = (cues: MusicCue[]) => cues.filter((c): c is Extract<MusicCue, { kind: 'play' }> => c.kind === 'play');

test('every track has its file, and every playlist names real tracks', () => {
  for (const id of TRACK_IDS) assert.ok(fs.existsSync(path.join(ROOT, 'public', musicFile(id))), `public/${musicFile(id)} is missing (npm run music)`);
  for (const [mood, list] of Object.entries(PLAYLISTS)) {
    assert.ok(list.length > 0, `${mood} has nothing to play`);
    for (const id of list) assert.ok(TRACKS[id], `${mood} plays an unknown track ${id}`);
  }
  // and every track plays somewhere
  for (const id of TRACK_IDS) assert.ok(Object.values(PLAYLISTS).some(l => l.includes(id)), `${id} plays nowhere`);
});

test('every track is credited in docs/credits.md, the CC BY ones with their licence', () => {
  const credits = fs.readFileSync(path.join(ROOT, 'docs', 'credits.md'), 'utf8');
  for (const id of TRACK_IDS) {
    const t = TRACKS[id];
    assert.ok(credits.includes(`"${t.title}"`), `${t.title} is not credited`);
    assert.ok(credits.includes(t.artist), `${t.artist} is not credited`);
  }
  assert.ok(credits.includes('http://creativecommons.org/licenses/by/4.0/'));
});

test('the place picks the music: a boss over all, then the region, the ring, the roof and the hour', () => {
  const at = (ring: number, more: Partial<Parameters<typeof moodFor>[0]> = {}) => moodFor({ ring, indoor: false, night: false, boss: false, ...more });
  assert.equal(at(0), 'meadow');
  assert.equal(at(0, { night: true }), 'night');
  assert.equal(at(1), 'village');
  assert.equal(at(1, { night: true }), 'night');
  assert.equal(at(1, { indoor: true, night: true }), 'indoors');
  assert.equal(at(2), 'haunted');
  assert.equal(at(3, { night: true }), 'haunted');
  assert.equal(at(4), 'deep');
  assert.equal(at(5, { indoor: true }), 'deep');
  assert.equal(at(1, { indoor: true, music: 'haunted' }), 'haunted');
  assert.equal(at(1, { music: 'haunted', boss: true }), 'boss');
  // the game's own regions
  const region = (id: string) => {
    const def = REGIONS[id];
    return moodFor({ ring: def.ring, indoor: !!def.indoor, night: false, boss: false, music: def.music });
  };
  assert.equal(region('greenmarch'), 'meadow');
  assert.equal(region('millbrook'), 'village');
  assert.equal(region('belltower'), 'haunted');
});

test('a track, then one to three minutes of quiet, then another track, never the one just heard', () => {
  let seed = 7;
  const d = new MusicDirector(() => ((seed = (seed * 16807) % 2147483647) / 2147483647));
  const first = plays(run(d, 'meadow', FIRST_S + 0.2));
  assert.equal(first.length, 1, 'the first track starts soon after the game opens');
  assert.ok(PLAYLISTS.meadow.includes(first[0].track));
  assert.equal(first[0].loop, false);
  const heard: TrackId[] = [first[0].track];
  for (let i = 0; i < 30; i++) {
    run(d, 'meadow', 30); // somewhere in the track
    d.ended();
    assert.ok(d.wait >= GAP_S[0] && d.wait <= GAP_S[1], `quiet of ${d.wait.toFixed(0)} s`);
    assert.equal(plays(run(d, 'meadow', GAP_S[0] - 1)).length, 0, 'still quiet');
    const next = plays(run(d, 'meadow', GAP_S[1] - GAP_S[0] + 2));
    assert.equal(next.length, 1);
    assert.notEqual(next[0].track, heard.at(-1), 'the same track twice in a row');
    heard.push(next[0].track);
  }
  // every track on the list comes round
  for (const id of PLAYLISTS.meadow) assert.ok(heard.includes(id), `${id} never played`);
});

test('a new place fades the old track out and starts its own after a breath; a shared track plays on', () => {
  const d = new MusicDirector(() => 0.5);
  run(d, 'meadow', FIRST_S + 0.2);
  // make the track playing one the village doesn't have
  plays(d.force('suonatore'));
  // a brief step over the border changes nothing
  assert.equal(run(d, 'village', SETTLE_S - 0.5).length, 0);
  assert.equal(run(d, 'meadow', 1).length, 0);
  // staying does
  const cues = run(d, 'village', SETTLE_S + 0.2);
  assert.deepEqual(cues, [{ kind: 'stop', fade: FADE_S }]);
  const breath = BREATH_S[0] + (BREATH_S[1] - BREATH_S[0]) * 0.5;
  assert.equal(plays(run(d, 'village', FADE_S + breath - 0.3)).length, 0);
  const next = plays(run(d, 'village', 0.6));
  assert.equal(next.length, 1);
  assert.ok(PLAYLISTS.village.includes(next[0].track));
  // the village track that the night also has plays on through dusk
  d.force('teller');
  assert.equal(run(d, 'night', SETTLE_S + 1).length, 0);
  assert.equal(d.track, 'teller');
  assert.equal(d.mood, 'night');
});

test('a boss cuts in at once and loops; its music lasts a moment after, then fades', () => {
  const d = new MusicDirector(() => 0.5);
  run(d, 'meadow', FIRST_S + 0.2);
  const cut = plays(d.update(DT, 'boss'));
  assert.equal(cut.length, 1);
  assert.deepEqual([cut[0].track, cut[0].loop], ['evil', true]);
  // stepping out of reach and back keeps it going
  assert.equal(run(d, 'meadow', BOSS_LINGER_S - 1).length, 0);
  assert.equal(run(d, 'boss', 1).length, 0);
  // the boss falls: the fight music fades, and the place's own comes back after
  const after = run(d, 'meadow', BOSS_LINGER_S + SETTLE_S + 0.5);
  assert.deepEqual(after.filter(c => c.kind === 'stop').length, 1);
  assert.equal(d.mood, 'meadow');
  const back = plays(run(d, 'meadow', 20));
  assert.equal(back.length, 1);
  assert.ok(PLAYLISTS.meadow.includes(back[0].track));
});
