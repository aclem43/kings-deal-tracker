<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { Search, Star, X } from "@lucide/vue";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SORTS, useFilters, type Flag } from "@/composables/useFilters";

const props = defineProps<{ depts: string[]; subs: string[]; watchCount: number }>();

const { state, setDept } = useFilters();
const ALL = "__all";

// Debounce typing; keep the box in step when the hash changes underneath it.
const q = ref(state.q);
const pushQ = useDebounceFn((v: string) => { state.q = v; }, 150);
watch(q, (v) => pushQ(v));
watch(() => state.q, (v) => { if (v !== q.value) q.value = v; });

const dept = computed({
  get: () => state.dept || ALL,
  set: (v: string) => setDept(v === ALL ? "" : v),
});
const sub = computed({
  get: () => state.sub || ALL,
  set: (v: string) => { state.sub = v === ALL ? "" : v; },
});

const flags = computed(() => {
  const list: { key: Flag; label: string; title?: string }[] = [{ key: "instock", label: "In stock" }];
  if (state.view === "products") list.push({ key: "viabundle", label: "Cheaper in a bundle" });
  else list.push({ key: "antideal", label: "Dearer than its parts" });
  list.push({ key: "atl", label: "At all-time low" }, { key: "dropped", label: "Recently dropped" });
  return list;
});

const placeholder = computed(() => (state.view === "products" ? "Search products or SKU…" : "Search bundles or SKU…"));
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap gap-2">
      <div class="relative min-w-0 flex-[1_1_16rem]">
        <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="q" type="search" :placeholder="placeholder" autocomplete="off" class="h-9 bg-card pl-8" aria-label="Search" />
        <button
          v-if="q"
          type="button"
          class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
          @click="q = ''"
        >
          <X class="size-4" />
        </button>
      </div>

      <Select v-model="dept">
        <SelectTrigger class="h-9! min-w-0 flex-[1_1_10rem] bg-card sm:max-w-52" aria-label="Department">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">All departments</SelectItem>
          <SelectItem v-for="d in props.depts" :key="d" :value="d">{{ d }}</SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="sub">
        <SelectTrigger class="h-9! min-w-0 flex-[1_1_10rem] bg-card sm:max-w-56" aria-label="Category">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">All categories</SelectItem>
          <SelectItem v-for="c in props.subs" :key="c" :value="c">{{ c }}</SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="state.sort">
        <SelectTrigger class="h-9! min-w-0 flex-[1_1_10rem] bg-card sm:max-w-52" aria-label="Sort">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="s in SORTS" :key="s.value" :value="s.value">{{ s.label }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      <Toggle
        v-for="f in flags"
        :key="f.key"
        v-model="state[f.key]"
        variant="outline"
        size="sm"
        class="shrink-0 rounded-full bg-card data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
      >
        {{ f.label }}
      </Toggle>
      <Toggle
        v-model="state.watchonly"
        variant="outline"
        size="sm"
        title="Items you starred, saved in this browser"
        class="shrink-0 rounded-full bg-card data-[state=on]:border-transparent data-[state=on]:bg-warn-bg data-[state=on]:text-warn"
      >
        <Star :class="state.watchonly && 'fill-current'" />
        Watch list
        <span v-if="watchCount" class="tabular-nums opacity-70">{{ watchCount }}</span>
      </Toggle>
    </div>
  </div>
</template>
