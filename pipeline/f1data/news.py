"""Motorsport headlines, collected from the publishers' own public RSS feeds.

We keep only what a feed is published to share: the headline, a short plain-text teaser, the date, the publisher and the
link back to the article. No full text and no pictures are copied, and every item on the site links out to the original.
Only https links on the publisher's own domain are accepted, and a feed that fails is skipped, never fatal.
"""

from __future__ import annotations

import html
import re
import xml.etree.ElementTree as ET  # noqa: S405  (the feed is size-capped and refused if it declares entities)
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse

import requests

from . import config
from .export import Publisher, dumps, write_if_changed
from .logging_setup import get_logger

log = get_logger("news")

# name -> (feed address, domains an article link may point to)
FEEDS: dict[str, tuple[str, tuple[str, ...]]] = {
    "BBC Sport": ("https://feeds.bbci.co.uk/sport/formula1/rss.xml", ("bbc.co.uk", "bbc.com")),
    "Autosport": ("https://www.autosport.com/rss/f1/news", ("autosport.com",)),
    "Motorsport.com": ("https://www.motorsport.com/rss/f1/news/", ("motorsport.com",)),
    "The Race": ("https://www.the-race.com/category/formula-1/feed/", ("the-race.com",)),
    "RaceFans": ("https://www.racefans.net/feed/", ("racefans.net",)),
}
MAX_BYTES = 2_000_000
PER_FEED = 25
KEEP = 80
MAX_AGE_DAYS = 21
TEASER = 200


def clean(text: str | None) -> str:
    """Plain text: tags and entities removed, white space collapsed."""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", text or ""))).strip()


def teaser(text: str | None) -> str | None:
    t = clean(text)
    if not t:
        return None
    return t if len(t) <= TEASER else t[: TEASER - 1].rsplit(" ", 1)[0].rstrip(",;:- ") + "…"


def on_domain(url: str, domains: tuple[str, ...]) -> bool:
    u = urlparse(url)
    host = (u.hostname or "").lower()
    return u.scheme == "https" and any(host == d or host.endswith("." + d) for d in domains)


def parse_feed(xml_bytes: bytes, source: str, domains: tuple[str, ...]) -> list[dict]:
    """Items of one RSS feed as {title, link, source, published, summary}; anything unusable is dropped."""
    upper = xml_bytes.upper()
    if len(xml_bytes) > MAX_BYTES or b"<!ENTITY" in upper or b"<!DOCTYPE" in upper:
        return []  # refuse oversized feeds and any that declare entities: nothing legitimate here needs them
    try:
        root = ET.fromstring(xml_bytes)  # noqa: S314
    except ET.ParseError:
        return []
    out: list[dict] = []
    for item in root.iter("item"):
        title = clean(item.findtext("title"))
        link = (item.findtext("link") or "").strip()
        when = item.findtext("pubDate")
        if not title or not on_domain(link, domains) or not when:
            continue
        try:
            published = parsedate_to_datetime(when).astimezone(UTC)
        except (TypeError, ValueError):
            continue
        out.append({
            "title": title, "link": link, "source": source, "published": published.isoformat(timespec="seconds"),
            "summary": teaser(item.findtext("description")),
        })
        if len(out) >= PER_FEED:
            break
    return out


def fetch_all(now: datetime | None = None) -> list[dict]:
    now = now or datetime.now(UTC)
    items: list[dict] = []
    for source, (url, domains) in FEEDS.items():
        try:
            r = requests.get(url, headers={"User-Agent": config.USER_AGENT}, timeout=20, stream=False)
            r.raise_for_status()
            got = parse_feed(r.content, source, domains)
        except requests.RequestException as exc:
            log.warning("%s: feed unavailable (%s)", source, type(exc).__name__)
            continue
        log.info("news: %s gave %d headlines", source, len(got))
        items.extend(got)
    return tidy(items, now)


def tidy(items: list[dict], now: datetime) -> list[dict]:
    """Newest first, one entry per article, nothing future-dated or older than three weeks."""
    seen: set[str] = set()
    out: list[dict] = []
    for it in sorted(items, key=lambda i: i["published"], reverse=True):
        when = datetime.fromisoformat(it["published"])
        key = re.sub(r"\W+", " ", it["title"].lower()).strip()
        if when > now or (now - when).days > MAX_AGE_DAYS or it["link"] in seen or key in seen:
            continue
        seen.update({it["link"], key})
        out.append(it)
    return out[:KEEP]


def refresh_news(publisher: Publisher, now: datetime | None = None) -> int:
    """Write news.json. If every feed fails, the last published list stays."""
    items = fetch_all(now)
    if not items:
        return 0
    fetched = (now or datetime.now(UTC)).isoformat(timespec="seconds")
    doc = {"fetched_at": fetched, "sources": sorted(FEEDS), "items": items}
    write_if_changed(publisher.root / "news.json", dumps(doc))
    log.info("news: %d headlines", len(items))
    return len(items)
