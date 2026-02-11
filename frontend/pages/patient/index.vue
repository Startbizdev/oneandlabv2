<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold">Mes rendez-vous</h1>
      <UButton to="/rendez-vous/nouveau" color="primary" icon="i-lucide-calendar-plus" size="xl">
        Nouveau rendez-vous
      </UButton>
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="py-12 text-center">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
      <p class="text-gray-500">Chargement des rendez-vous...</p>
    </div>

    <!-- Erreur -->
    <div v-else-if="error" class="mt-4">
      <UAlert color="red" :title="error" />
    </div>

    <!-- Liste vide -->
    <UEmpty
      v-else-if="appointments.length === 0"
      icon="i-lucide-calendar-plus"
      title="Aucun rendez-vous"
      description="Vous n'avez pas encore de rendez-vous. Créez votre premier rendez-vous pour commencer."
      :actions="[
        {
          icon: 'i-lucide-plus',
          label: 'Créer mon premier rendez-vous',
          to: '/rendez-vous/nouveau',
        },
      ]"
    />

    <!-- Cartes de rendez-vous -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard
        v-for="appointment in appointments"
        :key="appointment.id"
        class="cursor-pointer"
        @click="viewAppointment(appointment.id)"
      >
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon 
                :name="appointment.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-stethoscope'" 
                class="w-5 h-5 text-gray-500"
              />
              <span class="font-medium text-gray-700">
                {{ appointment.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
              </span>
            </div>
            <Badge 
              v-if="appointment.status"
              :color="getStatusColor(appointment.status)"
              variant="subtle"
            >
              {{ getStatusLabel(appointment.status) }}
            </Badge>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-calendar" class="w-5 h-5 text-gray-500" />
            <span class="font-semibold">{{ formatDate(appointment.scheduled_at) }}</span>
          </div>

          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <span class="text-sm text-gray-600 line-clamp-2">{{ appointment.address }}</span>
          </div>

          <div v-if="appointment.assigned_nurse" class="flex items-center gap-2 pt-2 border-t">
            <UIcon name="i-lucide-user" class="w-5 h-5 text-gray-500" />
            <span class="text-sm text-gray-600">
              {{ appointment.assigned_nurse.first_name }} {{ appointment.assigned_nurse.last_name }}
            </span>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton
              variant="ghost"
              icon="i-lucide-eye"
              size="xl"
              @click.stop="viewAppointment(appointment.id)"
            >
              Voir les détails
            </UButton>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'patient',
  middleware: ['auth', 'role'],
  role: 'patient',
});

const route = useRoute();
const router = useRouter();
const { appointments, loading, error, fetchAppointments } = useAppointments();

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getStatusColor = (status: string | undefined | null) => {
  if (!status) return 'gray';
  const colors: Record<string, string> = {
    pending: 'amber',
    confirmed: 'blue',
    in_progress: 'violet',
    inProgress: 'violet',
    completed: 'green',
    cancelled: 'red',
    canceled: 'red',
    expired: 'gray',
    refused: 'red',
  };
  return colors[status] || 'gray';
};

const getStatusLabel = (status: string | undefined | null) => {
  if (!status) return 'Inconnu';
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    in_progress: 'En cours',
    inProgress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return labels[status] || status;
};

const viewAppointment = (id: number) => {
  router.push(`/patient/appointments/${id}`);
};

onMounted(() => {
  fetchAppointments();
});

// Rafraîchir la liste quand on revient sur la page
onActivated(() => {
  fetchAppointments();
});

// Écouter les changements de route pour rafraîchir si nécessaire
watch(() => route.path, (newPath) => {
  if (newPath === '/patient') {
    fetchAppointments();
  }
});
</script>
