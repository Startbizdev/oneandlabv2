<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Mes patients"
      description="Gérez votre liste de patients et créez des rendez-vous pour eux."
      icon="i-lucide-users"
    >
      <template #actions>
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          aria-label="Actualiser"
          @click="fetchPatients"
        />
        <UButton
          color="primary"
          icon="i-lucide-plus"
          to="/profile?newPatient=1"
        >
          Ajouter un patient
        </UButton>
      </template>
    </TitleDashboard>

    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher (nom, email, téléphone...)"
        icon="i-lucide-search"
        size="lg"
        class="flex-1 min-w-0 max-w-md"
        :ui="{ rounded: 'rounded-xl', icon: { color: 'text-gray-400' } }"
        clearable
      />
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <UIcon
        name="i-lucide-loader-2"
        class="w-10 h-10 animate-spin text-primary-500 mb-4"
      />
      <p class="text-[15px] text-gray-500 dark:text-gray-400 font-medium">
        Chargement de la liste...
      </p>
    </div>

    <UEmpty
      v-else-if="!loading && filteredPatients.length === 0"
      icon="i-lucide-users"
      title="Aucun patient trouvé"
      description="Aucun résultat pour votre recherche ou ajoutez votre premier patient."
      class="py-12"
    >
      <template #actions>
        <UButton to="/profile?newPatient=1" color="primary" icon="i-lucide-plus">
          Ajouter un patient
        </UButton>
      </template>
    </UEmpty>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">
      <div
        v-for="patient in filteredPatients"
        :key="patient.id"
        class="bg-white dark:bg-gray-900 rounded-[24px] shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-800 transition-all duration-200 flex flex-col h-full overflow-hidden relative"
      >
        <div class="p-5 flex-1 flex flex-col">
          <div class="flex items-start justify-between mb-5 gap-3">
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-50 dark:bg-primary-500/10 text-primary-500">
                <UIcon name="i-lucide-user" class="w-6 h-6" />
              </div>
              <div class="min-w-0">
                <h3 class="text-[17px] font-bold text-gray-900 dark:text-white truncate">
                  {{ patientDisplayName(patient) }}
                </h3>
                <p v-if="patientAge(patient)" class="text-[14px] text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
                  <UIcon name="i-lucide-cake" class="w-3.5 h-3.5" />
                  {{ patientAge(patient) }}
                </p>
              </div>
            </div>
          </div>

          <div class="bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl p-4 space-y-3.5 flex-1">
            <div v-if="patient.phone" class="flex items-start gap-3">
              <UIcon name="i-lucide-phone" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Téléphone</p>
                <p class="text-[14px] font-medium text-gray-900 dark:text-white truncate">{{ patient.phone }}</p>
              </div>
            </div>
            <div v-if="patient.email" class="flex items-start gap-3">
              <UIcon name="i-lucide-mail" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Email</p>
                <p class="text-[14px] font-medium text-gray-900 dark:text-white truncate">{{ patient.email }}</p>
              </div>
            </div>
            <div v-if="patient.birth_date" class="flex items-start gap-3">
              <UIcon name="i-lucide-cake" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Âge</p>
                <p class="text-[14px] font-medium text-gray-900 dark:text-white">
                  {{ patientAge(patient) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="px-5 pb-5 pt-0 mt-auto flex gap-3">
          <UButton
            variant="soft"
            color="neutral"
            size="md"
            class="flex-1 justify-center font-medium"
            leading-icon="i-lucide-user"
            :to="`/profile?userId=${patient.id}`"
          >
            Fiche patient
          </UButton>
          <UButton
            variant="outline"
            color="primary"
            size="md"
            class="flex-1 justify-center font-medium"
            leading-icon="i-lucide-calendar-plus"
            :to="`/pro/appointments/new?patient_id=${patient.id}`"
          >
            Créer un RDV
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

useHead({
  title: 'Mes patients – Professionnel',
});

import { apiFetch } from '~/utils/api';

const { user } = useAuth();

const patients = ref<any[]>([]);
const loading = ref(true);
const searchQuery = ref('');

/** Filtrage dynamique de la liste */
const filteredPatients = computed(() => {
  const list = patients.value ?? [];
  const q = (searchQuery.value || '').trim().toLowerCase();
  if (!q) return list;
  const fields = ['email', 'first_name', 'last_name', 'phone'];
  return list.filter((item) =>
    fields.some((key) => {
      const val = item[key];
      if (val == null) return false;
      return String(val).toLowerCase().includes(q);
    })
  );
});

/** Formate le nom complet */
const patientDisplayName = (item: any) =>
  [String(item.first_name ?? '').trim(), String(item.last_name ?? '').trim()].filter(Boolean).join(' ') || item.email || '—';

/** Calcule l'âge en années */
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

/** Fetch des données depuis l'API */
const fetchPatients = async () => {
  loading.value = true;
  try {
    const response = await apiFetch(`/patients?created_by=${user.value?.id}`, {
      method: 'GET',
    });
    if (response?.success && response.data) {
      patients.value = response.data;
    } else {
      patients.value = [];
    }
  } catch (error) {
    console.error('Erreur chargement patients:', error);
    patients.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchPatients();
});
</script>