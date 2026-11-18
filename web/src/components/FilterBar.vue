<script setup lang="ts">
import { computed } from "vue";
import { SlidersHorizontal, X } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ProductSearch from "./ProductSearch.vue";
import FilterChips from "./FilterChips.vue";
import { useFilters, type Flag } from "@/composables/useFilters";
import type { Item } from "@/lib/data";

// The narrow-screen filter bar: search, a sheet for department and category, and a row of
// filter chips that scrolls sideways (the fade on the right says there is more).
const props = defineProps<{
  depts: { name: string; n: number }[];
  subs: string[];
  pool: Item[];
  counts: Record<Flag, number>;
  watchCount: number;
  building: boolean;
  minDays: number;
}>();

const { state, setDept } = useFilters();
const ALL = "__all";
const dept = computed({ get: () => state.dept || ALL, set: (v: string) => setDept(v === ALL ? "" : v) });
const sub = computed({ get: () => state.sub || ALL, set: (v: string) => { state.sub = v === ALL ? "" : v; } });
const selects = computed(() => [
  { key: "dept", model: dept, label: "Department", all: "All departments", options: props.depts.map((d) => `${d.name}`), counts: new Map(props.depts.map((d) => [d.name, d.n])) },
  { key: "sub", model: sub, label: "Category", all: "All categories", options: props.subs, counts: null },
]);
const active = computed(() => (state.dept ? 1 : 0) + (state.sub ? 1 : 0));
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div class="flex gap-2">
      <ProductSearch :depts="depts.map((d) => d.name)" :subs="subs" :pool="pool" class="flex-1" />
      <Sheet>
        <SheetTrigger as-child>
          <Button variant="outline" class="relative h-10 shrink-0 rounded-none border-2 border-border bg-card pointer-coarse:h-11" aria-label="Department and category">
            <SlidersHorizontal />
            <span class="max-sm:sr-only">Filters</span>
            <span v-if="active" class="absolute -top-2 -right-2 flex size-5 items-center justify-center bg-hivis text-[0.75rem] font-bold text-hivis-ink">{{ active }}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" class="rounded-none border-t-2 border-border pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle class="font-heading text-xl font-bold uppercase">Department and category</SheetTitle>
            <SheetDescription class="sr-only">Narrow the list by department and category.</SheetDescription>
          </SheetHeader>
          <div class="flex flex-col gap-4 px-4">
            <label v-for="s in selects" :key="s.key" class="flex flex-col gap-1.5 text-sm font-semibold">
              {{ s.label }}
              <Select v-model="s.model.value">
                <SelectTrigger class="h-11! w-full rounded-none border-2 border-border bg-card"><SelectValue /></SelectTrigger>
                <SelectContent class="rounded-none border-2 border-border">
                  <SelectItem :value="ALL">{{ s.all }}</SelectItem>
                  <SelectItem v-for="o in s.options" :key="o" :value="o">{{ o }}<template v-if="s.counts"> ({{ s.counts.get(o) }})</template></SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
        </SheetContent>
      </Sheet>
    </div>

    <div v-if="state.dept || state.sub" class="flex flex-wrap gap-1.5">
      <button v-if="state.dept" type="button" class="picked" :aria-label="`Remove department: ${state.dept}`" @click="setDept('')">{{ state.dept }} <X class="size-3.5" /></button>
      <button v-if="state.sub" type="button" class="picked" :aria-label="`Remove category: ${state.sub}`" @click="state.sub = ''">{{ state.sub }} <X class="size-3.5" /></button>
    </div>
    <FilterChips :counts="counts" :watch-count="watchCount" :building="building" :min-days="minDays" />
  </div>
</template>

<style scoped>
@reference "../style.css";
.picked {
  @apply inline-flex min-h-9 items-center gap-1 border-2 border-border bg-primary px-2.5 text-sm font-semibold text-primary-foreground pointer-coarse:min-h-11;
}
</style>
