#!/usr/bin/env node
// Bundles src/main.ts into public/dist/game.js, and the game server into dist/server, with esbuild.
// WATCH=1 keeps rebuilding on change.
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outdir = path.join(__dirname, 'public', 'dist');
fs.mkdirSync(outdir, { recursive: true });

const watch = ['1', 'true', 'yes'].includes(String(process.env.WATCH).toLowerCase());
const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'public/dist/game.js',
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  sourcemap: true,
  minify: !watch,
  logLevel: 'info',
};

// The game server (rooms, the WebSocket, the same simulation): dist/server/game-server.js,
// loaded by server.js.
const serverOptions = {
  entryPoints: ['src/server/GameServer.ts'],
  bundle: true,
  outfile: 'dist/server/game-server.js',
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: true,
  external: ['ws'],
  logLevel: 'info',
};

(async () => {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    const sctx = await esbuild.context(serverOptions);
    await sctx.watch();
    console.log('esbuild watching src/ ...');
  } else {
    await esbuild.build(options);
    await esbuild.build(serverOptions);
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
