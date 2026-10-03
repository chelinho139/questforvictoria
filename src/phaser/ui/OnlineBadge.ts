import type { NetSim } from '../../net/NetSim';

/**
 * Online, at the top of the screen: the room's name, who is here with you, the round trip
 * to the server, and Leave (back to the start screen). Turns red if the line drops.
 */
export class OnlineBadge {
  private readonly root: HTMLDivElement;
  private readonly timer: number;

  constructor(private readonly sim: NetSim) {
    const root = document.createElement('div');
    root.className = 'net-badge';
    root.innerHTML = `<b></b><span class="net-who"></span><span class="net-ping"></span><button type="button">Leave</button>`;
    root.querySelector('button')!.addEventListener('click', () => this.leave());
    document.body.append(root);
    this.root = root;
    this.update();
    this.timer = window.setInterval(() => this.update(), 500);
  }

  private update(): void {
    const s = this.sim;
    const r = this.root;
    r.querySelector('b')!.textContent = s.room.name;
    const here = s.others.length;
    r.querySelector('.net-who')!.textContent = here ? `${here + 1} here` : 'alone here';
    const ping = r.querySelector<HTMLElement>('.net-ping')!;
    if (s.lost) {
      r.classList.add('lost');
      ping.textContent = 'connection lost';
      ping.className = 'net-ping slow';
      r.querySelector('button')!.textContent = 'Back to start';
    } else {
      ping.textContent = s.rtt ? `${s.rtt} ms` : '';
      ping.className = 'net-ping' + (s.rtt > 150 ? ' slow' : '');
    }
  }

  private leave(): void {
    this.sim.disconnect();
    window.clearInterval(this.timer);
    // the start screen again (online play never touches the single-player save)
    location.reload();
  }

  destroy(): void {
    window.clearInterval(this.timer);
    this.root.remove();
  }
}
