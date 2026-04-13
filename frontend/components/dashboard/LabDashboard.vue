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
    <!-- RDV du jour (date = Aujourd'hui, créneau = Toute la journée ou 9h-11h) -->
    <DashboardTodayAppointments
      :appointments="todayAppointments"
      :loading="loading"
      :base-path="basePath"
      :format-date-label="() => 'Aujourd\'hui'"
    />

    <!-- RDV en attente (date sans heure, créneau = Toute la journée ou 9h-11h) — modal unique dans layout -->
    <DashboardPendingAppointments
      :appointments="pendingAppointments"
      :base-path="basePath"
      :format-date-label="(apt) => formatDateOnly(apt.scheduled_at)"
      @open="openAppointmentById"
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

const { openAppointmentModalById } = useAppointmentModal();

function openAppointmentById(appointment: any) {
  if (appointment?.id) openAppointmentModalById(appointment.id);
}

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

onMounted(() => {
  fetchAppointments({ limit: 200 });
  fetchLabStats();
});

const refresh = async () => {
  await fetchAppointments({ limit: 200 });
  await fetchLabStats();
};

/** Date sans heure (créneau affiché à part : Toute la journée ou 9h-11h) */
function formatDateOnly(date: string) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

</script>
