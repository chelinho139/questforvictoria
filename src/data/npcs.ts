/**
 * People in the world. Each says hello, may have a topic to ask about, and may have quests
 * (where they stand is up to each region, data/regions) (see data/quests.ts, which names its giver).
 */

import type { Cond, Effect } from './story';
import type { ItemId } from './items';

export type NpcId =
  | 'aldric'
  | 'nan'
  | 'maud'
  | 'pike'
  | 'odo'
  | 'tobin'
  | 'bram'
  // Act II
  | 'wren'
  | 'hesketh'
  | 'ada'
  | 'pell'
  | 'dunn'
  | 'bess'
  | 'garrick';

/** Something you can ask about: shown while `when` holds; `once` topics go after asking. */
export interface Topic {
  ask: string;
  pages: string[];
  when?: Cond;
  once?: boolean;
  then?: Effect;
}

export interface NpcDef {
  name: string;
  /** Shown under the name. */
  title: string;
  /** The first time you talk to them. */
  intro: string[];
  /** Every time after that. */
  greeting: string;
  /** Greetings for later in the story: the first whose condition holds replaces `greeting`. */
  greetings?: { when: Cond; text: string }[];
  /** Things you can ask about (one page at a time). */
  topics?: Topic[];
  /** Effects the first time you talk to them (after the introduction). */
  onMeet?: Effect;
  /** How the name label reads over their head (defaults to `name`). */
  label?: string;
  /**
   * A trader: what they sell (at each item's price), and more once the story lets them (`more`:
   * Bram's steel after you bring him charcoal). Every trader buys anything worth a coin to them.
   */
  shop?: { sells: ItemId[]; name: string; more?: { when: Cond; sells: ItemId[] }[] };
}

