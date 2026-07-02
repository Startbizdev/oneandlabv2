<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden="true" @click="emit('close')" />
      <div
        role="dialog"
        aria-modal="true"
        class="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-700/80 dark:bg-slate-900 sm:rounded-2xl"
      >
        <div class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
              {{ existing ? 'Modifier l\'absence' : 'Déclarer une absence' }}
            </h2>
            <p v-if="patientName" class="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
              {{ patientName }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fermer"
            @click="emit('close')"
          >
            <UIcon name="i-lucide-x" class="h-5 w-5" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-4">
          <p class="text-sm text-slate-500 dark:text-slate-400">
            Le passage reste visible sur la tournée mais la carte sera grisée avec le motif jusqu'à la
            date de fin.
          </p>

          <UFormField label="Motif">
            <USelect
              v-model="form.absence_type"
              :items="typeOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <div class="grid gap-3 sm:grid-cols-2">
            <UFormField label="Du">
              <input
                v-model="form.start_date"
                type="date"
                class="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </UFormField>
            <UFormField label="Au">
              <input
                v-model="form.end_date"
                type="date"
                :min="form.start_date"
                class="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </UFormField>
          </div>

          <UFormField label="Précision (optionnel)">
            <UTextarea v-model="form.note" placeholder="Ex. CHU, chez la famille…" :rows="2" />
          </UFormField>

          <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        </div>

        <div class="shrink-0 space-y-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <UButton color="primary" block size="lg" :loading="saving" @click="submit">
            {{ existing ? 'Mettre à jour' : 'Enregistrer l\'absence' }}
          </UButton>
          <UButton
            v-if="existing"
            color="error"
            variant="outline"
            block
            size="lg"
            :loading="saving"
            @click="liftAbsence"
          >
            Patient de retour — lever l'absence
          </UButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { PatientAbsence, PatientAbsenceInput, PatientAbsenceType } from '@oneandlab/shared-types';
import { PATIENT_ABSENCE_TYPE_OPTIONS } from '@oneandlab/shared-constants';

const props = defineProps<{
  open: boolean;
  patientId: string | null;
  patientName?: string;
  defaultStartDate: string;
  existing?: PatientAbsence | null;
  saving?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [input: PatientAbsenceInput, absenceId?: string | null];
  delete: [absenceId: string];
}>();

const typeOptions = PATIENT_ABSENCE_TYPE_OPTIONS;

const form = reactive({
  absence_type: 'hospitalization' as PatientAbsenceType,
  start_date: props.defaultStartDate,
  end_date: props.defaultStartDate,
  note: '',
});

watch(
  () => [props.open, props.existing, props.defaultStartDate] as const,
  ([open, existing, defaultStartDate]) => {
    if (!open) return;
    if (existing) {
      form.absence_type = existing.absence_type;
      form.start_date = existing.start_date.slice(0, 10);
      form.end_date = existing.end_date.slice(0, 10);
      form.note = existing.note ?? '';
      return;
    }
    form.absence_type = 'hospitalization';
    form.start_date = defaultStartDate;
    form.end_date = defaultStartDate;
    form.note = '';
  },
  { immediate: true },
);

function submit() {
  emit('save', {
    absence_type: form.absence_type,
    start_date: form.start_date,
    end_date: form.end_date,
    note: form.note.trim() || null,
  }, props.existing?.id ?? null);
}

function liftAbsence() {
  if (!props.existing?.id) return;
  emit('delete', props.existing.id);
}
</script>
