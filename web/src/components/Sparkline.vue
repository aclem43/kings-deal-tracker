<script setup lang="ts">
import { computed } from "vue";
import { DAY, money, today, type Item } from "@/lib/data";

const props = defineProps<{ item: Item }>();

const W = 200, H = 36, PAD = 4;

// A step line: prices hold until the next change, then the line runs on to today.
// Drawn only once the price has actually moved; a flat line carries no information.
const chart = computed(() => {
  const h = props.item.h;
  if (h.length < 2 || props.item.hi === props.item.lo) return null;
  const pts = h.map(([d, v]) => [new Date(d).getTime(), v] as const);
  const end = Math.max(today.getTime(), pts[pts.length - 1][0]);
  const start = Math.min(pts[0][0], end - DAY);
  const lo = props.item.lo, hi = props.item.hi;
  const x = (t: number) => ((t - start) / (end - start)) * W;
  const y = (v: number) => PAD + (1 - (v - lo) / (hi - lo)) * (H - 2 * PAD);
  let d = `M${x(pts[0][0]).toFixed(1)},${y(pts[0][1]).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += `H${x(pts[i][0]).toFixed(1)}V${y(pts[i][1]).toFixed(1)}`;
  d += `H${W}`;
  return {
    d,
    area: `${d}V${H}H${x(pts[0][0]).toFixed(1)}Z`,
    cy: y(props.item.p),
    label: "Price history: " + h.map(([dd, v]) => `${dd} ${money(v)}`).join(", "),
  };
});
</script>

<template>
  <div v-if="chart" class="relative h-9 w-full">
    <svg
      class="absolute inset-0 h-full w-full overflow-visible"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="none"
      role="img"
      :aria-label="chart.label"
    >
      <path :d="chart.area" class="fill-foreground/8" />
      <path :d="chart.d" class="fill-none stroke-foreground" stroke-width="1.5" vector-effect="non-scaling-stroke" />
    </svg>
    <span
      class="absolute right-0 size-2 translate-x-1/2 -translate-y-1/2 bg-foreground ring-2 ring-card"
      :style="{ top: `${(chart.cy / H) * 100}%` }"
    />
  </div>
</template>
