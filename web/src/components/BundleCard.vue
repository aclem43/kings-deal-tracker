<script setup lang="ts">
import { computed } from "vue";
import ItemCard from "./ItemCard.vue";
import { bundleBadges, money, type Bundle } from "@/lib/data";

const props = defineProps<{ item: Bundle }>();
const p = computed(() => props.item);
const showParts = computed(() => p.value.ps && Math.abs(p.value.sv) > 0.005);
</script>

<template>
  <ItemCard :item="p" :badges="bundleBadges(p)" :was="p.recentDrop ? p.pv : null">
    <template #how>
      <p v-if="showParts" class="-mt-1.5 text-xs text-muted-foreground">Parts separately {{ money(p.ps) }}</p>
    </template>
    <p class="text-xs text-muted-foreground">{{ p.x.join(" + ") }}</p>
  </ItemCard>
</template>
