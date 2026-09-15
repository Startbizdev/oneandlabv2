<template>
  <AppPageShell class="space-y-5">
    <template #pageHeader><AppPageHeader :edge-bleed="false" title="Préleveurs" description="Retrouvez votre équipe et consultez les rendez-vous de chaque préleveur." /></template>
    <UInput v-model="searchQuery" placeholder="Nom, prénom ou e-mail" aria-label="Rechercher un préleveur" icon="i-lucide-search" class="w-full sm:max-w-sm" />
    <p v-if="loading" role="status" class="py-12 text-center text-sm text-gray-500">Chargement de l’équipe…</p>
    <UAlert v-else-if="loadError" title="Impossible de charger les préleveurs" color="error" variant="soft"><template #actions><UButton color="neutral" variant="outline" @click="fetchPreleveurs">Réessayer</UButton></template></UAlert>
    <UEmpty v-else-if="!filteredPreleveurs.length" icon="i-lucide-user-check" title="Aucun préleveur" :description="searchQuery ? 'Aucun résultat pour cette recherche.' : 'Aucun préleveur n’est associé à votre équipe.'" />
    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="member in filteredPreleveurs" :key="member.id" class="flex min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
        <h2 class="break-words text-base font-semibold text-gray-950 dark:text-white">{{ [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Préleveur' }}</h2>
        <p class="mt-1 break-all text-sm text-gray-500">{{ member.email || 'E-mail non renseigné' }}</p>
        <p class="my-5 text-sm text-gray-600 dark:text-gray-300">{{ member.stats?.totalAppointments ?? 0 }} rendez-vous · {{ member.stats?.todayAppointments ?? 0 }} aujourd’hui</p>
        <UButton class="mt-auto" color="neutral" variant="outline" icon="i-lucide-calendar-days" :to="`/subaccount/calendar?assigned_to=${encodeURIComponent(member.id)}`">Voir le calendrier</UButton>
      </article>
    </div>
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'subaccount',
});

import { apiFetch } from '~/utils/api';

const preleveurs = ref<any[]>([]);
const loading = ref(true);
const loadError = ref(false);
const searchQuery = ref('');


const filteredPreleveurs = computed(() => {
  if (!searchQuery.value) return preleveurs.value;
  
  const query = searchQuery.value.toLowerCase();
  return preleveurs.value.filter(p =>
    p.email?.toLowerCase().includes(query) ||
    p.first_name?.toLowerCase().includes(query) ||
    p.last_name?.toLowerCase().includes(query)
  );
});

onMounted(async () => {
  await fetchPreleveurs();
});

const fetchPreleveurs = async () => {
  loading.value = true;
  loadError.value = false;
  try {
    const response = await apiFetch('/users?role=preleveur', {
      method: 'GET',
    });
    if (!response.success || !Array.isArray(response.data)) throw new Error('Chargement impossible');
    preleveurs.value = response.data;
  } catch (error) {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
};

</script>

