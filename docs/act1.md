# Prologue & Act I: build spec

*What the first playable slice of the campaign contains. Everything here comes from the lore (docs/lore.md).*

> **Built (October 2026).** Everything below is in the game, played through end to end in testing. Where the build differs from this plan:
> - **Levels:** with the new level curve, a hero reaches about level 3–4 by the end of the Prologue and 6–7 by the end of Act I (a level takes 100 XP at first, up from 60, after playtesting found levelling too quick). To tune in play.
> - **Letter at the Door** became Nan's quest *Letters at the Door*: after the first night she asks you to find one of the grey postman's letters.
> - **Bram** sells iron gear and buys anything, but his forge is not a crafting station (build your own, as before).
> - **Art:** every building, prop, villager and creature listed under *Art to make* is drawn; the crows are not (yet).

---

## The slice in one paragraph

The heroes wake on the shore of Lake Ellory and learn to survive with Warden Aldric (the prologue, levels 1–3, ring 0). They read the Hollow King's proclamation, take the road north to the mill village of Millbrook (Act I, levels 3–7, ring 1), meet Nan Merrow and her pages of the queen's diary, find a letter left on a doorstep by a grey postman at night, and climb the chapel's bell tower to stop the thing that rings the bell backwards and wakes the dead. It ends with the Bell-Ringer's death, a scrap of black lace on his arm, and Nan saying *"That monster tore up her veil."* About an hour to an hour and a half of play.

**Out of this slice:** the Weepwood and everything north of Millbrook (Act II), Ashford and Castle Corvane (later), Wren (arrives in Act II), the Greyfang Hills (Act III).

---

## How it plays, start to finish

1. **Wake.** A short scene: black, the sound of water, Aldric's voice. The heroes are on the south shore of the lake, nearly naked, with a rusty sword.
2. **Prologue with Aldric** (the quest chain already in the game, with the new story): slimes, a campfire and cooked meat, a forge, Warden steel, the first night of skeletons rising from the barrows.
3. **The proclamation.** Aldric's camp has a notice board: the Hollow King's proclamation, signed by the wizard and, below, in a fine hand, *Victoria R.* Aldric explains it away: *"He makes her sign his evil."* He sends the heroes north to find Nan Merrow in Millbrook.
4. **Millbrook.** Arriving plays a scene: the Steward's herald reading out the bounty in the square. The village is touched by the Blackthorn: grey patches in the grass, black thorn shoots along the fences, wilted crops.
5. **Nan and Maud.** Nan gives the first three diary pages and asks the heroes to find out what is wrong at the chapel. Maud, at the mill, keeps a lamp in her window for her son, and asks what the old Warden really knows.
6. **The first night in Millbrook.** The chapel bell rings backwards, the churchyard opens, and a grey postman walks the lanes, leaving a letter on a doorstep.
7. **The bell tower.** Father Odo gives the heroes the key. Up the stair, in the belfry: the Bell-Ringer.
8. **The lace.** He falls; on his arm, a scrap of black lace. Back in Millbrook, Nan turns it over in her hands. Act I ends.

---

## Regions

The current test meadow is replaced by the real Greenmarch. Two new regions are added; the bell tower is an interior you enter through the chapel door.

### 1. Lake Ellory & the Greenmarch (ring 0)

About 72 × 60 tiles. Green, sunny, safe by day. Skeletons climb out of two old barrows at night.

```
 . . . . . (road north to Millbrook) . . . . . . . . . . . . . . .
 .   barrow        Marcian's willow                 goblin raiders .
 .    (skeletons)       \                           (camp, east)   .
 .           ~~~~~~~~~~~~~~~~~~~~~~                                 .
 .  hollow  ~~~~~~~~~ LAKE ELLORY ~~~~~~~~~      rocks, iron ore     .
 .   oak ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~                        .
 .         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~                 (path east:
 .   meadows, cows, slimes       |                        rockfall,
 .           Aldric's camp  ---- road                     closed)
 .           (tent, fire, board)  |          barrow (skeletons)    .
 .     the shore where you wake   |                               .
 . . . . . . . (road south to Ashford: closed by the Steward) . . .
```

