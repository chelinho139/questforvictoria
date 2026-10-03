/**
 * People in the world. Each says hello, may have a topic to ask about, and may have quests
 * (where they stand is up to each region, data/regions) (see data/quests.ts, which names its giver).
 */

import type { Cond, Effect } from './story';
import type { ItemId } from './items';

export type NpcId = 'aldric' | 'nan' | 'maud' | 'pike' | 'odo' | 'tobin' | 'bram';

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
    greetings: [{ when: { quest: 'lamp_window', is: 'done' }, text: "I keep the lamp lit. I always will. But it's easier now, knowing he didn't run." }],
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
        pages: [
          'A daughter. Wren. She was ten when her brother went.',
          "She's off in the woods, mostly. Hunting, she says. Looking for him, I say. She never believed he ran either.",
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
    topics: [
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
    greetings: [{ when: { flag: 'bellringer_down' }, text: "It's quiet. Every night, quiet. I'd forgotten what the dark sounds like without that bell." }],
    topics: [
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
      sells: ['bread', 'bandage', 'cooked_meat', 'leather_cap', 'leather_tunic', 'leather_trousers', 'leather_boots', 'wooden_shield', 'woodcutter_axe', 'pickaxe', 'hunting_bow', 'leather_quiver'],
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
    shop: { name: "Bram's smithy", sells: ['iron_bar', 'iron_sword', 'iron_shield', 'yew_longbow', 'hunters_quiver', 'iron_helm', 'chainmail', 'iron_greaves'] },
    topics: [
      {
        ask: 'Tell me about Millbrook.',
        pages: ['Mill. River. Chapel. Thorns in the fields this spring. Dead in the churchyard every night.', "Used to be a good place. Still is, in the day."],
      },
    ],
  },
};

export const NPC_IDS = Object.keys(NPCS) as NpcId[];
