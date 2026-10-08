import type { Edit } from './types';

/**
 * Dev blog 2 (October 2026, about a minute, the interface in view): what's new since the last
 * one. Most of it is the sorceress: her reveal, then fire, her gear, her talent trees, frost,
 * arcane on the peak, and the three classes together. Then, on the second peak, the rest:
 * the co-op revive, the new level-up, the horse's trot, Old Cobb and the thornlings, the Old
 * Briar. The logo to close.
 *
 * Music: "Medieval: The Bard's Tale" by RandomMind (CC0), from the game's own tracks
 * (public/music/bard.mp3; copy it to out/music). Its first peak runs from 39.92 s to 57.96 s
 * and its second from 117.49 s to 133.91 s (onsets.py): the cut plays the build and the first
 * peak to its strong hit at 50.34 s, then jumps to the second peak's first hit, and lets the
 * tail ring out under the logo.
 */
/** Timeline seconds for track time in the first stretch (the track from 13 s). */
const a = (track: number) => track - 13;
/** The jump: 50.34 s in the track, to 117.49 s. */
const J = a(50.34);
const b = (track: number) => J + track - 117.49;

export const DEVBLOG: Edit = {
  name: 'quest-for-victoria-dev-blog-2',
  title: 'Dev blog 2: the Sorceress',
  mix: { music: 0.62, fx: 0.95, duck: 0.3 },
  uiSounds: true,
  music: [
    { track: 'bard', at: 0, from: 13, dur: J + 0.015, fadeIn: 0.4, fadeOut: 0.03 },
    { track: 'bard', at: J - 0.015, from: 117.49 - 0.015, dur: 141.5 - 117.49, fadeIn: 0.03, fadeOut: 3.2 },
  ],
  items: [
    { at: 0, card: true, text: [{ text: 'Dev Blog|what we made since the last one', style: 'feature', at: 0.2, dur: 2.4, fade: 0.35 }] },
    // the sorceress
    { at: a(15.72), shot: 'db_reveal', in: 0.6, t: 'flash', td: 0.2, text: [{ text: 'New class|the Sorceress', style: 'feature', pos: 'high', at: 0.5, dur: 4.2, fade: 0.35 }] },
    { at: a(20.72), shot: 'db_fire', in: 0.5, text: [{ text: 'Fire|Ignite, Scorch and the great Pyroblast', style: 'feature', pos: 'high', at: 0.2, dur: 4.6, fade: 0.3 }] },
    { at: a(25.72), shot: 'db_gear', in: 0.9, text: [{ text: 'Her own gear|staves, grimoires and orbs, on her as you wear them', style: 'feature', pos: 'high', at: 0.2, dur: 4.1, fade: 0.3 }] },
    { at: a(30.22), shot: 'db_talents', in: 0.6, text: [{ text: 'Three talent trees|Fire, Frost and Arcane', style: 'feature', pos: 'low', at: 0.2, dur: 4.1, fade: 0.3 }] },
    { at: a(34.72), shot: 'db_frost', in: 0.4, text: [{ text: 'Frost|slow them, then freeze the pack', style: 'feature', pos: 'high', at: 0.2, dur: 4.8, fade: 0.3 }] },
    { at: a(39.92), shot: 'db_arcane', in: 0.5, t: 'flash', td: 0.2, text: [{ text: 'Arcane|a barrier, falling fire, leaping lightning', style: 'feature', pos: 'high', at: 0.2, dur: 4.9, fade: 0.3 }] },
    { at: a(45.12), shot: 'db_trio', in: 0.6, text: [{ text: 'Three classes|balanced by the numbers, mana and all', style: 'feature', pos: 'high', at: 0.2, dur: 4.8, fade: 0.3 }] },
    // the rest, on the second peak
    { at: J, shot: 'db_revive', in: 0.2, t: 'flash', td: 0.2, text: [{ text: 'Co-op revive|fall, and a friend can bring you back', style: 'feature', pos: 'high', at: 0.15, dur: 3.1, fade: 0.25 }] },
    { at: b(120.8), shot: 'db_levelup', in: 0.3, text: [{ text: 'Level up|a moment you will not miss', style: 'feature', pos: 'high', at: 0.15, dur: 2.8, fade: 0.25 }] },
    { at: b(123.8), shot: 'db_horse', in: 0.5, text: [{ text: 'A new horse|eight frames of trot', style: 'feature', pos: 'high', at: 0.15, dur: 2.8, fade: 0.25 }] },
    { at: b(126.8), shot: 'db_cobb', in: 0.4, text: [{ text: 'More Act I|Old Cobb and the walking thorns', style: 'feature', pos: 'high', at: 0.15, dur: 3.4, fade: 0.25 }] },
    { at: b(130.35), shot: 'db_briar', in: 0.8, text: [{ text: 'The Old Briar', style: 'feature', pos: 'high', at: 0.15, dur: 3.4, fade: 0.25 }] },
    { at: b(133.91), logo: true, dur: 6.2, t: 'flash', td: 0.35, fadeOut: 2.2 },
  ],
};
