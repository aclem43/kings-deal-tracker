<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { Folder, Layers, SlidersHorizontal, Star } from "@lucide/vue";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import SearchAutocomplete, { type Suggestion, type SuggestionGroup } from "./SearchAutocomplete.vue";
import { useFilters, type Flag } from "@/composables/useFilters";
import { isProduct, money, shortName, thumbUrl, type Item } from "@/lib/data";
import { matchLabels, rankMatches } from "@/lib/search";

// `pool` is the current view's items after every filter except the search text, so the
// suggestions only offer things the grid would actually show.
const props = defineProps<{ depts: string[]; subs: string[]; watchCount: number; pool: Item[] }>();

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
const selects = computed(() => [
  { key: "dept", model: dept, label: "Department", all: "All departments", options: props.depts },
  { key: "sub", model: sub, label: "Category", all: "All categories", options: props.subs },
]);
const activeSelects = computed(() => (state.dept ? 1 : 0) + (state.sub ? 1 : 0));

const flags = computed(() => {
  const list: { key: Flag; label: string }[] = [{ key: "instock", label: "In stock" }];
  if (state.view === "products") list.push({ key: "viabundle", label: "Cheaper in a bundle" });
  else list.push({ key: "antideal", label: "Dearer than its parts" });
  list.push({ key: "atl", label: "At all-time low" }, { key: "dropped", label: "Recently dropped" });
  return list;
});

/* ---------- autocomplete ---------- */

const noun = computed(() => (state.view === "products" ? "products" : "bundles"));

const groups = computed<SuggestionGroup[]>(() => {
  const text = q.value;
  const places: Suggestion[] = [
    ...(state.dept ? [] : matchLabels(props.depts, text, 2).map((d) => ({ id: "dept:" + d, label: d, tag: "Department", icon: Folder }))),
    ...(state.sub ? [] : matchLabels(props.subs, text, state.dept ? 3 : 2).map((c) => ({ id: "sub:" + c, label: c, tag: "Category", icon: Layers }))),
  ];
  const items: Suggestion[] = rankMatches(props.pool, text, 6).map((p) => {
    const rest = p.n.split("|").slice(1).map((s) => s.trim()).filter(Boolean).join(" · ");
    return {
      id: "sku:" + p.s,
      label: shortName(p.n),
      detail: [isProduct(p) && p.via ? "Cheapest in a bundle" : "", rest || p.s].filter(Boolean).join(" · "),
      image: thumbUrl(p.i),
      aside: money(p.p),
      muted: !p.st,
    };
  });
  return [
    { label: "Filter by", items: places },
    { label: noun.value[0].toUpperCase() + noun.value.slice(1), items },
  ];
});

function onSelect(s: Suggestion) {
  const [kind, value] = [s.id.slice(0, s.id.indexOf(":")), s.id.slice(s.id.indexOf(":") + 1)];
  if (kind === "dept") { setDept(value); q.value = state.q = ""; }
  else if (kind === "sub") { state.sub = value; q.value = state.q = ""; }
  // An item narrows the grid to that one listing, the same way the RSS feed links work.
  else { q.value = state.q = value; }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex gap-2">
      <SearchAutocomplete
        v-model="q"
        :groups="groups"
        :placeholder="`Search ${noun}, categories or SKU…`"
        label="Search"
        :empty-text="`No ${noun} match “${q.trim()}”.`"
        class="flex-1"
        @select="onSelect"
        @submit="state.q = q"
      />

      <!-- wide screens: the selects sit beside the search -->
      <Select v-for="s in selects" :key="s.key" v-model="s.model.value">
        <SelectTrigger class="hidden h-10! w-48 shrink-0 bg-card md:flex lg:w-56" :aria-label="s.label">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">{{ s.all }}</SelectItem>
          <SelectItem v-for="o in s.options" :key="o" :value="o">{{ o }}</SelectItem>
        </SelectContent>
      </Select>

      <!-- small screens: they move into a sheet -->
      <Sheet>
        <SheetTrigger as-child>
          <Button variant="outline" class="relative h-10 shrink-0 bg-card md:hidden" aria-label="More filters">
            <SlidersHorizontal />
            <span class="max-sm:sr-only">Filters</span>
            <span
              v-if="activeSelects"
              class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-[0.7rem] text-background tabular-nums"
            >{{ activeSelects }}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" class="rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription class="sr-only">Narrow the list by department and category.</SheetDescription>
          </SheetHeader>
          <div class="flex flex-col gap-4 px-4">
            <label v-for="s in selects" :key="s.key" class="flex flex-col gap-1.5 text-sm font-medium">
              {{ s.label }}
              <Select v-model="s.model.value">
                <SelectTrigger class="h-10! w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="ALL">{{ s.all }}</SelectItem>
                  <SelectItem v-for="o in s.options" :key="o" :value="o">{{ o }}</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
        </SheetContent>
      </Sheet>
    </div>

    <div class="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      <Toggle
        v-for="f in flags"
        :key="f.key"
        v-model="state[f.key]"
        variant="outline"
        size="sm"
        class="shrink-0 rounded-full bg-card px-3 data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
      >
        {{ f.label }}
      </Toggle>
      <Toggle
        v-model="state.watchonly"
        variant="outline"
        size="sm"
        title="Items you starred, saved in this browser"
        class="shrink-0 rounded-full bg-card px-3 data-[state=on]:border-transparent data-[state=on]:bg-warn-bg data-[state=on]:text-warn"
      >
        <Star :class="state.watchonly && 'fill-current'" />
        Watch list
        <span v-if="watchCount" class="tabular-nums opacity-70">{{ watchCount }}</span>
      </Toggle>
    </div>
  </div>
</template>
