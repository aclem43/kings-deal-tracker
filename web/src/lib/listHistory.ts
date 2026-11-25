import type { Bundle, Product } from "./data";
import { optimise, type Buy } from "./optimise";

// What a shopping list would have cost on each past day: the plan re-run on the prices
// and stock every listing had that day. Today's point is the same plan the page shows,
// so the history ends exactly on the headline total.

export interface ListPoint {
  d: string;         // ISO date the total started
  total: number;
  complete: boolean; // every item could be bought that day
  buys: Buy[];       // how that total was made up (on its own, or which bundles)
  separate: number | null; // every item bought on its own that day, if all were in stock alone
}

// Two plans are the same purchase when they buy the same listings the same number of times.
const planKey = (buys: Buy[]) => buys.map((b) => `${b.listing.s}x${b.count}`).sort().join(",");

// The change point in effect on `day` (dates sort as strings), or null before the listing existed.
function at(o: [string, number, number][], day: string) {
  let hit: [string, number, number] | null = null;
  for (const pt of o) {
    if (pt[0] > day) break;
    hit = pt;
  }
  return hit;
}

export function listHistory(needs: Map<string, number>, bySku: Map<string, Product>, bundles: Bundle[]): ListPoint[] {
  const items = [...needs.keys()].map((s) => bySku.get(s)).filter((p): p is Product => !!p);
  if (!items.length || items.some((p) => !p.o)) return [];
  const related = bundles.filter((b) => b.o && b.k.some((s) => needs.has(s)));

  // The plan can only change on a day one of these listings changed.
  const days = [...new Set([...items, ...related].flatMap((l) => l.o!.map((pt) => pt[0])))].sort();

  const out: ListPoint[] = [];
  for (const day of days) {
    const prods = new Map<string, Product>();
    for (const p of items) {
      const pt = at(p.o!, day);
      prods.set(p.s, { ...p, sp: pt?.[1] ?? 0, sst: pt?.[2] ?? 0 });
    }
    const bs = related.map((b) => {
      const pt = at(b.o!, day);
      return { ...b, p: pt?.[1] ?? 0, st: pt?.[2] ?? 0 };
    });
    const plan = optimise(needs, prods, bs);
    const point = { d: day, total: plan.total, complete: !plan.unavailable.length, buys: plan.buys, separate: plan.separate };
    const last = out[out.length - 1];
    // A new row when the total moves, or when the same total now comes a different way.
    if (!last || last.total !== point.total || last.complete !== point.complete
      || planKey(last.buys) !== planKey(point.buys) || last.separate !== point.separate) out.push(point);
  }
  return out;
}
