// Shapes of _site/data.json as written by scraper/build.py (short keys keep the file small).

export type View = "products" | "bundles" | "list";

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
  o?: [string, number, number][]; // own price change points: date, price, in stock 0/1 (older data.json files don't have it)
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
  kq?: number[]; // how many of each part (older data.json files don't have it)
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
// A real but tiny saving reads "<1%", never "0%".
export const pct = (v: number) => {
  const r = Math.round(Math.abs(v) * 100);
  return (r === 0 && v !== 0 ? "<1" : String(r)) + "%";
};
export const daysAgo = (iso: string) => Math.round((today.getTime() - new Date(iso).getTime()) / DAY);
// "2026-11-19" -> "19 Nov", read as a calendar date, not shifted by the viewer's time zone.
export const shortDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" });
export const shortName = (n: string) => n.split("|")[0].trim();

// Bundle part names come as "Kings Lantern ×4"; split off the count.
export function splitQty(s: string): { name: string; qty: number } {
  const m = s.match(/^(.*?)\s*×(\d+)$/);
  return m ? { name: m[1], qty: +m[2] } : { name: s, qty: 1 };
}


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
// `hint` says what a number is measured against; it shows as the badge's tooltip.
export interface BadgeInfo { text: string; tone: Tone; hint?: string }

export const USUAL_HINT = "Usual price: the median price over the last 90 days";

export function historyBadges(p: Item): BadgeInfo[] {
  const out: BadgeInfo[] = [];
  const bt = p.belowTypical;
  if (bt != null && bt >= 0.02) out.push({ text: `${pct(bt)} below usual`, tone: "good", hint: USUAL_HINT });
  if (p.atLow) out.push({ text: "All-time low", tone: "good", hint: "The lowest price seen since tracking began" });
  if (p.recentDrop && bt == null) out.push({ text: `Down ${pct(p.dropPct)}`, tone: "good", hint: `Compared with the previous price, ${money(p.pv!)}` });
  if (bt != null && bt <= -0.02) out.push({ text: `${pct(-bt)} above usual`, tone: "bad", hint: USUAL_HINT });
  if (!p.st) out.push({ text: "Out of stock", tone: "warn" });
  return out;
}

export function productBadges(p: Product): BadgeInfo[] {
  const out = historyBadges(p);
  if (p.via) {
    out.unshift(p.sv >= 0.01
      ? { text: `${pct(p.sv)} less than alone`, tone: "good", hint: `Compared with the store's own price for it alone today, ${money(p.sp)}` }
      : { text: "Extras free", tone: "good", hint: "Same price as buying it alone, with extra items included" });
  }
  return out;
}

export function bundleBadges(p: Bundle): BadgeInfo[] {
  const out = historyBadges(p);
  if (p.ps) {
    const hint = `Compared with buying each part on its own today, ${money(p.ps)}`;
    if (p.sv < -0.005) out.unshift({ text: `${money(p.p - p.ps)} more than parts`, tone: "bad", hint });
    else if (p.sv > 0.005) out.unshift({ text: `${pct(p.sv)} off the parts`, tone: "good", hint });
  }
  return out;
}

// Only says something once the price has moved or a usual price exists; until then the
// header band explains that history is still building, so cards stay quiet.
export function statsLine(p: Item): string {
  return [
    p.hi > p.lo ? `Low ${money(p.lo)} · High ${money(p.hi)}` : "",
    p.ty ? `Usual ${money(p.ty)}` : "",
  ].filter(Boolean).join(" · ");
}

export const hasHistory = (p: Item) => p.hi > p.lo || p.ty != null;

export function imageUrl(p: Item): string {
  return p.i ? `${p.i}?width=320&height=240&fit=bounds&quality=75` : "";
}

export const thumbUrl = (src: string) => (src ? `${src}?width=96&height=96&fit=bounds&quality=70` : "");

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