- **Where you wake:** the south shore.
- **Aldric's camp:** a tent, a campfire, and the notice board with the proclamation.
- **The hollow oak** (west shore) and **Marcian's willow** (north shore) stand here already. Nothing happens at them until Act II and Act V.
- **Barrows:** two mounds where skeletons rise at night.
- **Goblin raiders:** a small camp in the east, the Greyfang clans' first raid (loot and XP, optional).
- **Exits:**
  - north to Millbrook (open);
  - south to Ashford: a Steward's barricade. Walking into it: *"Soldiers behind a barricade: 'Nobody goes through to Ashford until the Steward says so.' Bring the Steward news from the north worth hearing, and the road will open (later in the story)."*;
  - east to the Greyfang Hills: a rockfall. *"A rockfall blocks the hill path. It will take more than one pair of hands to clear (later in the story)."*

### 2. Millbrook (ring 1)

About 64 × 56 tiles. A mill village on the river Lisle, and the first place the Blackthorn touches: grey circles in the grass, black thorn shoots pushing up through the fences, wilted crops, crows everywhere.

```
 . . . . . (north road: thorns as thick as your arm, closed) . . . .
 .   fields (wilted, thorn shoots)    |      churchyard  CHAPEL     .
 .                                    |      + graves    + bell     .
 .   Maud's MILL ===wheel=== ~~~~ river Lisle ~~~~       tower      .
 .   (lamp in the window)       ~~~~ bridge ~~~~                    .
 .        cottages     village square (herald, notice board, well)  .
 .   Nan's cottage        cottages        fields (bone hounds at    .
 .                                                night)            .
 . . . . . . . . (road south to the Greenmarch) . . . . . . . . . . .
```

- **The square:** Sergeant Pike, the Steward's herald, and a notice board with the bounty.
- **Nan's cottage:** at the west end. **Maud's mill:** on the river, with a lamp in its window that is always lit.
- **The chapel:** its bell tower, and a churchyard where the dead rise at night.
- **Fields:** wilted crops, thorn shoots to burn, and bone hounds at night.
- **Exits:**
  - south to the Greenmarch;
  - north to the Weepwood: a wall of black thorns. *"Black thorns as thick as your arm close the north road. Someone who knows the woods could find a way through (Act II)."*;
  - the chapel door into the bell tower (locked until Father Odo gives you the key).
- **Closed roads explain themselves:** each has something you can see in the way (a barricade, a rockfall, a thorn wall), and walking into it says what blocks it and what will open it.

### 3. The bell tower (interior, ring 1)

About 20 × 30 tiles, entered through the chapel door.

- **Ground floor:** the bell rope.
- **Then up:** a narrow stair.
- **The belfry:** a round room under the cracked bronze bell, which is the boss arena.

---

## People

| Name | Where | Who they are | What they do in this slice |
|---|---|---|---|
| **Warden Aldric** | Greenmarch, his camp | The last Warden; Marcian's mentor | The prologue quests; sends you north; new things to ask about (the Hollow Night, the wizard, the queen, the Wardens) |
| **Nan Merrow** | Millbrook, her cottage | Victoria's old nurse | Diary pages 1–3; asks about the chapel; explains the clues away out of love |
| **Maud Ashdown** | Millbrook, the mill | Marcian's mother | The lamp in the window; asks what Aldric knows about her son |
| **Sergeant Pike** | Millbrook, the square | The Steward's herald | Reads out the bounty: *ten thousand crowns to whoever rescues the queen* |
| **Father Odo** | Millbrook, the chapel | A frightened village priest | Tells how the old sexton rang the King's death knell and died that same night; gives the tower key |
| **Tobin the trader** | Millbrook, a stall in the square | A peddler who stayed when the others ran | Buys anything; sells food, bandages, lamp oil, simple tools and leather gear |
| **Bram the smith** | Millbrook, the smithy | The village blacksmith | Sells iron bars, weapons, shields and armour; buys anything |
| **The grey postman** (the Unsent) | Millbrook lanes, at night | Not a person any more | Walks the lanes and leaves a letter on a doorstep. Can't be fought yet: he fades when you come close (see below). |

**Why the grey postman can't be fought:** he is a ghost bound to his round, not a creature of flesh. Walking up to him or clicking him says so: *"The grey postman turns his blank face toward you and is gone, like breath on a window. Whatever he is, steel can't reach him yet."* Nan and Father Odo both know him: *"Folk call him the Unsent. He's been walking the lanes since the bells. He never takes anything. He only leaves letters."* In Act III the heroes learn how to corner him.

