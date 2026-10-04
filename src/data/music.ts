/**
 * The music: the tracks (picked by ear from a board of free medieval music, 2026-10-03), the
 * playlist each kind of place draws from, and the rules for what plays when. Engine-free;
 * src/phaser/audio/Music.ts plays it. `npm run music` fetches each track from `from`, evens out
 * its loudness and writes public/music/<id>.mp3. Every track is credited in docs/credits.md.
 */

export type TrackId = 'suonatore' | 'teller' | 'exploration' | 'villagers' | 'bard' | 'folkround' | 'willow' | 'ossuary' | 'evil';

export interface TrackDef {
  title: string;
  artist: string;
  licence: 'CC BY 4.0' | 'CC0';
  /** The page the track (and its licence) was found on. */
  page: string;
  /** The original file. */
  from: string;
}

const KEVIN = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/';
const kevin = (title: string): TrackDef => ({
  title,
  artist: 'Kevin MacLeod',
  licence: 'CC BY 4.0',
  page: 'https://incompetech.com/music/royalty-free/',
  from: KEVIN + encodeURIComponent(title) + '.mp3',
});

export const TRACKS: Record<TrackId, TrackDef> = {
  suonatore: kevin('Suonatore di Liuto'),
  teller: kevin('Teller of the Tales'),
  exploration: {
    title: 'Medieval: Exploration',
    artist: 'RandomMind',
    licence: 'CC0',
    page: 'https://opengameart.org/content/medieval-exploration',
    from: 'https://opengameart.org/sites/default/files/Exploration_0.mp3',
  },
  villagers: kevin('Thatched Villagers'),
  bard: {
    title: "Medieval: The Bard's Tale",
    artist: 'RandomMind',
    licence: 'CC0',
    page: 'https://opengameart.org/content/medieval-the-bards-tale',
    from: 'https://opengameart.org/sites/default/files/The_Bards_Tale.mp3',
  },
  folkround: kevin('Folk Round'),
  willow: kevin('Willow and the Light'),
  ossuary: kevin('Ossuary 6 - Air'),
  evil: kevin('Some Amount of Evil'),
};

export const TRACK_IDS = Object.keys(TRACKS) as TrackId[];

/** Where a track is served from. */
export const musicFile = (id: TrackId): string => `music/${id}.mp3`;

/** The kind of place you're in, as the music hears it. */
export type Mood = 'meadow' | 'village' | 'indoors' | 'night' | 'haunted' | 'deep' | 'boss';

export const MOOD_NAMES: Record<Mood, string> = {
  meadow: 'The Greenmarch',
  village: 'Village',
  indoors: 'Indoors',
  night: 'Night',
  haunted: 'Haunted wilds',
  deep: 'The deep dark',
  boss: 'Boss',
};

/** What each kind of place plays. A track may sit in several lists: it plays on when you cross between them. */
export const PLAYLISTS: Record<Mood, TrackId[]> = {
  meadow: ['suonatore', 'teller', 'exploration'],
  village: ['villagers', 'bard', 'teller'],
  indoors: ['bard', 'suonatore'],
  night: ['folkround', 'teller'],
  haunted: ['willow', 'folkround'],
  deep: ['ossuary', 'willow'],
  boss: ['evil'],
};

/** What the music needs to know about where you are. */
export interface MusicPlace {
  ring: number;
  indoor: boolean;
  night: boolean;
  /** A boss is fighting you, or about to. */
  boss: boolean;
  /** The region's own choice (RegionDef.music), over what its ring and roof would say. */
  music?: Mood;
}

/** The kind of place: a boss over everything, then the region's own choice, then the Blackthorn's ring, then roof and hour. */
export function moodFor(p: MusicPlace): Mood {
  if (p.boss) return 'boss';
  if (p.music) return p.music;
  if (p.ring >= 4) return 'deep';
  if (p.ring >= 2) return 'haunted';
  if (p.indoor) return 'indoors';
  if (p.night) return 'night';
  return p.ring >= 1 ? 'village' : 'meadow';
}

/** Quiet after a track ends, before the next (seconds, random between): the world is left to itself a while. */
export const GAP_S: [number, number] = [60, 180];
/** A new kind of place: the old track fades out over this... */
export const FADE_S = 4;
/** ...and the new one starts this long after (random between). */
export const BREATH_S: [number, number] = [2, 5];
/** The very first track, after the game opens. */
export const FIRST_S = 2;
/** Walking along a border or over dusk: the new place must hold this long before the music follows. */
export const SETTLE_S = 2;
/** A boss's music cuts in over this, and fades out over BOSS_OUT_S once the fight is over. */
export const BOSS_IN_S = 1;
export const BOSS_OUT_S = 3;
/** The fight counts as over once no boss has been near for this long (stepping out of reach and back). */
export const BOSS_LINGER_S = 5;
/** A track starts by fading up over this. */
export const FADE_IN_S = 2;

