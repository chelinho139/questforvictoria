"""Tiny pixel-design helper: build rows by placing strings, preview with HD-style auto outline."""
from PIL import Image

class G:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [['.'] * w for _ in range(h)]
    def at(self, x, y, s):
        """Place string s at (x, y); ' ' and '.' in s are skipped (transparent over)."""
        for i, ch in enumerate(s):
            if ch in ' .':
                continue
            if 0 <= x + i < self.w and 0 <= y < self.h:
                self.g[y][x + i] = ch
        return self
    def rows(self):
        out = [''.join(r).rstrip('.') for r in self.g]
        return out
    def copy(self):
        n = G(self.w, self.h)
        n.g = [r[:] for r in self.g]
        return n

def hexrgb(h):
    n = int(h[1:], 16)
    return ((n >> 16) & 255, (n >> 8) & 255, n & 255)

def render(rows, pal, k=0.22, pad=1):
    w = max(len(r) for r in rows) + 2 * pad
    h = len(rows) + 2 * pad
    buf = [[None] * w for _ in range(h)]
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                if ch not in pal:
                    raise KeyError(f"letter {ch!r} not in palette (row {y})")
                buf[y + pad][x + pad] = hexrgb(pal[ch])
    src = [row[:] for row in buf]
    for y in range(h):
        for x in range(w):
            if src[y][x] is not None:
                continue
            n = None
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h and src[yy][xx] is not None:
                    n = src[yy][xx]
                    break
            if n:
                buf[y][x] = tuple(round(c * k) for c in n)
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            if buf[y][x]:
                img.putpixel((x, y), buf[y][x] + (255,))
    return img

def sheet(sprites, scale=6, bg=(168, 184, 172), gap=4):
    """sprites: list of PIL images; aligned at the bottom."""
    W = sum(s.width for s in sprites) + gap * (len(sprites) + 1)
    H = max(s.height for s in sprites) + 2 * gap
    out = Image.new('RGBA', (W, H), bg + (255,))
    x = gap
    for s in sprites:
        out.alpha_composite(s, (x, H - gap - s.height))
        x += s.width + gap
    return out.resize((W * scale, H * scale), Image.NEAREST)

def union_crop(grids):
    """Crop a list of same-size G grids to the union bounding box of their pixels."""
    xs, ys = [], []
    for g in grids:
        for y, row in enumerate(g.g):
            for x, ch in enumerate(row):
                if ch != '.':
                    xs.append(x); ys.append(y)
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    return [[''.join(row[x0:x1 + 1]) for row in g.g[y0:y1 + 1]] for g in grids], (x0, y0, x1, y1)
