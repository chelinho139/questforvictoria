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
    // Odo won't send a stranger up that stair: the village has to speak for you first (Nan's
    // thorns and letter, Pike's hounds), so the Bell-Ringer is the end of Act I, not the start
    when: {
      all: [
        { flag: 'scene:bell_backwards' },
        { quest: 'thorns_fences', is: 'done' },
        { quest: 'letters_door', is: 'done' },
        { quest: 'kings_hounds', is: 'done' },
      ],
    },
    offer: [
      'Nan says you burned the thorns out of her fences. Pike says the hounds are quiet. You have earned the village, and I have nobody else.',
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
  // ---------------------------------------------------------------- Act II (docs/act2.md)
  // ---- the way in (Millbrook and the Greenmarch)
  seven_years: {
    name: 'Seven Years Silent',
    giver: 'wren',
    turnIn: 'aldric',
    requires: 'lamp_window',
    when: { flag: 'act1_done' },
    main: true,
    offer: [
      "Mam told me. About the bridge, and the cloak, and Aldric. Seven years.",
      "He trained my brother, and when Marcian went, he went looking, and he found his cloak, and he came home and said NOTHING.",
      "You know the way to his camp. You're taking me there. Now.",
    ],
    summary: "Take Wren to Aldric's camp in the Greenmarch, and hear what he has to say.",
    goals: [
      { kind: 'reach', region: 'greenmarch', at: [35, 37], r: 160, label: "Take Wren to Aldric's camp" },
      { kind: 'flag', flag: 'scene:wren_aldric', label: 'Hear Aldric out' },
    ],
    reward: { gold: 0, xp: 50, items: ['aldric_whistle'] },
    waiting: 'His camp. By the lake. Move.',
    done: "Every Warden carries one of these. Blow it if you're in trouble. Nobody will come. There's nobody left. Blow it anyway.",
  },
  feathers_oak: {
    name: 'Feathers in the Oak',
    giver: 'wren',
    requires: 'seven_years',
    main: true,
    offer: [
      "The hollow oak on the west shore. He sat there every evening, that last year. Aldric thought he was watching the lake.",
      "He wasn't watching the lake. Come on.",
    ],
    summary: 'Search the hollow oak on the west shore of the lake, read what is inside, and show Wren the new feather.',
    goals: [
      { kind: 'interact', object: 'hollow', label: 'Search the hollow oak' },
      { kind: 'flag', flag: 'read:feather_key', label: "Read Marcian's feather key (J)" },
    ],
    reward: { gold: 0, xp: 60, items: [] },
    onDone: { scene: 'crow_feather' },
    waiting: "In the hollow. He'd have wrapped it in oilskin, he always did.",
    done: "Feathers. He wrote to her in feathers. Of course he did, the soft idiot. Give it here.",
  },
  keep_fire: {
    name: 'Keep the Fire',
    giver: 'aldric',
    requires: 'seven_years',
    offer: [
      "Heron Lodge. The Wardens' waystation on the Lisle, north through the Weepwood. Its hearth has been cold since the King sent us home.",
      "Our names are cut in the beam over that hearth. Every Warden of the Lisle for a hundred years. Go and light it. Three logs will do. Read the names. Then come and tell me.",
    ],
    summary: "Find Heron Lodge on the Lisle, light its hearth, read the roll of names, and tell Aldric.",
    goals: [
      { kind: 'interact', object: 'hearth', label: 'Light the hearth at Heron Lodge (3 logs)' },
      { kind: 'interact', object: 'roll', label: 'Read the roll of names' },
    ],
    reward: { gold: 0, xp: 60, items: ['warden_cloak', 'warden_blade'] },
    waiting: 'Heron Lodge, up the Lisle. A heron over the door.',
    done: "Edric's name is on there. And mine. Leave mine where it is. I'm not finished yet. Take these. A Warden's cloak and a Warden's blade. Somebody ought to wear them.",
  },
  // ---- the Weepwood and Kilnholt
  through_thorns: {
    name: 'Through the Thorns',
    giver: 'wren',
    requires: 'feathers_oak',
    main: true,
    offer: [
      "If the bridge is up the Lisle, we follow the Lisle. It goes under the thorn wall north of the village. I know the way: I've been poaching the King's deer through it since I was eleven.",
      "Meet me by the river at the thorn wall. And don't tell anyone where I get my venison.",
    ],
    summary: 'Meet Wren by the river at the thorn wall, follow her into the Weepwood, and light the fire at her camp.',
    goals: [
      { kind: 'flag', flag: 'wren_follows', label: 'Meet Wren by the river at the thorn wall' },
      { kind: 'reach', region: 'weepwood', at: [21, 54], r: 200, label: 'Follow her into the Weepwood' },
      { kind: 'interact', object: 'wren_firepit', label: 'Light the fire at her camp (2 logs)' },
    ],
    reward: { gold: 0, xp: 60, items: ['smoked_venison', 'smoked_venison', 'smoked_venison'] },
    waiting: 'The river. The thorns. Keep up.',
    done: "There. Now there's somewhere in this wood that isn't trying to kill us. Here, smoked venison. Don't ask whose.",
  },
  ring_of_kilns: {
    name: 'The Ring of Kilns',
    giver: 'hesketh',
    requires: 'through_thorns',
    main: true,
    offer: [
      "You want in, you help hold the ring. Eight kilns. They come at dusk, our own dead, and lie down on them till they go out.",
      "Five still burning at dawn and we live another day. Fewer, and you'll be digging with us in the morning.",
      "Stay inside the ring. Kill them before they lie down. Kilns go out slower than you'd think, and faster than you'd like.",
    ],
    summary: 'Hold the ring of kilns at Kilnholt through one night: at least five of the eight still burning at dawn.',
    goals: [{ kind: 'flag', flag: 'kilns_held', label: 'Hold the kilns till dawn (five of eight)' }],
    reward: { gold: 40, xp: 90, items: ['bandage', 'bandage', 'bandage', 'bandage'] },
    waiting: 'Dusk. Stand inside the ring.',
    done: "Five lit at dawn. We've had worse nights. Not many. Sit down, eat something. There's something I've kept for seven years that's not mine to keep.",
  },
  last_round: {
    name: 'The Last Round',
    giver: 'hesketh',
    requires: 'ring_of_kilns',
    main: true,
    onAccept: { scene: 'badge_book' },
    offer: ['Marcian walked through here every week on his round. The last time, he left me something.'],
    summary: "Read Marcian's logbook, and ask Ada to saw through the willow that has fallen across the road north.",
    goals: [
      { kind: 'flag', flag: 'read:logbook', label: "Read Marcian's logbook (J)" },
      { kind: 'flag', flag: 'willow_sawn', label: 'Ada saws through the fallen willow' },
    ],
    reward: { gold: 0, xp: 50, items: [] },
    waiting: "Ada's got the long saw. She'll moan. Ask her anyway.",
    done: "Road north's open. The old road to Heron Reach, where the Wardens kept the river. He walked it every week. Go careful.",
  },
  brood_mother: {
    name: 'The Brood Mother',
    giver: 'ada',
    requires: 'through_thorns',
    offer: [
      "The spider dell, west across the river. I lost three cutters there this spring.",
      "Burn the egg sacs, six at least, before they hatch. Then kill the thing that laid them. She hangs in the dark at the back. You'll know her.",
    ],
    summary: 'Burn six egg sacs in the spider dell, and slay the Brood Mother.',
    goals: [
      { kind: 'kill', enemy: 'eggsac', n: 6, label: 'Egg sacs burned' },
      { kind: 'kill', enemy: 'broodmother', n: 1, label: 'Slay the Brood Mother' },
    ],
    reward: { gold: 0, xp: 70, items: ['broodsilk_leggings'] },
    waiting: 'Six sacs. One mother. Burn the lot.',
    done: "She's dead? Properly dead? ...Good. The silk's yours, I had it spun from what we cut off the cutters. Don't make that face. It's good silk.",
  },
  deer_pot: {
    name: 'Deer for the Pot',
    giver: 'dunn',
    requires: 'through_thorns',
    offer: [
      "Twenty mouths and a pot with nothing in it. Six haunches of venison, love. The deer are in the glades south and east, where the willows are still green.",
      "Don't tell me how you got them. Especially if it was the poacher.",
    ],
    summary: 'Bring Mother Dunn six venison from the deer in the glades.',
    goals: [{ kind: 'collect', item: 'venison', n: 6, take: true, label: 'Venison for the pot' }],
    reward: { gold: 0, xp: 30, items: ['dunn_pie', 'dunn_pie', 'dunn_pie'] },
    waiting: 'Six. The deer run, mind.',
    done: "Now that's a stew. Here, the last pies from the last of the flour. Eat them while they're warm, you're too thin.",
  },
  light_willows: {
    name: 'The Light in the Willows',
    giver: 'odo',
    when: { flag: 'weepwood_found' },
    offer: [
      "Bess Tanner lost her boy in the Lisle last spring. Since the bells she goes out every night, into the wood, after the lights. She says they are his lantern.",
      "They are not. You know what they are. Find her in the Keening Hollow, at night, and put the lights out around her. Then bring me word.",
    ],
    summary: 'At night, find Bess Tanner in the Keening Hollow in the Weepwood, put out the lights around her, and tell Father Odo.',
    goals: [
      { kind: 'talk', npc: 'bess', label: 'Find Bess in the Keening Hollow, at night' },
      { kind: 'kill', enemy: 'mourning_light', n: 4, label: 'Put out the lights around her' },
    ],
    onDone: { flags: ['bess_free'] },
    reward: { gold: 30, xp: 60, items: ['bandage'] },
    waiting: 'At night. The Keening Hollow, north-west in the wood. May the Dawn go with you.',
    done: "She's home. She came to the chapel this morning and sat at the back and didn't say anything. That's a beginning.",
  },
  flour_kilnholt: {
    name: 'Flour for Kilnholt',
    giver: 'maud',
    when: { flag: 'kilnholt_found' },
    offer: [
      "Kilnholt? The burners are still alive in there? Mother Dunn used to feed my boy every week. Every week, and never took a penny.",
      "I've flour and nobody to grind for. Take her these. Three sacks. Tell her they're from Marcian's mam.",
    ],
    onAccept: { items: ['flour_sack', 'flour_sack', 'flour_sack'] },
    summary: "Carry Maud's three sacks of flour to Mother Dunn at Kilnholt.",
    goals: [{ kind: 'collect', item: 'flour_sack', n: 3, take: true, label: 'Sacks of flour for Mother Dunn' }],
    turnIn: 'dunn',
    onDone: { flags: ['dunn_bakes'] },
    reward: { gold: 0, xp: 30, items: [] },
    waiting: 'Three sacks. Mind the damp.',
    done: "From Maud? Oh. Oh, that poor woman. Tell her... no, I'll tell her myself, one day. Pies. Proper pies, tomorrow, and every day after. You'll have the first.",
  },
  steel_millbrook: {
    name: 'Steel for Millbrook',
    giver: 'bram',
    when: { flag: 'kilnholt_found' },
    offer: [
      "Iron's soft. Steel's better. Steel needs charcoal. Good charcoal. The burners make the best.",
      'Ten charcoal from Kilnholt. Then I make steel. And show you how.',
    ],
    summary: 'Bring Bram ten charcoal from Kilnholt.',
    goals: [{ kind: 'collect', item: 'charcoal', n: 10, take: true, label: 'Charcoal for the forge' }],
    onDone: { flags: ['steel_taught'] },
    reward: { gold: 0, xp: 40, items: [] },
    waiting: 'Ten. Kilnholt charcoal. Hesketh sells it.',
    done: 'Good charcoal. Hm. One iron bar, two charcoal, a hot forge: steel. Now you know. I sell it too.',
  },
  silk_ashford: {
    name: 'Silk for Ashford',
    giver: 'tobin',
    when: { flag: 'weepwood_found' },
    offer: [
      "Spider silk. From the wood. Don't look at me like that: the Ashford weavers pay a fortune for it, and the road south opens one day.",
      "Six skeins. I'll pay, and I'll string you a bow with the stuff, if you like. Silk-strung recurve. Nothing better this side of the hills.",
    ],
    summary: 'Bring Tobin six spider silk from the spiders of the Weepwood.',
    goals: [{ kind: 'collect', item: 'spider_silk', n: 6, take: true, label: 'Spider silk' }],
    onDone: { flags: ['silk_sold'] },
    reward: { gold: 50, xp: 40, items: [] },
    waiting: 'Six skeins. The spiders keep it on them. More or less.',
    done: "Lovely. Lovely! Here's your coin. And come back for that recurve: I've the bowyer's pattern, and some smoked venison off a friend who doesn't exist.",
  },
  // ---- the King's Chase
  kings_lodge: {
    name: "The King's Lodge",
    giver: 'wren',
    turnIn: 'nan',
    requires: 'through_thorns',
    offer: [
      "East of here is the King's Chase. His hunting forest. There's a lodge in the middle, where the foresters kept their books and the King kept his dogs.",
      "Every one of those bone hounds in Millbrook's fields came from those kennels. I want to see. And I want to burn them.",
    ],
    summary: "Find the old King's hunting lodge in the Chase, read the game book, burn the kennels, and show the book to Nan.",
    goals: [
      { kind: 'interact', object: 'game_book', label: 'Read the game book' },
      { kind: 'interact', object: 'kennels', label: 'Burn the kennels' },
    ],
    onDone: { scene: 'nan_gamebook' },
    reward: { gold: 0, xp: 50, items: [] },
    waiting: 'East, through the Chase. Follow the Ride.',
    done: 'The King\'s game book? Let me see that, dear.',
  },
  gallows_willow: {
    name: 'The Gallows Willow',
    giver: 'pell',
    requires: 'through_thorns',
    offer: [
      "The Gallows Willow, by the King's Ride in the Chase. Five ropes still on it. My brother Tam's is the one nearest the trunk.",
      "At dusk they come down, the hanged, with their bows. Put them down. Cut the ropes. And bury Tam for me. I've waited sixty years to ask somebody.",
    ],
    summary: 'At night, slay the hanged at the Gallows Willow, cut down the five ropes, and bury Tam Pell.',
    goals: [
      { kind: 'kill', enemy: 'hanged_poacher', n: 5, label: 'The hanged slain' },
      { kind: 'interact', objectKind: 'rope', n: 5, label: 'Ropes cut down' },
      { kind: 'flag', flag: 'tam_buried', label: 'Bury Tam Pell' },
    ],
    reward: { gold: 0, xp: 50, items: ['pell_horn'] },
    waiting: 'At dusk. Five ropes. Tam\'s nearest the trunk.',
    done: "Sixty years he's been hanging in that tree. The Warden lad cut one down, once. Got in trouble for it. Good lad. Here. My old horn. It called the hounds off me more than once.",
  },
  bonespine_hunt: {
    name: 'Bonespine',
    giver: 'wren',
    requires: 'through_thorns',
    when: { flag: 'kingschase_found' },
    offer: [
      "There's an old thornback in the Chase as big as a pony. Bonespine, the burners call him. He dens in the rocks in the north-west.",
      "He's been taking Kilnholt's goats, and two of Ada's dogs. Help me finish him.",
    ],
    summary: "Slay Bonespine at his rocks in the north-west of the King's Chase.",
    goals: [{ kind: 'kill', enemy: 'bonespine', n: 1, label: 'Slay Bonespine' }],
    reward: { gold: 0, xp: 70, items: ['bonespine_mantle'] },
    waiting: "His rocks are north-west in the Chase. He leaps. Don't be the one standing furthest off.",
    done: "Marcian found him in a snare when he was a cub, and let him go. Marcian let everything go. ...I'm not like him. Here. Wear the old wolf. He'd have hated that.",
  },
  outriders: {
    name: 'The Outriders',
    giver: 'pike',
    requires: 'steward_bounty',
    when: { flag: 'weepwood_found' },
    offer: [
      "The Steward's courier came up the King's Ride a month back with my orders. He never got here. Goblins on wolves, the drovers say, camped east in the Chase.",
      "Find him. Find whoever has his bag, and bring it back. Unopened, if you please.",
    ],
    summary: "Find Pike's courier on the King's Ride, slay the outriders' chief, and bring back the dispatch bag.",
    goals: [
      { kind: 'interact', object: 'courier', label: "Find Pike's courier on the King's Ride" },
      { kind: 'kill', enemy: 'outrider_chief', n: 1, label: "Slay the outriders' chief" },
      { kind: 'collect', item: 'dispatch_bag', n: 1, take: true, label: 'Bring back the dispatch bag' },
    ],
    reward: { gold: 50, xp: 70, items: [], docs: ['steward_dispatch'] },
    waiting: 'The Ride runs straight through the Chase. Follow it east.',
    done: "Opened, I see. Never mind. Read it if you like: it's in your journal now. That's the Lady Isolde's hand.",
  },
  wolves_road: {
    name: 'Wolves on the Road',
    giver: 'pike',
    requires: 'steward_bounty',
    when: { flag: 'weepwood_found' },
    offer: ["Thornback wolves, in the Chase and up the Lisle. They've had a drover and two horses. Ten of them, and the Steward pays."],
    summary: "Slay ten thornback wolves in the King's Chase or at Heron Reach.",
    goals: [{ kind: 'kill', enemy: 'thornback', n: 10, label: 'Thornback wolves slain' }],
    reward: { gold: 40, xp: 50, items: [] },
    waiting: 'Ten. Spines on their backs. You can\'t miss them.',
    done: 'Ten. The Steward pays. Eventually. Here, I paid it myself. Don\'t tell her.',
  },
  // ---- Heron Reach and the barrow
  wardens_trail: {
    name: "The Warden's Trail",
    giver: 'wren',
    requires: 'last_round',
    main: true,
    offer: [
      "His logbook names the marks he cut on his round. Goose by my camp. Jay at the spider dell. Goose on the old road above Kilnholt. The owl over Heron Lodge's door.",
      "Find them. I'll read them. Then we follow where they point.",
    ],
    summary: "Find and read Marcian's first four marks: by Wren's camp, at the spider dell, on the old road above Kilnholt, and over Heron Lodge's door.",
    goals: [
      { kind: 'interact', object: 'mark1', label: "The goose by Wren's camp" },
      { kind: 'interact', object: 'mark2', label: 'The jay at the spider dell' },
      { kind: 'interact', object: 'mark3', label: 'The goose on the old road' },
      { kind: 'interact', object: 'mark4', label: "The owl over Heron Lodge's door" },
    ],
    reward: { gold: 0, xp: 90, items: [] },
    waiting: 'Feathers cut in the bark. Look low, he was never tall.',
    done: 'Onward, danger, onward, shelter. He was walking us to the river. To the ford, and then the crossing.',
  },
  the_ford: {
    name: 'The Ford',
    giver: 'wren',
    requires: 'wardens_trail',
    main: true,
    offer: [
      "Below the lodge, the old road crosses the Lisle. The ford. Dead men in Thornhallow livery are holding it, searching the road for someone.",
      "His heron mark is at the ford. And the logbook says the last is at the mist. Clear them off, and let's read the rest.",
    ],
    summary: 'Clear the Tower Guard from the ford at Heron Reach, then read the heron mark and the last mark, at the mist.',
    goals: [
      { kind: 'kill', enemy: 'tower_guard', n: 4, label: 'Tower Guard cleared from the ford' },
      { kind: 'interact', object: 'mark_heron', label: 'The heron at the ford' },
      { kind: 'interact', object: 'mark_last', label: 'The last mark, at the mist' },
    ],
    reward: { gold: 0, xp: 80, items: [] },
    waiting: '"Search the road. She can\'t have got far." They say it over and over. Who are they looking for?',
    done: 'The bridge. He marked the way to the bridge. ...The mist is thinning. Look.',
  },
  warden_caches: {
    name: 'Warden Caches',
    giver: 'wren',
    requires: 'last_round',
    offer: [
      "\"Caches stocked: the split oak, the old weir, under the leaning stone.\" Each under an owl mark.",
      'Wardens left food and kit for each other along the river. If anything is left, it\'s ours now.',
    ],
    summary: 'Find the three Warden caches the logbook lists at Heron Reach, each under an owl mark.',
    goals: [{ kind: 'interact', objectKind: 'cache', n: 3, label: 'Warden caches found' }],
    reward: { gold: 0, xp: 50, items: ['warden_hood', 'warden_boots'] },
    waiting: 'The split oak, the old weir, the leaning stone.',
    done: "His hood. And his spare boots, still oiled. He kept everything oiled. Take them, they'll fit you better than me.",
  },
  barrow_watch: {
    name: 'The Barrow Watch',
    giver: 'hesketh',
    requires: 'last_round',
    offer: [
      "The Lisle Barrow, up past Heron Lodge. The Wardens kept a fire at its door every night, so they may sleep. My grandfather said so.",
      "Nobody's kept it seven years. Ada saw the door stone lying on the grass last month, pushed out from inside.",
      "Go in. Put whatever's awake back to sleep. Then light the fire at the door again.",
    ],
    summary: "Go into the Lisle Barrow, put the Thane under the Hill back to sleep, and light the Wardens' fire at the barrow door (3 logs).",
    goals: [
      { kind: 'kill', enemy: 'thane', n: 1, label: 'Put the Thane under the Hill to sleep' },
      { kind: 'interact', object: 'barrow_fire', label: "Light the Wardens' fire at the door (3 logs)" },
    ],
    reward: { gold: 0, xp: 100, items: ['thane_torc'] },
    waiting: 'The barrow. North-east of the ford, Ada says.',
    done: "The fire's lit? Then they'll sleep. The Wardens kept it a hundred years. Here: Ada found this on the grass by the door stone, green as a duck's egg. It's his, I'd say. He won't miss it.",
  },
  pages_thorns: {
    name: 'Pages in the Thorns',
    giver: 'nan',
    requires: 'nans_pages',
    when: { flag: 'weepwood_found' },
    offer: [
      "The pages don't only blow down the river. The drovers say there are pages caught on the thorns up in the wood, flapping like little flags.",
      "Find them for me. Every one. Two in the Weepwood, they say, and more further up the Lisle.",
    ],
    summary: 'Find four diary pages caught on the thorns (two in the Weepwood, one at Heron Reach, one by the road past the mist) and bring them to Nan.',
    goals: [{ kind: 'interact', objectKind: 'thorn_page', n: 4, label: 'Pages found in the thorns' }],
    onDone: { scene: 'nan_page6' },
    reward: { gold: 0, xp: 50, items: ['bread', 'bread'], docs: ['diary_4', 'diary_5', 'diary_6', 'diary_7'] },
    waiting: 'Caught on the thorns. Mind your hands.',
    done: 'Oh, my girl. My girl.',
  },
  return_sender: {
    name: 'Return to Sender',
    giver: 'nan',
    requires: 'letters_door',
    when: { flag: 'weepwood_found' },
    offer: [
      "He's still walking, the grey postman. Still leaving letters. Always at the wrong door, the drovers say. One on the mill step, one up at the old Wardens' lodge on the river.",
      'At night, dear. Bring them to me.',
    ],
    summary: "At night, find two more of the grey postman's letters (one at the mill in Millbrook, one at Heron Lodge) and bring them to Nan.",
    goals: [
      { kind: 'flag', flag: 'found_letter_2', label: 'The letter at the mill, at night' },
      { kind: 'flag', flag: 'found_letter_3', label: 'The letter at Heron Lodge, at night' },
    ],
    reward: { gold: 0, xp: 40, items: [] },
    waiting: 'After dark. The mill step, and the lodge.',
    done: '"Don\'t forget me." Oh, love. As if I could. As if I could.',
  },
  // ---- the Weeping Bridge
  search_party: {
    name: 'The Search Party',
    giver: 'wren',
    requires: 'the_ford',
    offer: [
      'Past the mist there are more of them. A whole search party, walking the old road day and night. Their sergeant carries something in his belt.',
      'Kill him. Take it. I want to know who they think they\'re looking for.',
    ],
    summary: "Slay the search party's sergeant on the old road past the mist, and take what he carries.",
    goals: [{ kind: 'kill', enemy: 'search_sergeant', n: 1, label: "Slay the search party's sergeant" }],
    reward: { gold: 0, xp: 50, items: [] },
    waiting: 'On the old road, past the mist. He walks with the others.',
    done: "\"The lady has left her room by the window.\" That's the night she ran. Page seven. They're still out looking for her. The wizard's dead men don't even know she was caught.",
  },
  knight_carried: {
    name: 'What the Knight Carried',
    giver: 'wren',
    requires: 'the_ford',
    main: true,
    offer: [
      "The bridge is north, past the mist. Whoever killed my brother, they did it there.",
      "If you see a knight, don't wait for me to shoot first. I'm going to anyway.",
    ],
    summary: 'Reach the Weeping Bridge, defeat whoever guards it, and hear him out.',
    goals: [
      { kind: 'kill', enemy: 'garrick', n: 1, label: 'Defeat the knight on the bridge' },
      { kind: 'flag', flag: 'garrick_confessed', label: 'Hear him out' },
    ],
    reward: { gold: 0, xp: 200, items: ['marcian_whistle', 'royal_greaves'] },
    waiting: 'North. The bridge.',
    done: "His whistle. You keep it for now. I can't. Not yet. ...Mam. Somebody has to tell Mam.",
  },
  lamp_burns: {
    name: 'The Lamp Burns On',
    giver: 'wren',
    turnIn: 'maud',
    requires: 'knight_carried',
    main: true,
    onAccept: { flags: ['wren_home'] },
    offer: ["I'm going home. Come with me. I don't think I can say it on my own."],
    summary: 'Go home to the mill with Wren, and tell Maud.',
    goals: [{ kind: 'talk', npc: 'maud', label: 'Tell Maud' }],
    onDone: { scene: 'lamp' },
    reward: { gold: 0, xp: 40, items: ['bread', 'bread'] },
    waiting: 'Home. The mill.',
    done: 'Come in, both of you. Sit down. I can see it on your faces.',
  },
};

export const QUEST_IDS = Object.keys(QUESTS);
