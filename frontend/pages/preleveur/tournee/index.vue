<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader :edge-bleed="false" title="Ma tournée" :description="tourneeDescription">
        <template #actions>
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-locate-fixed"
              :loading="locating"
              @click="refreshWithLocation"
            >
              Ma position
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-sliders-horizontal"
              @click="sortModalOpen = true"
            >
              {{ sortModeLabel }}
            </UButton>
          </div>
        </template>
      </AppPageHeader>
    </template>

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
        :disabled="loading || dayOffset <= TOURNEE_OFFSET_MIN"
        @click="onShiftDay(-1)"
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
        :disabled="loading || dayOffset >= TOURNEE_OFFSET_MAX"
        @click="onShiftDay(1)"
      />
    </div>

    <div
      v-if="tour && tour.stops.length > 0"
      class="rounded-xl border border-primary-200/60 bg-primary-50/40 px-4 py-3 text-sm text-primary-900 dark:border-primary-900/40 dark:bg-primary-950/30 dark:text-primary-100"
    >
      <span class="font-semibold">{{ tour.stops.length }} arrêt{{ tour.stops.length > 1 ? 's' : '' }}</span>
      <span v-if="tour.summary.estimated_km > 0">
        · ~{{ tour.summary.estimated_km.toFixed(1) }} km estimés
      </span>
      <span v-if="tour.summary.done_stops > 0">
        · {{ tour.summary.done_stops }} terminé{{ tour.summary.done_stops > 1 ? 's' : '' }}
      </span>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="mb-3 h-8 w-8 animate-spin text-primary-500" />
      <p class="text-sm text-gray-500 dark:text-gray-400">Chargement de la tournée…</p>
    </div>
    <UEmpty
      v-else-if="!tour || tour.stops.length === 0"
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
      <li v-for="(stop, index) in tour.stops" :key="stop.appointment_id">
        <div
          class="flex flex-wrap items-stretch gap-3 px-3 py-3.5 sm:px-4"
          :class="tourneeRowClass(stop)"
        >
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums ring-1"
            :class="tourneeStepBadgeClass(stop)"
            :aria-label="`Étape ${stop.position}`"
          >
            {{ stop.position }}
          </div>
          <NuxtLink
            :to="`/preleveur/appointments/${stop.appointment_id}`"
            class="min-w-0 flex-1 space-y-1 transition-opacity hover:opacity-90"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                {{ formatCreneau(stop) }}
              </span>
              <UBadge :color="tourneeStatusColor(stop.status)" variant="subtle" size="xs">
                {{ tourneeStatusLabel(stop.status) }}
              </UBadge>
            </div>
            <p class="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
              {{ stop.patient_name }}
            </p>
            <p v-if="stop.address_line" class="truncate text-xs text-gray-500 dark:text-gray-500">
              {{ stop.address_line }}
            </p>
            <TourStopRouteChip v-if="stop.position > 1" :stop="stop" class="mt-1" />
          </NuxtLink>
          <div v-if="showManualReorder" class="flex shrink-0 flex-col gap-1 self-center">
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-chevron-up"
              :disabled="saving || index === 0"
              aria-label="Monter"
              @click="moveStop(index, -1)"
            />
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-chevron-down"
              :disabled="saving || index >= tour.stops.length - 1"
              aria-label="Descendre"
              @click="moveStop(index, 1)"
            />
          </div>
        </div>
      </li>
    </ul>

    <TourSortFilterModal
      v-model:open="sortModalOpen"
      :sort-mode="tour?.plan.sort_mode ?? 'smart'"
      :locked="!!tour?.plan.manual_order_locked"
      @select="applySortMode"
      @reset="() => applySortMode('smart')"
    />
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'preleveur',
});

import TourSortFilterModal from '~/components/nurse/TourSortFilterModal.vue';
import TourStopRouteChip from '~/components/nurse/TourStopRouteChip.vue';
import { usePreleveurTourWeb } from '~/composables/usePreleveurTourWeb';
import type { PreleveurTourStop } from '~/composables/usePreleveurTourWeb';
import { isAppointmentSlotEndedForPreleveurTournee } from '~/utils/appointment-datetime-fr';

const TOURNEE_OFFSET_MIN = -90;
const TOURNEE_OFFSET_MAX = 90;
const sortModalOpen = ref(false);
const dayOffset = ref(0);

const {
  selectedDate,
  loading,
  saving,
  locating,
  tour,
  sortModeLabel,
  showManualReorder,
  shiftDay,
  loadTour,
  refreshWithLocation,
  moveStop,
  applySortMode,
} = usePreleveurTourWeb();

function onShiftDay(delta: number) {
  const next = dayOffset.value + delta;
  if (next < TOURNEE_OFFSET_MIN || next > TOURNEE_OFFSET_MAX) return;
  dayOffset.value = next;
  shiftDay(delta);
}

function baseDateForOffset(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset.value);
  return d;
}

const tourneeDescription = computed(() => {
  try {
    return baseDateForOffset().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Tournée optimisée';
  }
});

const selectedDayNavLabel = computed(() => {
  try {
    return baseDateForOffset().toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
});

const emptyTitle = computed(() =>
  dayOffset.value === 0 ? 'Aucun rendez-vous ce jour-là' : 'Aucune tournée prévue',
);

const emptyDescription = computed(() =>
  dayOffset.value === 0
    ? 'Vous n’avez pas de prélèvement assigné à votre nom pour cette journée.'
    : 'Aucun prélèvement ne vous est attribué pour la date affichée.',
);


onMounted(() => {
  void loadTour();
});

function stopAsRdv(stop: PreleveurTourStop) {
  return { scheduled_at: stop.scheduled_at, status: stop.status };
}

function tourneeCreneauTermine(stop: PreleveurTourStop): boolean {
  return isAppointmentSlotEndedForPreleveurTournee(stopAsRdv(stop));
}

function tourneeRowClass(stop: PreleveurTourStop) {
  if (stop.status === 'completed' || tourneeCreneauTermine(stop)) {
    return 'bg-emerald-50/95 dark:bg-emerald-950/40';
  }
  return '';
}

function tourneeStepBadgeClass(stop: PreleveurTourStop) {
  if (stop.status === 'completed' || tourneeCreneauTermine(stop)) {
    return 'bg-emerald-100 text-emerald-800 ring-emerald-300/80 dark:bg-emerald-900/50 dark:text-emerald-200 dark:ring-emerald-800/70';
  }
  return 'bg-primary-50 text-primary-700 ring-primary-200/80 dark:bg-primary-950/50 dark:text-primary-300 dark:ring-primary-800/60';
}

function formatCreneau(stop: PreleveurTourStop) {
  const iso = stop?.scheduled_at;
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
