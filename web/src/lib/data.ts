// Shapes of _site/data.json as written by scraper/build.py (short keys keep the file small).

export type View = "products" | "bundles";

interface BaseRaw {
  s: string;        // sku
  n: string;        // name
  u: string;        // url
  i: string;        // image
  d: string[];      // departments
  c: string[];      // categories
  f: string | null; // first seen (ISO date)
  p: number;        // current price (effective price for products)
  st: number;       // in stock (0/1)
  sv: number;       // saving as a fraction
  lo: number;
  hi: number;
  ty: number | null; // usual (typical) price
  pv: number | null; // previous price
  pd: string | null; // date of last change
  h: [string, number][]; // history
}

export interface BundleOption {
  s: string;
  u: string;
  p: number;
  st: number;
  x: string[]; // the other things in the bundle
  q: number;   // how many of this product it contains
}

export interface ProductRaw extends BaseRaw {
  sp: number;  // price on its own
  sst: number; // in stock on its own
  via: string; // bundle sku when that is the cheapest way, else ""
  nb: number;  // number of bundles that contain it
  b: BundleOption[];
}

export interface BundleRaw extends BaseRaw {
  ps: number;  // parts bought separately
  k: string[]; // part skus
  x: string[]; // part names
}

interface Derived {
  recentDrop: boolean;
  dropPct: number;
  belowTypical: number | null;
  atLow: boolean;
  hay: string;
}

export type Product = ProductRaw & Derived;
export type Bundle = BundleRaw & Derived;
export type Item = Product | Bundle;

export interface Payload {
  generated: string;
  trackedSince: string;
  minDaysForTypical: number;
  products: ProductRaw[];
  bundles: BundleRaw[];
}

export const RECENT_DAYS = 14;
export const DAY = 86400000;
export const today = new Date(new Date().toISOString().slice(0, 10));

export const money = (v: number) =>
  "$" + v.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pct = (v: number) => Math.round(v * 100) + "%";
export const daysAgo = (iso: string) => Math.round((today.getTime() - new Date(iso).getTime()) / DAY);
export const shortName = (n: string) => n.split("|")[0].trim();

export function enrich<T extends BaseRaw>(p: T): T & Derived {
  const dropped = p.pv != null && p.p < p.pv;
  return Object.assign(p, {
    recentDrop: dropped && !!p.pd && daysAgo(p.pd) <= RECENT_DAYS,
    dropPct: dropped ? (p.pv! - p.p) / p.pv! : 0,
    belowTypical: p.ty ? (p.ty - p.p) / p.ty : null,
    atLow: p.hi > p.lo && p.p <= p.lo,
    hay: (p.n + " " + p.s + " " + p.c.join(" ")).toLowerCase(),
  });
}

export const isProduct = (p: Item): p is Product => "via" in p;

export type Tone = "good" | "warn" | "bad";
export interface BadgeInfo { text: string; tone: Tone }

export function historyBadges(p: Item): BadgeInfo[] {
  const out: BadgeInfo[] = [];
  const bt = p.belowTypical;
  if (bt != null && bt >= 0.02) out.push({ text: `${pct(bt)} below usual`, tone: "good" });
  if (p.atLow) out.push({ text: "All-time low", tone: "good" });
  if (p.recentDrop && bt == null) out.push({ text: `Down ${pct(p.dropPct)}`, tone: "good" });
  if (bt != null && bt <= -0.02) out.push({ text: `${pct(-bt)} above usual`, tone: "warn" });
  if (!p.st) out.push({ text: "Out of stock", tone: "warn" });
  return out;
}

export function productBadges(p: Product): BadgeInfo[] {
  const out = historyBadges(p);
  if (p.via) {
    out.unshift(p.sv >= 0.01
      ? { text: `${pct(p.sv)} less than alone`, tone: "good" }
      : { text: "Extras free", tone: "good" });
  }
  return out;
}

export function bundleBadges(p: Bundle): BadgeInfo[] {
  const out = historyBadges(p);
  if (p.ps) {
    if (p.sv < -0.005) out.unshift({ text: `${money(p.p - p.ps)} more than parts`, tone: "bad" });
    else if (p.sv > 0.005) out.unshift({ text: `${pct(p.sv)} off the parts`, tone: "good" });
  }
  return out;
}

export function statsLine(p: Item): string {
  return [
    p.hi > p.lo ? `Low ${money(p.lo)} · High ${money(p.hi)}` : "No price change seen yet",
    p.ty ? `Usual ${money(p.ty)}` : "",
  ].filter(Boolean).join(" · ");
}

export function imageUrl(p: Item): string {
  return p.i ? `${p.i}?width=320&height=240&fit=bounds&quality=75` : "";
}

export async function loadData() {
  const res = await fetch("data.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = (await res.json()) as Payload;
  return {
    meta: payload,
    products: payload.products.map(enrich) as Product[],
    bundles: payload.bundles.map(enrich) as Bundle[],
  };
}
