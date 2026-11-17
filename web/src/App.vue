<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";
import { useColorMode, useEventListener, useIntersectionObserver } from "@vueuse/core";
import { ArrowDownUp, Boxes, Clock, History, Moon, PackageSearch, Rss, Sun, SunMoon, X } from "@lucide/vue";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLogo from "@/components/AppLogo.vue";
import FilterBar from "@/components/FilterBar.vue";
import ProductCard from "@/components/ProductCard.vue";
import BundleCard from "@/components/BundleCard.vue";
import ShoppingList from "@/components/ShoppingList.vue";
import { daysAgo, isProduct, shortName, type Bundle, type Item, type Payload, type Product, type View, loadData } from "@/lib/data";
import { SORTS, useFilters, type SortKey } from "@/composables/useFilters";
import { queryWords } from "@/lib/search";
import { useWatchList } from "@/composables/useWatchList";
import { useShoppingList } from "@/composables/useShoppingList";

const PAGE = 60;
const REPO = "https://github.com/aclem43/kings-deal-tracker";

const { state, readHash, writeHash, setView } = useFilters();
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

/* ---------- department / category options ---------- */

const depts = computed(() => {
  const s = new Set<string>();
  list.value.forEach((p) => p.d.forEach((d) => s.add(d)));
  return [...s].sort();
});
const subs = computed(() => {
  const s = new Set<string>();
  for (const p of list.value) if (!state.dept || p.d.includes(state.dept)) p.c.forEach((c) => s.add(c));
  return [...s].sort();
});
// Drop a department or category the current view doesn't have (e.g. from an old link).
watch([depts, subs, loading], () => {
  if (loading.value) return;
  if (state.dept && !depts.value.includes(state.dept)) state.dept = "";
  if (state.sub && !subs.value.includes(state.sub)) state.sub = "";
});

/* ---------- filtering and sorting ---------- */

const dealScore = (p: Item) => (p.belowTypical ?? 0) * 10 + p.sv + (isProduct(p) ? p.dropPct : 0);

const sorters: Record<SortKey, (a: Item, b: Item) => number> = {
  deal: (a, b) => dealScore(b) - dealScore(a) || a.p - b.p,
  save: (a, b) => b.sv - a.sv || a.p - b.p,
  drop: (a, b) => b.dropPct - a.dropPct || a.p - b.p,
  "price-asc": (a, b) => a.p - b.p,
  "price-desc": (a, b) => b.p - a.p,
  new: (a, b) => (b.f || "").localeCompare(a.f || "") || a.n.localeCompare(b.n),
  name: (a, b) => a.n.localeCompare(b.n),
};

// Every filter except the search text; the search box suggests from this set.
const pool = computed(() => {
  const { view, has, dept, sub } = state;
  const w = watchList.set.value;
  return list.value.filter((p) =>
    (!state.watchonly || w.has(p.s)) &&
    (!state.instock || p.st) &&
    (!state.atl || p.atLow) &&
    (!state.dropped || p.recentDrop) &&
    (view !== "products" || !state.viabundle || (p as Product).via) &&
    (view !== "bundles" || !state.antideal || p.sv < -0.005) &&
    (view !== "bundles" || !has || (p as Bundle).k.includes(has)) &&
    (!dept || p.d.includes(dept)) &&
    (!sub || p.c.includes(sub))
  );
});

const filtered = computed(() => {
  const words = queryWords(state.q);
  return pool.value.filter((p) => words.every((x) => p.hay.includes(x))).sort(sorters[state.sort] || sorters.deal);
});

/* ---------- paging ---------- */

const shown = ref(PAGE);
const visible = computed(() => filtered.value.slice(0, shown.value));
const hasMore = computed(() => shown.value < filtered.value.length);
const more = () => { shown.value += PAGE; };

// New filters start from the top; starring or un-starring keeps the pages already loaded.
watch(state, () => { shown.value = PAGE; writeHash(); }, { deep: true });

const sentinel = useTemplateRef<HTMLElement>("sentinel");
useIntersectionObserver(sentinel, ([e]) => { if (e?.isIntersecting && hasMore.value) more(); }, { rootMargin: "800px" });

/* ---------- header bits ---------- */

const hasBase = computed(() => (state.view === "bundles" && state.has ? bySku.value.get(state.has) : undefined));