**Buying and selling:** talk to Tobin or Bram and choose *"Let me see what you have."* A trade window lists what they sell with prices; your bag is on the other side, and anything worth a coin to them can be sold (for a twentieth of its price).

---

## Quests

★ marks the main story. XP numbers are a first pass, to be tuned in play.

### Prologue (Greenmarch, levels 1–3)

| Quest | From | Goals | Reward |
|---|---|---|---|
| ★ Slime in the Meadow | Aldric | Slay 3 slimes | Leather boots, 20 XP |
| A Warm Meal | Aldric | Build a campfire; cook 2 meat | Leather tunic, 20 XP |
| Stone and Fire | Aldric | Build a forge | Pickaxe, 25 XP |
| Warden's Steel | Aldric | Forge an iron sword | Edric's helm (iron helm), 30 XP |
| The Hollow Night | Aldric | Slay 3 skeletons at the barrows (night) | Chainmail, 35 XP |
| ★ **The Road North** *(replaces "To the Castle")* | Aldric | Read the proclamation on the camp board; reach Millbrook; find Nan Merrow | Queen Elowen's amulet (*"It was the queen's. The old queen."*), 20 XP |

### Act I (Millbrook, levels 3–7)

| Quest | From | Goals | Reward |
|---|---|---|---|
| ★ The Steward's Bounty | Sergeant Pike | Hear the proclamation; take a bounty notice | The proclamation (journal), 30 gold, 40 XP |
| ★ Nan's Pages | Nan | Talk to Nan; read her pages | Diary pages 1–3, 40 XP |
| Thorns in the Fences | Nan | Burn 6 black thorn shoots in the fields | Black thorn ×3 (a material), bread, 45 XP |
| The Lamp in the Window | Maud | Ask Aldric about Marcian (back in the Greenmarch); tell Maud what he said | Maud's bread and a warm cloak, 50 XP |
| Letter at the Door | (found) | Find the letter left on a doorstep at night; show it to Nan | Letter 1 (journal), 40 XP |
| King's Hounds | Sergeant Pike | Slay 6 bone hounds in the fields at night | Hound-leather trousers, 60 XP |
| ★ **The Bell Tolls Backwards** | Father Odo, once Thorns in the Fences, Letters at the Door and King's Hounds are handed in (until then he won't give a stranger the key) | Get the tower key; climb the bell tower; defeat the Bell-Ringer; show Nan what he carried | The black lace (journal), the sexton's lantern, 120 XP |

**What Maud learns** in *The Lamp in the Window*: Aldric tells you he found Marcian's cloak torn at the Weeping Bridge seven years ago, and that the Wardens were disbanded the same month. Maud hears it, and turns up her lamp. This plants the bridge for Act II.

---

## Enemies

| Creature | Where | Notes |
|---|---|---|
| Slime, cow | Greenmarch meadows | Already in the game |
| Skeleton | Greenmarch barrows, Millbrook churchyard, at night | Already in the game |
| Goblin, goblin shaman | Greenmarch, the raiders' camp (east) | Already in the game; the first Greyfang raid |
| **Bone hound** *(new)* | Millbrook fields, at night | The skeletons of the King's hunting dogs. Fast, in packs of 2–3, weak alone. |
| **The grey postman** *(new, not fought yet)* | Millbrook lanes, at night | Fades as you come close; returns in Act III as the Unsent |
| **The Bell-Ringer** *(new boss)* | The belfry | See below |

### The Bell-Ringer (boss)

Millbrook's old sexton, who rang the King's death knell forty days ago and died that night. Raised, and made to ring the knell backwards forever.

1. **The knell** (full health to two thirds): he swings the bell's clapper on a chain, slow and heavy.
2. **The bell** (two thirds to one third): he hauls on the rope. Each toll sends a ring of sound across the floor (step out of it) and calls up a wave of three skeletons from the floor.
3. **The crack** (below one third): the bell splits. The tolls come faster and the rings come in pairs, but he is out of breath between them.

When he falls, the bell goes silent and the dead in Millbrook's churchyard stop rising for the rest of Act I. He drops the black lace and the sexton's lantern.

