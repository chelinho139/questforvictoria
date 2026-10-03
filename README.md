# Quest For Victoria

A co-op campaign videogame. Web build on Phaser 3 + TypeScript.

## Run

```bash
npm install
npm run dev      # esbuild watch + server (game page and online play) on http://localhost:3000
npm run build    # one-off bundles: public/dist/game.js (the browser) and dist/server/ (online play)
npm test         # the automated tests (see Tests)
npm run verify   # type-check + tests + build
npm run bot      # a test player for online play (see Online co-op)
```

## Tests

`npm test` runs the tests in `tests/` with Node's own test runner (`node --test`, TypeScript through `tsx`). They take about 7 seconds and need no browser. `npm run verify` runs them too.

| File | What it checks |
|---|---|
| `quests.test.ts` | Quests in a party: everyone takes it, anyone's kills count, each hands it in for their own reward once, late joiners, quests carried between games |
| `save.test.ts` | Saves come back as they were; unreadable or old saves; joining brings only the hero; the story a guest takes home |
| `rooms.test.ts` | Several heroes in one game: free roaming, regions closing and remembering, the server's check of each step, personal loot, dying and coming back |
| `commands.test.ts` | The commands a browser may send: junk arguments are ignored, never crash; travel and dev commands |
| `session.test.ts` | Snapshots: everything at first, then only what changed; who hears which events; changing region |
| `store.test.ts` | The server's characters on disk: accounts by hashed key, unique names, the limit of 8, deleting, reloading, broken files |
| `localStore.test.ts` | Single player's characters in the browser, and moving the old save into the first one |
| `classes.test.ts` | The classes: tree shapes and points, each class's spells and gear, standing still to shoot, arrows landing when they arrive, Mark, Concussive Shot, bear traps, Volley, Piercing Shot, Camouflage, Disengage, angry slimes, saving the class |
| `balance.test.ts` | Warrior and archer stay a fair match, build for mirrored build (see `docs/archer.md`); `fight.ts` is the fight simulator, `npx tsx tests/balance-report.ts` prints the tables |
| `sounds.test.ts` | Every sound renders at its loudness, never clipping, ending in silence; every spell sounds when cast and its arrows when they land; the horse, the bear trap; the interface's sounds (a level, a talent, quests, the journal, gold, loot, gear, food, crafting, a mistake, dying) and who hears them; a save loads in silence; online, a sound reaches everyone in the region, and your own only you |
| `netsim.test.ts` | The browser's online game against the server's, joined by a fake line: an archer shoots and walks on, stands still to shoot, a warrior walks |
| `server.test.ts` | The real server over WebSockets: hello, hosting and joining, one room per character, saving on leaving and on stopping, junk messages, refused moves, no cheats in production |

`tests/helpers.ts` has the shared pieces: a game with heroes and the opening scene clicked through, standing next to an NPC, running the clock, and a `localStorage` for Node.

## Layout

- `src/sim/` — engine-free game rules. `Game.ts` is one campaign (the story, quests, the day, its regions and heroes); `Region.ts` is one place (its `RegionMap`, creatures, drops, trees, rocks, scenes); `Hero.ts` is one player. `Sim.ts` is the single-player facade the Phaser layer reads.
- `src/net/` — online play shared by browser and server: the messages (`protocol.ts`), the whitelist of commands a browser may send (`commands.ts`), the browser's socket (`Connection.ts`) and `NetSim`, the Sim a browser plays online.
- `src/server/` — the game server, bundled to `dist/server/` and started by `server.js`: rooms, the 20-a-second loop, and a `Session` per player that builds their snapshots.
- `src/data/` — tunables and pixel-art sources: skills, enemies, icon/sprite maps.
- `src/phaser/` — Phaser layer: `BootScene` is the loading screen (logo, progress bar) and builds every texture in steps, `GameScene` ticks the sim and renders the world, `PcHudScene` is the Stardew/Terraria-style PC HUD (parchment unit frames, wooden action bar, day dial with gold box), `MobileHudScene` is the one-thumb touch HUD kept for a mobile build. `PLATFORM` in `src/phaser/config.ts` picks one. The canvas fills the window at an integer pixel scale. `audio/` makes and plays the sounds (see Sound).
- `public/` — static site; `public/dist/` is generated.
- `index.html` — the original single-file prototype the game is seeded from.

## Controls (PC)

