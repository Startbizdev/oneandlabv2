<template>
  <div class="space-y-8">
    <TitleDashboard title="Statistiques du laboratoire" icon="i-lucide-bar-chart-3">
      <template #actions>
        <UButton
          variant="ghost"
          size="sm"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          aria-label="Actualiser"
          @click="fetchStats"
        />
        <UButton
          color="primary"
          variant="solid"
          icon="i-lucide-list"
          to="/lab/appointments"
        >
          Voir les rendez-vous
        </UButton>
      </template>
    </TitleDashboard>

    <p class="text-sm text-muted">
      Prises de sang uniquement — inclut le laboratoire et tous les sous-comptes.
    </p>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      <div v-for="i in 4" :key="i" class="rounded-xl border border-default/50 p-5 h-28 bg-muted/20" />
    </div>

    <template v-else>
      <!-- Cartes KPIs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          class="rounded-xl border border-default/50 bg-default p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted">Total RDV</p>
              <p class="text-2xl sm:text-3xl font-bold text-default tabular-nums mt-1">
                {{ stats.totalAppointments }}
              </p>
            </div>
            <div class="rounded-lg bg-primary/10 p-2">
              <UIcon name="i-lucide-calendar" class="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
        <div
          class="rounded-xl border border-default/50 bg-default p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted">Ce mois</p>
              <p class="text-2xl sm:text-3xl font-bold text-default tabular-nums mt-1">
                {{ stats.monthAppointments }}
              </p>
            </div>
            <div class="rounded-lg bg-blue-500/10 p-2">
              <UIcon name="i-lucide-calendar-days" class="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>
        <div
          class="rounded-xl border border-default/50 bg-default p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted">Taux de complétion</p>
              <p class="text-2xl sm:text-3xl font-bold text-default tabular-nums mt-1">
                {{ stats.completionRate }}%
              </p>
            </div>
            <div class="rounded-lg bg-emerald-500/10 p-2">
              <UIcon name="i-lucide-check-circle" class="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </div>
        <div
          class="rounded-xl border border-default/50 bg-default p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted">Durée moyenne</p>
              <p class="text-2xl sm:text-3xl font-bold text-default tabular-nums mt-1">
                {{ stats.averageDuration }} min
              </p>
            </div>
            <div class="rounded-lg bg-violet-500/10 p-2">
              <UIcon name="i-lucide-clock" class="w-6 h-6 text-violet-500" />
            </div>
          </div>
        </div>
      </div>

      <!-- Graphiques -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- RDV par statut -->
        <div class="rounded-xl border border-default/50 bg-default p-6 shadow-sm">
          <h2 class="text-lg font-semibold text-default mb-4">Répartition par statut</h2>
          <UEmpty
            v-if="stats.totalAppointments === 0"
            icon="i-lucide-droplet"
            title="Aucune donnée"
            description="Aucun rendez-vous enregistré."
            variant="naked"
          />
          <div v-else class="space-y-4">
            <div
              v-for="(count, status) in stats.byStatus"
              :key="status"
              class="flex items-center gap-4"
            >
              <span class="w-28 text-sm text-default shrink-0">{{ getStatusLabel(status) }}</span>
              <div class="flex-1 min-w-0">
                <div class="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="getStatusBarColor(status)"
                    :style="{ width: `${barWidth(count)}%` }"
                  />
                </div>
              </div>
              <span class="text-sm font-semibold tabular-nums shrink-0 w-8 text-right">{{ count }}</span>
            </div>
          </div>
        </div>

        <!-- Prises de sang uniquement -->
        <div class="rounded-xl border border-default/50 bg-default p-6 shadow-sm">
          <h2 class="text-lg font-semibold text-default mb-4">Prises de sang</h2>
          <UEmpty
            v-if="stats.totalAppointments === 0"
            icon="i-lucide-droplet"
            title="Aucune donnée"
            description="Aucun rendez-vous enregistré."
            variant="naked"
          />
          <div v-else class="flex items-center justify-center py-8">
            <div class="text-center">
              <p class="text-4xl font-bold text-primary tabular-nums">
                {{ stats.byType?.blood_test ?? 0 }}
              </p>
              <p class="text-sm text-muted mt-1">sur {{ stats.totalAppointments }} RDV total</p>
              <div class="mt-4 w-32 h-32 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <UIcon name="i-lucide-droplet" class="w-14 h-14 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RDV récents -->
      <div class="rounded-xl border border-default/50 bg-default overflow-hidden shadow-sm">
        <div class="p-6 border-b border-default/50">
          <h2 class="text-lg font-semibold text-default">Rendez-vous récents</h2>
        </div>
        <UEmpty
          v-if="recentAppointments.length === 0"
          icon="i-lucide-calendar-x"
          title="Aucun rendez-vous"
          description="Les rendez-vous récents apparaîtront ici."
          variant="naked"
        />
        <UTable
          v-else
          :data="recentAppointments"
          :columns="columns"
        >
          <template #scheduled_at-data="{ row }">
            {{ formatDate(row.scheduled_at) }}
          </template>
          <template #status-data="{ row }">
            <UBadge :color="getStatusBadgeColor(row.status)" size="sm" variant="subtle">
              {{ getStatusLabel(row.status) }}
            </UBadge>
          </template>
          <template #actions-data="{ row }">
            <UButton size="sm" variant="ghost" :to="`/lab/appointments/${row.id}`">
              Voir
            </UButton>
          </template>
        </UTable>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'lab',
});

useHead({
  title: 'Statistiques – Laboratoire',
});

import { apiFetch } from '~/utils/api';

const loading = ref(true);
const appointments = ref<any[]>([]);
const stats = ref({
  totalAppointments: 0,
  monthAppointments: 0,
  completionRate: 0,
  averageDuration: 0,
  byStatus: {} as Record<string, number>,
  byType: { blood_test: 0, nursing: 0 } as Record<string, number>,
});

const fetchStats = async () => {
  loading.value = true;
  try {
    const res = await apiFetch('/lab/stats', { method: 'GET' });
    if (res.success && res.data) {
      appointments.value = res.data.appointments ?? [];
      stats.value = res.data.stats ?? stats.value;
    }
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
};

const recentAppointments = computed(() =>
  [...appointments.value]
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 10),
);

const columns = [
  { id: 'scheduled_at', accessorKey: 'scheduled_at', header: 'Date' },
  { id: 'status', accessorKey: 'status', header: 'Statut' },
  { id: 'actions', accessorKey: 'actions', header: '' },
];

const barWidth = (count: number) =>
  stats.value.totalAppointments > 0
    ? Math.max(2, (count / stats.value.totalAppointments) * 100)
    : 0;

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return labels[status] ?? status;
};

const getStatusBarColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-amber-500',
    confirmed: 'bg-blue-500',
    inProgress: 'bg-violet-500',
    completed: 'bg-emerald-500',
    canceled: 'bg-red-500',
    expired: 'bg-slate-400',
    refused: 'bg-red-600',
  };
  return colors[status] ?? 'bg-muted';
};

const getStatusBadgeColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'yellow',
    confirmed: 'blue',
    inProgress: 'purple',
    completed: 'green',
    canceled: 'red',
    expired: 'gray',
    refused: 'red',
  };
  return colors[status] ?? 'gray';
};

const formatDate = (date: string) => new Date(date).toLocaleString('fr-FR');

onMounted(() => {
  fetchStats();
});
</script>
