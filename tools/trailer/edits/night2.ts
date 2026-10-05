import type { Edit } from './types';

/**
 * Trailer 2, "Hold the Night", with Act II (about 1:44, the interface in view): the same cut to
 * Kevin MacLeod's "Five Armies" as night.ts, the Act I fights traded for Act II's. The opening
 * glimpses are the Keening Hollow and Kilnholt at nightfall; gathering and forging stay (in
 * Act II's steel); the classes fight the Tower Guard at the ford, a wolf pack, the spiders and
 * the goblin outriders; Wren fights at the knight's side, the horse runs the King's Ride, four
 * friends hold Kilnholt's ring of kilns through the night; the 3D views; then, in the silence
 * on the music's peak, Sir Garrick on the Weeping Bridge: "Halt. No one crosses." The climax
 * is Act II's bosses (and the Bell-Ringer), and the four cross the bridge.
 *
 * To come in shorter than night.ts the climax skips sixteen beats of the track (it plays to
 * 116.822 and goes on from 125.241, where the music matches best either side: loops.py).
 */
/** The track's beat (114.02 bpm, its grid fitted by loops.py). */
const BEAT = 60 / 114.02;
/** The sixteen beats repeated before the peak (for the 3D views: night.ts). */
const D = 16 * BEAT;
const SEAM = 105 * BEAT;
const BACK = SEAM - D;
/** The climax: from 112.79 in the track; sixteen beats skipped, from K0 to K1. */
const CS = 62.0 + D;
const K0 = 222 * BEAT;
const K1 = 238 * BEAT;
/** Track time to the timeline, before the skip (C1) and after it (C2). */
const C1 = CS - 112.79;
const C2 = C1 - (K1 - K0);

