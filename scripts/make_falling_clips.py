#!/usr/bin/env python3
"""Render branded 'falling candies' and 'falling lollipops' hero clips.

Procedurally draws glossy hard candies, wrapped sweets and swirl lollipops in
vibrant colours, raining down over the site's light hero gradient. The motion is
a MATHEMATICALLY SEAMLESS loop: every particle's fall, spin and sway completes a
whole number of cycles over the clip, so the last frame equals the first.

Outputs (1920x1080, 10s, 30fps, no audio, web-faststart):
    assets/videos/home-hero.mp4    falling candies
    assets/videos/home-hero-2.mp4  falling lollipops
"""
import math, random, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
VID = ROOT / "assets" / "videos"
FF = imageio_ffmpeg.get_ffmpeg_exe()

W, H = 1920, 1080
FPS, DUR = 30, 10
FRAMES = FPS * DUR
SS = 4                                   # sprite supersampling
MARGIN = 220
SPAN = H + 2 * MARGIN

# vibrant candy palette (confectionery)
PALETTE = [
    (237, 32, 60), (255, 122, 36), (255, 196, 28), (40, 180, 99),
    (0, 158, 226), (150, 70, 190), (255, 92, 160), (255, 70, 70),
    (90, 200, 120), (250, 160, 30),
]

def bg_gradient():
    """diagonal light gradient matching .hero-section."""
    c0 = np.array([234, 243, 255], float)   # #EAF3FF
    c1 = np.array([250, 252, 255], float)   # #FAFCFF
    yy, xx = np.mgrid[0:H, 0:W]
    t = ((xx / W) * 0.55 + (yy / H) * 0.45)
    img = c0[None, None, :] * (1 - t[..., None]) + c1[None, None, :] * t[..., None]
    return Image.fromarray(img.astype("uint8"), "RGB").convert("RGBA")

def _shadow(size):
    """soft drop shadow layer for a sprite of given supersampled size."""
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(sh)
    pad = size * 0.16
    d.ellipse([pad, pad, size - pad, size - pad], fill=(20, 40, 70, 70))
    return sh.filter(ImageFilter.GaussianBlur(size * 0.05))

def _gloss(draw, cx, cy, r):
    """specular highlight: soft white ellipse upper-left + bright dot."""
    draw.ellipse([cx - r * 0.55, cy - r * 0.62, cx - r * 0.02, cy - r * 0.05],
                 fill=(255, 255, 255, 90))
    draw.ellipse([cx - r * 0.45, cy - r * 0.5, cx - r * 0.22, cy - r * 0.27],
                 fill=(255, 255, 255, 170))

def sprite_round(color, S):
    s = S * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    img.alpha_composite(_shadow(s))
    d = ImageDraw.Draw(img)
    cx = cy = s / 2
    r = s * 0.40
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (255,))
    # darker rim for body
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=tuple(int(c * 0.75) for c in color) + (255,), width=int(s * 0.012))
    _gloss(d, cx, cy, r)
    return img.resize((S, S), Image.LANCZOS)

def sprite_wrapped(color, S):
    s = S * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    img.alpha_composite(_shadow(s))
    d = ImageDraw.Draw(img)
    cx = cy = s / 2
    bw, bh = s * 0.34, s * 0.26          # body half-extents
    dark = tuple(int(c * 0.7) for c in color)
    # twisted wrapper ends (triangles)
    for sgn in (-1, 1):
        ex = cx + sgn * bw
        d.polygon([(ex, cy), (ex + sgn * s * 0.16, cy - s * 0.14),
                   (ex + sgn * s * 0.16, cy + s * 0.14)], fill=dark + (255,))
        d.polygon([(ex, cy), (ex + sgn * s * 0.16, cy - s * 0.05),
                   (ex + sgn * s * 0.16, cy + s * 0.05)], fill=color + (255,))
    d.ellipse([cx - bw, cy - bh, cx + bw, cy + bh], fill=color + (255,))
    d.ellipse([cx - bw, cy - bh, cx + bw, cy + bh], outline=dark + (255,), width=int(s * 0.012))
    _gloss(d, cx - bw * 0.1, cy, bh)
    return img.resize((S, S), Image.LANCZOS)

