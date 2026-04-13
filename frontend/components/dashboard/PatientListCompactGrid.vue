<template>
  <div
    class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3 items-stretch"
  >
    <div
      v-for="patient in patients"
      :key="patient.id"
      class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/90 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-primary-200/60 dark:hover:border-primary-900/40 transition-all duration-200 flex flex-col h-full overflow-hidden min-h-0"
    >
      <div class="p-3.5 sm:p-4 flex-1 flex flex-col gap-2.5 min-w-0">
        <div class="flex items-start gap-2.5 min-w-0">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-inset bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 ring-primary-200/60 dark:ring-primary-900/50"
          >
            <UIcon name="i-lucide-user" class="w-5 h-5" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
              {{ displayName(patient) }}
            </h3>
            <p
              v-if="ageLabel(patient)"
              class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate flex items-center gap-1"
            >
              <UIcon name="i-lucide-cake" class="w-3 h-3 shrink-0 opacity-80" />
              {{ ageLabel(patient) }}
            </p>
          </div>
        </div>

        <div class="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 min-w-0">
          <p v-if="patient.phone" class="flex items-start gap-1.5 min-w-0">
            <UIcon name="i-lucide-phone" class="w-3.5 h-3.5 shrink-0 text-gray-400 mt-px" />
            <span class="truncate font-medium">{{ patient.phone }}</span>
          </p>
          <p v-if="patientEmailLine(patient)" class="flex items-start gap-1.5 min-w-0">
            <UIcon name="i-lucide-mail" class="w-3.5 h-3.5 shrink-0 text-gray-400 mt-px" />
            <span class="line-clamp-2 break-words">{{ patientEmailLine(patient) }}</span>
          </p>
        </div>
      </div>

      <div
        class="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-3 mt-auto flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-800/90"
      >
        <UButton
          variant="soft"
          color="neutral"
          size="xs"
          class="flex-1 min-w-[7rem] justify-center font-medium"
          leading-icon="i-lucide-user"
          :to="`/profile?userId=${patient.id}`"
        >
          Fiche
        </UButton>
        <UButton
          variant="outline"
          color="primary"
          size="xs"
          class="flex-1 min-w-[7rem] justify-center font-medium"
          leading-icon="i-lucide-calendar-plus"
          :to="`${basePath}/appointments/new?patient_id=${patient.id}`"
        >
          RDV
        </UButton>
        <UButton
          v-if="showDelete && canDeletePatient(patient)"
          variant="ghost"
          color="error"
          size="xs"
          class="shrink-0"
          icon="i-lucide-trash-2"
          aria-label="Supprimer le patient"
          @click="emit('delete', patient)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { patientUiEmailLine } from '~/utils/patient-address-rdv';

function patientEmailLine(patient: any): string {
  return patientUiEmailLine({ email: patient?.email, email_display: patient?.email_display ?? null });
}

const props = withDefaults(
  defineProps<{
    patients: any[];
    basePath: string;
    /** Affiche la corbeille si le patient a été créé par l’utilisateur courant. */
    showDelete?: boolean;
    currentUserId?: string | null;
  }>(),
  {
    showDelete: false,
    currentUserId: null,
  },
);

const emit = defineEmits<{
  delete: [patient: any];
}>();

function canDeletePatient(patient: any): boolean {
  if (!props.currentUserId || !patient?.created_by) return false;
  return String(patient.created_by) === String(props.currentUserId);
}

function displayName(item: any): string {
  const name = [String(item.first_name ?? '').trim(), String(item.last_name ?? '').trim()].filter(Boolean).join(' ');
  if (name) return name;
  const line = patientEmailLine(item);
  if (line) return line;
  return '—';
}

function ageLabel(patient: any): string {
  const raw = patient?.birth_date;
  if (!raw) return '';
  const d = new Date(typeof raw === 'string' ? raw : new Date(raw).toISOString());
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  if (age < 0) return '';
  return age === 0 ? 'Moins d’un an' : `${age} an${age > 1 ? 's' : ''}`;
}
</script>
