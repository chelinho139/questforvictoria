"""How well two places in a track join (play to beat i, go on from beat j): python seam.py track.mp3 i:j [i:j ...]
Harmony (chroma, 8 beats either side) and loudness difference, on the beat grid loops.py fits (114.02 bpm, first beat 0)."""
import sys, subprocess, os, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
FF = os.path.join(HERE, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')
SR, N, H = 22050, 2048, 256
x = np.frombuffer(subprocess.run([FF, '-v', 'error', '-i', sys.argv[1], '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32)
m = 1 + (len(x) - N) // H
idx = np.arange(N)[None, :] + H * np.arange(m)[:, None]
S = np.abs(np.fft.rfft(x[idx] * np.hanning(N)[None, :], axis=1))
hop, per = H / SR, 60 / 114.02
f = np.fft.rfftfreq(N, 1 / SR); ok = (f > 60) & (f < 4000)
pc = (np.round(12 * np.log2(f[ok] / 440)) % 12).astype(int)
C = np.stack([S[:, ok][:, pc == c].sum(1) for c in range(12)], 1)
rms = np.sqrt((x[idx] ** 2).mean(1))
def beat(k):
    s, e = int(k * per / hop), int((k + 1) * per / hop)
    c = C[s:e].mean(0); return c / (np.linalg.norm(c) + 1e-9), 20 * np.log10(rms[s:e].mean() + 1e-9)
for p in sys.argv[2:]:
    i, j = map(int, p.split(':'))
    sims, louds = [], []
    for k in range(-8, 8):
        (a, la), (b, lb) = beat(i + k), beat(j + k)
        sims.append(a @ b); louds.append(abs(la - lb))
    print(f'  {i}:{j}  ({i*per:7.2f}s -> {j*per:7.2f}s, skips {(j-i)*per:5.2f}s)  harmony {np.mean(sims):.3f}  loudness diff {np.mean(louds):4.1f} dB')
