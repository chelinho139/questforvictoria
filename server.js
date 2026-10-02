// Small static server for local play. `npm run dev` runs it beside the esbuild watcher.
const express = require('express');
const path = require('path');
const { renderLore, LORE_MD } = require('./tools/lore/render');

const app = express();
const PORT = process.env.PORT || 3000;

// The story bible: docs/lore.md, rendered into docs/lore-viewer.html on every request, so
// the page holds the whole text (reading mode works) and edits show up on reload.
const LORE_VIEWER = path.join(__dirname, 'docs', 'lore-viewer.html');

app.get(['/lore', '/lore.html'], (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache');
    res.type('html').send(renderLore(LORE_VIEWER));
  } catch (err) {
    res.status(500).type('text').send(`Couldn't open the lore: ${err.message}`);
  }
});

// Build specs (docs/<name>.md) read the same way: /act1.html shows docs/act1.md.
const SPECS = { act1: 'Prologue & Act I spec' };
app.get(/^\/(act1)(\.html)?$/, (req, res) => {
  const name = req.params[0];
  try {
    res.setHeader('Cache-Control', 'no-cache');
    res.type('html').send(renderLore(LORE_VIEWER, { mdFile: path.join(__dirname, 'docs', name + '.md'), title: SPECS[name] }));
  } catch (err) {
    res.status(500).type('text').send(`Couldn't open ${name}: ${err.message}`);
  }
});

// The plates (book illustrations) the lore shows.
app.use('/lore-art', express.static(path.join(__dirname, 'docs', 'lore-art')));

// The raw Markdown, too.
app.get('/lore.md', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.type('text/markdown; charset=utf-8');
  res.sendFile(LORE_MD);
});

app.use(
  express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

app.listen(PORT, () => {
  console.log(`Quest For Victoria at http://localhost:${PORT}`);
});
