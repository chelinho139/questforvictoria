/**
 * Documents the heroes find and keep in their journal (J, the Journal tab): Victoria's
 * diary pages, the Unsent's letters, proclamations, notes, and the black lace favours.
 * Each one is a clue (docs/lore.md, "The trail of hints").
 */
export type DocKind = 'diary' | 'letter' | 'proclamation' | 'note' | 'favour';

export interface DocDef {
  title: string;
  kind: DocKind;
  /** Who wrote it or where it was found, shown under the title. */
  from?: string;
  /** Paragraphs. */
  text: string[];
}

export const DOC_KINDS: Record<DocKind, string> = {
  diary: "Victoria's diary",
  letter: 'Letters',
  proclamation: 'Proclamations',
  note: 'Notes',
  favour: 'Black lace',
};

export const DOCS: Record<string, DocDef> = {
  // ---- Prologue and Act I (docs/act1.md)
  hollow_proclamation: {
    title: "The Hollow King's proclamation",
    kind: 'proclamation',
    from: "Nailed to the board by Aldric's camp",
    text: [
      'BY THE GRACE OF THE CROWN OF DAWN.',
      'Be it known to every soul in Corvalis that Osric, third of that name, is dead; that his daughter Victoria is Queen; and that her lawful husband, Ambrose of the Root Tower, holds the realm in her name as King.',
      'The dead walk because the realm has strayed. Let every door be barred at sunset. Let no one go north. Let no one come for her.',
      'Ambrose, King.',
      'And below it, in a small, fine hand: Victoria R.',
    ],
  },
  bounty_notice: {
    title: "The Steward's bounty",
    kind: 'proclamation',
    from: "The herald's board, Millbrook square",
    text: [
      'By order of the Lady Isolde Vane, Steward of Corvalis and Hand of the late King:',
      'TEN THOUSAND CROWNS to whoever brings Her Majesty Queen Victoria out of the tower of Thornhallow, and the false king Ambrose to justice.',
      'Proof of the deed to be brought to the Steward at Ashford.',
    ],
  },
  diary_1: {
    title: 'A page of a diary',
    kind: 'diary',
    from: 'Nan Merrow: "It blew down the Lisle on the night wind."',
    text: [
      'A boy pulled me out of the lake today. He had duckweed in his hair and he laughed at me the whole way home. He never asked who I was.',
      "I'm going back tomorrow to thank him. That's all. Just to thank him.",
    ],
  },
  diary_2: {
    title: 'A second page',
    kind: 'diary',
    from: 'Nan Merrow',
    text: [
      'A grey goose feather in the oak today. That means tomorrow.',
      'Marcian says a Warden can read a whole letter in a pocketful of feathers. I said a princess could write one.',
    ],
  },
  diary_3: {
    title: 'A third page',
    kind: 'diary',
    from: 'Nan Merrow',
    text: [
      'Father has sold me. The price was a war, and the buyer is the wizard they call Potatoe Face.',
      'I told Father I will marry Marcian or no one. He said, "Then no one will have Marcian."',
      "I didn't understand what he meant.",
    ],
  },
  letter_1: {
    title: 'To the King, at Castle Corvane',
    kind: 'letter',
    from: 'Left on a doorstep in Millbrook, at night. The seal is unbroken; the paper is seven years old.',
    text: [
      'Dear Father,',
      'I will do my duty. I will smile at his feasts and I will sign what I am given. I only ask that Nan may stay with me. Please. She is all I have.',
      'Your daughter, Victoria.',
    ],
  },
  lace_1: {
    title: 'A scrap of black lace',
    kind: 'favour',
    from: "Knotted round the Bell-Ringer's arm",
    text: [
      "A torn strip of fine lace, black as soot, tied round the arm the way a knight wears his lady's favour.",
      'Deep in the weave, here and there, a thread is still white.',
    ],
  },

  // ---- Act II (docs/act2.md, "Documents")
  feather_key: {
    title: "Marcian's feather key",
    kind: 'note',
    from: 'The hollow oak, wrapped in a Warden\'s oilskin',
    text: [
      'For V., so you can read me when I\'m late, and read the trail when you come to find me.',
      'Grey goose: tomorrow (on a trail, onward). Owl: tonight, at moonrise (on a trail, shelter). Heron: at our bridge (on a trail, the crossing). Jay: don\'t come, there are people about (on a trail, danger, go round).',
      'Swan\'s down: yes. Two feathers crossed: always. Black crow, quill down: I\'m coming.',
      "Burn this. (You won't.) M.",
    ],
  },
  v_note_1: {
    title: 'A note signed V.',
    kind: 'note',
    from: 'The hollow oak',
    text: ["Owl feather found. Moonrise, then. I'll bring the bread if you bring the stars.", 'And a better song: your last one frightened the ducks.', 'V.'],
  },
  v_note_2: {
    title: 'Another note signed V.',
    kind: 'note',
    from: 'The hollow oak, at the bottom: the last thing she left',
    text: ["They say you robbed the treasury and ran. I know you didn't.", "If you're hiding, I'll wait. If you're dead, I'll find you.", 'V.'],
  },
  crow_feather: {
    title: 'A black crow feather',
    kind: 'note',
    from: 'The hollow oak, on top of everything',
    text: ["Fresh and glossy, laid quill-down. The rain hasn't touched it.", 'In Marcian\'s key, a black crow, quill down, means: I\'m coming.'],
  },
  logbook: {
    title: "Marcian's logbook",
    kind: 'note',
    from: 'Left with Hesketh Coll at Kilnholt, "in case"',
    text: [
      'The round of the Lisle. Marcian Ashdown, Warden.',
      'Spring, the 3rd. Wolves at the Chase edge, two. Jay recut at the spider dell. Bread at Kilnholt; Mother Dunn says I\'m too thin. The children made me sing. The ducks left.',
      'The 10th. Barrow quiet; fire lit at the door. Heron Lodge roof leaks. Owl recut over the lodge door. Caches stocked: the split oak, the old weir, under the leaning stone.',
      'The 17th. Gallows Willow: the foresters have hanged a man for a hare. Cut him down and buried him. Will hear about it.',
      'The 24th. Asked Aldric if a Warden may marry. He laughed and said a Warden may do as he likes, so long as the fire is kept. Bought iron for a ring.',
      'The marks of the round, for whoever walks it after me: a goose by the river camp, a jay at the dell, a goose on the old road above Kilnholt, the owl over the lodge door, the heron at the ford, and the last at the mist.',
      'The last. A letter from V. Her own hand, but not through the oak, which she has never once done. The bridge, at moonrise. Odd. I\'m going anyway. Badge and book to Hesketh, in case.',
    ],
  },
  warden_roll: {
    title: 'The roll of the Wardens',
    kind: 'note',
    from: 'Heron Lodge, the beam over the hearth',
    text: [
      'The Wardens of the Lisle, cut into the beam in forty hands, the oldest worn almost smooth. Edric. Aldric. Forty names in all.',
      'One has been hacked out with an axe and THIEF carved over the splinters.',
      'Wren cut it back, letter by letter: MARCIAN ASHDOWN.',
    ],
  },
  king_game_book: {
    title: "The King's game book",
    kind: 'note',
    from: "The King's hunting lodge, on the table",
    text: [
      'Page after page in the foresters\' hand, one hunt a year, always on the same day.',
      'The Queen\'s Day. The King rides out at dawn with the hounds, Bellow, Grief, Old Tally and Bramble. A hart and two boar. The King does not speak.',
      'Year after year, the same. The Queen\'s Day. The King rides out at dawn, though the princess asked to come.',
      'Twenty-five of them. The last: The Queen\'s Day. No hunt. The King keeps to his bed.',
    ],
  },
  steward_dispatch: {
    title: "The Steward's dispatch",
    kind: 'letter',
    from: "Pike's courier's bag, from the outriders' chief",
    text: [
      'From the Steward, to Sergeant Pike at Millbrook.',
      'Pay out no bounty without proof. If Her Majesty is found, she is to be brought to Ashford by night, under guard, and spoken to by no one. No one, Sergeant.',
      'Burn this. I. V.',
    ],
  },
  search_orders: {
    title: "The search party's orders",
    kind: 'note',
    from: 'On the sergeant of the search party. The paper is seven years old.',
    text: [
      'The lady has left her room by the window. Search the Weepwood road as far as the river.',
      'She is to be back in her room before my lord wakes, or it will go worse for her.',
      'Crane, steward.',
    ],
  },
  diary_4: {
    title: 'A fourth page',
    kind: 'diary',
    from: 'Caught on the thorns in the Weepwood',
    text: ['They say Marcian robbed the treasury and ran south. He wouldn\'t. He wouldn\'t. He would NOT.', "I am to be married on Saturday. I will wear Mother's veil, so that at least one person there loves me."],
  },
  diary_5: {
    title: 'A fifth page',
    kind: 'diary',
    from: 'Caught on the thorns in the Weepwood. "Thornhallow, the first autumn."',
    text: [
      'I would not smile at his guests tonight, so he struck me, there at the table, in front of all of them. Lady Mirabel laughed behind her fan.',
      "Afterwards he stood outside my door and cried, and in the morning there was a new gown on my bed. I don't know which part frightened me more.",
    ],
  },
  diary_6: {
    title: 'A sixth page',
    kind: 'diary',
    from: 'Caught on the thorns at Heron Reach. "The first winter."',
    text: [
      'He sent Nan away today. He said I was too old for a nurse. I think he meant I was too old to be loved by anyone but him.',
      'I wrote to Father. I will write every week until he answers.',
    ],
  },
  diary_7: {
    title: 'A seventh page',
    kind: 'diary',
    from: 'Caught on the thorns by the road past the mist. "The second year."',
    text: [
      'I got as far as the Weepwood. I could smell the lake. Sir Garrick carried me back like a sack of flour and would not look at me.',
      'Three days now with no candle and no supper. They are bricking up my window. I can still see one stripe of sky.',
      "I am going to stop singing now. There's no one left to hear it but him.",
    ],
  },
  letter_2: {
    title: 'To Nan Merrow, Millbrook',
    kind: 'letter',
    from: "Left on the mill's doorstep at night: the wrong door (Nan's is next along). The seal is unbroken.",
    text: [
      'Nan,',
      'he says you were sent away for stealing. I know you never stole anything in your life except cake for me.',
      "I will find a way to bring you back. Don't forget me.",
    ],
  },
  letter_3: {
    title: 'To the King, at Castle Corvane',
    kind: 'letter',
    from: "Left on Heron Lodge's step at night. The second year.",
    text: [
      'Father,',
      'they have bricked up my window. I can see one stripe of sky.',
      'He hurts me, Father. He hurts me, and then he cries and brings me dresses. I will be good. I will be so good. Please let me come home.',
    ],
  },
  kings_bridge: {
    title: "The King's bridge",
    kind: 'proclamation',
    from: 'Nailed to the post at the south end of the Weeping Bridge',
    text: [
      'BY ORDER OF THE KING.',
      'The Weeping Bridge is closed, now and for ever. Let no one cross it. Let no one fish beneath it, or sing upon it, or stop there to rest. Whoever is found upon it shall be held there until the river runs dry.',
      'Ambrose, King. The letters wander, as if the pen had been very heavy.',
      'And below, small and fine and dark, pressed so hard the nib has torn the paper: Victoria R.',
    ],
  },
  grey_dust: {
    title: 'Grey dust and a dead moth',
    kind: 'note',
    from: 'Where the lantern went out, in the Weepwood',
    text: ['Where the lantern went out there are no footprints, only a drift of fine grey dust on the moss, like ash from a cold fire,', 'and a dead moth as big as your hand.'],
  },
  lace_2: {
    title: 'A second scrap of black lace',
    kind: 'favour',
    from: "Knotted round Sir Garrick's sword arm",
    text: ['The same lace as the first, black as soot, a white thread here and there deep in the weave.', 'The torn edges match. Two pieces of one veil.'],
  },

  // A test page for the dev field (the real pages arrive with Act I).
  test_note: {
    title: 'A note in the grass',
    kind: 'note',
    from: 'Found in the Test Field',
    text: ['If you can read this, the journal works.', 'Nothing else is written here.'],
  },
};
