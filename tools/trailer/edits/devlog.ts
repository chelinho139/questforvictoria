import type { Edit } from './types';

/**
 * Devlog: "One world, three cameras" (about 1:35). The isometric pixel art turns out to be a
 * real 3D world; the diorama (turn, tilt, zoom); the point of view (behind the hero, and through
 * their eyes); one fight in all three cameras at once; night, rain and storm, fights and both
 * acts' places in 3D; switching with V. Under RandomMind's "Medieval: Exploration" (the
 * Greenmarch's own music, CC0), cut on its bars: 110 bpm, a bar 2.18 s, the first downbeat at
 * 2.134 s (its hits fall on them: 28.35, 67.62, 80.71...).
 */
const BAR = (4 * 60) / 110.005;
/** The start of bar k. */
const T = (k: number) => 2.134 + k * BAR;

export const DEVLOG: Edit = {
  name: 'quest-for-victoria-devlog-cameras',
  title: 'Devlog: One world, three cameras',
  mix: { music: 0.85, fx: 0.7, duck: 0.25 },
  uiSounds: true,
  music: [{ track: 'exploration', at: 0, from: 0, dur: T(40) + 5.5, fadeIn: 0.05, fadeOut: 5 }],
  items: [
    { at: 0, card: true, text: [{ text: 'Devlog|One world, three cameras', style: 'dev', at: 0.3, dur: 3.7, fade: 0.4 }] },
    // the reveal: the pixel art you play in is a 3D world (the diorama takes over 4 s in)
    {
      at: T(1),
      shot: 'dv_reveal',
      in: 0,
      t: 'black',
      td: 0.4,
      text: [
        { text: 'Isometric|the pixel-art view you play in', style: 'dev', pos: 'lowLeft', at: 0.3, dur: 3.4, fade: 0.35 },
        { text: '…is a real 3D world|every house, tree and hero stands up in it', style: 'dev', pos: 'lowLeft', at: 4.3, dur: 4.2, fade: 0.35 },
      ],
    },
    // the diorama
    { at: T(5), shot: 'dv_dio_mill', in: 0.3, text: [{ text: 'The diorama|turn it, tilt it, zoom it', style: 'dev', pos: 'lowLeft', at: 0.3, dur: 5.9, fade: 0.35 }] },
    { at: T(8), shot: 'dv_dio_kilnholt', in: 1.4 },
    // the point of view
    { at: T(10), shot: 'dv_pov_road', in: 0.6, text: [{ text: 'Point of view|walk behind your hero…', style: 'dev', pos: 'lowLeft', at: 0.3, dur: 3.9, fade: 0.35 }] },
    { at: T(12), shot: 'dv_pov_ride', in: 1.0, text: [{ text: '…or ride through their eyes', style: 'dev', pos: 'lowLeft', at: 0.3, dur: 3.9, fade: 0.35 }] },
    // one fight, all three cameras
    {
      at: T(14),
      grid: ['dv_tri_iso', 'dv_tri_dio', 'dv_tri_pov'],
      in: 0.2,
      t: 'flash',
      td: 0.2,
      text: [
        { text: 'Isometric', style: 'label', pos: 'qTL', at: 0.2, fade: 0.3 },
        { text: 'Diorama', style: 'label', pos: 'qTR', at: 0.2, fade: 0.3 },
        { text: 'Point of view', style: 'label', pos: 'qBL', at: 0.2, fade: 0.3 },
        { text: 'One fight|three cameras, the same moment', style: 'dev', pos: 'qBR', at: 0.4, fade: 0.3 },
      ],
    },
    // night, weather, fights
    { at: T(18), shot: 'dv_night_dio', in: 1.2, text: [{ text: 'Day and night|the lights carry into 3D', style: 'dev', pos: 'lowLeft', at: 0.3, dur: 8.2, fade: 0.35 }] },
    { at: T(20), shot: 'dv_night_pov', in: 1.0 },
    { at: T(22), shot: 'dv_rain_dio', in: 2.2, text: [{ text: 'Rain and storms', style: 'dev', pos: 'lowLeft', at: 0.3, dur: 8.2, fade: 0.35 }] },
    { at: T(24), shot: 'dv_storm_pov', in: 2.0 },
    { at: T(26), shot: 'dv_fight_dio', in: 1.0, text: [{ text: 'Fight in any view', style: 'dev', pos: 'lowLeft', at: 0.3, dur: 8.2, fade: 0.35 }] },
    { at: T(28), shot: 'dv_fight_pov', in: 1.4 },
    // everywhere
    { at: T(30), shot: 'dv_tower_dio', in: 1.4, text: [{ text: 'Everywhere|indoors and out, Act I and Act II', style: 'dev', pos: 'lowLeft', at: 0.3, dur: 8.4, fade: 0.35 }] },
    { at: T(32), shot: 'dv_camp_dio', in: 1.4 },
    { at: T(34), shot: 'dv_bridge_pov', in: 1.5 },
    // switching
    { at: T(36), shot: 'dv_switch', in: 0.6, t: 'flash', td: 0.15, text: [{ text: 'Press V|switch any time', style: 'dev', pos: 'high', at: 0.3, dur: 8.1, fade: 0.35 }] },
    { at: T(40), logo: true, dur: 5.5, t: 'black', td: 0.6, fadeOut: 1.6 },
  ],
};
