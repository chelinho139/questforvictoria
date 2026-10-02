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

  // A test page for the dev field (the real pages arrive with Act I).
  test_note: {
    title: 'A note in the grass',
    kind: 'note',
    from: 'Found in the Test Field',
    text: ['If you can read this, the journal works.', 'Nothing else is written here.'],
  },
};
