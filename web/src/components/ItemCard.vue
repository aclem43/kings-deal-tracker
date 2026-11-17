<script setup lang="ts">
import { computed } from "vue";
import { Star, ImageOff, ShoppingCart, Check } from "@lucide/vue";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Sparkline from "./Sparkline.vue";
import ToneBadge from "./ToneBadge.vue";
import { imageUrl, money, statsLine, type BadgeInfo, type Item } from "@/lib/data";
import { useWatchList } from "@/composables/useWatchList";
import { useShoppingList } from "@/composables/useShoppingList";

// The frame shared by product and bundle cards: image, watch star, name, price, badges,
// sparkline and stats. The default slot holds what differs between the two.
const props = defineProps<{ item: Item; badges: BadgeInfo[]; was?: number | null; listable?: boolean }>();

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
</script>

<template>
  <Card class="relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
    <Button
      variant="outline"
      size="icon"
      class="absolute top-2.5 right-2.5 z-10 size-8 rounded-full bg-card/90 backdrop-blur"
      :class="on ? 'border-transparent bg-warn-bg! text-warn' : 'text-muted-foreground'"
      :aria-pressed="on"
      :aria-label="label"
      :title="label"
      @click="watch.toggle(item.s)"
    >
      <Star :class="on && 'fill-current'" />
    </Button>
    <Button
      v-if="listable"
      variant="outline"
      size="icon"
      class="absolute top-12 right-2.5 z-10 size-8 rounded-full bg-card/90 backdrop-blur"
      :class="inList ? 'border-transparent bg-good-bg! text-good' : 'text-muted-foreground'"
      :aria-pressed="inList"
      :aria-label="cartLabel"
      :title="cartLabel"
      @click="cart.toggle(item.s)"
    >
      <Check v-if="inList" />
      <ShoppingCart v-else />
    </Button>

    <!-- A fixed-height box so every card in a row starts its text at the same line. -->
    <a :href="item.u" target="_blank" rel="noopener" tabindex="-1" class="relative block h-44 shrink-0 bg-white sm:h-48">
      <img v-if="item.i" :src="imageUrl(item)" alt="" loading="lazy" class="absolute inset-0 size-full object-contain p-3" />
      <ImageOff v-else class="absolute inset-0 m-auto size-8 text-stone-300" />
    </a>

    <div class="flex flex-1 flex-col gap-2.5 border-t p-4">
      <a :href="item.u" target="_blank" rel="noopener" class="line-clamp-2 min-h-[2lh] text-[0.9rem] leading-snug hover:underline" :title="item.n">
        <span class="font-medium">{{ title }}</span><span v-if="rest" class="text-muted-foreground"> · {{ rest }}</span>
      </a>

      <div class="flex flex-wrap items-baseline gap-2">
        <span class="text-xl font-bold tracking-tight tabular-nums">{{ money(item.p) }}</span>
        <span v-if="was != null" class="text-sm text-muted-foreground line-through tabular-nums">{{ money(was) }}</span>
      </div>

      <slot name="how" />

      <div v-if="badges.length" class="flex flex-wrap gap-1">
        <ToneBadge v-for="b in badges" :key="b.text" :badge="b" />
      </div>

      <slot />

      <div class="mt-auto flex flex-col gap-1.5 border-t pt-3">
        <Sparkline :item="item" />
        <p class="text-xs text-muted-foreground">{{ statsLine(item) }}</p>
      </div>
    </div>
  </Card>
</template>