const status = computed(() => {
  const m = meta.value;
  if (!m) return null;
  const days = daysAgo(m.trackedSince) + 1;
  return {
    updated: new Date(m.generated).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }),
    since: m.trackedSince,
    days,
    cheaper: products.value.filter((p) => p.via).length,
    total: products.value.length,
    building: days < m.minDaysForTypical,
    minDays: m.minDaysForTypical,
  };
});

const mode = useColorMode({ emitAuto: true });
const nextMode = { auto: "light", light: "dark", dark: "auto" } as const;
const modeLabel = computed(() => ({ auto: "Theme: system", light: "Theme: light", dark: "Theme: dark" })[mode.value as "auto"]);

const INTRO: Record<View, { title: string; text: string }> = {
  products: {
    title: "Today's cheapest prices",
    text: "The cheapest way to buy each 4WD Supacentre product today, on its own or inside a bundle that includes it, with daily price history.",
  },
  bundles: { title: "Bundle deals", text: "Every bundle listing, compared with buying its parts separately." },
  list: { title: "Shopping list", text: "Add what you want and get the cheapest mix of bundles and single items that covers all of it." },
};
const intro = computed(() => INTRO[state.view]);

// Give the filter bar a backdrop and edge only once it is pinned to the top.
const stickTop = useTemplateRef<HTMLElement>("stickTop");
const stuck = ref(false);
useIntersectionObserver(stickTop, ([e]) => { stuck.value = !!e && !e.isIntersecting && e.boundingClientRect.top < 0; });

const onTab = (v: string | number) => setView(v as View);

/* ---------- start ---------- */

readHash();
useEventListener(window, "hashchange", () => { readHash(); window.scrollTo(0, 0); });

