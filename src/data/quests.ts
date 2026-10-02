import type { ItemId } from './items';
import type { EnemyKind } from './enemies';
import type { StructureKind } from './crafting';
import type { NpcId } from './npcs';
import type { At } from './regions/types';
import type { Cond, Effect } from './story';

/**
 * Quests: you take them from an NPC (a gold ! over their head), do what they ask, then go
 * back to them (or to `turnIn`) to hand it in (a gold ?). Goals count only after you
 * accept. A quest that `requires` another becomes available once that one is handed in;
 * `when` can hold it back further (a story flag, a level).
 */

export type Goal =
  | { kind: 'kill'; enemy: EnemyKind; n: number; label: string }
  | { kind: 'build'; build: StructureKind; n: number; label: string }
  | { kind: 'craft'; recipe: string; n: number; label: string }
  /** Be within `r` px of tile `at` in `region` (or of world point x,y in any region). */
  | { kind: 'reach'; region?: string; at?: At; x?: number; y?: number; r: number; label: string }
  /** Talk to someone. */
  | { kind: 'talk'; npc: NpcId; label: string }
  /** Have `n` of an item in your bag (handed over at the end when `take`). */
  | { kind: 'collect'; item: ItemId; n: number; take?: boolean; label: string }
  /** Use an object in the world (a notice board, a bell rope; data/regions objects), or `n` objects of a kind. */
  | { kind: 'interact'; object: string; label: string }
  | { kind: 'interact'; objectKind: string; n: number; label: string }
  /** Something has happened (a story flag is set). */
  | { kind: 'flag'; flag: string; label: string };

export interface QuestDef {
  name: string;
  giver: NpcId;
  /** Who you hand it in to, if not the giver. */
  turnIn?: NpcId;
  requires?: string;
  when?: Cond;
  /** Main story quests list first in the log and the tracker. */
  main?: boolean;
  /** Story effects when you accept it and when you hand it in. */
  onAccept?: Effect;
  onDone?: Effect;
  /** What the giver says when offering it (one page at a time). */
  offer: string[];
  /** One line for the tracker and journal. */
  summary: string;
  goals: Goal[];
  reward: { gold: number; xp: number; items: ItemId[]; docs?: string[] };
  /** What the giver says when you hand it in. */
  done: string;
  /** What the giver says while you're still at it. */
  waiting: string;
}

