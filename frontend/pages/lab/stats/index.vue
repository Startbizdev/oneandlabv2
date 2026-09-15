<template>
  <AppPageShell class="space-y-8">
    <template #pageHeader>
    <AppPageHeader :edge-bleed="false" 
      title="Statistiques"
      description="Suivez les prélèvements et l’activité de votre équipe."
    >
      <template #actions>
        <UButton
          color="primary"
          variant="solid"
          icon="i-lucide-list"
          to="/lab/appointments"
        >
          Voir les rendez-vous
        </UButton>
      </template>
    </AppPageHeader>
  </template>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      <div v-for="i in 4" :key="i" class="rounded-xl border border-default/50 p-5 h-28 bg-muted/20" />
    </div>

    <UAlert v-else-if="loadError" title="Statistiques indisponibles" :description="loadError" color="error" :actions="[{ label: 'Réessayer', onClick: fetchStats }]" />
    <template v-else>
      <!-- Cartes KPIs -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          class="rounded-xl border border-default/50 bg-default p-4 sm:p-5 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted">Rendez-vous au total</p>
              <p class="text-2xl sm:text-3xl font-normal text-default tabular-nums mt-1">
                {{ stats.totalAppointments }}
              </p>
            </div>
            <div class="hidden rounded-lg bg-primary/10 p-2 sm:block">
              <UIcon name="i-lucide-calendar" class="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
        <div
          class="rounded-xl border border-default/50 bg-default p-4 sm:p-5 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted">Ce mois</p>
              <p class="text-2xl sm:text-3xl font-normal text-default tabular-nums mt-1">
                {{ stats.monthAppointments }}
              </p>
            </div>
            <div class="hidden rounded-lg bg-primary/10 p-2 sm:block">
              <UIcon name="i-lucide-calendar-days" class="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
        <div
          class="rounded-xl border border-default/50 bg-default p-4 sm:p-5 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted">Rendez-vous terminés</p>
              <p class="text-2xl sm:text-3xl font-normal text-default tabular-nums mt-1">
                {{ stats.completionRate }}%
              </p>
            </div>
            <div class="hidden rounded-lg bg-primary/10 p-2 sm:block">
              <UIcon name="i-lucide-check-circle" class="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
        <div
          class="rounded-xl border border-default/50 bg-default p-4 sm:p-5 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted">Durée moyenne</p>
              <p class="text-2xl sm:text-3xl font-normal text-default tabular-nums mt-1">
                {{ stats.averageDuration > 0 ? `${stats.averageDuration} min` : '—' }}
              </p>
            </div>
            <div class="hidden rounded-lg bg-primary/10 p-2 sm:block">
              <UIcon name="i-lucide-clock" class="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      <!-- Répartition par sous-compte / préleveur (vue lab uniquement) -->
      <div v-if="isLabView && byAssignedLab?.length" class="rounded-xl border border-default/50 bg-default p-6 shadow-sm">
        <h2 class="text-lg font-normal text-default mb-1">Activité par équipe</h2>
        <p class="text-sm text-muted mb-4">Rendez-vous attribués au laboratoire et à ses équipes.</p>
        <div class="space-y-3 sm:hidden">
          <article v-for="row in byAssignedLab" :key="row.id" class="rounded-lg border border-default/50 p-3">
            <h3 class="break-words font-medium">{{ row.displayName }}</h3>
            <p class="mt-1 text-xs text-muted">{{ row.role === 'subaccount' ? 'Sous-compte' : row.role === 'preleveur' ? 'Préleveur' : 'Laboratoire' }}</p>
            <dl class="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt class="text-xs text-muted">Total</dt><dd class="tabular-nums">{{ row.total }}</dd></div>
              <div><dt class="text-xs text-muted">Ce mois</dt><dd class="tabular-nums">{{ row.month }}</dd></div>
              <div><dt class="text-xs text-muted">Aujourd’hui</dt><dd class="tabular-nums">{{ row.today }}</dd></div>
              <div><dt class="text-xs text-muted">Terminés</dt><dd class="tabular-nums">{{ row.completed }}</dd></div>
              <div><dt class="text-xs text-muted">Taux de réalisation</dt><dd class="tabular-nums">{{ row.completionRate }} %</dd></div>
            </dl>
          </article>
        </div>
        <div class="hidden overflow-x-auto sm:block">
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
      <div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
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
          <div v-else class="flex items-center gap-4">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <UIcon name="i-lucide-droplet" class="h-6 w-6 text-primary" />
            </div>
            <div class="min-w-0">
              <p class="text-3xl font-medium tabular-nums">{{ stats.byType?.blood_test ?? 0 }}</p>
              <p class="mt-1 text-sm text-muted">sur {{ stats.totalAppointments }} rendez-vous</p>
            </div>
          </div>
        </div>
      </div>

      <!-- RDV récents (même design que la liste pro) -->
      <div class="space-y-6">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-normal text-default">Rendez-vous récents</h2>
          <span v-if="isLabView" class="text-sm text-muted">
            Laboratoire et équipes
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
          <DashboardAppointmentCard
            v-for="appointment in recentAppointments"
            :key="appointment.id"
            :appointment="appointment"
            base-path="/lab"
            :format-date-label="apt => formatDateTime(apt.scheduled_at)"
          >
            <template #details>
              <dl class="space-y-2 border-t border-default/50 py-3 text-xs">
                <div v-if="appointment.form_data?.duration_days || appointment.form_data?.frequency">
                  <dt class="text-muted">Récurrence</dt>
                  <dd class="mt-0.5">
                    <span v-if="appointment.form_data?.duration_days">{{ appointment.type === 'nursing' ? getNursingDurationLabel(appointment.form_data.duration_days, appointment.form_data.custom_days) : formatBloodTestSeriesDurationDays(appointment.form_data.duration_days, appointment.form_data.custom_days) }}</span>
                    <span v-if="appointment.form_data?.frequency"> · {{ getFrequencyLabel(appointment.form_data.frequency) }}</span>
                  </dd>
                </div>
                <div v-if="appointment.assigned_lab_display_name || appointment.assigned_to_display_name">
                  <dt class="text-muted">Équipe</dt>
                  <dd class="mt-0.5 break-words">
                    <span v-if="appointment.assigned_lab_display_name">{{ appointment.assigned_lab_role === 'subaccount' ? 'Sous-compte' : 'Laboratoire' }} {{ appointment.assigned_lab_display_name }}</span>
                    <span v-if="appointment.assigned_lab_display_name && appointment.assigned_to_display_name"> · </span>
                    <span v-if="appointment.assigned_to_display_name">Préleveur {{ appointment.assigned_to_display_name }}</span>
                  </dd>
                </div>
                <div v-if="appointment.address">
                  <dt class="text-muted">Adresse</dt>
                  <dd class="mt-0.5 break-words">{{ typeof appointment.address === 'object' ? appointment.address.label : appointment.address }}</dd>
                </div>
                <div v-if="appointment.status === 'inProgress' && appointment.started_at">
                  <dt class="text-muted">Début du prélèvement</dt>
                  <dd class="mt-0.5">{{ formatTimeOnly(appointment.started_at) }}</dd>
                </div>
                <div v-if="getAppointmentNotes(appointment)">
                  <dt class="text-muted">Message</dt>
                  <dd class="mt-0.5 whitespace-pre-line break-words">{{ getAppointmentNotes(appointment) }}</dd>
                </div>
              </dl>
            </template>
          </DashboardAppointmentCard>
        </div>
      </div>
    </template>
  </AppPageShell>
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
import { parseAppointmentDateFrance } from '@oneandlab/shared-utils';
import { getAppointmentNotes } from '~/utils/appointment-notes';
import { getNursingDurationLabel } from '~/constants/nursing-duration';
import { formatBloodTestSeriesDurationDays } from '~/utils/duration-display';

