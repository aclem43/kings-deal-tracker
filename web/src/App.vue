<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";
import { useColorMode, useEventListener, useIntersectionObserver } from "@vueuse/core";
import { ArrowDownUp, ArrowLeft, Moon, PackageSearch, RotateCw, Rss, Sun, SunMoon, X } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLogo from "@/components/AppLogo.vue";
import FilterBar from "@/components/FilterBar.vue";
import FilterRail from "@/components/FilterRail.vue";
import ProductSearch from "@/components/ProductSearch.vue";
import ProductCard from "@/components/ProductCard.vue";
import BundleCard from "@/components/BundleCard.vue";
import ShoppingList from "@/components/ShoppingList.vue";
import { daysAgo, isProduct, shortName, type Bundle, type Item, type Payload, type Product, type View, loadData } from "@/lib/data";
import { SORTS, useFilters, type Flag } from "@/composables/useFilters";
import { queryWords } from "@/lib/search";
import { useWatchList } from "@/composables/useWatchList";
import { useShoppingList } from "@/composables/useShoppingList";

const PAGE = 60;
// Scrolling loads more on its own up to this many; after that "Show more" asks, so the
// footer (the unofficial disclaimer, feed and source) can still be reached.
const AUTO_LIMIT = PAGE * 3;
const REPO = "https://github.com/aclem43/kings-deal-tracker";

const { state, readHash, writeHash, resetFilters } = useFilters();
const watchList = useWatchList();
const shopping = useShoppingList();
const listCount = computed(() => Object.keys(shopping.items.value).filter((s) => bySku.value.has(s)).length);

const meta = shallowRef<Payload | null>(null);
const products = shallowRef<Product[]>([]);
const bundles = shallowRef<Bundle[]>([]);
const error = ref("");
const loading = ref(true);

const bySku = computed(() => new Map(products.value.map((p) => [p.s, p])));
const known = computed(() => new Set([...products.value, ...bundles.value].map((p) => p.s)));
const watchCount = computed(() => [...watchList.set.value].filter((s) => known.value.has(s)).length);

const list = computed<Item[]>(() => (state.view === "products" ? products.value : bundles.value));

/* ---------- filtering ---------- */

// One test per filter, so each filter's count can be worked out with the others applied.
type Test = (p: Item) => boolean;
const tests = computed(() => {
  const { view, has, dept, sub } = state;
  const w = watchList.set.value;
  const flag: Record<Flag, Test> = {
    watchonly: (p) => w.has(p.s),
    instock: (p) => !!p.st,
    atl: (p) => p.atLow,
    dropped: (p) => p.recentDrop,
    viabundle: (p) => view !== "products" || !!(p as Product).via,
    antideal: (p) => view !== "bundles" || p.sv < -0.005,
  };
  const other = {
    has: ((p) => view !== "bundles" || !has || (p as Bundle).k.includes(has)) as Test,
    dept: ((p) => !dept || p.d.includes(dept)) as Test,
    sub: ((p) => !sub || p.c.includes(sub)) as Test,
  };
  return { flag, other };
});
const FLAG_KEYS: Flag[] = ["instock", "viabundle", "antideal", "atl", "dropped", "watchonly"];

function passes(p: Item, skip?: string) {
  const t = tests.value;
  for (const k of FLAG_KEYS) if (k !== skip && state[k] && !t.flag[k](p)) return false;
  for (const [k, f] of Object.entries(t.other)) if (k !== skip && !f(p)) return false;
  return true;
}

// Every filter except the search text; the search box suggests from this set.
const pool = computed(() => list.value.filter((p) => passes(p)));

const filtered = computed(() => {
  const words = queryWords(state.q);
  return pool.value.filter((p) => words.every((x) => p.hay.includes(x))).sort(sorters[state.sort] || sorters.deal);
});

