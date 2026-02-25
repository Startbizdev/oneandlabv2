<template>
  <DashboardLayout
    :title="title"
    :description="description"
    :loading="loading"
    :error="null"
    :stats-cards="statsCards"
  >
    <template #actions>
      <UButton
        :to="`${basePath}/appointments`"
        color="primary"
        size="sm"
        icon="i-lucide-calendar"
      >
        Mes rendez-vous
      </UButton>
    </template>

    <template #main>
    <!-- RDV du jour -->
    <DashboardTodayAppointments
      :appointments="todayAppointments"
      :loading="loading"
      :base-path="basePath"
      :format-time="formatTime"
      :get-address-label="getAddressLabel"
      :get-status-color="getStatusColor"
      :get-status-label="getStatusLabel"
    />

    <!-- RDV en attente -->
    <DashboardPendingAppointments
      :appointments="pendingAppointments"
      :format-date="formatDate"
      :get-address-label="getAddressLabel"
      @open="openAppointmentModal"
    />
    </template>

    <template #sidebar>
      <div class="rounded-xl border border-default/50 bg-default p-4 shadow-sm md:p-5">
        <h3 class="mb-3 flex items-center gap-2 text-sm font-normal text-foreground">
          <UIcon name="i-lucide-zap" class="h-4 w-4 text-muted" />
          Accès rapide
        </h3>
        <div class="flex flex-col gap-0.5">
          <NuxtLink
            v-for="link in quickLinks"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted transition hover:bg-default/80 hover:text-foreground"
          >
            <UIcon :name="link.icon" class="h-3.5 w-3.5 shrink-0" />
            {{ link.label }}
          </NuxtLink>
        </div>
      </div>
    </template>
  </DashboardLayout>

  <!-- Modal RDV -->
  <AppointmentModal
    v-model="showAppointmentModal"
    :appointment="selectedAppointment"
    :role="role"
    @accepted="onAppointmentAccepted"
    @refused="onAppointmentRefused"
    @refresh="refresh"
  />
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

type DashboardMode = 'lab' | 'subaccount';

interface Props {
  mode: DashboardMode;
}

const props = defineProps<Props>();

const isLab = computed(() => props.mode === 'lab');
const basePath = computed(() => (props.mode === 'lab' ? '/lab' : '/subaccount'));
const role = computed(() => props.mode);

const title = computed(() =>
  props.mode === 'lab' ? 'Dashboard Laboratoire' : 'Dashboard Sous-compte'
);
const description = computed(() =>
  props.mode === 'lab'
    ? 'Vue d\'ensemble de votre activité et de vos rendez-vous.'
    : 'Rendez-vous et activité de ce laboratoire.'
);

const { appointments, loading, fetchAppointments } = useAppointments();

const showAppointmentModal = ref(false);
const selectedAppointment = ref<any>(null);
const lastAppointmentCount = ref(0);
const hasNewAppointments = ref(false);

/** Stats dashboard (lab + subaccount) — chargées via /lab/stats?stats_only=1 */
const loadingStats = ref(true);
const labStats = ref<{
  totalAppointments: number;
  todayCount: number;
  monthAppointments: number;
  completionRate: number;
  averageDuration: number;
  byStatus: Record<string, number>;
}>({
  totalAppointments: 0,
  todayCount: 0,
  monthAppointments: 0,
  completionRate: 0,
  averageDuration: 0,
  byStatus: {},
});

/** Valeurs pour les 4 cartes : priorité aux stats API, sinon fallback sur la liste des RDV */
const statsForCards = computed(() => ({
  total: labStats.value.totalAppointments,
  pending: labStats.value.byStatus?.pending ?? 0,
  today: labStats.value.todayCount,
  completed: labStats.value.byStatus?.completed ?? 0,
}));

/** 4 cartes stats (même format que admin) pour DashboardLayout */
const statsCards = computed(() => [
  {
    icon: 'i-lucide-calendar',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    value: loadingStats.value ? '—' : statsForCards.value.total,
    title: 'Total RDV',
    to: `${basePath.value}/appointments`,
  },
  {
    icon: 'i-lucide-clock',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    value: loadingStats.value ? '—' : statsForCards.value.pending,
    title: 'En attente',
    to: `${basePath.value}/appointments`,
  },
  {
    icon: 'i-lucide-calendar-days',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    value: loadingStats.value ? '—' : statsForCards.value.today,
    title: "Aujourd'hui",
    to: `${basePath.value}/appointments`,
  },
  {
    icon: 'i-lucide-circle-check',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    value: loadingStats.value ? '—' : statsForCards.value.completed,
    title: 'Terminés',
    to: null,
  },
]);

