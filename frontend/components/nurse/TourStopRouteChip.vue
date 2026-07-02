<template>
  <div
    v-if="metrics"
    class="inline-flex items-center gap-1.5 self-end rounded-full border border-gray-200 bg-gray-50 px-2 py-1 dark:border-gray-700 dark:bg-gray-800/80"
    :aria-label="`Trajet depuis le passage précédent : ${kmLabel}, environ ${metrics.min} minutes`"
  >
    <span class="inline-flex shrink-0 items-center gap-1">
      <UIcon name="i-lucide-route" class="h-2.5 w-2.5 text-gray-500 dark:text-gray-400" />
      <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ kmLabel }}</span>
    </span>
    <span class="h-3 w-px shrink-0 bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
    <span class="inline-flex shrink-0 items-center gap-1">
      <UIcon name="i-lucide-car" class="h-2.5 w-2.5 text-gray-500 dark:text-gray-400" />
      <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ minLabel }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import type { NurseTourStop } from '~/composables/useNurseTourWeb';
import { resolveTourStopRouteMetrics } from '@oneandlab/shared-utils';

const props = defineProps<{
  stop: NurseTourStop;
}>();

const metrics = computed(() => resolveTourStopRouteMetrics(props.stop));

const kmLabel = computed(() => `${metrics.value?.km.toFixed(1) ?? '0'} km`);

const minLabel = computed(() => {
  const min = metrics.value?.min ?? 0;
  return min > 0 ? `~${min} min` : '—';
});
</script>
