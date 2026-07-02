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
    <div v-if="displayOptionRows.length" class="space-y-0.5">
      <div
        v-for="row in displayOptionRows"
        :key="`${row.label}-${row.value}`"
        :class="
          showIcons && isTypeOptionLabel(row.label)
            ? 'mt-1 flex min-w-0 items-center gap-1.5'
            : ''
        "
      >
        <UIcon
          v-if="showIcons && isTypeOptionLabel(row.label)"
          name="i-lucide-tag"
          class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500"
        />
        <p
          class="min-w-0"
          :class="
            showIcons && isTypeOptionLabel(row.label)
              ? 'text-xs font-medium text-gray-500 dark:text-gray-400'
              : 'text-[11px] leading-snug text-gray-500 dark:text-gray-400'
          "
        >
          <span
            v-if="!(showIcons && isTypeOptionLabel(row.label))"
            class="font-medium text-gray-400 dark:text-gray-500"
            >{{ row.label }} :</span
          >
          <template v-if="showIcons && isTypeOptionLabel(row.label)">
            {{ row.label }} : {{ row.value }}
          </template>
          <template v-else>
            {{ row.value }}
          </template>
        </p>
      </div>
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
    showIcons?: boolean;
    listCompact?: boolean;
  }>(),
  { categories: () => [], embedded: false, showIcons: false, listCompact: false },
);

const config = useRuntimeConfig();
const categoryAccentMap = computed(() => buildCategoryAccentMapForList(props.categories));

const lotLabel = computed(() => tourStopLotSummaryLabel(props.stop));
const catalogLines = computed(() => tourStopCatalogLines(props.stop));
const optionRows = computed(() => tourStopCareOptionRows(props.stop, props.categories));

function isDetailOptionLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return (
    normalized === 'type' ||
    normalized === 'type de soin' ||
    normalized.includes('plaie')
  );
}

const displayOptionRows = computed(() =>
  props.listCompact
    ? optionRows.value.filter((row) => !isDetailOptionLabel(row.label))
    : optionRows.value,
);

function isTypeOptionLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return normalized === 'type' || normalized === 'type de soin';
}

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