onMounted(async () => {
  try {
    const d = await loadData();
    meta.value = d.meta;
    products.value = d.products;
    bundles.value = d.bundles;
  } catch {
    error.value = "Could not load price data.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header class="border-b bg-card">
      <div class="h-1 bg-brand" />
      <div class="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 md:grid-cols-[auto_1fr_auto]">
        <a href="#" class="flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight" title="Kings Deal Tracker home">
          <AppLogo class="size-8 shrink-0" />
          Kings Deal Tracker
        </a>

        <Tabs :model-value="state.view" class="order-last col-span-2 md:order-none md:col-span-1" @update:model-value="onTab">
          <TabsList class="w-full md:w-auto">
            <TabsTrigger value="products" class="flex-1 px-3 md:flex-none md:px-4">Products</TabsTrigger>
            <TabsTrigger value="bundles" class="flex-1 px-3 md:flex-none md:px-4">Bundles</TabsTrigger>
            <TabsTrigger value="list" class="flex-1 gap-1.5 px-3 md:flex-none md:px-4">
              <span class="sm:hidden">List</span><span class="max-sm:hidden">Shopping list</span>
              <span v-if="listCount" class="rounded-full bg-foreground px-1.5 text-[0.7rem] leading-4 text-background tabular-nums">{{ listCount }}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div class="flex gap-0.5">
          <Button as="a" href="feed.xml" variant="ghost" size="icon" title="RSS feed of price drops" aria-label="RSS feed of price drops">
            <Rss />
          </Button>
          <Button as="a" :href="REPO" target="_blank" rel="noopener" variant="ghost" size="icon" title="Source on GitHub" aria-label="Source on GitHub">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" :title="modeLabel" :aria-label="modeLabel" @click="mode = nextMode[mode as 'auto']">
            <SunMoon v-if="mode === 'auto'" />
            <Sun v-else-if="mode === 'light'" />
            <Moon v-else />
          </Button>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6">
      <section class="pt-6 pb-5 sm:pt-8">
        <h1 class="font-heading text-2xl font-bold tracking-tight text-balance sm:text-3xl">{{ intro.title }}</h1>
        <p class="mt-1.5 max-w-2xl text-sm text-pretty text-muted-foreground sm:text-base">{{ intro.text }}</p>
        <p v-if="error" class="mt-3 text-sm text-destructive">{{ error }}</p>
        <Skeleton v-else-if="!status" class="mt-3 h-4 w-80 max-w-full" />
        <ul v-else class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <li class="flex items-center gap-1.5"><Clock class="size-3.5" />Updated {{ status.updated }}</li>
          <li class="flex items-center gap-1.5">
            <History class="size-3.5" />Tracking {{ status.days }} day{{ status.days === 1 ? "" : "s" }}
          </li>
          <li class="flex items-center gap-1.5">
            <Boxes class="size-3.5" /><strong class="font-semibold text-foreground">{{ status.cheaper }}</strong> of {{ status.total }} products cheapest in a bundle
          </li>
          <li v-if="status.building" class="rounded-full bg-warn-bg px-2 py-0.5 text-warn">
            Price history is still building: usual prices appear after {{ status.minDays }} days
          </li>
        </ul>
      </section>

      <div v-if="state.view === 'list'" class="pb-10">
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <Skeleton v-else-if="loading" class="h-64 w-full rounded-xl" />
        <ShoppingList v-else :products="products" :bundles="bundles" :by-sku="bySku" />
      </div>

      <template v-else>
        <div ref="stickTop" class="h-px" aria-hidden="true" />
        <section
          aria-label="Filters"
          class="sticky top-0 z-30 -mx-4 border-b px-4 py-3 backdrop-blur-md transition-[background-color,border-color,box-shadow] sm:-mx-6 sm:px-6"
          :class="stuck ? 'border-border bg-page/85 shadow-sm' : 'border-transparent bg-page'"
        >
          <FilterBar :depts="depts" :subs="subs" :watch-count="watchCount" :pool="pool" />
        </section>

        <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3 pb-4">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <p v-if="!loading && !error" class="text-sm text-muted-foreground tabular-nums">
              <strong class="font-semibold text-foreground">{{ filtered.length.toLocaleString() }}</strong>
              of {{ list.length.toLocaleString() }} {{ state.view }}
            </p>
            <span v-if="hasBase" class="inline-flex max-w-full items-center gap-1 rounded-full border bg-card py-0.5 pr-0.5 pl-3 text-sm">
              <span class="truncate">containing <strong class="font-semibold">{{ shortName(hasBase.n) }}</strong></span>
              <Button variant="ghost" size="icon-xs" class="rounded-full" aria-label="Clear" @click="state.has = ''"><X /></Button>
            </span>
          </div>
          <Select v-model="state.sort">
            <SelectTrigger class="h-9! gap-1 border-transparent bg-transparent pr-2 shadow-none hover:bg-muted" aria-label="Sort">
              <ArrowDownUp class="size-4 text-muted-foreground" />
              <span class="text-muted-foreground">Sort:</span>
              <SelectValue class="font-medium" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem v-for="s in SORTS" :key="s.value" :value="s.value">{{ s.label }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ul v-if="loading" class="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4 lg:gap-5">
          <li v-for="i in 8" :key="i" class="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <Skeleton class="h-44 w-full" />
            <Skeleton class="h-4 w-4/5" />
            <Skeleton class="h-6 w-1/3" />
          </li>
        </ul>

        <ul v-else class="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4 lg:gap-5">
          <li v-for="p in visible" :key="p.s" class="flex">
            <ProductCard v-if="isProduct(p)" :item="p" class="w-full" />
            <BundleCard v-else :item="p" class="w-full" />
          </li>
        </ul>

        <div v-if="!loading && !error && !filtered.length" class="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
          <PackageSearch class="size-10 opacity-50" />
          <p>{{ state.watchonly && !watchCount ? "Your watch list is empty. Star items to keep track of them." : "Nothing matches these filters." }}</p>
        </div>

        <div ref="sentinel" class="flex justify-center py-10">
          <Button v-if="hasMore" variant="outline" @click="more">Show more</Button>
        </div>
      </template>
    </main>

    <footer class="border-t bg-card">
      <div class="mx-auto max-w-7xl px-4 py-8 text-sm text-pretty text-muted-foreground sm:px-6">
        Unofficial and not affiliated with 4WD Supacentre. Prices are collected once a day from the public catalogue. Always check the price on
        <a href="https://www.4wdsupacentre.com.au/" class="underline underline-offset-2 hover:text-foreground">4wdsupacentre.com.au</a>
        before buying. <a href="feed.xml" class="underline underline-offset-2 hover:text-foreground">RSS feed of price drops</a>.
        <a :href="REPO" target="_blank" rel="noopener" class="underline underline-offset-2 hover:text-foreground">Source on GitHub</a>.
      </div>
    </footer>
  </div>
</template>
