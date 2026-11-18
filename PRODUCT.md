# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primarily the owner: a 4WD/camping buyer who uses the site to time their own 4WD Supacentre / Adventure Kings purchases, deciding whether today's price is actually good and which bundle is the cheapest way to get what they want. The site is public, so anyone planning a Kings purchase or watching for drops is welcome, but design decisions serve the owner's real use first.

Usage is split evenly between desktop (sitting down to plan a bigger purchase, comparing bundles, building a shopping list) and phone (quick price checks, following a shared link).

## Product Purpose

An unofficial daily price history for the whole public 4WD Supacentre catalogue. It answers three questions the store itself doesn't: is this price low compared with its own history, what is the cheapest in-stock way to get this product (alone or inside a bundle), and what is the cheapest mix of bundles and single items that covers a whole shopping list.

Success: the owner (and any other visitor) can make a purchase decision with confidence that the price shown is the best currently available and how it compares with what the item usually costs.

## Positioning

Bundle-aware pricing. About 4,550 of ~5,090 listings are fixed-price bundles built from roughly 470 real products, and a bundle is often cheaper than one of its parts bought alone. The site is organised around real products and their *effective price* (the cheapest in-stock way to get them, bundles included), compares every bundle against buying its parts separately (including bundles that cost more), and solves the shopping list exactly rather than guessing.

## Operating Context

- Data comes from a daily GitHub Action (~5:20am AEST) that pages the store's public GraphQL API, appends to `data/changes.csv` only on price or stock change, and rebuilds the static site.
- Visitors arrive at the site directly, through shared links (filters and search live in the URL hash), or through the RSS feed of drops from the last 14 days (`feed.xml`).
- Purchases happen on the store's own site; this site links out to each product.

## Capabilities and Constraints

- Views: Products (effective price, cheapest bundles and their extras), Bundles (each compared with its parts), Shopping list (exact optimiser in `web/src/lib/optimise.ts`, greedy fallback only for very large lists, which the page says).
- Search with autocomplete, department and category filters, deal sorting (best deal, bundle savings, recent drop, price, newest, name), in-stock and at-low filters, sparklines, watch list.
- Stats per product: current, low, high, 90-day median "usual" price, recent drop. A usual price only appears after 14 days of history; until then "best deal" ranks by bundle savings and recent drops.
- Static only: GitHub Pages, no server, no accounts. Watch list and shopping list are kept in the browser (localStorage).
- Stack: Vue 3 + Vite + Tailwind CSS v4 + shadcn-vue (reka-ui), Lucide icons; scraper and build use only the Python standard library.

## Brand Commitments

- Name: **Kings Deal Tracker**.
- Must stay clearly unofficial: never look like an official Kings / 4WD Supacentre site and never borrow their logos or branding. The footer disclaimer ("Unofficial and not affiliated with 4WD Supacentre… Always check the price on…") stays.
- No ads, no affiliate or referral links, no tracking parameters on store links.

## Evidence on Hand

- Real, live price data: `data/changes.csv`, `data/products.json`, built into `_site/data.json` and `_site/feed.xml`.
- Live site: https://aclem43.github.io/kings-deal-tracker/
- No testimonials, user counts, or press exist; do not invent them.

## Product Principles

1. **Honest numbers over exciting ones.** Never overstate a deal. Show caveats (not enough history yet, greedy fallback, prices collected once a day) where the number appears.
2. **Real products, not listings.** Organise around what people actually want to own; bundles are a way to buy, not the thing itself.
3. **The answer first.** Lead with the cheapest way to buy and whether it's a good price; detail and history support that answer.
4. **Shareable and stateless.** Anything a visitor sets up should survive as a link; nothing needs an account or a server.
5. **Independent by design.** The site's credibility comes from being clearly separate from the store.
