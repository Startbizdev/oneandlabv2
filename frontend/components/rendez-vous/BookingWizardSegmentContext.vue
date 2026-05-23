<template>
  <div
    v-if="intro"
    class="mb-4 w-full max-w-full overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
  >
    <!-- Récap (étape 2+) -->
    <div
      v-if="previousRecaps.length > 0"
      class="border-b border-emerald-200/70 bg-emerald-50/70 px-3 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/30 sm:px-3.5"
    >
      <p class="flex items-start gap-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
        <UIcon
          name="i-lucide-circle-check"
          class="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        <span>Déjà planifié</span>
      </p>
      <ul class="mt-1.5 space-y-1 pl-5 sm:pl-5">
        <li
          v-for="recap in previousRecaps"
          :key="recap.serviceId"
          class="text-xs leading-snug text-emerald-950/90 dark:text-emerald-100/90"
        >
          <span class="font-medium">{{ recap.shortLabel }}</span>
          <span v-if="recap.dateLabel" class="text-emerald-800/90 dark:text-emerald-300/90">
            — {{ recap.dateLabel }}
          </span>
        </li>
      </ul>
    </div>

    <div class="p-3 sm:p-3.5">
      <div class="flex w-full min-w-0 items-start gap-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200/90 bg-[#F7F9FC] p-0.5 dark:border-gray-700 dark:bg-gray-900 sm:h-12 sm:w-12"
        >
          <CareCategoryVisual
            v-if="heroLine"
            :emoji="heroLine.emoji"
            :image-src="heroLine.imageSrc"
            :icon-name="heroLine.iconName"
            img-class="block max-h-full max-w-full object-contain"
            icon-class="size-5 text-primary-600 dark:text-primary-400 sm:size-6"
          />
        </div>

        <div class="min-w-0 flex-1 space-y-1.5">
          <div class="space-y-1">
            <UBadge
              :color="intro.kind === 'blood' ? 'error' : 'info'"
              variant="subtle"
              size="xs"
              class="inline-flex max-w-full font-medium"
              :leading-icon="segmentKindIcon"
            >
              <span class="truncate">{{ segmentStepLabel }}</span>
            </UBadge>
            <p
              class="text-pretty text-sm font-semibold leading-snug tracking-tight text-gray-900 break-words dark:text-white sm:text-[0.9375rem]"
            >
              {{ heroTitle }}
            </p>
          </div>

          <div
            v-if="intro.lines.length > 1"
            class="flex flex-wrap gap-1"
          >
            <UBadge
              v-for="line in intro.lines"
              :key="line.id"
              color="neutral"
              variant="subtle"
              size="xs"
              class="max-w-full font-medium"
            >
              <span class="block truncate">{{ line.name }}</span>
            </UBadge>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  buildBookingWizardSegmentIntro,
  bookingWizardSegmentKindIcon,
  bookingWizardSegmentStepLabel,
  formatBookingWizardSlotDate,
  type BookingWizardSegmentIntro,
  type BookingWizardSlotRow,
} from '~/utils/booking-wizard-segment';
import { joinFrenchAndList } from '~/utils/join-french-list';

const props = withDefaults(
  defineProps<{
    mode: 'slot-datetime' | 'documents';
    selectedServices: BookingWizardSlotRow[];
    slotRows: BookingWizardSlotRow[];
    activeServiceId: string | null;
    slotIndex: number;
    formDataByService?: Record<string, { scheduled_at?: string | null } | undefined>;
  }>(),
  {
    formDataByService: () => ({}),
  },
);

const config = useRuntimeConfig();

const intro = computed((): BookingWizardSegmentIntro | null =>
  buildBookingWizardSegmentIntro(
    props.selectedServices,
    props.activeServiceId,
    String(config.public.apiBase ?? ''),
  ),
);

const segmentStepLabel = computed(() =>
  intro.value ? bookingWizardSegmentStepLabel(intro.value.kind) : '',
);
const segmentKindIcon = computed(() =>
  intro.value ? bookingWizardSegmentKindIcon(intro.value.kind) : 'i-lucide-calendar',
);

const heroLine = computed(() => intro.value?.lines[0] ?? null);

const heroTitle = computed(() => {
  if (!intro.value) return '';
  if (intro.value.lines.length > 1) {
    return joinFrenchAndList(intro.value.lines.map((l) => l.name));
  }
  return intro.value.lines[0]?.name ?? segmentStepLabel.value;
});

function dateForSlotRow(row: BookingWizardSlotRow): string | null {
  const raw = props.formDataByService?.[row.id]?.scheduled_at;
  return formatBookingWizardSlotDate(raw ?? null);
}

function introForRow(row: BookingWizardSlotRow): BookingWizardSegmentIntro | null {
  return buildBookingWizardSegmentIntro(
    props.selectedServices,
    row.id,
    String(config.public.apiBase ?? ''),
  );
}

const previousRecaps = computed(() => {
  const out: { serviceId: string; shortLabel: string; dateLabel: string | null }[] = [];
  for (let i = 0; i < props.slotIndex; i++) {
    const row = props.slotRows[i];
    if (!row) continue;
    const seg = introForRow(row);
    out.push({
      serviceId: row.id,
      shortLabel: seg ? bookingWizardSegmentStepLabel(seg.kind) : row.name,
      dateLabel: dateForSlotRow(row),
    });
  }
  return out;
});
</script>
