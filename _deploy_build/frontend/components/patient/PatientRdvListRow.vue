<template>
  <div class="flex min-h-0 flex-col gap-2">
    <!-- En-tête carte : ligne date · créneau + badge, séparateur bord à bord -->
    <header class="-mx-4 border-b border-gray-200/90 px-4 pb-2 dark:border-gray-800 sm:-mx-5 sm:px-5">
      <div class="flex min-w-0 items-center justify-between gap-2">
        <p class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-snug text-gray-900 dark:text-gray-100">
          <span class="inline-flex shrink-0 items-center gap-1 font-semibold tabular-nums leading-none">
            <UIcon
              name="i-solar:calendar-linear"
              class="h-[15px] w-[15px] shrink-0 text-gray-500 dark:text-gray-400"
              aria-hidden="true"
            />
            <span>{{ patientRdvFormatDateCompact(appointment.scheduled_at) }}</span>
          </span>
          <span class="shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
          <span class="inline-flex min-w-0 items-center gap-1 font-medium tabular-nums leading-none text-gray-600 dark:text-gray-400">
            <UIcon
              name="i-solar:clock-circle-linear"
              class="h-[15px] w-[15px] shrink-0 text-gray-500 dark:text-gray-400"
              aria-hidden="true"
            />
            <span class="min-w-0">{{ patientRdvGetCreneauLabel(appointment) }}</span>
          </span>
        </p>
        <div class="flex shrink-0 flex-wrap items-start justify-end gap-1.5">
          <PatientUrgencyBadge :appointment="appointment" />
          <UBadge
            :color="patientRdvStatusColor(appointment.status)"
            variant="subtle"
            size="sm"
            class="shrink-0 px-2 py-0.5 text-[11px] font-semibold leading-tight tracking-tight"
            :label="patientRdvGetStatusLabel(appointment.status)"
          />
        </div>
      </div>
    </header>

    <!-- Soins / analyses : lignes serrées, vignettes petites -->
    <ul class="min-w-0 space-y-px" role="list">
      <li
        v-for="(line, idx) in catalogLines"
        :key="`${line.category_id ?? 'noid'}-${idx}-${line.label}`"
        class="flex min-w-0 items-center gap-2 py-0.5 first:pt-0 last:pb-0"
      >
        <div class="flex h-7 w-7 shrink-0 items-center justify-center self-center" aria-hidden="true">
          <CareCategoryVisual
            :emoji="lineBadge(line).emoji"
            :image-src="lineBadge(line).imageSrc"
            :icon-name="lineBadge(line).iconName"
            img-class="h-6 w-6 rounded object-contain"
            icon-class="h-3.5 w-3.5 shrink-0 text-gray-600 dark:text-gray-400"
          />
        </div>
        <p class="min-w-0 flex-1 text-[13px] font-medium leading-snug text-gray-800 dark:text-gray-200 line-clamp-2">
          {{ line.label }}
        </p>
      </li>
    </ul>

    <div
      v-if="showInProgressBanner"
      class="inline-flex max-w-full items-center gap-1.5 rounded-md bg-primary-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-800 dark:bg-primary-950/30 dark:text-primary-200"
    >
      <span class="relative flex h-1.5 w-1.5 shrink-0">
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
        <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-500" />
      </span>
      Démarré à {{ formatStartedAt(appointment.started_at) }}
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
import type { PatientRdvCatalogLine } from '~/utils/patient-rdv-list-display';
import {
  patientRdvCatalogDisplayLines,
  patientRdvFormatDateCompact,
  patientRdvGetCreneauLabel,
  patientRdvGetStatusLabel,
  patientRdvStatusColor,
} from '~/utils/patient-rdv-list-display';

const props = withDefaults(
  defineProps<{
    appointment: any;
    variant?: 'full' | 'batch';
    categories?: CareCategoryRowMinimal[];
    bloodTestBatchPeerTotal?: number;
    bloodTestBatchPeerIndex?: number;
    nursingBatchPeerTotal?: number;
    nursingBatchPeerIndex?: number;
  }>(),
  {
    variant: 'full',
    categories: () => [],
    bloodTestBatchPeerTotal: 0,
    bloodTestBatchPeerIndex: 0,
    nursingBatchPeerTotal: 0,
    nursingBatchPeerIndex: 0,
  },
);

const config = useRuntimeConfig();

const accentMap = computed(() => buildCategoryAccentMapForList(props.categories ?? []));

const catalogLines = computed(() =>
  patientRdvCatalogDisplayLines(props.appointment, { hideStaffOnlyCares: true }),
);

function lineBadge(line: PatientRdvCatalogLine) {
  return careListBadgeForCatalogItem(
    props.appointment?.type,
    { category_id: line.category_id, category_image_url: line.category_image_url },
    props.categories ?? [],
    accentMap.value,
    config.public.apiBase,
  );
}

const showInProgressBanner = computed(() => {
  const st = props.appointment?.status;
  if (!props.appointment?.started_at) return false;
  return st === 'inProgress' || st === 'in_progress';
});

function formatStartedAt(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
</script>
