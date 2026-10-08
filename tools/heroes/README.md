# Hero and item art generators

Python (needs Pillow) sources for the HD heroes and the item art. The TypeScript files they
write are generated: change the art here, then regenerate.

- `cast2.py` — the eight HD heroes built from tagged parts (head, torso, belt, arm, legs, boots, cape…),
  with every equippable item: helmets fitted per head, armour/trousers re-shading the parts they cover,
  boots, shields, the amulet and each weapon in every pose. The sorceress's staves (gnarled, ashwood,
  runed, Warden, willow: `STAVES`, `item_staff`; the shot frames are her cast, the staff's head
  lighting up) and her off hands (the hedge grimoire and the crystal orb: `FOCI`) are there too;
  `gearpreview.py sorc [hero…]` shows them in every pose.
- `emit3.py` — writes `src/phaser/render/hdHeroes.ts`: bare frames per hero plus one pixel layer per
  item per frame. `python3 emit3.py --check` also verifies that stacking layers matches drawing
  random kits directly (0 mismatched pixels expected).
- `sorcery.py` — the sorceress's item icons (gnarled, ashwood, runed, Warden's owl-headed and black willow staves, the hedge grimoire, the crystal orb); `gen_itemart.py` adds them to `itemArt.ts`. Her 15 spell icons (fire orange/red, frost pale blue, arcane violet, glow `%` `&` `~`) are in `skillicons.py` with the others.
- `archery.py` — the archer's item icons (worn shortbow, hunting bow, yew longbow, leather and hunter's quivers); `gen_itemart.py` adds them to `itemArt.ts`. The bows and quivers on the heroes, and the 4-frame shooting animation (nock, draw, loose, lower), are in `cast2.py` (`bow`, `quiver`, `SHOOT`).
- `skillicons.py` — the skill icons (warrior, archer, sorceress), keyed by spell key; `gen_itemart.py` writes `src/phaser/render/skillIcons.ts` (`SKILL_ICONS`, spread into `hdIcons.ts`'s `HD_ICONS`, so `icon:<key>` resolves). `python3 skillicons.py out.png` writes a review sheet.
- `menuicons.py` — the skull (Execute) and the menu bar's scroll, cog and book; `gen_itemart.py` writes `src/phaser/render/uiIcons.ts`.
- `npcart.py` — NPCs (Warden Aldric's HD idle and flat version); `gen_itemart.py` writes `src/phaser/render/npcArt.ts` from it.
- `craftart.py` — cooked meat, iron and gold bars, the crafting hammer, and the campfire and forge world sprites (`gen_itemart.py` also writes `src/phaser/render/structureArt.ts` from it).
- `gear.py`, `items.py`, `ores.py`, `backpack.py` — item icons (20×20), ground sprites and the inventory button's backpack; `gen_itemart.py` writes
  `src/phaser/render/itemArt.ts`.
- Act II's art (each file's `__main__` writes a magnified review sheet: `python3 creatures2.py out.png`):
  `villagers2.py` (Wren, Kilnholt's people, Bess, Garrick's ghost, the grey lantern, and Wren's
  companion frames `WREN_ART`) → `npcArt.ts`; `creatures2.py` (the wood's 21 creatures and the crows)
  → `creatureArt.ts`; `items3.py` (28 item icons, food drops) → `itemArt.ts`; `objects2.py` (the
  oak's hollow, the feather marks, caches, ropes, cold fires…) → `objectArt.ts`; `kilnart.py`
  (Kilnholt's kiln, smouldering and cold) → `structureArt.ts`. All through `gen_itemart.py`. The
  Act II gear on the heroes (steel, the Warden set, the jerkin, the leggings, the mantle, the greaves,
  the recurve) is in `cast2.py`'s tables.
- Act I's later art: `creatures3.py` (the thornling and the Old Briar, grown from a seeded tangle of stems at any size, and the King's lead hound, the bone hound in an iron collar) → `creatureArt.ts`; Old Cobb the hedger is in `villagers2.py` → `npcArt.ts`. Both through `gen_itemart.py`.
- `gearpreview.py [hero…]` / `gearpreview.py anim [hero…]` — magnified preview sheets of every item
  (or walk/attack/jump with full kits) for review.
- `tool.py` — the shared grid, render (HD auto outline) and sheet helpers.

Run from this folder, e.g. `python3 emit3.py --check && npx prettier --write ../../src/phaser/render/hdHeroes.ts`.
