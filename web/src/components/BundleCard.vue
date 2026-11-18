<script setup lang="ts">
import { computed } from "vue";
import ItemCard from "./ItemCard.vue";
import Manifest from "./Manifest.vue";
import { useFilters } from "@/composables/useFilters";
import { bundleBadges, money, splitQty, type Bundle } from "@/lib/data";

const props = defineProps<{ item: Bundle }>();
const p = computed(() => props.item);
const { state } = useFilters();
// Each part, with the product being browsed ("containing …") marked.
const lines = computed(() => p.value.x.map((x, i) => {
  const l = splitQty(x);
  return { name: l.name, qty: p.value.kq?.[i] ?? l.qty, mark: !!state.has && p.value.k[i] === state.has };
}));
const showParts = computed(() => !!p.value.ps && Math.abs(p.value.sv) > 0.005);
const compare = computed(() => {
  if (showParts.value) return { label: "Parts", value: p.value.ps, hint: `Buying each part on its own today costs ${money(p.value.ps)}` };
  if (p.value.recentDrop && p.value.pv != null) return { label: "Was", value: p.value.pv, hint: "The previous price" };
  return null;
});
</script>

<template>
  <ItemCard :item="p" :badges="bundleBadges(p)" :compare="compare">
    <Manifest :sku="p.s" :lines="lines" />
  </ItemCard>
</template>
