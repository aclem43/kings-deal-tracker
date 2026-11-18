---
name: Kings Deal Tracker
description: An unofficial daily price history for the 4WD Supacentre catalogue, labelled like road freight.
colors:
  carton: "oklch(0.745 0.08 72)"
  carton-ink: "oklch(0.2 0.02 60)"
  carton-muted: "oklch(0.31 0.045 62)"
  bar: "oklch(0.17 0.005 60)"
  bar-ink: "oklch(0.975 0.006 90)"
  bar-muted: "oklch(0.78 0.015 80)"
  hivis: "oklch(0.837 0.171 90.3)"
  hivis-ink: "oklch(0.18 0.01 70)"
  label: "oklch(0.984 0.004 90)"
  ink: "oklch(0.18 0.005 60)"
  label-tint: "oklch(0.94 0.01 85)"
  label-muted-ink: "oklch(0.43 0.025 65)"
  rule: "oklch(0.86 0.015 80)"
  good: "oklch(0.47 0.13 150)"
  good-bg: "oklch(0.93 0.055 150)"
  bad: "oklch(0.52 0.19 28)"
  photo-well: "oklch(1 0 0)"
  photo-well-ink: "oklch(0.62 0.012 70)"
  photo-well-night: "oklch(0.82 0.006 80)"
  photo-well-ink-night: "oklch(0.45 0.012 70)"
  carton-night: "oklch(0.2 0.014 65)"
  carton-ink-night: "oklch(0.95 0.008 85)"
  carton-muted-night: "oklch(0.78 0.025 78)"
  bar-night: "oklch(0.13 0.008 65)"
  bar-muted-night: "oklch(0.74 0.015 80)"
  label-night: "oklch(0.255 0.012 68)"
  ink-night: "oklch(0.95 0.008 85)"
  label-tint-night: "oklch(0.31 0.012 68)"
  label-muted-ink-night: "oklch(0.77 0.02 78)"
  border-night: "oklch(0.6 0.02 75)"
  rule-night: "oklch(0.36 0.012 68)"
  good-night: "oklch(0.8 0.14 150)"
  good-bg-night: "oklch(0.32 0.06 150)"
  bad-night: "oklch(0.72 0.17 28)"
typography:
  display:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0em"
    fontFeature: "tnum"
  price:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.25
    fontFeature: "tnum"
  price-total:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.25
    fontFeature: "tnum"
  title:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
  nav:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    letterSpacing: "0.06em"
  band:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    letterSpacing: "0.05em"
  label-caps:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    letterSpacing: "0.08em"
  badge:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.06em"
  body:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.375
    fontFeature: "tnum"
  body-strong:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    fontFeature: "tnum"
  small:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    fontFeature: "tnum"
  caption:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  none: "0px"
  primitive-base: "0.125rem"
spacing:
  hair: "2px"
  chip-gap: "6px"
  label-inset: "12px"
  grid-gap: "16px"
  gutter-phone: "16px"
  gutter-wide: "24px"
  rail-gap: "28px"
  rail: "15rem"
  label-min: "15.5rem"
  container: "90rem"
