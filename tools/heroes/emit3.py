"""Emit hdHeroes.ts with equipment: per hero the bare frames of every animation (skin, linen
shorts, own hair), plus one pixel layer per item for every frame. The game stacks
the equipped layers on the bare frame; backflip frames are the tuck pose turned 90° at a time."""
import json, os, random, sys
from cast2 import HEROES, GEAR_PAL, ALL_ITEMS, ITEMS_BY_SLOT, SLOT_OF, APPLY_ORDER, QUIVERS, compose, poses, MX, MY

LABELS = {
    'k1': ('K1 · Knight', 'tall and broad-shouldered, with auburn hair'),
    'k2': ('K2 · Squire', 'cute: a big blond head, slim body and short legs'),
    'k3': ('K3 · Silver knight', 'tall and slim, with long silver hair'),
    'hood': ('H1 · Sprout', 'a big round head with chestnut hair on a tiny body'),
    'wanderer': ('H2 · Wanderer', 'tall and slim, dark hair, a faceless profile'),
    'traveller': ('H3 · Traveller', 'ginger hair, seen in profile'),
    'cute': ('H4 · Cute', 'a big dark-haired head with dot eyes'),
    'masked': ('H5 · Masked', 'a pale floating spirit wearing a mask; its weapons hover beside it'),
}
GROUPS = ['walk', 'idle', 'attack', 'jump', 'shoot']
LAYER_IDS = ALL_ITEMS


def layer_for(hero, item, p, base):
    """{(x, y): letter or '-' (erase)} and whether it goes under what is already drawn."""
    slot = SLOT_OF[item]
    if slot in ('weapon', 'offhand', 'trinket'):
        g = compose(hero, {slot: item}, only=slot, **p)
        px = {(x, y): g.g[y][x] for y in range(g.h) for x in range(g.w) if g.t[y][x] == slot}
        # a weapon wound up behind the head, and a quiver on the back, only fill empty pixels
        return px, (slot == 'weapon' and p.get('weapon') == 'back') or item in QUIVERS
    g = compose(hero, {slot: item}, **p)
    px = {}
    for y in range(g.h):
        for x in range(g.w):
            a, b = base.g[y][x], g.g[y][x]
            if a != b:
                px[(x, y)] = b if b != '.' else '-'
    return px, False


def apply(grid, layers):
    g = [row[:] for row in grid]
    for px, under in layers:
        for (x, y), ch in px.items():
            if under and g[y][x] != '.':
                continue
            g[y][x] = '.' if ch == '-' else ch
    return g


def stack(base, lay, gear):
    """The game's stacking order (gear: slot -> item)."""
    return apply(base, [lay[gear[s]] for s in APPLY_ORDER if gear.get(s)])


def frames_of(hero):
    P = poses(hero)
    out = {}
    for grp, plist in P.items():
        out[grp] = []
        for p in plist:
            base = compose(hero, {}, **p)
            lay = {it: layer_for(hero, it, p, base) for it in LAYER_IDS}
            out[grp].append((base.g, lay, p))
    return out


def bbox(cells):
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    return min(xs), min(ys), max(xs), max(ys)


def cells(grid):
    return {(x, y) for y, r in enumerate(grid) for x, c in enumerate(r) if c != '.'}


def validate(hero, F, n=60):
    """Random kits: stacking layers must match drawing the kit directly (pixel mismatches)."""
    rnd = random.Random(7)
    worst = total = 0
    for _ in range(n):
        gear = {s: rnd.choice(its + [None]) for s, its in ITEMS_BY_SLOT.items()}
        gear = {k: v for k, v in gear.items() if v}
        for grp, fr in F.items():
            for base, lay, p in fr:
                want = compose(hero, gear, **p).g
                got = stack(base, lay, gear)
                bad = sum(1 for y in range(len(want)) for x in range(len(want[0])) if want[y][x] != got[y][x])
                worst = max(worst, bad)
                total += bad
    return worst, total


def rot_ccw(grid):
    h, w = len(grid), len(grid[0])
    return [[grid[y][w - 1 - x] for y in range(h)] for x in range(w)]


def crop(grid, x0, y0, x1, y1):
    return [row[x0:x1 + 1] for row in grid[y0:y1 + 1]]


def layer_grid(px, H, W):
    g = [['.'] * W for _ in range(H)]
    for (x, y), ch in px.items():
        g[y][x] = ch
    return g


def enc_layer(grid, under):
    c = cells(grid)
    if not c:
        return 0
    x0, y0, x1, y1 = bbox(c)
    rows = ['' .join(r[x0:x1 + 1]).rstrip('.') for r in grid[y0:y1 + 1]]
    out = [x0, y0, '|'.join(rows)]
    if under:
        out.append(1)
    return out