export const QUESTS: Record<string, QuestDef> = {
  // ---------------------------------------------------------------- the Prologue (Greenmarch)
  slime_meadow: {
    name: 'Slime in the Meadow',
    giver: 'aldric',
    main: true,
    offer: [
      "The slimes are eating the cows' clover, and the odd boot. Clear three of them out of the meadow and I'll find you something for your feet.",
    ],
    summary: 'Slay three slimes in the meadow.',
    goals: [{ kind: 'kill', enemy: 'slime', n: 3, label: 'Slimes slain' }],
    reward: { gold: 15, xp: 20, items: ['leather_boots'] },
    waiting: 'Three slimes. They bounce, but they burst all the same.',
    done: "Ha! Not bad for someone who couldn't stand this morning. Here, my old boots. They've walked further than you have.",
  },
  warm_meal: {
    name: 'A Warm Meal',
    giver: 'aldric',
    requires: 'slime_meadow',
    offer: [
      "You can't fight on an empty stomach. Fell a tree for logs, build a campfire and cook two cuts of meat. The cows won't mind. Much.",
      'Open your crafting (K) to build the fire, and cook while you stand next to it.',
    ],
    summary: 'Build a campfire and cook two cuts of meat.',
    goals: [
      { kind: 'build', build: 'campfire', n: 1, label: 'Campfire built' },
      { kind: 'craft', recipe: 'cooked_meat', n: 2, label: 'Meat cooked' },
    ],
    reward: { gold: 15, xp: 20, items: ['leather_tunic'] },
    waiting: 'Logs for the fire, meat for the pan. The meadow has both.',
    done: "Smells like home. Take this tunic. The nights get cold out here, and the dead don't care.",
  },
  stone_and_fire: {
    name: 'Stone and Fire',
    giver: 'aldric',
    requires: 'warm_meal',
    offer: [
      'A Warden needs a forge. Break rocks for stone and build one: eight stone and a couple of logs should do it.',
      'Slow work without a pick, I know. Do it anyway.',
    ],
    summary: 'Mine stone and build a forge.',
    goals: [{ kind: 'build', build: 'forge', n: 1, label: 'Forge built' }],
    reward: { gold: 20, xp: 25, items: ['pickaxe'] },
    waiting: 'Eight stone, two logs, and a strong back.',
    done: 'A fine forge! Here, my old pickaxe. Mining goes a lot faster with the proper tool.',
  },
  warden_steel: {
    name: "Warden's Steel",
    giver: 'aldric',
    requires: 'stone_and_fire',
    offer: [
      "That rusty blade won't stop what walks at night. Mine iron ore in the eastern hills, smelt it into bars at your forge, and forge yourself a proper iron sword.",
    ],
    summary: 'Smelt iron and forge an iron sword.',
    goals: [{ kind: 'craft', recipe: 'iron_sword', n: 1, label: 'Iron sword forged' }],
    reward: { gold: 30, xp: 30, items: ['edric_helm'] },
    waiting: 'Ore, bars, then the blade. Three bars for a sword, and a log for the grip.',
    done: "Now that is a Warden's blade. Wear this helm with it. It was my brother Edric's. He'd want it out on the road, not hanging in my tent.",
  },
  hollow_night: {
    name: 'The Hollow Night',
    giver: 'aldric',
    requires: 'warden_steel',
    main: true,
    offer: [
      'When the sun goes down, the dead climb out of the old barrows. There are two in the Greenmarch: one in the north-west woods, one in the south-east meadow.',
      'Put three of them back in the ground. Rest by a fire if you must, and watch your back.',
    ],
    summary: 'Slay three skeletons. They rise from the barrows at night.',
    goals: [{ kind: 'kill', enemy: 'skeleton', n: 3, label: 'Skeletons slain' }],
    reward: { gold: 40, xp: 35, items: ['chainmail'] },
    waiting: 'They rise when the sun sets. Be ready.',
    done: 'You came back. On the first Hollow Night, I was the only one who did. Take this mail. You have earned the right to wear it.',
  },
  road_north: {
    name: 'The Road North',
    giver: 'aldric',
    turnIn: 'nan',
    requires: 'hollow_night',
    main: true,
    offer: [
      "You're ready, or near enough. Before you go, read what's nailed to the board by my tent. You should know what we're up against.",
      'Then take the north road to Millbrook and find Nan Merrow. An old woman with sharp eyes and a soft voice. She nursed the queen when she was a girl.',
      "And take this. It was the queen's. The old queen, Elowen, Victoria's mother. She gave it to the Wardens the year the girl was born. It has kept better people than me alive.",
    ],
    onAccept: { items: ['elowen_amulet'] },
    summary: 'Read the proclamation at the camp, then take the north road to Millbrook and find Nan Merrow.',
    goals: [
      { kind: 'interact', object: 'proclamation', label: 'Read the proclamation' },
      { kind: 'reach', region: 'millbrook', at: [38, 30], r: 900, label: 'Reach Millbrook' },
      { kind: 'talk', npc: 'nan', label: 'Find Nan Merrow' },
    ],
    reward: { gold: 20, xp: 30, items: [] },
    waiting: 'North, to Millbrook. Follow the road round the east shore.',
    done: "Aldric sent you? The old goat. He was always sending me strays. Well. You'd better come in, then.",
  },

  // ---------------------------------------------------------------- Act I (Millbrook)
  steward_bounty: {
    name: "The Steward's Bounty",
    giver: 'pike',
    main: true,
    offer: [
      "You heard the proclamation. Ten thousand crowns, from the Steward's own treasury, to whoever brings the queen out of Thornhallow.",
      'Take a notice off the board, so the Steward knows you answered. Then you are on the books, and on your own.',
    ],
    summary: "Take the Steward's bounty notice from the herald's board.",
    goals: [{ kind: 'interact', object: 'bounty_board', label: 'Take a bounty notice' }],
    reward: { gold: 30, xp: 40, items: [] },
    waiting: 'The board, by the well. Take a notice.',
    done: "You're on the books. If you live to see Ashford, show them that notice. If you don't, I'll cross you off.",
  },
  nans_pages: {
    name: "Nan's Pages",
    giver: 'nan',
    main: true,
    offer: [
      "Since the bells started, pages have been blowing down the Lisle on the night wind. Out of the north. I find them in the reeds, in the hedges, stuck to the mill wheel.",
      "It's her hand. Victoria's. I'd know it anywhere. Pages of a diary she kept when she was a girl.",
      "Read them. I want someone else to know who she was. Before him. Before all of this.",
    ],
    onAccept: { docs: ['diary_1', 'diary_2', 'diary_3'] },
    summary: "Read the diary pages Nan gave you (J, the Journal tab).",
    goals: [
      { kind: 'flag', flag: 'read:diary_1', label: 'Read the first page' },
      { kind: 'flag', flag: 'read:diary_2', label: 'Read the second page' },
      { kind: 'flag', flag: 'read:diary_3', label: 'Read the third page' },
    ],
    reward: { gold: 0, xp: 40, items: ['bread', 'bread'] },
    waiting: 'Take your time. Press J and open the Journal. The pages are in there.',
    done: '"Then no one will have Marcian." She didn\'t understand what he meant. Neither did I, then. Have some bread, dear. I need a moment.',
  },
  thorns_fences: {
    name: 'Thorns in the Fences',
    giver: 'nan',
    requires: 'nans_pages',
    offer: [
      'Have you seen the fields? Black thorns, coming up through the crops like they were planted. Cold to the touch. Nothing that grows should be that cold.',
      "Burn them out before they spread. There are shoots all through the south fields. Six should slow them down. Bring me one, I want to see.",
    ],
    summary: 'Burn six black thorn shoots in the fields south of the village.',
    goals: [
      { kind: 'interact', objectKind: 'thorn', n: 6, label: 'Thorn shoots burned' },
      { kind: 'collect', item: 'black_thorn', n: 1, take: true, label: 'Bring Nan a black thorn' },
    ],
    reward: { gold: 15, xp: 50, items: ['bread', 'bandage'] },
    waiting: 'Six shoots. Mind your fingers, they bite.',
    done: "Look at it. Black right through. They say it's his magic gone rotten, up in the north, leaking down the river like a bad drain. I believe it.",
  },
  lamp_window: {
    name: 'The Lamp in the Window',
    giver: 'maud',
    offer: [
      'They say you came up from the lake, past Aldric\'s camp. Aldric trained my boy. He was the last to look for him, when the King\'s men had stopped pretending to.',
      "He won't talk to me about it. Seven years, and he won't. Ask him for me. Ask him what he found.",
    ],
    summary: 'Ask Aldric, back in the Greenmarch, what happened to Marcian. Then tell Maud.',
    goals: [{ kind: 'flag', flag: 'aldric_told_marcian', label: 'Ask Aldric about Marcian' }],
    reward: { gold: 20, xp: 60, items: ['warm_cloak'] },
    waiting: "Aldric's camp, by the lake. He'll tell you. He owes me that.",
    done: 'His cloak. At the Weeping Bridge. He didn\'t run. I knew it. I always knew it. Here, take his father\'s cloak. It\'s been on the peg too long.',
  },
  letters_door: {
    name: 'Letters at the Door',
    giver: 'nan',
    requires: 'nans_pages',
    when: { flag: 'scene:bell_backwards' },
    offer: [
      "You'll have seen him. The grey postman. He walks the lanes at night with his sack and leaves letters on the doorsteps. Old letters, sealed.",
      "Nobody dares open them. I would, if I could get to one before the wind does. Go out after dark and find one. Bring it to me.",
    ],
    summary: 'At night, find a letter the grey postman left on a doorstep in Millbrook, and bring it to Nan.',
    goals: [{ kind: 'flag', flag: 'found_letter_1', label: 'Find a letter at night' }],
    reward: { gold: 10, xp: 50, items: [] },
    waiting: 'After dark. Look on the doorsteps round the square.',
    done: '"I only ask that Nan may stay with me." Oh, my girl. Seven years, and this never left Thornhallow. He burned the rest, I\'d wager, and this one got away from him.',
  },
  kings_hounds: {
    name: "The King's Hounds",
    giver: 'pike',
    requires: 'steward_bounty',
    offer: [
      'Something runs the fields at night. Dogs. Dead dogs. The old King\'s hunting hounds, the drovers say, from the royal kennels. He took them out every year on the same day.',
      'They took two sheep and the miller\'s cat last week. Thin out the pack. Six of them, and the Steward pays.',
    ],
    summary: 'Slay six bone hounds in the fields at night.',
    goals: [{ kind: 'kill', enemy: 'bonehound', n: 6, label: 'Bone hounds slain' }],
    reward: { gold: 40, xp: 70, items: ['hound_trousers'] },
    waiting: 'At night, in the fields south of the village. They come in packs.',
    done: 'Six. Good. Bram cured the hides they left in the hedges, before they lost them. These are yours. Strange times, when a dog\'s hide outlasts the dog.',
  },
  bell_tolls: {
    name: 'The Bell Tolls Backwards',
    giver: 'odo',
    turnIn: 'nan',
    main: true,
    when: { flag: 'scene:bell_backwards' },
    offer: [
      'Every night the bell rings, and every night the graves open. It has to stop. I cannot climb that stair. I have tried.',
      'Here is the key to the tower. Go up to the belfry and find what rings it. And when it is done, go to Nan. She will want to know.',
    ],
    onAccept: { flags: ['tower_key'] },
    summary: 'Climb the bell tower, stop whatever rings the bell, and tell Nan.',
    goals: [
      { kind: 'reach', region: 'belltower', at: [10, 26], r: 96, label: 'Enter the bell tower' },
      { kind: 'flag', flag: 'bellringer_down', label: 'Silence the bell' },
    ],
    reward: { gold: 60, xp: 150, items: ['sexton_lantern'] },
    onDone: { scene: 'nan_lace' },
    waiting: 'The chapel door. Up the stair. May the Dawn go with you.',
    done: 'Old Hamm\'s lantern. Odo said you should have it. Now, what\'s that he had on his arm?',
  },
};

export const QUEST_IDS = Object.keys(QUESTS);
