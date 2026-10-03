/**
 * This browser's account key for online play (localStorage `qfv-account`): a long random
 * secret made on first use. The server keeps your characters under it (only its hash), so
 * whoever has the key has the characters; there is no password yet.
 */
const KEY = 'qfv-account';

let fallback = '';

export function accountKey(): string {
  try {
    const have = localStorage.getItem(KEY);
    if (have && /^[a-f0-9]{64}$/.test(have)) return have;
    const made = randomKey();
    localStorage.setItem(KEY, made);
    return made;
  } catch {
    // no storage (a private window): characters last until the tab closes
    return (fallback ||= randomKey());
  }
}

function randomKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
