<script setup lang="ts">
import { computed } from "vue";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FilterChips from "./FilterChips.vue";
import { useFilters, type Flag } from "@/composables/useFilters";

// The wide-screen filter rail: on/off filters, departments with their counts, and the
// category list (too long for chips, so it stays a select).
const props = defineProps<{
  counts: Record<Flag, number>;
  watchCount: number;
  building: boolean;
  depts: { name: string; n: number }[];
  subs: string[];
}>();

const { state, setDept } = useFilters();
const ALL = "__all";
const sub = computed({
  get: () => state.sub || ALL,
  set: (v: string) => { state.sub = v === ALL ? "" : v; },
});
const total = computed(() => props.depts.reduce((n, d) => Math.max(n, d.n), 0));
</script>

<template>
  <nav aria-label="Filters" class="flex flex-col gap-5">
    <section>
      <h2 class="mb-1.5 label-caps text-page-muted">Show</h2>
      <FilterChips :counts="counts" :watch-count="watchCount" :building="building" vertical />
    </section>

    <section>
      <h2 class="mb-1.5 label-caps text-page-muted">Department</h2>
      <div class="flex flex-col gap-1.5">
        <button
          v-for="d in [{ name: '', n: -1 }, ...depts]"
          :key="d.name"
          type="button"
          :aria-pressed="state.dept === d.name"
          :disabled="d.n === 0 && state.dept !== d.name"
          class="flex min-h-9 items-center justify-between gap-3 border-2 border-border bg-card px-2.5 text-left text-sm font-semibold text-card-foreground transition-colors hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground disabled:cursor-not-allowed disabled:border-dashed disabled:bg-card/60 disabled:text-muted-foreground"
          @click="setDept(d.name)"
        >
          <span>{{ d.name || "All departments" }}</span>
          <span v-if="d.n >= 0" class="font-medium">{{ d.n.toLocaleString() }}</span>
          <span v-else class="sr-only">{{ total }}</span>
        </button>
      </div>
    </section>

    <section>
      <h2 class="mb-1.5 label-caps text-page-muted">Category</h2>
      <Select v-model="sub">
        <SelectTrigger class="h-10! w-full rounded-none border-2 border-border bg-card font-semibold" aria-label="Category">
          <SelectValue />
        </SelectTrigger>
        <SelectContent class="rounded-none border-2 border-border">
          <SelectItem :value="ALL">All categories</SelectItem>
          <SelectItem v-for="o in subs" :key="o" :value="o">{{ o }}</SelectItem>
        </SelectContent>
      </Select>
    </section>
  </nav>
</template>
