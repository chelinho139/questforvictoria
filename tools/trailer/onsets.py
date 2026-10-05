"""Strong onsets in a track window: python onsets.py track.mp3 start end [n]."""
import sys, numpy as np
sys.path.insert(0, '.')
from analyze_music import analyze
p, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
n = int(sys.argv[4]) if len(sys.argv) > 4 else 12
r = analyze(p)
hop = r['hop']; fl = r['flux']; db = r['db']
i0, i1 = int(a / hop), int(b / hop)
seg = fl[i0:i1]
# local maxima above a fraction of the window's max
peaks = [i for i in range(1, len(seg) - 1) if seg[i] >= seg[i-1] and seg[i] >= seg[i+1] and seg[i] > 0.25 * seg.max()]
peaks.sort(key=lambda i: -seg[i])
top = sorted(peaks[:n])
print(f"{p} {a}-{b}s: bpm~{r['bpm']:.2f}")
for i in top:
    t = (i0 + i) * hop
    print(f"  {t:7.2f}s  strength {seg[i]/seg.max():.2f}  level {db[i0+i]-db.max():6.1f}dB")
