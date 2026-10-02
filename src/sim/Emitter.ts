/** Minimal typed event emitter so the simulation stays engine-free. */
export class Emitter<E extends Record<string, unknown>> {
  private listeners: { [K in keyof E]?: Array<(payload: E[K]) => void> } = {};

  on<K extends keyof E>(name: K, fn: (payload: E[K]) => void): () => void {
    (this.listeners[name] ??= []).push(fn);
    return () => this.off(name, fn);
  }

  off<K extends keyof E>(name: K, fn: (payload: E[K]) => void): void {
    const list = this.listeners[name];
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }

  emit<K extends keyof E>(name: K, payload: E[K]): void {
    const list = this.listeners[name];
    if (!list) return;
    for (const fn of list.slice()) fn(payload);
  }

  clear(): void {
    this.listeners = {};
  }
}
