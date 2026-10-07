import type { Edit } from './types';

/**
 * "Hold the Night", short (about 52 s), for showing to people who don't play games (an
 * all-hands): the full trailer's shape in miniature. The intro on black ("Corvalis is falling
 * to the dark", the dead rising, "The dead rise"), the storm; on Five Armies' big entry the
 * fighting, one shot per idea (the warrior, the archer, friends together, the night held); the
 * 3D views; on the music's peak it stops dead and Sir Garrick says "Halt." into the silence;
 * thunder, and the climax: his fight, the Bell-Ringer, "Rescue the Queen", the logo.
 *
 * The music, cut on the track's beat grid (114.02 bpm) at the seams where it matches best
 * either side (seam.py): the intro to its first hits (0-11.08); from the section's entry (beat
 * 52, 27.36) to beat 76, on from beat 92 (harmony 0.85) to just past the peak (59.0); then the
 * climax from 112.79 to beat 222, on from beat 262 (0.95) to the end, faded over the logo.
 */
const BEAT = 60 / 114.02;
/** Where the intro ends and the section's big entry (beat 52) comes in. */
const INTRO = 11.08;
/** Beat k of the section on the timeline (beats 76-92 are left out). */
const s = (k: number) => INTRO + ((k <= 76 ? k : k - 16) - 52) * BEAT;
/** The peak (beat 110, 57.88), and the climax coming in after the silence. */
const PEAK = s(110);
const CS = PEAK + 3.2;
/** Climax: from 112.79 in the track; beats 222-262 are left out. */
const K0 = 222 * BEAT;
const K1 = 262 * BEAT;
const c = (track: number) => (track <= K0 ? CS + track - 112.79 : CS + K0 - 112.79 + track - K1);
const LOGO = c(145.01);

export const SHORT: Edit = {
  name: 'quest-for-victoria-hold-the-night-short',
  title: 'Hold the Night (short)',
  // Five Armies comes hotter than the game's tracks (which are evened to -18 LUFS): down 6 dB so the fighting is heard
  mix: { music: 0.5, fx: 0.95, duck: 0.35 },
  uiSounds: true,
  music: [
    { track: 'fivearmies', at: 0, from: 0, dur: INTRO - 0.02, fadeOut: 0.03 },
    { track: 'fivearmies', at: INTRO - 0.03, from: 52 * BEAT - 0.03, dur: 24 * BEAT + 0.045, fadeIn: 0.01, fadeOut: 0.03 },
    { track: 'fivearmies', at: s(92) - 0.015, from: 92 * BEAT - 0.015, dur: 59.0 - 92 * BEAT + 0.015, fadeIn: 0.03, fadeOut: 0.2 },
    { track: 'fivearmies', at: CS, from: 112.79, dur: K0 - 112.79 + 0.015, fadeIn: 0.03, fadeOut: 0.03 },
    { track: 'fivearmies', at: c(K1) - 0.015, from: K1 - 0.015, dur: 145.01 + 5.0 - K1 + 0.015, fadeIn: 0.03, fadeOut: 4.2 },
  ],
  sfx: [
    { id: 'knightHalt', at: PEAK + 0.2, gain: 1 },
    { id: 'garrickVoice', at: PEAK + 1.1, gain: 0.9 },
    { id: 'thunderNear', at: CS - 0.3, gain: 0.7 },
  ],
  items: [
    // the intro, on black and in flashes
    { at: 0, card: true, text: [{ text: 'Corvalis is falling to the dark.', style: 'featureSmall', at: 0.25, dur: 1.75, fade: 0.4 }] },
    { at: 2.09, shot: 's1_barrow_nightfall', in: 3.5, t: 'flash', td: 0.2 },
    { at: 5.15, card: true, text: [{ text: 'The dead rise|every night, from every grave', style: 'feature', at: 0.1, dur: 2.9, fade: 0.25 }] },
    { at: 8.15, shot: 'g_storm_dusk', in: 0.4 },
    // the big entry: one shot per idea
    { at: s(52), shot: 'a2_warrior_ford', in: 0.4, t: 'flash', td: 0.2, text: [{ text: 'Warrior|steel up close', style: 'feature', pos: 'high', at: 0.15, dur: 2.9, fade: 0.25 }] },
    { at: s(58), shot: 'g_archer_volley', in: 0.4, text: [{ text: 'Archer|arrows from afar', style: 'feature', pos: 'high', at: 0.15, dur: 2.9, fade: 0.25 }] },
    { at: s(64), shot: 'g_coop', in: 0.4, text: [{ text: 'Play together|up to 8 friends, online', style: 'feature', pos: 'high', at: 0.15, dur: 2.9, fade: 0.25 }] },
    { at: s(70), shot: 'a2_kilnholt_hold', in: 1.0, text: [{ text: 'Hold the night|keep the fires burning till dawn', style: 'feature', pos: 'high', at: 0.15, dur: 2.9, fade: 0.25 }] },
    // the 3D views
    { at: s(92), shot: 'g_3d_diorama', in: 0.3, text: [{ text: 'Play it in 3D|turn the world like a diorama', style: 'feature', pos: 'high', at: 0.2, dur: 3.8, fade: 0.3 }] },
    { at: s(100), shot: 'g_3d_pov_rain', in: 1.3, t: 'fade', td: 0.3, text: [{ text: 'Point of view|walk it at eye level', style: 'feature', pos: 'high', at: 0.3, dur: 4.7, fade: 0.3 }] },
    // the peak: the music stops dead, and the knight on the bridge
    { at: PEAK, shot: 'a2_halt_scene', in: 0.9, t: 'flash', td: 0.15 },
    // the climax
    { at: CS, shot: 'a2_garrick_fight', in: 0.6, t: 'flash', td: 0.2 },
    { at: c(K1), shot: 'g_boss', in: 1.4 },
    { at: c(141.06), shot: 'a2_bridge_final', in: 0.9, text: [{ text: 'Rescue the Queen', style: 'feature', pos: 'high', at: 0.3, dur: 3.5, fade: 0.3 }] },
    { at: LOGO, logo: true, dur: 5.0, t: 'flash', td: 0.4, fadeOut: 1.4 },
  ],
};
