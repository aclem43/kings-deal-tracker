<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronRight, ArrowRight } from "@lucide/vue";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ItemCard from "./ItemCard.vue";
import Manifest from "./Manifest.vue";
import { money, productBadges, shortName, splitQty, type Product } from "@/lib/data";

const props = defineProps<{ item: Product; expanded?: boolean }>();
const p = computed(() => props.item);
const open = ref(!!props.expanded);
const allLink = computed(() => `#view=bundles&has=${encodeURIComponent(p.value.s)}&sort=price-asc`);

// The winning bundle, shown as a consignment: this product's line first, then what comes with it.
const win = computed(() => (p.value.via ? p.value.b.find((o) => o.s === p.value.via) : undefined));
const extras = computed(() => (win.value ? win.value.x.map(splitQty) : []));
const extraCount = computed(() => extras.value.reduce((n, l) => n + l.qty, 0));
const manifest = computed(() => win.value
  ? [{ name: shortName(p.value.n), qty: win.value.q, mark: true }, ...extras.value]
  : []);
const others = computed(() => p.value.b.filter((o) => o.s !== p.value.via));

const compare = computed(() => {
  if (p.value.via) {
    return p.value.sst
      ? { label: "Alone", value: p.value.sp, hint: `Bought on its own, without the extras, it costs ${money(p.value.sp)} today` }
      : null;
  }
  if (p.value.recentDrop && p.value.pv != null) return { label: "Was", value: p.value.pv, hint: "The previous price", was: true };
  return null;
});
</script>

<template>
  <ItemCard :item="p" :badges="productBadges(p)" :compare="compare" :full="expanded" listable>
    <template #how>
      <p class="text-[0.8125rem] text-muted-foreground">
        <template v-if="p.via">
          Bundle price, includes {{ extraCount }} other item{{ extraCount === 1 ? "" : "s" }}<template v-if="win && win.q > 1"> and {{ win.q }} of these</template><template v-if="!p.sst"> · out of stock on its own</template>
        </template>
        <template v-else-if="p.nb">Cheapest on its own · in {{ p.nb }} bundle{{ p.nb === 1 ? "" : "s" }}</template>
        <template v-else>Only sold on its own</template>
      </p>
    </template>

    <!-- the consignment: how the winning bundle is made up, this product first. Phones get one line. -->
    <template v-if="win">
      <Manifest :sku="win.s" :href="win.u" :lines="manifest" :class="!expanded && 'max-sm:hidden'" />
      <a v-if="!expanded" :href="win.u" target="_blank" rel="noopener" class="text-[0.8125rem] leading-snug font-semibold hover:underline sm:hidden">
        + {{ extras.map((l) => l.name + (l.qty > 1 ? ` ×${l.qty}` : "")).join(", ") }}
      </a>
    </template>

    <Collapsible v-if="others.length" v-model:open="open" class="text-[0.8125rem]">
      <CollapsibleTrigger class="group flex min-h-8 w-full items-center gap-1 text-muted-foreground hover:text-foreground pointer-coarse:min-h-11">
        <ChevronRight class="size-4 transition-transform group-data-[state=open]:rotate-90" />
        {{ win ? "Other bundles" : "Bundles with it" }} ({{ p.nb - (win ? 1 : 0) }})
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul class="mt-1 flex flex-col">
          <li v-for="o in others" :key="o.s" :class="!o.st && 'opacity-60'" class="border-t border-rule first:border-t-0">
            <a :href="o.u" target="_blank" rel="noopener" class="flex gap-2 py-1.5 hover:underline pointer-coarse:py-3">
              <span class="font-bold whitespace-nowrap">{{ money(o.p) }}</span>
              <span class="text-muted-foreground">
                <template v-if="o.q > 1">{{ o.q }}× this </template>
                <template v-if="o.x.length">+ {{ o.x.join(", ") }}</template>
                <template v-if="!o.st"> · out of stock</template>
              </span>
            </a>
          </li>
        </ul>
        <a v-if="p.nb > p.b.length" :href="allLink" class="mt-1 inline-flex min-h-8 items-center gap-1 text-muted-foreground hover:text-foreground hover:underline pointer-coarse:min-h-11">
          All {{ p.nb }} bundles with this <ArrowRight class="size-3.5" />
        </a>
      </CollapsibleContent>
    </Collapsible>
  </ItemCard>
</template>
