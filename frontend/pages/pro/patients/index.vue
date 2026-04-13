<template>
  <div class="space-y-4">
    <TitleDashboard
      title="Mes patients"
      description="Gérez votre liste de patients et créez des rendez-vous pour eux."
      icon="i-lucide-users"
    >
      <template #actions>
        <UButton
          color="primary"
          icon="i-lucide-plus"
          to="/profile?newPatient=1"
        >
          Ajouter un patient
        </UButton>
      </template>
    </TitleDashboard>

    <div class="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900/50 px-3 py-2.5 sm:px-3.5 sm:py-3 shadow-sm">
      <UInput
        v-model="searchQuery"
        placeholder="Nom, email, téléphone…"
        icon="i-lucide-search"
        size="md"
        class="w-full min-w-0"
        :ui="{ rounded: 'rounded-lg' }"
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

    <PatientListCompactGrid
      v-else
      :patients="filteredPatients"
      base-path="/pro"
      show-delete
      :current-user-id="user?.id ?? null"
      @delete="onDeletePatient"
    />
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
import { fetchAllPatientsForDashboard } from '~/utils/fetch-all-patients';

const toast = useAppToast();
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

/** Fetch des données depuis l'API (périmètre imposé par le backend : created_by + accès pro) */
const fetchPatients = async () => {
  loading.value = true;
  try {
    patients.value = await fetchAllPatientsForDashboard(apiFetch);
  } catch (error) {
    console.error('Erreur chargement patients:', error);
    patients.value = [];
  } finally {
    loading.value = false;
  }
};

async function onDeletePatient(patient: any) {
  const name =
    [patient?.first_name, patient?.last_name].filter(Boolean).join(' ').trim() || 'ce patient';
  if (
    !confirm(
      `Supprimer ${name} de votre liste ? Cette action est définitive (si aucun rendez-vous actif n’est lié à ce patient).`,
    )
  ) {
    return;
  }
  try {
    const res = await apiFetch(`/patients/${patient.id}`, { method: 'DELETE' });
    if (res?.success) {
      toast.add({ title: 'Patient supprimé', color: 'success' });
      await fetchPatients();
    } else {
      toast.add({
        title: 'Suppression impossible',
        description: typeof res?.error === 'string' ? res.error : undefined,
        color: 'error',
      });
    }
  } catch (e: any) {
    toast.add({
      title: 'Suppression impossible',
      description: e?.message || undefined,
      color: 'error',
    });
  }
}

onMounted(() => {
  fetchPatients();
});
</script>