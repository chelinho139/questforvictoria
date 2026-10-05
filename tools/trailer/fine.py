import sys, numpy as np
sys.path.insert(0, '.')
from analyze_music import analyze
for p in sys.argv[1:]:
    a = analyze(p)
    hop = a['hop']; k = int(1.0 / hop)
    db = a['db']; fl = a['flux']
    top = db.max()
    print(p, f"{a['dur']:.1f}s bpm~{a['bpm']:.1f} beat0 {a['beat0']:.2f}")
    line = []
    for i in range(0, len(db), k):
        v = db[i:i+k].mean() - top
        f = fl[i:i+k].max() / (fl.max() + 1e-9)
        line.append(f"{i*hop:5.0f}s {v:6.1f}dB {'#'*int(max(0,(v+30))/1.5):20s} {'!' if f>0.5 else ''}")
    for j in range(0, len(line), 3):
        print('   '.join(line[j:j+3]))
