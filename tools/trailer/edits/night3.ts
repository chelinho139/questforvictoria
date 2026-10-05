import type { Edit } from './types';

/**
 * Trailer 2, "Hold the Night", both acts (about 1:20, the interface in view): night.ts's opening,
 * then Act I and Act II by turns. The fights section plays as the music has it (no repeat, no
 * cut: thirty seconds from the first big hit to the peak), with the 3D views keeping their eleven
 * seconds at its end. To come in at 1:20 the music loses twelve beats of the build (it plays to
 * 17.365 and goes on from 23.680) and thirty-two of the climax (to 116.822, on from 133.661),
 * both where it matches best either side (loops.py).
 *
 * Act I: the barrow at nightfall, a thunderstorm over Millbrook as the day dial turns to night,
 * chopping in the rain and forging in the Greenmarch, Whirlwind
 * among the risen dead, the archer on the goblin camp, four friends against the ogre, the 3D
 * views of Millbrook (the point of view in the rain), the Bell-Ringer. Act II: the gear on the hero, the Tower Guard at the ford,
 * Wren, Kilnholt's ring of kilns, Sir Garrick on the Weeping Bridge, the Brood Mother, the Thane,
 * the roots and Aldric's whistle, the crossing.
 */
/** The track's beat (114.02 bpm, its grid fitted by loops.py). */
const BEAT = 60 / 114.02;
/** The build loses twelve beats: track time after G1 comes S earlier. */
const G0 = 33 * BEAT;
const G1 = 45 * BEAT;
const S = G1 - G0;
/** Track time in the first half (after the build's skip) to the timeline. */
const t = (track: number) => (track <= G0 ? track : track - S);
/** The climax: from 112.79 in the track, at CS; thirty-two beats skipped, from K0 to K1. */
const CS = 62.0 - S;
const K0 = 222 * BEAT;
const K1 = 254 * BEAT;
const c = (track: number) => (track <= K0 ? CS + track - 112.79 : CS + K0 - 112.79 + track - K1);

