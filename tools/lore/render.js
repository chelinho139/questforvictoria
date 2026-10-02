// Renders docs/lore.md into an HTML page template: headings get ids, wide tables a scrolling
// frame, and the page a contents list and a reading time. Used by server.js (the local viewer)
// and tools/build-lore-artifact.js (the shareable page, with the plates inlined).
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = path.join(__dirname, '..', '..');
const LORE_MD = path.join(ROOT, 'docs', 'lore.md');
const LORE_ART = path.join(ROOT, 'docs', 'lore-art');

const decode = s => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

/**
 * Fill `templateFile` ({{TITLE}}, {{META}}, {{TOC}}, {{LORE}}) with a Markdown file from docs/
 * (the lore by default). With inlineArt, plates become data: URIs.
 */
function renderLore(templateFile, { inlineArt = false, mdFile = LORE_MD, title = 'The Lore' } = {}) {
  const md = fs.readFileSync(mdFile, 'utf8');
  const heads = [];
  let html = marked
    .parse(md)
    .replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, lv, inner) => {
      const text = decode(inner.replace(/<[^>]+>/g, ''));
      const id = slug(text);
      heads.push({ lv: Number(lv), id, text });
      return `<h${lv} id="${id}">${inner}</h${lv}>`;
    })
    .replace(/<table>/g, '<div class="table"><table>')
    .replace(/<\/table>/g, '</table></div>');
  if (inlineArt) {
    html = html.replace(/src="lore-art\/([\w-]+\.svg)"/g, (_, file) => {
      const svg = fs.readFileSync(path.join(LORE_ART, file));
      return `src="data:image/svg+xml;base64,${svg.toString('base64')}"`;
    });
  }
  let toc = '<ol>';
  heads.forEach((h, i) => {
    const link = `<a href="#${h.id}">${esc(h.text)}</a>`;
    const next = heads[i + 1];
    if (h.lv === 2) toc += `<li>${link}${next && next.lv === 3 ? '<ol>' : '</li>'}`;
    else toc += `<li>${link}</li>${!next || next.lv === 2 ? '</ol></li>' : ''}`;
  });
  toc += '</ol>';
  const words = md.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const when = fs.statSync(mdFile).mtime.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  return fs
    .readFileSync(templateFile, 'utf8')
    .replace(/{{TITLE}}/g, () => title)
    .replace('{{META}}', () => `${Math.round(words / 230)} min read · updated ${when}`)
    .replace('{{TOC}}', () => toc)
    .replace('{{LORE}}', () => html);
}

module.exports = { renderLore, LORE_MD, LORE_ART, ROOT };
