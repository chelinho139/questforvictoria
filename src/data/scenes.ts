import type { NpcId } from './npcs';
import type { At } from './regions/types';
import type { Effect } from './story';

/**
 * Scripted scenes: the camera, speech and story beats that the game plays out while you
 * watch (the arrival on the lakeshore, a boss's entrance, the false victory, the ending).
 * Steps run in order; `say` waits for a click (or Space / Enter).
 */
export type SceneStep =
  /**
   * A line in the scene box. `who` is an NPC, or any name in quotes for someone else.
   * `voice` says it aloud in their voice: kept for the lines that matter (someone's first
   * words, an alarm, a boss), so a scene isn't a run of hums.
   */
  | { say: string; who?: NpcId | string; voice?: boolean }
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
      { say: 'Breathe. Come on. Breathe, blast you.', who: 'aldric', voice: true },
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
      { say: 'Hear ye! By order of the Lady Isolde Vane, Steward of Corvalis and Hand of the late King!', who: 'pike', voice: true },
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
      { say: 'Inside! Everyone inside! Bar the doors!', who: 'odo', voice: true },
      { look: 'player' },
      { effect: { flags: ['millbrook_night'] } },
    ],
  },
  // at the top of the stair
  belfry: {
    steps: [
      { look: [10, 6] },
      { say: 'Under the cracked bell, an old man in a sexton\'s coat hauls on a rope that is not there.', who: 'Narrator' },
      { say: 'Late... late for the knell... the King is dead... the King is dead...', who: 'The Bell-Ringer', voice: true },
      { say: 'He turns. There is black lace knotted round his arm.', who: 'Narrator' },
      { look: 'player' },
    ],
  },
  // the Bell-Ringer falls
  bellringer_down: {
    steps: [
      { say: 'She hears... every bell...', who: 'The Bell-Ringer', voice: true },
      { say: 'The bell gives one last crack, and is silent.', who: 'Narrator' },
      { effect: { docs: ['lace_1'] } },
    ],
  },
  // the end of Act I, at Nan's
  nan_lace: {
    steps: [
      { say: 'What did he have on his arm? Show me. Lace. Black lace.', who: 'nan' },
      { say: "That's from a wedding veil. Hers was white. Her mother's veil, Elowen's. I took up the hem myself, the night before.", who: 'nan', voice: true },
      { say: 'That monster tore it up and gave it to his creatures. Like a favour. Like she was his to give.', who: 'nan' },
      { say: 'Nan turns the lace over in her hands for a long time, and says nothing more.', who: 'Narrator' },
      { banner: 'ACT I COMPLETE' },
      { effect: { flags: ['act1_done'] } },
    ],
  },

  // ---- Act II (docs/act2.md, "Scenes")
  // 1. Act II opens: a girl with a bow on the mill step
  wren_mill: {
    steps: [
      { look: [13, 27] },
      { say: 'A girl with a bow on her back is sitting on the mill step, glaring at the river as if it owes her money.', who: 'Narrator' },
      { say: "You're the ones who climbed the bell tower. Mam says you went to Aldric for her.", who: 'wren', voice: true },
      { say: "Seven years he knew where they found my brother's cloak. Seven years.", who: 'wren' },
      { say: "You're going to take me to him.", who: 'wren' },
      { look: 'player' },
    ],
  },
  // 2. at Aldric's camp
  wren_aldric: {
    steps: [
      { look: [35, 37] },
      { say: 'You found his cloak. And you told my mother NOTHING.', who: 'wren', voice: true },
      { say: 'I did.', who: 'aldric', voice: true },
      { say: 'Why?', who: 'wren' },
      { say: "Because I didn't know who did it, and I knew exactly who'd go looking. A girl of ten, with a bow taller than she was.", who: 'aldric' },
      { say: "The Weeping Bridge is up the Lisle, deep in the Weepwood. The Wardens' old crossing.", who: 'aldric' },
      { say: 'That last year, he spent his evenings at the hollow oak on the west shore. I thought he was watching the lake.', who: 'aldric' },
      { say: "Wren says nothing. Her knuckles are white on her bow.", who: 'Narrator' },
      { look: 'player' },
    ],
  },
  // 3. the hollow oak: a crow lifts off and flies north
  oak_crow: {
    steps: [
      { look: [11, 22] },
      { say: 'A crow sits on the old oak, watching the water. As you come near it lifts off and flies north without a sound.', who: 'Narrator' },
      { say: "Crows. They're everywhere since the bells.", who: 'wren', voice: true },
      { look: 'player' },
    ],
  },
  // 4. showing Wren the new feather
  crow_feather: {
    steps: [
      { say: "Black crow, quill down. 'I'm coming.'", who: 'wren', voice: true },
      { say: "It's fresh. It hasn't even been rained on. Nobody knows this code but him, and her, and Aldric.", who: 'wren' },
      { say: 'She looks out at the lake for a long time.', who: 'Narrator' },
      { say: "So who's coming?", who: 'wren' },
      { say: 'Nobody answers. Out on the Mirror, nothing moves.', who: 'Narrator' },
    ],
  },
  // 5. first arrival in the Weepwood
  into_weepwood: {
    steps: [
      { say: 'Under the thorns the river runs black and quiet.', who: 'Narrator' },
      { look: [24, 46] },
      { say: 'The willows have gone black, their branches ending in thorns. Pale spikes of bone grow up between the roots. The light comes down green and dim.', who: 'Narrator' },
      { say: "It wasn't like this in the spring. It was just a wood. I used to sleep in it.", who: 'wren', voice: true },
      { say: "Stay on the path, and if you see lights in the trees, don't follow them.", who: 'wren' },
      { look: 'player' },
      { effect: { flags: ['weepwood_found'] } },
    ],
  },
  // first arrival in the King's Chase
  into_chase: {
    steps: [
      { look: [34, 30] },
      { say: "The King's Chase. Wider glades, older oaks gone black, and everywhere the remains of royal order: boundary stones with the crown cut on them, a ride cut dead straight through the trees for horses.", who: 'Narrator' },
      { say: "His Chase. Anyone caught taking his deer was hanged. I've taken forty.", who: 'wren', voice: true },
      { look: 'player' },
      { effect: { flags: ['kingschase_found'] } },
    ],
  },
  // first arrival at Heron Reach
  into_reach: {
    steps: [
      { look: [38, 32] },
      { say: 'The Lisle runs wide and slow and black here. The bone spikes stand taller, and the light is the colour of pond water.', who: 'Narrator' },
      { say: 'Heron Reach. The Wardens kept this river for a hundred years. Look at it.', who: 'wren', voice: true },
      { say: 'Down at the ford, figures in rusted livery walk up and down, up and down, searching the road.', who: 'Narrator' },
      { look: 'player' },
    ],
  },
  // 6. first sight of Kilnholt
  kiln_ring: {
    steps: [
      { look: [58, 24] },
      { say: 'Smoke, and a ring of glowing mounds in a clearing. Faces behind them.', who: 'Narrator' },
      { say: "That's close enough. We don't open the ring after dusk. Not for anyone.", who: 'hesketh', voice: true },
      { say: 'Hesketh Coll. You used to give my brother bread.', who: 'wren' },
      { say: 'A long pause.', who: 'Narrator' },
      { say: "Ashdown's girl?", who: 'hesketh' },
      { look: 'player' },
      { effect: { flags: ['kilnholt_found'] } },
    ],
  },
  // 7. the night of The Ring of Kilns
  smothering: {
    steps: [
      { look: [46, 24] },
      { say: 'Figures come out of the trees, black as the kilns, and walk toward them without hurrying.', who: 'Narrator' },
      { say: "That's Col. That's Col Brenner. I buried him myself.", who: 'ada', voice: true },
      { say: 'Then bury him again.', who: 'hesketh', voice: true },
      { look: 'player' },
    ],
  },
  // 8. the morning after: badge and book
  badge_book: {
    steps: [
      { say: 'Hesketh puts a tarnished Warden badge in Wren\'s hand, and a logbook in yours.', who: 'Narrator' },
      { say: "Every week, regular as frost. Last time, he gave me these. Badge and book.", who: 'hesketh', voice: true },
      { say: "'If I'm not back by the new moon, give them to Aldric. Tell him I'm sorry, and that I've gone where he'd have gone, if he were young and stupid.'", who: 'hesketh' },
      { say: "I didn't know where Aldric's camp was. The Wardens were gone. And the riders said the boy ran south.", who: 'hesketh' },
      { say: "Wren takes the badge and doesn't say anything for a long time.", who: 'Narrator' },
      { effect: { docs: ['logbook'] } },
    ],
  },
  // 9. a lantern in the trees, the first night in the wood
  lantern: {
    steps: [
      { look: [43, 36] },
      { say: 'Far off between the willows, a lantern, swinging like someone walking. Going north.', who: 'Narrator' },
      { say: "That's no wisp. Wisps don't swing.", who: 'wren', voice: true },
      { say: 'It stops, as if whoever carries it has turned to look at you. Then it goes out.', who: 'Narrator' },
      { look: 'player' },
    ],
  },
  // 10. the kennels behind the hunting lodge
  kennels: {
    steps: [
      { say: 'Every pen open, the doors chewed through from the inside.', who: 'Narrator' },
      { say: "These were the King's hounds. The bone hounds in Millbrook's fields. They came from here.", who: 'wren', voice: true },
      { say: 'Wren sets the kennels alight and watches them burn.', who: 'Narrator' },
    ],
  },
  // 11. the Gallows Willow at dusk
  hanged: {
    steps: [
      { look: [12, 44] },
      { say: 'The ropes creak, though there is no wind.', who: 'Narrator' },
      { say: 'One by one, the hanged let go of the branch.', who: 'Narrator' },
      { look: 'player' },
    ],
  },
  // 12. the barrow hall: the Thane wakes
  thane_wakes: {
    steps: [
      { look: [15, 8] },
      { say: 'On a stone seat at the end of the hall an old chieftain lifts his antlered helm from his knees, and puts it on.', who: 'Narrator' },
      { say: 'Who wakes us?', who: 'The Thane under the Hill', voice: true },
      { say: 'The singer put us to sleep. Five hundred winters, under her song. Now the song runs backwards.', who: 'The Thane under the Hill' },
      { look: 'player' },
    ],
  },
  thane_falls: {
    steps: [
      { say: 'Someone wears her crown with a cold heart.', who: 'The Thane under the Hill', voice: true },
      { say: 'She sang. Not him... not the sellsword. She...', who: 'The Thane under the Hill' },
      { say: 'He lies down on his seat and is still.', who: 'Narrator' },
      { say: 'The wizard. Who else wears it?', who: 'wren' },
    ],
  },
  // 13. Heron Lodge, the hearth lit: the roll
  the_roll: {
    steps: [
      { say: 'The roll of the Wardens of the Lisle, cut into the beam over the hearth in forty hands. One name has been hacked out with an axe, and THIEF carved over the splinters.', who: 'Narrator' },
      { say: 'Wren takes out her knife and cuts it back, letter by letter: MARCIAN ASHDOWN.', who: 'Narrator' },
      { say: 'There. Let them come and scratch it out again.', who: 'wren', voice: true },
      { effect: { docs: ['warden_roll'] } },
    ],
  },
  // 14. Nan and page six
  nan_page6: {
    steps: [
      { say: '"He said I was too old for a nurse. I think he meant I was too old to be loved by anyone but him."', who: 'nan' },
      { say: 'I fought them on the stair. Did she know that? I bit one of them. Sixty-seven years old and I bit a grown man.', who: 'nan', voice: true },
      { say: 'She is quiet a while.', who: 'Narrator' },
      { say: 'She thought I let them take me. When you bring her home, I\'ll tell her myself.', who: 'nan' },
    ],
  },
  // 15. Nan and the game book
  nan_gamebook: {
    steps: [
      { say: 'Nan turns the pages slowly.', who: 'Narrator' },
      { say: "The Queen's Day. That's what the court called it, for the old queen.", who: 'nan', voice: true },
      { say: 'It was my girl\'s birthday too. Nobody ever called it that.', who: 'nan' },
      { say: "She'd sit in the window of the south tower all day and watch the road for the hunt to come home. And when it came, he'd go straight past her.", who: 'nan' },
    ],
  },
  // 16. the bridge, first sight
  bridge_halt: {
    steps: [
      { look: [30, 22] },
      { say: 'Two great black willows, an old stone bridge, and in the middle of it a knight in rusted royal armour, hands folded on his sword.', who: 'Narrator' },
      { say: 'Halt. No one crosses. By order of the King.', who: 'Sir Garrick Thorne', voice: true },
      { say: "The King's dead, you tin can.", who: 'wren', voice: true },
      { say: 'Halt. No one crosses. By order of the King.', who: 'Sir Garrick Thorne' },
      { say: 'Black lace is knotted round his sword arm.', who: 'Narrator' },
      { look: 'player' },
    ],
  },
  // 17 and 18. the confession, and Wren's arrow
  garrick_falls: {
    steps: [
      { say: 'He goes down on one knee and lowers his sword, for the first time in seven years.', who: 'Narrator' },
      { say: 'Seven years I\'ve stood on this bridge. You want to know what happened here. I tell the river every night. It never answers.', who: 'Sir Garrick Thorne', voice: true },
      { say: 'The King had a letter put in the boy\'s hands. In her writing: the Weeping Bridge, at moonrise. She never wrote it. I don\'t know whose pen it was. I didn\'t ask.', who: 'Sir Garrick Thorne' },
      { say: 'He came at moonrise, the Warden boy, smiling, with a ring in his fist. The wizard was waiting under the bridge. Roots came up out of the bank and held him.', who: 'Sir Garrick Thorne' },
      { say: "He blew his whistle. The Warden call. Nobody came. And the King sat his horse on the bank, and watched, and said, 'Now.'", who: 'Sir Garrick Thorne' },
      { say: 'It was my sword.', who: 'Sir Garrick Thorne' },
      { say: 'We gave him to the old gravedigger at the fens, with orders to sink him. I kept his whistle. I don\'t know why.', who: 'Sir Garrick Thorne' },
      { say: 'Then they made me her jailer. Seven years at the top of the stair with the key on my belt. I heard what he did to her behind that door. Every time. And afterwards I turned the key.', who: 'Sir Garrick Thorne' },
      { say: 'She sang, the first year. Through the door. Then she stopped.', who: 'Sir Garrick Thorne' },
      { say: 'Tell her I\'m sorry. I should have let her run. And the grey thing at her window, every night, the year before the thorns. I should have shot it.', who: 'Sir Garrick Thorne' },
      { say: 'He holds out a small bone whistle, yellow with age.', who: 'Narrator' },
      { say: 'Wren nocks an arrow and draws it to her ear, aimed at the knight\'s heart.', who: 'Narrator' },
      { say: 'Look at me.', who: 'wren', voice: true },
      { say: 'He looks at her. She looses; the arrow goes through him and clatters on the stones.', who: 'Narrator' },
      { say: "Of course. You're already dead. You don't even get to die.", who: 'wren' },
      { say: "The King's dead too. That leaves one. The next one's for the wizard.", who: 'wren' },
      { say: "The fens. They put him in the fens. When this is done, I'm going to find him.", who: 'wren' },
      { effect: { docs: ['lace_2'], flags: ['garrick_confessed'] } },
    ],
  },
  // 19. the lamp: the end of Act II
  lamp: {
    steps: [
      { say: 'Mam. He didn\'t run. They killed him at the bridge. The King, and the wizard, and a knight with a sword.', who: 'wren', voice: true },
      { say: 'Maud is quiet for a long time.', who: 'Narrator' },
      { say: "I know, love. I've always known. I only needed someone to say it.", who: 'maud', voice: true },
      { say: 'She goes to the window, and for a moment it looks as if she\'ll blow the lamp out. She turns the wick up instead.', who: 'Narrator' },
      { say: "It's for you now. For all of you, going north. Come home.", who: 'maud' },
      { banner: 'ACT II COMPLETE' },
      { effect: { flags: ['act2_done'] } },
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
