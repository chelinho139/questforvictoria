import { Connection } from '../../net/Connection';
import { NetSim } from '../../net/NetSim';
import { accountKey } from '../../net/account';
import { ROOM_MAX } from '../../net/protocol';
import type { CharInfo, RoomInfo, S2C } from '../../net/protocol';
import { HD_HERO_IDS } from '../render/art';
import { CharacterList } from './CharacterList';
import { NewCharacter } from './NewCharacter';
import { DifficultyPick } from './DifficultyPick';
import { DIFFICULTIES } from '../../data/difficulty';
import { esc } from './html';
import { keepNames, t } from '../../i18n';

/**
 * Multi player, like Diablo II's Battle.net: your characters (kept on the server; the same
 * character screen as single player), then the open rooms on this server, to host or join
 * with the chosen character. Once the server has sent the first look at the world, hands
 * back the game (a NetSim) to play. Back returns to the main menu.
 */
export class Lobby {
  private conn: Connection | null = null;
  private offConn: (() => void) | null = null;
  private list: CharacterList | null = null;
  /** The rooms screen (over the character list, which waits hidden). */
  private rooms: HTMLDivElement | null = null;
  /** How hard a room opened from it will be. */
  private diff: DifficultyPick | null = null;
  private refreshTimer = 0;
  private char: CharInfo | null = null;
  private busy = false;
  private joined: { room: RoomInfo; hero: string } | null = null;
  /** The new-character screen's answer, while the server makes the character. */
  private pendingMake: ((err: string | null) => void) | null = null;

  constructor(
    private readonly onJoined: (sim: NetSim, ch: CharInfo) => void,
    private readonly onBack: () => void
  ) {}

  open(): void {
    this.list = new CharacterList({
      mode: 'Multi Player',
      intro: {
        some: 'They live on this server: level, gear, gold and the story so far go with them into every room.',
        none: 'Make your first character. They live on this server and keep their level, gear and story in every room.',
      },
      onNew: () => this.newChar(),
      onDelete: ch => this.conn?.send({ t: 'delChar', id: ch.id }),
      onPlay: ch => this.showRooms(ch),
      onBack: () => this.back(),
    });
    this.list.open();
    this.list.setStatus('Connecting…');
    Connection.open(accountKey()).then(
      ({ conn, chars }) => {
        if (!this.list) return conn.close();
        this.conn = conn;
        this.offConn = conn.on(m => this.onMessage(m));
        this.list.setChars(chars);
      },
      (err: Error) => this.list?.setStatus(err.message, true)
    );
  }

  private newChar(): void {
    if (!this.conn) return;
    this.list?.hide();
    new NewCharacter({
      mode: 'Multi Player',
      hero: HD_HERO_IDS[Math.floor(Math.random() * HD_HERO_IDS.length)],
      onCreate: c =>
        new Promise<string | null>(resolve => {
          this.pendingMake = resolve;
          this.conn?.send({ t: 'newChar', name: c.name, look: c.hero, cls: c.cls });
        }),
      onBack: () => this.list?.show(),
    }).open();
  }