const quickLinks = computed(() => {
  const base = basePath.value;
  const links: { label: string; to: string; icon: string }[] = [
    { label: 'Mes rendez-vous', to: `${base}/appointments`, icon: 'i-lucide-calendar' },
    { label: 'Calendrier', to: `${base}/calendar`, icon: 'i-lucide-calendar-days' },
  ];
  if (isLab.value) {
    links.push({ label: 'Préleveurs', to: `${base}/preleveurs`, icon: 'i-lucide-user-check' });
    links.push({ label: 'Sous-comptes', to: `${base}/subaccounts`, icon: 'i-lucide-users' });
  }
  links.push({ label: 'Statistiques', to: '/lab/stats', icon: 'i-lucide-bar-chart-3' });
  links.push({ label: 'Avis', to: `${base}/reviews`, icon: 'i-lucide-star' });
  links.push({ label: 'Mon profil', to: '/profile', icon: 'i-lucide-user' });
  return links;
});

const todayAppointments = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  return appointments.value
    .filter((a) => a.scheduled_at?.startsWith(today))
    .sort((a, b) => (a.scheduled_at || '').localeCompare(b.scheduled_at || ''));
});

const pendingAppointments = computed(() =>
  appointments.value.filter((a) => a.status === 'pending' && a.assigned_lab_id === null)
);

async function fetchLabStats() {
  loadingStats.value = true;
  try {
    const res = await apiFetch<{
      data: {
        stats: {
          totalAppointments: number;
          todayCount: number;
          monthAppointments: number;
          completionRate: number;
          averageDuration: number;
          byStatus: Record<string, number>;
        };
      };
    }>('/lab/stats?stats_only=1', { method: 'GET' });
    if (res.success && res.data?.stats) {
      const s = res.data.stats;
      labStats.value = {
        totalAppointments: s.totalAppointments ?? 0,
        todayCount: s.todayCount ?? 0,
        monthAppointments: s.monthAppointments ?? 0,
        completionRate: s.completionRate ?? 0,
        averageDuration: s.averageDuration ?? 0,
        byStatus: s.byStatus ?? {},
      };
    }
  } catch {
    // ignore
  } finally {
    loadingStats.value = false;
  }
}

const { start: startPolling, stop: stopPolling } = usePolling(async () => {
  const response = await apiFetch<{ success: boolean; data?: any[] }>('/appointments?status=pending&limit=100', { method: 'GET' });
  if (response.success && response.data) {
    const currentPendingCount = response.data.filter(
      (a: any) => a.status === 'pending' && a.assigned_lab_id === null
    ).length;
    if (currentPendingCount > lastAppointmentCount.value && lastAppointmentCount.value > 0) {
      hasNewAppointments.value = true;
      const newAppointments = response.data.filter(
        (a: any) => a.status === 'pending' && a.assigned_lab_id === null
      );
      if (newAppointments.length > 0 && !showAppointmentModal.value) {
        openAppointmentModal(newAppointments[0]);
      }
    }
    lastAppointmentCount.value = currentPendingCount;
  }
}, 10000);

onMounted(() => {
  fetchAppointments({ limit: 200 });
  fetchLabStats();
  nextTick(() => {
    setTimeout(() => startPolling(), 2000);
  });
});

onUnmounted(() => {
  stopPolling();
});

const refresh = async () => {
  await fetchAppointments({ limit: 200 });
  await fetchLabStats();
  hasNewAppointments.value = false;
};

function openAppointmentModal(appointment: any) {
  selectedAppointment.value = appointment;
  showAppointmentModal.value = true;
  hasNewAppointments.value = false;
}

function onAppointmentAccepted() {
  showAppointmentModal.value = false;
  selectedAppointment.value = null;
}

function onAppointmentRefused() {
  showAppointmentModal.value = false;
  selectedAppointment.value = null;
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAddressLabel(row: any) {
  const addr = row.address;
  return typeof addr === 'string' ? addr : addr?.label ?? '—';
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'yellow',
    confirmed: 'blue',
    inProgress: 'purple',
    completed: 'green',
  };
  return colors[status] ?? 'gray';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    cancelled: 'Annulé',
    refused: 'Refusé',
    expired: 'Expiré',
  };
  return labels[status] ?? status;
}
</script>
