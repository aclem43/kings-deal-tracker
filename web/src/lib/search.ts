import { shortName, type Item } from "./data";

export const queryWords = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);

// Relevance for the autocomplete: an exact SKU wins, then words that start the product's
// short name or one of its words, then matches anywhere in the full listing text.
function score(p: Item, words: string[]): number {
  const title = shortName(p.n).toLowerCase();
  const name = p.n.toLowerCase();
  const depts = p.d.join(" ").toLowerCase();
  const cats = p.c.join(" ").toLowerCase();
  // Spare parts and accessories mention the thing they fit ("Fridge Cover"), so a search
  // for "fridge" should show fridges first unless the search asks for parts.
  const wantsParts = words.some((w) => w.startsWith("part") || w.startsWith("spare") || w.startsWith("cover"));
  let s = 0;
  if (!wantsParts && (p.d.includes("Spare Parts") || /^part\b|\bcover\b/i.test(title))) s -= 3;
  for (const w of words) {
    // Being in a department named for the search ("Fridge/Freezers") beats mentioning it.
    if (depts.includes(w)) s += 3;
    else if (cats.includes(w)) s += 1;
    if (p.s.toLowerCase() === w) s += 100;
    else if (title.startsWith(w)) s += 5;
    else if (title.includes(" " + w)) s += 4;
    else if (title.includes(w)) s += 3;
    else if (name.includes(w)) s += 2;
    else s += 1;
  }
  return s + (p.st ? 0.5 : 0);
}

export function rankMatches<T extends Item>(items: T[], q: string, limit: number): T[] {
  const words = queryWords(q);
  if (!words.length) return [];
  return items
    .filter((p) => words.every((w) => p.hay.includes(w)))
    .map((p) => ({ p, s: score(p, words) }))
    .sort((a, b) => b.s - a.s || a.p.n.length - b.p.n.length)
    .slice(0, limit)
    .map((x) => x.p);
}

export function matchLabels(labels: string[], q: string, limit: number): string[] {
  const words = queryWords(q);
  if (!words.length) return [];
  return labels.filter((l) => words.every((w) => l.toLowerCase().includes(w))).slice(0, limit);
}

// Split text into plain and matched runs so the matched words can be emphasised.
export function highlight(text: string, q: string): { t: string; m: boolean }[] {
  const words = queryWords(q).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return [{ t: text, m: false }];
  // A capturing split puts the matched runs at the odd indices.
  return text
    .split(new RegExp(`(${words.join("|")})`, "gi"))
    .map((t, i) => ({ t, m: i % 2 === 1 }))
    .filter((r) => r.t);
}
