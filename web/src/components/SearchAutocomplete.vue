<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { onClickOutside } from "@vueuse/core";
import { Search, X, CornerDownLeft } from "@lucide/vue";
import { cn } from "cn";
import { highlight } from "@/lib/search";

// A search box with a suggestion list (the ARIA combobox pattern). The parent works out
// the suggestions from the text; this handles the keyboard, focus and the dropdown.

export interface Suggestion {
  id: string;
  label: string;
  detail?: string; // muted text after the label
  image?: string;  // thumbnail url
  icon?: object;   // shown when there is no image
  aside?: string;  // right-hand text, e.g. a price
  muted?: boolean; // e.g. out of stock
  tag?: string;    // small label on the right, e.g. "Category"
}
export interface SuggestionGroup { label: string; items: Suggestion[] }

const props = defineProps<{
  groups: SuggestionGroup[];
  placeholder?: string;
  label: string;
  emptyText?: string;
  class?: string;
  inputClass?: string;
}>();
const emit = defineEmits<{ select: [s: Suggestion]; submit: [] }>();
const q = defineModel<string>({ required: true });

const uid = useId();
const root = ref<HTMLElement>();
const input = ref<HTMLInputElement>();
const open = ref(false);
const active = ref(-1);

const flat = computed(() => props.groups.flatMap((g) => g.items));
const firstShown = computed(() => props.groups.findIndex((g) => g.items.length));
const showList = computed(() => open.value && !!q.value.trim() && (flat.value.length > 0 || !!props.emptyText));
const optId = (i: number) => `${uid}-opt-${i}`;
// Each group's first index into the flat list, for ids and the active row.
const offsets = computed(() => {
  let n = 0;
  return props.groups.map((g) => { const o = n; n += g.items.length; return o; });
});

watch(flat, () => { active.value = -1; });
onClickOutside(root, () => { open.value = false; });

function move(step: number) {
  if (!flat.value.length) return;
  open.value = true;
  const n = flat.value.length;
  active.value = active.value < 0 ? (step > 0 ? 0 : n - 1) : (active.value + step + n) % n;
  document.getElementById(optId(active.value))?.scrollIntoView({ block: "nearest" });
}

function choose(s: Suggestion) {
  emit("select", s);
  open.value = false;
  active.value = -1;
}

function onEnter() {
  const s = active.value >= 0 ? flat.value[active.value] : undefined;
  if (s) choose(s);
  else { emit("submit"); open.value = false; }
}

function onEscape() {
  if (showList.value) open.value = false;
  else q.value = "";
}

function clear() {
  q.value = "";
  input.value?.focus();
}

defineExpose({ focus: () => input.value?.focus() });
</script>

<template>
  <div ref="root" :class="cn('relative min-w-0', props.class)">
    <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
    <input
      ref="input"
      v-model="q"
      type="text"
      role="combobox"
      autocomplete="off"
      spellcheck="false"
      enterkeyhint="search"
      :placeholder="placeholder"
      :aria-label="label"
      :aria-expanded="showList"
      :aria-controls="`${uid}-list`"
      aria-autocomplete="list"
      :aria-activedescendant="showList && active >= 0 ? optId(active) : undefined"
      :class="cn(
        'h-10 w-full min-w-0 border-2 border-input bg-card pr-9 pl-9 text-[0.9375rem] text-card-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:h-11',
        inputClass,
      )"
      @input="open = true"
      @focus="open = true"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="onEnter"
      @keydown.esc.prevent="onEscape"
      @keydown.tab="open = false"
    />
    <button
      v-if="q"
      type="button"
      class="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="Clear search"
      @click="clear"
    >
      <X class="size-4" />
    </button>

    <div
      v-show="showList"
      :id="`${uid}-list`"
      role="listbox"
      :aria-label="label"
      class="absolute inset-x-0 top-full z-40 mt-1 max-h-[min(28rem,70dvh)] min-w-[min(28rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain border-2 border-border bg-popover p-1 text-popover-foreground shadow-[0_12px_32px_-8px_rgb(0_0_0/0.35)]"
    >
      <template v-for="(g, gi) in groups" :key="g.label">
        <div v-if="g.items.length" role="group" :aria-label="g.label" :class="gi > firstShown && 'mt-1 border-t border-rule pt-1'">
          <div class="px-2.5 pt-1.5 pb-1 label-caps text-muted-foreground">{{ g.label }}</div>
          <div
            v-for="(s, i) in g.items"
            :id="optId(offsets[gi] + i)"
            :key="s.id"
            role="option"
            :aria-selected="active === offsets[gi] + i"
            class="flex cursor-pointer items-center gap-3 px-2.5 text-sm aria-selected:bg-hivis aria-selected:text-hivis-ink"
            :class="[s.muted && 'opacity-60', s.image ? 'py-2' : 'py-1.5']"
            @mousedown.prevent
            @mousemove="active = offsets[gi] + i"
            @click="choose(s)"
          >
            <img v-if="s.image" :src="s.image" alt="" class="size-9 shrink-0 border border-rule bg-white object-contain" />
            <span v-else-if="s.icon" class="flex size-7 shrink-0 items-center justify-center bg-muted">
              <component :is="s.icon" class="size-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="line-clamp-2 sm:line-clamp-1">
                <template v-for="(r, ri) in highlight(s.label, q)" :key="ri"><mark v-if="r.m" class="bg-transparent font-bold text-current">{{ r.t }}</mark><template v-else>{{ r.t }}</template></template>
              </span>
              <span v-if="s.detail" class="block truncate text-xs opacity-75">{{ s.detail }}</span>
            </span>
            <span v-if="s.tag" class="shrink-0 border border-current px-1.5 py-0.5 label-caps opacity-75">{{ s.tag }}</span>
            <span v-if="s.aside" class="shrink-0 text-sm font-semibold">{{ s.aside }}</span>
          </div>
        </div>
      </template>
      <p v-if="!flat.length" class="px-2.5 py-2 text-sm text-muted-foreground">{{ emptyText }}</p>
      <p v-else class="mt-1 hidden items-center gap-1.5 border-t border-rule px-2.5 pt-2 pb-1 text-xs text-muted-foreground sm:flex">
        <kbd class="border border-rule bg-muted px-1 font-sans">↑</kbd><kbd class="border border-rule bg-muted px-1 font-sans">↓</kbd> to pick
        <kbd class="ml-2 inline-flex items-center border border-rule bg-muted px-1 font-sans"><CornerDownLeft class="size-3" /></kbd> to choose
        <kbd class="ml-2 border border-rule bg-muted px-1 font-sans">esc</kbd> to close
      </p>
    </div>
  </div>
</template>
