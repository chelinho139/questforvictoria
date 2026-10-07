# Trailers

The game films its own trailers. Three are cut so far, from in-game footage only:

| Edit | Trailer | Length | Interface | Music |
|---|---|---|---|---|
| `mirror` | **The Mirror**: the story as the realm tells it, from the lake at dawn to the bell | 1:38 | none at all | Teller of the Tales → Some Amount of Evil |
| `night` | **Hold the Night**: the game as you play it: gathering, forging, both classes, the horse, co-op, nightfall, the two 3D views, the Bell-Ringer | 1:52 | the HUD, windows, names and bars | Five Armies |
| `night2` | **Hold the Night, with Act II**: the same cut, its fights traded for Act II's: the Weepwood, Kilnholt's ring of kilns held through the night, the Tower Guard at the ford, wolves, spiders, the outriders, Wren at your side, the King's Ride; Sir Garrick on the Weeping Bridge (his roots, Aldric's whistle), the Brood Mother, Bonespine, the Thane | 1:44 | the HUD, windows, names and bars | Five Armies |
| `night3` | **Hold the Night, both acts** (the latest): the barrow at nightfall, a thunderstorm over Millbrook, chopping in the rain, then Act I and Act II by turns: the ford and the goblin camp, the risen dead and Wren, co-op against the ogre and the ring of kilns, the 3D views (the point of view in the rain), Sir Garrick's halt, the Bell-Ringer, the Brood Mother, the Thane, the roots and the whistle, the crossing | 1:20 | the HUD, windows, names and bars | Five Armies (twelve beats of the build and thirty-two of the climax left out, where the music matches best either side) |
| `short` | **Hold the Night, short**, for non-gamers (an all-hands): the full trailer's shape in miniature (the intro on black, the dead rising, the storm; one shot per idea on the big entry, no gathering or crafting; the 3D views; the music stopping dead for Sir Garrick's "Halt."; the climax and the logo) | 0:53 | the HUD, windows, names and bars | Five Armies |
| `devlog` | **Devlog: one world, three cameras** (opens straight on the game, the title over the first shot): the isometric pixel art turning out to be a 3D world, the diorama (turn, tilt, zoom), the point of view (behind the hero, through their eyes on horseback), one fight in all three cameras at once (a split screen), night, rain and storm, fights and both acts in 3D, switching with V | 1:31 | none, until the switching shot | Medieval: Exploration (RandomMind, CC0) |
| `bell` | **Every Bell**: a slow teaser in the dark that hints at who is behind it all | 1:15 | none at all | Ossuary 6 – Air |

## How it works

1. **The director** (`src/phaser/dev/Director.ts`, on only with `?director` in the address) runs the game on a clock of its own: Phaser's loop is put to sleep and each film frame steps the game by exactly 1/60 s (less, for slow motion), so footage is perfectly smooth however long a frame takes to capture. It hides the interface (`setClean`: the HUD scene, every window, names and bars over heads, the click ring), holds the camera (`camAt`, `camTo` with easing, `camFollow`), stages the world (`go` to a region and tile, `time`, `weather`, `strike`, `darkness`, `spawn`, `build`, `clearEnemies`), dresses heroes (`dress`, `addHero` for a co-op party; they take their blows, so the bars move and webs and roots hold them, but never drop below 45% of their health: `god: true` makes one immune instead), sets story flags (`flag`: Wren walks with them once `wren_follows` is set), lets them fight on their own (`brain`: close in, cast the first spell that's ready), and writes down every sound the shot makes with the moment it was heard, as heard from the middle of the camera's view.
2. **Shots** (`shots/*.ts`): each is a `setup(d)` with cues (`d.at(seconds, fn)`, `d.each(fn)`), a length, a seed (`Math.random` is seeded, so every take is the same) and a few seconds the game runs unfilmed first. `story.ts`, `gameplay.ts` and `mystery.ts` hold the three trailers' shots, `act2.ts` Act II's; `kit.ts` the party and what each class casts.
3. **Filming** (`film.ts`): rebuilds the game, opens it in headless Chrome (GPU, 1920×1080), stages a shot, steps it frame by frame, screenshots each frame into ffmpeg (`out/shots/<shot>.mp4`) and saves the sound log (`<shot>.audio.json`). About 3 s of filming per second of footage.
4. **Editing** (`edit.ts`, edit lists in `edits/*.ts`): each item (a shot from a given second, a title card, the logo) is rendered to an exact-length segment with its captions (`cards.ts`: drawn by Chrome in IM Fell English, as the lore is, or in the game's own Pixelify Sans), fades and grade; the segments are joined with cuts, crossfades, dips and white flashes; the bars and vignette go over all. An item can also be a **split screen** (`grid`: three shots in a 2x2, the fourth corner for a caption; film them with the same seed and `d.view(mode, true)` so they play out the same, frame for frame). Items are placed by **marks** (`at`: the moment on the timeline an item takes over), so the cuts land on the music's hits.
5. **Sound** (`sound.ts`): every logged sound is rendered again from the game's own recipes (`src/phaser/audio`), laid where it was heard, with the rain and wind loops following the weather; extra cues (a bell toll on a title card, a voice under a line) from the same library; the music under it all, ducked under the loudest effects, limited, and brought to −14 LUFS (two-pass loudnorm).

`analyze_music.py` (loudness, brightness and tempo over a track, and a picture of it), `onsets.py` (the strongest hits in a window) and `fine.py` (loudness second by second) are what the cut points were found with; `loops.py` fits a track's beat grid exactly and finds where bars can be repeated without a seam showing (Hold the Night repeats sixteen beats of Five Armies to give the 3D views room). The director moves the 3D views' camera too (`view`, `cam3d`, `cam3dTo`: turn, tilt, zoom, and how far behind the hero the point-of-view camera sits; a 3D view looks where `camAt` holds it, or at the hero). `sheet.py` makes contact sheets of stills.

## Running it

```bash
cd tools/trailer
npm install                      # puppeteer-core and ffmpeg (kept apart from the game's packages)
PORT=3117 node ../../server.js   # the game, served (another terminal)
npx tsx film.ts --list           # the shots
npx tsx film.ts --still "s1_*"   # three stills of each, quickly, to check a setup
npx tsx film.ts "s1_*" "g_*" "m_*"
npx tsx edit.ts mirror night bell
```

Out: `out/trailers/quest-for-victoria-*.mp4` (1080p60, H.264 + AAC). `out/` isn't kept in git.

The music is read from `out/music/<id>.mp3`. The game's own tracks are in `public/music` on the music branch (`git show origin/worktree-music:public/music/teller.mp3 > out/music/teller.mp3`, and so on); "Five Armies" is from incompetech.com (`https://incompetech.com/music/royalty-free/mp3-royaltyfree/Five%20Armies.mp3`).

Chrome is expected at `C:/Program Files/Google/Chrome/Application/chrome.exe` (`CHROME` in `cards.ts`, `film.ts`).

## Music credits

All three trailers use music by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0 (http://creativecommons.org/licenses/by/4.0/). Wherever a trailer is posted, its description must credit it:

- **The Mirror**: "Teller of the Tales" and "Some Amount of Evil" Kevin MacLeod (incompetech.com)
- **Hold the Night** (both versions): "Five Armies" Kevin MacLeod (incompetech.com)
- **Devlog: one world, three cameras**: "Medieval: Exploration" by RandomMind (opengameart.org), CC0 (credit not required; given with thanks)
- **Every Bell**: "Ossuary 6 - Air" Kevin MacLeod (incompetech.com)

Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/
