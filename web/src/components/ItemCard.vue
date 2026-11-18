<script setup lang="ts">
import { computed } from "vue";
import { Star, ImageOff, ShoppingCart, Check } from "@lucide/vue";
import Sparkline from "./Sparkline.vue";
import ToneBadge from "./ToneBadge.vue";
import { hasHistory, imageUrl, money, statsLine, USUAL_HINT, type BadgeInfo, type Item } from "@/lib/data";
import { useWatchList } from "@/composables/useWatchList";
import { useShoppingList } from "@/composables/useShoppingList";

// The label shared by product and bundle cards: image, watch and list buttons, name, the
// price in a reversed routing block with what it is compared against, badges, and history
// once there is any. The `how` slot explains the price; the default slot holds the rest.
//
// On phones the label lies on its side (photo left, name and price right) so a quick price
// check shows several products a screen; `full` keeps the upright label, for a shared link.
// Only a previous price of the same listing is struck through (`was`); "alone" and "parts"
// prices buy something different, so they print as plain comparison figures.
const props = defineProps<{
  item: Item;
  badges: BadgeInfo[];
  compare?: { label: string; value: number; hint: string; was?: boolean } | null;
  listable?: boolean;
  full?: boolean;
}>();

// "Kings Fridge | 12V | Steel" -> bold "Kings Fridge", then the rest muted.
const parts = computed(() => props.item.n.split("|").map((s) => s.trim()).filter(Boolean));
const title = computed(() => parts.value[0] ?? props.item.n);
const rest = computed(() => parts.value.slice(1).join(" · "));

const watch = useWatchList();
const on = computed(() => watch.has(props.item.s));
const label = computed(() => (on.value ? "Remove from watch list" : "Add to watch list"));

const cart = useShoppingList();
const inList = computed(() => cart.has(props.item.s));
const cartLabel = computed(() => (inList.value ? "Remove from shopping list" : "Add to shopping list"));

const stats = computed(() => statsLine(props.item));
const btn = "flex size-9 items-center justify-center border-2 border-border bg-card text-card-foreground transition-colors hover:bg-muted pointer-coarse:size-11 [&_svg]:size-4";
const side = computed(() => !props.full);
</script>

<template>
  <article
    class="label-stock relative flex flex-col"
    :class="side && 'max-sm:grid max-sm:grid-cols-[6.5rem_minmax(0,1fr)] max-sm:grid-rows-[auto_auto_1fr]'"
  >
    <div
      class="absolute top-2 right-2 z-10 flex flex-col gap-1"
      :class="side && 'max-sm:static max-sm:col-start-1 max-sm:row-start-3 max-sm:flex-row max-sm:items-start max-sm:justify-center max-sm:border-r-2 max-sm:border-border max-sm:py-2'"
    >
      <button type="button" :class="[btn, on && 'bg-hivis! text-hivis-ink']" :aria-pressed="on" :aria-label="label" :title="label" @click="watch.toggle(item.s)">
        <Star :class="on && 'fill-current'" />
      </button>
      <button
        v-if="listable"
        type="button"
        :class="[btn, inList && 'bg-good! text-background']"
        :aria-pressed="inList"
        :aria-label="cartLabel"
        :title="cartLabel"
        @click="cart.toggle(item.s)"
      >
        <Check v-if="inList" />
        <ShoppingCart v-else />
      </button>
    </div>

    <!-- A fixed-height box so every label in a row starts its text at the same line. -->
    <a
      :href="item.u"
      target="_blank"
      rel="noopener"
      tabindex="-1"
      class="relative block h-40 shrink-0 border-b-2 border-border bg-well"
      :class="side && 'max-sm:col-start-1 max-sm:row-span-2 max-sm:row-start-1 max-sm:h-auto max-sm:min-h-24 max-sm:border-r-2 max-sm:border-b-0'"
    >
      <img v-if="item.i" :src="imageUrl(item)" alt="" loading="lazy" class="absolute inset-0 size-full object-contain p-3 dark:mix-blend-multiply" :class="side && 'max-sm:p-1.5'" />
      <ImageOff v-else class="absolute inset-0 m-auto size-8 text-well-ink" />
    </a>

    <h3 :class="side && 'max-sm:col-start-2 max-sm:row-start-1'">
      <a :href="item.u" target="_blank" rel="noopener" class="block px-3 pt-2.5 pb-2 text-[0.9375rem] leading-snug hover:underline" :title="item.n">
        <span class="line-clamp-2 min-h-[2lh]"><span class="font-semibold">{{ title }}</span><span v-if="rest" class="text-muted-foreground"> · {{ rest }}</span></span>
      </a>
    </h3>

    <!-- the routing block: today's price, reversed, with what it is compared against -->
    <div class="grid grid-cols-[auto_1fr] border-t-2 border-border" :class="side && 'max-sm:col-start-2 max-sm:row-start-2 max-sm:self-end'">
      <span class="bg-primary px-3 py-1 font-heading text-[2rem] leading-tight font-bold text-primary-foreground">{{ money(item.p) }}</span>
      <span v-if="compare" class="flex flex-col items-end justify-center px-3 text-right leading-tight" :title="compare.hint">
        <span class="label-caps text-muted-foreground">{{ compare.label }}</span>
        <s v-if="compare.was" class="font-semibold">{{ money(compare.value) }}</s>
        <span v-else class="font-semibold">{{ money(compare.value) }}</span>
        <span class="sr-only">{{ compare.hint }}</span>
      </span>
    </div>

    <div class="flex flex-1 flex-col gap-2 px-3 pt-2 pb-3" :class="side && 'max-sm:col-start-2 max-sm:row-start-3 max-sm:border-t-2 max-sm:border-border'">
      <slot name="how" />
      <div v-if="badges.length" class="flex flex-wrap gap-1">
        <ToneBadge v-for="b in badges" :key="b.text" :badge="b" />
      </div>
      <slot />
      <div v-if="hasHistory(item)" class="mt-auto flex flex-col gap-1.5 border-t border-rule pt-2.5">
        <Sparkline :item="item" :class="side && 'max-sm:hidden'" />
        <p class="text-xs text-muted-foreground" :title="item.ty ? USUAL_HINT : undefined">{{ stats }}</p>
      </div>
    </div>
  </article>
</template>
