#!/usr/bin/env node
// Builds the shareable art board: bundles src/share/artBoardPage.ts and inlines it into
// src/share/artBoard.html, producing one self-contained HTML file.
// Usage: node tools/build-art-board.js [out.html]
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'public', 'art-board.html'));

(async () => {
  const result = await esbuild.build({
    entryPoints: [path.join(root, 'src/share/artBoardPage.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2020',
    minify: true,
  });
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const tpl = fs.readFileSync(path.join(root, 'src/share/artBoard.html'), 'utf8');
  if (!tpl.includes('/*__BUNDLE__*/')) throw new Error('template is missing the bundle marker');
  fs.writeFileSync(out, tpl.replace('/*__BUNDLE__*/', () => js));
  console.log(`art board written to ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
