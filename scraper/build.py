#!/usr/bin/env python3
"""Build the static site into _site/ from data/products.json + data/changes.csv.

The site is organised around real products (not bundle listings). For each product
the "effective price" is the cheapest in-stock way to get it: on its own, or inside
any bundle that contains it. History, lows and the "usual price" all use that
effective price, because that is what you would actually pay.

Outputs:
  _site/index.html, assets/              (the built frontend, copied from web/dist/;
                                         run `npm run build` in web/ first)
  _site/data.json                        (products + bundles)
  _site/feed.xml                         (RSS of recent effective-price drops)
"""
import csv
import datetime as dt
import json
import pathlib
import shutil
import statistics
from bisect import bisect_right
from collections import defaultdict
from email.utils import format_datetime
from xml.sax.saxutils import escape

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
WEB = ROOT / "web" / "dist"
OUT = ROOT / "_site"

TYPICAL_WINDOW_DAYS = 90
MIN_DAYS_FOR_TYPICAL = 14  # don't claim a "usual price" from a few days of data
TOP_BUNDLES = 3             # cheapest bundles listed on each product card
FEED_DAYS = 14
FEED_LIMIT = 200
SITE_URL = "https://aclem43.github.io/kings-deal-tracker/"  # used for links in the RSS feed
AEST = dt.timezone(dt.timedelta(hours=10))


def short(name):
    """'Kings Plus AK55 Fridge | 12V | ...' -> 'Kings Plus AK55 Fridge'."""
    return name.split(" | ")[0].split("|")[0].strip()


class History:
    """Price/stock change points per SKU, with point-in-time lookup."""

    def __init__(self, path):
        self.points = defaultdict(list)  # sku -> [(date, price, stock)] where stock is '1', '0' or 'gone'
        with path.open(newline="") as f:
            for row in csv.DictReader(f):
                self.points[row["sku"]].append((dt.date.fromisoformat(row["date"]), float(row["price"]), row["stock"]))
        self.dates = {sku: [p[0] for p in pts] for sku, pts in self.points.items()}

    def at(self, sku, day):
        i = bisect_right(self.dates.get(sku, []), day)
        return self.points[sku][i - 1] if i else None

    def current(self, sku):
        pts = self.points.get(sku)
        return pts[-1] if pts else None

    def live(self, sku):
        cur = self.current(sku)
        return cur is not None and cur[2] != "gone"


def daily_prices(points, start, end):
    """Expand (date, price, stock) change points into one price per day in [start, end], skipping delisted days."""
    out, i, price, stock = [], 0, None, None
    day = min(start, points[0][0])
    while day <= end:
        while i < len(points) and points[i][0] <= day:
            _, price, stock = points[i]
            i += 1
        if day >= start and price is not None and stock != "gone":
            out.append(price)
        day += dt.timedelta(days=1)
    return out


def price_stats(points, today):
    """Low/high/usual/previous price for a (date, price, stock) series ending today."""
    listed = [(d, p) for d, p, s in points if s != "gone"]
    price = points[-1][1]
    days_tracked = (today - points[0][0]).days + 1
    typical = None
    if days_tracked >= MIN_DAYS_FOR_TYPICAL:
        window = daily_prices(points, today - dt.timedelta(days=TYPICAL_WINDOW_DAYS - 1), today)
        if window:
            typical = round(statistics.median(window), 2)
    prev = next((p for _, p in reversed(listed[:-1]) if p != price), None)
    since = points[-1][0]  # the day the current price started
    for d, p in reversed(listed):
        if p != price:
            break
        since = d
    return {
        "lo": min(p for _, p in listed),
        "hi": max(p for _, p in listed),
        "ty": typical,
        "pv": prev,
        "pd": since.isoformat() if prev is not None else None,
        "h": [[d.isoformat(), p] for d, p in listed],
    }


def cheapest(hist, sku, bundles_with, day):
    """Cheapest in-stock way to get `sku` on `day`: (price, bundle sku or None), or None if nothing in stock."""
    options = []
    own = hist.at(sku, day)
    if own and own[2] == "1":
        options.append((own[1], ""))
    for b in bundles_with.get(sku, []):
        st = hist.at(b, day)
        if st and st[2] == "1":
            options.append((st[1], b))
    return min(options) if options else None


def effective_series(hist, sku, bundles_with):
    """Change points of the effective price. Falls back to the standalone price when nothing is in stock."""
    days = sorted({d for s in [sku, *bundles_with.get(sku, [])] for d in hist.dates.get(s, [])})
    out = []
    for day in days:
        own = hist.at(sku, day)
        if own is None:
            continue
        best = cheapest(hist, sku, bundles_with, day)
        point = (day, best[0], "1") if best else (day, own[1], "0" if own[2] != "gone" else "gone")
        if not out or out[-1][1:] != point[1:]:
            out.append(point)
    return out


