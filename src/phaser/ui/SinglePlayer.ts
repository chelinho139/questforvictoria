import type { CharInfo } from '../../net/protocol';
import { HD_HERO_IDS } from '../render/art';
import { localCharInfos, createLocalChar, deleteLocalChar } from '../saveStore';
import { CharacterList } from './CharacterList';
import { NewCharacter } from './NewCharacter';

/**
 * Single player: your characters in this browser, each with their own adventure (the same
 * character screen as multi player). Play starts the chosen character's game.
 */
export class SinglePlayer {
  private list: CharacterList | null = null;

  constructor(
    private readonly onPlay: (ch: CharInfo) => void,
    private readonly onBack: () => void
  ) {}

  open(): void {
    const list = new CharacterList({
      mode: 'Single Player',
      intro: {
        some: 'Saved in this browser: each one has their own adventure.',
        none: 'Make your first character. Each one has their own adventure, saved in this browser.',
      },
      onNew: () => this.newChar(),
      onDelete: ch => {
        deleteLocalChar(ch.id);
        list.setChars(localCharInfos());
      },
      onPlay: ch => {
        this.close();
        this.onPlay(ch);
      },
      onBack: () => {
        this.close();
        this.onBack();
      },
    });
    this.list = list;
    list.open();
    list.setChars(localCharInfos());
  }

  private newChar(): void {
    const list = this.list;
    if (!list) return;
    list.hide();
    new NewCharacter({
      mode: 'Single Player',
      hero: HD_HERO_IDS[Math.floor(Math.random() * HD_HERO_IDS.length)],
      onCreate: c => {
        const made = createLocalChar(c.name, c.hero, c.cls);
        if (typeof made === 'string') return made;
        list.setChars(localCharInfos(), made.id);
        list.show();
        return null;
      },
      onBack: () => list.show(),
    }).open();
  }

  close(): void {
    this.list?.close();
    this.list = null;
  }
}
