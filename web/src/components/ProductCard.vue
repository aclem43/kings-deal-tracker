<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronRight, ArrowRight } from "@lucide/vue";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ItemCard from "./ItemCard.vue";
import { money, productBadges, type Product } from "@/lib/data";

const props = defineProps<{ item: Product }>();
const p = computed(() => props.item);
const open = ref(!!props.item.via);
const allLink = computed(() => `#view=bundles&has=${encodeURIComponent(p.value.s)}&sort=price-asc`);
</script>

<template>
  <ItemCard :item="p" :badges="productBadges(p)" :was="p.recentDrop ? p.pv : null">
    <template #how>
      <p v-if="p.via" class="-mt-1 text-xs text-muted-foreground">
        Cheapest in a bundle · alone {{ money(p.sp) }}<template v-if="!p.sst"> (out of stock)</template>
      </p>
      <p v-else-if="p.nb" class="-mt-1 text-xs text-muted-foreground">Cheapest on its own</p>
    </template>

    <Collapsible v-if="p.b.length" v-model:open="open" class="border-t pt-2 text-xs">
      <CollapsibleTrigger class="group flex w-full items-center gap-1 text-muted-foreground hover:text-foreground">
        <ChevronRight class="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
        In {{ p.nb }} bundle{{ p.nb === 1 ? "" : "s" }}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul class="mt-2 flex flex-col gap-1">
          <li v-for="o in p.b" :key="o.s" :class="!o.st && 'opacity-55'">
            <a
              :href="o.u"
              target="_blank"
              rel="noopener"
              class="flex gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
              :class="o.s === p.via && 'bg-good-bg hover:bg-good-bg/80'"
            >
              <span class="font-bold whitespace-nowrap tabular-nums" :class="o.s === p.via && 'text-good'">{{ money(o.p) }}</span>
              <span class="text-muted-foreground">
                <template v-if="o.q > 1">{{ o.q }}× this </template>
                <template v-if="o.x.length">+ {{ o.x.join(", ") }}</template>
                <template v-if="!o.st"> · out of stock</template>
              </span>
            </a>
          </li>
        </ul>
        <a
          v-if="p.nb > p.b.length"
          :href="allLink"
          class="mt-2 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
        >
          All {{ p.nb }} bundles with this <ArrowRight class="size-3" />
        </a>
      </CollapsibleContent>
    </Collapsible>
  </ItemCard>
</template>
