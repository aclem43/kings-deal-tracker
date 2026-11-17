<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import type { BadgeInfo } from "@/lib/data";

defineProps<{ badge: BadgeInfo }>();

const TONES = {
  good: "bg-good-bg text-good",
  warn: "bg-warn-bg text-warn",
  bad: "bg-brand text-white",
} as const;
</script>

<template>
  <Badge class="rounded-md font-semibold" :class="TONES[badge.tone]">{{ badge.text }}</Badge>
</template>
