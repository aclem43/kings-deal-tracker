# Kings Deal Tracker

An unofficial price-history site for 4WD Supacentre / Adventure Kings products.
A GitHub Action pulls the whole public catalogue once a day, records any price or
stock changes, and publishes a static site to GitHub Pages. No server and no
dependencies: just Python's standard library and plain HTML/JS.

## How it works

| Piece | What it does |
| --- | --- |
| `scraper/scrape.py` | Pages through the store's public GraphQL API (`sc-prod.4wdsc.com/graphql`, 200 products per request, 2 s apart). Appends a row to `data/changes.csv` only when a product's price or stock changes, and keeps product names, links and categories in `data/products.json`. If a pull looks partial, it stops without saving. |
| `scraper/build.py` | Replays the change log into per-product stats (current, low, high, 90-day median "usual" price, recent drop) and writes `_site/data.json` and `_site/feed.xml` (RSS of drops in the last 14 days). |
| `web/` | The static frontend: search, department and category filters, deal sorting, sparklines. Filters are kept in the URL, so they can be shared. |
| `.github/workflows/update.yml` | Daily at about 5:20am AEST: scrape, commit data, build, deploy to Pages. Changes to `web/` redeploy without scraping. |

### Bundles

Most of the catalogue (~4,550 of ~5,090 listings) is fixed-price bundles built
from about 470 real products, and a bundle is often cheaper than one of its parts
bought alone. So the site is organised around real products:

- **Products view:** each product's price is its *effective price*, the cheapest
  in-stock way to get it (alone, or in any bundle that contains it). The card
  lists the cheapest bundles and what extras come with them. History, lows and
  the usual price all use this effective price.
- **Bundles view:** every bundle compared with buying its parts separately,
  including the ones that cost *more* than their parts.

A "usual price" is only shown once a product has 14 days of history. Until then,
"best deal" ranks by bundle savings and recent drops.

## Setup

1. Create a public GitHub repo and push this folder to `main`.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. **Actions** tab → *Update prices and deploy* → **Run workflow** for the first run.
4. Set `SITE_URL` in `scraper/build.py` to your Pages URL so the RSS feed links back to the site.

Live site: https://aclem43.github.io/kings-deal-tracker/

GitHub disables scheduled workflows in a public repo after 60 days without
repository activity. The daily data commit should count as activity; if the
schedule is ever disabled, re-enable it from the Actions tab.

## Run locally

```bash
python3 scraper/scrape.py   # ~3-4 minutes
python3 scraper/build.py
python3 -m http.server -d _site 8000
```
