#!/usr/bin/env node
// A test player for online play: joins the game server like a browser does and walks
// (and fights) on its own, so co-op can be tried with one person at the keyboard.
//
//   node tools/net/bot.js                     list the rooms
//   node tools/net/bot.js host "Bot room"     open a room and play in it
//   node tools/net/bot.js join ABCD           join room ABCD
//   options: --url ws://host:3000/ws  --name Botty  --look k2  --cls archer  --secs 30  --quiet
// Each bot name is its own account with one character of that name, kept on the server
// like a player's, so a bot comes back with the level and gear it had.
const crypto = require('crypto');
const WebSocket = require('ws');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
};
const url = opt('url', 'ws://localhost:3000/ws');
const name = opt('name', 'Botty');
const look = opt('look', 'k2');
/** Warrior or archer: the class of the bot's character when it's first made. */
const cls = opt('cls', 'warrior');
// the protocol this checkout speaks (read from the game's own code, so it can't drift)
const PROTOCOL = Number(
  require('fs')
    .readFileSync(require('path').join(__dirname, '../../src/net/protocol.ts'), 'utf8')
    .match(/PROTOCOL = (\d+)/)[1]
);
const secs = Number(opt('secs', '0'));
const quiet = args.includes('--quiet');
// the words that aren't options or their values: the action and its argument
const FLAGS = ['--quiet'];
const words = args.filter(
  (a, i) => !a.startsWith('--') && !(args[i - 1]?.startsWith('--') && !FLAGS.includes(args[i - 1]))
);
const [action, arg] = words;
// each bot name has its own account (and keeps its character between runs)
const account = crypto
  .createHash('sha256')
  .update('qfv-bot:' + name.toLowerCase())
  .digest('hex');

const ws = new WebSocket(url);
const send = m => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(m));
const say = (...a) => !quiet && console.log(`[${name}]`, ...a);

let me = null;
let region = '';
let enemies = [];
let ticks = 0;
let walkT = 0;
let goal = null;
let lastPing = 0;

/** Host or join with this character. */
let myCls = 'warrior';
const go = char => {
  myCls = char.cls || 'warrior';
  if (action === 'host') send({ t: 'host', name: arg || `${name}'s room`, char: char.id });
  else send({ t: 'join', room: arg, char: char.id });
};

ws.on('open', () => send({ t: 'hello', v: PROTOCOL, account }));
ws.on('message', data => {
  const m = JSON.parse(String(data));
  if (m.t === 'welcome') {
    if (action !== 'host' && action !== 'join') return send({ t: 'list' });
    // the bot's character, made the first time
    const mine = m.chars.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (mine) go(mine);
    else send({ t: 'newChar', name, look, cls });
  } else if (m.t === 'chars' && m.made) {
    const made = m.chars.find(c => c.id === m.made);
    say(`made the character ${made.name}`);
    go(made);
  } else if (m.t === 'rooms') {
    console.log(JSON.stringify(m.rooms, null, 2));
    ws.close();
  } else if (m.t === 'joined') {
    say(`joined ${m.room.id} "${m.room.name}" as ${m.hero}`);
  } else if (m.t === 'error') {
    console.log('error:', m.msg);
    ws.close();
  } else if (m.t === 'pong') {
    say(`ping ${Date.now() - m.n} ms`);
  } else if (m.t === 'tick') {
    ticks++;
    if (m.rg !== region) {
      region = m.rg;
      say('in', region);
    }
    const snap = m.me;
    // the server moved us (a teleport, a refused move): believe it
    if (!me || snap.tp !== me.tp) me = { ...snap };
    else Object.assign(me, { hp: snap.hp, dead: snap.dead, tp: snap.tp });
    enemies = m.en;
    for (const [aud, ev, p] of m.ev || []) if (ev === 'log' && aud === 'h') say(p.text);
  }
});
ws.on('close', () => process.exit(0));

// walk about near where we stand, 20 times a second; now and then pick a fight
setInterval(() => {
  if (!me || me.dead) return;
  walkT -= 0.05;
  if (!goal || walkT <= 0) {
    walkT = 2 + Math.random() * 3;
    goal = { x: me.x + (Math.random() - 0.5) * 160, y: me.y + (Math.random() - 0.5) * 160 };
    const near = enemies
      .filter(e => e[6] & 1)
      .sort(
        (a, b) => Math.hypot(a[2] - me.x, a[3] - me.y) - Math.hypot(b[2] - me.x, b[3] - me.y)
      )[0];
    if (near && Math.hypot(near[2] - me.x, near[3] - me.y) < 200) {
      send({ t: 'cmd', c: 'setTarget', a: [near[0]] });
      send({ t: 'cmd', c: 'castKey', a: [myCls === 'archer' ? 'quickshot' : 'thrust'] });
    }
  }
  const dx = goal.x - me.x;
  const dy = goal.y - me.y;
  const d = Math.hypot(dx, dy);
  if (d > 3) {
    const step = Math.min(d, 118 * 0.05 * 0.7);
    me.x += (dx / d) * step;
    me.y += (dy / d) * step;
    me.walk = (me.walk || 0) + 0.5;
  }
  send({
    t: 'move',
    x: me.x,
    y: me.y,
    face: dx < 0 ? -1 : 1,
    walk: me.walk || 0,
    jumpT: -1,
    jumpFlip: false,
  });
  if (Date.now() - lastPing > 5000) {
    lastPing = Date.now();
    send({ t: 'ping', n: Date.now() });
  }
}, 50);

if (secs > 0)
  setTimeout(() => {
    say(`done after ${ticks} ticks`);
    ws.close();
  }, secs * 1000);
