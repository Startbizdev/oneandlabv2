<template>
  <div>
    <TitleDashboard title="Dashboard Préleveur" icon="i-lucide-layout-dashboard" />
    
    <!-- Missions assignées -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-bold">Mes missions assignées</h2>
      </template>
      
      <div v-if="loading" class="text-center py-8">
        <span class="loading loading-spinner"></span>
      </div>
      
      <UEmpty
        v-else-if="appointments.length === 0"
        icon="i-lucide-briefcase"
        title="Aucune mission assignée"
        description="Aucune mission ne vous a été assignée pour le moment. Les nouvelles missions apparaîtront ici lorsqu'elles vous seront assignées."
      />
      
      <div v-else class="space-y-4">
        <UCard v-for="appointment in appointments" :key="appointment.id" class="hover:shadow-lg">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="font-bold text-lg">Prise de sang</h3>
              <p class="text-gray-600 mt-1">{{ formatDate(appointment.scheduled_at) }}</p>
              <p class="text-sm text-gray-500 mt-1">{{ appointment.address }}</p>
            </div>
            <div class="flex items-center space-x-2">
              <UBadge :color="getStatusColor(appointment.status)">
                {{ getStatusLabel(appointment.status) }}
              </UBadge>
              <UButton size="sm" :to="`/preleveur/appointments/${appointment.id}`">
                Voir
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'preleveur',
});

const { appointments, loading, fetchAppointments } = useAppointments();

onMounted(() => {
  fetchAppointments({ type: 'blood_test' });
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

