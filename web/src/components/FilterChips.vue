<script setup lang="ts">
import { computed } from "vue";
import { Star } from "@lucide/vue";
import { useFilters, type Flag } from "@/composables/useFilters";

// The on/off filters, each with how many results it would give. A filter that would give
// nothing is disabled and says why, instead of leading to an empty page. While price
// history is still building, the two history filters can't match anything, so they fold
// into one note instead of taking two dead chips; the watch-list chip appears once
// something is starred. Disabled chips sort to the end.
const props = defineProps<{
  counts: Record<Flag, number>;
  watchCount: number;
  building: boolean;
  minDays: number;
  vertical?: boolean;
}>();

const { state } = useFilters();

const flags = computed(() => {
  const list: { key: Flag; label: string; why: string }[] = [];
  const noMatch = "No matches with the other filters";
  list.push({ key: "instock", label: "In stock", why: noMatch });
  if (state.view === "products") list.push({ key: "viabundle", label: "Cheaper in a bundle", why: noMatch });
  else list.push({ key: "antideal", label: "Dearer than its parts", why: noMatch });
  list.push({ key: "atl", label: "At all-time low", why: "None right now" }, { key: "dropped", label: "Recently dropped", why: "None right now" });
  if (props.watchCount > 0 || state.watchonly) list.push({ key: "watchonly", label: "Watch list", why: "None of your starred items match" });
  return list
    .map((f) => {
      const n = f.key === "watchonly" ? props.watchCount : props.counts[f.key];
      return { ...f, n, off: !state[f.key] && n === 0 };
    })
    .filter((f) => !(props.building && f.off && (f.key === "atl" || f.key === "dropped")))
    .sort((a, b) => Number(a.off) - Number(b.off));
});

const historyNote = computed(() => {
  if (!props.building) return "";
  const hidden = ["atl", "dropped"].filter((k) => !flags.value.some((f) => f.key === k));
  return hidden.length ? `All-time low and recent drop filters start on day ${props.minDays}, once prices have history.` : "";
});
const anyOff = computed(() => flags.value.some((f) => f.off));
</script>

<template>
  <div v-if="vertical" class="flex flex-col gap-1.5">
    <div v-for="f in flags" :key="f.key">
      <button
        type="button"
        :aria-pressed="state[f.key]"
        :disabled="f.off"
        :aria-describedby="f.off ? `why-${f.key}` : undefined"
        class="chip w-full"
        :class="f.key === 'watchonly' && 'aria-pressed:bg-hivis! aria-pressed:text-hivis-ink!'"
        @click="state[f.key] = !state[f.key]"
      >
        <span class="flex items-center gap-1.5">
          <Star v-if="f.key === 'watchonly'" class="size-4" :class="state.watchonly && 'fill-current'" />
          {{ f.label }}
        </span>
        <span class="font-medium">{{ f.off ? "0" : f.n.toLocaleString() }}</span>
      </button>
      <p v-if="f.off" :id="`why-${f.key}`" class="mt-0.5 mb-1 text-xs text-page-muted">{{ f.why }}</p>
    </div>
    <p v-if="historyNote" class="border-t-2 border-dashed border-page-ink/40 pt-1.5 text-xs text-page-muted">{{ historyNote }}</p>
  </div>

  <div v-else>
    <div class="-mx-4 overflow-x-auto px-4 pr-10 [mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)] [scrollbar-width:none]">
      <div class="flex gap-1.5">
        <button
          v-for="f in flags"
          :key="f.key"
          type="button"
          :aria-pressed="state[f.key]"
          :disabled="f.off"
          :aria-label="f.off ? `${f.label}: ${f.why}` : undefined"
          class="chip shrink-0"
          :class="f.key === 'watchonly' && 'aria-pressed:bg-hivis! aria-pressed:text-hivis-ink!'"
          @click="state[f.key] = !state[f.key]"
        >
          <span class="flex items-center gap-1.5">
            <Star v-if="f.key === 'watchonly'" class="size-4" :class="state.watchonly && 'fill-current'" />
            {{ f.label }}
          </span>
          <span class="font-medium">{{ f.off ? "0" : f.n.toLocaleString() }}</span>
        </button>
      </div>
    </div>
    <p v-if="historyNote || anyOff" class="mt-1.5 text-xs text-pretty text-page-muted">
      <template v-if="anyOff">Dashed filters have no matches with what's selected. </template>{{ historyNote }}
    </p>
  </div>
</template>

<style scoped>
@reference "../style.css";
.chip {
  @apply flex min-h-9 items-center justify-between gap-3 border-2 border-border bg-card px-2.5 text-left text-sm font-semibold whitespace-nowrap text-card-foreground transition-colors hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground disabled:cursor-not-allowed disabled:border-dashed disabled:bg-card/60 disabled:text-muted-foreground pointer-coarse:min-h-11;
}
</style>
