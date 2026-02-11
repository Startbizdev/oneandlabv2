<template>
  <div>
    <TitleDashboard title="Dashboard Laboratoire" icon="i-lucide-layout-dashboard" />
    
    <!-- Statistiques -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-primary">{{ stats.totalAppointments }}</div>
          <div class="text-sm text-gray-600">RDV total</div>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-yellow-600">{{ stats.pendingAppointments }}</div>
          <div class="text-sm text-gray-600">En attente</div>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-blue-600">{{ stats.todayAppointments }}</div>
          <div class="text-sm text-gray-600">Aujourd'hui</div>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600">{{ stats.completedAppointments }}</div>
          <div class="text-sm text-gray-600">Terminés</div>
        </div>
      </UCard>
    </div>
    
    <!-- Rendez-vous du jour -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-bold">Rendez-vous d'aujourd'hui</h2>
      </template>
      
      <UTable 
        v-if="todayAppointments.length > 0"
        :data="todayAppointments" 
        :columns="[
          { id: 'type', accessorKey: 'type', header: 'Type' },
          { id: 'scheduled_at', accessorKey: 'scheduled_at', header: 'Heure' },
          { id: 'address', accessorKey: 'address', header: 'Adresse' },
          { id: 'status', accessorKey: 'status', header: 'Statut' },
          { id: 'actions', accessorKey: 'actions', header: 'Actions' }
        ]"
      >
        <template #type-data="{ row }">
          <UBadge :color="row.type === 'blood_test' ? 'blue' : 'green'" variant="subtle">
            {{ row.type === 'blood_test' ? 'Prise de sang' : 'Soins' }}
          </UBadge>
        </template>
        
        <template #scheduled_at-data="{ row }">
          {{ formatTime(row.scheduled_at) }}
        </template>
        
        <template #status-data="{ row }">
          <UBadge :color="getStatusColor(row.status)">
            {{ getStatusLabel(row.status) }}
          </UBadge>
        </template>
        
        <template #actions-data="{ row }">
          <UButton size="sm" :to="`/lab/appointments/${row.id}`">
            Voir
          </UButton>
        </template>
      </UTable>
      <div v-else class="text-center py-8">
        <UIcon name="i-lucide-calendar" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p class="text-gray-600">Aucun rendez-vous aujourd'hui</p>
        <p class="text-sm text-gray-500">Vous n'avez pas de rendez-vous prévus pour aujourd'hui.</p>
      </div>
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
      :role="'lab'"
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
  role: 'lab',
});

const { appointments, loading, fetchAppointments } = useAppointments();
const toast = useToast();

const showAppointmentModal = ref(false);
const selectedAppointment = ref<any>(null);
const lastAppointmentCount = ref(0);
const hasNewAppointments = ref(false);

const stats = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  const todayApps = appointments.value.filter(a => 
    a.scheduled_at?.startsWith(today)
  );
  
  return {
    totalAppointments: appointments.value.length,
    pendingAppointments: appointments.value.filter(a => a.status === 'pending').length,
    todayAppointments: todayApps.length,
    completedAppointments: appointments.value.filter(a => a.status === 'completed').length,
  };
});

const todayAppointments = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  return appointments.value
    .filter(a => a.scheduled_at?.startsWith(today))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
});

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

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
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