---

## Items

| Item | Kind | Where it comes from |
|---|---|---|
| Queen Elowen's amulet | Trinket (the existing vigour amulet, renamed) | *The Road North* |
| Edric's helm | Helm (the existing iron helm, renamed) | *Warden's Steel* |
| **Bone hound fang** | Material | Bone hounds |
| **Black thorn** | Material (for later crafting) | Burning thorn shoots |
| **Bread** | Food (heals 50) | Nan, Maud, villagers |
| **Warm cloak** | Body armour, between leather and chainmail | *The Lamp in the Window* |
| **Hound-leather trousers** | Leg armour, between leather and iron | *King's Hounds* |
| **Sexton's lantern** | Trinket: a small light around you at night, +armor | The Bell-Ringer |

---

## Documents (the clues of Act I)

| Document | How you get it | What it is |
|---|---|---|
| The Hollow King's proclamation | The board at Aldric's camp; again in Millbrook | Signed *Ambrose, King* and, below, *Victoria R.* (she wrote it) |
| Victoria's diary, pages 1–3 | Nan | The lake, the feather, *"Then no one will have Marcian"* |
| Letter: *To the King, at Castle Corvane* (first year) | A doorstep in Millbrook, at night | *"I will do my duty... I only ask that Nan may stay with me."* |
| A scrap of black lace | The Bell-Ringer | The first lady's favour |

---

## Scenes

1. **The lake gives back** (new game): black, water, Aldric leaning over you, his first lines.
2. **The herald** (first arrival in Millbrook): Sergeant Pike reads the proclamation in the square; the villagers mutter.
3. **The bell** (first night in Millbrook): the bell rings backwards; the camera finds the churchyard as the graves open.
4. **The belfry** (entering the boss room): the Bell-Ringer turns from the rope.
5. **The lace** (after the boss, at Nan's): Nan and the black lace. *"That's from a wedding veil. Hers was white."*

---

## Art to make

All of it hand-placed pixel art in the HD Silhouette look, reviewed magnified before it goes in the game.

- **Ring 1 ground:** grey patches in the grass, black thorn shoots (a burnable object), wilted crops, a field tile, crows.
- **Buildings:**
  - cottages (two kinds) and Nan's cottage;
  - the mill with a turning waterwheel;
  - the chapel with its bell tower;
  - fences, a well, a bridge over the Lisle;
  - Aldric's tent, two barrow mounds.
- **Bell tower inside:** stone floor, stair, the belfry with its cracked bell.
- **People:** Nan, Maud, Sergeant Pike, Father Odo, the grey postman.
- **Creatures:** the bone hound (walk, bite) and the Bell-Ringer (walk, swing, toll, death).
- **Items:** icons and ground sprites for the new items.

---

## Systems to add for this slice

The foundations are in already (regions and travel, saving, story flags, quests with talk, collect, interact and flag goals, NPC topics, the journal, objects, scenes, boss phases, ring lighting). This slice also needs:

- **Buildings:** props bigger than a tile, with solid footprints and doors that lead inside.
- **Night-only things:** objects and people that only appear at night (the letter, the grey postman), and a "first night here" trigger for the bell scene.
- **The Bell-Ringer's behaviour:** tolls, rings of sound, skeleton waves.
- **Lights:** lit cottage windows at night, the chapel, the lantern.
- **The ring 1 look:** the ground variants above, placed by hand in the Millbrook layout.
- **Buying and selling:** prices on every item, a trade window, and two traders (Tobin, Bram).
- **Closed roads with reasons:** a barricade, rockfall or thorn wall in the way, and a message saying what will open it.
- **The grey postman:** someone who walks a route at night and fades when you come close.

---

## Pacing

Levels 1–3 in the prologue (about 90 XP from quests, plus kills and crafting), levels 3–7 in Act I (about 335 XP more). The current prologue quests pay far too much (660 XP, enough for level 7 on their own); the table above brings them down to about 150.

---

## Decided

- About an hour to an hour and a half for this slice.
- Ashford stays closed until later; every closed road says what blocks it and what will open it.
- The grey postman can't be fought until Act III, and the game says why.
- Millbrook gets a trader (Tobin) and a blacksmith (Bram).