heroes_out = []
for hid, hero in HEROES.items():
    F = frames_of(hero)
    if '--check' in sys.argv:
        print(hid, 'validate (worst px in a frame, total):', validate(hero, F))
    # shared canvas: every variant of every walk/idle/attack/jump frame
    allc = set()
    for grp in GROUPS:
        for base, lay, _ in F[grp]:
            allc |= cells(base)
            for px, _ in lay.values():
                allc |= {k for k, v in px.items() if v != '-'}
    x0, y0, x1, y1 = bbox(allc)
    # centre on the standing bare hero; no gear may reach below the feet
    bx0, _, bx1, _ = bbox(cells(F['idle'][0][0]))
    bottom = max(bbox(cells(b))[3] for grp in GROUPS for b, _, _ in F[grp])
    assert y1 == bottom, (hid, 'gear reaches below the feet', y1, bottom)
    cx = (bx0 + bx1) / 2
    half = max(cx - x0, x1 - cx)
    x0, x1 = int(cx - half), int(round(cx + half))
    W, H = x1 - x0 + 1, y1 - y0 + 1
    frames = {}
    layers = {it: {} for it in LAYER_IDS}
    for grp in GROUPS:
        frames[grp] = []
        for it in LAYER_IDS:
            layers[it][grp] = []
        for base, lay, _ in F[grp]:
            frames[grp].append([''.join(r).rstrip('.') for r in crop(base, x0, y0, x1, y1)])
            for it in LAYER_IDS:
                px, under = lay[it]
                layers[it][grp].append(enc_layer(crop(layer_grid(px, 64, 64), x0, y0, x1, y1), under))
    # backflip: the tuck, cropped to all its variants, turned in 90° steps
    tb, tl, _ = F['tuck'][0]
    tc = cells(tb)
    for px, _ in tl.values():
        tc |= {k for k, v in px.items() if v != '-'}
    tx0, ty0, tx1, ty1 = bbox(tc)
    g = crop(tb, tx0, ty0, tx1, ty1)
    lg = {it: crop(layer_grid(tl[it][0], 64, 64), tx0, ty0, tx1, ty1) for it in LAYER_IDS}
    frames['flip'], flip_size = [], []
    for it in LAYER_IDS:
        layers[it]['flip'] = []
    for k in range(4):
        frames['flip'].append([''.join(r).rstrip('.') for r in g])
        flip_size.append([len(g[0]), len(g)])
        for it in LAYER_IDS:
            layers[it]['flip'].append(enc_layer(lg[it], tl[it][1]))
        g = rot_ccw(g)
        lg = {it: rot_ccw(v) for it, v in lg.items()}
    rider_rows = hero.waist + MY - y0 + 2
    px_, py_, pw, ph = hero.portrait
    portrait = (px_ + MX - x0 + 1, py_ + MY - y0 + 1, pw, ph)
    heroes_out.append(dict(id=hid, W=W, H=H, frames=frames, layers=layers, flip=flip_size, rider=rider_rows, portrait=portrait))
    print(hid, 'canvas', W, 'x', H, '(was centred at', cx, ')')

# ------------------------------------------------------------ write TypeScript
def js(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))

