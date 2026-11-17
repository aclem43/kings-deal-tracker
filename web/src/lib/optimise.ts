import type { Bundle, Product } from "./data";

// Find the cheapest set of in-stock listings (products on their own, or bundles)
// that covers every item on a shopping list, with quantities. Extras that come in
// a bundle are fine: they're free stuff, not a cost.
//
// This is a small weighted set-cover problem. Lists are short, so we solve it
// exactly with a memoised search over "what's still needed", always branching on
// the remaining item with the fewest ways to buy it. Only the part of each bundle
// that matters to this list is considered, and among listings that cover exactly
// the same things only the cheapest is kept, which shrinks the search a lot.
// If a list is ever big enough to blow the step budget, we fall back to a greedy
// answer and say so.

export interface Listing {
  s: string;
  n: string;
  u: string;
  i: string;
  p: number;
  bundle: boolean;
  parts: [string, number][]; // every part and quantity in the listing
}

export interface Buy {
  listing: Listing;
  count: number;              // how many of this listing to buy
  covers: [string, number][]; // list items (sku, qty) this purchase takes care of
  extras: [string, number][]; // what else comes with it
}

export interface Plan {
  buys: Buy[];
  total: number;
  separate: number | null; // every item bought on its own, if all are in stock alone
  unavailable: string[];   // list items with no in-stock way to buy them
  exact: boolean;
}

interface Cand {
  listing: Listing;
  vec: [number, number][]; // [index into needs, qty it provides]
}

const STEP_BUDGET = 300_000;

export function optimise(
  needs: Map<string, number>,
  products: Map<string, Product>,
  bundles: Bundle[],
): Plan {
  const unavailable: string[] = [];
  let separate: number | null = 0;

  // Standalone listings for each wanted product.
  const own: Listing[] = [];
  for (const [sku, qty] of needs) {
    const p = products.get(sku);
    if (!p) continue;
    if (p.sst) own.push({ s: p.s, n: p.n, u: p.u, i: p.i, p: p.sp, bundle: false, parts: [[p.s, 1]] });
    if (separate != null) separate = p.sst ? separate + p.sp * qty : null;
  }

  const skus = [...needs.keys()];
  const index = new Map(skus.map((s, i) => [s, i]));

  // Every in-stock listing that contains something we want, reduced to the part
  // that matters here. Keep the cheapest listing for each distinct coverage.
  const best = new Map<string, Cand>();
  const consider = (l: Listing) => {
    const vec: [number, number][] = [];
    for (const [s, q] of l.parts) {
      const i = index.get(s);
      if (i != null) vec.push([i, Math.min(q, needs.get(s)!)]);
    }
    if (!vec.length) return;
    vec.sort((a, b) => a[0] - b[0]);
    const key = vec.map((v) => v.join("x")).join(",");
    const cur = best.get(key);
    if (!cur || l.p < cur.listing.p) best.set(key, { listing: l, vec });
  };
  own.forEach(consider);
  for (const b of bundles) {
    if (!b.st || !b.k.some((s) => index.has(s))) continue;
    consider({
      s: b.s, n: b.n, u: b.u, i: b.i, p: b.p, bundle: true,
      parts: b.k.map((s, j) => [s, b.kq?.[j] ?? 1]),
    });
  }
  const cands = [...best.values()];

  // Items nobody sells in stock can't be planned for; drop them from the search.
  const byItem: Cand[][] = skus.map(() => []);
  for (const c of cands) for (const [i] of c.vec) byItem[i].push(c);
  const start = skus.map((s, i) => (byItem[i].length ? needs.get(s)! : 0));
  skus.forEach((s, i) => { if (!byItem[i].length) unavailable.push(s); });
  for (const list of byItem) list.sort((a, b) => a.listing.p - b.listing.p);

  let picks: Cand[];
  let exact = true;
  try {
    picks = solveExact(start, byItem);
  } catch {
    picks = solveGreedy(start, cands);
    exact = false;
  }

  // Turn the picks into purchases: what each one covers, and what else it brings.
  // The same listing can be picked more than once (two of a bundle); show it once with a count.
  const rem = new Map(skus.map((s, i) => [s, start[i]]));
  const bySku = new Map<string, { listing: Listing; count: number; covers: Map<string, number>; extras: Map<string, number> }>();
  for (const c of picks.sort((a, b) => b.listing.p - a.listing.p)) {
    let b = bySku.get(c.listing.s);
    if (!b) bySku.set(c.listing.s, (b = { listing: c.listing, count: 0, covers: new Map(), extras: new Map() }));
    b.count++;
    for (const [s, q] of c.listing.parts) {
      const use = Math.min(q, rem.get(s) ?? 0);
      if (use) { b.covers.set(s, (b.covers.get(s) ?? 0) + use); rem.set(s, rem.get(s)! - use); }
      if (q > use) b.extras.set(s, (b.extras.get(s) ?? 0) + q - use);
    }
  }
  const buys: Buy[] = [...bySku.values()].map((b) => ({
    listing: b.listing, count: b.count, covers: [...b.covers], extras: [...b.extras],
  }));

  return {
    buys,
    total: Math.round(buys.reduce((t, b) => t + b.listing.p * b.count, 0) * 100) / 100,
    separate: unavailable.length ? null : separate,
    unavailable,
    exact,
  };
}

function solveExact(start: number[], byItem: Cand[][]): Cand[] {
  type Memo = { cost: number; pick: Cand | null; next: string };
  const memo = new Map<string, Memo>();
  let steps = 0;

  const solve = (rem: number[]): number => {
    const key = rem.join(",");
    const hit = memo.get(key);
    if (hit) return hit.cost;

    // Branch on the outstanding item with the fewest ways to buy it: some purchase must cover it.
    let pick = -1;
    for (let i = 0; i < rem.length; i++) {
      if (rem[i] > 0 && (pick < 0 || byItem[i].length < byItem[pick].length)) pick = i;
    }
    if (pick < 0) {
      memo.set(key, { cost: 0, pick: null, next: "" });
      return 0;
    }

    let bestCost = Infinity, bestCand: Cand | null = null, bestNext = "";
    for (const c of byItem[pick]) {
      if (++steps > STEP_BUDGET) throw new Error("budget");
      if (c.listing.p >= bestCost) break; // sorted by price: nothing cheaper follows
      const next = rem.slice();
      for (const [i, q] of c.vec) next[i] = Math.max(0, next[i] - q);
      const cost = c.listing.p + solve(next);
      if (cost < bestCost) { bestCost = cost; bestCand = c; bestNext = next.join(","); }
    }
    memo.set(key, { cost: bestCost, pick: bestCand, next: bestNext });
    return bestCost;
  };

  solve(start);
  const out: Cand[] = [];
  for (let m = memo.get(start.join(",")); m?.pick; m = memo.get(m.next)) out.push(m.pick);
  return out;
}

function solveGreedy(start: number[], cands: Cand[]): Cand[] {
  const rem = start.slice();
  const out: Cand[] = [];
  while (rem.some((r) => r > 0)) {
    let best: Cand | null = null, bestRate = Infinity;
    for (const c of cands) {
      const units = c.vec.reduce((t, [i, q]) => t + Math.min(q, rem[i]), 0);
      if (units && c.listing.p / units < bestRate) { bestRate = c.listing.p / units; best = c; }
    }
    if (!best) break;
    out.push(best);
    for (const [i, q] of best.vec) rem[i] = Math.max(0, rem[i] - q);
  }
  return out;
}
