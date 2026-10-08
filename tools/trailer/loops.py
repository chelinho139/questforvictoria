"""Find seamless places to repeat bars of a track (to make a section longer):
    python loops.py track.mp3 from to [beats ...]
Fits the beat grid exactly (tempo and phase over the whole track), takes the harmony (chroma) and
loudness of every beat, and scores each jump back by `beats` that lands in [from, to] by how alike
the music is on both sides of the seam (8 beats before and after). Best seams first.
"""
import sys, numpy as np, subprocess, os
HERE = os.path.dirname(os.path.abspath(__file__))
FF = os.path.join(HERE, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe' if os.name == 'nt' else 'ffmpeg')
SR = 22050
p, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
lens = [int(x) for x in sys.argv[4:]] or [16, 24, 32]
x = np.frombuffer(subprocess.run([FF, '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32)
N, H = 2048, 256
m = 1 + (len(x) - N) // H
idx = np.arange(N)[None, :] + H * np.arange(m)[:, None]
S = np.abs(np.fft.rfft(x[idx] * np.hanning(N)[None, :], axis=1))
hop = H / SR
L = np.log1p(S * 10)
flux = np.maximum(0, np.diff(L, axis=0)).sum(1)
flux = np.concatenate([[0], flux])
flux -= np.convolve(flux, np.ones(32) / 32, 'same')
flux = np.maximum(flux, 0)
# exact tempo and phase: the beat grid with the most onset energy under it
best = (0, 0, 0)
for bpm in np.arange(108, 117, 0.005):
    per = 60 / bpm / hop
    for ph in np.linspace(0, per, 24, endpoint=False):
        k = (ph + per * np.arange(int((m - ph) / per))).astype(int)
        v = flux[k].sum()
        if v > best[0]:
            best = (v, bpm, ph * hop)
_, bpm, t0 = best
# refine the phase finely
per = 60 / bpm
bestp = (0, t0)
for ph in np.arange(t0 - 0.05, t0 + 0.05, 0.002):
    k = ((ph + per * np.arange(int((len(x) / SR - ph) / per))) / hop).astype(int)
    k = k[(k >= 0) & (k < m)]
    v = flux[k].sum()
    if v > bestp[0]:
        bestp = (v, ph)
t0 = bestp[1] % per
print(f'tempo {bpm:.3f} bpm, beat {per:.5f} s, first beat {t0:.4f} s')
# chroma per beat
freqs = np.fft.rfftfreq(N, 1 / SR)
ok = (freqs > 60) & (freqs < 4000)
pc = (np.round(12 * np.log2(freqs[ok] / 440)) % 12).astype(int)
C = np.zeros((m, 12))
for c in range(12):
    C[:, c] = S[:, ok][:, pc == c].sum(1)
rms = np.sqrt((x[idx] ** 2).mean(1))
nb = int((len(x) / SR - t0) / per)
beats = t0 + per * np.arange(nb)
bc = np.zeros((nb, 12)); br = np.zeros(nb)
for i in range(nb - 1):
    s, e = int(beats[i] / hop), int(beats[i + 1] / hop)
    bc[i] = C[s:e].mean(0); br[i] = 20 * np.log10(rms[s:e].mean() + 1e-9)
bc /= np.linalg.norm(bc, axis=1, keepdims=True) + 1e-9
out = []
for Lb in lens:
    for j in range(nb):
        if not (a <= beats[j] <= b): continue
        i = j - Lb  # the seam: play to beat j, then jump back to beat i (and play on from there)
        if i < 8 or j + 8 >= nb: continue
        ctx = range(-8, 8)
        sim = np.mean([bc[i + k] @ bc[j + k] for k in ctx])
        loud = np.mean([abs(br[i + k] - br[j + k]) for k in ctx])
        out.append((sim - loud / 20, sim, loud, Lb, beats[j], beats[i], j % 4))
out.sort(reverse=True)
for s, sim, loud, Lb, tj, ti, bar in out[:12]:
    print(f'  play to {tj:7.3f}s, jump back to {ti:7.3f}s ({Lb} beats, {Lb*per:6.3f}s longer)  harmony {sim:.3f}  loudness diff {loud:4.1f} dB  beat-in-bar {bar}')
