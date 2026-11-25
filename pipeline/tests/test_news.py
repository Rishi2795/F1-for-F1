from datetime import UTC, datetime

from f1data.news import clean, on_domain, parse_feed, teaser, tidy

NOW = datetime(2026, 11, 25, 12, 0, tzinfo=UTC)
BBC = ("bbc.co.uk", "bbc.com")


def feed(*items):
    body = "".join(
        f"<item><title>{title}</title><link>{link}</link><pubDate>{date}</pubDate><description>{text}</description></item>"
        for title, link, date, text in items
    )
    return f"<?xml version='1.0'?><rss><channel>{body}</channel></rss>".encode()


def test_text_is_plain_and_teasers_are_short():
    assert clean("<p>Hello&nbsp;<b>world</b> &amp; more</p>") == "Hello world & more"
    t = teaser("word " * 100)
    assert len(t) <= 200 and t.endswith("…")
    assert teaser("   ") is None and teaser(None) is None


def test_only_https_links_on_the_publishers_own_domain_are_kept():
    assert on_domain("https://www.bbc.co.uk/sport/x", BBC)
    assert not on_domain("http://www.bbc.co.uk/sport/x", BBC)
    assert not on_domain("https://evil.example/bbc.co.uk", BBC)
    assert not on_domain("https://bbc.co.uk.evil.example/x", BBC)
    assert not on_domain("javascript:alert(1)", BBC)


def test_a_feed_becomes_clean_items_and_bad_ones_are_dropped():
    xml = feed(("Hamilton wins", "https://www.bbc.co.uk/sport/1", "Tue, 24 Nov 2026 10:00:00 GMT", "&lt;p&gt;Race report&lt;/p&gt;"),
               ("Elsewhere", "https://evil.example/2", "Tue, 24 Nov 2026 10:00:00 GMT", "x"),
               ("No date", "https://www.bbc.co.uk/sport/3", "", "x"),
               ("Bad date", "https://www.bbc.co.uk/sport/4", "not a date", "x"))
    got = parse_feed(xml, "BBC Sport", BBC)
    assert [i["title"] for i in got] == ["Hamilton wins"]
    assert got[0]["published"].startswith("2026-11-24T10:00:00") and got[0]["summary"] == "Race report"


def test_a_feed_that_declares_entities_or_is_not_xml_gives_nothing():
    bomb = b'<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "aaaa">]><rss><channel><item><title>&a;</title></item></channel></rss>'
    assert parse_feed(bomb, "X", BBC) == []
    assert parse_feed(b"<html>not a feed", "X", BBC) == []
    assert parse_feed(b"x" * 3_000_000, "X", BBC) == []


def test_the_list_is_newest_first_without_duplicates_future_or_stale_items():
    def it(title, link, when):
        return {"title": title, "link": link, "source": "S", "published": when, "summary": None}
    items = [it("Old", "https://a/1", "2026-11-24T08:00:00+00:00"), it("New", "https://a/2", "2026-11-25T09:00:00+00:00"),
             it("New", "https://b/9", "2026-11-25T09:30:00+00:00"),  # the same headline from another outlet
             it("Future", "https://a/3", "2026-12-01T00:00:00+00:00"), it("Stale", "https://a/4", "2026-01-01T00:00:00+00:00"),
             it("Old", "https://a/1", "2026-11-24T08:00:00+00:00")]
    assert [i["title"] for i in tidy(items, NOW)] == ["New", "Old"]
