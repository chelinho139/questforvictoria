# Online co-op: the plan

*How Quest for Victoria becomes a game friends play together in the browser: first on one computer and the local network, then on the EC2 box, updated live from `main`. The choices marked **(decided)** were settled on 2 October 2026.*

---

## What we're building

Up to eight friends open the game in their browsers, see a list of open rooms, join one (or host their own), and play the campaign together: the same Greenmarch, the same Millbrook night, the same Bell-Ringer. Single player keeps working on its own, with the same character screens (its characters are saved in the browser instead of on the server).

---

## Where it stands

*2 October 2026, branch `online-coop`.*

| Milestone | State |
|---|---|
| **M0** Ready for the network | **Done**, except item 5 (single player through the in-tab server), which waits until online play has settled. Single player plays as before. |
| **M1** Walk together | **Done** and tested: two browsers and a room of eight (browsers and bots), on localhost and over the LAN. |
| **M2** Fight together | **Mostly works already:** creatures, hits, deaths, and kill XP, gold and loot for whoever lands the kill (kept that way on 2 October). Still to do: a party fight with the Bell-Ringer. |
| **M3** The story together | **Partly:** flags and the journal are shared by the room. Quests are shared and handed in by each player for their own reward (decided 2 October). Talking, trading and crafting go through the server. Scenes play for the whole region, but anyone can click them on. |
| **M4** The party remembers | **Characters: done.** Diablo II style: each browser has its own characters on the server's disk, saved every 5 seconds, on leaving and when the server stops (tested by stopping it mid-game). Rooms are not kept: like D2 games, a room closes 5 minutes after its last player leaves. Reconnecting into the same room after a drop is still to do. |
| **M5** Live on EC2 | Not started. |

---

## The shape of it: one game, one code path

```
   Browser (each player)                         Server (Node, on your PC or the EC2 box)
 ┌──────────────────────────┐   WebSocket    ┌─────────────────────────────────────────┐
 │ Phaser: draws the world, │ ─ commands ──▶ │ The game itself, headless: the same     │
 │ the HUD and the windows  │                │ simulation code, ticking 20 times a     │
 │ (what the server says)   │ ◀─ state ───── │ second: creatures, combat, loot, quests,│
 │                          │    events      │ the story. One per room.                │
 └──────────────────────────┘                └─────────────────────────────────────────┘
```

- **The server is the game.** The simulation (`src/sim`) is already plain TypeScript with no Phaser in it, so the Node server runs the very same code. It owns everything that matters: where the creatures are, who hit whom, what dropped, which quests are done.
- **The browser is a window onto it.** Phaser draws what the server reports and sends what the player does (move here, cast this, talk to Nan, accept that quest).
- **Single player is the same thing, in the tab** *(planned: see M0, item 5)*. The game would run the same "server" inside the browser and talk to it through an in-memory pipe instead of a socket, so offline and online share one code path (the same choice you made for Realms). For now both run the same game rules, with different plumbing.
- **WebSocket**, not UDP: browsers can't open raw UDP, and for eight players at 20 updates a second a WebSocket is plenty. The same Express server that serves the game page also serves the socket, so there is one port and one process.

---

## How co-op plays

