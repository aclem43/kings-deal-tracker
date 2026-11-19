import type { Bundle, Product } from "./data";
import { optimise } from "./optimise";

// What a shopping list would have cost on each past day: the plan re-run on the prices
// and stock every listing had that day. Today's point is the same plan the page shows,
// so the history ends exactly on the headline total.

export interface ListPoint {
  d: string;         // ISO date the total started
  total: number;
  complete: boolean; // every item could be bought that day
}

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
    const point = { d: day, total: plan.total, complete: !plan.unavailable.length };
    const last = out[out.length - 1];
    if (!last || last.total !== point.total || last.complete !== point.complete) out.push(point);
  }
  return out;
}