/** What the player should do: start a track (fading out whatever plays), or fade out what plays. */
export type MusicCue = { kind: 'play'; track: TrackId; fadeIn: number; fadeOut: number; loop: boolean } | { kind: 'stop'; fade: number };

/**
 * Decides what plays when: one track, then a while of quiet, then another from the same list
 * (never the one just heard); a new kind of place fades the old track out and starts its own
 * after a breath, unless the track playing belongs there too; a boss cuts in at once and loops.
 */
export class MusicDirector {
  /** The kind of place the music is following. */
  mood: Mood | null = null;
  /** What plays now (null: quiet). */
  track: TrackId | null = null;
  /** Seconds until the next track starts, while quiet. */
  wait = 0;
  private pending: Mood | null = null;
  private pendingT = 0;
  private bossT = 0;
  /** Tracks heard, most recent first. */
  private readonly heard: TrackId[] = [];

  constructor(private readonly rand: () => number = Math.random) {}

  /** Every frame, with the kind of place you're in now. */
  update(dt: number, place: Mood): MusicCue[] {
    let want = place;
    if (want === 'boss') this.bossT = BOSS_LINGER_S;
    else if (this.mood === 'boss' && this.bossT > 0) {
      this.bossT -= dt;
      if (this.bossT > 0) want = 'boss';
    }
    const cues: MusicCue[] = [];
    if (want !== this.mood) {
      if (want === 'boss' || this.mood === null) this.follow(want, cues);
      else {
        if (want !== this.pending) {
          this.pending = want;
          this.pendingT = 0;
        }
        this.pendingT += dt;
        if (this.pendingT >= SETTLE_S) this.follow(want, cues);
      }
    } else this.pending = null;
    if (this.track === null && this.mood !== null) {
      this.wait -= dt;
      if (this.wait <= 0) {
        const track = this.pick(this.mood);
        this.start(track);
        cues.push({ kind: 'play', track, fadeIn: this.mood === 'boss' ? BOSS_IN_S : FADE_IN_S, fadeOut: BOSS_IN_S, loop: this.mood === 'boss' });
      }
    }
    return cues;
  }

  /** The track playing came to its end. */
  ended(): void {
    if (this.track === null) return;
    this.track = null;
    this.wait = this.mood === 'boss' ? 0 : this.between(GAP_S);
  }

  /** Play this track now (the settings panel's music board); the director carries on from it. */
  force(track: TrackId): MusicCue[] {
    this.start(track);
    return [{ kind: 'play', track, fadeIn: 0.3, fadeOut: 0.5, loop: false }];
  }

  private follow(to: Mood, cues: MusicCue[]): void {
    const from = this.mood;
    this.mood = to;
    this.pending = null;
    if (from === null) {
      this.wait = FIRST_S;
      return;
    }
    if (to === 'boss') {
      // the update below starts it this same frame, over whatever plays
      this.track = null;
      this.wait = 0;
      return;
    }
    if (this.track !== null) {
      // a track that belongs here too plays on
      if (from !== 'boss' && PLAYLISTS[to].includes(this.track)) return;
      const fade = from === 'boss' ? BOSS_OUT_S : FADE_S;
      cues.push({ kind: 'stop', fade });
      this.track = null;
      this.wait = fade + this.between(BREATH_S);
    } else this.wait = Math.min(this.wait, this.between(BREATH_S));
  }

  private start(track: TrackId): void {
    this.track = track;
    const i = this.heard.indexOf(track);
    if (i >= 0) this.heard.splice(i, 1);
    this.heard.unshift(track);
  }

  /** The list's track heard longest ago (or never), never the one just heard; ties drawn at random. */
  private pick(mood: Mood): TrackId {
    const list = PLAYLISTS[mood];
    const last = this.heard[0];
    const can = list.length > 1 ? list.filter(t => t !== last) : list;
    const age = (t: TrackId) => {
      const i = this.heard.indexOf(t);
      return i < 0 ? Infinity : i;
    };
    const oldest = Math.max(...can.map(age));
    const best = can.filter(t => age(t) === oldest);
    return best[Math.min(best.length - 1, Math.floor(this.rand() * best.length))];
  }

  private between([a, b]: [number, number]): number {
    return a + (b - a) * this.rand();
  }
}
