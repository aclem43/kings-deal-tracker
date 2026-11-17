import { computed } from "vue";
import { useLocalStorage } from "@vueuse/core";

// Starred SKUs, kept in this browser only. useLocalStorage also picks up changes
// made in other tabs, so two open tabs don't overwrite each other's list.
const list = useLocalStorage<string[]>("kings-watch", [], {
  listenToStorageChanges: true,
  onError: () => {}, // storage unavailable: the list still works until the page closes
});
const set = computed(() => new Set(Array.isArray(list.value) ? list.value : []));

export function useWatchList() {
  const has = (sku: string) => set.value.has(sku);
  const toggle = (sku: string) => {
    list.value = has(sku) ? list.value.filter((s) => s !== sku) : [...set.value, sku];
  };
  return { set, has, toggle };
}
