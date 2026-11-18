<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { Folder, Layers } from "@lucide/vue";
import SearchAutocomplete, { type Suggestion, type SuggestionGroup } from "./SearchAutocomplete.vue";
import { useFilters } from "@/composables/useFilters";
import { isProduct, money, shortName, thumbUrl, type Item } from "@/lib/data";
import { matchLabels, rankMatches } from "@/lib/search";

// The catalogue search. `pool` is the current view's items after every filter except the
// search text, so the suggestions only offer things the grid would actually show.
const props = defineProps<{ depts: string[]; subs: string[]; pool: Item[]; inputClass?: string }>();

const { state, setDept } = useFilters();

// Debounce typing; keep the box in step when the hash changes underneath it.
const q = ref(state.q);
const pushQ = useDebounceFn((v: string) => { state.q = v; }, 150);
watch(q, (v) => pushQ(v));
watch(() => state.q, (v) => { if (v !== q.value) q.value = v; });

const noun = computed(() => (state.view === "bundles" ? "bundles" : "products"));

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
  <SearchAutocomplete
    v-model="q"
    :groups="groups"
    :placeholder="`Search ${noun}, categories or SKU`"
    label="Search"
    :empty-text="`No ${noun} match “${q.trim()}”.`"
    :input-class="inputClass"
    data-search
    @select="onSelect"
    @submit="state.q = q"
  />
</template>