def sprite_lollipop(color, S):
    s = S * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    img.alpha_composite(_shadow(s))
    d = ImageDraw.Draw(img)
    cx = s / 2
    hr = s * 0.30                         # head radius
    cy = s * 0.36
    # stick
    sw = s * 0.045
    d.rounded_rectangle([cx - sw, cy, cx + sw, s * 0.94], radius=sw, fill=(245, 240, 230, 255))
    d.line([cx, cy, cx, s * 0.9], fill=(210, 200, 185, 120), width=int(s * 0.01))
    # head
    d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=color + (255,))
    # white swirl (archimedean spiral)
    pts = []
    turns = 3.0
    steps = 240
    for i in range(steps + 1):
        th = (i / steps) * turns * 2 * math.pi
        rr = (hr * 0.92) * (i / steps)
        pts.append((cx + rr * math.cos(th), cy + rr * math.sin(th)))
    d.line(pts, fill=(255, 255, 255, 235), width=int(s * 0.055), joint="curve")
    d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr],
              outline=tuple(int(c * 0.72) for c in color) + (255,), width=int(s * 0.014))
    _gloss(d, cx, cy, hr)
    return img.resize((S, S), Image.LANCZOS)

def build_particles(kinds, n, smin, smax, rng):
    parts = []
    for _ in range(n):
        S = rng.randint(smin, smax)
        kind = rng.choice(kinds)
        color = rng.choice(PALETTE)
        spr = kind(color, S)
        parts.append({
            "spr": spr,
            "x0": rng.uniform(-60, W + 60),
            "y0": rng.uniform(0, SPAN),
            "k": rng.choice([1, 1, 2, 2, 3]),            # fall cycles per loop
            "ang0": rng.uniform(0, 360),
            "m": rng.choice([-2, -1, 1, 1, 2]),          # spin cycles per loop
            "swayA": rng.uniform(12, 46),
            "p": rng.choice([1, 2]),                      # sway cycles per loop
            "phase": rng.uniform(0, 2 * math.pi),
            "S": S,
        })
    # draw larger (nearer) particles last
    parts.sort(key=lambda p: p["S"])
    return parts

def render(path, kinds, n, smin, smax, seed):
    rng = random.Random(seed)
    bg = bg_gradient()
    parts = build_particles(kinds, n, smin, smax, rng)
    cmd = [FF, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-pix_fmt",
           "yuv420p", "-crf", "21", "-preset", "medium", "-movflags",
           "+faststart", str(path)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL)
    for f in range(FRAMES):
        frame = bg.copy()
        for p in parts:
            y = (p["y0"] + f * (p["k"] * SPAN / FRAMES)) % SPAN - MARGIN
            x = p["x0"] + p["swayA"] * math.sin(2 * math.pi * p["p"] * f / FRAMES + p["phase"])
            ang = p["ang0"] + f * (p["m"] * 360.0 / FRAMES)
            rot = p["spr"].rotate(ang, resample=Image.BICUBIC, expand=True)
            frame.alpha_composite(rot, (int(x - rot.width / 2), int(y - rot.height / 2)))
        proc.stdin.write(frame.convert("RGB").tobytes())
    proc.stdin.close()
    proc.wait()
    print(f"  wrote {path.name}  ({path.stat().st_size/1_000_000:.1f} MB)")

def main():
    VID.mkdir(parents=True, exist_ok=True)
    print("Rendering falling candies ...")
    render(VID / "home-hero.mp4", [sprite_round, sprite_wrapped], 32, 78, 150, 7)
    print("Rendering falling lollipops ...")
    render(VID / "home-hero-2.mp4", [sprite_lollipop], 20, 150, 240, 19)
    print("done")

if __name__ == "__main__":
    main()
