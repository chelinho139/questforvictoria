import type { Sim } from '../../sim/Sim';
import type { Hero } from '../../sim/Hero';
import type { DuelView } from '../../sim/Duel';
import { DUEL_ASK, DUEL_COUNT, DUEL_OUT, DUEL_REACH } from '../../sim/Duel';
import { TRADE_REACH } from '../../sim/Trade';
import { CLASSES } from '../../data/classes';

type Button = { label: string; cls?: string; act: () => void };

/** Seconds the Yield button waits for its second click before it's just Yield again. */
const YIELD_SURE = 3;

/**
 * Duels on the screen. Click another player and their card opens: their name, class and level,
 * the duels they have won and lost, Challenge to a duel, and Trade (PlayerTradeWindow takes it
 * from there). While a duel is on, a bar across the top says where it stands: a challenge to
 * answer (Accept / Decline, and the time running out), one you made (Take back), the count
 * (Back out). Once the fight is on it steps out of the way, to a small plate on the left under
 * the frames: who you fight, a warning while you are too far from the flag, and Yield (which
 * asks again before it gives the duel away).
 */
export class DuelWindow {
  private readonly card: HTMLDivElement;
  private readonly cardName: HTMLElement;
  private readonly cardSub: HTMLElement;
  private readonly cardTally: HTMLElement;
  private readonly cardWhy: HTMLElement;
  private readonly cardGo: HTMLButtonElement;
  private readonly cardTrade: HTMLButtonElement;
  private readonly bar: HTMLDivElement;
  private readonly barText: HTMLElement;
  private readonly barTime: HTMLElement;
  private readonly barFill: HTMLElement;
  private readonly barWarn: HTMLElement;
  private readonly barChoices: HTMLElement;
  /** Whose card is open. */
  private who: Hero | null = null;
  /** What the bar and the card show now (only a change touches the page). */
  private barKey = '';
  private cardKey = '';
  /** Yield was clicked once: until this time (performance.now, ms) a second click gives up the fight. */
  private yieldUntil = 0;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.who) this.closeCard();
  };

  /** Where the bar goes (page px from the top): below the HUD's frames. */
  private top = -1;

  constructor(
    private readonly sim: Sim,
    /** Where the HUD's frames end, in page px (the bar goes just below them). */
    private readonly hudTop: () => number = () => 40
  ) {
    const card = (this.card = document.createElement('div'));
    card.className = 'duel-card';
    card.hidden = true;
    card.innerHTML = `<header><b translate="no"></b><span></span></header>
      <p class="duel-tally"></p><p class="duel-why"></p>
      <div class="duel-choices"><button type="button" class="duel-go">Challenge to a duel</button><button type="button" class="new duel-trade">Trade</button><button type="button" class="bye">Close</button></div>
      <button type="button" class="inv-x" title="Close (Esc)">×</button>`;
    this.cardName = card.querySelector('header b')!;
    this.cardSub = card.querySelector('header span')!;
    this.cardTally = card.querySelector('.duel-tally')!;
    this.cardWhy = card.querySelector('.duel-why')!;
    this.cardGo = card.querySelector('.duel-go')!;
    this.cardGo.addEventListener('click', () => {
      if (this.who) this.sim.challenge(this.who);
      this.closeCard();
    });
    this.cardTrade = card.querySelector('.duel-trade')!;
    this.cardTrade.addEventListener('click', () => {
      if (this.who) this.sim.askTrade(this.who);
      this.closeCard();
    });
    card.querySelector('.bye')!.addEventListener('click', () => this.closeCard());
    card.querySelector('.inv-x')!.addEventListener('click', () => this.closeCard());
    const bar = (this.bar = document.createElement('div'));
    bar.className = 'duel-bar';
    bar.hidden = true;
    bar.innerHTML = `<div class="duel-head"><b></b><span class="duel-time"></span></div>
      <div class="duel-track"><div class="duel-fill"></div></div><p class="duel-warn"></p><div class="duel-choices"></div>`;
    this.barText = bar.querySelector('.duel-head b')!;
    this.barTime = bar.querySelector('.duel-time')!;
    this.barFill = bar.querySelector('.duel-fill')!;
    this.barWarn = bar.querySelector('.duel-warn')!;
    this.barChoices = bar.querySelector('.duel-choices')!;
    // a click here is not a click on the world
    for (const el of [card, bar]) {
      el.addEventListener('pointerdown', e => e.stopPropagation());
      document.body.append(el);
    }
    window.addEventListener('keydown', this.onKey);
  }

  get isOpen(): boolean {
    return this.who !== null;
  }

  /** How far down the page the bar at the top reaches (page px; 0 while it's away or on the side). */
  get barBottom(): number {
    if (this.bar.hidden || this.bar.classList.contains('fight')) return 0;
    const r = this.bar.getBoundingClientRect();
    return r.bottom;
  }

  /** A click on another player: your duel opponent becomes your target; anyone else shows their card. */
  clickHero(o: Hero): void {
    const r = this.sim.rivalOf(o);
    if (r) {
      if (r.alive && !r.hid) this.sim.setTarget(r);
      return;
    }
    // counting down to a fight with them: nothing to do but wait
    const d = this.sim.duel;
    if (d && d.id === o.id && d.st !== 'ask') return;
    this.openCard(o);
  }

  /** Another player's card. */
  openCard(o: Hero): void {
    this.who = o;
    this.cardKey = '';
    this.card.hidden = false;
    this.update();
  }

  closeCard(): void {
    this.who = null;
    this.card.hidden = true;
  }

  /** Every frame (GameScene.update): the bar and the card follow the duel. */
  update(): void {
    this.updateBar(this.sim.duel);
    this.updateCard();
  }

  private updateBar(d: DuelView | null): void {
    this.bar.hidden = !d;
    if (!d) {
      this.barKey = '';
      return;
    }
    const top = Math.round(this.hudTop());
    if (top !== this.top) {
      this.top = top;
      this.bar.style.top = `${top}px`;
    }
    const left = Math.ceil(d.t);
    const warn = d.st === 'fight' && d.out > 0 ? Math.max(0, Math.ceil(DUEL_OUT - d.out)) : 0;
    // the buttons only change with the state; the clock and the warning change as they run
    const sure = d.st === 'fight' && performance.now() < this.yieldUntil;
    const key = `${d.st}:${d.mine}:${d.name}:${sure}`;
    if (key !== this.barKey) {
      this.barKey = key;
      this.bar.className = 'duel-bar';
      this.bar.classList.add(d.st);
      this.bar.classList.toggle('asked', d.st === 'ask' && !d.mine);
      this.barText.textContent =
        d.st === 'ask'
          ? d.mine
            ? `Waiting for ${d.name} to answer…`
            : `${d.name} challenges you to a duel!`
          : `Duel with ${d.name}`;
      this.buttons(
        d.st === 'ask' && !d.mine
          ? [
              { label: 'Accept', cls: 'new', act: () => this.sim.acceptDuel() },
              { label: 'Decline', cls: 'bye', act: () => this.sim.quitDuel() },
            ]
          : d.st === 'ask'
            ? [{ label: 'Take back', cls: 'bye', act: () => this.sim.quitDuel() }]
            : d.st === 'count'
              ? [{ label: 'Back out', cls: 'bye', act: () => this.sim.quitDuel() }]
              : [
                  sure
                    ? {
                        label: 'Sure? Yield',
                        cls: 'duel-go',
                        act: () => {
                          this.yieldUntil = 0;
                          this.sim.quitDuel();
                        },
                      }
                    : {
                        label: 'Yield',
                        cls: 'bye',
                        act: () => (this.yieldUntil = performance.now() + YIELD_SURE * 1000),
                      },
                ]
      );
    }
    this.barTime.textContent =
      d.st === 'fight' ? '' : d.st === 'count' ? String(Math.max(1, left)) : `${left} s`;
    // the challenge's time running out, the count's, then nothing
    const frac = d.st === 'ask' ? d.t / DUEL_ASK : d.st === 'count' ? d.t / DUEL_COUNT : 0;
    this.barFill.parentElement!.hidden = d.st === 'fight';
    this.barFill.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
    this.barWarn.hidden = !warn;
    if (warn) this.barWarn.textContent = `Back to the flag or you forfeit: ${warn} s`;
  }

  private buttons(list: Button[]): void {
    this.barChoices.replaceChildren(
      ...list.map(b => {
        const el = document.createElement('button');
        el.type = 'button';
        el.textContent = b.label;
        if (b.cls) el.className = b.cls;
        el.addEventListener('click', b.act);
        return el;
      })
    );
  }

  /** The card: closed once they are gone; the challenge and the trade greyed (and why) while they can't be made. */
  private updateCard(): void {
    const o = this.who;
    if (!o) return;
    const s = this.sim;
    if (!s.others.includes(o)) return this.closeCard();
    const d = s.duel;
    const t = s.trading;
    const far = s.dist(s.hero, o);
    const duelWhy = d
      ? d.id === o.id
        ? d.st === 'ask' && !d.mine
          ? `${o.name} has challenged you: answer at the top.`
          : `You are in a duel with ${o.name}.`
        : "You're in a duel already."
      : o.dead > 0
        ? `${o.name} is down.`
        : far > DUEL_REACH
          ? 'Come closer to challenge them.'
          : '';
    const tradeWhy =
      d && d.st !== 'ask'
        ? ''
        : t
          ? t.id === o.id
            ? t.st === 'ask' && !t.mine
              ? `${o.name} wants to trade: answer at the top.`
              : t.st === 'ask'
                ? `Waiting for ${o.name} to answer.`
                : `You are trading with ${o.name}.`
            : "You're trading with someone else."
          : o.dead > 0
            ? `${o.name} is down.`
            : far > TRADE_REACH
              ? 'Come closer to trade.'
              : '';
    const tradeOff = !!tradeWhy || (!!d && d.st !== 'ask');
    // one line for both when they say the same (down, too far)
    const why =
      duelWhy === 'Come closer to challenge them.' && tradeWhy === 'Come closer to trade.'
        ? 'Come closer to challenge or trade.'
        : [...new Set([duelWhy, tradeWhy].filter(Boolean))].join(' ');
    const key = `${o.name}:${o.level}:${o.cls}:${o.duelsWon}:${o.duelsLost}:${why}:${tradeOff}`;
    if (key === this.cardKey) return;
    this.cardKey = key;
    this.cardName.textContent = o.name;
    this.cardSub.textContent = `${CLASSES[o.cls].name} · Lv ${o.level}`;
    this.cardTally.textContent =
      o.duelsWon || o.duelsLost
        ? `Duels won: ${o.duelsWon} · lost: ${o.duelsLost}`
        : 'No duels fought yet.';
    this.cardWhy.textContent = why;
    this.cardWhy.hidden = !why;
    this.cardGo.disabled = !!duelWhy;
    this.cardTrade.disabled = tradeOff;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKey);
    this.card.remove();
    this.bar.remove();
  }
}
