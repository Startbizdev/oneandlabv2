<template>
  <div
    class="relative rounded-2xl border px-3.5 py-3 shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
    :class="
      done
        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/70 dark:bg-emerald-950/35'
        : isNext
          ? 'border-primary-300 ring-1 ring-primary-200 dark:border-primary-700 dark:ring-primary-900/40'
          : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/50'
    "
  >
    <div class="flex items-center gap-2.5">
      <button type="button" class="min-w-0 flex-1 text-left" @click="$emit('open-detail')">
        <div class="flex min-w-0 flex-wrap items-center gap-1.5">
          <p
            class="truncate text-sm font-semibold leading-tight tracking-tight"
            :class="done ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'"
          >
            {{ stop.patient_name }}
          </p>
          <UBadge v-if="isNext && !done" color="primary" variant="subtle" size="xs">Suivant</UBadge>
        </div>
        <NurseTourStopCare
          :stop="stop"
          :categories="categories"
          embedded
          list-compact
          :class="done ? 'opacity-70' : ''"
        />
        <div v-if="scheduleMeta" class="mt-1 flex min-w-0 items-center gap-1.5">
          <UIcon name="i-lucide-clock" class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ scheduleMeta }}</span>
        </div>
        <div
          v-if="routeKmLabel || routeDriveMinLabel"
          class="mt-1 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5"
        >
          <span v-if="routeKmLabel" class="inline-flex items-center gap-1">
            <UIcon name="i-lucide-route" class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ routeKmLabel }}</span>
          </span>
          <span v-if="routeDriveMinLabel" class="inline-flex items-center gap-1">
            <UIcon name="i-lucide-car" class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ routeDriveMinLabel }}</span>
          </span>
        </div>
      </button>

      <button
        type="button"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors"
        :class="
          done
            ? 'border-emerald-500 bg-emerald-500 shadow-sm'
            : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'
        "
        :aria-label="done ? 'Passage effectué, appuyer pour annuler' : 'Marquer comme effectué'"
        @click="$emit('toggle-done')"
      >
        <UIcon
          name="i-lucide-check"
          class="h-[18px] w-[18px]"
          :class="done ? 'text-white' : 'text-gray-400 opacity-40 dark:text-gray-500'"
        />
      </button>
    </div>

    <div v-if="showReorder" class="mt-2 flex justify-end gap-1">
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-chevron-up"
        :disabled="index === 0 || saving"
        aria-label="Monter"
        @click="$emit('move-up')"
      />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-chevron-down"
        :disabled="index >= total - 1 || saving"
        aria-label="Descendre"
        @click="$emit('move-down')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NurseTourStop } from '~/composables/useNurseTourWeb';
import type { CareCategoryRowMinimal } from '~/utils/care-icons';
import {
  formatPassageTourStopTimeLabel,
  resolvePassageTourStopRouteLabels,
} from '~/utils/passage-tour-display';

const props = withDefaults(
  defineProps<{
    stop: NurseTourStop;
    index: number;
    total: number;
    isNext?: boolean;
    saving?: boolean;
    showReorder?: boolean;
    categories?: CareCategoryRowMinimal[];
  }>(),
  { categories: () => [], isNext: false },
);

defineEmits<{
  'toggle-done': [];
  'open-detail': [];
  'move-up': [];
  'move-down': [];
}>();

const done = computed(
  () => props.stop.visit_status === 'done' || props.stop.status === 'completed',
);

const scheduleMeta = computed(() => {
  const parts: string[] = [formatPassageTourStopTimeLabel(props.stop)];
  if (props.stop.passage_duration_minutes) {
    parts.push(`${props.stop.passage_duration_minutes} min`);
  }
  return parts.filter(Boolean).join(' · ');
});

const routeLabels = computed(() => resolvePassageTourStopRouteLabels(props.stop, props.index));
const routeKmLabel = computed(() => routeLabels.value.kmLabel);
const routeDriveMinLabel = computed(() => routeLabels.value.driveMinLabel);
</script>
