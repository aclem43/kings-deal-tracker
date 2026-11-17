#!/usr/bin/env python3
"""Pull the full 4WD Supacentre catalogue and record price/stock changes.

Writes, relative to the repo root:
  data/products.json  - metadata for every product ever seen (name, url, image, categories)
  data/changes.csv    - append-only log: one row whenever a product's price or stock changes

Standard library only, so the GitHub Action needs no dependencies.
"""
import csv
import datetime as dt
import json
import pathlib
import sys
import time
import urllib.error
import urllib.request

ENDPOINT = "https://sc-prod.4wdsc.com/graphql"
SITE = "https://www.4wdsupacentre.com.au/"
PAGE_SIZE = 200
PAUSE_SECONDS = 2  # between pages, to stay polite
USER_AGENT = "Mozilla/5.0 (compatible; kings-price-tracker/1.0; daily price history)"
SKIP_TYPES = {"GiftCardProduct"}
HIDDEN_DEPTS = {"Test"}  # internal store category that holds real products

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
PRODUCTS_FILE = DATA / "products.json"
CHANGES_FILE = DATA / "changes.csv"
CHANGE_FIELDS = ["date", "sku", "price", "stock"]  # stock: 1 in stock, 0 out of stock, gone = delisted

QUERY = """
query($page: Int!, $size: Int!) {
  products(search: "", pageSize: $size, currentPage: $page, sort: {name: ASC}) {
    total_count
    page_info { total_pages }
    items {
      __typename sku name url_key url_suffix stock_status
      small_image { url }
      categories { name level url_path }
      price_range { minimum_price { final_price { value } } }
      ... on BundleProduct { items { options { quantity product { sku } } } }
    }
  }
}
"""


def fetch_page(page):
    body = json.dumps({"query": QUERY, "variables": {"page": page, "size": PAGE_SIZE}}).encode()
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                payload = json.load(resp)
            if payload.get("errors"):
                raise RuntimeError(f"GraphQL errors: {payload['errors']}")
            return payload["data"]["products"]
        except (urllib.error.URLError, TimeoutError, RuntimeError, KeyError) as exc:
            wait = 10 * (attempt + 1)
            print(f"page {page} attempt {attempt + 1} failed: {exc}; retrying in {wait}s", file=sys.stderr)
            time.sleep(wait)
    raise SystemExit(f"giving up on page {page}")


def clean_image(url):
    if not url or "placeholder" in url:
        return ""
    return url.split("?")[0]


def categories(raw):
    """Level 2 = department (Camping, 4WD, ...); level 3 = sub-category. 'specials/...' are deal tags."""
    depts, subs, tags = set(), set(), set()
    for c in raw or []:
        name = (c.get("name") or "").strip()
        path = c.get("url_path") or ""
        if not name:
            continue
        if path.startswith("specials"):
            if c.get("level") == 3:
                tags.add(name)
            continue
        if path.startswith("products"):  # duplicate tree that mirrors the departments
            continue
        if c.get("level") == 2:
            if name not in HIDDEN_DEPTS:
                depts.add(name)
        elif c.get("level") == 3:
            subs.add(name)
    return sorted(depts), sorted(subs), sorted(tags)


def bundle_parts(item):
    """[[component sku, quantity], ...] for a bundle; [] for anything else.

    4WDSC bundles are fixed-price, every slot is required and has a single option.
    """
    parts = {}
    for slot in item.get("items") or []:
        for opt in slot.get("options") or []:
            sku = (opt.get("product") or {}).get("sku")
            if sku:
                parts[sku] = parts.get(sku, 0) + int(opt.get("quantity") or 1)
    return sorted([s, q] for s, q in parts.items())


def scrape():
    first = fetch_page(1)
    total_pages = first["page_info"]["total_pages"]
    expected = first["total_count"]
    items = list(first["items"])
    print(f"{expected} products over {total_pages} pages")
    for page in range(2, total_pages + 1):
        time.sleep(PAUSE_SECONDS)
        items.extend(fetch_page(page)["items"])
        print(f"  page {page}/{total_pages}: {len(items)} items")

    current = {}
    for it in items:
        if not it or it.get("__typename") in SKIP_TYPES or not it.get("sku"):
            continue
        price = it["price_range"]["minimum_price"]["final_price"]["value"]
        if price is None:
            continue
        depts, subs, tags = categories(it.get("categories"))
        current[it["sku"]] = {
            "name": " ".join((it.get("name") or "").split()),
            "url": SITE + (it.get("url_key") or "") + (it.get("url_suffix") or ".html"),
            "image": clean_image((it.get("small_image") or {}).get("url")),
            "type": it.get("__typename", "").replace("Product", "").lower(),
            "depts": depts,
            "subs": subs,
            "tags": tags,
            "parts": bundle_parts(it),
            "price": round(float(price), 2),
            "stock": 1 if it.get("stock_status") == "IN_STOCK" else 0,
        }
    return current, expected


def last_known_state():
    state = {}
    if CHANGES_FILE.exists():
        with CHANGES_FILE.open(newline="") as f:
            for row in csv.DictReader(f):
                state[row["sku"]] = row
    return state


def main():
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=10))).date().isoformat()  # AEST date
    current, expected = scrape()

    # Refuse to record a partial pull as mass delistings.
    if len(current) < 0.8 * expected:
        raise SystemExit(f"only parsed {len(current)} of {expected} products; not saving")

    DATA.mkdir(exist_ok=True)
    meta = json.loads(PRODUCTS_FILE.read_text()) if PRODUCTS_FILE.exists() else {}
    previous = last_known_state()
    if previous:
        live_before = sum(1 for r in previous.values() if r["stock"] != "gone")
        if len(current) < 0.5 * live_before:
            raise SystemExit(f"catalogue shrank from {live_before} to {len(current)}; not saving")

    rows = []
    for sku, p in current.items():
        old = previous.get(sku)
        price, stock = f"{p['price']:.2f}", str(p["stock"])
        if not old or old["price"] != price or old["stock"] != stock:
            rows.append({"date": today, "sku": sku, "price": price, "stock": stock})
        entry = meta.setdefault(sku, {"first_seen": today})
        # Only metadata that actually changes gets rewritten, so daily git diffs stay small.
        entry.update({k: p[k] for k in ("name", "url", "image", "type", "depts", "subs", "tags", "parts")})

    for sku, old in previous.items():
        if sku not in current and old["stock"] != "gone":
            rows.append({"date": today, "sku": sku, "price": old["price"], "stock": "gone"})

    new_file = not CHANGES_FILE.exists()
    with CHANGES_FILE.open("a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CHANGE_FIELDS)
        if new_file:
            writer.writeheader()
        writer.writerows(rows)

    # One product per line: line-based git diffs stay small when a single product changes.
    lines = [f"{json.dumps(k)}:{json.dumps(v, sort_keys=True, ensure_ascii=False)}" for k, v in sorted(meta.items())]
    PRODUCTS_FILE.write_text("{\n" + ",\n".join(lines) + "\n}\n")
    print(f"{today}: {len(current)} products, {len(rows)} changes recorded")


if __name__ == "__main__":
    main()
