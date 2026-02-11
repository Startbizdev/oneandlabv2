<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">Dashboard Professionnel de Santé</h1>
      <UButton to="/pro/appointments/new" color="blue">
        Créer un rendez-vous
      </UButton>
    </div>
    
    <!-- Mes rendez-vous -->
    <UCard class="mb-6">
      <template #header>
        <h2 class="text-xl font-bold">Mes rendez-vous</h2>
      </template>
      
      <div v-if="loading" class="text-center py-8">
        <span class="loading loading-spinner"></span>
      </div>
      
      <UEmpty
        v-else-if="appointments.length === 0"
        icon="i-lucide-calendar-x"
        title="Aucun rendez-vous"
        description="Aucun rendez-vous n'est actuellement assigné. Les nouveaux rendez-vous apparaîtront ici."
      />
      
      <div v-else class="space-y-4">
        <UCard v-for="appointment in appointments" :key="appointment.id" class="hover:shadow-lg">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-bold text-lg">
                {{ appointment.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
              </h3>
              <p class="text-gray-600 mt-1">{{ formatDate(appointment.scheduled_at) }}</p>
              <p class="text-sm text-gray-500 mt-1">{{ appointment.address }}</p>
            </div>
            <UBadge :color="getStatusColor(appointment.status)">
              {{ getStatusLabel(appointment.status) }}
            </UBadge>
          </div>
        </UCard>
      </div>
    </UCard>
    
    <!-- Mes patients -->
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold">Mes patients</h2>
          <UButton to="/pro/patients/new" size="sm">
            Ajouter un patient
          </UButton>
        </div>
      </template>
      
      <div v-if="loadingPatients" class="text-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin mx-auto" />
      </div>
      
      <UEmpty
        v-else-if="patients.length === 0"
        icon="i-lucide-users"
        title="Aucun patient"
        description="Commencez par ajouter vos patients"
      />
      
      <div v-else class="space-y-2">
        <UCard v-for="patient in patients.slice(0, 5)" :key="patient.id" class="hover:shadow">
          <div class="flex justify-between items-center">
            <div>
              <p class="font-semibold">{{ patient.first_name }} {{ patient.last_name }}</p>
              <p class="text-sm text-gray-500">{{ patient.email }}</p>
            </div>
            <UButton size="sm" @click="navigateTo(`/pro/appointments/new?patient_id=${patient.id}`)">
              Créer RDV
            </UButton>
          </div>
        </UCard>
        <UButton v-if="patients.length > 5" to="/pro/patients" variant="ghost" block>
          Voir tous ({{ patients.length }})
        </UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

import { apiFetch } from '~/utils/api';

const { appointments, loading, fetchAppointments } = useAppointments();
const { user } = useAuth();
const patients = ref<any[]>([]);
const loadingPatients = ref(true);

onMounted(async () => {
  fetchAppointments();
  
  try {
    const response = await apiFetch(`/patients?created_by=${user.value?.id}&limit=10`, {
      method: 'GET',
    });
    if (response.success && response.data) {
      patients.value = response.data;
    }
  } catch (error) {
    console.error('Erreur chargement patients:', error);
  } finally {
    loadingPatients.value = false;
  }
});

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'yellow',
    confirmed: 'blue',
    inProgress: 'purple',
    completed: 'green',
  };
  return colors[status] || 'gray';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    inProgress: 'En cours',
    completed: 'Terminé',
  };
  return labels[status] || status;
};
</script>