components:
  label-stock:
    backgroundColor: "{colors.label}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  routing-block:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.label}"
    typography: "{typography.price}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
  manifest-line-marked:
    backgroundColor: "{colors.good-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    padding: "4px 8px"
  tone-badge-good:
    backgroundColor: "{colors.good}"
    textColor: "{colors.label}"
    typography: "{typography.badge}"
    rounded: "{rounded.none}"
    padding: "2px 6px"
  tone-badge-warn:
    backgroundColor: "{colors.hivis}"
    textColor: "{colors.hivis-ink}"
    typography: "{typography.badge}"
    rounded: "{rounded.none}"
    padding: "2px 6px"
  tone-badge-bad:
    backgroundColor: "{colors.bad}"
    textColor: "{colors.label}"
    typography: "{typography.badge}"
    rounded: "{rounded.none}"
    padding: "2px 6px"
  filter-chip:
    backgroundColor: "{colors.label}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.none}"
    padding: "0 10px"
    height: "36px"
  filter-chip-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.label}"
  filter-chip-hover:
    backgroundColor: "{colors.label-tint}"
  filter-chip-watch-pressed:
    backgroundColor: "{colors.hivis}"
    textColor: "{colors.hivis-ink}"
  filter-chip-disabled:
    backgroundColor: "{colors.label}"
    textColor: "{colors.label-muted-ink}"
  hivis-band:
    backgroundColor: "{colors.hivis}"
    textColor: "{colors.hivis-ink}"
    typography: "{typography.band}"
    padding: "6px 24px"
  black-bar:
    backgroundColor: "{colors.bar}"
    textColor: "{colors.bar-ink}"
    padding: "10px 24px"
  bar-tab:
    textColor: "{colors.bar-muted}"
    typography: "{typography.nav}"
    padding: "0 16px"
    height: "40px"
  bar-tab-current:
    backgroundColor: "{colors.bar-ink}"
    textColor: "{colors.bar}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.label}"
    rounded: "{rounded.none}"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.label}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    height: "40px"
  icon-toggle:
    backgroundColor: "{colors.label}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    size: "36px"
  search-input:
    backgroundColor: "{colors.label}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    height: "40px"
    padding: "0 36px"
---

# Design System: Kings Deal Tracker

## Overview

**Creative North Star: "The Consignment Label"**

Every deal is a parcel on a kraft carton. The page ground is the carton itself, warm brown and matte; each product or bundle is a thermal-white label stuck to it, ruled in 2px ink with square corners and no shadow. Today's price is printed reversed in a black routing block, the winning bundle is counted out as a consignment manifest ("PCS 1/2"), and status that needs attention travels on a hi-vis yellow handling band under a black top bar. The world reads like road freight paperwork: dense, legible at arm's length, nothing decorative that is not also information.

Density is high and deliberate. Labels sit in a 4-up grid on desktop, the filter rail is a stack of ruled chips with their counts printed on them, and rank inside a label is made by weight, case and reversal (routing block, condensed caps, bold) rather than a third type size. Colour is rationed: green means a saving, red means dearer than the parts or above the usual price, yellow means take note. Everything else is ink, label stock and carton.

At night the same carton goes charcoal-brown, labels turn dark, and the routing block flips to a light block on dark stock. The black bar and the hi-vis band do not change: they are the fixed livery of the site.

**Key Characteristics:**
- Kraft-carton ground, thermal-white label stock, 2px ink rules, square corners, flat.
- Price printed reversed in a routing block; the winning bundle shown as a manifest.
- Barlow for reading, Barlow Condensed caps for labels, prices and headings; tabular figures everywhere.
- Three signal colours with fixed meanings, and nothing else coloured.
- Black top bar and hi-vis handling band, identical in light and dark.

## Colors

A warm freight palette: brown carton, near-white stock, warm black ink, one hi-vis yellow and two strictly semantic signal colours. Every token has a light and a night value; night values carry the `-night` suffix in the frontmatter and are applied under the `.dark` class.

### Primary
- **Routing Ink** (`ink`): text on labels, the 2px label border, the routing block's fill, pressed chips and primary buttons. In dark mode it becomes the light ink (`ink-night`), so the routing block and pressed chips flip to light blocks on dark labels.
- **Hi-Vis Handling Yellow** (`hivis`): the handling band, warning badges, the watch-list pressed state, the list count pip, keyboard-highlighted search suggestions, text selection, and the shared-list and unavailable-items notices. Always paired with `hivis-ink`. Unchanged at night; it is also the focus ring colour in dark mode.

### Secondary
- **Saving Green** (`good`, `good-bg`): savings only. Solid `good` fills "Less than alone" style badges, the "Saves" strip on the plan and the in-list cart toggle; the pale `good-bg` marks this product's own line in a manifest.
- **Signal Red** (`bad`): "dearer than its parts" and "above usual" only, as a solid badge. Also the destructive token for primitives.

