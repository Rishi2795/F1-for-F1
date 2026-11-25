# ruff: noqa: T201  (a command-line tool: printing is its output)
"""Find freely licensed driver photos on Wikimedia Commons, review them, and register the ones you approve.

Two steps, so a person always looks before anything ships:

    python scripts/commons_photos.py find     # search Commons, keep only clearly licensed photos, write a review sheet
    python scripts/commons_photos.py apply    # download the chosen photo per driver and write frontend/public/drivers/credits.json

`find` writes scripts/out/commons_candidates.json and scripts/out/commons_review.html (open it in a browser). Each driver
has a ranked list; to pick a different photo than the top one, set "choice" to its position in the JSON, or set
"skip": true for a driver you do not want a photo for. "focus" is the CSS object-position the card uses to crop (landscape
photos need the driver near the top-left of the frame, for example "30% 25%").

Rules, because every picture has to be both legal and credited:
- Only CC0, public domain, CC BY and CC BY-SA (versions 2.0 to 4.0) are accepted. Anything NonCommercial, NoDerivatives,
  "fair use", GFDL or with no stated licence is dropped.
- The file title must contain the driver's surname, so a search hit about someone else is never used.
- Each registered photo records its author, licence, licence link and Commons page; the site shows the credit.
- A resized copy is what we store (Commons produces the thumbnail), and the entry says so.

Needs `requests` (the pipeline's virtual environment has it). Uses a generic User-Agent and about one request a second.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import unicodedata
from datetime import UTC, datetime
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "scripts" / "out"
DRIVERS = ROOT / "backend" / "data" / "published" / "drivers" / "index.json"
PUBLIC = ROOT / "frontend" / "public" / "drivers"
API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "f1-data-pipeline/0.1 (photo licence check)"}
THUMB = 1000
ALLOWED = re.compile(r"^(CC0.*|Public domain|PDM.*|CC BY(-SA)? [234]\.\d( .*)?)$", re.I)
REJECT = re.compile(r"(NC|ND|fair use|non-free|GFDL|all rights|copyright)", re.I)
LICENCE_URL = {
    "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
    "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
    "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
    "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
    "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
    "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
    "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
}


def plain(text: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", text or ""))).strip()


def fold(text: str) -> str:
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()


# Titles that are about something other than the driver: cars, museum pieces, statues, helmets, karts, crashes.
NOT_A_DRIVER = re.compile(
    r"museum|bust|statue|display|replica|model|sculpture|wax|helm|kart|crash|collision|puppet|trophy|livery|chassis|golf|cart\b|truck|"
    r"\bcars?\b|\bof (the )?[A-Z]{1,4}[- ]?[A-Z]?\d{2}\b|\b(SF|RB|MCL|AMR|VF|W|C|FW|A|R|SL|MP4)[- ]?\d{1,2}[A-Z]?\b.* of ",
    re.I,
)
PERSON_SHOT = re.compile(r"portrait|paddock|press|parade|interview|conference|signing|meet", re.I)
CLOSE_UP_SERIES = re.compile(r"melbourne walk|fan zone|riverwalk|portrait", re.I)  # close shots of the person
ON_TRACK = re.compile(r"\b(FP\d|qualifying|sprint|practice|race|post[- ]race|podium|celebration)\b", re.I)  # usually the car, from far away


def licence_ok(short: str | None) -> bool:
    return bool(short) and bool(ALLOWED.match(short.strip())) and not REJECT.search(short)


def get(params: dict) -> requests.Response:
    """GET with patience: Wikimedia asks automated clients to slow down (429), so wait and try again."""
    for attempt in range(6):
        r = requests.get(API, headers=HEADERS, timeout=30, params=params)
        if r.status_code not in (429, 500, 502, 503, 504):
            r.raise_for_status()
            return r
        wait = float(r.headers.get("Retry-After", 0) or 0) or 10 * (attempt + 1)
        print(f"   (Commons says slow down; waiting {wait:.0f}s)")
        time.sleep(wait)
    r.raise_for_status()
    return r


def search(name: str, limit: int = 30) -> list[dict]:
    r = get(
        params={
            "action": "query", "format": "json", "generator": "search", "gsrsearch": f"{name} formula one",
            "gsrnamespace": 6, "gsrlimit": limit, "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata",
            "iiurlwidth": THUMB,
            "iiextmetadatafilter": "LicenseShortName|Artist|DateTimeOriginal|ImageDescription|Credit",
        },
    )
    pages = (r.json().get("query") or {}).get("pages") or {}
    return sorted(pages.values(), key=lambda p: p.get("index", 0))


def candidates_for(name: str, surname: str, this_year: int) -> list[dict]:
    out = []
    for p in search(name):
        info = (p.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata") or {}
        licence = (meta.get("LicenseShortName") or {}).get("value")
        title = p.get("title", "")
        if info.get("mime") not in ("image/jpeg", "image/png", "image/webp") or not licence_ok(licence):
            continue
        if fold(surname) not in fold(title) or NOT_A_DRIVER.search(title):  # about this driver, and about the person
            continue
        w, h = info.get("width", 0), info.get("height", 0)
        if w < 700 or h < 500:
            continue
        taken = plain((meta.get("DateTimeOriginal") or {}).get("value", ""))[:4]
        year = int(taken) if taken.isdigit() else None
        score = 0
        score += 25 if h >= w else 12 if h >= 0.75 * w else 0  # portrait-ish crops better on a portrait card
        score += 20 if year and year >= this_year - 3 else 8 if year and year >= this_year - 6 else 0
        score += 10 if w >= 1600 else 0
        score += 15 if PERSON_SHOT.search(title) else 0
        score += 25 if CLOSE_UP_SERIES.search(title) else 0
        score -= 15 if ON_TRACK.search(title) else 0
        score += 6 if re.search(r"cropped", title, re.I) else 0  # someone already framed it on the person
        lic = licence.strip()
        out.append({
            "title": title, "score": score, "licence": lic,
            "licence_url": next((u for k, u in LICENCE_URL.items() if lic.upper().startswith(k.upper())), None),
            "author": plain((meta.get("Artist") or {}).get("value", "")) or "Wikimedia Commons contributor",
            "date": plain((meta.get("DateTimeOriginal") or {}).get("value", ""))[:10] or None,
            "width": w, "height": h, "thumb": info.get("thumburl"), "page": info.get("descriptionurl"),
            "focus": "50% 22%" if h >= w else "35% 28%",
        })
    return sorted(out, key=lambda c: -c["score"])[:6]


def surname_of(entry: dict) -> str:
    parts = entry["name"].split()
    return parts[-1]


def cmd_find(since: int, only: list[str]) -> int:
    drivers = [d for d in json.loads(DRIVERS.read_text(encoding="utf-8")) if d["latest_season"] >= since]
    if only:
        drivers = [d for d in drivers if d["code"] in only]
    OUT.mkdir(parents=True, exist_ok=True)
    this_year = datetime.now(UTC).year
    cache = OUT / "commons_candidates.json"
    result: dict[str, dict] = json.loads(cache.read_text(encoding="utf-8")) if cache.exists() else {}
    for d in drivers:
        if d["code"] in result and result[d["code"]].get("candidates") is not None and not only:
            print(f"{d['code']:>4} {d['name']:<26} (already searched)")
            continue
        found = candidates_for(d["name"], surname_of(d), this_year)
        result[d["code"]] = {"name": d["name"], "team": d.get("team"), "choice": 0, "skip": False, "candidates": found}
        print(f"{d['code']:>4} {d['name']:<26} {len(found)} usable photo(s)" + (f", best: {found[0]['title']}" if found else ""))
        time.sleep(2.0)
        cache.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")  # resumable
    (OUT / "commons_candidates.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    rows = []
    for code, v in result.items():
        cards = "".join(
            f'<figure><img src="{html.escape(c["thumb"] or "")}" loading="lazy"><figcaption><b>#{i}</b> score {c["score"]}<br>'
            f'{html.escape(c["licence"])} · {html.escape(c["author"][:40])}<br>{c["width"]}×{c["height"]} · {html.escape(c["date"] or "?")}<br>'
            f'<a href="{html.escape(c["page"] or "")}">Commons page</a></figcaption></figure>'
            for i, c in enumerate(v["candidates"])
        ) or "<p>No clearly licensed photo found: the card will use the number design.</p>"
        rows.append(f"<section><h2>{code} · {html.escape(v['name'])} <small>{html.escape(v['team'] or '')}</small></h2><div class=row>{cards}</div></section>")
    (OUT / "commons_review.html").write_text(
        "<!doctype html><meta charset=utf-8><title>Commons photo review</title><style>body{font:14px system-ui;background:#111;color:#ddd;margin:24px}"
        "h2{margin:28px 0 8px}small{color:#888}.row{display:flex;gap:12px;overflow:auto}figure{margin:0;min-width:240px;max-width:240px}"
        "img{width:240px;height:300px;object-fit:cover;object-position:top;background:#222}figcaption{font-size:12px;color:#aaa;margin-top:4px}a{color:#7cf}</style>"
        f"<h1>Commons photo review</h1><p>Set \"choice\" or \"skip\" in commons_candidates.json, then run <code>apply</code>.</p>{''.join(rows)}",
        encoding="utf-8",
    )
    print(f"\nwrote {OUT / 'commons_candidates.json'}\nopen {OUT / 'commons_review.html'}")
    return 0


def cmd_apply() -> int:
    path = OUT / "commons_candidates.json"
    if not path.exists():
        print("run `find` first")
        return 1
    chosen = json.loads(path.read_text(encoding="utf-8"))
    PUBLIC.mkdir(parents=True, exist_ok=True)
    registry_path = PUBLIC / "credits.json"
    registry = json.loads(registry_path.read_text(encoding="utf-8")) if registry_path.exists() else {}
    photos: dict[str, dict] = {}
    for code, v in chosen.items():
        cands = v["candidates"]
        if v.get("skip") or not cands or not 0 <= v.get("choice", 0) < len(cands):
            continue
        c = cands[v.get("choice", 0)]
        if not licence_ok(c["licence"]) or not c.get("thumb"):
            continue
        ext = "png" if c["thumb"].lower().endswith(".png") else "jpg"
        file = f"{code}.{ext}"
        r = requests.get(c["thumb"], headers=HEADERS, timeout=60)
        r.raise_for_status()
        (PUBLIC / file).write_bytes(r.content)
        photos[code] = {
            "file": file, "credit": c["author"], "licence": c["licence"], "licenceUrl": c["licence_url"],
            "source": c["page"], "focus": c.get("focus", "50% 22%"), "note": "resized by Wikimedia Commons; cropped by the page",
        }
        print(f"{code}: {file}  ({c['licence']}, {c['author'][:30]})")
        time.sleep(1.0)
    registry["photos"] = photos
    registry_path.write_text(json.dumps(registry, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n{len(photos)} photo(s) registered in {registry_path}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("find")
    f.add_argument("--since", type=int, default=2025, help="drivers whose latest season is at least this (default 2025)")
    f.add_argument("--only", nargs="*", default=[], help="driver codes, to try a few")
    sub.add_parser("apply")
    args = ap.parse_args()
    return cmd_find(args.since, args.only) if args.cmd == "find" else cmd_apply()


if __name__ == "__main__":
    sys.exit(main())
