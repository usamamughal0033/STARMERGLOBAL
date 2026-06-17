#!/usr/bin/env python3
"""Fetch high-resolution, photoreal confectionery hero clips from the Pexels API
(free, commercial-use, no attribution required) and install them as the home
hero loop: home-hero.mp4, home-hero-2.mp4, home-hero-3.mp4.

Usage:
    PEXELS_API_KEY=xxxx python scripts/fetch_hero_videos.py            # auto-pick best 3
    PEXELS_API_KEY=xxxx python scripts/fetch_hero_videos.py --list     # just show candidates
    python scripts/fetch_hero_videos.py --key xxxx

Picks landscape Full-HD (>=1920x1080, capped at 2560 wide) clips, 5-20s long,
favouring candy / lollipop / production-line footage that suits a manufacturer.
Existing videos are backed up to assets/_video_backup/ before replacing.
"""
import json, os, sys, shutil, urllib.request, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VID = ROOT / "assets" / "videos"
BACKUP = ROOT / "assets" / "_video_backup"

# Curated searches, ordered by how well they fit a confectionery manufacturer.
QUERIES = [
    "colorful candy",
    "lollipop",
    "candy production",
    "chocolate factory",
    "gummy candy",
    "sweets close up",
    "candy factory machine",
]

MIN_W, MAX_W = 1920, 2560      # want Full-HD+, but not huge 4K files
MIN_DUR, MAX_DUR = 5, 20       # seconds
WANT = 3                        # number of clips to install

def key():
    if "--key" in sys.argv:
        return sys.argv[sys.argv.index("--key") + 1]
    k = os.environ.get("PEXELS_API_KEY")
    if not k:
        sys.exit("ERROR: set PEXELS_API_KEY env var or pass --key <key>")
    return k

def api(path, params, k):
    url = "https://api.pexels.com/videos/" + path + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": k,
                                               "User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def best_file(video):
    """choose the landscape file closest to Full-HD within our cap."""
    cands = []
    for f in video.get("video_files", []):
        w, h = f.get("width") or 0, f.get("height") or 0
        if not w or not h or w < h:            # landscape only
            continue
        if w < MIN_W or w > MAX_W:
            continue
        if (f.get("file_type") or "") != "video/mp4":
            continue
        cands.append((w, f))
    if not cands:
        return None
    # prefer the largest width within cap (sharper)
    cands.sort(key=lambda x: x[0], reverse=True)
    return cands[0][1]

def gather(k):
    seen, out = set(), []
    for q in QUERIES:
        try:
            data = api("search", {"query": q, "orientation": "landscape",
                                   "size": "medium", "per_page": 15}, k)
        except Exception as e:
            print(f"  ! search '{q}' failed: {e}")
            continue
        for v in data.get("videos", []):
            if v["id"] in seen:
                continue
            dur = v.get("duration") or 0
            if not (MIN_DUR <= dur <= MAX_DUR):
                continue
            f = best_file(v)
            if not f:
                continue
            seen.add(v["id"])
            out.append({"id": v["id"], "q": q, "dur": dur,
                        "w": f["width"], "h": f["height"],
                        "url": f["link"], "page": v.get("url", "")})
    return out

def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as fh:
        shutil.copyfileobj(r, fh)
    return dest.stat().st_size

def main():
    k = key()
    print("Searching Pexels for confectionery clips ...")
    cands = gather(k)
    if not cands:
        sys.exit("No matching clips found.")
    # diversity: take the best clip from distinct queries first
    cands.sort(key=lambda c: (c["w"], c["dur"]), reverse=True)
    picked, used_q = [], set()
    for c in cands:
        if c["q"] not in used_q:
            picked.append(c); used_q.add(c["q"])
        if len(picked) == WANT:
            break
    for c in cands:                     # top up if not enough distinct queries
        if len(picked) == WANT:
            break
        if c not in picked:
            picked.append(c)

    print(f"\nTop candidates ({len(cands)} found):")
    for c in cands[:12]:
        mark = "*" if c in picked else " "
        print(f"  {mark} {c['w']}x{c['h']} {c['dur']:>2}s  [{c['q']}]  {c['page']}")

    if "--list" in sys.argv:
        print("\n--list: nothing downloaded.")
        return

    VID.mkdir(parents=True, exist_ok=True)
    BACKUP.mkdir(parents=True, exist_ok=True)
    names = ["home-hero.mp4", "home-hero-2.mp4", "home-hero-3.mp4"]
    print("\nDownloading:")
    for name, c in zip(names, picked):
        dest = VID / name
        if dest.exists():
            shutil.copy2(dest, BACKUP / name)
        size = download(c["url"], dest)
        print(f"  {name}  <-  {c['w']}x{c['h']} {c['dur']}s  ({size/1_000_000:.1f} MB)")
    print(f"\nDone. Backups of old clips in {BACKUP}")
    print("Hero already loops home-hero.mp4; tell me if you want all 3 cycling.")

if __name__ == "__main__":
    main()