### Neutral
- **Kraft Carton** (`carton`): the page ground behind everything; also the sticky phone filter bar background so labels scroll under carton, not under white.
- **Carton Ink / Carton Muted** (`carton-ink`, `carton-muted`): page headings, counts, intro copy, rail headings and the disabled-filter reasons printed on the carton.
- **Bar Black / Bar Ink / Bar Muted** (`bar`, `bar-ink`, `bar-muted`): the top bar and footer; muted for idle tabs and icon buttons, ink for hover and links.
- **Thermal Label** (`label`): card, popover and input fill.
- **Label Tint** (`label-tint`): hover fill on chips, buttons and manifest links; icon tiles in search.
- **Label Muted Ink** (`label-muted-ink`): secondary text on labels (name tails after the first "|", "how" lines, stats, compare captions).
- **Hairline Rule** (`rule`): the 1px inner rules inside a label (manifest rows, history divider, list rows). Never the outer border; that is always 2px ink.
- **Photo Well** (`photo-well`, `photo-well-ink`): pure white behind product photography so store images sit on their own white; at night the well is a light warm grey (`photo-well-night`) and photos multiply into it. `photo-well-ink` colours the no-image icon.

### Named Rules
**The Three Signals Rule.** Green is a saving, red is dearer than the parts or above usual, yellow is "take note". No colour carries any other meaning, and no element is coloured for decoration.

**The Fixed Livery Rule.** The black bar and the hi-vis band keep the same colours in light and dark mode; only the carton and the labels change.

**The Ink Border Rule.** A label's outer edge is 2px of the ink token (in dark mode the lighter `border-night`). Inner divisions use the 1px hairline rule. Never invert that.

## Typography

**Display Font:** Barlow Condensed (with Barlow, ui-sans-serif, system-ui)
**Body Font:** Barlow (with ui-sans-serif, system-ui)

**Character:** A highway-signage family used two ways: Barlow Condensed in bold caps is the printed freight label (prices, headings, badges, bands, SKU and piece counts), plain Barlow is the reading text. Tabular figures are set on `body`, so every number in the product lines up as a readout.

### Hierarchy
- **Display** (800, 1.875rem rising to 2.25rem from 640px, line-height 1, uppercase, balanced): one per view, the page heading on the carton.
- **Price** (700, 2rem, line-height 1.25): today's price in the routing block on every label.
- **Price Total** (700, 2.5rem): the shopping-list plan total in its routing block.
- **Title** (700, 1.25rem, uppercase): panel headings inside labels ("Your list", "Cheapest way to buy it"), empty and error state headings.
- **Nav** (700, 1rem, 0.06em, uppercase): the Products / Bundles / List tabs in the black bar.
- **Band** (700, 0.875rem, 0.05em, uppercase): the hi-vis handling band entries.
- **Label Caps** (700, 0.8125rem, 0.08em, uppercase): rail headings, "Alone" / "Parts" / "Was" captions, "Consignment", search group labels. Manifest SKU and "PCS" counts use the same face at 0.04em.
- **Badge** (700, 0.8125rem, 0.06em, uppercase): tone badges.
- **Body** (400, 0.9375rem, snug): product names (first segment 600) and intro copy, intro capped near 42rem.
- **Body Strong** (600, 0.875rem): chip and button text.
- **Small / Caption** (400, 0.8125rem / 0.75rem): "how" lines, manifest rows, stats, sort notes, filter reasons.

### Named Rules
**The Readout Rule.** Tabular figures everywhere; never switch a number to proportional figures to make it look tighter.

**The Three Levers Rule.** Inside a label, rank comes from weight, case and reversal, not from adding another size. If a new element needs emphasis, make it bold, condensed caps or reversed before making it bigger.

## Layout

