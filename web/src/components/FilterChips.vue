<script setup lang="ts">
import { computed } from "vue";
import { Star } from "@lucide/vue";
import { useFilters, type Flag } from "@/composables/useFilters";

// The on/off filters, each with how many results it would give. A filter that would give
// nothing is disabled and says why, instead of leading to an empty page.
const props = defineProps<{
  counts: Record<Flag, number>;
  watchCount: number;
  building: boolean;
  vertical?: boolean;
}>();

const { state } = useFilters();

const flags = computed(() => {
  const list: { key: Flag; label: string; why?: string }[] = [{ key: "instock", label: "In stock" }];
  if (state.view === "products") list.push({ key: "viabundle", label: "Cheaper in a bundle" });
  else list.push({ key: "antideal", label: "Dearer than its parts" });
  const historyWhy = props.building ? "Needs price changes; history is still building" : "None right now";
  list.push({ key: "atl", label: "At all-time low", why: historyWhy }, { key: "dropped", label: "Recently dropped", why: historyWhy });
  list.push({ key: "watchonly", label: "Watch list", why: "Star items to add them" });
  return list.map((f) => {
    const n = f.key === "watchonly" ? props.watchCount : props.counts[f.key];
    return { ...f, n, off: !state[f.key] && n === 0 };
  });
});
</script>

<template>
  <div :class="vertical ? 'flex flex-col gap-1.5' : 'flex gap-1.5'">
    <div v-for="f in flags" :key="f.key" :class="vertical ? '' : 'shrink-0'">
      <button
        type="button"
        :aria-pressed="state[f.key]"
        :disabled="f.off"
        :title="f.off ? f.why : undefined"
        class="flex min-h-9 w-full items-center justify-between gap-3 border-2 border-border bg-card px-2.5 text-left text-sm font-semibold whitespace-nowrap text-card-foreground transition-colors hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground disabled:cursor-not-allowed disabled:border-dashed disabled:bg-card/60 disabled:text-muted-foreground pointer-coarse:min-h-11"
        :class="f.key === 'watchonly' && 'aria-pressed:bg-hivis! aria-pressed:text-hivis-ink!'"
        @click="state[f.key] = !state[f.key]"
      >
        <span class="flex items-center gap-1.5">
          <Star v-if="f.key === 'watchonly'" class="size-4" :class="state.watchonly && 'fill-current'" />
          {{ f.label }}
        </span>
        <span class="font-medium">{{ f.off ? "0" : f.n.toLocaleString() }}</span>
      </button>
      <p v-if="vertical && f.off" class="mt-0.5 mb-1 text-xs text-page-muted">{{ f.why }}</p>
    </div>
  </div>
</template>
