<script setup lang="ts">
import { computed, ref } from "vue";
import { Gift, ImageOff, Minus, Plus, Search, ShoppingCart, Trash2, TriangleAlert, X } from "@lucide/vue";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { money, pct, shortName, type Bundle, type Product } from "@/lib/data";
import { optimise } from "@/lib/optimise";
import { MAX_QTY, useShoppingList } from "@/composables/useShoppingList";

const props = defineProps<{ products: Product[]; bundles: Bundle[]; bySku: Map<string, Product> }>();

const list = useShoppingList();
const thumb = (src: string) => (src ? `${src}?width=96&height=96&fit=bounds&quality=70` : "");
const name = (sku: string) => shortName(props.bySku.get(sku)?.n ?? sku);

// Items on the list that still exist in today's data, in the order they were added.
const rows = computed(() =>
  Object.entries(list.items.value)
    .map(([sku, qty]) => ({ p: props.bySku.get(sku), sku, qty }))
    .filter((r): r is { p: Product; sku: string; qty: number } => !!r.p),
);

const plan = computed(() => {
  if (!rows.value.length) return null;
  const needs = new Map(rows.value.map((r) => [r.sku, r.qty]));
  return optimise(needs, props.bySku, props.bundles);
});
const purchases = computed(() => plan.value?.buys.reduce((n, b) => n + b.count, 0) ?? 0);
const saving = computed(() => {
  const p = plan.value;
  if (!p || p.separate == null || p.separate - p.total < 0.005) return null;
  return { amount: p.separate - p.total, pct: (p.separate - p.total) / p.separate };
});

/* ---------- adding items ---------- */

const q = ref("");
const results = computed(() => {
  const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return props.products.filter((p) => words.every((w) => p.hay.includes(w))).slice(0, 8);
});
function addFirst() {
  if (results.value[0]) { list.add(results.value[0].s); q.value = ""; }
}
</script>

