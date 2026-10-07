# Languages

The game is written in English and plays in English or Spanish (more can be added). The
simulation, the server and the data stay in English; the browser translates what it puts on
the screen. Settings › Language switches at any time, and the main menu has the same switch.
The first time, the game starts in Spanish if the computer's first language the game speaks
is Spanish (`navigator.languages`), else in English; the choice is kept in `localStorage`
(`qfv-lang`).

## How it works

- `index.ts`: `t(text)` looks `text` up in the dictionary of the current language. Keys are
  the English text exactly as the screen would show it.
- `dom.ts`: the browser side. Every Phaser `Text` goes through `t` when its text is set, and
  a `MutationObserver` translates every text node and every `title`, `placeholder`,
  `aria-label`, `data-label` and `label` (a list's groups) in the page as it appears, so no window has to call `t` itself.
  Names players chose (characters, rooms) are registered with `keepNames` as they arrive and
  are never translated, alone or inside other text; anything inside `translate="no"` (and a
  Phaser text marked with `keepAsIs`) is left alone too. Switching language re-translates everything on screen from its English.
- `es/*.json`: Spanish, one file per part of the game (`npm run i18n` shows which source files
  each covers). `names.json` is the glossary of names everything else refers to (places,
  people, creatures, gear, spells, quests, documents); it wins over the other files, so a name
  reads the same everywhere.

## Writing entries

- **Plain text**: `"Bread": "Pan"`. Lookups ignore case as a last resort and keep the case of
  what was shown: `"WHIRLWIND"` comes out `"TORBELLINO"`, a name in lower case mid-sentence
  stays lower case. Leading and trailing spaces are kept, so keys never need them.
- **Templates**: text built around names and numbers is written with `{0}`, `{1}`… for what
  changes: `"{0} defeated.": "{0} derrotado."`, `"Quest complete: {0}. You receive {1}.": "Misión
  completada: {0}. Recibes {1}."`. The holes can move. What fills a hole is translated on its
  own (a name, a number, or a list like `15 gold, Leather boots`, split at the commas). When
  several templates could match, the one with more words of its own is tried first, so a
  longer variant (`… You receive {1}.`) needs its own entry. Text in several lines is tried
  whole, then line by line.
- **HTML**: windows are translated text node by text node: `<b>Attack</b> <i>+3</i>` is two
  entries, `Attack` and `+3` (numbers need none). A sentence broken by markup can't be
  translated well in pieces; build it as one string in code, `t('Ready again in {0} s', wait)`.
- **Code** may call `t('… {0} …', a, b)` itself: the key is the template, the arguments fill it
  (and are translated if they are text).
- Missing entries show in English. `npm run i18n` lists strings found in the source with no
  translation; in the browser, `qfvI18n.missing()` lists what reached the screen untranslated.

## Spanish style

Neutral Latin American Spanish: `tú` for the player (imperatives in `tú`: *haz clic*, *pulsa*),
`ustedes` for a group, no `vosotros`, no Spain-only words. The player's hero may be anyone:
prefer phrasings without gendered adjectives about them (*¿Todo listo?* over *¿Estás listo?*).
Keys stay as in the game (`Esc`, `Tab`, `Shift` → `Mayús`, `Space` → `Espacio`). Keep the voice
of the English: plain, short sentences, a little dry, old-fashioned where the people are.

## Glossary

Names of people stay as they are (Aldric, Nan Merrow, Maud, Wren, Marcian, Edric, Victoria,
Osric, Ambrose, Isolde Vane, Tam Pell…), with their titles translated (*Guardián Aldric*,
*Padre Odo*, *Sargento Pike*, *Abuelo Pell*, *Madre Dunn*, *reina Elowen*, *lady Isolde Vane*).
Town names stay (Millbrook, Kilnholt, Ashford, Thornhallow, Corvalis); the rest are in
`names.json`. Terms of the story:

| English | Español |
|---|---|
| the Hollow Night / the Hollow King | la Noche Hueca / el Rey Hueco |
| the Blackthorn (the creeping blight) / a black thorn | el Espino Negro / una espina negra |
| the Wardens / a Warden | los Guardianes / un Guardián |
| the Steward (Lady Isolde Vane) | la Senescal |
| the Crown of Dawn | la Corona del Alba |
| the Root Tower | la Torre de Raíz |
| Castle Corvane | el Castillo Corvane |
| Lake Ellory, "the Mirror" | el lago Ellory, "el Espejo" |
| the Lisle (the river) | el Lisle |
| Lord Potatoe Face | lord Cara de Papa |
| the Grey Moth | la Polilla Gris |
| the Unsent / the grey postman / the grey lantern | el No Enviado / el cartero gris / el farol gris |
| the Mourning Court / the Restless | la Corte del Luto / los Inquietos |
| the Keening Hollow | la Hondonada del Lamento |
| the Gallows Willow | el Sauce de la Horca |
| the Greyfang Hills / the Greyfang clans | las Colinas Colmillogrís / los clanes Colmillogrís |
| the Thane under the Hill | el Thane bajo la Colina |
| the outriders | los batidores |
| grave-mist | niebla de tumba |
| barrow / the barrows | túmulo / los túmulos |
| black lace | encaje negro |
| the dead | los muertos |
| a ring (of the Blackthorn) | un anillo |
| Prologue / Act I / ACT II COMPLETE | Prólogo / Acto I / ACTO II COMPLETADO |
| "We keep the fire, so others may sleep." | "Mantenemos el fuego para que otros puedan dormir." |
| the Ride (in the King's Chase) | la Senda |
| kiln / charcoal-burner | carbonera / carbonero |

Words of the game:

| English | Español |
|---|---|
| Inventory / bag | Inventario / bolsa |
| Spellbook / spell | Libro de hechizos / hechizo |
| Talents / talent point | Talentos / punto de talento |
| Crafting / craft / recipe | Fabricación / fabricar / receta |
| Quests / quest log / Journal (J) | Misiones / registro de misiones / Cuaderno (J) |
| Settings / Controls | Ajustes / Controles |
| Level / Lv / XP / experience | Nivel / Nv / XP / experiencia |
| gold | oro |
| Health / Mana | Salud / Maná |
| Attack / Armor / damage | Ataque / Armadura / daño |
| critical hit | golpe crítico |
| cooldown | recarga |
| stun / bleed / slow / root | aturdir / sangrar / ralentizar / inmovilizar |
| auto-attack | ataque automático |
| action bar / slot | barra de acción / casilla |
| target / to target | objetivo / fijar objetivo |
| gear / equip / unique | equipo / equipar / único |
| trader / buy / sell | comerciante / comprar / vender |
| Single Player / Multi Player | Un jugador / Multijugador |
| room (online) / host / join | sala / abrir / unirse |
| character | personaje |
| Accept / Not now / Goodbye. | Aceptar / Ahora no / Adiós. |
| click / right-click / Shift-click | haz clic / clic derecho / Mayús+clic |

Quotations inside text use straight double quotes, as in the English (the pixel fonts have
them for sure), and Spanish opens questions and exclamations: *¿…?*, *¡…!*.
