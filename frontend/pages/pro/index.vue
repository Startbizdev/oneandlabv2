<template>
  <div class="pro-dashboard-page space-y-6 lg:space-y-8">
    <TitleDashboard
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
    </TitleDashboard>

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

          <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
            <li v-for="rdv in appointments.slice(0, 6)" :key="rdv.id">
              <NuxtLink
                :to="`/pro/appointments/${rdv.id}`"
                class="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div 
                  class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                  :class="rdv.type === 'blood_test' ? 'bg-red-50 text-red-500 dark:bg-red-500/10' : 'bg-blue-50 text-blue-500 dark:bg-blue-500/10'"
                >
                  <UIcon :name="rdv.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-stethoscope'" class="w-6 h-6" />
                </div>

                <div class="flex-1 min-w-0 pt-0.5">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <p class="text-[16px] font-medium text-gray-900 dark:text-white truncate">
                      {{ rdv.form_data?.first_name }} {{ rdv.form_data?.last_name }}
                    </p>
                    <UBadge :color="getStatusColor(rdv.status)" variant="subtle" size="xs">
                      {{ getStatusLabel(rdv.status) }}
                    </UBadge>
                  </div>
                  
                  <p class="text-[14px] text-gray-500 dark:text-gray-400 font-medium mb-1.5 flex items-center gap-1.5">
                    <UIcon name="i-lucide-clock" class="w-4 h-4 text-gray-400" />
                    <span class="capitalize">{{ formatDateRdv(rdv.scheduled_at) }}</span> • {{ getCreneauHoraireLabel(rdv) }}
                  </p>

                  <div class="space-y-1">
                    <p v-if="rdv.category_name" class="text-[13px] text-gray-500 flex items-center gap-1.5 truncate">
                      <UIcon name="i-lucide-info" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span class="truncate">{{ rdv.category_name }}</span>
                    </p>
                    <p v-if="addressLabel(rdv)" class="text-[13px] text-gray-500 flex items-center gap-1.5 truncate">
                      <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span class="truncate">{{ addressLabel(rdv) }}</span>
                    </p>
                    <p v-if="getAssigneeLabel(rdv)" class="text-[13px] text-gray-500 flex items-center gap-1.5 truncate">
                      <UIcon name="i-lucide-user-check" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span class="truncate">{{ getAssigneeLabel(rdv) }}</span>
                    </p>
                  </div>
                </div>

                <div class="flex-shrink-0 flex items-center justify-center self-center pl-2">
                  <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                </div>
              </NuxtLink>
            </li>
          </ul>
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
                  <p v-if="patient.email" class="text-[14px] text-gray-500 truncate mt-0.5 flex items-center gap-1.5">
                    <UIcon name="i-lucide-mail" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {{ patient.email }}
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiFetch } from '~/utils/api';

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
    const response = await apiFetch(`/patients?created_by=${user.value?.id}&limit=500`, { method: 'GET' });
    if (response?.success && Array.isArray(response.data)) {
      patients.value = response.data;
    } else {
      patients.value = [];
    }
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
  return name || item.email || 'Patient sans nom';
};

const safeDate = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return new Date(v).toISOString();
  return '';
};

const formatDatePatient = (date: string) => {
  if (!date) return '—';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
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

// -- Helpers Rendez-vous --
const formatDateRdv = (date: string | undefined) => {
  if (!date) return 'Date non fixée';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const getCreneauHoraireLabel = (rdv: any): string => {
  const avail = typeof rdv.form_data?.availability === 'string' 
    ? JSON.parse(rdv.form_data.availability || 'null') 
    : rdv.form_data?.availability;

  if (avail?.type === 'all_day') return 'Toute la journée';
  if (avail?.type === 'custom' && avail.range?.length >= 2) {
    return `${Math.floor(avail.range[0])}h00 - ${Math.floor(avail.range[1])}h00`;
  }
  
  if (rdv.scheduled_at) {
    const d = new Date(rdv.scheduled_at);
    if (!isNaN(d.getTime())) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return 'Heure non précisée';
};

const addressLabel = (rdv: any): string => {
  if (!rdv?.address) return '';
  return typeof rdv.address === 'object' ? rdv.address.label : rdv.address;
};

const getAssigneeLabel = (rdv: any): string => {
  if (rdv.type !== 'blood_test') return '';
  const parts = [];
  if (rdv.assigned_lab_display_name) {
    parts.push(`${rdv.assigned_lab_role === 'subaccount' ? 'Sous-compte' : 'Labo'} ${rdv.assigned_lab_display_name}`);
  }
  if (rdv.assigned_to_display_name) {
    parts.push(`Préleveur ${rdv.assigned_to_display_name}`);
  }
  return parts.join(' • ');
};

// -- Helpers Status UI (mêmes couleurs que /pro/appointments) --
const getStatusColor = (status: string): 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral' => {
  const colors: Record<string, 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'info',
    inProgress: 'primary',
    completed: 'success',
    canceled: 'error',
    cancelled: 'error',
    refused: 'error',
    expired: 'neutral',
  };
  return colors[status] || 'neutral';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    refused: 'Refusé',
    expired: 'Expiré',
  };
  return labels[status] || status;
};
</script>

<style scoped>
.pro-dashboard-page {
  font-family: var(--font-heading), var(--font-sans), ui-sans-serif, system-ui, sans-serif;
}
</style>