<template>
  <div :class="embedded ? 'mt-1 min-w-0 space-y-1' : 'mt-1.5 min-w-0 space-y-1.5'">
    <p v-if="lotLabel" class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
      {{ lotLabel }}
    </p>
    <div v-if="catalogLines.length" class="flex min-w-0 flex-wrap gap-1.5">
      <span
        v-for="(line, idx) in catalogLines"
        :key="`${line.category_id ?? 'noid'}-${idx}-${line.label}`"
        class="inline-flex max-w-full items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 dark:border-gray-700 dark:bg-gray-800/80"
      >
        <CareCategoryVisual
          :emoji="lineBadge(line).emoji"
          :image-src="lineBadge(line).imageSrc"
          :icon-name="lineBadge(line).iconName"
          img-class="h-4 w-4 rounded object-contain"
          icon-class="h-3 w-3 shrink-0 text-gray-600 dark:text-gray-400"
        />
        <span class="truncate text-[11px] font-medium text-gray-700 dark:text-gray-300">
          {{ line.label }}
        </span>
      </span>
    </div>
    <div v-if="optionRows.length" class="space-y-0.5">
      <p
        v-for="row in optionRows"
        :key="`${row.label}-${row.value}`"
        class="text-[11px] leading-snug text-gray-500 dark:text-gray-400"
      >
        <span class="font-medium text-gray-400 dark:text-gray-500">{{ row.label }} :</span>
        {{ row.value }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  buildCategoryAccentMapForList,
  careListBadgeForCatalogItem,
  type CareCategoryRowMinimal,
} from '~/utils/care-icons';
import type { NurseTourStop } from '~/composables/useNurseTourWeb';
import type { PatientRdvCatalogLine } from '~/utils/patient-rdv-list-display';
import {
  tourStopAsAppointment,
  tourStopCareOptionRows,
  tourStopCatalogLines,
  tourStopLotSummaryLabel,
} from '~/utils/tour-stop-display';

const props = withDefaults(
  defineProps<{
    stop: NurseTourStop;
    categories?: CareCategoryRowMinimal[];
    embedded?: boolean;
  }>(),
  { categories: () => [], embedded: false },
);

const config = useRuntimeConfig();
const categoryAccentMap = computed(() => buildCategoryAccentMapForList(props.categories));

const lotLabel = computed(() => tourStopLotSummaryLabel(props.stop));
const catalogLines = computed(() => tourStopCatalogLines(props.stop));
const optionRows = computed(() => tourStopCareOptionRows(props.stop, props.categories));

function lineBadge(line: PatientRdvCatalogLine) {
  const apt = tourStopAsAppointment(props.stop);
  return careListBadgeForCatalogItem(
    String(apt.type ?? 'nursing'),
    { category_id: line.category_id, category_image_url: line.category_image_url },
    props.categories,
    categoryAccentMap.value,
    config.public.apiBase,
  );
}
</script>
