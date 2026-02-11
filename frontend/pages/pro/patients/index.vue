<template>
  <div>
    <TitleDashboard title="Mes patients" icon="i-lucide-users">
      <template #actions>
        <UButton color="primary" icon="i-lucide-plus" to="/pro/patients/new">
          Ajouter un patient
        </UButton>
      </template>
    </TitleDashboard>

    <p class="text-sm text-muted mb-4">
      Gérez vos patients et créez des rendez-vous pour eux.
    </p>

    <div class="mb-4">
      <UInput v-model="searchQuery" placeholder="Rechercher par nom, email..." class="flex-1" />
    </div>
    
    <div class="rounded-xl border border-default/50 bg-default shadow-sm overflow-hidden">
      <UTable :data="filteredPatients" :columns="columns" :loading="loading">
        <template #patient-data="{ row }">
          <div class="flex items-center gap-3 py-1">
            <UAvatar
              :alt="`${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email"
              size="sm"
              class="flex-shrink-0"
            />
            <div class="min-w-0">
              <p class="font-semibold text-foreground truncate">
                {{ (row.first_name || '') + ' ' + (row.last_name || '') || '—' }}
              </p>
              <p class="text-sm text-muted truncate">{{ row.email || '—' }}</p>
            </div>
          </div>
        </template>
        <template #phone-data="{ row }">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-phone" class="w-4 h-4 text-muted flex-shrink-0" />
            <span class="text-sm">{{ row.phone || '—' }}</span>
          </div>
        </template>
        <template #created_at-data="{ row }">
          <span class="text-sm text-muted">{{ formatDateShort(row.created_at) }}</span>
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-1.5">
            <UButton size="xs" variant="ghost" icon="i-lucide-eye" @click="viewPatient(row)">
              Voir
            </UButton>
            <UButton size="xs" variant="ghost" icon="i-lucide-calendar-plus" @click="createAppointmentForPatient(row)">
              RDV
            </UButton>
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

import { apiFetch } from '~/utils/api';

const patients = ref<any[]>([]);
const loading = ref(true);
const searchQuery = ref('');

const columns = [
  { id: 'patient', accessorKey: 'patient', header: 'Patient' },
  { id: 'phone', accessorKey: 'phone', header: 'Téléphone' },
  { id: 'created_at', accessorKey: 'created_at', header: 'Ajouté le' },
  { id: 'actions', accessorKey: 'actions', header: '' },
];

const formatDateShort = (date: string) =>
  new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const filteredPatients = computed(() => {
  if (!searchQuery.value) return patients.value;
  
  const query = searchQuery.value.toLowerCase();
  return patients.value.filter(p =>
    p.first_name?.toLowerCase().includes(query) ||
    p.last_name?.toLowerCase().includes(query) ||
    p.email?.toLowerCase().includes(query)
  );
});

onMounted(async () => {
  await fetchPatients();
});

const fetchPatients = async () => {
  loading.value = true;
  try {
    const { user } = useAuth();
    const response = await apiFetch(`/patients?created_by=${user.value?.id}`, {
      method: 'GET',
    });
    if (response.success && response.data) {
      patients.value = response.data;
    }
  } catch (error) {
    console.error('Erreur lors du chargement des patients:', error);
  } finally {
    loading.value = false;
  }
};

const viewPatient = (patient: any) => {
  navigateTo(`/pro/patients/${patient.id}`);
};

const createAppointmentForPatient = (patient: any) => {
  navigateTo(`/pro/appointments/new?patient_id=${patient.id}`);
};
</script>

