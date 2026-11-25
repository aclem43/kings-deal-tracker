<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { Check, Gift, ImageOff, Link2, Minus, Plus, ShoppingCart, Trash2, TriangleAlert, Undo2, X } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { historyBadges, money, pct, shortDate, shortName, statsLine, thumbUrl, type Bundle, type Product } from "@/lib/data";
import { rankMatches } from "@/lib/search";
import SearchAutocomplete, { type SuggestionGroup } from "./SearchAutocomplete.vue";
import { optimise, type Buy } from "@/lib/optimise";
import { listHistory } from "@/lib/listHistory";
import Sparkline from "./Sparkline.vue";
import ToneBadge from "./ToneBadge.vue";
import { MAX_QTY, useShoppingList } from "@/composables/useShoppingList";
import { itemsParam, useFilters } from "@/composables/useFilters";

const props = defineProps<{ products: Product[]; bundles: Bundle[]; bySku: Map<string, Product>; asOf: string }>();

const list = useShoppingList();
const { sharedList } = useFilters();
const thumb = thumbUrl;
const name = (sku: string) => shortName(props.bySku.get(sku)?.n ?? sku);

// Items on the list that still exist in today's data, in the order they were added.
const rows = computed(() =>
  Object.entries(list.items.value)
    .map(([sku, qty]) => ({ p: props.bySku.get(sku), sku, qty }))
    .filter((r): r is { p: Product; sku: string; qty: number } => !!r.p),
);

const needs = computed(() => new Map(rows.value.map((r) => [r.sku, r.qty])));
const plan = computed(() => (rows.value.length ? optimise(needs.value, props.bySku, props.bundles) : null));

// Each row's own history: badges that say something (stock is already in the row) and the low/high line.
const rowHistory = (p: Product) => ({
  badges: historyBadges(p).filter((b) => b.tone !== "warn"),
  stats: statsLine(p),
});

/* ---------- what this list would have cost on past days ---------- */

const history = computed(() => {
  const p = plan.value;
  if (!p) return null;
  const pts = listHistory(needs.value, props.bySku, props.bundles);
  if (!pts.length) return null;
  // Days when something couldn't be bought have a smaller total that isn't comparable, so
  // the low, high and chart use only days when the whole list was in stock.
  const full = pts.filter((x) => x.complete);
  const lo = full.length ? full.reduce((a, b) => (b.total < a.total ? b : a)) : null;
  const hi = full.length ? full.reduce((a, b) => (b.total > a.total ? b : a)) : null;
  const todayComplete = !p.unavailable.length;
  // The same list bought only as single items, so the bundle saving over time is visible.
  const alone = pts.filter((x) => x.separate != null);
  const aloneLo = alone.length ? alone.reduce((a, b) => (b.separate! < a.separate! ? b : a)) : null;
  const aloneHi = alone.length ? alone.reduce((a, b) => (b.separate! > a.separate! ? b : a)) : null;
  // Newest first, each with its change from the day before it (when both are comparable).
  const changes = pts.map((x, i) => {
    const prev = pts[i - 1];
    return { ...x, delta: prev && prev.complete && x.complete ? x.total - prev.total : null };
  }).reverse().slice(0, 5);
  return {
    since: pts[0].d,
    moved: !!lo && !!hi && hi.total > lo.total,
    lo, hi, todayComplete, changes, aloneLo, aloneHi,
    more: pts.length > 5,
    atLow: todayComplete && !!lo && !!hi && hi.total > lo.total && p.total <= lo.total,
    series: { h: full.map((x) => [x.d, x.total] as [string, number]), lo: lo?.total ?? 0, hi: hi?.total ?? 0, p: p.total },
  };
});
// How a past day's total was made up, in a few words: alone, or which bundle(s).
function howText(buys: Buy[]): string {
  const bundles = buys.filter((b) => b.listing.bundle);
  if (!bundles.length) return needs.value.size === 1 && buys[0]?.count === 1 ? "On its own" : "Each on its own";
  // One item on the list: name what the bundle adds, which is what tells bundles apart.
  if (needs.value.size === 1 && buys.length === 1) {
    const b = buys[0];
    const extras = b.extras.map(([s, n]) => name(s) + (n > 1 ? ` ×${n}` : "")).join(", ");
    return (b.count > 1 ? `${b.count} × bundle` : "Bundle") + (extras ? ` with ${extras}` : "");
  }
  const parts = bundles.map((b) => (b.count > 1 ? `${b.count} × ` : "") + shortName(b.listing.n));
  const own = buys.length - bundles.length;
  return `Bundle${bundles.length > 1 ? "s" : ""}: ${parts.join("; ")}` + (own ? ` · ${own} on ${own === 1 ? "its" : "their"} own` : "");
}
const isBundled = (buys: Buy[]) => buys.some((b) => b.listing.bundle);