const loading = ref(true);
const loadError = ref('');
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
  loadError.value = '';
  try {
    const res = await apiFetch('/lab/stats', { method: 'GET' });
    if (res.success && res.data?.stats && Array.isArray(res.data.appointments)) {
      appointments.value = res.data.appointments ?? [];
      stats.value = res.data.stats ?? stats.value;
      isLabView.value = !!res.data.isLabView;
      teamSummary.value = res.data.teamSummary ?? null;
      byAssignedLab.value = res.data.byAssignedLab ?? [];
    } else throw new Error('Statistiques indisponibles');
  } catch {
    loadError.value = 'Impossible de charger les statistiques de votre équipe. Réessayez.';
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
    planned: 'Planifié',
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
    planned: 'bg-sky-500',
    inProgress: 'bg-violet-500',
    completed: 'bg-emerald-500',
    canceled: 'bg-red-500',
    expired: 'bg-slate-400',
    refused: 'bg-red-600',
  };
  return colors[status] ?? 'bg-muted';
};

function formatDateTime(date: string) {
  if (!date) return '-';
  try {
    const d = parseAppointmentDateFrance(date);
    if (Number.isNaN(d.getTime())) return 'Date non renseignée';
    return d.toLocaleDateString('fr-FR', {
      timeZone: 'Europe/Paris',
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
  const value = parseAppointmentDateFrance(date);
  return Number.isNaN(value.getTime()) ? '—' : value.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
}

function getFrequencyLabel(v: string) {
  const labels: Record<string, string> = {
    once_daily: '1 fois par jour',
    twice_daily: '2 fois par jour',
    thrice_daily: '3 fois par jour',
    twice_weekly: '2 fois par semaine',
    thrice_weekly: '3 fois par semaine',
    to_define: 'A voir avec le professionnel',
    daily: '1 fois par jour',
    every_other_day: '1 jour sur 2',
  };
  return labels[v] || v;
}

onMounted(() => {
  fetchStats();
});
</script>
