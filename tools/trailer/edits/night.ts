import type { Edit } from './types';

/**
 * Trailer 2, "Hold the Night" (about 1:52, the interface in view): the game as you play it, cut
 * to Kevin MacLeod's "Five Armies". Its opening hits (2.09, 5.15, 8.15, 11.08, 14.23) carry the
 * first glimpses and titles; the build (14.2-27.4) is gathering and making; the full section
 * (27.35-57.91) is the classes, the horse, co-op and the night, and then the 3D views: there the
 * music repeats sixteen beats (it plays to 55.253 and goes back to 46.834, the seam where the
 * harmony matches best either side: loops.py), so the diorama and the point of view get eleven
 * seconds between them. On the peak (57.91 in the track, 66.33 here) the music stops dead, a
 * bell tolls into the silence, and the climax (from 112.79 in the track) is the Bell-Ringer and
 * the fighting, ending on the title as it decays.
 */
/** The track's beat (114.02 bpm, its grid fitted by loops.py), and the sixteen repeated beats. */
const BEAT = 60 / 114.02;
const D = 16 * BEAT;
const SEAM = 105 * BEAT;
const BACK = SEAM - D;
const B = 62.0 + D - 112.79;

export const NIGHT: Edit = {
  name: 'quest-for-victoria-hold-the-night',
  title: 'Hold the Night',
  // Five Armies comes hotter than the game's tracks (which are evened to -18 LUFS): down 6 dB so the fighting is heard
  mix: { music: 0.5, fx: 0.95, duck: 0.35 },
  uiSounds: true,
  music: [
    { track: 'fivearmies', at: 0, from: 0, dur: SEAM + 0.015, fadeOut: 0.03 },
    { track: 'fivearmies', at: SEAM - 0.015, from: BACK - 0.015, dur: 59.0 - BACK + 0.015, fadeIn: 0.03, fadeOut: 0.2 },
    { track: 'fivearmies', at: 62.0 + D, from: 112.79, dur: 41.5, fadeIn: 0.03, fadeOut: 3 },
  ],
  sfx: [
    { id: 'bellToll', at: 59.35 + D, gain: 1 },
    { id: 'thunderNear', at: 61.7 + D, gain: 0.7 },
  ],
  items: [
    { at: 0, card: true, text: [{ text: 'Corvalis is falling to the dark.', style: 'featureSmall', at: 0.25, dur: 1.75, fade: 0.4 }] },
    { at: 2.09, shot: 's1_barrow_nightfall', in: 3.5, t: 'flash', td: 0.2 },
    { at: 5.15, card: true, text: [{ text: 'The dead rise|every night, from every grave', style: 'feature', at: 0.1, dur: 2.9, fade: 0.25 }] },
    { at: 8.15, shot: 'g_daynight', in: 2.0 },
    { at: 11.08, card: true, text: [{ text: 'Gather. Craft. Survive.', style: 'feature', at: 0.1, dur: 3.0, fade: 0.25 }] },
    { at: 14.23, shot: 'g_chop', in: 0.3 },
    { at: 17.39, shot: 'g_mine', in: 0 },
    { at: 19.25, shot: 'g_forge', in: 1.0 },
    { at: 21.08, shot: 'g_inventory', in: 1.2, text: [{ text: 'Everything you wear shows on your hero', style: 'featureSmall', pos: 'high', at: 0.2, dur: 2.8, fade: 0.3 }] },
    { at: 24.26, shot: 'g_campfire', in: 1.0, text: [{ text: 'Build a fire before nightfall', style: 'featureSmall', pos: 'high', at: 0.2, dur: 2.7, fade: 0.3 }] },
    { at: 27.35, shot: 'g_warrior_charge', in: 0.4, t: 'flash', td: 0.2, text: [{ text: 'Warrior|steel up close', style: 'feature', pos: 'high', at: 0.15, dur: 3.6, fade: 0.3 }] },
    { at: 31.5, shot: 'g_warrior_whirl', in: 0.2 },
    { at: 34.6, shot: 'g_shaman', in: 0.6 },
    { at: 37.0, shot: 'g_archer_volley', in: 0.4, text: [{ text: 'Archer|arrows from afar', style: 'feature', pos: 'high', at: 0.15, dur: 3.6, fade: 0.3 }] },
    { at: 41.2, shot: 'g_archer_trap', in: 1.2 },
    { at: 44.3, shot: 'g_mount', in: 0.6, text: [{ text: 'Whistle up your horse', style: 'featureSmall', pos: 'high', at: 0.3, dur: 2.6, fade: 0.3 }] },
    { at: 47.5, shot: 'g_coop', in: 0.4, text: [{ text: 'Play together|up to 8 friends, online', style: 'feature', pos: 'high', at: 0.15, dur: 3.8, fade: 0.3 }] },
    { at: 51.8, shot: 'g_hounds', in: 0.8 },
    { at: 55.0, shot: 'g_3d_diorama', in: 0.3, text: [{ text: 'Play it in 3D|turn the world like a diorama', style: 'feature', pos: 'high', at: 0.2, dur: 5.0, fade: 0.35 }] },
    { at: SEAM + 10 * BEAT, shot: 'g_3d_pov', in: 1.2, t: 'fade', td: 0.35, text: [{ text: 'Point of view|walk it at eye level', style: 'feature', pos: 'high', at: 0.4, dur: 4.9, fade: 0.35 }] },
    { at: 57.91 + D, shot: 's1_bell_toll', in: 1.35, t: 'flash', td: 0.15 },
    { at: 59.0 + D, card: true, text: [{ text: 'The bell tolls backwards', style: 'feature', at: 0.6, dur: 2.3, fade: 0.4 }] },
    { at: 62.0 + D, shot: 'g_boss', in: 0.3, t: 'flash', td: 0.2 },
    { at: 115.8 + B, shot: 's1_bell_toll', in: 4.5 },
    { at: 119.75 + B, shot: 'm_fight_whirl', in: 1.0 },
    { at: 122.11 + B, shot: 's1_charge', in: 1.6 },
    { at: 124.23 + B, shot: 'g_boss', in: 3.6, text: [{ text: 'Hold the night', style: 'feature', pos: 'high', at: 0.2, dur: 3.7, fade: 0.3 }] },
    { at: 128.43 + B, shot: 'm_fight_hounds', in: 1.0 },
    { at: 130.01 + B, shot: 's1_fight_night', in: 3.2 },
    { at: 134.75 + B, shot: 's1_volley', in: 2.8 },
    { at: 136.86 + B, shot: 'g_boss_down', in: 1.2 },
    { at: 141.06 + B, shot: 's1_final_thorns', in: 0.9, text: [{ text: 'Rescue the Queen', style: 'feature', pos: 'high', at: 0.6, dur: 4.6, fade: 0.4 }] },
    { at: 148.0 + B, logo: true, dur: 6.5, t: 'flash', td: 0.4, fadeOut: 1.5 },
  ],
};