export const NPCS: Record<NpcId, NpcDef> = {
  aldric: {
    name: 'Warden Aldric',
    title: 'Last of the Wardens',
    intro: [
      'Easy, easy. You can stand? Good. I found you on the lakeshore at dawn, half drowned, wearing nothing but those trousers and holding that rusty old sword.',
      'I am Aldric, the last of the Wardens of Corvalis. What is left of them, anyway.',
      "If you mean to live out here you'll need gear, food and a steadier hand. I can help with that, if you'll help an old man in return.",
    ],
    greeting: 'Still breathing? Good. What do you need, friend?',
    greetings: [
      { when: { flag: 'garrick_down' }, text: "The bridge. You went to the bridge, and you came back. I never did, not past the reeds. Sit. Tell me slowly." },
      { when: { flag: 'scene:wren_aldric' }, text: "She's got his temper. And his aim, I'd guess. Watch her for me." },
      { when: { quest: 'seven_years', is: ['active', 'ready'] }, text: "I know why you're here. I've known for seven years someone would come." },
      { when: { flag: 'act1_done' }, text: "They say the Millbrook bell has gone quiet. That was you? Hm. Edric would have liked you." },
      { when: { quest: 'road_north', is: ['active', 'ready'] }, text: 'North, to Millbrook. Find Nan Merrow. Tell her old Aldric sent you.' },
    ],
    topics: [
      {
        ask: 'What is the Hollow Night?',
        pages: [
          'Forty nights ago the old King died. The next night the dead got up out of their graves. All of them, all across Corvalis. They have done it every night since.',
          "They climb out at sunset and crawl back in at dawn. Most of them are just the dead. Somebody's grandmother. Somebody's son. Don't let that make you slow.",
          'We call it the Hollow Night, after him. The Hollow King.',
        ],
      },
      {
        ask: 'Who is the Hollow King?',
        pages: [
          'Lord Ambrose, the wizard of the Root Tower. The whole realm calls him Potatoe Face, and spits after it. Seven years ago the King gave him the princess to pay for a war, and he carried her off to his castle in the north. Thornhallow.',
          "When the old King died the crown passed to her, so now she is the queen, and he says that makes him king. He's having it nailed to every church door.",
          'And the Blackthorn creeps out of his country a little further south every week. Black thorns, dead fields, his root magic gone rotten. Everyone knows it.',
        ],
      },
      {
        ask: 'Tell me about the queen.',
        pages: [
          'Victoria. I saw her once, when she was a girl, walking by the lake with her nurse. A small thing. She sang.',
          'Seven years in that wizard\'s tower. Nobody has seen her since. Nobody has heard her sing.',
          'If anyone in this realm still has the right to be rescued, friend, it is her.',
        ],
      },
      {
        ask: 'Who were the Wardens?',
        pages: [
          '"We keep the fire, so others may sleep." That was the oath. Rangers. We kept the roads, watched the barrows, kept the dead asleep.',
          'The King disbanded us seven years ago. Too costly, he said. On the first Hollow Night the old ones rode out anyway. My brother Edric with them.',
          'I am the only one who came back.',
        ],
      },
      {
        ask: 'Why did the lake give me back?',
        pages: [
          'Lake Ellory. The Mirror, the villagers call it. Still as glass, fed by the Lisle from the north.',
          'You came out of it at dawn with nothing but a rusty sword and no memory. I have lived by this water forty years, and I will tell you this: the lake does not give things back without a reason.',
        ],
      },
      {
        ask: 'Any word from the north road?',
        when: { level: 2 },
        pages: [
          'The drovers coming down the north road swear they have seen a grey man with a lantern walking it after dark. Tall, thin, quiet. He does not stop and he does not speak.',
          "The wizard's servant, maybe. Or his master. Whatever he is, don't follow lights on the north road.",
        ],
      },
      {
        ask: 'Where is the Weeping Bridge?',
        when: { flag: 'scene:wren_aldric' },
        pages: [
          "Up the Lisle, deep in the Weepwood. The Wardens' old crossing, from when there were Wardens to cross it.",
          "Heron Lodge is on the way, on the river. Our waystation. Nobody's lit its hearth since the King sent us home.",
        ],
      },
      {
        ask: 'Can a Warden marry?',
        when: { flag: 'read:logbook' },
        pages: [
          "He asked me that. The spring he went. I laughed and said a Warden may do as he likes, so long as the fire is kept.",
          "I thought he meant some girl in Millbrook. I never asked who. I should have asked who.",
        ],
      },
      {
        ask: 'A crow feather in the oak.',
        when: { flag: 'scene:crow_feather' },
        pages: [
          "A crow dropped a feather in a hole in a tree, girl. Don't you start hoping.",
          "...Don't you start hoping. I did, for a year. It nearly finished me.",
        ],
      },
      {
        ask: 'The Thane said she sang. Not him.',
        when: { flag: 'thane_down' },
        pages: [
          "The songs say Corvan sang the dead to sleep. The first king, with the crown on his head.",
          "Don't take the word of a dead man under a hill. They get muddled down there. So would you.",
        ],
      },
      {
        ask: 'Maud Ashdown asked me about her son.',
        when: { quest: 'lamp_window', is: 'active' },
        once: true,
        then: { flags: ['aldric_told_marcian'] },
        pages: [
          'Maud sent you. Of course she did.',
          "Marcian was my apprentice. The best tracker the Wardens ever had. Laughed at everything, couldn't sing a note.",
          'Seven years ago he went out one night and never came back. They said he had robbed the treasury and run south. I did not believe it. I went looking.',
          'I found his cloak at the Weeping Bridge, up the Lisle, snagged in the reeds and torn to rags. That is all I found. The same month, the King disbanded the Wardens.',
          'Tell Maud he did not run. Whatever else is true, that boy never ran from anything in his life.',
        ],
      },
    ],
  },
  nan: {
    name: 'Nan Merrow',
    title: "The queen's old nurse",
    intro: [
      "Who's that at my door? Oh. Oh, you'll be the ones Aldric sent. Come in, come in, mind the cat.",
      "I'm Nan. I nursed the queen from the night she was born until the wizard sent me away. Seven years ago, near enough.",
      "Sit down. I've bread, and I've something to show you.",
    ],
    greeting: "Come in, dear. The kettle's always on.",
    greetings: [
      { when: { flag: 'garrick_down' }, text: "Two scraps now. Same hem. He's handing out her veil like ribbons at a fair." },
      {
        when: { all: [{ flag: 'act1_done' }, { quest: 'lamp_window', is: ['locked', 'available', 'active', 'ready'] }] },
        text: "Go and see Maud, dear. At the mill. Her girl's home, and spitting nails, and it's to do with you.",
      },
      { when: { flag: 'act1_done' }, text: "I keep the lace with her pages now. I don't know why. I can't bear to throw it away." },
      { when: { quest: 'bell_tolls', is: 'active' }, text: 'Be careful in that tower. Father Odo says the stair is older than the chapel.' },
    ],
    topics: [
      {
        ask: 'Tell me about Victoria.',
        pages: [
          'She was a quiet little thing. Her father never looked at her, not once, so she learned to make herself small. But she sang. Lord, how she sang. Up in the south tower over the lake, every evening.',
          'When she was fifteen she went out on the ice alone and fell through. A boy pulled her out. She never told me his name, but she came home different. Lighter.',
          'Then the King gave her to the wizard to pay for his war, and they took her north.',
        ],
      },
      {
        ask: 'Why did you leave her?',
        pages: [
          "I didn't leave her. I was sent away. Dragged out, more like, before the first winter was out. He said she was too old for a nurse.",
          "I've written to her every week since. Seven years of letters, and she's never answered one.",
          "I don't think he lets her have them.",
        ],
      },
      {
        ask: 'The proclamation is signed by her.',
        when: { flag: 'read:hollow_proclamation' },
        pages: [
          '"Victoria R." I know. That\'s her hand. I\'d know it anywhere, I taught her her letters.',
          "He makes her sign his evil, the way he made her sign his letters. Don't you dare think otherwise.",
        ],
      },
      {
        ask: 'Her own hand, but not through the oak.',
        when: { flag: 'read:logbook' },
        pages: [
          "A letter in her hand that didn't come the usual way. The wizard set a trap for that boy, and used her name to bait it.",
          "He was always using her name. On his proclamations, on his letters. It's what he married her for.",
        ],
      },
      {
        ask: 'The King signed the bridge closed.',
        when: { flag: 'read:kings_bridge' },
        pages: [
          '"Victoria R." Pressed so hard it tore. She hated signing it. You can see it in every line.',
          "And his hand wanders like a drunk's. Maybe the rot's getting into him too. I hope it is.",
        ],
      },
      {
        ask: 'Who is the grey postman?',
        when: { flag: 'scene:bell_backwards' },
        pages: [
          "Folk call him the Unsent. He's walked the lanes since the bells. Grey, and quiet, with a sack over his shoulder.",
          'He never takes anything. He only leaves letters, on doorsteps, at night.',
          "Don't try to catch him. Nobody's ever got close. He's gone like breath off a window.",
        ],
      },
    ],
  },
  maud: {
    name: 'Maud Ashdown',
    title: "The miller's widow",
    intro: [
      "You'll be the strangers everyone's talking about. Came up out of the lake, they say.",
      "I'm Maud. This is my mill, or it was my husband's. The wheel still turns. I've nobody to grind for, mind. Half the fields are thorns.",
    ],
    greeting: "Mind the wheel. It doesn't stop for anybody.",
    greetings: [
      { when: { flag: 'act2_done' }, text: "The lamp's for you now. For all of you, going north. Come home." },
      { when: { quest: 'lamp_window', is: 'done' }, text: "I keep the lamp lit. I always will. But it's easier now, knowing he didn't run." },
    ],
    topics: [
      {
        ask: 'Why is there a lamp in your window?',
        pages: [
          'For my son. Marcian. He went out one night seven years ago and never came home.',
          "They said he robbed the King's treasury and ran south. My Marcian. Who gave his supper to every stray dog in Millbrook.",
          'So I keep a lamp in the window. In case he finds his way back in the dark.',
        ],
      },
      {
        ask: 'Do you have other children?',
        when: { quest: 'lamp_window', is: ['locked', 'available', 'active', 'ready'] },
        pages: [
          'A daughter. Wren. She was ten when her brother went.',
          "She's off in the woods, mostly. Hunting, she says. Looking for him, I say. She never believed he ran either.",
        ],
      },
      {
        ask: 'Wren is home.',
        when: { quest: 'lamp_window', is: 'done' },
        pages: [
          "I told her. About the bridge, and the cloak. I should have waited, but I've waited seven years.",
          "She went white, and then she went red, and then she said Aldric's name in a way I've never heard her say anything.",
          "Go with her. Please. She'll go anyway, and I'd rather she didn't go alone.",
        ],
      },
    ],
  },
  pike: {
    name: 'Sergeant Pike',
    title: "The Steward's herald",
    intro: [
      'Pike. Sergeant. Herald to the Lady Isolde Vane, Steward of Corvalis, and the only soldier north of Ashford, as far as I can tell.',
      "If you're after the bounty, it's on the board. If you're after help, you've come to the wrong man.",
    ],
    greeting: "Read the board. It's all on the board.",
    greetings: [{ when: { flag: 'outrider_chief_down' }, text: "The Steward's mail, back in my hand. Hm. You're more use than the bounty board, I'll give you that." }],
    topics: [
      {
        ask: 'The letter that killed Marcian was in her hand.',
        when: { flag: 'garrick_down' },
        pages: [
          "Forged, in the queen's own hand? Careful who you say that to.",
          "There weren't many people at court who could copy her hand that well, and most of them are in Ashford now.",
        ],
      },
      {
        ask: 'Who is the dispatch from?',
        when: { flag: 'read:steward_dispatch' },
        pages: [
          `That's the Lady Isolde's hand. "Spoken to by no one." To keep the poor lass from being stared at, I expect.`,
          "She's had enough of that.",
        ],
      },
      {
        ask: 'Ten thousand crowns?',
        pages: [
          "Ten thousand crowns, from the Steward's own treasury, to whoever brings the queen out of that tower.",
          "That's more money than anyone in this village has ever heard said out loud. Nobody's gone for it, mind. Nobody's even gone north.",
        ],
      },
      {
        ask: 'Who is the Steward?',
        pages: [
          "The Lady Isolde Vane. The late King's cousin, and his Hand. She's held the realm together from Ashford since the bells. Taxes, walls, bounties.",
          "Clever woman. Careful. Doesn't sleep much, they say.",
        ],
      },
      {
        ask: 'Why is the south road closed?',
        pages: [
          "The Steward's orders. Shut tight until the dead are dealt with. Ashford has walls, and she means to keep them.",
          "Bring her news from the north worth hearing, and maybe she'll open it for you. Not before.",
        ],
      },
    ],
  },
  odo: {
    name: 'Father Odo',
    title: 'Priest of Millbrook',
    intro: [
      'Bless you, bless you. Strangers, and armed. Thank the Dawn.',
      'I am Odo. I keep the chapel and the churchyard, and these days I keep very little of either.',
    ],
    greeting: 'The Dawn keep you.',
    greetings: [
      {
        when: { flag: 'bess_free' },
        text: "Grief that won't let go of the dead is a terrible thing. Terrible, and the easiest thing in the world to forgive.",
      },
      { when: { flag: 'bellringer_down' }, text: "It's quiet. Every night, quiet. I'd forgotten what the dark sounds like without that bell." },
    ],
    topics: [
      {
        ask: 'What are the mourners?',
        when: { flag: 'weepwood_found' },
        pages: [
          "In the old days we keened all night at the graveside, so the dead wouldn't go alone. The women sat up with them till dawn.",
          "The King forbade it for traitors and thieves. Some folk were never let mourn at all.",
          "Perhaps that is what they are. All the mourning nobody was allowed.",
        ],
      },
      {
        ask: "What's wrong with the bell?",
        when: { flag: 'scene:bell_backwards' },
        pages: [
          'Old Hamm was our sexton for forty years. Forty days ago the riders came with the news, and he rang the King\'s death knell. Rang it all evening, with the tears running into his beard.',
          'That night his heart gave out, up in the belfry, with the rope still in his hands.',
          'Now every night the bell rings again. Backwards, somehow. And every time it does, the graves open.',
        ],
      },
      {
        ask: 'The churchyard.',
        pages: [
          'I buried most of the people in that churchyard. Now they come knocking on the chapel door at night. I do not open it.',
          'I pray for them. I do not think they hear me.',
        ],
      },
    ],
  },
  tobin: {
    name: 'Tobin',
    title: 'Peddler',
    intro: [
      "Tobin's the name, trade's the game. The other peddlers ran south when the bells started. I stayed. Know why?",
      'No competition.',
    ],
    greeting: 'Buying or selling? Both, I hope.',
    shop: {
      name: "Tobin's stall",
      sells: ['bread', 'bandage', 'cooked_meat', 'leather_cap', 'leather_tunic', 'leather_trousers', 'leather_boots', 'wooden_shield', 'woodcutter_axe', 'pickaxe', 'hunting_bow', 'leather_quiver', 'ashwood_staff', 'hedge_grimoire'],
      more: [{ when: { flag: 'silk_sold' }, sells: ['smoked_venison', 'silk_recurve', 'willow_staff'] }],
    },
    topics: [
      {
        ask: 'Any news?',
        pages: [
          'News? The drovers on the north road swear there is a grey man with a lantern walking it at night. Tall, thin, quiet.',
          "The wizard's man, if you ask me. I don't go north. I don't sell to anyone who goes north, either. Except you. You've got money.",
        ],
      },
    ],
  },
  bram: {
    name: 'Bram',
    title: 'Blacksmith',
    intro: ["Bram. Smith. You want something made, I've made it. You want to talk, talk to Tobin."],
    greeting: 'Hm.',
    shop: {
      name: "Bram's smithy",
      sells: ['iron_bar', 'iron_sword', 'iron_shield', 'yew_longbow', 'hunters_quiver', 'runed_staff', 'crystal_orb', 'iron_helm', 'chainmail', 'iron_greaves'],
      more: [{ when: { flag: 'steel_taught' }, sells: ['steel_bar', 'steel_sword', 'steel_shield', 'steel_helm', 'thornback_jerkin'] }],
    },
    greetings: [{ when: { flag: 'steel_taught' }, text: 'Steel. Good charcoal makes good steel. Hm.' }],
    topics: [
      {
        ask: 'Tell me about Millbrook.',
        pages: ['Mill. River. Chapel. Thorns in the fields this spring. Dead in the churchyard every night.', "Used to be a good place. Still is, in the day."],
      },
    ],
  },
  // ---------------------------------------------------------------- Act II (docs/act2.md)
  wren: {
    name: 'Wren Ashdown',
    title: "Marcian's sister",
    label: 'Wren',
    intro: [
      "You're the ones who climbed the bell tower. Mam says you went to Aldric for her.",
      "Seven years he knew where they found my brother's cloak. Seven years.",
      "I'm Wren. Don't call me miss, don't call me Ashdown, and don't tell anyone where I get my venison.",
    ],
    greeting: "What.",
    greetings: [
      { when: { flag: 'wren_home' }, text: "I told her. She already knew. She always knows. Go on, Mam's waiting for you." },
      { when: { flag: 'garrick_down' }, text: "Seven years with that knight outside her door. We're getting her out. For him." },
      { when: { flag: 'scene:crow_feather' }, text: "She loved him. Good. Somebody should have, besides Mam and me." },
      { when: { flag: 'wren_follows' }, text: "Stay on the path. If you see lights in the trees, don't follow them." },
      { when: { quest: 'through_thorns', is: 'active' }, text: "Under the thorns, where the river goes. Mind your head." },
      { when: { quest: 'seven_years', is: 'active' }, text: "Well? His camp's by the lake. Walk." },
    ],
    topics: [
      {
        ask: 'Tell me about Marcian.',
        pages: [
          "He laughed at everything. Couldn't sing. Couldn't keep a secret either, except the one, apparently.",
          "He taught me to shoot when I was six. Said the King's deer were the King's, and then showed me where they drank.",
          "I was ten when he went. They said he ran. I've been looking for him in these woods ever since, and I didn't even know where to look.",
        ],
      },
      {
        ask: 'Who do you blame?',
        when: { flag: 'scene:wren_aldric' },
        pages: [
          "Aldric, for keeping his mouth shut. The King, but he's dead, so he's out of reach.",
          "And the wizard. Don't tell me he had nothing to do with it. When I find Potatoe Face I'm going to put an arrow in him. Just the one. I want him to see it coming.",
        ],
      },
      {
        ask: 'Lead the way under the thorns.',
        when: { all: [{ quest: 'through_thorns', is: 'active' }, { not: 'wren_follows' }] },
        once: true,
        then: { flags: ['wren_follows', 'river_path_open'] },
        pages: [
          "Right. Where the Lisle goes under the wall there's a gap, if you don't mind getting wet to the knee.",
          "Stay behind me. Stay on the path. And if you see lights in the trees, don't follow them.",
        ],
      },
      {
        ask: "Why aren't you scared of the wood?",
        when: { flag: 'wren_follows' },
        pages: [
          "It wasn't like this in the spring. It was just a wood. I used to sleep in it.",
          "Now the willows have gone black and the river's gone quiet. I'm scared. I just don't see the use in saying so.",
        ],
      },
      {
        ask: "What do Marcian's marks say?",
        when: { flag: 'read:logbook' },
        pages: [
          "A Warden cut a feather's shape into the bark and pinned the feather in the cut. The feathers rotted years ago. The cuts are still there.",
          "Goose is onward. Jay is danger, go round. Owl is shelter, or a cache. Heron is the water, the crossing.",
          "His logbook says where he cut them. Camp, the dell, the old road, the lodge. Then the ford.",
        ],
      },
      {
        ask: 'Who was the lantern in the trees?',
        when: { flag: 'lantern_out' },
        pages: [
          "The drovers' grey stranger. The wizard's man, or his master. Whatever he is, he's not afraid of this wood.",
          "Wisps don't swing. Lanterns do. Somebody was carrying that.",
        ],
      },
    ],
  },
  hesketh: {
    name: 'Hesketh Coll',
    title: 'Kiln-master of Kilnholt',
    label: 'Hesketh',
    intro: [
      "That's close enough. We don't open the ring after dusk. Not for anyone.",
      "...Ashdown's girl? Come in, then. Before the light goes.",
      "Hesketh Coll. I keep the kilns. The kilns keep us.",
    ],
    greeting: 'Mind the kilns.',
    greetings: [
      { when: { flag: 'thane_down' }, text: "Fire's lit at the barrow door, Ada says. Good. The Wardens kept it a hundred years. Somebody ought to." },
      { when: { flag: 'kilns_held' }, text: "Eight kilns. Five lit at dawn. We've had worse nights. Not many." },
      { when: { quest: 'ring_of_kilns', is: 'active' }, text: "They come at dusk. Kill them before they lie down on the kilns. That's all there is to it." },
    ],
    shop: { name: "Kilnholt's charcoal", sells: ['charcoal', 'log', 'bandage'] },
    topics: [
      {
        ask: 'Why do the kilns keep you alive?',
        pages: [
          "Fire. The thorns won't grow inside the ring, and the dead won't cross it. We worked that out the first night, by the ones it didn't save.",
          "Except our own dead. The ones who went in the first nights come back every night, black with soot, and lie down on the kilns till they go out.",
          "Every night the ring's a little thinner.",
        ],
      },
      {
        ask: 'You knew Marcian.',
        when: { flag: 'kilns_held' },
        pages: [
          "Every week, regular as frost, on his round. Ate at Dunn's table. Sang for the children. Badly.",
          "He'd told me he was going away. So when the riders said he'd run, I thought, well. He said he was going.",
        ],
      },
      {
        ask: 'Who are the dead on the kilns?',
        when: { flag: 'scene:smothering' },
        pages: [
          "Col Brenner. Old Hob. Hob's boy. The Tibbet sisters. Burners, all of them, and good ones.",
          "They died putting the kilns out the first night, when we didn't know any better. Now they can't stop.",
        ],
      },
    ],
  },
  ada: {
    name: 'Ada Coll',
    title: 'Woodcutter of Kilnholt',
    label: 'Ada',
    intro: [
      "Lake folk. And the poacher. Wonderful.",
      "Ada. I cut wood, I saw wood, I burn wood. If you're not here to help with any of that, stand somewhere else.",
    ],
    greeting: "Lake folk.",
    greetings: [
      { when: { flag: 'broodmother_down' }, text: "The dell's quiet. I'll take a crew in tomorrow and burn the rest. Thank you. Don't make me say it twice." },
      { when: { flag: 'willow_sawn' }, text: "Road north's clear. Took four of us and most of the morning. You're welcome." },
    ],
    topics: [
      {
        ask: 'Can you clear the road north?',
        when: { all: [{ quest: 'last_round', is: 'active' }, { not: 'willow_sawn' }] },
        once: true,
        then: { flags: ['willow_sawn'] },
        pages: [
          "The black willow across the old road? Fire won't take it and an axe bounces off. I know. I tried.",
          "The long saw might. Two at each end and a lot of swearing. Fine. For Marcian. Not for you.",
          "Ada and two burners shoulder the long saw and go up the north road. An hour later you hear it come down.",
        ],
      },
      {
        ask: 'What happened in the spider dell?',
        pages: [
          "I lost three cutters there this spring. Good men. Something came down out of the willows and they were gone.",
          "I want it burned out. All of it. The eggs, the webs, and whatever hangs at the back.",
        ],
      },
      {
        ask: 'You and Wren don\'t get on.',
        when: { flag: 'wren_follows' },
        pages: [
          "She takes the King's deer and leaves the guts in my cutting. We get on fine.",
          'She calls me "the axe". I\'ve been called worse. By her, mostly.',
        ],
      },
    ],
  },
  pell: {
    name: 'Grandad Pell',
    title: 'An old poacher',
    label: 'Pell',
    intro: [
      "Eh? Speak up. Eighty years old, and the last sixty spent listening for foresters. Ears don't work so well now.",
      "Pell. Grandad, they call me. I've no grandchildren. It's the beard.",
    ],
    greeting: 'Eh?',
    greetings: [
      { when: { flag: 'tam_buried' }, text: "Tam's in the ground. Sixty years. I can stop looking at that tree now." },
    ],
    topics: [
      {
        ask: 'Why do you hate the foresters?',
        pages: [
          "The old King hanged my brother Tam for a deer. Sixteen, he was. Up on the Gallows Willow by the Ride, with the others.",
          "Now the King's own dogs run dead in the fields. I'd call that fair, if it weren't Millbrook's sheep they're eating.",
        ],
      },
      {
        ask: 'Did you know the Warden lad?',
        pages: [
          "Marcian? He cut one down, once. Off the Gallows Willow. A man they'd hanged for a hare. Buried him and all.",
          "Got in trouble for it. Good lad.",
        ],
      },
    ],
  },
  dunn: {
    name: 'Mother Dunn',
    title: 'Cook of Kilnholt',
    label: 'Mother Dunn',
    intro: [
      "Sit. Eat. You're too thin, all of you. Everyone who comes through that ring is too thin.",
      "Dunn. Mother Dunn, to everyone under fifty, and that's everyone.",
    ],
    greeting: "There's stew. There's always stew.",
    greetings: [
      { when: { flag: 'dunn_bakes' }, text: "Maud's flour! Proper pies again. Don't touch, they're hot. Oh, go on, then." },
    ],
    shop: {
      name: "Mother Dunn's table",
      sells: ['bread', 'roast_venison', 'bandage'],
      more: [{ when: { flag: 'dunn_bakes' }, sells: ['dunn_pie'] }],
    },
    topics: [
      {
        ask: 'You knew Marcian.',
        pages: [
          "Too thin, always. Ate like a wolf and sang like a gate. The children loved him.",
          "He'd sit there, at the end of the bench, and let them climb all over him. Every week. And then one week he didn't come.",
        ],
      },
      {
        ask: 'How do you feed everyone?',
        pages: [
          "Badly. No flour since the bells. The mill's three hours down the river and nobody goes through those thorns.",
          "Venison, when somebody brings it. Which is never, unless a poacher's about.",
        ],
      },
    ],
  },
  bess: {
    name: 'Bess Tanner',
    title: 'A widow of Millbrook',
    label: 'Bess',
    intro: [
      "Have you seen him? A boy, ten years old, with a lantern. He's out in the wood. I've seen his light.",
      "Bess Tanner. My Davy went in the Lisle last spring, before the bells. They never found him. But I've seen his lantern.",
    ],
    greeting: 'Have you seen his light?',
    greetings: [
      {
        when: { flag: 'bess_free' },
        text: "It wasn't him. It was never him, was it. I only wanted to see him once more. Is that so much to ask?",
      },
    ],
    topics: [
      {
        ask: 'Tell me about Davy.',
        pages: [
          "Ten. Freckles. Couldn't sit still. He went down to the river after a duck's nest, and the river was high.",
          "Father Odo says he's with the Dawn. Then why is his light in the willows every night?",
        ],
      },
    ],
  },
  garrick: {
    name: 'Sir Garrick Thorne',
    title: "The Queen's Jailer",
    label: 'Sir Garrick',
    intro: [
      "You again. Stay if you like. Nobody else does.",
      "I watch the river. It runs south, to the lake. She could see the lake, from her window, before they bricked it up.",
    ],
    greeting: 'The river never answers.',
    topics: [
      {
        ask: 'Who wrote the letter?',
        pages: ["I don't know whose pen it was. I didn't ask. I never asked anything. That was my whole worth to them."],
      },
      {
        ask: 'Where is Marcian?',
        pages: [
          "We gave him to the old gravedigger at the fens, with orders to sink him.",
          "Ask Tull. If Tull still lives. If anything does, up there.",
        ],
      },
      {
        ask: 'What were the roots?',
        pages: [
          "His roots were brown, and warm, like they were alive. These are black, and cold.",
          "His magic's gone rotten, they say. I wouldn't know. I only ever held the sword.",
        ],
      },
      {
        ask: 'What was the grey thing at her window?',
        pages: [
          "A moth. A big grey moth, every night, the year before the thorns. It sat on her sill till dawn.",
          "I should have shot it.",
        ],
      },
    ],
  },
};

export const NPC_IDS = Object.keys(NPCS) as NpcId[];