  // ---------- the rooms ----------
  private showRooms(ch: CharInfo): void {
    if (!this.conn) return;
    this.char = ch;
    this.list?.hide();
    const root = document.createElement('div');
    root.className = 'select';
    root.innerHTML = `
      <div class="select-panel" role="dialog" aria-labelledby="rooms-title">
        <header id="rooms-title">Multi Player · ${esc(ch.name)}</header>
        <div class="lobby-body">
          <p class="lobby-status" role="status">Level ${ch.level} · open a room, or join one.</p>
          <div class="lobby-rooms" aria-label="Open rooms"></div>
          <div class="lobby-host">
            <label class="select-field" for="lobby-name">A new room
              <input id="lobby-name" type="text" maxlength="24" autocomplete="off" spellcheck="false">
            </label>
            <button type="button" class="select-go lobby-open">Open a room</button>
          </div>
        </div>
        <footer><button type="button" class="lobby-back">← Characters</button><button type="button" class="lobby-refresh">Refresh</button></footer>
      </div>`;
    document.body.append(root);
    this.rooms = root;
    // how hard the room is: as hard as the character's campaign was, unless picked otherwise
    this.diff = new DifficultyPick(ch.difficulty ?? 'normal');
    root.querySelector('.lobby-open')!.before(this.diff.el);
    const input = root.querySelector<HTMLInputElement>('#lobby-name')!;
    keepNames(ch.name);
    // a field's value isn't translated on screen: the name it suggests is, here
    input.value = t("{0}'s room", ch.name);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.host(input.value);
    });
    root.querySelector('.lobby-open')!.addEventListener('click', () => this.host(input.value));
    root.querySelector('.lobby-back')!.addEventListener('click', () => this.closeRooms());
    root.querySelector('.lobby-refresh')!.addEventListener('click', () => this.refresh());
    this.refresh();
    this.refreshTimer = window.setInterval(() => this.refresh(), 3000);
  }

  private closeRooms(): void {
    window.clearInterval(this.refreshTimer);
    this.rooms?.remove();
    this.rooms = null;
    this.list?.show();
  }

  private roomStatus(text: string, bad = false): void {
    const st = this.rooms?.querySelector('.lobby-status');
    if (!st) return;
    st.textContent = text;
    st.classList.toggle('bad', bad);
  }

  private refresh(): void {
    if (!this.busy && this.rooms) this.conn?.send({ t: 'list' });
  }

  private host(name: string): void {
    if (!this.conn || this.busy || !this.char) return;
    this.busy = true;
    this.roomStatus('Opening a room…');
    this.conn.send({ t: 'host', name: name.trim(), char: this.char.id, difficulty: this.diff?.value });
  }

  private join(id: string): void {
    if (!this.conn || this.busy || !this.char) return;
    this.busy = true;
    this.roomStatus('Joining…');
    this.conn.send({ t: 'join', room: id, char: this.char.id });
  }

  private renderRooms(rooms: RoomInfo[]): void {
    const list = this.rooms?.querySelector('.lobby-rooms');
    if (!list) return;
    if (!rooms.length) {
      list.innerHTML =
        '<p class="lobby-empty">No rooms are open yet. Open one, and friends on this server will see it here.</p>';
      return;
    }
    keepNames(...rooms.flatMap(r => [r.name, ...r.players.map(p => p.name)]));
    list.innerHTML = rooms
      .map(r => {
        const full = r.players.length >= ROOM_MAX;
        const who = r.players.length
          ? r.players.map(p => `${esc(p.name)} (${p.level})`).join(', ')
          : 'nobody right now';
        return `<div class="lobby-room">
          <h3 translate="no">${esc(r.name)}</h3>
          <button type="button" class="select-go" data-room="${esc(r.id)}"${full ? ' disabled' : ''}>${full ? 'Full' : 'Join'}</button>
          <p>${r.players.length}/${r.max} · ${who}</p>
          <p>${DIFFICULTIES[r.difficulty]?.name ?? 'Normal'} · ${esc(r.place)} · ${esc(r.story)}</p>
        </div>`;
      })
      .join('');
    for (const b of list.querySelectorAll<HTMLButtonElement>('button[data-room]'))
      b.addEventListener('click', () => this.join(b.dataset.room!));
  }

  // ---------- the server ----------
  private onMessage(m: S2C): void {
    if (m.t === 'chars') {
      if (m.made && this.pendingMake) {
        this.pendingMake(null);
        this.pendingMake = null;
        this.list?.show();
      }
      this.list?.setChars(m.chars, m.made);
    } else if (m.t === 'rooms') this.renderRooms(m.rooms);
    else if (m.t === 'joined') {
      this.joined = { room: m.room, hero: m.hero };
      keepNames(m.room.name);
      this.roomStatus(`Entering ${m.room.name}…`);
    } else if (m.t === 'tick' && this.joined && this.conn && this.char) {
      // the first look at the world: the game takes over the line from here
      const sim = new NetSim(this.conn, this.joined, m);
      const ch = this.char;
      this.conn = null;
      this.close();
      this.onJoined(sim, ch);
    } else if (m.t === 'error') {
      // the new-character screen is waiting: the answer is for it (or the line dropped under it)
      if (this.pendingMake) {
        this.pendingMake(m.msg);
        this.pendingMake = null;
        return;
      }
      this.busy = false;
      this.joined = null;
      if (this.rooms) this.roomStatus(m.msg, true);
      else this.list?.setStatus(m.msg, true);
      this.conn?.send({ t: 'chars' });
      this.refresh();
    }
  }

  private back(): void {
    this.conn?.close();
    this.conn = null;
    this.close();
    this.onBack();
  }

  close(): void {
    window.clearInterval(this.refreshTimer);
    this.offConn?.();
    this.offConn = null;
    this.rooms?.remove();
    this.rooms = null;
    this.list?.close();
    this.list = null;
  }
}
