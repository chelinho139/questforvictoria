"""Looks at music for cutting a trailer to it: loudness over time, how bright it is, the beat.

    python analyze_music.py out/music/*.mp3 [--png out/check/music.png]

Prints, per track: length, an estimated tempo and first downbeat, and the loudness in 2-second
steps (so the builds, drops and quiet parts show); draws every track's loudness and onsets as
strips in one image.
"""
import subprocess
import sys
import os
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
FFMPEG = os.path.join(HERE, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe' if os.name == 'nt' else 'ffmpeg')
SR = 22050


def decode(path):
    raw = subprocess.run([FFMPEG, '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def frames(x, n=1024, hop=512):
    m = 1 + (len(x) - n) // hop
    idx = np.arange(n)[None, :] + hop * np.arange(m)[:, None]
    return x[idx] * np.hanning(n)[None, :]


def analyze(path):
    x = decode(path)
    f = frames(x)
    spec = np.abs(np.fft.rfft(f, axis=1))
    hop_s = 512 / SR
    rms = np.sqrt((f ** 2).mean(axis=1) + 1e-12)
    db = 20 * np.log10(rms + 1e-9)
    freqs = np.fft.rfftfreq(1024, 1 / SR)
    cent = (spec * freqs[None, :]).sum(axis=1) / (spec.sum(axis=1) + 1e-9)
    # onset strength: positive spectral flux on a log spectrum
    ls = np.log1p(spec * 10)
    flux = np.maximum(0, np.diff(ls, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    flux = flux - np.convolve(flux, np.ones(16) / 16, mode='same')
    flux = np.maximum(flux, 0)
    # tempo from the onset autocorrelation, 60..180 bpm
    o = flux - flux.mean()
    ac = np.correlate(o, o, mode='full')[len(o) - 1:]
    lags = np.arange(len(ac)) * hop_s
    ok = (lags >= 60 / 180) & (lags <= 60 / 60)
    lag = lags[ok][np.argmax(ac[ok])]
    bpm = 60 / lag
    # beat phase: the offset whose comb lines up with the most onset strength
    period = lag / hop_s
    best, best_v = 0, -1
    for ph in np.linspace(0, period, 64, endpoint=False):
        idx = (ph + period * np.arange(int((len(flux) - ph) / period))).astype(int)
        v = flux[idx].sum()
        if v > best_v:
            best, best_v = ph, v
    return dict(path=path, dur=len(x) / SR, db=db, cent=cent, flux=flux, hop=hop_s, bpm=bpm, beat0=best * hop_s)


def summary(a, step=2.0):
    k = int(step / a['hop'])
    db = a['db']
    vals = [db[i:i + k].mean() for i in range(0, len(db), k)]
    cent = [a['cent'][i:i + k].mean() for i in range(0, len(db), k)]
    peak = max(vals)
    bars = ''.join(' .:-=+*#%@'[max(0, min(9, int((v - peak + 30) / 3)))] for v in vals)
    bright = ''.join(' .:-=+*#%@'[max(0, min(9, int(c / 400)))] for c in cent)
    return bars, bright


def draw(results, out):
    W = 1600
    row = 70
    img = Image.new('RGB', (W, row * len(results) + 10), (16, 18, 24))
    d = ImageDraw.Draw(img)
    maxdur = max(a['dur'] for a in results)
    for j, a in enumerate(results):
        y0 = j * row + 5
        db = a['db']
        n = len(db)
        xs = (np.arange(n) * a['hop'] / maxdur * (W - 160) + 150).astype(int)
        top = db.max()
        for i in range(0, n, 4):
            h = max(0, min(1, (db[i] - top + 40) / 40)) * (row - 18)
            d.line([(xs[i], y0 + row - 10), (xs[i], y0 + row - 10 - h)], fill=(90, 140, 220))
        fl = a['flux'] / (a['flux'].max() + 1e-9)
        for i in range(0, n):
            if fl[i] > 0.35:
                d.line([(xs[i], y0 + 2), (xs[i], y0 + 2 + fl[i] * 10)], fill=(240, 190, 80))
        for s in range(0, int(a['dur']), 10):
            x = int(s / maxdur * (W - 160) + 150)
            d.line([(x, y0 + row - 9), (x, y0 + row - 5)], fill=(200, 200, 200))
            if s % 30 == 0:
                d.text((x + 2, y0 + row - 14), f'{s}', fill=(160, 160, 160))
        d.text((5, y0 + 20), os.path.basename(a['path'])[:-4], fill=(230, 230, 230))
        d.text((5, y0 + 34), f"{a['bpm']:.0f} bpm", fill=(160, 160, 160))
    img.save(out)


def main():
    args = sys.argv[1:]
    png = None
    if '--png' in args:
        i = args.index('--png')
        png = args[i + 1]
        del args[i:i + 2]
    res = []
    for p in args:
        a = analyze(p)
        res.append(a)
        bars, bright = summary(a)
        print(f"{os.path.basename(p):18s} {a['dur']:6.1f}s  ~{a['bpm']:.1f} bpm  first beat {a['beat0']:.2f}s")
        print('   loud  ' + bars)
        print('   brite ' + bright)
    if png:
        draw(res, png)


if __name__ == '__main__':
    main()