const purchases = computed(() => plan.value?.buys.reduce((n, b) => n + b.count, 0) ?? 0);
// "5 purchases" over 4 rows reads as a mismatch, so say how many listings they come from.
const purchaseText = computed(() => {
  const n = purchases.value;
  const rowsN = plan.value?.buys.length ?? 0;
  const base = `${n} purchase${n === 1 ? "" : "s"}`;
  return n !== rowsN ? `${base} from ${rowsN} listing${rowsN === 1 ? "" : "s"}` : base;
});
const saving = computed(() => {
  const p = plan.value;
  if (!p || p.separate == null || p.separate - p.total < 0.005) return null;
  return { amount: p.separate - p.total, pct: (p.separate - p.total) / p.separate };
});

/* ---------- a list opened from a shared link ---------- */

const incoming = computed(() => {
  const s = sharedList.value;
  if (!s) return null;
  const known = Object.entries(s).filter(([sku]) => props.bySku.has(sku));
  return known.length ? Object.fromEntries(known) : null;
});
// What the shared link holds, named, so Replace / Merge / Keep isn't a blind choice.
const incomingNames = computed(() => {
  const e = Object.entries(incoming.value ?? {});
  const named = e.slice(0, 3).map(([s, n]) => name(s) + (n > 1 ? ` ×${n}` : ""));
  return e.length > 3 ? `${named.join(", ")} and ${e.length - 3} more` : named.join(", ");
});
const sameAsMine = computed(() => !!incoming.value && itemsParam(incoming.value) === itemsParam(list.items.value));
function useShared(how: "replace" | "merge") {
  if (!incoming.value) return;
  if (how === "replace") list.replace(incoming.value);
  else list.merge(incoming.value);
  sharedList.value = null;
}
// With nothing on this browser's list yet, a shared list just becomes the list.
if (incoming.value && !rows.value.length) useShared("replace");

/* ---------- sharing and clearing ---------- */

const copied = ref(false);
let copiedTimer: number | undefined;
async function copyLink() {
  const url = `${location.origin}${location.pathname}#view=list&items=${encodeURIComponent(itemsParam(list.items.value)).replace(/%3A/g, ":").replace(/%2C/g, ",")}`;
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
  } catch {
    window.prompt("Copy this link", url);
  }
  clearTimeout(copiedTimer);
  copiedTimer = window.setTimeout(() => { copied.value = false; }, 2500);
}

// Clearing keeps the old list for a while so it can be put back.
const cleared = ref<Record<string, number> | null>(null);
let undoTimer: number | undefined;
function clearList() {
  cleared.value = { ...list.items.value };
  removed.value = null;
  list.clear();
  clearTimeout(undoTimer);
  undoTimer = window.setTimeout(() => { cleared.value = null; }, 10000);
}
function undoClear() {
  if (cleared.value) list.replace(cleared.value);
  cleared.value = null;
}

// Removing one row (the × or "−" at one) can be undone too, back in its old place.
const removed = ref<{ sku: string; qty: number; at: number } | null>(null);
let removedTimer: number | undefined;
function removeRow(sku: string) {
  const entries = Object.entries(list.items.value);
  const at = entries.findIndex(([s]) => s === sku);
  if (at < 0) return;
  removed.value = { sku, qty: entries[at][1], at };
  list.remove(sku);
  clearTimeout(removedTimer);
  removedTimer = window.setTimeout(() => { removed.value = null; }, 10000);
}
function undoRemove() {
  const r = removed.value;
  if (!r) return;
  const entries = Object.entries(list.items.value).filter(([s]) => s !== r.sku);
  entries.splice(Math.min(r.at, entries.length), 0, [r.sku, r.qty]);
  list.replace(Object.fromEntries(entries));
  removed.value = null;
}
onBeforeUnmount(() => { clearTimeout(undoTimer); clearTimeout(copiedTimer); clearTimeout(removedTimer); });

