import type { Edit } from './types';

/**
 * Trailer 3, "Every Bell" (about 1:15, no interface): a slow teaser in the dark, under Kevin
 * MacLeod's "Ossuary 6 - Air", which swells up out of silence as the bell does. The bell that
 * tolls backwards, the grey postman's letter, Nan and the lace, the Bell-Ringer; the fighting in
 * flashes on the music's first swell (33-48 s); then, in the hush the track falls into
 * (92-93.5 s in it, 55.5-57 here), the proclamation's last words and the hand that signed them,
 * and the hit at 95 s (58.5 here). It hints at who is behind it all and says no more.
 */
export const BELL: Edit = {
  name: 'quest-for-victoria-every-bell',
  title: 'Every Bell',
  letterbox: 120,
  vignette: true,
  grade: { g: 1.08 },
  mix: { music: 0.9, fx: 0.8, duck: 0.15 },
  music: [
    { track: 'ossuary', at: 0, from: 0, dur: 49.6, fadeIn: 0.1, fadeOut: 1.4 },
    { track: 'ossuary', at: 49.5, from: 86.0, dur: 25.5, fadeIn: 0.4, fadeOut: 3.5 },
  ],
  sfx: [
    { id: 'bellToll', at: 0.8, gain: 0.9 },
    { id: 'bellToll', at: 7.6, gain: 0.7 },
    { id: 'nanVoice', at: 32.4, gain: 0.9 },
    { id: 'bellringerVoice', at: 37.8, gain: 0.95 },
    { id: 'bellringerVoice', at: 40.2, gain: 0.8, take: 1 },
    { id: 'bellringerVoice', at: 66.0, gain: 1, take: 2 },
    { id: 'bellToll', at: 69.3, gain: 1 },
  ],
  items: [
    { at: 0, card: true },
    {
      at: 3.0,
      shot: 'm_bell_tower',
      in: 0.3,
      t: 'black',
      td: 1.6,
      text: [{ text: 'Somewhere above the village, a bell begins to toll.', style: 'whisper', pos: 'low', at: 1.0, dur: 5.2, fade: 0.8 }],
    },
    { at: 11.0, shot: 'm_churchyard_slow', in: 0.5, t: 'fade', td: 1.0, text: [{ text: 'In the churchyard, the earth heaves.', style: 'whisper', pos: 'low', at: 1.0, dur: 4.4, fade: 0.7 }] },
    { at: 17.0, shot: 'm_postman', in: 1.0, t: 'fade', td: 1.0, text: [{ text: 'A grey stranger walks the lanes after dark.', style: 'whisper', pos: 'low', at: 1.2, dur: 5.0, fade: 0.7 }] },
    {
      at: 24.5,
      shot: 'm_letter',
      in: 0.8,
      t: 'fade',
      td: 0.8,
      text: [{ who: 'A letter on a doorstep. Seven years old.', text: 'Dear Father, I will do my duty.\nI will smile at his feasts, and sign what I am given.', style: 'voice', pos: 'low', at: 0.6, dur: 4.8, fade: 0.6 }],
    },
    { at: 30.0, card: true },
    { at: 31.5, shot: 'm_nan_night', in: 1.0, t: 'black', td: 0.8, text: [{ who: 'Nan Merrow', text: "That's from a wedding veil. Hers was white.", style: 'voice', pos: 'low', at: 0.7, dur: 4.4, fade: 0.5 }] },
    { at: 37.0, shot: 'm_ringer', in: 1.5, text: [{ who: 'The Bell-Ringer', text: 'Late… late for the knell… the King is dead…', style: 'voice', pos: 'low', at: 0.6, dur: 5.0, fade: 0.5 }] },
    { at: 43.0, shot: 'm_fight_ringer', in: 1.2, t: 'flash', td: 0.15 },
    { at: 44.6, shot: 'm_fight_whirl', in: 2.0 },
    { at: 45.8, shot: 'm_fight_hounds', in: 1.0 },
    { at: 47.0, shot: 'm_churchyard_slow', in: 2.9 },
    { at: 49.0, shot: 'm_proclamation', in: 1.0, t: 'black', td: 0.5, text: [{ text: '“Let every door be barred at sunset. Let no one go north.”', style: 'whisper', pos: 'low', at: 0.4, dur: 3.3, fade: 0.5 }] },
    { at: 52.5, shot: 'm_lake_rain', in: 1.0, t: 'fade', td: 0.6, text: [{ text: '“Let no one come for her.”', style: 'whisper', pos: 'low', at: 0.4, dur: 2.7, fade: 0.5 }] },
    {
      at: 55.5,
      card: true,
      text: [
        { text: 'And below it, in a small, fine hand:', style: 'loreSmall', pos: 'high', at: 0.15, dur: 2.85, fade: 0.4 },
        { text: 'Victoria R.', style: 'sign', at: 0.9, dur: 2.1, fade: 0.5 },
      ],
    },
    { at: 58.5, shot: 'm_thorns_storm', in: 1.6, t: 'flash', td: 0.35 },
    { at: 62.0, shot: 'm_party_chapel', in: 1.0 },
    { at: 65.5, card: true, text: [{ who: 'The Bell-Ringer', text: 'She hears… every bell…', style: 'voice', at: 0.4, dur: 3.0, fade: 0.5 }] },
    { at: 69.0, logo: true, dur: 6.0, t: 'black', td: 1.2, fadeOut: 1.4 },
  ],
};