A centred container (max 90rem) with 16px gutters on phones and 24px from 640px. From 1024px the content splits into a 15rem filter rail (sticky, 16px from the top) and the results, 28px apart. Results are an auto-fill grid of labels at least 15.5rem wide with a 16px gap, which lands at four across on a typical desktop. A shared single-item link narrows the grid to one label (max 24rem) under its own heading.

Above the results sits a count line ("536 of 536 products") and the sort control with its ranking note, closed by a 2px carton-ink rule (80% opacity). Below 1024px the rail is replaced by a sticky carton-coloured bar: search plus a Filters button that opens a bottom sheet for department and category, then a sideways-scrolling chip row whose right edge fades out over 2.5rem to say there is more.

Inside a label the rhythm is 12px side insets, 8–12px vertical steps, a fixed 10rem photo well so text in a row starts on the same line, and two-line clamped names. Touch targets grow on coarse pointers: chips, icon toggles and inputs go from 36–40px to 44px.

## Elevation & Depth

Flat. Depth is made by stacking materials, not by light: label stock sits on carton, ink rules separate parts, the routing block is a reversal, and the black bar and yellow band are bands of colour. Labels never carry a shadow.

### Shadow Vocabulary
- **Overlay drop** (`box-shadow: 0 12px 32px -8px rgb(0 0 0 / 0.35)`): the search autocomplete list only, so a floating list reads as lifted above the labels it covers. It is soft and ambient, never a hard offset.

### Named Rules
**The Flat Stock Rule.** Labels, chips, buttons, badges and the manifest have no shadow at rest or on hover; state changes are fill changes.

## Shapes

Square corners everywhere. The theme base radius is 0.125rem, but every shipped surface (labels, chips, inputs, selects, sheets, buttons, badges, the routing block) sets its corners to 0. Edges are 2px ink rules outside and 1px hairlines inside. The one non-rectangular silhouette is the site mark: a hi-vis tag with a clipped lower-right corner and a falling price line, used in the bar and as the favicon.

Disabled is a shape change, not just a fade: the 2px border turns dashed.

## Components

### Label Stock (cards)
The base of every product, bundle, list panel, plan panel, error and empty state.
- **Corner Style:** square (0).
- **Background:** thermal label, ink text.
- **Border:** 2px ink.
- **Shadow Strategy:** none (see Elevation).
- **Internal Padding:** 12px on product labels, 16px on list and plan panels.
- **Structure (product label):** photo well 10rem high closed by a 2px rule; name; the routing block; then "how" line, tone badges, manifest, other bundles, and price history once it exists, divided by a hairline.
- **Icon toggles:** 36px (44px coarse) square buttons with a 2px border at the photo's top right: watch (pressed fills hi-vis, star filled) and add-to-list (pressed fills saving green with a check).

### Routing Block (signature)
Today's price, reversed: an ink block with label-coloured condensed price, flush left under a 2px rule. Beside it, right-aligned, what it is compared against: a Label Caps caption ("Alone", "Parts", "Was") over the struck-through comparison price. The plan total uses the same block at 2.5rem. At night it flips to a light block with dark figures.

### Manifest (signature)
The winning bundle counted out like a consignment note. A 2px-ruled box: "Consignment" in small Label Caps over the bundle SKU in condensed bold, then one row per part with "PCS n/N" (or a range "PCS 2–3/4") right-aligned in condensed bold. The product being viewed is the marked line: pale saving-green fill and semibold. When the manifest links to the store, it takes the label-tint fill on hover.

### Tone Badges
Solid, square, condensed caps (0.8125rem, 0.06em). Three tones only: good (saving green on label-coloured text), warn (hi-vis on hi-vis ink), bad (signal red). A badge that carries a caveat shows a help cursor and a title, and repeats the caveat to screen readers.

