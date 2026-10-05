import type { Edit } from './types';

/**
 * Trailer 1, "The Mirror" (about 1:37, no interface at all): the story as the realm tells it.
 * The lake at dawn and the green south under Kevin MacLeod's "Teller of the Tales"; then
 * "Some Amount of Evil" comes in on its first hit as night falls and the dead come up, and its
 * peak lands on the title. Lore in IM Fell English, letterboxed.
 *
 * Cut points sit on the music's onsets (analyze_music.py, onsets.py): Teller 8.99, 14.74, 19.81,
 * 23.52, 26.28, 31.37, 34.13, 40.59; Evil's opening hit at timeline 40.57, then 47.0, 54.27,
 * the big section at ~64.6, the peak at ~90.6.
 */
const EVIL = 40.57;

export const MIRROR: Edit = {
  name: 'quest-for-victoria-the-mirror',
  title: 'The Mirror',
  letterbox: 120,
  vignette: true,
  mix: { music: 0.85, fx: 0.75, duck: 0.25 },
  music: [
    { track: 'teller', at: 0, from: 0, dur: 41.6, fadeIn: 0.3, fadeOut: 1.4, gain: 1 },
    { track: 'evil', at: EVIL, from: 0, dur: 57.2, fadeIn: 0.02, fadeOut: 4.5, gain: 0.95 },
  ],
  sfx: [
    { id: 'thunderFar', at: 39.6, gain: 0.6 },
    { id: 'bellToll', at: 90.75, gain: 0.85 },
  ],
  items: [
    { at: 0, card: true, text: [{ text: 'They say the lake gives nothing back.', style: 'loreSmall', at: 0.4, dur: 2.9, fade: 0.6 }] },
    { at: 3.5, shot: 's1_lake_dawn', in: 0.5, t: 'black', td: 1.2, text: [{ text: 'Corvalis. The Heart-Valley.', style: 'lore', pos: 'low', at: 1.2, dur: 3.8, fade: 0.7 }] },
    { at: 9.0, shot: 's1_shore_wake', in: 0.4, t: 'fade', td: 0.9, text: [{ text: 'Not usually.', style: 'loreSmall', pos: 'low', at: 1.6, dur: 3, fade: 0.6 }] },
    {
      at: 14.74,
      shot: 's1_mill',
      in: 0.5,
      t: 'fade',
      td: 0.4,
      text: [{ text: 'Seven years ago, the King sold his daughter\nto pay for a war.', style: 'lore', pos: 'low', at: 0.5, dur: 4.4, fade: 0.6 }],
    },
    { at: 19.81, shot: 's1_village', in: 0.6 },
    { at: 23.52, shot: 's1_nan', in: 0.4, text: [{ text: 'Her old nurse still waits for her.', style: 'loreSmall', pos: 'low', at: 0.3, dur: 2.4, fade: 0.4 }] },
    {
      at: 26.28,
      shot: 's1_thornwall_dusk',
      in: 0.5,
      t: 'fade',
      td: 0.5,
      text: [{ text: 'The wizard took her north, to Thornhallow.\nShe was never seen again.', style: 'lore', pos: 'low', at: 0.5, dur: 4.4, fade: 0.6 }],
    },
    { at: 31.37, card: true, t: 'black', td: 0.3, text: [{ text: 'Forty days ago, the old King died.', style: 'lore', at: 0.2, dur: 2.5, fade: 0.4 }] },
    { at: 34.13, shot: 's1_barrow_nightfall', in: 0.6, t: 'black', td: 0.4, text: [{ text: '…and the dead began to rise.', style: 'lore', pos: 'low', at: 3.0, dur: 3.3, fade: 0.5 }] },
    { at: 40.59, shot: 's1_skeleton_rise', in: 0.2, t: 'flash', td: 0.25 },
    { at: 44.6, shot: 's1_churchyard', in: 1.6 },
    { at: 47.0, shot: 's1_storm_square', in: 0.5 },
    { at: 50.5, shot: 's1_hounds', in: 0.4, text: [{ text: 'Every night since.', style: 'lore', pos: 'low', at: 0.6, dur: 3.0, fade: 0.5 }] },
    {
      at: 54.27,
      shot: 's1_party_road',
      in: 0.5,
      t: 'black',
      td: 0.6,
      text: [{ text: 'The Steward calls for heroes.', style: 'lore', pos: 'low', at: 0.6, dur: 4.4, fade: 0.6 }],
    },
    {
      at: 59.5,
      shot: 's1_campfire_night',
      in: 1.6,
      t: 'fade',
      td: 0.5,
      text: [{ text: 'Ten thousand crowns to bring the Queen home.', style: 'loreSmall', pos: 'low', at: 0.4, dur: 4.3, fade: 0.5 }],
    },
    { at: 64.57, shot: 's1_charge', in: 0.4 },
    { at: 67.0, shot: 's1_volley', in: 0.8 },
    { at: 69.0, shot: 's1_fight_night', in: 1.0 },
    { at: 72.5, shot: 'm_fight_whirl', in: 0.6 },
    { at: 74.3, shot: 's1_ride', in: 0.6 },
    { at: 76.4, shot: 's1_bell_toll', in: 1.0 },
    { at: 80.4, shot: 'm_fight_ringer', in: 0.8 },
    { at: 82.6, shot: 's1_hero_portrait', in: 1.2, text: [{ text: 'Cross the dark.', style: 'lore', pos: 'low', at: 0.6, dur: 3.1, fade: 0.5 }] },
    { at: 86.5, shot: 's1_final_thorns', in: 1.5, text: [{ text: 'Bring her home.', style: 'lore', pos: 'low', at: 0.6, dur: 3.3, fade: 0.5 }] },
    { at: 90.57, logo: true, dur: 7.2, t: 'flash', td: 0.5, fadeOut: 1.6 },
  ],
};