<template>
  <div class="grid items-start gap-4 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
    <!-- the list -->
    <Card class="gap-0 py-0">
      <div class="flex items-center justify-between gap-2 border-b p-4">
        <h2 class="font-heading text-base font-semibold">Your list</h2>
        <Button v-if="rows.length" variant="ghost" size="sm" class="text-muted-foreground" @click="list.clear()">
          <Trash2 /> Clear
        </Button>
      </div>

      <div class="relative border-b p-4">
        <Search class="pointer-events-none absolute top-1/2 left-6.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="q"
          type="search"
          placeholder="Add a product…"
          autocomplete="off"
          aria-label="Add a product"
          class="h-9 pl-8"
          @keydown.enter.prevent="addFirst"
          @keydown.esc="q = ''"
        />
        <ul
          v-if="q && results.length"
          class="absolute inset-x-4 top-full z-30 -mt-2 overflow-hidden rounded-lg border bg-popover shadow-lg"
        >
          <li v-for="p in results" :key="p.s">
            <button
              type="button"
              class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
              @click="list.add(p.s); q = ''"
            >
              <img v-if="p.i" :src="thumb(p.i)" alt="" class="size-8 shrink-0 rounded bg-white object-contain" />
              <span class="min-w-0 flex-1 truncate">{{ shortName(p.n) }}</span>
              <span class="text-muted-foreground tabular-nums">{{ money(p.p) }}</span>
              <Plus v-if="!list.has(p.s)" class="size-4 text-muted-foreground" />
              <span v-else class="text-xs text-muted-foreground">+1</span>
            </button>
          </li>
        </ul>
        <p v-else-if="q" class="absolute inset-x-4 top-full z-30 -mt-2 rounded-lg border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
          No products match.
        </p>
      </div>

      <ul v-if="rows.length" class="divide-y">
        <li v-for="r in rows" :key="r.sku" class="flex items-center gap-3 px-4 py-3">
          <a :href="r.p.u" target="_blank" rel="noopener" class="shrink-0">
            <img v-if="r.p.i" :src="thumb(r.p.i)" alt="" class="size-12 rounded-md bg-white object-contain ring-1 ring-foreground/10" />
            <span v-else class="flex size-12 items-center justify-center rounded-md bg-muted"><ImageOff class="size-5 text-muted-foreground" /></span>
          </a>
          <div class="min-w-0 flex-1">
            <a :href="r.p.u" target="_blank" rel="noopener" class="line-clamp-2 text-sm leading-snug font-medium hover:underline">{{ shortName(r.p.n) }}</a>
            <p class="text-xs text-muted-foreground">
              <template v-if="r.p.sst">{{ money(r.p.sp) }} on its own</template>
              <template v-else>Out of stock on its own</template>
            </p>
          </div>
          <div class="flex shrink-0 items-center rounded-lg border">
            <Button variant="ghost" size="icon-xs" aria-label="One fewer" @click="list.setQty(r.sku, r.qty - 1)"><Minus /></Button>
            <span class="w-6 text-center text-sm tabular-nums" aria-live="polite">{{ r.qty }}</span>
            <Button variant="ghost" size="icon-xs" aria-label="One more" :disabled="r.qty >= MAX_QTY" @click="list.setQty(r.sku, r.qty + 1)"><Plus /></Button>
          </div>
          <Button variant="ghost" size="icon-sm" class="text-muted-foreground" :aria-label="`Remove ${shortName(r.p.n)}`" @click="list.remove(r.sku)">
            <X />
          </Button>
        </li>
      </ul>
      <div v-else class="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
        <ShoppingCart class="size-8 opacity-50" />
        <p>Your list is empty. Search above, or use the cart button on any product.</p>
      </div>
    </Card>

    <!-- the plan -->
    <Card v-if="plan" class="gap-0 py-0 lg:sticky lg:top-4">
      <div class="border-b p-4">
        <h2 class="font-heading text-base font-semibold">Cheapest way to buy it</h2>
        <div class="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span class="text-3xl font-bold tracking-tight tabular-nums">{{ money(plan.total) }}</span>
          <span class="text-sm text-muted-foreground">
            {{ purchases }} purchase{{ purchases === 1 ? "" : "s" }}
          </span>
        </div>
        <p v-if="saving" class="mt-2 inline-block rounded-md bg-good-bg px-2 py-1 text-sm font-medium text-good">
          Saves {{ money(saving.amount) }} ({{ pct(saving.pct) }}) on buying each on its own ({{ money(plan.separate!) }})
        </p>
        <p v-else-if="plan.separate != null && plan.buys.length" class="mt-2 text-sm text-muted-foreground">
          Buying each on its own is already the cheapest way.
        </p>
        <p v-if="!plan.exact" class="mt-2 text-xs text-muted-foreground">
          This list is large, so this is a very good plan rather than a guaranteed best one.
        </p>
      </div>

      <div v-if="plan.unavailable.length" class="flex gap-2 border-b bg-warn-bg p-4 text-sm text-warn">
        <TriangleAlert class="mt-0.5 size-4 shrink-0" />
        <p>
          Not in stock anywhere right now, so not included:
          <strong class="font-semibold">{{ plan.unavailable.map(name).join(", ") }}</strong>
        </p>
      </div>

      <ul class="divide-y">
        <li v-for="b in plan.buys" :key="b.listing.s" class="flex gap-3 p-4">
          <a :href="b.listing.u" target="_blank" rel="noopener" class="shrink-0">
            <img v-if="b.listing.i" :src="thumb(b.listing.i)" alt="" class="size-14 rounded-md bg-white object-contain ring-1 ring-foreground/10" />
            <span v-else class="flex size-14 items-center justify-center rounded-md bg-muted"><ImageOff class="size-5 text-muted-foreground" /></span>
          </a>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <a :href="b.listing.u" target="_blank" rel="noopener" class="line-clamp-2 text-sm leading-snug font-medium hover:underline">
                {{ shortName(b.listing.n) }}
              </a>
              <span class="text-right font-bold whitespace-nowrap tabular-nums">
                <template v-if="b.count > 1"><span class="font-normal text-muted-foreground">{{ b.count }} × {{ money(b.listing.p) }}</span><br /></template>
                {{ money(b.listing.p * b.count) }}
              </span>
            </div>
            <Badge variant="outline" class="mt-1 rounded-md">{{ b.listing.bundle ? "Bundle" : "On its own" }}</Badge>
            <p v-if="b.listing.bundle" class="mt-1.5 text-xs">
              <span class="text-muted-foreground">For:</span>
              {{ b.covers.map(([s, n]) => name(s) + (n > 1 ? ` ×${n}` : "")).join(", ") }}
            </p>
            <p v-if="b.extras.length" class="mt-1 flex gap-1 text-xs text-good">
              <Gift class="mt-px size-3.5 shrink-0" />
              <span>Also comes with {{ b.extras.map(([s, n]) => name(s) + (n > 1 ? ` ×${n}` : "")).join(", ") }}</span>
            </p>
          </div>
        </li>
      </ul>

      <p class="border-t p-4 text-xs text-muted-foreground">
        Uses today's in-stock prices for single products and every bundle. Check prices on the store before buying.
      </p>
    </Card>
  </div>
</template>
