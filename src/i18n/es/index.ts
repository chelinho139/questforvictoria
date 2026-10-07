import names from './names.json';
import quests from './quests.json';
import npcs from './npcs.json';
import story from './story.json';
import world from './world.json';
import items from './items.json';
import skills from './skills.json';
import sim from './sim.json';
import ui from './ui.json';
import settings from './settings.json';
import patterns from './patterns.json';

/**
 * Spanish, keyed by the English text (see src/i18n/README.md). `names` holds the names
 * everything else refers to (places, people, creatures, gear, spells, quests), so it goes
 * last: they read the same everywhere. `patterns` are the catch-alls: text joined with signs
 * ("Wren: “…”", "+3 Wood log"), each part translated on its own, and a titled name taking its
 * article mid-sentence ("Vuelve con el Guardián Aldric").
 */
const ES: Record<string, string> = {};
for (const d of [
  patterns,
  quests,
  npcs,
  story,
  world,
  items,
  skills,
  sim,
  ui,
  settings,
  names,
] as Record<string, string>[])
  for (const [en, es] of Object.entries(d)) if (es) ES[en] = es;

export default ES;