| | How |
|---|---|
| **Rooms** **(decided)** | A public list of rooms: each shows its name, where the party is in the story, who is in it, and how many places are left. *Join* one, or *Host a room* (give it a name). Up to **8 players** a room; it plays fine with one. Each room has its own campaign (its own story progress and world). Private rooms with a join code come later. |
| **Who you are** | No login: the first visit makes a long random key, kept in the browser (`qfv-account`), and the server keeps that browser's characters under it (only a hash of the key is stored). Another browser or computer has its own characters. Password accounts can come later on top of the same storage. |
| **Your characters** **(decided)** | Like Diablo II's Battle.net: the main menu's **Multi Player** opens your characters (up to 8; make one with a name and a hero, delete one, pick one), then the rooms. Online characters are separate from single player's characters (which live in the browser, on the same screens). Each one keeps their level, talents, gear, bag, gold, who they've met, where they stood, and the story they know. Names are unique on the server. A character plays in one room at a time. |
| **The story in a room** | The room starts from the story of the character who opens it, at the place they last stood. Anyone joining arrives where the party is and brings their own hero, and leaves knowing the story they saw happen there (finished quests stay finished). |
| **Difficulty** | Creatures stay as they are for now; scaling them with the number of players comes once we have played in groups. |
| **Shared by the party** | The story (flags, the journal), quest progress, the day and night, the world: the bell rings for everyone. |
| **Yours alone** | Your hero, level, talents, bag, gear, gold, cooldowns, and handing your quests in. |
| **Quests** **(decided)** | When anyone accepts a quest, everyone in the room has it (and anyone joining later takes up the party's open quests). Progress is shared: anyone's kills count. **Each player hands it in themselves**, for their own reward (gold, XP, items), once per character: a character who already handed it in, here or in an earlier game, can't again. The first hand-in moves the story on (its scene, flags, documents); later ones only pay out. Leave without handing it in and your character keeps it ready, to hand in later, even in your own game. A quest the room finished before you arrived counts as done for you, with no reward. |
| **Loot** **(decided)** | Personal: what a creature drops is for whoever landed the kill, and only they see it and can pick it up, so nobody squabbles over the chainmail. |
| **XP from kills** **(decided)** | Whoever lands the kill. The shared reward is the quest, which everyone hands in for themselves. |
| **Regions** **(decided)** | Free roaming: each player can be in a different region (one fishing by the lake while another climbs the bell tower). The server runs every region somebody is in. |
| **Scenes** | Play for everyone in that region; a boss fight is everybody's fight. |
| **Talking** | Each player talks to people on their own; quest choices are shared. |
| **Joining late** | A friend can join mid-campaign: they step into the party's story where it is and take up its open quests. |

---

## The work, in milestones

Each milestone ends with a test you can do yourself, and the game stays playable throughout.

### M0: Ready for the network (the game plays exactly as now)

The groundwork. Today the simulation assumes one player, one region and one map held in global variables. This milestone untangles that, with no visible change.

1. **Maps as objects.** The map module (`src/sim/map.ts`) keeps the current region in globals; it becomes a `RegionMap` object, so one server can hold several regions and several parties at once.
2. **The Sim split in three.** *Campaign* (the party's story: flags, quests, journal, the day), *Region* (one place: its map, creatures, trees, rocks, drops, buildings, objects) and *Hero* (one per player: position, health, bag, gear, talents, cooldowns, target).
3. **Commands.** Every action a player can take (move, cast, gather, talk, accept a quest, buy, craft, equip…) becomes a typed command. The windows and the HUD send commands; they never call the simulation directly.
4. **A client view.** The renderer and the windows read a view of the world that is fed by messages, instead of reading the simulation's insides.
5. **Single player through the in-tab server.** The game runs its simulation behind the same commands and messages it will use online. *(Postponed. Single player keeps running the game directly in the tab; online, the browser keeps a copy fed by the server. Both use the same `Game`, `Region` and `Hero` code, so the rules can't drift. Only the plumbing differs, and it can be unified once online play settles.)*

**Test:** play Act I start to finish in single player; nothing has changed.

### M1: Walk together (localhost and LAN)

- **The server** (`src/server/`): rooms (host, list, join, leave), a 20-tick game loop per room, the hello/welcome handshake, characters kept on the server (see M4).
- **Moving:** your own hero moves instantly on your screen (the browser moves it and the server checks the moves are possible); other players glide smoothly, drawn a tenth of a second behind.
- **Seeing each other:** other heroes with their gear and name plates, the shared day and night, region changes.
- **An Online screen:** the room list, *Host a room*, *Join*, who is in the room, ping.
- **Test:** two browsers on two computers on your network walk the Greenmarch and Millbrook together.

### M2: Fight together

- **Combat on the server:** creatures, hits, spells, cooldowns, deaths and respawns, the Bell-Ringer's rings.
- **Rewards:** XP, gold and loot for whoever lands the kill.
- **Test:** two players kill the Bell-Ringer together.

### M3: The story together

- **Shared story:** flags, the journal and quest progress shared by the room; each player hands quests in for themselves *(done)*.
- **Dialogue and scenes:** talking to people, and scenes that play for everyone in the region.
- **The rest:** trading, crafting, and campfires and forges anyone can use.
- **Test:** a party plays Act I from the lakeshore to the black lace.

### M4: The party remembers

- **Saving on the server** *(done)*: each character on the server's disk (one file each, written safely: a temporary file renamed over the old one), every 5 seconds while something changed, on leaving, and when the server stops. Deleted characters go to `deleted/`, not away. The folder is `server-data/` (gitignored), or wherever `QFV_DATA_DIR` says.
- **Reconnecting:** a dropped player rejoins the same room without losing anything.
- **Test:** kill the server in the middle of a fight, start it again, and everyone carries on.

### M5: Live on the EC2 box

- Every push to `main` deploys the game (see *Hosting* below).
- **Test:** play together over the internet at the game's address.

---

## Testing on your computer and network

- `npm run dev`, then open http://localhost:3000 in two windows: one hosts a room, the other joins it from the list.
- **Other computers on your Wi-Fi** open `http://<your computer's address>:3000`. On a Mac, `ipconfig getifaddr en0` prints the address, and it can change from day to day. macOS may ask once to let Node accept connections.
- **Testing alone:** a bot joins like a browser does, wanders about and picks fights:
  - `npm run bot` lists the open rooms;
  - `npm run bot -- host "Bot room"` opens a room and plays in it;
  - `npm run bot -- join ABCD --name Botty --look k2 --secs 60` joins room ABCD.

  Add `--url ws://<address>:3000/ws` to send it to another computer's server.
- **While developing,** every change to the game's code restarts the server, which drops everyone and closes the rooms. Characters are saved first, so reload the page and pick up where you were.
- **Starting over:** stop the server and delete `server-data/` to forget every online character. Bots have characters too, one per bot name.
- **Automated tests:** `npm test` checks the rules of playing together (quests in a party, saving and joining, moves, loot, the command whitelist, snapshots) and runs a real server over WebSockets (hosting, joining, saving, stopping, junk messages). See *Tests* in the README.
- **The numbers** (8 players in one room on a laptop): the server holds 20 updates a second at about 1% of one core. Each player receives about 40 kB/s of JSON, which compression brings down to about 1 kB/s on the wire.

---

## Hosting on the EC2 box, live from `main`

The same box as Realms, which already runs nginx.

- **The game runs as a service** (Node, `systemd`, restarts by itself if it crashes) on an internal port, behind **nginx** at its own address, for example `play.<your domain>`, with HTTPS from Let's Encrypt. WebSockets pass through nginx.
- **Every push to `main`** runs a GitHub Action:
  1. install, type-check and run the tests;
  2. build;
  3. copy the files to the box;
  4. restart the service;
  5. check the game answers.

  It uses the same kind of secrets as Realms (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, `EC2_SSH_PORT`, `EC2_BASE_DIR`), added to this repo.
- **Saves live outside the deploy folder** (`QFV_DATA_DIR`, for example `/var/lib/questforvictoria`), so a deploy never touches them. A deploy restarts the server, which saves every character first; players then reload.
- **Later, if you want it:** a preview server for every pull request, like Realms' channels.

**What I'll need from you for M5:**
- the domain or subdomain to use;
- confirmation it's the same box;
- the secrets added to this repo's GitHub settings.

I'll write the one-time setup (nginx site, certificate, service file) as a script you run once on the box.

---

## Not in this plan (yet)

Passwords (an account is a key kept in the browser for now), chat, PvP, playing online on phones, protection against cheating beyond the server checking every move, and running more than one server process.

---

## Repo mechanics

- **One branch:** `online-coop` carries the whole effort, a milestone at a time, and merges into `main` when you say so.
- **New code** goes in `src/server/` (the Node side), `src/net/` (messages and commands shared by both sides) and `tests/`.
- **This document** stays up to date as milestones land.
