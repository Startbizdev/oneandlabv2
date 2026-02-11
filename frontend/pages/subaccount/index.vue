<template>
  <div>
    <TitleDashboard title="Dashboard Sous-compte" icon="i-lucide-layout-dashboard" />
    
    <!-- Rendez-vous assignés au labo -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-bold">Rendez-vous du laboratoire</h2>
      </template>
      
      <div v-if="loading" class="text-center py-8">
        <span class="loading loading-spinner"></span>
      </div>
      
      <UEmpty
        v-else-if="appointments.length === 0"
        icon="i-lucide-calendar-x"
        title="Aucun rendez-vous"
        description="Aucun rendez-vous n'est actuellement assigné au laboratoire. Les nouveaux rendez-vous apparaîtront ici."
      />
      
      <UTable v-else :data="appointments" :columns="columns">
        <template #type-data="{ row }">
          <div class="flex items-center gap-2">
            <UIcon :name="row.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-heart-pulse'" :class="row.type === 'blood_test' ? 'text-blue-500' : 'text-green-500'" class="w-4 h-4" />
            <UBadge :color="row.type === 'blood_test' ? 'blue' : 'green'" variant="subtle" size="sm">
              {{ row.type === 'blood_test' ? 'Prise de sang' : 'Soins' }}
            </UBadge>
          </div>
        </template>
        <template #scheduled_at-data="{ row }">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-calendar" class="w-4 h-4 text-muted flex-shrink-0" />
            <div>
              <p class="font-medium text-sm">{{ formatDateShort(row.scheduled_at) }}</p>
              <p class="text-xs text-muted">{{ formatTime(row.scheduled_at) }}</p>
            </div>
          </div>
        </template>
        <template #address-data="{ row }">
          <div class="flex items-start gap-2 max-w-[200px]">
            <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-muted flex-shrink-0 mt-0.5" />
            <p class="text-sm text-muted truncate" :title="getAddressLabel(row)">{{ getAddressLabel(row) }}</p>
          </div>
        </template>
        <template #status-data="{ row }">
          <UBadge :color="getStatusColor(row.status)" variant="subtle" size="sm">
            {{ getStatusLabel(row.status) }}
          </UBadge>
        </template>
        <template #actions-data="{ row }">
          <UButton size="xs" variant="ghost" icon="i-lucide-eye" :to="`/subaccount/appointments/${row.id}`">
            Voir
          </UButton>
        </template>
      </UTable>
    </UCard>

    <!-- Rendez-vous en attente d'acceptation -->
    <UCard v-if="pendingAppointments.length > 0">
      <template #header>
        <h2 class="text-xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-clock" class="w-5 h-5" />
          Rendez-vous en attente d'acceptation
        </h2>
      </template>

      <div class="space-y-4">
        <UCard
          v-for="appointment in pendingAppointments"
          :key="appointment.id"
          class="hover:shadow-lg transition-shadow cursor-pointer"
          @click="openAppointmentModal(appointment)"
        >
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div class="flex-1 space-y-2">
              <div class="flex items-center gap-2">
                <UBadge
                  :color="appointment.type === 'blood_test' ? 'blue' : 'green'"
                  variant="subtle"
                >
                  {{ appointment.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
                </UBadge>
              </div>

              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-calendar" class="w-4 h-4 text-gray-500" />
                  <p class="font-semibold">{{ formatDate(appointment.scheduled_at) }}</p>
                </div>

                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-gray-500 mt-0.5" />
                  <p class="text-sm text-gray-600">{{ appointment.address }}</p>
                </div>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-2 sm:ml-4">
              <UButton
                color="green"
                icon="i-lucide-check"
                @click.stop="openAppointmentModal(appointment)"
                block
              >
                Voir détails
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </UCard>

    <!-- Modal de rendez-vous -->
    <AppointmentModal
      v-model="showAppointmentModal"
      :appointment="selectedAppointment"
      :role="'subaccount'"
      @accepted="onAppointmentAccepted"
      @refused="onAppointmentRefused"
      @refresh="refresh"
    />
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'subaccount',
});

const { appointments, loading, fetchAppointments } = useAppointments();
const toast = useToast();

const showAppointmentModal = ref(false);
const selectedAppointment = ref<any>(null);
const lastAppointmentCount = ref(0);
const hasNewAppointments = ref(false);

const columns = [
  { id: 'type', accessorKey: 'type', header: 'Type' },
  { id: 'scheduled_at', accessorKey: 'scheduled_at', header: 'Date & heure' },
  { id: 'address', accessorKey: 'address', header: 'Lieu' },
  { id: 'status', accessorKey: 'status', header: 'Statut' },
  { id: 'actions', accessorKey: 'actions', header: '' },
];

const pendingAppointments = computed(() =>
  appointments.value.filter(a => a.status === 'pending' && a.assigned_lab_id === null)
);

// Polling pour détecter les nouveaux RDV
const { start: startPolling, stop: stopPolling } = usePolling(async () => {
  const response = await apiFetch('/appointments?status=pending&limit=100', {
    method: 'GET',
  });
  if (response.success && response.data) {
    const currentPendingCount = response.data.filter((a: any) =>
      a.status === 'pending' && a.assigned_lab_id === null
    ).length;

    // Détecter les nouveaux RDV
    if (currentPendingCount > lastAppointmentCount.value && lastAppointmentCount.value > 0) {
      hasNewAppointments.value = true;
      // Ouvrir automatiquement la modal pour le premier nouveau RDV
      const newAppointments = response.data.filter((a: any) =>
        a.status === 'pending' && a.assigned_lab_id === null
      );
      if (newAppointments.length > 0 && !showAppointmentModal.value) {
        openAppointmentModal(newAppointments[0]);
      }
    }

    lastAppointmentCount.value = currentPendingCount;
  }
}, 10000); // Poll toutes les 10 secondes

onMounted(() => {
  fetchAppointments();
  // Démarrer le polling après le premier chargement
  nextTick(() => {
    setTimeout(() => {
      startPolling();
    }, 2000);
  });
});

onUnmounted(() => {
  stopPolling();
});

const refresh = async () => {
  await fetchAppointments();
  hasNewAppointments.value = false;
};

// Gestion de la modal
const openAppointmentModal = (appointment: any) => {
  selectedAppointment.value = appointment;
  showAppointmentModal.value = true;
  hasNewAppointments.value = false;
};

const onAppointmentAccepted = (appointment: any) => {
  // Fermer la modal après acceptation
  showAppointmentModal.value = false;
  selectedAppointment.value = null;
};

const onAppointmentRefused = (appointmentId: string) => {
  // Fermer la modal après refus
  showAppointmentModal.value = false;
  selectedAppointment.value = null;
};

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

const formatDateShort = (date: string) =>
  new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const getAddressLabel = (row: any) => {
  const addr = row.address;
  return typeof addr === 'string' ? addr : addr?.label || '—';
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

