<template>
  <div>
    <TitleDashboard title="Gestion des préleveurs" icon="i-lucide-users" />
    
    <div class="mb-4">
      <UInput v-model="searchQuery" placeholder="Rechercher par email, nom..." class="flex-1" />
    </div>
    
    <UTable :data="filteredPreleveurs" :columns="columns" :loading="loading">
      <template #empty>
        <div class="py-12">
          <UEmpty
            icon="i-lucide-user-check"
            title="Aucun préleveur"
            :description="searchQuery ? 'Aucun résultat pour votre recherche' : 'Aucun préleveur n\'est associé à ce sous-compte.'"
            variant="naked"
          />
        </div>
      </template>
      <template #email-data="{ row }">
        {{ row.email || '-' }}
      </template>
      
      <template #stats-data="{ row }">
        <div class="text-sm">
          <div>RDV: {{ row.stats?.totalAppointments || 0 }}</div>
          <div class="text-gray-500">Aujourd'hui: {{ row.stats?.todayAppointments || 0 }}</div>
        </div>
      </template>
      
      <template #actions-data="{ row }">
        <UButton size="sm" @click="viewPreleveur(row)">
          Voir calendrier
        </UButton>
      </template>
    </UTable>
  </div>
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
const searchQuery = ref('');

const columns = [
  { id: 'email', accessorKey: 'email', header: 'Email' },
  { id: 'first_name', accessorKey: 'first_name', header: 'Prénom' },
  { id: 'last_name', accessorKey: 'last_name', header: 'Nom' },
  { id: 'stats', accessorKey: 'stats', header: 'Statistiques' },
  { id: 'actions', accessorKey: 'actions', header: 'Actions' },
];

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
  try {
    const response = await apiFetch('/users?role=preleveur', {
      method: 'GET',
    });
    if (response.success && response.data) {
      preleveurs.value = response.data;
    }
  } catch (error) {
    console.error('Erreur lors du chargement des préleveurs:', error);
  } finally {
    loading.value = false;
  }
};

const viewPreleveur = (preleveur: any) => {
  navigateTo(`/subaccount/preleveurs/${preleveur.id}/calendar`);
};
</script>

