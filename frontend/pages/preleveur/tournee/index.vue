<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Ma tournée"
      :description="tourneeDescription"
    />

    <div class="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900/50 p-4 shadow-sm">
      <p class="text-sm font-medium text-gray-900 dark:text-white">
        Ordre du jour
      </p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Uniquement les prises de sang d’aujourd’hui où vous êtes désigné comme préleveur, triées par date et créneau horaire pour enchaîner les visites.
      </p>
    </div>

    <div v-if="tourneeLoading" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500 mb-3" />
      <p class="text-sm text-gray-500">Chargement de la tournée…</p>
    </div>
    <UEmpty
      v-else-if="tourneeSorted.length === 0"
      icon="i-lucide-calendar-off"
      title="Aucun rendez-vous aujourd’hui"
      description="Vous n’avez pas de prise de sang assignée à votre nom pour cette journée."
      variant="naked"
      class="py-10"
    />
    <ul v-else class="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden">
      <li v-for="(rdv, index) in tourneeSorted" :key="rdv.id">
        <NuxtLink
          :to="`/preleveur/appointments/${rdv.id}`"
          class="flex flex-wrap items-stretch gap-3 px-3 py-3.5 sm:px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 text-sm font-bold tabular-nums ring-1 ring-primary-200/80 dark:ring-primary-800/60"
            :aria-label="`Étape ${index + 1}`"
          >
            {{ index + 1 }}
          </div>
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                {{ formatCreneau(rdv) }}
              </span>
              <UBadge :color="tourneeStatusColor(rdv.status)" variant="subtle" size="xs">
                {{ tourneeStatusLabel(rdv.status) }}
              </UBadge>
            </div>
            <p v-if="tourneePatientLine(rdv)" class="text-xs text-gray-600 dark:text-gray-400 truncate">
              {{ tourneePatientLine(rdv) }}
            </p>
            <p v-if="tourneeAddressLine(rdv)" class="text-xs text-gray-500 dark:text-gray-500 truncate">
              {{ tourneeAddressLine(rdv) }}
            </p>
          </div>
          <div class="flex shrink-0 items-center self-center">
            <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-gray-300 dark:text-gray-600" />
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'preleveur',
});

import { apiFetch } from '~/utils/api';

const { user } = useAuth();
const tourneeLoading = ref(false);
const tourneeRaw = ref<any[]>([]);

const tourneeDescription = computed(() => {
  try {
    const d = new Date();
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Aujourd’hui';
  }
});

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function todayDateRangeParams() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return {
    date_from: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-${pad2(start.getDate())} ${pad2(start.getHours())}:${pad2(start.getMinutes())}:${pad2(start.getSeconds())}`,
    date_to: `${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())} ${pad2(end.getHours())}:${pad2(end.getMinutes())}:${pad2(end.getSeconds())}`,
  };
}

async function loadTournee() {
  if (!user.value?.id) return;
  tourneeLoading.value = true;
  try {
    const { date_from, date_to } = todayDateRangeParams();
    const params = new URLSearchParams({
      page: '1',
      limit: '500',
      type: 'blood_test',
      date_from,
      date_to,
    });
    const response = await apiFetch<{ success: boolean; data?: any[]; error?: string }>(`/appointments?${params.toString()}`, { method: 'GET' });
    if (response.success && response.data) {
      const mine = String(user.value.id);
      tourneeRaw.value = response.data.filter((a: any) => a && String(a.assigned_to ?? '') === mine);
    } else {
      tourneeRaw.value = [];
    }
  } catch {
    tourneeRaw.value = [];
  } finally {
    tourneeLoading.value = false;
  }
}

const tourneeSorted = computed(() => {
  const list = [...tourneeRaw.value];
  list.sort((a, b) => {
    const ta = new Date(a.scheduled_at || 0).getTime();
    const tb = new Date(b.scheduled_at || 0).getTime();
    if (ta !== tb) return ta - tb;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
  return list;
});

onMounted(() => {
  void loadTournee();
});

function formatCreneau(rdv: any) {
  const iso = rdv?.scheduled_at;
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const timePart = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${datePart} · ${timePart}`;
  } catch {
    return '—';
  }
}

function tourneePatientLine(rdv: any) {
  const fn = rdv?.form_data?.first_name || rdv?.relative?.first_name;
  const ln = rdv?.form_data?.last_name || rdv?.relative?.last_name;
  const parts = [fn, ln].filter(Boolean);
  return parts.length ? parts.join(' ') : '';
}

function tourneeAddressLine(rdv: any) {
  const a = rdv?.address;
  if (!a) return '';
  if (typeof a === 'object' && a?.label) return String(a.label);
  return String(a);
}

function tourneeStatusLabel(status: string | undefined) {
  const m: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    planned: 'Planifié',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    cancelled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return status ? (m[status] ?? status) : '—';
}

function tourneeStatusColor(status: string | undefined): 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'canceled':
    case 'cancelled':
    case 'refused':
    case 'expired':
      return 'neutral';
    case 'inProgress':
      return 'primary';
    case 'confirmed':
    case 'planned':
      return 'info';
    default:
      return 'warning';
  }
}

useHead({
  title: 'Ma tournée – Préleveur',
});
</script>