export const NIGHT3: Edit = {
  name: 'quest-for-victoria-hold-the-night-mix',
  title: 'Hold the Night (Act I and II)',
  // Five Armies comes hotter than the game's tracks (which are evened to -18 LUFS): down 6 dB so the fighting is heard
  mix: { music: 0.5, fx: 0.95, duck: 0.35 },
  uiSounds: true,
  music: [
    { track: 'fivearmies', at: 0, from: 0, dur: G0 + 0.015, fadeOut: 0.03 },
    { track: 'fivearmies', at: G0 - 0.015, from: G1 - 0.015, dur: 59.0 - G1 + 0.015, fadeIn: 0.03, fadeOut: 0.2 },
    { track: 'fivearmies', at: CS, from: 112.79, dur: K0 - 112.79 + 0.015, fadeIn: 0.03, fadeOut: 0.03 },
    { track: 'fivearmies', at: c(K0) - 0.015, from: K1 - 0.015, dur: 154.29 - K1 + 0.015, fadeIn: 0.03, fadeOut: 3 },
  ],
  // in the silence on the peak: "Halt." from inside his helm, then the rest of the line in his voice; thunder as the climax lands
  sfx: [
    { id: 'knightHalt', at: t(57.91) + 0.2, gain: 1 },
    { id: 'garrickVoice', at: t(57.91) + 1.1, gain: 0.9 },
    { id: 'thunderNear', at: CS - 0.3, gain: 0.7 },
  ],
  items: [
    // the opening, as night.ts has it
    { at: 0, card: true, text: [{ text: 'Corvalis is falling to the dark.', style: 'featureSmall', at: 0.25, dur: 1.75, fade: 0.4 }] },
    { at: 2.09, shot: 's1_barrow_nightfall', in: 3.5, t: 'flash', td: 0.2 },
    { at: 5.15, card: true, text: [{ text: 'The dead rise|every night, from every grave', style: 'feature', at: 0.1, dur: 2.9, fade: 0.25 }] },
    { at: 8.15, shot: 'g_storm_dusk', in: 0.4 },
    { at: 11.08, card: true, text: [{ text: 'Gather. Craft. Survive.', style: 'feature', at: 0.1, dur: 3.0, fade: 0.25 }] },
    // gathering and making
    { at: 14.23, shot: 'g_chop_rain', in: 0.3 },
    { at: 31 * BEAT, shot: 'g_forge', in: 1.0 },
    { at: t(24.26), shot: 'g_inventory', in: 1.2, text: [{ text: 'Everything you wear shows on your hero', style: 'featureSmall', pos: 'high', at: 0.2, dur: 2.7, fade: 0.3 }] },
    // the fights, a phrase (six beats) each, Act I and Act II by turns
    { at: t(27.35), shot: 'a2_warrior_ford', in: 0.4, t: 'flash', td: 0.2, text: [{ text: 'Warrior|steel up close', style: 'feature', pos: 'high', at: 0.15, dur: 2.9, fade: 0.3 }] },
    { at: t(30.56), shot: 'g_warrior_whirl', in: 0.2 },
    { at: t(33.69), shot: 'g_archer_volley', in: 0.4, text: [{ text: 'Archer|arrows from afar', style: 'feature', pos: 'high', at: 0.15, dur: 2.8, fade: 0.3 }] },
    { at: t(70 * BEAT), shot: 'a2_wren', in: 0.6, text: [{ text: 'Wren fights at your side', style: 'featureSmall', pos: 'high', at: 0.3, dur: 2.6, fade: 0.3 }] },
    { at: t(76 * BEAT), shot: 'g_coop', in: 0.4, text: [{ text: 'Play together|up to 8 friends, online', style: 'feature', pos: 'high', at: 0.15, dur: 2.9, fade: 0.3 }] },
    { at: t(82 * BEAT), shot: 'a2_kilnholt_hold', in: 1.0, text: [{ text: 'Hold the night|keep the kilns burning till dawn', style: 'feature', pos: 'high', at: 0.15, dur: 2.9, fade: 0.3 }] },
    // the 3D views
    { at: t(88 * BEAT), shot: 'g_3d_diorama', in: 0.3, text: [{ text: 'Play it in 3D|turn the world like a diorama', style: 'feature', pos: 'high', at: 0.2, dur: 4.8, fade: 0.35 }] },
    { at: t(98 * BEAT), shot: 'g_3d_pov_rain', in: 0.5, t: 'fade', td: 0.35, text: [{ text: 'Point of view|walk it at eye level', style: 'feature', pos: 'high', at: 0.4, dur: 5.4, fade: 0.35 }] },
    // the peak, and the silence: Sir Garrick on the Weeping Bridge
    { at: t(57.91), shot: 'a2_halt_scene', in: 0.9, t: 'flash', td: 0.15 },
    // the climax: the bosses of both acts
    { at: CS, shot: 'a2_garrick_fight', in: 0.6, t: 'flash', td: 0.2 },
    { at: c(115.8), shot: 'g_boss', in: 1.4 },
    { at: c(134.75), shot: 'a2_broodmother', in: 4.6 },
    { at: c(136.86), shot: 'a2_thane', in: 1.5, grade: { g: 1.3 } },
    { at: c(137.9), shot: 'a2_garrick_roots', in: 1.2, text: [{ text: "Aldric's whistle stops him dead", style: 'featureSmall', pos: 'high', at: 1.2, dur: 1.9, fade: 0.25 }] },
    { at: c(141.06), shot: 'a2_bridge_final', in: 0.9, text: [{ text: 'Rescue the Queen', style: 'feature', pos: 'high', at: 0.6, dur: 4.6, fade: 0.4 }] },
    { at: c(148.0), logo: true, dur: 5.5, t: 'flash', td: 0.4, fadeOut: 1.4 },
  ],
};
