import { computed } from "vue";
import { useLocalStorage } from "@vueuse/core";

// The shopping list: product SKU -> quantity wanted, kept in this browser only.
const store = useLocalStorage<Record<string, number>>("kings-list", {}, {
  listenToStorageChanges: true,
  onError: () => {},
});

export const MAX_QTY = 20;

const items = computed(() => {
  const v = store.value;
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
});

export function useShoppingList() {
  const has = (sku: string) => sku in items.value;
  const setQty = (sku: string, qty: number) => {
    const next = { ...items.value };
    if (qty <= 0) delete next[sku];
    else next[sku] = Math.min(MAX_QTY, Math.floor(qty));
    store.value = next;
  };
  const add = (sku: string) => setQty(sku, (items.value[sku] ?? 0) + 1);
  const remove = (sku: string) => setQty(sku, 0);
  const toggle = (sku: string) => (has(sku) ? remove(sku) : add(sku));
  const clear = () => { store.value = {}; };
  const replace = (next: Record<string, number>) => { store.value = { ...next }; };
  const merge = (more: Record<string, number>) => {
    const next = { ...items.value };
    for (const [s, n] of Object.entries(more)) next[s] = Math.min(MAX_QTY, (next[s] ?? 0) + n);
    store.value = next;
  };
  return { items, has, setQty, add, remove, toggle, clear, replace, merge };
}