Action bar (bottom): twelve slots on `1`–`6`, `Q`, `E`, `R`, `F`, `G`, `M`; each key casts whatever you put in its slot (drag spells there from the spellbook, `P`). Clicking a slot casts it too; hover for a tooltip. Keys: `src/data/actionBar.ts`; spells: `src/data/spells.ts`.

Rev (one-button rotation) is an advanced option for higher levels: off by default and not on the bar. Turn it on in the ⚙ panel under **Advanced** ("Rev on the action bar"); then `C` fires the next step of the sequence (turns Rev on), `Z` toggles Rev, `X` toggles Rev auto, and the next step is outlined in orange on the bar.

Mouse: click (left or right) on the ground to walk there, hold to keep steering toward the cursor. Click an enemy to lock it. Keyboard movement cancels a click-to-move. Routes go around water, rocks and walls (A* over the tile grid in `src/sim/pathfind.ts`, string-pulled into straight legs).

Other: WASD/arrows move, Space jump, Tab cycle target.

## Dev settings

Press `O` or `` ` `` (backtick), or click the cog on the menu bar. The panel changes things live and remembers them across reloads (localStorage key `qfv-dev-settings`):

- **Documents**: *The Lore* and *Prologue & Act I* (the build spec) open in the book viewer in a new tab, so the game keeps running; its *Back to the game* closes the tab. New specs go in `DOC_LINKS` (`src/phaser/dev/DevMenu.ts`) and `SPECS` (`server.js`).
- **Time**: clock slider, Dawn / Noon / Sunset / Midnight, day speed (pause, 1× = 10-minute day, up to 600×).
- **Graphics**: art style (the six candidates, switched instantly), HD hero, day/night lighting on/off, darkness strength, clouds on/off.
- **Sound**: volume (all the way down is off), and a sound board: pick any spell, what follows it (its arrow landing, the trap springing, the horse coming) or one of the interface's sounds, to hear it.
- **Player**: god mode, infinite mana, no cooldowns, move speed, full heal, back to start.
- **Enemies**: freeze, kill all, respawn all (back to the starting creatures), reset game, spawn any creature near you.
- **Debug**: draw the click-to-move path, FPS counter, skip loading screen.

Shortcuts outside the panel: `I` opens the inventory, `T` cycles the time of day, `L` toggles lighting, `V` cycles the art style and `H` the HD hero (Shift goes back).

The top-right dial shows the time of day: sun and moon arc over the hills, the sky shifts from blue to sunset to a starry night, and the label names the part of day and the day number (`src/phaser/render/DayDial.ts`).

## Art

All art is generated in code at load time; there are no image files.

- **The game is drawn in HD · Silhouette colours.** All new art is made only for it. The other styles are kept as backups: Settings › Graphics › *Backup art styles* shows their buttons and turns on the `V` (style) and `H` (hero) keys; switching it off goes back to HD · Silhouette.
- **Art styles** (stored in localStorage `qfv-art-style` while the backups are on):
  - **HD · Silhouette colours** (the game's art): the HD sprites (`hdSprites.ts`, `hdHero.ts`, `hdHeroes.ts`) recoloured into the Silhouette palette by `regrade.ts`. `H` picks its hero: three knights (K1 Knight, K2 Squire, K3 Silver knight, each with an idle animation and a 6-frame walk) or five heroes modelled on the approved board looks.
  - **S1h**, **C2 · Ink contrast**, **C3 · Rich summer** and **1 · Silhouette**: no-outline 4× pixel art in `src/phaser/render/styles/gameArt.ts` (one set of shapes, three palettes; S1h swaps in the big-head hooded hero).
- Each style returns the same parts (`styleArt.ts`); `textures.ts` redraws the textures in place on a switch, and `art.ts` tracks each texture's display scale and frame count.
- **Icons**: the 14 action icons are hand-designed 20×20 items in `hdIcons.ts`, shared by every style.
- **UI kit** in `src/phaser/render/uiKit.ts`: 9-slice parchment and wood panels, inset slots, selection ring, bar insets, heart/mana/coin/skull/star icons.
- **Logo and loading screen** in `src/phaser/render/splash.ts`.

## Sound

Like the art, every sound is made in code at load time; there are no sound files.

- **What sounds**: every spell when it's cast (a spell's key is its sound's name), and what follows: an arrow landing (each special arrow has its own), a bear trap springing, the horse coming and being left. Everyone nearby hears these. Auto-attacks are silent for now.
- **The interface** (heard only by the hero it happens to): a level (a harp and a chord), a talent, a quest taken, its goals done and handed in (a fanfare), a journal entry, gold (a kill, buying, selling), an item picked up, gear on or off, eating, cooking, smithing, building (and woodwork, like bows), a perfect-timed tap, a mistake (a spell you can't cast, gold you don't have; it can't repeat faster than every 0.4 s), dying and coming back, and a window opening or closing (`GameScene` watches the windows, so a key, a button, Esc or another window taking its place all count). The jingles are tuned to D major so they sit together, and play at their own pitch.
- **Recipes** (`src/phaser/audio/sounds.ts`): one per sound, built from shared pieces (a whoosh, a thump, a crunch, a bowstring, struck metal, a voice through mouth shapes, crackle, chimes), so the warrior's blows and the archer's arrows each sound like one family. `loud` sets a sound's loudness against the others (1: the biggest finishing blows); the renderer brings it there and rounds off any peak.
- **The synthesizer** (`src/phaser/audio/synth.ts`): oscillators, filtered noise, a plucked string, struck metal, saturation and a small reverb, rendered sample by sample into a buffer. It uses no Web Audio and no Phaser, so the tests render every sound in Node.
- **Playing** (`src/phaser/audio/Sfx.ts`): the loading screen renders every sound, a few per step (`soundJobs`). The sim sends `sound` as a region event (what, and where) or as a hero event (what, for that hero alone: `Hero.hear`), and `Sfx` plays it through Phaser's Web Audio context. A sound with a place is at full volume within 160 screen px of your hero, fades out by 720, is panned left or right, and is up to 4% higher or lower each time. Online the server's hero makes the sound and it travels in the snapshot, like the effects.
- **Adding a sound**: give it an id in `SoundId` (`src/sim/types.ts`: a `FollowSound` or a `UiSound`) and a recipe in `SOUNDS`, and emit it with `region.sound(id, x, y)` or `hero.hear(id)`. A new spell needs only a recipe under its key; the type-check won't pass without one, nor without a sound board name for a new `UiSound`.

## HUD

- **Action bar** (bottom centre): twelve slots you fill yourself. A new hero knows only Thrust and Slash; the rest unlock with levels (Rend 2, Charge 3, Mount 4, War Cry 5, Interrupt 6, Execute 7, Whirlwind 9, Mortal Strike 11) and land on the bar by themselves. The Rev slot sits left of it when Rev is turned on in Settings.
- **Spellbook** (`P`, the red tome): every spell with what it does, its cost and cooldown (as your talents have them), and how you get it ("Unlocks at level 9", "Learn it from the Blade talent Sunder"). Drag a learned spell onto the bar; while the book is open, drag spells along the bar to move them or off it to remove them.
- **Menu bar** (bottom right): Inventory `I`, Spellbook `P`, Talents `N`, Crafting `K`, Quests `J`, Settings `O`, Controls `/`. A button lights up while its window is open; hover for a tooltip. Windows on the left (crafting, quests, controls) replace each other; the inventory has the right side; `Esc` closes.
- **Controls** (`/`, the book): every key in one place.

## Levels and talents

- **Experience** (`src/data/talents.ts`): you start at level 1 (max 25); a level takes 60 XP at first and 25% more each level after. Kills give XP (slime 10, bone hound 16, skeleton 24, the Bell-Ringer 150…), quests give 20 to 150, and felling trees, breaking rocks, crafting and building give a little. The Prologue's quests pay 160 XP in all and Act I's 460, which with the fighting brings a hero to about level 4–5 by Millbrook and 8–9 by the end of Act I (to tune in play). Each level gives a talent point, +5 maximum health and a full heal. The purple bar above the action bar shows progress (hover for the numbers).
- **Talents** (`N`, or the star on the menu bar, which glows while points are waiting): three trees side by side, Diablo 2 / WoW style. A tier opens once you have 4 more points in that tree (the capstone needs 16); arrows mean a talent needs another one maxed first. Click to learn a rank, hover for what this rank and the next do; Reset gives every point back (free for now).
  - Each tree teaches two **abilities** you can't get any other way (marked with a purple diamond): one in tier 3 and the capstone. They go into your spellbook and onto your bar.
  - **Blade**: Honed Edge (+damage), Precise Thrust, Lingering Rend, Keen Eye (critical hits), Twin Cuts (Slash combo), Bloodletting, Brutal Strikes (crit damage), Improved Mortal Strike, Warden's Edge (crits make the target bleed), Executioner (Execute below 35%), Reaping Blows (mana on kill). Abilities: **Sunder** (the target takes 20% more damage from you for 10 s) and capstone **Deathblow** (30 damage, ready again if it kills).
  - **Fury**: Battle Rage (auto-attack damage), Booming Voice and Commanding Shout (War Cry), Momentum and Stunning Charge, Flurry (faster swings), Bloodthirst (heal on hit), Improved Whirlwind and Cyclone, Enrage (below half health), Rampage (kills fire up War Cry). Abilities: **Bloodrage** (15% health for 40 mana) and capstone **Berserk** (10 s of 50% faster swings and +20% damage).
  - **Warden**: Toughness (armor), Vitality (health), Woodsman and Prospector (gathering), Shield Wall, Second Wind (health per kill), Camp Cook (food), Steadfast (regeneration), Last Warden (survive a killing blow once a minute), Watchful (Interrupt), Swift Feet (walk, ride and mount faster). Abilities: **Shield Bash** (needs a shield: 6 damage, 2 s stun, stops spells) and capstone **Last Stand** (heal 30%, take 30% less damage for 8 s).
- The ⚙ Settings panel's Player section has **+1 level**, **+100 XP** and **Reset talents** for testing.

## People, lore and quests

- **People** (`src/data/npcs.ts`; art in `tools/heroes/npcart.py` for Aldric and `tools/heroes/villagers.py` for the rest): **Warden Aldric** at his camp by Lake Ellory, and in Millbrook **Nan Merrow** (the queen's old nurse), **Maud Ashdown** (the miller's widow), **Sergeant Pike** (the Steward's herald), **Father Odo** (the priest), **Tobin** (a peddler) and **Bram** (the smith). Click someone to talk (you walk over first): an introduction the first time, then greetings that change with the story and topics to ask about. The game's story lives in `docs/lore.md` (see *Lore* below), and the plan for the first slice in `docs/act1.md` (http://localhost:3000/act1.html).
- **Trading**: Tobin and Bram are traders (`shop` in their NpcDef). Choose *"Let me see what you have."* to open the trade window (docked left): what they sell at each item's `price`, and everything in your bag they would buy, at a third of its price (shift-click sells a whole stack). Unique quest gear has no price and can't be sold.
- **The grey postman** (`wanderers` in a region): a ghost who walks his round of Millbrook's lanes at night with a faint cold light, fading as you come near. You can't fight or talk to him yet; clicking him says why.
- **Quests** (`src/data/quests.ts`) come from NPCs: a gold **!** over someone's head means a new quest, a gold **?** means one is ready to hand in, a grey **…** means you are on it. Accept in the dialog (goals and rewards are shown), do it, and hand it in (to the giver, or to `turnIn`) for gold, gear and documents. Goals count only after you accept: kill (an enemy kind), build, craft, reach (a place, in a region), talk (to someone), collect (items in your bag, optionally handed over), interact (use an object) or flag (something has happened). A quest can require another and wait on a story condition (`when`); `main` quests list first; `onAccept` / `onDone` set flags, add documents, give items or play a scene.
- **The Prologue** (Aldric, the Greenmarch): *Slime in the Meadow* (3 slimes → leather boots), *A Warm Meal* (campfire + 2 cooked meat → leather tunic), *Stone and Fire* (build a forge → pickaxe), *Warden's Steel* (forge an iron sword → Edric's helm), *The Hollow Night* (3 skeletons from the barrows → chainmail), *The Road North* (Queen Elowen's amulet on accepting; read the proclamation, reach Millbrook, find Nan).
- **Act I** (Millbrook): *The Steward's Bounty* (Pike), *Nan's Pages* (read three pages of Victoria's diary in the journal), *Thorns in the Fences* (burn six black thorn shoots in the fields), *The Lamp in the Window* (Maud: ask Aldric what happened to Marcian), *Letters at the Door* (find a letter the grey postman left on a doorstep at night), *The King's Hounds* (six bone hounds at night), and *The Bell Tolls Backwards* (Odo's key, the bell tower, the Bell-Ringer; it ends Act I at Nan's with the black lace).
- **Tracker and quest log**: active quests and their goals sit under the day dial; `J` (the scroll on the menu bar, or clicking the tracker) opens the quest log: quests in progress with their story, goals, rewards and giver, quests to pick up, and the completed list.

## World, story and saving

- **Regions** (`src/data/regions/`): the world is made of regions joined by exits. Each region is a hand-authored text layout (one character per tile, see `TILE_CHARS` in `src/sim/map.ts`), a corruption ring (0 untouched to 5 Thornhallow), named spots (`start` and arrival points), exits (walk into an area to travel, fading through black; an exit can be closed with a story condition and a message), creature spawns, NPCs and objects, each optionally behind a story condition, and scenes to play on arrival. The map edge is solid except on exit tiles. What you build or drop in a region is kept when you leave; trees, rocks and creatures reset. The Greenmarch is the start; *Test Field* is a dev-only region (Settings › Regions) with a page, a board, a chest, an arrival scene and a test boss.
- **Ground rendering** (`buildRegionGround` in `textures.ts`): each region's ground is baked on arrival and sliced into 2048-px chunks; the whole world lives in one Phaser layer that is destroyed and rebuilt when you change region. The iso projection offset is fixed (`ISO_OX`), so maps up to 200 rows deep need no other changes.
- **The Blackthorn** (`ringDarkness` in `src/sim/daylight.ts`): the deeper a region's ring, the darker and greyer its light; ring 4 never gets brighter than dusk, ring 5 is always night, and from ring 3 the dead walk by day.
- **Story flags and conditions** (`src/data/story.ts`, `src/sim/story.ts`): `Sim.flags` records what has happened; a `Cond` (flag, not, quest status, level, all, any) gates NPCs, spawns, exits, objects, topics, quests and scenes; an `Effect` sets or clears flags, adds documents, gives items or plays a scene.
- **NPCs** (`src/data/npcs.ts`): an introduction the first time, greetings that change with the story (`greetings`), topics to ask about (`topics`, each with a condition, `once`, and an effect), and `onMeet` effects. Where each stands is up to the region.
- **Objects** (region `objects`): a page in the grass (it glints), a notice board, a chest. Click one, or press the gather key next to it: it says its line, applies its effect, and `once` objects are gone for good. Art in `tools/heroes/objects.py` → `objectArt.ts`.
- **Journal** (`src/data/docs.ts`): diary pages, letters, proclamations, notes and lace favours you find go into the Journal tab of the quest log (`J`), grouped by kind, unread ones marked; click one to read it.
- **Scenes** (`src/data/scenes.ts`): scripted beats played while you watch: lines (click, Space or Enter for the next), waits, fades, the camera looking at a tile, banners and effects. Input and fighting wait while a scene plays; each scene plays once per game.
- **Bosses** (`EnemyDef.boss`): a big health bar at the top while you fight one, phases as its health falls (a `bossPhase` event for its behaviour), and a story flag when it dies; give its spawn `when: { not: flag }` so it stays dead.
- **Characters and saving** (`src/sim/save.ts`, `src/phaser/saveStore.ts`): single player has characters like multi player, up to 8, each with their own campaign save in the browser (the list in localStorage `qfv-chars`, each save in `qfv-save:<id>`). A save is written shortly after anything important (a quest, a level, a region, gear, a flag), every 30 seconds, and when the tab is hidden. The old single save (`qfv-save`) becomes the first character the first time the game opens, with its name and hero. With the loading screen skipped, the game carries on as the character played last.
- **The start** (`src/phaser/ui/`): `MainMenu` (Single Player | Multi Player, under the logo; Single Player shows the character played last). Both modes then use the same two screens: `CharacterList` ("Your characters": a card per character in their own look and gear, with level, place and when last played; New character, Delete (asks once more), Play, Back; arrow keys, Enter, Esc) and `NewCharacter` (a name and one of the HD heroes, with the animated preview). `SinglePlayer` keeps its characters in the browser, and Play starts the game; `Lobby` keeps them on the server, and Play goes on to the rooms.
- **Specs**: the plan for each slice of the campaign is a Markdown file in `docs/` read in the same book viewer, e.g. http://localhost:3000/act1.html for `docs/act1.md`.
- **The regions so far**: **the Greenmarch** (72×60, ring 0: Lake Ellory, the shore where you wake, Aldric's camp and tent, the hollow oak and Marcian's willow, two barrows, the goblins' camp; the road north to Millbrook; Ashford closed by the Steward's barricade and the Greyfang Hills by a rockfall), **Millbrook** (64×56, ring 1: the square with the well, Tobin's stall and Bram's smithy, the mill on the Lisle with its turning wheel, the bridge, Nan's cottage, the chapel and churchyard, blighted grass, wilted fields; the north road closed by black thorns), and **the Bell Tower** (indoors: the ground floor, the stair, the belfry). The Test Field and the Art Yard (every building and prop, for checking art) are dev-only.
- **Maps** are composed by `tools/world/maps.py` (lakes, rivers and roads as strokes, forest edges, fields, scattered trees and rocks, buildings and marks), which writes each region's `layout` and `props`: `python3 maps.py write`, `python3 maps.py preview millbrook out.png`. `python3 check.py greenmarch millbrook belltower` checks that every person, creature, object and spot stands on ground you can walk on.
- **Buildings and big props** (`props` in a region, `src/data/props.ts`): cottages, Nan's cottage, the mill (its wheel animates), the chapel and bell tower, the smithy, the stall, the well, fences, Aldric's tent, barrows, the barricade, the rockfall, graves, the thorn wall, the bell, the interior walls, and the story trees. Each has a footprint you can't walk through (or a mask: the chapel's door, a tree's trunk), sorts correctly with what walks in front of it or behind it (a faint silhouette shows you behind a building), and windows that light up at night with a warm pool of light. They are drawn by `tools/world/iso.py` (a small ray-caster for boxes, gable, lean-to and pyramid roofs, cylinders, boulders and mounds, with hand-set materials and pixel decals for doors and windows) and `tools/world/buildings.py`, straight in the Silhouette palette; `python3 gen_props.py` writes `src/phaser/render/propArt.ts`. The two story trees are painted like the forest's oaks (`src/phaser/render/storyTrees.ts`).
- **Ground** for the campaign (`src/phaser/render/groundArt.ts`): blighted grass, tilled fields, wilted fields, cobbles, the bridge deck and flagstones, in the layout as `,` `f` `w` `c` `=` `+`; `&` is solid dark rock round an interior.
- **Indoors** (`indoor` in a region) it is as dim as dusk all day, lit by the region's `lights` (torches). Walls facing a room stand tall behind it; walls in front of a room are cut low so you can see in.
- **As you play**: objects can come and go with the story and the night (a letter on a doorstep only after dark), can need a condition before they can be used (`need`, `needSay`), scenes can play when a condition comes true while you are in a region (the bell at nightfall) or when you walk into an area (`triggers`), and conditions can test `{ night: true }`.

## Inventory, items, gathering and crafting

- **Inventory** (`I`, or the backpack on the menu bar; `Esc` closes): a Diablo 2 style panel docked on the right, hidden until opened. It shows the hero with their gear stats, a paper doll with 7 equipment slots (head, body, legs, feet, weapon, off-hand, trinket) and the 24-slot bag. Hover anything for its tooltip (gear in the bag compares with what you wear). Click gear in the bag to equip it, click worn gear to take it off, click food to eat it. Code: `src/phaser/ui/InventoryWindow.ts`.
- **Gear** (`src/data/items.ts`): adds attack (damage per hit), armor (each point takes a little off every hit), health, speed and chopping speed. A new hero has only a rusty sword and cloth trousers; everything better is earned, in tiers:
  - **Tier 1, leather and wood** (cap, tunic, trousers, boots, wooden shield, woodcutter's axe, pickaxe): slimes (about one item per three kills) and goblins.
  - **Tier 2, iron** (sword, kite shield, helm, chainmail, greaves) plus the amulet and swift boots: skeletons at night, ogres and shamans, and Bram's smithy.
  - **Unique** quest gear (`unique`, drawn like the common piece it is based on with `looks`): Edric's helm, Queen Elowen's amulet, the warm cloak (Maud), the sexton's lantern (a trinket that lights the dark around you). Act I adds bone hound fangs, black thorns, bread and bandages, and hound-leather trousers.
  - **Prices**: every item a trader would buy has a `price` (traders pay a third).
  - **Plate** is a future tier (the knights' original grey armour art is kept for it).

  Dropped gear lies on the ground as itself (its icon), so you can see what it is before picking it up (the chunky flat styles still show a sack). To test without hunting, the ⚙ panel's **Loot** section has "Drop random loot" and "Drop ×5": random items pop out a few steps away.
- **Gear on the hero**: in the HD style the heroes are bare by default (skin, linen shorts, bare feet, their own hair and face; Masked is a pale spirit) and every item shows on all eight of them, in every animation (walk, idle, attack, jump, backflip): caps and helms fitted to each head, armour re-shading the chest and shorts, trousers the shorts and legs, boots, both shields, the amulet and each weapon (an empty weapon slot means bare hands). The New character screen shows each hero in the starting kit. The knights' original grey plate is kept in `tools/heroes/cast2.py` (`SIG_*`) as the art for a future plate tier. The flat styles (S1h, C2, C3, Silhouette) do not draw gear. Art sources: `tools/heroes/` (see its README).
- **Drops**: items pop out of whatever dropped them and are picked up by walking over them. Cows drop raw meat.
- **Food**: click raw meat in the inventory to eat it (+30 health).
- **Woodcutting**: click a tree (or press `B` next to one; `B` gathers whichever tree or rock is closest) to walk over and chop it. Four chops fell it: it drops 2–3 wood logs and leaves a stump that regrows after 90 seconds. Without an axe every chop takes twice as long.
- **Mining**: click a rock (or press `B` next to it) to walk over and mine it. Five swings break it into rubble: 1–2 stone, iron ore 35% of the time, a gold nugget 5% of the time. The rubble can be walked over and becomes a rock again after two minutes (never on top of someone). A **pickaxe** (tier 1, from slimes and goblins, or smithed at a forge) mines twice as fast; without one every swing takes three times as long. Tuning in `MINE` (`src/data/items.ts`).
- **Rock collision**: a rock blocks a small circle around its boulder (`ROCK_R` in `src/sim/map.ts`), and against rocks a mover counts only its feet, so you stop where the sprites meet. Pathfinding still routes around standing rocks.
- **Crafting** (`K`, or the hammer on the menu bar; docked left so the inventory can stay open on the right). Recipes in `src/data/crafting.ts`, grouped by where they are made; each shows what it needs (have/need, red when short) and why it can't be made yet. Shift-click makes as many as you can.
  - **By hand**: a **campfire** (3 logs) or a **forge** (8 stone, 2 logs), built on a free tile next to you. A campfire burns for three minutes and lights up the night; a forge stays (and is solid).
  - **Campfire, cooking**: raw meat (+30 health) → cooked meat (+80 health).
  - **Forge, smelting**: 2 iron ore + 1 log → iron bar; 2 gold nuggets + 1 log → gold bar.
  - **Forge, smithing**: iron sword (3 bars, 1 log), woodcutter's axe and pickaxe (2 bars, 2 logs each), wooden shield (4 logs, 1 bar), iron kite shield (5 bars), iron helm (3 bars), amulet of vigour (2 gold bars). So mining is a second road to tier-2 iron gear.

## Creatures

Defined in `src/data/enemies.ts`, each with a behaviour:

- **Cow** (passive): grazes, never attacks, runs away when hit.
- **Slime** (neutral): ignores you until you hit it, then fights back; gives up if you walk away.
- **Skeleton** (hostile, night only): climbs out of the ground at dusk (out of the Greenmarch's barrows and Millbrook's churchyard), attacks on sight, crumbles to dust at dawn (no loot for crumbling).
- **Goblin, Goblin Shaman** (hostile): the first Greyfang raiders, camped in the east of the Greenmarch. **Ogre**: not placed yet.
- **Bone Hound** (hostile, night only): the old King's hunting dogs, fast, running the fields round Millbrook in packs. Drops fangs.
- **The Bell-Ringer** (boss, the bell tower): melee at first; from two thirds of his health he tolls the bell, sending a ring of sound across the floor (jump it) and calling the dead up through the floor; below a third the bell is cracked and he tolls twice as fast, rings in pairs, and stands out of breath after each toll.

Each region places its own creatures (`spawns` in `src/data/regions`); art for the hound and the Bell-Ringer is in `tools/heroes/creatures.py`.

## Day / night

`src/sim/daylight.ts` keeps the clock (10 real minutes per day) and a gradient of the darkness colour to subtract at each hour. `src/phaser/lighting/` renders a quarter-resolution lightmap filled with that colour, stamps point lights into it as soft holes (castle torches with flicker, a small light on the player), and a post-effect shader composites `scene − lightmap²`. Adapted from the realms engine's lighting.

Movement speed is constant in screen pixels for every direction (see `isoSpeedFactor` in `src/sim/map.ts`), so the 2:1 isometric projection doesn't make north-south travel feel slow.

### Skill icons

The action bar, spellbook and talent icons are hand-placed 20×20 pixel art in `tools/heroes/skillicons.py` (one object plus its effect, lit from the top-left, to the standard of the backpack icon). Digits in the grids are glow: drawn over the dark outline and never outlined, so sparks, wind, sound and auras read as light. Run `python3 skillicons.py out.png` to preview them magnified on the bar's parchment and the spellbook's dark frame, then `python3 gen_itemart.py` to write `src/phaser/render/skillIcons.ts`.

### Lore

The story bible is `docs/lore.md`: the world of Corvalis, the cast, the secret timeline, the acts and endings, bestiary, relics, Victoria's diary pages and notes for building quests. Read it in the browser at http://localhost:3000/lore.html while the server runs: `server.js` renders the Markdown (with `marked`) into the `docs/lore-viewer.html` template on every request, so the page holds the full text (browser reading mode works) and edits show up on reload. The raw file is at `/lore.md`.

The lore's illustrated plates (map, Thornhallow, the Blackthorn stages, portraits and more) are sepia-ink SVGs in `docs/lore-art/`, drawn by `tools/lore/plates.py` (`python3 tools/lore/plates.py [name ...]`) and placed in the Markdown as `<figure class="plate">`. A shareable copy is published as a claude.ai artifact: `npm run share:lore -- <out.html>` builds one self-contained page (`docs/lore-share.html` template, plates inlined), which is then republished to the same artifact.

## Classes

Two classes, chosen when you make a character (single player and multi player alike): **Warrior** (steel up close; Blade, Fury and Warden talents) and **Archer** (arrows from afar, standing still to shoot; Marksman, Hunter and Ranger talents). `src/data/classes.ts` holds what a class decides: its health, its auto-attack, its starting kit, its Rev presets and mobile wheels. Spells (`spells.ts`) and talent trees (`talents.ts`) each belong to a class; weapons and off hands too (`ItemDef.cls`), while armour, tools and amulets are for everyone. Personal loot is swapped to the killer's class (a sword drops as a longbow for an archer). The archer's design, every number, and how the two classes were balanced against each other (a fight simulator running the real game) are in `docs/archer.md` (in the game: Settings › Documents › The archer).

## Online co-op

The plan, its decisions and where it stands are in `docs/online.md` (in the game: Settings › Documents › Online co-op plan).

- **Playing:** after loading, the main menu offers **Single Player | Multi Player**. Multi Player opens your characters on the server, on the same character screens as single player: make one, delete one, or pick one. Then the room list: open a room or join one, with up to 8 players a room. Other computers on the network open `http://<this computer's address>:3000`. The badge at the top shows the room, who is here and the ping, and **Leave** goes back to the main menu. Online play never touches the single-player save.
- **The server is the game.** `server.js` serves the page and a WebSocket at `/ws`. Each room is a `Game` ticking 20 times a second, and each player gets a snapshot of their region with only the parts that changed (`src/server/Session.ts`). Messages are JSON, compressed on the wire.
- **The browser** (`src/net/NetSim.ts`) keeps a copy of the player's region built from the snapshots. It walks the player's own hero at once and tells the server where it went, and the server checks each step: speed, and nothing solid in the way. A refused step sends the hero back. Other heroes and creatures glide between snapshots. Everything else (casting, talking, trading, crafting, travel) goes to the server as a command from the whitelist in `src/net/commands.ts`. The dev settings' cheats work online while the server isn't in production mode.
- **Characters** (`src/server/Store.ts`) live on the server's disk in `server-data/` (gitignored; `QFV_DATA_DIR` moves it): accounts/, characters/ and deleted/, one JSON file each. A character is a single-player save plus a name and a look, so the same `Game.toSave` / `loadSave` code keeps them. They're saved every 5 seconds, on leaving, and when the server stops. Whoever opens a room brings their whole campaign (`Game.loadSave`); anyone joining brings only their hero (`Game.loadHero`) and keeps the story they see there (`mergeStory` in `src/sim/save.ts`). A browser's characters belong to the random key it keeps in localStorage (`qfv-account`, `src/net/account.ts`); there's no password yet. Rooms aren't kept: one closes 5 minutes after its last player leaves.
- **Quests in a room** (`Game.questStatus` / `acceptQuest` / `completeQuest`, `Hero.questLog`): the room keeps quest progress (shared kills and places); each hero keeps their own log (on it, or handed in). Accepting gives the quest to the whole party, and each player hands it in for their own reward, once per character. The first hand-in plays the quest's story effects. The log travels with the character (`Game.toSave` writes the hero's view; `loadHero` brings it into the next room).
- **Staying connected:** the server pings each browser at the WebSocket level every 10 seconds, which the browser answers even from a background tab, and lets a character go after 45 seconds of silence.
- **Testing alone:** `npm run bot -- host "Bot room"` opens a room with a bot in it; `npm run bot -- join ABCD` sends one into room ABCD (`--cls archer` for an archer bot); `npm run bot` lists the rooms.

## License

Quest for Victoria (the code, the art and the story) is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). You may play, read, modify and share it for any noncommercial purpose (personal use, study, research, hobby projects, non-profits). You may not use it, or anything made from it, to make money. For any other use, ask the author.
