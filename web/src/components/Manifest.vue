<script setup lang="ts">
import { computed } from "vue";

// A consignment manifest: the listing's SKU, then its contents counted out piece by piece.
// Lines with more than one piece show a range (PCS 2–3/4) so big packs stay short.
export interface ManifestLine { name: string; qty: number; mark?: boolean }
const props = defineProps<{ sku: string; lines: ManifestLine[]; href?: string }>();

const rows = computed(() => {
  const total = props.lines.reduce((n, l) => n + l.qty, 0);
  let at = 0;
  return props.lines.map((l) => {
    const from = at + 1;
    at += l.qty;
    return { ...l, pcs: `${from === at ? from : `${from}–${at}`}/${total}` };
  });
});
</script>

<template>
  <component :is="href ? 'a' : 'div'" :href="href" :target="href ? '_blank' : undefined" :rel="href ? 'noopener' : undefined" class="block border-2 border-border" :class="href && 'hover:bg-muted'" :title="href ? `Open ${sku} on the store` : undefined">
    <p class="border-b border-rule px-2 pt-1 pb-0.5 leading-tight">
      <span class="block label-caps text-[0.6875rem] text-muted-foreground">Consignment</span>
      <span class="block font-heading text-[0.8125rem] font-bold tracking-[0.04em] break-all">{{ sku }}</span>
    </p>
    <ul class="text-[0.8125rem] leading-snug">
      <li v-for="(r, i) in rows" :key="i" class="flex justify-between gap-2 border-t border-rule px-2 py-1 first:border-t-0" :class="r.mark && 'bg-good-bg font-semibold'">
        <span class="text-pretty">{{ r.name }}</span>
        <span class="shrink-0 font-heading font-bold tracking-[0.04em] whitespace-nowrap">PCS {{ r.pcs }}</span>
      </li>
    </ul>
  </component>
</template>
