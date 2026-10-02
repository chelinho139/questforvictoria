"""Write src/phaser/render/propArt.ts: every building and big prop, outlined, palette-indexed,
plus a night overlay with only the pixels that change when its windows are lit."""
import json, os
from buildings import BUILDINGS, ANIMS
from iso import outline, to_rows

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../src/phaser/render/propArt.ts')


def emit():
    L = ["""/**
 * Buildings and big props (data/props.ts), drawn in the Silhouette palette by tools/world
 * (iso.py, buildings.py) and written here by gen_props.py. Each is palette-indexed rows; the
 * image's left edge is its footprint's west corner - 1 and its bottom edge the south corner + 1.
 * `lit` holds only the pixels that change at night (windows lit from inside).
 */

export interface PropArt {
  pal: Record<string, string>;
  rows: string[];
  lit?: string[];
  /** Animation frames drawn over a building (the mill's wheel), same anchor. */
  frames?: string[][];
}

export const PROP_ART: Record<string, PropArt> = {"""]
    for name, make in BUILDINGS.items():
        day = outline(make(False).render())
        try:
            night = outline(make(True).render())
        except TypeError:
            night = None
        # trim empty rows above the art (the bottom is the anchor)
        top = day.getbbox()[1]
        day = day.crop((0, top, day.width, day.height))
        rows, pal = to_rows(day)
        lit = None
        if night is not None:
            night = night.crop((0, top, night.width, night.height))
            dp, npx = day.load(), night.load()
            diff = night.copy()
            dd = diff.load()
            changed = False
            for y in range(diff.height):
                for x in range(diff.width):
                    if npx[x, y] == dp[x, y]:
                        dd[x, y] = (0, 0, 0, 0)
                    else:
                        changed = True
            if changed:
                inv = {v: k for k, v in pal.items()}
                chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&*+-/:;<=>?@^_~|'
                lr = []
                for y in range(diff.height):
                    r = []
                    for x in range(diff.width):
                        p = dd[x, y]
                        if not p[3]:
                            r.append('.')
                            continue
                        hx = '#%02x%02x%02x' % p[:3]
                        if hx not in inv:
                            ch = next(c for c in chars if c not in pal)
                            pal[ch] = hx
                            inv[hx] = ch
                        r.append(inv[hx])
                    lr.append(''.join(r).rstrip('.'))
                lit = lr
        L.append(f"  {name}: {{\n    pal: {json.dumps(pal)},\n    rows: {json.dumps([r.rstrip('.') for r in rows])},")
        if lit:
            L.append(f"    lit: {json.dumps(lit)},")
        L.append("  },")
    for name, (n, make) in ANIMS.items():
        imgs = [outline(make(f).render()) for f in range(n)]
        top = min(i.getbbox()[1] for i in imgs)
        pal, inv, frames = {}, {}, []
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        for im in imgs:
            im = im.crop((0, top, im.width, im.height))
            px = im.load()
            rows = []
            for y in range(im.height):
                r = []
                for x in range(im.width):
                    p = px[x, y]
                    if not p[3]:
                        r.append('.')
                        continue
                    hx = '#%02x%02x%02x' % p[:3]
                    if hx not in inv:
                        ch = chars[len(pal)]
                        pal[ch] = hx
                        inv[hx] = ch
                    r.append(inv[hx])
                rows.append(''.join(r).rstrip('.'))
            frames.append(rows)
        L.append(f"  {name}: {{\n    pal: {json.dumps(pal)},\n    rows: {json.dumps(frames[0])},\n    frames: {json.dumps(frames)},\n  }},")
    L.append("};\n")
    open(OUT, 'w').write("\n".join(L))


if __name__ == '__main__':
    emit()
    print('wrote', OUT)
