import { reactive } from "vue";
import type { View } from "@/lib/data";

// Filter state lives in the URL hash so a view can be shared. The format matches the
// original site (and the RSS feed's #q=SKU links): only non-default values are written.

export type SortKey = "deal" | "save" | "drop" | "price-asc" | "price-desc" | "new" | "name";

export const SORTS: { value: SortKey; label: string }[] = [
  { value: "deal", label: "Best deal" },
  { value: "save", label: "Biggest bundle saving" },
  { value: "drop", label: "Biggest recent drop" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "new", label: "Newest listings" },
  { value: "name", label: "Name" },
];

const TEXT = ["q", "dept", "sub", "sort"] as const;
const FLAGS = ["instock", "viabundle", "antideal", "atl", "dropped", "watchonly"] as const;
export type Flag = (typeof FLAGS)[number];

export interface FilterState {
  view: View;
  has: string;
  q: string;
  dept: string;
  sub: string;
  sort: SortKey;
  instock: boolean;
  viabundle: boolean;
  antideal: boolean;
  atl: boolean;
  dropped: boolean;
  watchonly: boolean;
}

const DEFAULTS: FilterState = {
  view: "products", has: "", q: "", dept: "", sub: "", sort: "deal",
  instock: true, viabundle: false, antideal: false, atl: false, dropped: false, watchonly: false,
};

const state = reactive<FilterState>({ ...DEFAULTS });

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  state.view = h.get("view") === "bundles" ? "bundles" : "products";
  state.has = h.get("has") || "";
  for (const k of TEXT) (state[k] as string) = h.get(k) ?? DEFAULTS[k];
  if (!SORTS.some((s) => s.value === state.sort)) state.sort = "deal";
  for (const k of FLAGS) state[k] = h.has(k) ? h.get(k) === "1" : DEFAULTS[k];
}

function writeHash() {
  const h = new URLSearchParams();
  if (state.view !== "products") h.set("view", state.view);
  if (state.has && state.view === "bundles") h.set("has", state.has);
  for (const k of TEXT) if (state[k] !== DEFAULTS[k]) h.set(k, state[k]);
  for (const k of FLAGS) if (state[k] !== DEFAULTS[k]) h.set(k, state[k] ? "1" : "0");
  const s = h.toString();
  history.replaceState(null, "", s ? "#" + s : location.pathname + location.search);
}

function setView(v: View) {
  if (state.view === v) return;
  Object.assign(state, { view: v, has: "", dept: "", sub: "" });
}

function setDept(d: string) {
  Object.assign(state, { dept: d, sub: "" });
}

export function useFilters() {
  return { state, readHash, writeHash, setView, setDept };
}
