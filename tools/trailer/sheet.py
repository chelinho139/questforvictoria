"""Contact sheet: python sheet.py out.png a.png b.png ... [--cols 2 --w 960] (labels each still with its name)."""
import sys, os
from PIL import Image, ImageDraw
args = sys.argv[1:]
def opt(n, d):
    if n in args:
        i = args.index(n); v = args[i + 1]; del args[i:i + 2]; return v
    return d
cols = int(opt('--cols', '2')); w = int(opt('--w', '960'))
out, files = args[0], args[1:]
ims = [Image.open(f).convert('RGB') for f in files]
h = int(ims[0].height * w / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), (0, 0, 0))
d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y))
    d.rectangle([x, y, x + 8 * len(os.path.basename(f)) + 8, y + 16], fill=(0, 0, 0))
    d.text((x + 4, y + 2), os.path.basename(f), fill=(255, 220, 120))
sheet.save(out)
