---
version: 1
slug: "web-src-app-vue"
primary_target: "web/src/App.vue"
related_targets: ["web/src/components/ProductCard.vue","web/src/components/ShoppingList.vue"]
---

# Surface: Kings Deal Tracker app (Products, Bundles, Shopping list)

Mode: Operate. The visitor decides whether today's price is good and which way of buying is cheapest. Audience, product truth and constraints live in PRODUCT.md.

Scope of this pass: replace the stock shadcn look with an own world and fix the 2026-11-18 critique's issues (dead history UI, always-empty filters, unshareable list, caveats away from numbers, red doing double duty, muted contrast, phone tap targets).

## Direction contract

THESIS: A bundle is a consignment. Every deal is labelled like road freight: the effective price in a reversed routing block, the cheapest bundle counted out piece by piece. Refuses the category default of white rounded cards, a blue or red accent and a decorative sparkline on every tile.

OWN-WORLD: Kraft-carton ground; thermal-white label cards with 2px ink rules and square corners; black top bar; hi-vis yellow handling band for status and for warnings; green only for savings; signal red only for "dearer than parts / above usual". Barlow for UI and body, Barlow Condensed caps for labels, prices and headings, tabular figures everywhere. Dark mode is carton at night: charcoal-brown ground, dark labels, the routing block flips to light.

STORY: The visitor sees today's cheapest way to buy each product, trusts it because the caveats sit next to the numbers, narrows with filters that show their extent, and leaves with a list plan they can share.

FIRST VIEWPORT: Black bar with the mark, Products / Bundles / List tabs and the search. Under it the yellow band: unofficial, last pull time, days tracked, when usual prices start. Desktop: a 240px left rail of filter chips with counts (empty ones disabled with a reason) and department chips, then the heading, count and sort with its ranking note, then a 4-column grid of labels. Phone: tabs, then search and a filter button, a scrollable chip row with an edge fade, then labels.

FORM: Consignment Label, candidate 6 of 7 on the ordered list (roadhouse fuel board, touring road atlas, park signage, canvas swing tags, trip manifest, consignment label, track notes). seed:33eabb10fa91610a. Signature move: the winning bundle shown as a consignment manifest on the product label (consignment SKU, then "PCS 1/2" rows with this product highlighted). Raises: rank inside a card by weight, case and reversal, not a third size (timetable); destructive actions isolated with undo (console); a shared product link leads with that one item (vertical feed); filters show their extent (manual tab board); tabular figures as a readout (specimen).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