def build(meta, hist, today):
    bundles = {s: m for s, m in meta.items() if m.get("parts") and hist.live(s)}
    bundles_with = defaultdict(list)  # component sku -> bundle skus that contain it
    for b, m in bundles.items():
        for part, _qty in m["parts"]:
            bundles_with[part].append(b)

    def base_fields(sku):
        m = meta[sku]
        return {"s": sku, "n": m["name"], "u": m["url"], "i": m.get("image", ""),
                "d": m.get("depts", []), "c": m.get("subs", []), "f": m.get("first_seen")}

    products = []
    for sku, m in meta.items():
        if m.get("parts") or not hist.live(sku):
            continue
        own_date, own_price, own_stock = hist.current(sku)
        series = effective_series(hist, sku, bundles_with)
        best_now = cheapest(hist, sku, bundles_with, today)
        price = best_now[0] if best_now else own_price
        via = best_now[1] if best_now else ""

        options = []
        for b in bundles_with.get(sku, []):
            _, bp, bst = hist.current(b)
            others = [f"{short(meta[s]['name'])}{f' ×{q}' if q > 1 else ''}"
                      for s, q in bundles[b]["parts"] if s != sku and s in meta]
            mine = next(q for s, q in bundles[b]["parts"] if s == sku)
            options.append({"s": b, "u": meta[b]["url"], "p": bp, "st": int(bst),
                            "x": others, "q": mine})
        options.sort(key=lambda o: (-o["st"], o["p"]))

        rec = base_fields(sku)
        rec.update({
            "p": price,
            "st": 1 if best_now else 0,
            "sp": own_price,
            "sst": int(own_stock),
            "via": via,
            "sv": round((own_price - price) / own_price, 4) if via and own_price else 0,
            "nb": len(options),
            "b": options[:TOP_BUNDLES],
        })
        rec.update(price_stats(series, today))
        products.append(rec)

    bundle_recs = []
    for sku, m in bundles.items():
        _, price, stock = hist.current(sku)
        parts_sum = 0.0
        for part, qty in m["parts"]:
            cur = hist.current(part)
            if cur:
                parts_sum += qty * cur[1]
        rec = base_fields(sku)
        rec.update({
            "p": price,
            "st": int(stock),
            "ps": round(parts_sum, 2),
            "sv": round((parts_sum - price) / parts_sum, 4) if parts_sum else 0,
            "k": [s for s, _ in m["parts"]],
            "x": [f"{short(meta[s]['name'])}{f' ×{q}' if q > 1 else ''}" for s, q in m["parts"] if s in meta],
        })
        rec.update(price_stats(hist.points[sku], today))
        bundle_recs.append(rec)
    return products, bundle_recs


def price_drops(products, today):
    cutoff = today - dt.timedelta(days=FEED_DAYS)
    drops = []
    for p in products:
        h = p["h"]
        for (d0, p0), (d1, p1) in zip(h, h[1:]):
            if p1 < p0 and dt.date.fromisoformat(d1) >= cutoff:
                drops.append((d1, (p0 - p1) / p0, p, p0, p1))
    drops.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return drops[:FEED_LIMIT]


def write_feed(drops, now):
    items = []
    for day, pct, prod, old, new in drops:
        when = dt.datetime.combine(dt.date.fromisoformat(day), dt.time(6), AEST)
        title = f"{short(prod['n'])}: ${new:,.2f} (was ${old:,.2f}, -{pct:.0%})"
        how = "on its own" if not prod["via"] else "in a bundle"
        link = SITE_URL + "#q=" + prod["s"] if SITE_URL else prod["u"]
        items.append(
            "<item>"
            f"<title>{escape(title)}</title>"
            f"<link>{escape(link)}</link>"
            f"<description>{escape(f'Cheapest way to get it now: {how}.')}</description>"
            f"<guid isPermaLink=\"false\">{escape(prod['s'])}-{day}-{new:.2f}</guid>"
            f"<pubDate>{format_datetime(when)}</pubDate>"
            "</item>"
        )
    feed = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0"><channel>'
        "<title>Kings / 4WD Supacentre price drops</title>"
        f"<link>{escape(SITE_URL or 'https://www.4wdsupacentre.com.au/')}</link>"
        "<description>Products whose cheapest price (alone or in a bundle) dropped in the last two weeks.</description>"
        f"<lastBuildDate>{format_datetime(now)}</lastBuildDate>"
        + "".join(items)
        + "</channel></rss>\n"
    )
    (OUT / "feed.xml").write_text(feed)


def main():
    now = dt.datetime.now(AEST)
    today = now.date()
    meta = json.loads((DATA / "products.json").read_text())
    hist = History(DATA / "changes.csv")
    products, bundles = build(meta, hist, today)
    drops = price_drops(products, today)
    tracked_since = min((pts[0][0] for pts in hist.points.values()), default=today)

    if not (WEB / "index.html").exists():
        raise SystemExit(f"{WEB} is missing: run `npm ci && npm run build` in web/ first")
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(WEB, OUT)
    (OUT / ".nojekyll").write_text("")
    payload = {
        "generated": now.isoformat(timespec="minutes"),
        "trackedSince": tracked_since.isoformat(),
        "minDaysForTypical": MIN_DAYS_FOR_TYPICAL,
        "products": products,
        "bundles": bundles,
    }
    (OUT / "data.json").write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False))
    write_feed(drops, now)
    cheaper = sum(1 for p in products if p["via"])
    print(f"built {len(products)} products ({cheaper} cheapest in a bundle), {len(bundles)} bundles, "
          f"{len(drops)} recent drops -> {OUT}")


if __name__ == "__main__":
    main()
