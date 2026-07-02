<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Ma tournée"
        :description="headerDescription"
      >
        <template #actions>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-calendar-download"
            :disabled="loading || saving"
            @click="downloadIcs"
          >
            Export ICS
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-calendar-days"
            to="/nurse/calendar"
          >
            Calendrier complet
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <div class="flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="day in dayStrip"
        :key="day.date"
        type="button"
        class="relative shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
        :class="
          day.date === selectedDate
            ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
        "
        @click="selectedDate = day.date"
      >
        <span class="capitalize">{{ day.label }}</span>
        <span
          v-if="day.count > 0"
          class="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-gray-900"
        >
          {{ day.count > 99 ? '99+' : day.count }}
        </span>
      </button>
    </div>

    <div
      v-if="showTourSummary"
      class="overflow-hidden rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 p-3 text-white shadow-md"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-white/30 text-base font-bold"
        >
          {{ progressPct }}%
        </div>
        <div class="min-w-0">
          <p class="text-[10px] font-bold uppercase tracking-wide text-white/80">Ma tournée du jour</p>
          <template v-if="allAbsentOnly">
            <p class="text-lg font-bold tracking-tight">Pas de tournée du jour</p>
            <p class="text-xs text-white/90">
              Vous avez {{ tour!.summary.absent_stops }} patient{{ (tour!.summary.absent_stops ?? 0) > 1 ? 's' : '' }}
              absent{{ (tour!.summary.absent_stops ?? 0) > 1 ? 's' : '' }}
            </p>
          </template>
          <template v-else>
            <p class="text-lg font-bold tracking-tight">
              {{ tour!.summary.done_stops }} sur {{ tour!.summary.total_stops }} passage{{ tour!.summary.total_stops > 1 ? 's' : '' }}
            </p>
            <p class="text-xs text-white/90">
              {{ remainingLabel === 'Tournée terminée' ? 'Bravo, tournée terminée !' : remainingLabel }}
            </p>
          </template>
        </div>
      </div>
      <div
        class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/20 pt-2 text-xs font-semibold text-white/90"
      >
        <template v-if="allAbsentOnly">
          <span>{{ tour!.summary.absent_stops }} absent{{ (tour!.summary.absent_stops ?? 0) > 1 ? 's' : '' }}</span>
        </template>
        <template v-else>
          <span class="inline-flex items-center gap-1">
            <UIcon name="i-lucide-route" class="h-3 w-3" />
            {{ tour!.summary.total_stops }} étape{{ tour!.summary.total_stops > 1 ? 's' : '' }}
          </span>
          <span class="h-1 w-1 rounded-full bg-white/50" />
          <span class="inline-flex items-center gap-1">
            <UIcon name="i-lucide-map-pin" class="h-3 w-3" />
            {{ tour!.summary.estimated_km }} km estimés
          </span>
          <template v-if="(tour!.summary.absent_stops ?? 0) > 0">
            <span class="h-1 w-1 rounded-full bg-white/50" />
            <span>{{ tour!.summary.absent_stops }} absent{{ (tour!.summary.absent_stops ?? 0) > 1 ? 's' : '' }}</span>
          </template>
        </template>
      </div>
    </div>

    <div v-if="tour && tour.stops.length" class="flex w-full items-center gap-1.5">
      <span class="text-xs font-semibold uppercase tracking-wide text-gray-400">Passage</span>
      <span
        v-if="(tour.summary.absent_stops ?? 0) > 0"
        class="text-xs font-medium text-gray-500 dark:text-gray-400"
      >
        {{ tour.summary.absent_stops }} absent{{ (tour.summary.absent_stops ?? 0) > 1 ? 's' : '' }}
      </span>
      <button
        type="button"
        class="relative flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        aria-label="Filtrer l'ordre des passages"
        @click="sortModalOpen = true"
      >
        <UIcon name="i-lucide-sliders-horizontal" class="h-4 w-4" />
        <span
          v-if="sortFilterActive"
          class="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white dark:ring-gray-900"
        />
      </button>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="mb-3 h-8 w-8 animate-spin text-primary-500" />
      <p class="text-sm text-gray-500">Organisation de votre tournée…</p>
    </div>

    <template v-else-if="tour && tour.stops.length">
      <ul class="space-y-2">
        <li v-for="(stop, index) in tour.stops" :key="stop.stop_id">
          <PassageSimpleListRow
            :stop="stop"
            :index="index"
            :total="tour.stops.length"
            :is-next="stop.stop_id === tour.next_stop_id"
            :categories="careCategories"
            :saving="saving"
            :show-reorder="showManualReorder"
            @toggle-done="toggleStopDone(stop)"
            @open-detail="openPassageDetail(stop)"
            @manage-absence="openAbsenceModal(stop)"
            @move-up="moveStop(index, -1)"
            @move-down="moveStop(index, 1)"
          />
        </li>
      </ul>
    </template>

    <UEmpty
      v-else
      icon="i-lucide-calendar-off"
      title="Aucun soin ce jour"
      description="Consultez un autre jour dans le bandeau ou le calendrier."
      variant="naked"
      class="py-10"
    />

    <PatientAbsenceModal
      :open="Boolean(absenceTarget)"
      :patient-id="absenceTarget?.patient_id ?? null"
      :patient-name="absenceTarget?.patient_name"
      :default-start-date="selectedDate"
      :existing="absenceTarget?.patient_absence ?? null"
      :saving="absenceSaving"
      :error="absenceError"
      @close="absenceTarget = null"
      @save="onAbsenceSave"
      @delete="onAbsenceDelete"
    />

    <NurseTourRescheduleModal
      :open="Boolean(rescheduleTarget)"
      :stop="rescheduleTarget"
      :saving="saving"
      @close="rescheduleTarget = null"
      @confirm="onRescheduleConfirm"
    />

    <PassagePlanningModal
      :open="passageModalOpen"
      :selected-date="selectedDate"
      @close="passageModalOpen = false"
      @select="onPassagePlanningSelect"
    />

    <TourSortFilterModal
      v-if="tour"
      v-model:open="sortModalOpen"
      :sort-mode="tour.plan.sort_mode"
      :locked="tour.plan.manual_order_locked"
      @select="applySortMode"
      @reset="resetOrder"
    />

    <UButton
      icon="i-lucide-plus"
      label="Ajouter un passage"
      size="lg"
      color="primary"
      class="fixed bottom-8 right-8 z-30 min-h-[52px] rounded-full px-5 shadow-lg"
      aria-label="Ajouter un passage"
      @click="passageModalOpen = true"
    />
  </AppPageShell>