/* ---------- adding items ---------- */

const q = ref("");
const groups = computed<SuggestionGroup[]>(() => [{
  label: "Products",
  items: rankMatches(props.products, q.value, 8).map((p) => ({
    id: p.s,
    label: shortName(p.n),
    detail: list.has(p.s) ? `On your list (${list.items.value[p.s]}) · add one more` : p.s,
    image: thumb(p.i),
    aside: money(p.p),
    muted: !p.st && !p.sst,
  })),
}]);
function add(sku: string) { list.add(sku); q.value = ""; }
function addFirst() { const s = groups.value[0].items[0]; if (s) add(s.id); }

const qtyBtn = "flex size-9 items-center justify-center hover:bg-muted disabled:opacity-40 pointer-coarse:size-11 [&_svg]:size-4";
</script>

<template>
  <div class="flex flex-col gap-4 pb-8">
    <!-- a shared list, when this browser already has one of its own -->
    <div v-if="incoming && !sameAsMine" role="status" class="flex flex-col gap-3 border-2 border-border bg-hivis p-4 text-hivis-ink sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm font-semibold">
        This link has a list: {{ incomingNames }}. You already have a list in this browser.
      </p>
      <div class="flex flex-wrap gap-2">
        <Button size="lg" class="rounded-none" @click="useShared('replace')">Use the shared list</Button>
        <Button size="lg" variant="outline" class="rounded-none border-2 border-border" @click="useShared('merge')">Add it to mine</Button>
        <Button size="lg" variant="ghost" class="rounded-none hover:bg-hivis-ink/10" @click="sharedList = null">Keep mine</Button>
      </div>
    </div>

    <!-- phone: the answer first, before the list editor -->
    <a v-if="plan" href="#plan" class="label-stock grid grid-cols-[1fr_auto] items-end gap-x-3 px-4 py-3 lg:hidden" @click.prevent="($refs.planEl as HTMLElement)?.scrollIntoView({ behavior: 'smooth' })">
      <span>
        <span class="block label-caps text-muted-foreground">Cheapest total</span>
        <span class="font-heading text-[2rem] leading-none font-bold">{{ money(plan.total) }}</span>
      </span>
      <span class="flex flex-col items-end gap-1 text-right">
        <span v-if="saving" class="bg-good px-1.5 py-0.5 font-heading text-sm font-bold tracking-wide whitespace-nowrap text-background uppercase">Saves {{ money(saving.amount) }}</span>
        <span class="text-sm">{{ purchaseText }} · <span class="font-semibold whitespace-nowrap underline">See plan</span></span>
      </span>
    </a>

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <!-- the list -->
      <section class="label-stock" aria-labelledby="list-h">
        <div class="flex items-center justify-between gap-2 border-b-2 border-border px-4 py-2.5">
          <h2 id="list-h" class="font-heading text-xl font-bold uppercase">Your list</h2>
          <Button v-if="rows.length" variant="ghost" size="lg" class="rounded-none" @click="copyLink">
            <Check v-if="copied" /><Link2 v-else />
            {{ copied ? "Link copied" : "Copy link" }}
          </Button>
        </div>

        <div class="border-b-2 border-border p-4">
          <SearchAutocomplete
            v-model="q"
            :groups="groups"
            placeholder="Add a product"
            label="Add a product"
            empty-text="No products match."
            @select="add($event.id)"
            @submit="addFirst"
          />
        </div>

        <ul v-if="rows.length">
          <li v-for="r in rows" :key="r.sku" class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-rule px-4 py-3 last:border-b-0 max-sm:grid-cols-[auto_minmax(0,1fr)]">
            <a :href="r.p.u" target="_blank" rel="noopener" class="shrink-0" tabindex="-1">
              <img v-if="r.p.i" :src="thumb(r.p.i)" alt="" class="size-12 border border-rule bg-well object-contain dark:mix-blend-multiply" />
              <span v-else class="flex size-12 items-center justify-center bg-well"><ImageOff class="size-5 text-well-ink" /></span>
            </a>
            <div class="min-w-0 flex-1">
              <a :href="r.p.u" target="_blank" rel="noopener" class="line-clamp-2 text-sm leading-snug font-semibold hover:underline">{{ shortName(r.p.n) }}</a>
              <p class="text-xs text-muted-foreground">
                <template v-if="r.p.sst">{{ money(r.p.sp) }} on its own<template v-if="r.p.via"> · cheaper in a bundle</template></template>
                <template v-else>Out of stock on its own</template>
              </p>
              <template v-for="h in [rowHistory(r.p)]" :key="r.sku">
                <div v-if="h.badges.length" class="mt-1 flex flex-wrap gap-1">
                  <ToneBadge v-for="b in h.badges" :key="b.text" :badge="b" />
                </div>
                <p v-if="h.stats" class="mt-0.5 text-xs text-muted-foreground" title="The cheapest way to get it, alone or in a bundle">{{ h.stats }}</p>
              </template>
            </div>
            <div class="flex items-center justify-end gap-2 max-sm:col-start-2 max-sm:justify-between">
            <div class="flex shrink-0 items-center border-2 border-border">
              <button v-if="r.qty > 1" type="button" :class="qtyBtn" aria-label="One fewer" @click="list.setQty(r.sku, r.qty - 1)"><Minus /></button>
              <button v-else type="button" :class="qtyBtn" :aria-label="`Remove ${shortName(r.p.n)}`" title="Remove" @click="removeRow(r.sku)"><Trash2 /></button>
              <span class="w-7 text-center text-sm font-semibold" aria-live="polite">{{ r.qty }}</span>
              <button type="button" :class="qtyBtn" aria-label="One more" :disabled="r.qty >= MAX_QTY" @click="list.setQty(r.sku, r.qty + 1)"><Plus /></button>
            </div>
            <button type="button" :class="[qtyBtn, 'text-muted-foreground hover:text-foreground']" :aria-label="`Remove ${shortName(r.p.n)}`" @click="removeRow(r.sku)">
              <X />
            </button>
            </div>
          </li>
        </ul>
        <div v-if="removed && rows.length" role="status" class="flex flex-wrap items-center justify-between gap-2 border-t-2 border-border bg-hivis px-4 py-2 text-sm text-hivis-ink">
          <span>Removed <strong class="font-semibold">{{ name(removed.sku) }}</strong>.</span>
          <Button variant="ghost" class="rounded-none hover:bg-hivis-ink/10 pointer-coarse:h-11" @click="undoRemove"><Undo2 /> Undo</Button>
        </div>
        <div v-else-if="removed" role="status" class="flex flex-wrap items-center justify-center gap-3 px-6 py-10 text-sm">
          <span>Removed {{ name(removed.sku) }}.</span>
          <Button variant="outline" size="lg" class="rounded-none border-2 border-border" @click="undoRemove"><Undo2 /> Undo</Button>
        </div>
        <div v-else-if="cleared && !rows.length" role="status" class="flex flex-wrap items-center justify-center gap-3 px-6 py-10 text-sm">
          <span>List cleared.</span>
          <Button variant="outline" size="lg" class="rounded-none border-2 border-border" @click="undoClear"><Undo2 /> Undo</Button>
        </div>
        <div v-else-if="!rows.length" class="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
          <ShoppingCart class="size-8" />
          <p class="max-w-xs text-pretty">Add products above, or with the cart button on any product. The plan works out the cheapest mix of bundles and single items, and bundle extras count as free.</p>
        </div>

        <!-- clearing is kept apart from everything else, and can be undone -->
        <div v-if="rows.length" class="flex justify-end border-t-2 border-border px-4 py-3">
          <Button variant="outline" size="lg" class="rounded-none border-2 border-border" @click="clearList">
            <Trash2 /> Clear list
          </Button>
        </div>
      </section>

      <!-- the plan -->
      <section v-if="plan" id="plan" ref="planEl" class="label-stock scroll-mt-4 lg:sticky lg:top-4" aria-labelledby="plan-h">
        <div class="border-b-2 border-border">
          <h2 id="plan-h" class="px-4 pt-2.5 font-heading text-xl font-bold uppercase">Cheapest way to buy it</h2>
          <div class="mt-2 grid grid-cols-[auto_1fr] items-stretch border-t-2 border-border max-sm:grid-cols-1">
            <span class="bg-primary px-4 py-1.5 font-heading text-[2.5rem] leading-tight font-bold text-primary-foreground">{{ money(plan.total) }}</span>
            <span class="flex flex-col justify-center px-4 text-sm leading-snug max-sm:py-2">
              <span class="font-semibold">{{ purchaseText }}</span>
              <span class="text-muted-foreground">Prices as of {{ asOf }}</span>
            </span>
          </div>
          <p v-if="saving" class="bg-good px-4 py-1.5 text-background">
            <span class="block font-heading text-base font-bold tracking-wide uppercase">Saves {{ money(saving.amount) }} ({{ pct(saving.pct) }})</span>
            <span class="block text-[0.8125rem]">against buying each on its own, {{ money(plan.separate!) }}</span>
          </p>
          <p v-else-if="plan.separate != null && plan.buys.length" class="px-4 py-2 text-sm text-muted-foreground">
            Buying each on its own is already the cheapest way.
          </p>
          <p v-if="!plan.exact" class="border-t border-rule px-4 py-2 text-xs text-muted-foreground">
            This list is large, so this is a very good plan rather than a guaranteed best one.
          </p>
        </div>

        <div v-if="plan.unavailable.length" class="flex gap-2 border-b-2 border-border bg-hivis p-4 text-sm text-hivis-ink">
          <TriangleAlert class="mt-0.5 size-4 shrink-0" />
          <p>
            Not in stock anywhere right now, so not included:
            <strong class="font-semibold">{{ plan.unavailable.map(name).join(", ") }}</strong>
          </p>
        </div>

        <ul>
          <li v-for="b in plan.buys" :key="b.listing.s" class="flex gap-3 border-b border-rule p-4 last:border-b-0">
            <a :href="b.listing.u" target="_blank" rel="noopener" class="shrink-0" tabindex="-1">
              <img v-if="b.listing.i" :src="thumb(b.listing.i)" alt="" class="size-14 border border-rule bg-well object-contain dark:mix-blend-multiply" />
              <span v-else class="flex size-14 items-center justify-center bg-well"><ImageOff class="size-5 text-well-ink" /></span>
            </a>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <a :href="b.listing.u" target="_blank" rel="noopener" class="line-clamp-2 text-sm leading-snug font-semibold hover:underline">
                  {{ shortName(b.listing.n) }}
                </a>
                <span class="text-right font-bold whitespace-nowrap">
                  <template v-if="b.count > 1"><span class="font-normal text-muted-foreground">{{ b.count }} × {{ money(b.listing.p) }}</span><br /></template>
                  {{ money(b.listing.p * b.count) }}
                </span>
              </div>
              <span class="mt-1 inline-block border border-current px-1.5 label-caps text-muted-foreground">{{ b.listing.bundle ? "Bundle" : "On its own" }}</span>
              <p v-if="b.listing.bundle" class="mt-1.5 text-[0.8125rem]">
                <span class="text-muted-foreground">For:</span>
                {{ b.covers.map(([s, n]) => name(s) + (n > 1 ? ` ×${n}` : "")).join(", ") }}
              </p>
              <p v-if="b.extras.length" class="mt-1 flex gap-1 text-[0.8125rem] font-semibold">
                <Gift class="mt-0.5 size-3.5 shrink-0 text-good" />
                <span>Also comes with {{ b.extras.map(([s, n]) => name(s) + (n > 1 ? ` ×${n}` : "")).join(", ") }}</span>
              </p>
            </div>
          </li>
        </ul>

        <!-- the list's price history: this plan re-run on each past day's prices -->
        <div v-if="history" class="border-t-2 border-border px-4 py-3" aria-labelledby="hist-h">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 id="hist-h" class="label-caps text-muted-foreground">This list over time</h3>
            <ToneBadge v-if="history.atLow" :badge="{ text: 'Lowest yet', tone: 'good', hint: `The lowest this list has cost since ${shortDate(history.since)}` }" />
          </div>
          <p v-if="!history.todayComplete" class="mt-1.5 text-sm text-muted-foreground">
            Something on the list is out of stock today, so today's total can't be compared with other days.
          </p>
          <p v-else-if="!history.moved" class="mt-1.5 text-sm">
            {{ money(plan.total) }} every day since {{ shortDate(history.since) }}. Changes will show here.
          </p>
          <template v-else>
            <Sparkline :item="history.series" label="This list's total over time" class="mt-2 mb-1" />
            <p class="mt-1.5 text-sm">
              Low <span class="font-semibold">{{ money(history.lo!.total) }}</span> on {{ shortDate(history.lo!.d) }}
              <span class="text-muted-foreground">({{ isBundled(history.lo!.buys) ? "in a bundle" : "on its own" }})</span>
              · High <span class="font-semibold">{{ money(history.hi!.total) }}</span> on {{ shortDate(history.hi!.d) }}
              <span class="text-muted-foreground">({{ isBundled(history.hi!.buys) ? "in a bundle" : "on its own" }})</span>
            </p>
          </template>
          <p v-if="history.aloneLo" class="mt-1 text-sm text-muted-foreground" title="What the list cost with no bundles, buying each item on its own">
            {{ needs.size === 1 ? "On its own" : "Each on its own" }}:
            <template v-if="history.aloneHi!.separate! > history.aloneLo.separate!">
              low <span class="font-semibold text-foreground">{{ money(history.aloneLo.separate!) }}</span> on {{ shortDate(history.aloneLo.d) }}
              · high <span class="font-semibold text-foreground">{{ money(history.aloneHi!.separate!) }}</span> on {{ shortDate(history.aloneHi!.d) }}
            </template>
            <template v-else><span class="font-semibold text-foreground">{{ money(history.aloneLo.separate!) }}</span> every day</template>
          </p>
          <ol v-if="history.changes.length > 1" class="mt-2 text-sm">
            <li v-for="c in history.changes" :key="c.d" class="flex items-baseline justify-between gap-3 border-t border-rule py-1.5">
              <span class="flex min-w-0 flex-col gap-0.5">
                <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span class="text-muted-foreground">{{ c.d === history.since ? `${shortDate(c.d)}, first seen` : shortDate(c.d) }}</span>
                  <ToneBadge v-if="history.moved && c.complete && c.total === history.lo!.total" :badge="{ text: 'Cheapest', tone: 'good', hint: `The lowest this list has cost since ${shortDate(history.since)}` }" />
                </span>
                <span class="text-xs text-muted-foreground">
                  <Gift v-if="isBundled(c.buys)" class="mr-1 inline size-3 align-[-1px] text-good" />{{ howText(c.buys) }}<template v-if="isBundled(c.buys) && c.separate != null && c.separate - c.total >= 0.005"> · {{ money(c.separate) }} on {{ needs.size === 1 ? "its" : "their" }} own</template>
                </span>
              </span>
              <span class="text-right whitespace-nowrap">
                <template v-if="!c.complete"><span class="text-xs text-muted-foreground">Not all in stock · </span></template>
                <span v-if="c.delta" class="mr-2 text-xs font-semibold" :class="c.delta < 0 ? 'text-good' : 'text-bad'">{{ c.delta < 0 ? "−" : "+" }}{{ money(Math.abs(c.delta)) }}</span>
                <span :class="c.complete ? 'font-semibold' : 'text-muted-foreground'">{{ money(c.total) }}</span>
              </span>
            </li>
          </ol>
          <p v-if="history.more" class="mt-1 text-xs text-muted-foreground">Latest five changes shown.</p>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 border-t-2 border-border px-4 py-3">
          <span class="text-sm">Send this plan to someone, or keep it for later.</span>
          <Button variant="outline" size="lg" class="rounded-none border-2 border-border pointer-coarse:h-11" @click="copyLink">
            <Check v-if="copied" /><Link2 v-else />
            {{ copied ? "Link copied" : "Copy link to this list" }}
          </Button>
        </div>
        <p class="border-t border-rule px-4 py-3 text-xs text-muted-foreground">
          Uses in-stock prices for single products and every bundle, collected once a day. Check prices on the store before buying.
        </p>
      </section>

      <!-- desktop, empty list: show where the answer will land -->
      <section v-else class="flex flex-col gap-2 border-2 border-dashed border-page-ink/50 p-6 max-lg:hidden" aria-label="Plan">
        <h2 class="font-heading text-xl font-bold text-page-ink uppercase">Cheapest way to buy it</h2>
        <p class="max-w-md text-[0.9375rem] text-pretty text-page-muted">
          Your plan appears here: one total, every listing to buy, and anything a bundle adds for free. It checks every bundle and single item, so the total is the lowest in-stock price today.
        </p>
      </section>
    </div>
  </div>
</template>
