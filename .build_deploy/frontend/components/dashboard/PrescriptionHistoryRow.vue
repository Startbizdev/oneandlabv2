<template>
  <div class="rounded-lg border border-default/50 bg-default/5 overflow-hidden">
    <!-- Liée à un RDV -->
    <NuxtLink
      v-if="row.appointment_id"
      :to="`${roleBase}/appointments/${row.appointment_id}`"
      class="flex items-center gap-2.5 px-3 py-2.5 border-b border-default/40 hover:bg-default/10 transition-colors group"
    >
      <div
        class="shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary border border-primary/20"
        aria-hidden="true"
      >
        <span class="text-[9px] font-bold uppercase leading-none tracking-wide opacity-80">
          {{ calendarParts?.weekday }}
        </span>
        <span class="text-sm font-bold leading-none tabular-nums">{{ calendarParts?.day }}</span>
        <span class="text-[8px] font-semibold uppercase leading-none opacity-75">{{ calendarParts?.month }}</span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 min-w-0">
          <p class="text-sm font-semibold text-default truncate tabular-nums">
            {{ creneauLabel }}
          </p>
          <UBadge
            v-if="row.appointment_status"
            :color="statusBadgeColor(row.appointment_status)"
            variant="subtle"
            size="xs"
            class="shrink-0"
          >
            {{ appointmentStatusLabelFr(row.appointment_status) }}
          </UBadge>
        </div>
        <p class="text-xs text-muted truncate mt-0.5">{{ careLabel }}</p>
      </div>
      <UIcon
        name="i-lucide-chevron-right"
        class="w-4 h-4 shrink-0 text-muted group-hover:text-primary transition-colors"
      />
    </NuxtLink>

    <!-- Sans RDV -->
    <div v-else class="px-3 py-2.5 border-b border-default/40">
      <p class="text-sm font-semibold text-default">Sans rendez-vous</p>
      <p class="text-xs text-muted mt-0.5">
        {{ recordedLabel }}
        <span v-if="kindLabel"> · {{ kindLabel }}</span>
      </p>
    </div>

    <div class="flex items-center gap-2 px-3 py-2">
      <p class="min-w-0 flex-1 text-xs text-muted truncate">
        <template v-if="row.appointment_id">
          Enregistrée {{ recordedCompact }}
        </template>
        <template v-else-if="showPatient">
          {{ prescriptionPatientLabel(row) }}
        </template>
        <template v-else>
          {{ recordedLabel }}
        </template>
        <span v-if="row.appointment_id && showPatient"> · {{ prescriptionPatientLabel(row) }}</span>
      </p>
      <div class="flex shrink-0 items-center gap-1">
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-lucide-eye"
          aria-label="Voir"
          @click="emit('preview', row)"
        />
        <UButton
          size="xs"
          variant="ghost"
          color="primary"
          icon="i-lucide-download"
          aria-label="Télécharger"
          :loading="downloading"
          @click="emit('download', row)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  appointmentStatusLabelFr,
  formatPrescriptionRecordedCompact,
  prescriptionCareLabel,
  prescriptionCreneauLabel,
  prescriptionKindShortLabel,
  prescriptionPatientLabel,
  statusBadgeColor,
  type PrescriptionHistoryRow,
} from '~/utils/prescription-history-display';

const props = defineProps<{
  row: PrescriptionHistoryRow;
  roleBase: string;
  showPatient?: boolean;
  downloading?: boolean;
}>();

const emit = defineEmits<{
  preview: [row: PrescriptionHistoryRow];
  download: [row: PrescriptionHistoryRow];
}>();

const showPatient = computed(() => props.showPatient !== false);

const creneauLabel = computed(() => prescriptionCreneauLabel(props.row));
const careLabel = computed(() => prescriptionCareLabel(props.row));
const kindLabel = computed(() => prescriptionKindShortLabel(props.row.prescription_kind));
const recordedLabel = computed(() =>
  formatPrescriptionRecordedCompact(props.row.generated_at || props.row.created_at),
);
const recordedCompact = computed(() => {
  const iso = props.row.generated_at || props.row.created_at;
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
});

const calendarParts = computed(() => {
  const iso = props.row.appointment_scheduled_at;
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    weekday: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').slice(0, 3),
    day: d.getDate(),
    month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
  };
});
</script>
