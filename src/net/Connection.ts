import { PROTOCOL } from './protocol';
import type { C2S, S2C, CharInfo } from './protocol';

type Handler = (m: S2C) => void;

/**
 * The browser's line to the game server: one WebSocket to /ws on the page's own host,
 * JSON messages both ways (net/protocol.ts). Measures the round trip with a ping every few
 * seconds.
 */
export class Connection {
  private readonly handlers = new Set<Handler>();
  /** Round trip in ms (0 until the first pong). */
  rtt = 0;
  /** Set once the socket has closed. */
  closed = false;
  private pingTimer = 0;

  private constructor(private readonly ws: WebSocket) {
    ws.addEventListener('message', ev => {
      let m: S2C;
      try {
        m = JSON.parse(String(ev.data)) as S2C;
      } catch {
        return;
      }
      if (m.t === 'pong') this.rtt = Date.now() - m.n;
      for (const h of [...this.handlers]) h(m);
    });
    ws.addEventListener('close', () => {
      this.closed = true;
      window.clearInterval(this.pingTimer);
      for (const h of [...this.handlers])
        h({ t: 'error', msg: 'Lost the connection to the server.' });
    });
    this.pingTimer = window.setInterval(() => this.send({ t: 'ping', n: Date.now() }), 3000);
  }

  /** Connect with this browser's account key; resolves once the server welcomes us, with our characters. */
  static open(account: string): Promise<{ conn: Connection; chars: CharInfo[] }> {
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const conn = new Connection(ws);
      const off = conn.on(m => {
        if (m.t === 'welcome') {
          off();
          resolve({ conn, chars: m.chars });
        } else if (m.t === 'error') {
          off();
          reject(new Error(m.msg));
        }
      });
      ws.addEventListener('open', () => conn.send({ t: 'hello', v: PROTOCOL, account }));
      ws.addEventListener('error', () => reject(new Error("Couldn't reach the game server.")));
    });
  }

  send(m: C2S): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  on(h: Handler): () => void {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }

  close(): void {
    this.ws.close();
  }
}