</template>

<script setup lang="ts">
import type { NurseTourStop } from '~/composables/useNurseTourWeb';
import type { CareCategoryRowMinimal } from '~/utils/care-icons';
import type { PatientAbsenceInput } from '@oneandlab/shared-types';
import { countTourActiveRemainingStops } from '@oneandlab/shared-utils';
import { apiFetch } from '~/utils/api';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

useHead({ title: 'Ma tournée – Infirmier' });

const {
  selectedDate,
  loading,
  saving,
  tour,
  dayStrip,
  moveStop,
  applySortMode,
  resetOrder,
  toggleStopDone,
  rescheduleStop,
  downloadIcs,
  refresh,
} = useNurseTourWeb();

const { saving: absenceSaving, error: absenceError, saveAbsence, removeAbsence } =
  usePatientAbsenceWeb();

const rescheduleTarget = ref<NurseTourStop | null>(null);
const absenceTarget = ref<NurseTourStop | null>(null);
const passageModalOpen = ref(false);
const sortModalOpen = ref(false);
const careCategories = ref<CareCategoryRowMinimal[]>([]);

const sortFilterActive = computed(
  () =>
    Boolean(tour.value) &&
    (tour.value!.plan.sort_mode !== 'smart' || tour.value!.plan.manual_order_locked),
);

const showManualReorder = computed(
  () => tour.value?.plan.sort_mode === 'manual' || tour.value?.plan.manual_order_locked,
);

onMounted(async () => {
  try {
    const response = await apiFetch('/categories', { method: 'GET' });
    if (response?.success && Array.isArray(response.data)) {
      careCategories.value = response.data;
    }
  } catch {
    careCategories.value = [];
  }
});

const headerDescription = computed(() => {
  try {
    const d = new Date(selectedDate.value + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
});

const progressPct = computed(() => {
  const total = tour.value?.summary.total_stops ?? 0;
  const done = tour.value?.summary.done_stops ?? 0;
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
});

const allAbsentOnly = computed(() => {
  const total = tour.value?.summary.total_stops ?? 0;
  const absent = tour.value?.summary.absent_stops ?? 0;
  return total === 0 && absent > 0;
});

const showTourSummary = computed(() => {
  if (!tour.value) return false;
  const total = tour.value.summary.total_stops ?? 0;
  const absent = tour.value.summary.absent_stops ?? 0;
  return total > 0 || absent > 0;
});

const remainingLabel = computed(() => {
  const stops = tour.value?.stops ?? [];
  const remaining = countTourActiveRemainingStops(stops);
  if (remaining === 0) return 'Tournée terminée';
  return `${remaining} passage${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}`;
});

async function onRescheduleConfirm(payload: { scheduled_at: string; availability: string }) {
  if (!rescheduleTarget.value) return;
  await rescheduleStop(rescheduleTarget.value.stop_id, payload);
  rescheduleTarget.value = null;
}

function onPassagePlanningSelect(mode: 'single_day' | 'recurring') {
  navigateTo({
    path: '/nurse/passage/patient-pick',
    query: { start_date: selectedDate.value, mode },
  });
}

function openPassageDetail(stop: NurseTourStop) {
  if (stop.passage_series_id) {
    navigateTo({
      path: `/nurse/passage/${stop.passage_series_id}`,
      query: { appointment_id: stop.appointment_id, stop_id: stop.stop_id },
    });
    return;
  }
  navigateTo({
    path: '/nurse/passage/rdv',
    query: { appointment_id: stop.appointment_id, stop_id: stop.stop_id },
  });
}

function openAbsenceModal(stop: NurseTourStop) {
  if (!stop.patient_id) {
    useToast().add({ title: 'Patient introuvable pour cette absence', color: 'error' });
    return;
  }
  absenceTarget.value = stop;
}

async function onAbsenceSave(input: PatientAbsenceInput, absenceId?: string | null) {
  if (!absenceTarget.value?.patient_id) return;
  try {
    await saveAbsence(absenceTarget.value.patient_id, input, absenceId);
    absenceTarget.value = null;
    useToast().add({ title: 'Tournée actualisée', color: 'success' });
    await refresh();
  } catch {
    /* error bound in modal */
  }
}

async function onAbsenceDelete(absenceId: string) {
  if (!absenceTarget.value?.patient_id) return;
  try {
    await removeAbsence(absenceTarget.value.patient_id, absenceId);
    absenceTarget.value = null;
    useToast().add({ title: 'Absence levée — patient de retour', color: 'success' });
    await refresh();
  } catch {
    /* error bound in modal */
  }
}
</script>
