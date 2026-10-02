import type { NpcId } from './npcs';
import type { At } from './regions/types';
import type { Effect } from './story';

/**
 * Scripted scenes: the camera, speech and story beats that the game plays out while you
 * watch (the arrival on the lakeshore, a boss's entrance, the false victory, the ending).
 * Steps run in order; `say` waits for a click (or Space / Enter).
 */
export type SceneStep =
  /** A line in the scene box. `who` is an NPC, or any name in quotes for someone else. */
  | { say: string; who?: NpcId | string }
  | { wait: number }
  /** Fade to or from black (seconds). */
  | { fade: 'out' | 'in'; s?: number }
  /** Look at a tile, or back at the hero. */
  | { look: At | 'player' }
  | { banner: string }
  /** Flags, documents, items (an Effect without a nested scene). */
  | { effect: Omit<Effect, 'scene'> };

export interface SceneDef {
  steps: SceneStep[];
}

export const SCENES: Record<string, SceneDef> = {
  // ---- Prologue and Act I (docs/act1.md)
  // a new game: the lake gives the heroes back
  lake_wake: {
    steps: [
      { fade: 'out', s: 0 },
      { wait: 0.8 },
      { say: 'Water. Cold water, and a voice somewhere above it.', who: 'Narrator' },
      { say: 'Breathe. Come on. Breathe, blast you.', who: 'aldric' },
      { fade: 'in', s: 1.6 },
      { look: 'player' },
      { say: "There. Back among the living. The lake doesn't give things back, you know. Not usually.", who: 'aldric' },
      { say: 'Up you get. Slowly. When you can walk, come and find me by my tent.', who: 'aldric' },
    ],
  },
  // first arrival in Millbrook: the Steward's herald in the square
  herald: {
    steps: [
      { look: [38, 23] },
      { say: 'Hear ye! By order of the Lady Isolde Vane, Steward of Corvalis and Hand of the late King!', who: 'pike' },
      { say: "Ten thousand crowns to whoever brings Her Majesty Queen Victoria out of the wizard's tower! Ten thousand crowns!", who: 'pike' },
      { say: "Ten thousand crowns. And not one of the Steward's soldiers north of Ashford.", who: 'A villager' },
      { say: "Bar your doors at sunset. That's all the Steward ever sends us. Bounties and advice.", who: 'Another villager' },
      { look: 'player' },
      { effect: { flags: ['heard_herald'] } },
    ],
  },
  // the first night in Millbrook: the bell rings backwards and the churchyard opens
  bell_backwards: {
    steps: [
      { say: 'Somewhere above the village a bell begins to toll.', who: 'Narrator' },
      { look: [46, 11] },
      { say: 'Wrong, somehow. Each stroke swells up out of silence and stops dead, as if the sound were being sucked back into the bronze.', who: 'Narrator' },
      { look: [53, 11] },
      { say: 'In the churchyard, the earth heaves.', who: 'Narrator' },
      { say: 'Inside! Everyone inside! Bar the doors!', who: 'odo' },
      { look: 'player' },
      { effect: { flags: ['millbrook_night'] } },
    ],
  },
  // at the top of the stair
  belfry: {
    steps: [
      { look: [10, 6] },
      { say: 'Under the cracked bell, an old man in a sexton\'s coat hauls on a rope that is not there.', who: 'Narrator' },
      { say: 'Late... late for the knell... the King is dead... the King is dead...', who: 'The Bell-Ringer' },
      { say: 'He turns. There is black lace knotted round his arm.', who: 'Narrator' },
      { look: 'player' },
    ],
  },
  // the Bell-Ringer falls
  bellringer_down: {
    steps: [
      { say: 'She hears... every bell...', who: 'The Bell-Ringer' },
      { say: 'The bell gives one last crack, and is silent.', who: 'Narrator' },
      { effect: { docs: ['lace_1'] } },
    ],
  },
  // the end of Act I, at Nan's
  nan_lace: {
    steps: [
      { say: 'What did he have on his arm? Show me. Lace. Black lace.', who: 'nan' },
      { say: "That's from a wedding veil. Hers was white. Her mother's veil, Elowen's. I took up the hem myself, the night before.", who: 'nan' },
      { say: 'That monster tore it up and gave it to his creatures. Like a favour. Like she was his to give.', who: 'nan' },
      { say: 'Nan turns the lace over in her hands for a long time, and says nothing more.', who: 'Narrator' },
      { banner: 'ACT I COMPLETE' },
      { effect: { flags: ['act1_done'] } },
    ],
  },

  // Plays in the dev Test Field the first time you arrive, to show the system works.
  dev_hello: {
    steps: [
      { fade: 'in', s: 0.6 },
      { look: [5, 3] },
      { say: 'A slime. It has not noticed you.', who: 'Narrator' },
      { look: 'player' },
      { say: 'Scenes can talk, move the camera, set flags and hand you things.', who: 'Narrator' },
      { effect: { docs: ['test_note'] } },
      { banner: 'SCENE OVER' },
    ],
  },
};
