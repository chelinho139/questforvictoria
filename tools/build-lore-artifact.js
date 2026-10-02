#!/usr/bin/env node
// Builds the shareable lore page: docs/lore.md rendered into docs/lore-share.html with every
// plate from docs/lore-art inlined, producing one self-contained HTML file to publish.
// Usage: node tools/build-lore-artifact.js [out.html]
const fs = require('fs');
const path = require('path');
const { renderLore, ROOT } = require('./lore/render');

const out = path.resolve(process.argv[2] || path.join(ROOT, 'public', 'quest-for-victoria-lore.html'));
const html = renderLore(path.join(ROOT, 'docs', 'lore-share.html'), { inlineArt: true });
if (/src="lore-art\//.test(html)) throw new Error('a plate was not inlined');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`lore page written to ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