### Chips (filters and departments)
- **Style:** full-width 2px-ruled ink-on-label rows, 36px (44px coarse), name left in semibold, result count right in medium weight.
- **Hover:** label-tint fill.
- **Pressed:** reversed (ink fill, label text). The watch-list chip presses to hi-vis instead.
- **Disabled:** when a filter would give nothing, the chip shows 0, dims to 60% stock with muted text, turns its border dashed, uses a not-allowed cursor, and prints the reason under it on the carton in the rail ("Needs price changes; history is still building", "Star items to add them"); on the phone chip row the reason is the title.
- **Phone:** the same chips in a single horizontal row with the edge fade.

### Inputs / Fields
- **Style:** 40px (44px coarse), 2px ink border, label fill, square, search icon inset left and clear button inset right.
- **In the bar:** translucent bar-ink fill with a 40% bar-muted border and bar-ink text; focus outline goes hi-vis.
- **Focus:** a 2px solid ring offset 2px, ink in light mode and hi-vis in dark mode (global `:focus-visible`).
- **Autocomplete:** a 2px-ruled popover with the overlay drop, groups headed in Label Caps, active suggestion filled hi-vis, matched text bolded, keyboard hints in small ruled keycaps.
- **Selects:** square 2px-ruled triggers and content.

### Buttons
- **Shape:** square (0), 40px.
- **Primary:** ink fill, label text ("Try again", "Clear all filters", "Use the shared list").
- **Outline:** 2px ink border on label fill, label-tint on hover ("Show more", "Undo", "Clear list").
- **Ghost:** no border, label-tint hover; on a hi-vis notice the hover is 10% hi-vis ink.
- **Destructive actions** (clear list) are separated from the list and come with an Undo, never a confirm-and-forget.

### Navigation (Black Bar)
Bar black, the mark and condensed extra-bold wordmark at left. Tabs are condensed caps in bar-muted, bar-ink on hover; the current tab is a reversed block (bar-ink fill, bar text). The List tab carries a hi-vis count pip. RSS, source and theme toggle are 40px bar-muted icon buttons at the right. On phones the tabs drop to a full-width row under the wordmark. The footer reuses the bar: muted text, bar-ink underlined links, the unofficial disclaimer capped at 54ch.

### Hi-Vis Handling Band
A full-width yellow strip directly under the bar, condensed caps 0.875rem: "Unofficial price tracker", when prices were pulled, days tracked and when usual prices start, and the current view's headline stat. Entries are spaced 24px apart and shorten on phones ("Day 2 of 14"). It holds status and caveats only; it is never a promotion.

### Sparkline
A 36px step line in ink at 1.5px with an 8% ink area fill, ending in a small square dot at today's price, ringed in label stock. Drawn only once the price has actually moved; a flat history shows no chart.

## Do's and Don'ts

### Do:
- **Do** build every new surface out of label stock on carton: label fill, 2px ink border, square corners, no shadow.
- **Do** print the deciding number in a routing block (ink fill, condensed bold, tabular figures) with its comparison beside it.
- **Do** put the caveat next to the number it qualifies, as a "how" line, a badge title or a band entry.
- **Do** show a filter's result count on the chip, and when it is 0, disable it with a dashed border and say why.
- **Do** keep green for savings, red for dearer or above usual, and hi-vis yellow for take-note, in both themes.
- **Do** grow touch targets to 44px on coarse pointers.

### Don't:
- **Don't** use rounded corners, soft cards or drop shadows on labels, chips, buttons or badges; the only shadow is the floating autocomplete list.
- **Don't** colour anything for decoration, including a blue or brand accent; there are three signal colours and they mean one thing each.
- **Don't** use red for errors, destructive actions or emphasis; red means dearer than the parts or above the usual price.
- **Don't** add a third size inside a label to rank things; use weight, condensed caps or reversal.
- **Don't** draw a sparkline for a price that has not moved.
- **Don't** change the black bar or the hi-vis band between light and dark mode.
- **Don't** borrow 4WD Supacentre or Adventure Kings logos, colours or branding; the site's own mark is the hi-vis tag.
