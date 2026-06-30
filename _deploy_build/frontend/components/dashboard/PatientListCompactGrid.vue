<template>
  <div class="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <DashboardCardShell v-for="patient in patients" :key="patient.id">
      <div class="relative min-h-0">
        <NuxtLink
          v-if="patient.id"
          :to="profileHref(patient)"
          class="block min-w-0 cursor-pointer rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35 dark:focus-visible:ring-primary/40"
          :aria-label="`Voir le profil de ${displayName(patient)}`"
        >
          <div class="flex min-w-0 flex-col gap-3 p-4 pr-12 sm:p-5 sm:pr-14">
            <div class="min-w-0">
              <p class="text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">
                {{ displayName(patient) }}
              </p>
              <p
                v-if="ageLabel(patient)"
                class="mt-1.5 flex items-center gap-1 text-[11px] font-medium leading-snug text-gray-500 dark:text-gray-400"
              >
                <UIcon name="i-lucide-cake" class="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
                {{ ageLabel(patient) }}
              </p>
            </div>

            <div
              v-if="patient.phone || patientEmailLine(patient)"
              class="space-y-1.5 rounded-lg bg-gray-50/80 px-2.5 py-2 ring-1 ring-inset ring-gray-100 dark:bg-white/[0.03] dark:ring-white/[0.08]"
            >
              <div
                v-if="patient.phone"
                class="flex items-start gap-1.5 text-[12px] font-semibold text-gray-700 dark:text-gray-200"
              >
                <UIcon
                  name="i-lucide-phone"
                  class="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500 dark:text-primary-400"
                  aria-hidden="true"
                />
                <span class="break-words">{{ patient.phone }}</span>
              </div>
              <div
                v-if="patientEmailLine(patient)"
                class="flex items-start gap-1.5 text-[12px] font-semibold text-gray-700 dark:text-gray-200"
              >
                <UIcon
                  name="i-lucide-mail"
                  class="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500 dark:text-primary-400"
                  aria-hidden="true"
                />
                <span class="line-clamp-2 break-words">{{ patientEmailLine(patient) }}</span>
              </div>
            </div>
          </div>
        </NuxtLink>
        <div
          v-else
          class="flex min-w-0 flex-col gap-3 p-4 pr-12 sm:p-5 sm:pr-14"
        >
          <div class="min-w-0">
            <p class="text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">
              {{ displayName(patient) }}
            </p>
          </div>
        </div>

        <div class="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
          <UDropdownMenu
            :items="patientMenuItems(patient)"
            :popper="{ placement: 'bottom-end', offsetDistance: 6 }"
            :ui="{ width: 'w-56' }"
          >
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              icon="i-lucide-ellipsis-vertical"
              class="h-8 w-8 shrink-0 justify-center p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Actions pour ce patient"
              @click.stop
            />
          </UDropdownMenu>
        </div>
      </div>
    </DashboardCardShell>
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

function profileHref(patient: any): string {
  return `/profile?userId=${encodeURIComponent(String(patient?.id ?? ''))}`;
}

function patientMenuItems(patient: any) {
  const bp = props.basePath;
  const main = [
    {
      label: 'Créer un rendez-vous',
      icon: 'i-lucide-calendar-plus',
      onSelect: () => navigateTo(`${bp}/appointments/new?patient_id=${patient.id}`),
    },
    {
      label: 'Voir les détails',
      icon: 'i-lucide-user',
      onSelect: () => navigateTo(`/profile?userId=${patient.id}`),
    },
  ];
  const groups: any[][] = [main];
  if (props.showDelete && canDeletePatient(patient)) {
    groups.push([
      {
        label: 'Supprimer',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => emit('delete', patient),
      },
    ]);
  }
  return groups;
}

function displayName(item: any): string {
  const name = [String(item.first_name ?? '').trim(), String(item.last_name ?? '').trim()]
    .filter(Boolean)
    .join(' ');
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