export const NIGHT2: Edit = {
  name: 'quest-for-victoria-hold-the-night-act2',
  title: 'Hold the Night (with Act II)',
  // Five Armies comes hotter than the game's tracks (which are evened to -18 LUFS): down 6 dB so the fighting is heard
  mix: { music: 0.5, fx: 0.95, duck: 0.35 },
  uiSounds: true,
  music: [
    { track: 'fivearmies', at: 0, from: 0, dur: SEAM + 0.015, fadeOut: 0.03 },
    { track: 'fivearmies', at: SEAM - 0.015, from: BACK - 0.015, dur: 59.0 - BACK + 0.015, fadeIn: 0.03, fadeOut: 0.2 },
    { track: 'fivearmies', at: CS, from: 112.79, dur: K0 - 112.79 + 0.015, fadeIn: 0.03, fadeOut: 0.03 },
    { track: 'fivearmies', at: K0 + C1 - 0.015, from: K1 - 0.015, dur: 154.29 - K1 + 0.015, fadeIn: 0.03, fadeOut: 3 },
  ],
  // in the silence on the peak: "Halt." from inside his helm, then the rest of the line in his voice
  sfx: [
    { id: 'knightHalt', at: 57.91 + D + 0.2, gain: 1 },
    { id: 'garrickVoice', at: 57.91 + D + 1.1, gain: 0.9 },
    // thunder rolls in just before the climax lands (as night.ts has it)
    { id: 'thunderNear', at: 61.7 + D, gain: 0.7 },
  ],
  items: [
    { at: 0, card: true, text: [{ text: 'Corvalis is falling to the dark.', style: 'featureSmall', at: 0.25, dur: 1.75, fade: 0.4 }] },
    { at: 2.09, shot: 'a2_hollow', in: 2.0, t: 'flash', td: 0.2, grade: { g: 1.35, s: 1.1 } },
    { at: 5.15, card: true, text: [{ text: 'The dead rise|every night, from every grave', style: 'feature', at: 0.1, dur: 2.9, fade: 0.25 }] },
    { at: 8.15, shot: 'a2_kilnholt_dusk', in: 2.6 },
    { at: 11.08, card: true, text: [{ text: 'Gather. Craft. Survive.', style: 'feature', at: 0.1, dur: 3.0, fade: 0.25 }] },
    { at: 14.23, shot: 'g_chop', in: 0.3 },
    { at: 17.39, shot: 'g_mine', in: 0 },
    { at: 19.25, shot: 'g_forge', in: 1.0 },
    { at: 21.08, shot: 'g_inventory', in: 1.2, text: [{ text: 'Everything you wear shows on your hero', style: 'featureSmall', pos: 'high', at: 0.2, dur: 2.8, fade: 0.3 }] },
    { at: 24.26, shot: 'g_campfire', in: 1.0, text: [{ text: 'Build a fire before nightfall', style: 'featureSmall', pos: 'high', at: 0.2, dur: 2.7, fade: 0.3 }] },
    { at: 27.35, shot: 'a2_warrior_ford', in: 0.4, t: 'flash', td: 0.2, text: [{ text: 'Warrior|steel up close', style: 'feature', pos: 'high', at: 0.15, dur: 3.6, fade: 0.3 }] },
    { at: 31.5, shot: 'a2_wolves', in: 0.3 },
    { at: 34.6, shot: 'a2_spider', in: 1.4 },
    { at: 37.0, shot: 'a2_outriders', in: 0.4, text: [{ text: 'Archer|arrows from afar', style: 'feature', pos: 'high', at: 0.15, dur: 3.6, fade: 0.3 }] },
    { at: 41.2, shot: 'a2_wren', in: 0.6, text: [{ text: 'Wren fights at your side', style: 'featureSmall', pos: 'high', at: 0.3, dur: 2.6, fade: 0.3 }] },
    { at: 44.3, shot: 'a2_ride', in: 0.6, text: [{ text: 'Whistle up your horse', style: 'featureSmall', pos: 'high', at: 0.3, dur: 2.6, fade: 0.3 }] },
    { at: 47.5, shot: 'a2_coop_kilns', in: 0.4, text: [{ text: 'Play together|up to 8 friends, online', style: 'feature', pos: 'high', at: 0.15, dur: 3.8, fade: 0.3 }] },
    { at: 51.8, shot: 'a2_kilnholt_hold', in: 1.0, text: [{ text: 'Hold the night|keep the kilns burning till dawn', style: 'feature', pos: 'high', at: 0.15, dur: 3.0, fade: 0.3 }] },
    { at: 55.0, shot: 'g_3d_diorama', in: 0.3, text: [{ text: 'Play it in 3D|turn the world like a diorama', style: 'feature', pos: 'high', at: 0.2, dur: 5.0, fade: 0.35 }] },
    { at: SEAM + 10 * BEAT, shot: 'g_3d_pov', in: 1.2, t: 'fade', td: 0.35, text: [{ text: 'Point of view|walk it at eye level', style: 'feature', pos: 'high', at: 0.4, dur: 4.9, fade: 0.35 }] },
    { at: 57.91 + D, shot: 'a2_halt_scene', in: 0.9, t: 'flash', td: 0.15 },
    { at: CS, shot: 'a2_garrick_fight', in: 0.6, t: 'flash', td: 0.2 },
    { at: 115.8 + C1, shot: 'a2_broodmother', in: 1.0 },
    { at: K0 + C1 + 2 * BEAT, shot: 'g_boss', in: 1.4 },
    { at: 128.43 + C2, shot: 'a2_bonespine', in: 1.0 },
    { at: 130.01 + C2, shot: 'a2_thane', in: 1.5, grade: { g: 1.3 } },
    { at: 251 * BEAT + C2, shot: 'a2_garrick_roots', in: 1.0, text: [{ text: "Aldric's whistle stops him dead", style: 'featureSmall', pos: 'high', at: 1.6, dur: 2.8, fade: 0.3 }] },
    { at: 136.86 + C2, shot: 'a2_garrick_down', in: 1.9 },
    { at: 141.06 + C2, shot: 'a2_bridge_final', in: 0.9, text: [{ text: 'Rescue the Queen', style: 'feature', pos: 'high', at: 0.6, dur: 4.6, fade: 0.4 }] },
    { at: 148.0 + C2, logo: true, dur: 6.5, t: 'flash', td: 0.4, fadeOut: 1.5 },
  ],
};
