<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader :edge-bleed="false" title="Ma tournée" :description="tourneeDescription" />
    </template>

    <!-- Navigation jour (même barre avec / sans RDV) -->
    <div
      class="flex items-center justify-between gap-2 rounded-xl border border-gray-200/80 bg-white/90 px-2 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-900/50 sm:px-3"
    >
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        class="shrink-0"
        icon="i-lucide-chevron-left"
        aria-label="Jour précédent"
        :disabled="tourneeLoading || dayOffset <= TOURNEE_OFFSET_MIN"
        @click="shiftDay(-1)"
      />
      <p class="min-w-0 flex-1 truncate text-center text-sm font-semibold capitalize text-gray-900 dark:text-white">
        {{ selectedDayNavLabel }}
      </p>
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        class="shrink-0"
        icon="i-lucide-chevron-right"
        aria-label="Jour suivant"
        :disabled="tourneeLoading || dayOffset >= TOURNEE_OFFSET_MAX"
        @click="shiftDay(1)"
      />
    </div>

    <div v-if="tourneeLoading" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="mb-3 h-8 w-8 animate-spin text-primary-500" />
      <p class="text-sm text-gray-500 dark:text-gray-400">Chargement de la tournée…</p>
    </div>
    <UEmpty
      v-else-if="tourneeSorted.length === 0"
      icon="i-lucide-calendar-off"
      :title="emptyTitle"
      :description="emptyDescription"
      variant="naked"
      class="py-10"
    />
    <ul
      v-else
      class="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900/50"
    >
      <li v-for="(rdv, index) in tourneeSorted" :key="rdv.id">
        <NuxtLink
          :to="`/preleveur/appointments/${rdv.id}`"
          class="flex flex-wrap items-stretch gap-3 px-3 py-3.5 transition-colors sm:px-4"
          :class="tourneeRowLinkClass(rdv)"
        >
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums ring-1"
            :class="tourneeStepBadgeClass(rdv)"
            :aria-label="`Étape ${index + 1}`"
          >
            {{ index + 1 }}
          </div>
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                {{ formatCreneau(rdv) }}
              </span>
              <UBadge :color="tourneeStatusColor(rdv.status)" variant="subtle" size="xs">
                {{ tourneeStatusLabel(rdv.status) }}
              </UBadge>
            </div>
            <p v-if="tourneePatientLine(rdv)" class="truncate text-xs text-gray-600 dark:text-gray-400">
              {{ tourneePatientLine(rdv) }}
            </p>
            <p v-if="tourneeAddressLine(rdv)" class="truncate text-xs text-gray-500 dark:text-gray-500">
              {{ tourneeAddressLine(rdv) }}
            </p>
          </div>
          <div class="flex shrink-0 items-center self-center">
            <UIcon name="i-lucide-chevron-right" class="h-5 w-5 text-gray-300 dark:text-gray-600" />
          </div>
        </NuxtLink>
      </li>
    </ul>
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'preleveur',
});

import { apiFetch } from '~/utils/api';
import { isAppointmentSlotEndedForPreleveurTournee } from '~/utils/appointment-datetime-fr';

const { user } = useAuth();
const tourneeLoading = ref(false);
const tourneeRaw = ref<any[]>([]);

/** Décalage par rapport à aujourd’hui (fuseau local navigateur) pour la plage API. */
const dayOffset = ref(0);
const TOURNEE_OFFSET_MIN = -90;
const TOURNEE_OFFSET_MAX = 90;

function baseDateForOffset(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset.value);
  return d;
}

const tourneeDescription = computed(() => {
  try {
    const d = baseDateForOffset();
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Tournée';
  }
});

const selectedDayNavLabel = computed(() => {
  try {
    const d = baseDateForOffset();
    return d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
});

const emptyTitle = computed(() => {
  if (dayOffset.value === 0) return 'Aucun rendez-vous ce jour-là';
  return 'Aucune tournée prévue';
});

const emptyDescription = computed(() =>
  dayOffset.value === 0
    ? 'Vous n’avez pas de prélèvement assigné à votre nom pour cette journée.'
    : 'Aucun prélèvement ne vous est attribué pour la date affichée. Utilisez les flèches pour consulter les jours suivants ou précédents.',
);

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function dateRangeParamsForSelectedDay() {
  const start = baseDateForOffset();
  const end = new Date(start);
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
    const { date_from, date_to } = dateRangeParamsForSelectedDay();
    const params = new URLSearchParams({
      page: '1',
      limit: '500',
      type: 'blood_test',
      date_from,
      date_to,
    });
    const response = await apiFetch<{ success: boolean; data?: any[]; error?: string }>(`/appointments?${params.toString()}`, {
      method: 'GET',
    });
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

function shiftDay(delta: number) {
  const next = dayOffset.value + delta;
  if (next < TOURNEE_OFFSET_MIN || next > TOURNEE_OFFSET_MAX) return;
  dayOffset.value = next;
  void loadTournee();
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

function tourneeCreneauTermine(rdv: any): boolean {
  return isAppointmentSlotEndedForPreleveurTournee(rdv);
}

function tourneeRowLinkClass(rdv: any) {
  if (tourneeCreneauTermine(rdv)) {
    return 'bg-emerald-50/95 hover:bg-emerald-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/55';
  }
  return 'hover:bg-gray-50 dark:hover:bg-gray-800/50';
}

function tourneeStepBadgeClass(rdv: any) {
  if (tourneeCreneauTermine(rdv)) {
    return 'bg-emerald-100 text-emerald-800 ring-emerald-300/80 dark:bg-emerald-900/50 dark:text-emerald-200 dark:ring-emerald-800/70';
  }
  return 'bg-primary-50 text-primary-700 ring-primary-200/80 dark:bg-primary-950/50 dark:text-primary-300 dark:ring-primary-800/60';
}

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
