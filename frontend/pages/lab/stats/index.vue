<template>
  <div class="space-y-8">
    <TitleDashboard
      :title="isLabView ? 'Statistiques — Vue équipe' : 'Statistiques'"
      :description="isLabView
        ? `Prises de sang — lab + ${teamSummary?.subaccounts ?? 0} sous-compte(s) + ${teamSummary?.preleveurs ?? 0} préleveur(s). Tous les RDV et stats de l'équipe.`
        : 'Prises de sang — laboratoire et sous-comptes.'"
      icon="i-lucide-bar-chart-3"
    >
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
              <p class="text-2xl sm:text-3xl font-normal text-default tabular-nums mt-1">
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
              <p class="text-2xl sm:text-3xl font-normal text-default tabular-nums mt-1">
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
              <p class="text-2xl sm:text-3xl font-normal text-default tabular-nums mt-1">
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
              <p class="text-2xl sm:text-3xl font-normal text-default tabular-nums mt-1">
                {{ stats.averageDuration }} min
              </p>
            </div>
            <div class="rounded-lg bg-violet-500/10 p-2">
              <UIcon name="i-lucide-clock" class="w-6 h-6 text-violet-500" />
            </div>
          </div>
        </div>
      </div>

      <!-- Répartition par sous-compte / préleveur (vue lab uniquement) -->
      <div v-if="isLabView && byAssignedLab?.length" class="rounded-xl border border-default/50 bg-default p-6 shadow-sm">
        <h2 class="text-lg font-normal text-default mb-1">Répartition par assigné</h2>
        <p class="text-sm text-muted mb-4">Détail des RDV et stats par labo, sous-compte ou préleveur.</p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default/50">
                <th class="text-left py-3 px-2 font-medium text-muted">Assigné</th>
                <th class="text-right py-3 px-2 font-medium text-muted">Type</th>
                <th class="text-right py-3 px-2 font-medium text-muted">Total</th>
                <th class="text-right py-3 px-2 font-medium text-muted">Ce mois</th>
                <th class="text-right py-3 px-2 font-medium text-muted">Aujourd'hui</th>
                <th class="text-right py-3 px-2 font-medium text-muted">Terminés</th>
                <th class="text-right py-3 px-2 font-medium text-muted">Taux</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in byAssignedLab"
                :key="row.id"
                class="border-b border-default/30 hover:bg-muted/20"
              >
                <td class="py-3 px-2 font-medium text-default">{{ row.displayName }}</td>
                <td class="text-right py-3 px-2">
                  <UBadge
                    :label="row.role === 'subaccount' ? 'Sous-compte' : row.role === 'preleveur' ? 'Préleveur' : 'Labo'"
                    size="xs"
                    variant="subtle"
                    :color="row.role === 'subaccount' ? 'primary' : row.role === 'preleveur' ? 'info' : 'neutral'"
                  />
                </td>
                <td class="text-right py-3 px-2 tabular-nums">{{ row.total }}</td>
                <td class="text-right py-3 px-2 tabular-nums">{{ row.month }}</td>
                <td class="text-right py-3 px-2 tabular-nums">{{ row.today }}</td>
                <td class="text-right py-3 px-2 tabular-nums">{{ row.completed }}</td>
                <td class="text-right py-3 px-2 tabular-nums">{{ row.completionRate }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Graphiques -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- RDV par statut -->
        <div class="rounded-xl border border-default/50 bg-default p-6 shadow-sm">
          <h2 class="text-lg font-normal text-default mb-4">Répartition par statut</h2>
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
              <span class="text-sm font-normal tabular-nums shrink-0 w-8 text-right">{{ count }}</span>
            </div>
          </div>
        </div>

        <!-- Prises de sang uniquement -->
        <div class="rounded-xl border border-default/50 bg-default p-6 shadow-sm">
          <h2 class="text-lg font-normal text-default mb-4">Prises de sang</h2>
          <UEmpty
            v-if="stats.totalAppointments === 0"
            icon="i-lucide-droplet"
            title="Aucune donnée"
            description="Aucun rendez-vous enregistré."
            variant="naked"
          />
          <div v-else class="flex items-center justify-center py-8">
            <div class="text-center">
              <p class="text-4xl font-normal text-primary tabular-nums">
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

      <!-- RDV récents (même design que la liste pro) -->
      <div class="space-y-6">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-normal text-default">Rendez-vous récents</h2>
          <span v-if="isLabView" class="text-sm text-muted">
            — Vue équipe (lab + sous-comptes + préleveurs)
          </span>
        </div>
        <UEmpty
          v-if="recentAppointments.length === 0"
          icon="i-lucide-calendar-x"
          title="Aucun rendez-vous"
          description="Les rendez-vous récents apparaîtront ici."
          variant="naked"
        />
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          <div
            v-for="appointment in recentAppointments"
            :key="appointment.id"
            class="bg-white dark:bg-gray-900 rounded-[24px] shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-800 transition-all duration-200 flex flex-col h-full overflow-hidden relative"
          >
            <div class="p-5 flex-1 flex flex-col">
              <!-- Badge assigné (vue lab) -->
              <div v-if="isLabView && (appointment.assigned_lab_display_name || appointment.assigned_to_display_name)" class="mb-3">
                <UBadge
                  variant="soft"
                  size="xs"
                  color="neutral"
                  class="rounded-full font-medium"
                >
                  <UIcon name="i-lucide-user-check" class="w-3.5 h-3.5 mr-1" />
                  <template v-if="appointment.assigned_lab_display_name">
                    {{ appointment.assigned_lab_role === 'subaccount' ? 'Sous-compte' : 'Labo' }} {{ appointment.assigned_lab_display_name }}
                  </template>
                  <template v-if="appointment.assigned_lab_display_name && appointment.assigned_to_display_name"> · </template>
                  <template v-if="appointment.assigned_to_display_name">Préleveur {{ appointment.assigned_to_display_name }}</template>
                </UBadge>
              </div>
              <div class="flex items-start justify-between mb-5 gap-3">
                <div class="flex items-center gap-3.5 min-w-0">
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-red-50 dark:bg-red-500/10 text-red-500"
                  >
                    <UIcon name="i-lucide-droplet" class="w-6 h-6" />
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-[17px] font-bold text-gray-900 dark:text-white truncate">
                      {{ appointment.form_data?.first_name }} {{ appointment.form_data?.last_name }}
                    </h3>
                    <p v-if="appointment.form_data?.phone" class="text-[14px] text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
                      <UIcon name="i-lucide-phone" class="w-3.5 h-3.5" />
                      {{ appointment.form_data?.phone }}
                    </p>
                  </div>
                </div>
                <UBadge
                  :color="getStatusColor(appointment.status)"
                  variant="subtle"
                  size="xs"
                  class="rounded-full px-2.5 py-1 font-medium whitespace-nowrap"
                  :label="getStatusLabel(appointment.status)"
                />
              </div>

              <div class="bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl p-4 space-y-3.5 flex-1">
                <div class="flex items-start gap-3">
                  <UIcon name="i-lucide-droplet" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Intervention</p>
                    <p class="text-[14px] font-medium text-gray-900 dark:text-white">
                      Prise de sang
                      <span v-if="appointment.category_name" class="text-gray-500 font-normal"> • {{ appointment.category_name }}</span>
                    </p>
                  </div>
                </div>

                <div v-if="getBloodTestTypeLabel(appointment.form_data)" class="flex items-start gap-3">
                  <UIcon name="i-lucide-pipette" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Prélèvement</p>
                    <p class="text-[14px] font-medium text-gray-900 dark:text-white">{{ getBloodTestTypeLabel(appointment.form_data) }}</p>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <UIcon name="i-lucide-calendar-clock" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Date & Heure</p>
                    <p class="text-[14px] font-medium text-gray-900 dark:text-white capitalize">
                      {{ formatDateTime(appointment.scheduled_at) }}
                    </p>
                    <p class="text-[13px] text-gray-500 mt-0.5">{{ getCreneauHoraireLabel(appointment) }}</p>
                  </div>
                </div>

                <div v-if="appointment.form_data?.duration_days || appointment.form_data?.frequency" class="flex items-start gap-3">
                  <UIcon name="i-lucide-repeat" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Récurrence</p>
                    <p v-if="appointment.form_data?.duration_days" class="text-[14px] font-medium text-gray-900 dark:text-white">
                      {{ getDurationLabel(appointment.form_data.duration_days) }}
                    </p>
                    <p v-if="appointment.form_data?.frequency" class="text-[13px] text-gray-500 mt-0.5">
                      {{ getFrequencyLabel(appointment.form_data.frequency) }}
                    </p>
                  </div>
                </div>

                <div v-if="appointment.assigned_lab_display_name || appointment.assigned_to_display_name" class="flex items-start gap-3">
                  <UIcon name="i-lucide-user-check" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Assigné à</p>
                    <p class="text-[14px] font-medium text-gray-900 dark:text-white">
                      <template v-if="appointment.assigned_lab_display_name">
                        {{ appointment.assigned_lab_role === 'subaccount' ? 'Sous-compte' : 'Labo' }} {{ appointment.assigned_lab_display_name }}
                      </template>
                      <template v-if="appointment.assigned_lab_display_name && appointment.assigned_to_display_name"> · </template>
                      <template v-if="appointment.assigned_to_display_name">Préleveur {{ appointment.assigned_to_display_name }}</template>
                    </p>
                  </div>
                </div>

                <div v-if="appointment.address" class="flex items-start gap-3">
                  <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Adresse</p>
                    <p class="text-[14px] font-medium text-gray-900 dark:text-white leading-snug">
                      {{ typeof appointment.address === 'object' && appointment.address?.label ? appointment.address.label : appointment.address }}
                    </p>
                  </div>
                </div>

                <div v-if="appointment.status === 'inProgress' && appointment.started_at" class="flex items-start gap-3 mt-2">
                  <UIcon name="i-lucide-play-circle" class="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-[13px] font-medium text-primary-600 dark:text-primary-400">
                      Démarré à {{ formatTimeOnly(appointment.started_at) }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-if="appointment.notes" class="mt-4 p-3.5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                <div class="flex items-start gap-2.5">
                  <UIcon name="i-lucide-alert-circle" class="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-amber-600/80 dark:text-amber-400/80 uppercase tracking-wider mb-1">Notes</p>
                    <p class="text-[13px] text-amber-800 dark:text-amber-300 leading-relaxed line-clamp-3">
                      {{ appointment.notes }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="px-5 pb-5 pt-0 mt-auto">
              <UButton
                variant="solid"
                color="gray"
                size="md"
                class="w-full justify-center rounded-full font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                icon="i-lucide-chevron-right"
                trailing
                :to="`/lab/appointments/${appointment.id}`"
              >
                Voir les détails
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['lab', 'subaccount'],
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
const isLabView = ref(false);
const teamSummary = ref<{ total: number; lab: number; subaccounts: number; preleveurs: number } | null>(null);
const byAssignedLab = ref<Array<{
  id: string;
  displayName: string;
  role: string;
  total: number;
  month: number;
  today: number;
  completed: number;
  completionRate: number;
  byStatus: Record<string, number>;
}>>([]);

const fetchStats = async () => {
  loading.value = true;
  try {
    const res = await apiFetch('/lab/stats', { method: 'GET' });
    if (res.success && res.data) {
      appointments.value = res.data.appointments ?? [];
      stats.value = res.data.stats ?? stats.value;
      isLabView.value = !!res.data.isLabView;
      teamSummary.value = res.data.teamSummary ?? null;
      byAssignedLab.value = res.data.byAssignedLab ?? [];
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

function getStatusColor(status: string): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' {
  const colors: Record<string, 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'info',
    inProgress: 'primary',
    completed: 'success',
    canceled: 'error',
    cancelled: 'error',
    refused: 'error',
    expired: 'neutral',
  };
  return colors[status] ?? 'neutral';
}

function formatDateTime(date: string) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

function formatTimeOnly(date: string) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatAvailability(availability: string | object | null | undefined): string {
  if (availability == null) return '';
  try {
    let avail: any = availability;
    if (typeof availability === 'string') {
      const trimmed = availability.trim();
      if (!trimmed) return '';
      avail = JSON.parse(trimmed);
    }
    if (!avail || typeof avail !== 'object') return '';
    if (avail.type === 'all_day') return 'Toute la journée';
    if (avail.type === 'custom' && Array.isArray(avail.range) && avail.range.length >= 2) {
      const start = Math.floor(Number(avail.range[0]));
      const end = Math.floor(Number(avail.range[1]));
      if (!Number.isNaN(start) && !Number.isNaN(end)) return `${start}h00 - ${end}h00`;
    }
  } catch {
    // ignore
  }
  return '';
}

function getCreneauHoraireLabel(appointment: any): string {
  const formatted = formatAvailability(appointment.form_data?.availability);
  if (formatted) return formatted;
  if (appointment.scheduled_at) {
    try {
      const d = new Date(appointment.scheduled_at);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      // ignore
    }
  }
  return 'Non précisé';
}

function getDurationLabel(v: string) {
  const labels: Record<string, string> = {
    '1': '1 jour',
    '7': '7 jours',
    '10': '10 jours',
    '15': '15 jours (ou jusqu\'à la cicatrisation)',
    '30': '30 jours',
    '60+': 'Longue durée (60 jours ou +)',
  };
  return labels[v] || v;
}

function getBloodTestTypeLabel(fd: any): string {
  if (!fd?.blood_test_type) return '';
  if (fd.blood_test_type === 'single') return 'Une seule prise de sang';
  if (fd.blood_test_type === 'multiple') {
    const days = fd.duration_days === 'custom' && fd.custom_days ? `${fd.custom_days} jours` : getDurationLabel(fd.duration_days || '');
    return days ? `Série sur ${days}` : 'Plusieurs prélèvements';
  }
  return '';
}

function getFrequencyLabel(v: string) {
  const labels: Record<string, string> = {
    daily: 'Chaque jour',
    every_other_day: '1 jour sur 2',
    twice_weekly: '2 fois par semaine',
    thrice_weekly: '3 fois par semaine',
  };
  return labels[v] || v;
}

onMounted(() => {
  fetchStats();
});
</script>
