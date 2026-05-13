<template>
  <AppPageShell class="pro-dashboard-page space-y-6 lg:space-y-8">
    <template #pageHeader>
    <AppPageHeader :edge-bleed="false" 
      title="Tableau de bord"
      description="Vue d'ensemble de vos rendez-vous et patients"
    >
      <template #actions>
        <UButton
          to="/pro/appointments/new"
          color="primary"
          icon="i-lucide-plus"
          size="lg"
        >
          Nouveau rendez-vous
        </UButton>
      </template>
    </AppPageHeader>
  </template>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      
      <section class="flex flex-col gap-3">
        <div class="flex items-center justify-between px-1">
          <h2 class="text-[17px] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-lucide-calendar" class="w-5 h-5 text-primary" />
            Prochains rendez-vous
          </h2>
          <UButton
            to="/pro/appointments"
            color="neutral"
            variant="soft"
            size="sm"
            trailing-icon="i-lucide-arrow-right"
          >
            Voir tout
          </UButton>
        </div>

        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          
          <div v-if="loading" class="flex flex-col items-center justify-center py-10 text-gray-400">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mb-3" />
            <span class="text-sm font-medium">Chargement...</span>
          </div>

          <UEmpty
            v-else-if="appointments.length === 0"
            icon="i-lucide-calendar-x"
            title="Aucun rendez-vous"
            description="Votre planning est vide pour le moment."
            class="py-10"
          >
            <template #actions>
              <UButton to="/pro/appointments/new" color="primary" variant="solid">
                Planifier un RDV
              </UButton>
            </template>
          </UEmpty>

          <DashboardUpcomingAppointmentsList
            v-else
            :appointments="appointments"
            appointments-base-path="/pro"
            variant="pro"
          />
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <div class="flex items-center justify-between px-1">
          <h2 class="text-[17px] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-lucide-users" class="w-5 h-5 text-primary" />
            Vos patients
          </h2>
          <div class="flex items-center gap-2">
            <UButton
              to="/pro/patients"
              color="neutral"
              variant="soft"
              size="sm"
              trailing-icon="i-lucide-arrow-right"
            >
              Voir tout
            </UButton>
            <UButton to="/profile?newPatient=1" size="sm" color="primary" icon="i-lucide-user-plus">
              Ajouter
            </UButton>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          
          <div v-if="loadingPatients" class="flex flex-col items-center justify-center py-10 text-gray-400">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mb-3" />
            <span class="text-sm font-medium">Chargement...</span>
          </div>

          <UEmpty
            v-else-if="patients.length === 0"
            icon="i-lucide-users"
            title="Aucun patient"
            description="Commencez par ajouter votre premier patient."
            class="py-10"
          >
            <template #actions>
              <UButton to="/profile?newPatient=1" color="primary" variant="solid">
                Ajouter un patient
              </UButton>
            </template>
          </UEmpty>

          <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
            <li v-for="patient in patients.slice(0, 6)" :key="patient.id">
              <NuxtLink
                :to="`/profile?userId=${patient.id}`"
                class="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div class="w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex-shrink-0 flex items-center justify-center">
                  <UIcon name="i-lucide-user" class="w-6 h-6 text-primary" />
                </div>

                <div class="flex-1 min-w-0">
                  <p class="text-[16px] font-medium text-gray-900 dark:text-white truncate">
                    {{ patientDisplayName(patient) }}
                  </p>
                  <p v-if="patientEmailLine(patient)" class="text-[14px] text-gray-500 mt-0.5 flex items-start gap-1.5">
                    <UIcon name="i-lucide-mail" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span class="line-clamp-2 break-words min-w-0">{{ patientEmailLine(patient) }}</span>
                  </p>
                  <p v-if="patient.phone" class="text-[13px] text-gray-500 truncate flex items-center gap-1.5">
                    <UIcon name="i-lucide-phone" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {{ patient.phone }}
                  </p>
                  <p v-if="patientAge(patient)" class="text-[13px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <UIcon name="i-lucide-cake" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {{ patientAge(patient) }}
                  </p>
                </div>

                <div class="flex items-center gap-2 flex-shrink-0">
                  <UButton
                    :to="`/pro/appointments/new?patient_id=${patient.id}`"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-calendar-plus"
                    size="sm"
                    @click.stop
                  >
                    RDV
                  </UButton>
                  <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors ml-1" />
                </div>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </section>

    </div>
  </AppPageShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiFetch } from '~/utils/api';
import { fetchAllPatientsForDashboard } from '~/utils/fetch-all-patients';
import { patientUiEmailLine } from '~/utils/patient-address-rdv';

function patientEmailLine(p: any) {
  return patientUiEmailLine({ email: p?.email, email_display: p?.email_display ?? null });
}

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

useHead({ title: 'Tableau de bord – Professionnel' });

// --- Composables ---
const { appointments, loading, fetchAppointments } = useAppointments();
const { user } = useAuth();

// --- État Local ---
const patients = ref<any[]>([]);
const loadingPatients = ref(true);

// --- Cycle de vie ---
onMounted(async () => {
  fetchAppointments();
  fetchPatients();
});

// --- Fonctions Logiques ---
async function fetchPatients() {
  try {
    patients.value = await fetchAllPatientsForDashboard(apiFetch);
  } catch (error) {
    console.error('Erreur chargement patients:', error);
    patients.value = [];
  } finally {
    loadingPatients.value = false;
  }
}

// -- Helpers Patients --
const patientDisplayName = (item: any) => {
  const name = [item.first_name, item.last_name].filter(Boolean).join(' ').trim();
  return name || patientEmailLine(item) || 'Patient sans nom';
};

/** Âge du patient à partir de birth_date (ex. "25 ans") */
const patientAge = (patient: any): string => {
  const raw = patient?.birth_date;
  if (!raw) return '';
  const d = new Date(typeof raw === 'string' ? raw : new Date(raw).toISOString());
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  if (age < 0) return '';
  return age === 0 ? 'Moins d\'un an' : `${age} an${age > 1 ? 's' : ''}`;
};

</script>

<style scoped>
.pro-dashboard-page {
  font-family: var(--font-heading), var(--font-sans), ui-sans-serif, system-ui, sans-serif;
}
</style>