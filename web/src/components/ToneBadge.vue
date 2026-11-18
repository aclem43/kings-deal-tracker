<script setup lang="ts">
import type { BadgeInfo } from "@/lib/data";

defineProps<{ badge: BadgeInfo }>();

// Green is a saving, red is dearer than the parts or above usual, hi-vis yellow is "take note".
const TONES = {
  good: "bg-good text-background",
  warn: "bg-hivis text-hivis-ink",
  bad: "bg-bad text-background",
} as const;
</script>

<template>
  <span
    class="inline-flex items-center px-1.5 py-0.5 font-heading text-[0.8125rem] leading-tight font-bold tracking-[0.06em] uppercase"
    :class="[TONES[badge.tone], badge.hint && 'cursor-help']"
    :title="badge.hint"
  >
    {{ badge.text }}<span v-if="badge.hint" class="sr-only">. {{ badge.hint }}</span>
  </span>
</template>