// How many results each filter would give with everything else as it is.
const flagCounts = computed(() => {
  const words = queryWords(state.q);
  const match = (p: Item) => words.every((x) => p.hay.includes(x));
  const out = {} as Record<Flag, number>;
  for (const k of FLAG_KEYS) {
    const f = tests.value.flag[k];
    out[k] = list.value.reduce((n, p) => n + (passes(p, k) && match(p) && f(p) ? 1 : 0), 0);
  }
  return out;
});

const deptCounts = computed(() => {
  const words = queryWords(state.q);
  const counts = new Map<string, number>();
  for (const p of list.value) for (const d of p.d) counts.set(d, counts.get(d) ?? 0);
  for (const p of list.value) {
    if (passes(p, "dept") && words.every((x) => p.hay.includes(x))) for (const d of p.d) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return [...counts].map(([name, n]) => ({ name, n })).sort((a, b) => a.name.localeCompare(b.name));
});
const subs = computed(() => {
  const s = new Set<string>();
  for (const p of list.value) if (!state.dept || p.d.includes(state.dept)) p.c.forEach((c) => s.add(c));
  return [...s].sort();
});
// Drop a department or category the current view doesn't have (e.g. from an old link).
watch([deptCounts, subs, loading], () => {
  if (loading.value) return;
  if (state.dept && !deptCounts.value.some((d) => d.name === state.dept)) state.dept = "";
  if (state.sub && !subs.value.includes(state.sub)) state.sub = "";
});

/* ---------- sorting ---------- */

const dealScore = (p: Item) => (p.belowTypical ?? 0) * 10 + p.sv + (isProduct(p) ? p.dropPct : 0);
const sorters: Record<string, (a: Item, b: Item) => number> = {
  deal: (a, b) => dealScore(b) - dealScore(a) || a.p - b.p,
  save: (a, b) => b.sv - a.sv || a.p - b.p,
  drop: (a, b) => b.dropPct - a.dropPct || a.p - b.p,
  "price-asc": (a, b) => a.p - b.p,
  "price-desc": (a, b) => b.p - a.p,
  new: (a, b) => (b.f || "").localeCompare(a.f || "") || a.n.localeCompare(b.n),
  name: (a, b) => a.n.localeCompare(b.n),
};

/* ---------- active filters, for the empty state ---------- */

const FLAG_LABEL: Record<Flag, string> = {
  instock: "In stock only", viabundle: "Cheaper in a bundle", antideal: "Dearer than its parts",
  atl: "At all-time low", dropped: "Recently dropped", watchonly: "Watch list",
};
const activeFilters = computed(() => {
  const out: { label: string; clear: () => void }[] = [];
  if (state.q) out.push({ label: `Search “${state.q}”`, clear: () => { state.q = ""; } });
  if (hasBase.value) out.push({ label: `Containing ${shortName(hasBase.value.n)}`, clear: () => { state.has = ""; } });
  if (state.dept) out.push({ label: state.dept, clear: () => { state.dept = ""; state.sub = ""; } });
  if (state.sub) out.push({ label: state.sub, clear: () => { state.sub = ""; } });
  for (const k of FLAG_KEYS) if (state[k] && tests.value.flag[k] && (k !== "viabundle" || state.view === "products") && (k !== "antideal" || state.view === "bundles")) {
    out.push({ label: FLAG_LABEL[k], clear: () => { state[k] = false; } });
  }
  return out;
});

/* ---------- paging ---------- */

const shown = ref(PAGE);
const visible = computed(() => filtered.value.slice(0, shown.value));
const hasMore = computed(() => shown.value < filtered.value.length);
const more = () => { shown.value += PAGE; };

// New filters start from the top; starring or un-starring keeps the pages already loaded.
watch(state, () => { shown.value = PAGE; writeHash(); }, { deep: true });

const sentinel = useTemplateRef<HTMLElement>("sentinel");
useIntersectionObserver(sentinel, ([e]) => { if (e?.isIntersecting && hasMore.value && shown.value < AUTO_LIMIT) more(); }, { rootMargin: "800px" });

/* ---------- header bits ---------- */

const hasBase = computed(() => (state.view === "bundles" && state.has ? bySku.value.get(state.has) : undefined));

// A link to one product (#q=SKU, as the RSS feed and search write them) leads with that product.
const focusItem = computed(() => {
  const q = state.q.trim().toLowerCase();
  if (!q || q.includes(" ")) return undefined;
  return list.value.find((p) => p.s.toLowerCase() === q);
});

const status = computed(() => {
  const m = meta.value;
  if (!m) return null;
  const days = daysAgo(m.trackedSince) + 1;
  const d = new Date(m.generated);
  return {
    updated: d.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
    days,
    building: days < m.minDaysForTypical,
    minDays: m.minDaysForTypical,
    cheaper: products.value.filter((p) => p.via).length,
    products: products.value.length,
    bundleWins: bundles.value.filter((b) => b.ps && b.sv > 0.005).length,
    bundles: bundles.value.length,
  };
});

const viewStat = computed(() => {
  const s = status.value;
  if (!s) return "";
  if (state.view === "products") return `${s.cheaper} of ${s.products} products cheapest inside a bundle`;
  if (state.view === "bundles") return `${s.bundleWins.toLocaleString()} of ${s.bundles.toLocaleString()} bundles cost less than their parts`;
  return "";
});

const sortNote = computed(() => {
  if (state.sort !== "deal" || !status.value?.building) return "";
  return `Ranked by bundle saving until usual prices exist (day ${status.value.minDays})`;
});

const mode = useColorMode({ emitAuto: true });
const nextMode = { auto: "light", light: "dark", dark: "auto" } as const;
const modeLabel = computed(() => ({ auto: "Theme: system", light: "Theme: light", dark: "Theme: dark" })[mode.value as "auto"]);

const INTRO: Record<View, { title: string; text: string }> = {
  products: {
    title: "Today's cheapest way to buy it",
    text: "Every 4WD Supacentre product at its lowest in-stock price today, on its own or inside a bundle that includes it.",
  },
  bundles: { title: "Bundles against their parts", text: "Every bundle listing, compared with buying its parts separately, including the ones that cost more." },
  list: { title: "Shopping list", text: "Add what you want and get the cheapest mix of bundles and single items that covers all of it." },
};
const intro = computed(() => INTRO[state.view]);

const TABS: { view: View; label: string; href: string }[] = [
  { view: "products", label: "Products", href: "#" },
  { view: "bundles", label: "Bundles", href: "#view=bundles" },
  { view: "list", label: "List", href: "#view=list" },
];

/* ---------- start ---------- */

readHash();
useEventListener(window, "hashchange", () => { readHash(); window.scrollTo(0, 0); });

// "/" jumps to the search box, unless a text field already has focus.
useEventListener(window, "keydown", (e: KeyboardEvent) => {
  if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target as HTMLElement | null;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  const box = [...document.querySelectorAll<HTMLInputElement>("[data-search] input, input[role=combobox]")].find((i) => i.offsetParent);
  if (box) { e.preventDefault(); box.focus(); }
});

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const d = await loadData();
    meta.value = d.meta;
    products.value = d.products;
    bundles.value = d.bundles;
  } catch (e) {
    error.value = navigator.onLine === false
      ? "You're offline, so today's prices couldn't be loaded."
      : `Today's prices couldn't be loaded (${e instanceof Error ? e.message : "unknown error"}).`;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

// "Skip to results" moves focus without touching the hash (the hash holds the filters).
function skipToResults() {
  const el = document.getElementById("results");
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "start" });
}
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <a
      href="#results"
      class="sr-only z-50 bg-hivis px-4 py-2 font-heading font-bold tracking-[0.06em] text-hivis-ink uppercase focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      @click.prevent="skipToResults"
    >Skip to results</a>
    <header class="bg-bar text-bar-ink">
      <div class="mx-auto grid max-w-[90rem] grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6 lg:grid-cols-[auto_auto_1fr_auto]">
        <a href="#" class="flex items-center gap-2.5 font-heading text-lg font-extrabold tracking-[0.04em] whitespace-nowrap uppercase sm:text-xl" title="Kings Deal Tracker home">
          <AppLogo class="size-8 shrink-0" />
          Kings Deal Tracker
        </a>

        <nav aria-label="Views" class="order-last col-span-2 flex gap-1 lg:order-none lg:col-span-1">
          <a
            v-for="t in TABS"
            :key="t.view"
            :href="t.href"
            :aria-current="state.view === t.view ? 'page' : undefined"
            class="flex min-h-10 flex-1 items-center justify-center gap-1.5 px-4 font-heading text-base font-bold tracking-[0.06em] text-bar-muted uppercase hover:text-bar-ink aria-[current=page]:bg-bar-ink aria-[current=page]:text-bar lg:flex-none"
          >
            {{ t.label }}
            <span v-if="t.view === 'list' && listCount" class="bg-hivis px-1.5 font-sans text-xs leading-5 text-hivis-ink">{{ listCount }}</span>
          </a>
        </nav>

        <div class="hidden justify-end lg:flex">
          <ProductSearch
            v-if="state.view !== 'list' && !loading && !error"
            :depts="deptCounts.map((d) => d.name)"
            :subs="subs"
            :pool="pool"
            :focus="!!focusItem"
            class="w-full max-w-md"
            input-class="border-bar-muted/40 bg-bar-ink/10 text-bar-ink placeholder:text-bar-muted focus-visible:outline-hivis"
          />
        </div>

        <div class="flex gap-0.5">
          <a href="feed.xml" class="flex size-10 items-center justify-center text-bar-muted hover:text-bar-ink [&_svg]:size-5" title="RSS feed of price drops" aria-label="RSS feed of price drops"><Rss /></a>
          <a :href="REPO" target="_blank" rel="noopener" class="flex size-10 items-center justify-center text-bar-muted hover:text-bar-ink" title="Source on GitHub" aria-label="Source on GitHub">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-5">
              <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
            </svg>
          </a>
          <button type="button" class="flex size-10 items-center justify-center text-bar-muted hover:text-bar-ink [&_svg]:size-5" :title="modeLabel" :aria-label="modeLabel" @click="mode = nextMode[mode as 'auto']">
            <SunMoon v-if="mode === 'auto'" />
            <Sun v-else-if="mode === 'light'" />
            <Moon v-else />
          </button>
        </div>
      </div>
    </header>

    <!-- the handling band: what this is, how fresh it is, and what the numbers can't say yet -->
    <div class="bg-hivis text-hivis-ink">
      <ul class="mx-auto flex max-w-[90rem] flex-wrap gap-x-6 gap-y-0.5 px-4 py-1.5 font-heading text-sm font-bold tracking-[0.05em] uppercase sm:px-6">
        <li>Unofficial<span class="max-sm:hidden"> price tracker</span></li>
        <template v-if="status">
          <li><span class="max-sm:hidden">Prices pulled </span>{{ status.updated }}</li>
          <li>
            <span class="sm:hidden">Day {{ status.days }}<template v-if="status.building"> of {{ status.minDays }}</template></span>
            <span class="max-sm:hidden">Tracking {{ status.days }} day{{ status.days === 1 ? "" : "s" }}<template v-if="status.building"> · usual prices from day {{ status.minDays }}</template></span>
          </li>
          <li v-if="viewStat" class="max-md:hidden">{{ viewStat }}</li>
        </template>
      </ul>
    </div>

    <main class="mx-auto w-full max-w-[90rem] flex-1 px-4 sm:px-6">
      <!-- loading failed: say why and offer a retry -->
      <div v-if="error" role="alert" class="label-stock mx-auto my-12 flex max-w-lg flex-col items-start gap-3 p-5">
        <h1 class="font-heading text-2xl font-bold uppercase">Prices didn't load</h1>
        <p class="text-sm">{{ error }} The data is a single file refreshed once a day; trying again usually works.</p>
        <Button size="lg" class="rounded-none" @click="load"><RotateCw /> Try again</Button>
      </div>

      <template v-else-if="state.view === 'list'">
        <section class="pt-5 pb-4">
          <h1 class="font-heading text-3xl leading-none font-extrabold text-balance uppercase sm:text-4xl">{{ intro.title }}</h1>
          <p class="mt-1.5 max-w-2xl text-[0.9375rem] text-pretty text-page-muted">{{ intro.text }}</p>
        </section>
        <Skeleton v-if="loading" class="mb-10 h-64 w-full rounded-none" />
        <ShoppingList id="results" tabindex="-1" class="outline-none" v-else :products="products" :bundles="bundles" :by-sku="bySku" :as-of="status?.updated ?? ''" />
      </template>

      <div v-else class="grid gap-x-7 pt-5" :class="!focusItem && 'lg:grid-cols-[15rem_minmax(0,1fr)]'">
        <aside v-if="!focusItem" class="max-lg:hidden">
          <div class="sticky top-4 pb-8">
            <Skeleton v-if="loading" class="h-96 w-full rounded-none" />
            <FilterRail v-else :counts="flagCounts" :watch-count="watchCount" :building="!!status?.building" :min-days="status?.minDays ?? 14" :depts="deptCounts" :subs="subs" />
          </div>
        </aside>

        <div class="min-w-0">
          <!-- a shared link to one product -->
          <section v-if="focusItem" class="pb-4">
            <a href="#" class="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-page-ink hover:underline" @click.prevent="state.q = ''">
              <ArrowLeft class="size-4" /> All {{ state.view }}
            </a>
            <h1 class="mt-1 font-heading text-3xl leading-none font-extrabold text-balance uppercase sm:text-4xl">{{ shortName(focusItem.n) }}</h1>
            <p class="mt-1.5 text-[0.9375rem] text-page-muted">Shared link · today's cheapest way to buy it</p>
          </section>
          <section v-else class="pb-4">
            <h1 class="font-heading text-3xl leading-none font-extrabold text-balance uppercase sm:text-4xl">{{ intro.title }}</h1>
            <p class="mt-1.5 max-w-2xl text-[0.9375rem] text-pretty text-page-muted max-sm:hidden">{{ intro.text }}</p>
          </section>

          <section v-if="!focusItem" aria-label="Search and filters" class="sticky top-0 z-30 -mx-4 bg-page px-4 py-2.5 sm:-mx-6 sm:px-6 lg:hidden">
            <FilterBar :depts="deptCounts" :subs="subs" :pool="pool" :counts="flagCounts" :watch-count="watchCount" :building="!!status?.building" :min-days="status?.minDays ?? 14" />
          </section>

          <div v-if="!focusItem" class="flex items-start justify-between gap-x-4 border-b-2 border-page-ink/80 pt-1 pb-2">
            <div class="flex min-h-9 min-w-0 flex-wrap items-center gap-2">
              <p v-if="!loading" class="text-sm whitespace-nowrap text-page-muted" aria-live="polite" aria-atomic="true">
                <strong class="font-bold text-page-ink">{{ filtered.length.toLocaleString() }}</strong>
                of {{ list.length.toLocaleString() }} {{ state.view }}
              </p>
              <span v-if="hasBase" class="inline-flex max-w-full items-center gap-1 border-2 border-border bg-card py-0.5 pr-0.5 pl-2.5 text-sm text-card-foreground">
                <span class="truncate">containing <strong class="font-semibold">{{ shortName(hasBase.n) }}</strong></span>
                <button type="button" class="flex size-7 items-center justify-center hover:bg-muted pointer-coarse:size-11" aria-label="Show all bundles" title="Show all bundles" @click="state.has = ''"><X class="size-4" /></button>
              </span>
            </div>
            <div class="flex shrink-0 flex-col items-end">
              <Select v-model="state.sort">
                <SelectTrigger class="h-9! gap-1.5 pointer-coarse:h-11! rounded-none border-0 bg-transparent! px-1 text-page-ink shadow-none hover:bg-page-ink/10!" aria-label="Sort">
                  <ArrowDownUp class="size-4" />
                  <span class="text-page-muted">Sort:</span>
                  <SelectValue class="font-semibold" />
                </SelectTrigger>
                <SelectContent align="end" class="rounded-none border-2 border-border">
                  <SelectItem v-for="s in SORTS" :key="s.value" :value="s.value">{{ s.label }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <!-- the ranking caveat sits under the rule, at reading size, not tucked under the trigger -->
          <p v-if="sortNote && !focusItem" class="pt-2 text-[0.8125rem] font-medium text-pretty text-page-ink">{{ sortNote }}</p>

          <ul v-if="loading" class="grid grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))] gap-4 pt-4">
            <li v-for="i in 8" :key="i" class="label-stock flex flex-col gap-3 p-3">
              <Skeleton class="h-40 w-full rounded-none" />
              <Skeleton class="h-4 w-4/5 rounded-none" />
              <Skeleton class="h-9 w-1/2 rounded-none" />
            </li>
          </ul>

          <ul v-else-if="focusItem" id="results" tabindex="-1" class="grid max-w-md pt-2 outline-none">
            <li class="flex">
              <ProductCard v-if="isProduct(focusItem)" :item="focusItem" expanded class="w-full" />
              <BundleCard v-else :item="focusItem" full class="w-full" />
            </li>
          </ul>

          <ul v-else id="results" tabindex="-1" class="grid grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))] gap-4 pt-4 outline-none">
            <li v-for="p in visible" :key="p.s" class="flex">
              <ProductCard v-if="isProduct(p)" :item="p" class="w-full" />
              <BundleCard v-else :item="p" class="w-full" />
            </li>
          </ul>

          <!-- nothing matched: name what is narrowing it and offer the way back -->
          <div v-if="!loading && !filtered.length" class="label-stock mx-auto my-10 flex max-w-xl flex-col items-center gap-3 p-6 text-center">
            <PackageSearch class="size-9 text-muted-foreground" />
            <h2 class="font-heading text-xl font-bold uppercase">No {{ state.view }} match all of these</h2>
            <ul v-if="activeFilters.length" class="flex flex-wrap justify-center gap-1.5">
              <li v-for="f in activeFilters" :key="f.label">
                <button type="button" class="inline-flex min-h-9 items-center gap-1 border-2 border-border px-2.5 text-sm font-semibold hover:bg-muted" :aria-label="`Remove filter: ${f.label}`" @click="f.clear()">
                  {{ f.label }} <X class="size-3.5" />
                </button>
              </li>
            </ul>
            <Button size="lg" class="rounded-none" @click="resetFilters()">Clear all filters</Button>
          </div>

          <div ref="sentinel" class="flex justify-center py-10">
            <Button v-if="hasMore && !focusItem" variant="outline" size="lg" class="rounded-none border-2 border-border" @click="more">
              Show more <span class="font-normal text-muted-foreground">({{ (filtered.length - visible.length).toLocaleString() }} left)</span>
            </Button>
          </div>
        </div>
      </div>
    </main>

    <footer class="bg-bar text-bar-muted">
      <div class="mx-auto max-w-[90rem] px-4 py-8 text-sm text-pretty sm:px-6">
        <p class="max-w-[54ch]">
          Unofficial and not affiliated with 4WD Supacentre. Prices are collected once a day from the public catalogue, and the usual price is the median over
          the last 90 days. Always check the price on
          <a href="https://www.4wdsupacentre.com.au/" class="text-bar-ink underline">4wdsupacentre.com.au</a>
          before buying.
        </p>
        <p class="mt-2">
          <a href="feed.xml" class="text-bar-ink underline">RSS feed of price drops</a> ·
          <a :href="REPO" target="_blank" rel="noopener" class="text-bar-ink underline">Source on GitHub</a>
        </p>
      </div>
    </footer>
  </div>
</template>