L = ["""import { PixelCanvas } from './pixelPainter';
import type { RiderFit, Crop } from './styleArt';
import { ITEMS } from '../../data/items';
import type { ItemId, Slot } from '../../data/items';

/**
 * The HD heroes: three knights and five heroes modelled on approved board looks. Each has
 * a 4-frame idle, a walk (6 frames; the floating Masked hero bobs in 4), a 4-frame attack
 * (wind-up, overhead, strike, follow-through), a 4-frame shot for archers (nock, draw,
 * loose, lower; feet planted), 3 jump frames (rise, tuck, fall) and a 4-frame backflip
 * (the tuck pose turned in 90° steps).
 *
 * Equipment shows on the hero: every frame is stored bare (skin, linen shorts, bare feet,
 * the hero's own hair), with one pixel layer per item for that frame: caps and helms
 * fitted to each head, armour and trousers re-shading the chest, shorts, sleeves and legs,
 * boots, shields, the amulet and each weapon in every pose. Layers stack in a fixed order;
 * a weapon wound up behind the head only fills empty pixels. Generated by tools/heroes
 * (cast2.py / emit3.py).
 */
""",
"export type HdHeroId = " + " | ".join(json.dumps(h['id']) for h in heroes_out) + ";\n",
"""/** Animation groups beyond the walk. Every group but flip shares the walk's canvas size. */
export type HeroAnim = 'idle' | 'attack' | 'shoot' | 'jump' | 'flip';
export const HERO_ANIMS: HeroAnim[] = ['idle', 'attack', 'shoot', 'jump', 'flip'];
type Group = 'walk' | HeroAnim;

/** A layer for one frame: top-left, rows joined by '|' ('.' leaves a pixel, '-' clears it), and 1 if it only fills empty pixels. */
type Layer = 0 | [number, number, string] | [number, number, string, 1];
type LayerId = ItemId;
/** What the hero wears (items without art, such as food, have no layer). */
export type Gear = Partial<Record<Slot, ItemId | null>>;

interface HeroData {
  label: string;
  about: string;
  pal: Record<string, string>;
  /** Canvas of walk, idle, attack and jump frames. */
  size: [number, number];
  /** Canvas of each backflip frame. */
  flipSize: [number, number][];
  frames: Record<Group, string[][]>;
  layers: Partial<Record<LayerId, Record<Group, Layer[]>>>;
  rider: RiderFit;
  portrait: Crop;
}

/** Colours of every gear letter (no hero palette uses them). */
""",
"export const GEAR_PAL: Record<string, string> = " + js(GEAR_PAL) + ";\n",
"/** The order layers stack in: later slots cover earlier ones. */",
"const STACK: Slot[] = " + js(APPLY_ORDER) + ";\n",
"export const HD_HEROES: Record<HdHeroId, HeroData> = {"]
for h in heroes_out:
    label, about = LABELS[h['id']]
    hero = HEROES[h['id']]
    L.append(f"  {h['id']}: {{")
    L.append(f"    label: {js(label)},")
    L.append(f"    about: {js(about)},")
    L.append(f"    pal: {js(hero.pal)},")
    L.append(f"    size: [{h['W']}, {h['H']}],")
    L.append(f"    flipSize: {js(h['flip'])},")
    L.append("    frames: {")
    for grp in GROUPS + ['flip']:
        L.append(f"      {grp}: [")
        for fr in h['frames'][grp]:
            L.append("        " + js(fr) + ",")
        L.append("      ],")
    L.append("    },")
    L.append("    layers: {")
    for it in LAYER_IDS:
        L.append(f"      {it}: {{")
        for grp in GROUPS + ['flip']:
            L.append(f"        {grp}: {js(h['layers'][it][grp])},")
        L.append("      },")
    L.append("    },")
    L.append(f"    rider: {{ rows: {h['rider']}, below: 13, dx: 0 }},")
    px_, py_, pw, ph = h['portrait']
    L.append(f"    portrait: {{ x: {px_}, y: {py_}, w: {pw}, h: {ph} }},")
    L.append("  },")
L.append("};")
L.append("""
export interface HeroCanvases {
  walk: HTMLCanvasElement[];
  anims: Record<HeroAnim, HTMLCanvasElement[]>;
}

/**
 * Paint every frame of a hero with the HD outline, wearing `gear`: each equipped item's
 * layer is stacked on the bare hero. Walk, idle, attack and jump share one canvas size.
 */
export function hdHeroFrames(id: HdHeroId, gear: Gear = {}): HeroCanvases {
  const h = HD_HEROES[id];
  const pal = { ...GEAR_PAL, ...h.pal };
  // unique gear is drawn like the common piece it is based on (ItemDef.looks)
  const ids: LayerId[] = STACK.map(s => gear[s]).filter((v): v is ItemId => !!v).map(i => ITEMS[i].looks ?? i);
  const stacks = ids.map(i => h.layers[i]).filter(l => !!l);
  const paint = (g: Group, i: number, [w, rows]: [number, number]) => {
    const grid = h.frames[g][i].map(r => [...r.padEnd(w, '.')]);
    for (let y = grid.length; y < rows; y++) grid.push(new Array<string>(w).fill('.'));
    for (const st of stacks) {
      const l = st[g][i];
      if (!l) continue;
      const [lx, ly, body, under] = l;
      body.split('|').forEach((r, dy) => {
        const row = grid[ly + dy];
        for (let dx = 0; dx < r.length; dx++) {
          const ch = r[dx];
          if (ch === '.' || (under && row[lx + dx] !== '.')) continue;
          row[lx + dx] = ch === '-' ? '.' : ch;
        }
      });
    }
    const p = new PixelCanvas(w, rows);
    grid.forEach((r, y) => r.forEach((ch, x) => ch !== '.' && p.px(x, y, pal[ch])));
    return p.outline('auto', 0.22).toCanvas();
  };
  const group = (g: Group) => h.frames[g].map((_, i) => paint(g, i, g === 'flip' ? h.flipSize[i] : h.size));
  return {
    walk: group('walk'),
    anims: { idle: group('idle'), attack: group('attack'), shoot: group('shoot'), jump: group('jump'), flip: group('flip') },
  };
}
""")
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../src/phaser/render/hdHeroes.ts')
open(out, 'w').write('\n'.join(L))
import os
print('wrote', os.path.getsize(out) // 1024, 'KB')
