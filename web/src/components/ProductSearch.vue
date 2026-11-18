<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Folder, Layers } from "@lucide/vue";
import SearchAutocomplete, { type Suggestion, type SuggestionGroup } from "./SearchAutocomplete.vue";
import { useFilters } from "@/composables/useFilters";
import { isProduct, money, shortName, thumbUrl, type Item } from "@/lib/data";
import { matchLabels, rankMatches } from "@/lib/search";

// The catalogue search. `pool` is the current view's items after every filter except the
// search text, so the suggestions only offer things the grid would actually show.
// `focus` is true while the page shows one shared listing (#q=SKU); the box then stays
// empty rather than showing a raw SKU, and the page heading names the item instead.
const props = defineProps<{ depts: string[]; subs: string[]; pool: Item[]; inputClass?: string; focus?: boolean }>();

const { state, setDept } = useFilters();

// Debounce typing; keep the box in step when the hash changes underneath it.
const shownQ = () => (props.focus ? "" : state.q);
const q = ref(shownQ());
let timer: number | undefined;
watch(q, (v) => {
  clearTimeout(timer);
  if (v === shownQ()) return;
  timer = window.setTimeout(() => { state.q = v; }, 150);
});
watch([() => state.q, () => props.focus], () => { if (shownQ() !== q.value) q.value = shownQ(); });
onBeforeUnmount(() => clearTimeout(timer));
function submit() { clearTimeout(timer); state.q = q.value; }

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
  clearTimeout(timer);
  if (kind === "dept") { setDept(value); q.value = state.q = ""; }
  else if (kind === "sub") { state.sub = value; q.value = state.q = ""; }
  // An item narrows the grid to that one listing, the same way the RSS feed links work.
  else { state.q = value; q.value = shownQ(); }
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
    @submit="submit"
  />
</template>
