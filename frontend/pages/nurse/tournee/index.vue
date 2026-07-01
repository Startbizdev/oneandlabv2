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

    <!-- Strip jours -->
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

    <!-- Hero progression -->
    <div
      v-if="tour && tour.stops.length"
      class="overflow-hidden rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 p-4 text-white shadow-md"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border-[6px] border-white/30 text-lg font-bold"
        >
          {{ progressPct }}%
        </div>
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-wide text-white/80">Ma tournée du jour</p>
          <p class="text-xl font-bold tracking-tight">
            {{ tour.summary.done_stops }} sur {{ tour.summary.total_stops }} passages
          </p>
          <p class="text-sm text-white/90">
            {{ remainingLabel }} · ~{{ tour.summary.estimated_km }} km
          </p>
        </div>
      </div>
    </div>

    <!-- Modes tri -->
    <div v-if="tour" class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs font-semibold uppercase tracking-wide text-gray-400">Ordre des passages</span>
        <span v-if="tour.plan.sort_mode !== 'manual'" class="text-xs text-gray-400">
          Mode « Manuel » pour réorganiser
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          v-for="m in sortModes"
          :key="m.value"
          size="xs"
          :variant="tour.plan.sort_mode === m.value ? 'solid' : 'outline'"
          :color="tour.plan.sort_mode === m.value ? 'primary' : 'neutral'"
          :disabled="loading || saving"
          @click="applySortMode(m.value)"
        >
          {{ m.label }}
        </UButton>
        <UButton
          v-if="tour.plan.manual_order_locked"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="loading || saving"
          @click="resetOrder"
        >
          Réinitialiser
        </UButton>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="mb-3 h-8 w-8 animate-spin text-primary-500" />
      <p class="text-sm text-gray-500">Organisation de votre tournée…</p>
    </div>

    <template v-else-if="tour && tour.stops.length">
      <ClientOnly>
        <Map
          v-if="mapMarkers.length"
          :markers="mapMarkers"
          :center="mapCenter"
          height="220px"
          class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
        />
      </ClientOnly>

      <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Vos passages</p>

      <ul class="space-y-3">
        <li
          v-for="(stop, index) in tour.stops"
          :key="stop.stop_id"
          draggable="true"
          class="overflow-hidden rounded-xl border shadow-sm"
          :class="[
            stop.visit_status === 'done'
              ? 'border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-800'
              : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/50',
            stop.stop_id === tour.next_stop_id && stop.visit_status !== 'done'
              ? 'border-primary-400 ring-1 ring-primary-200 dark:border-primary-600'
              : '',
          ]"
          @dragstart="onDragStart(index)"
          @dragover.prevent
          @drop="onDrop(index)"
        >
          <div class="relative px-4 pt-3.5 pb-2.5" :class="stop.visit_status === 'done' ? 'min-h-[148px]' : ''">
            <div
              v-if="stop.visit_status !== 'done' && tour.stops.length > 1"
              class="absolute right-4 top-3.5 z-10 flex flex-col gap-1"
            >
              <UButton
                size="xs"
                color="neutral"
                variant="outline"
                icon="i-lucide-arrow-up"
                class="!p-1.5"
                :disabled="index === 0 || saving"
                aria-label="Monter"
                @click="moveStop(index, -1)"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="outline"
                icon="i-lucide-arrow-down"
                class="!p-1.5"
                :disabled="index >= tour.stops.length - 1 || saving"
                aria-label="Descendre"
                @click="moveStop(index, 1)"
              />
            </div>

            <NuxtLink
              :to="`/nurse/appointments/${stop.appointment_id}`"
              class="block min-w-0 transition-colors"
              :class="[
                stop.visit_status !== 'done' && tour.stops.length > 1 ? 'pr-10' : '',
                stop.visit_status !== 'done' ? 'hover:opacity-90' : 'opacity-30',
              ]"
            >
              <div class="flex items-start gap-3">
                <div
                  class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  :class="
                    stop.visit_status === 'done'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                  "
                >
                  <UIcon
                    v-if="stop.visit_status === 'done'"
                    name="i-lucide-check"
                    class="h-4 w-4"
                  />
                  <span v-else>{{ stop.position }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="font-semibold"
                      :class="
                        stop.visit_status === 'done'
                          ? 'text-gray-600 dark:text-gray-300'
                          : 'text-gray-900 dark:text-white'
                      "
                    >
                      {{ stop.patient_name }}
                    </span>
                    <UBadge
                      v-if="stop.visit_status === 'done'"
                      color="success"
                      variant="subtle"
                      size="xs"
                    >
                      Effectué
                    </UBadge>
                    <UBadge
                      v-if="stop.stop_id === tour.next_stop_id && stop.visit_status !== 'done'"
                      color="primary"
                      variant="subtle"
                      size="xs"
                    >
                      Suivant
                    </UBadge>
                  </div>
                  <NurseTourStopCare
                    :stop="stop"
                    :categories="careCategories"
                    embedded
                    :class="stop.visit_status === 'done' ? 'opacity-70' : ''"
                  />
                  <div
                    v-if="slotLabel(stop)"
                    class="mt-2.5 flex min-w-0 items-center gap-1.5 text-xs font-semibold"
                    :class="
                      stop.visit_status === 'done'
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-primary-600 dark:text-primary-400'
                    "
                  >
                    <UIcon name="i-lucide-clock" class="h-3.5 w-3.5 shrink-0" />
                    <span>{{ slotLabel(stop) }}</span>
                    <button
                      v-if="stop.visit_status !== 'done'"
                      type="button"
                      class="inline-flex shrink-0 rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      aria-label="Modifier la date et le créneau"
                      @click.prevent="openReschedule(stop)"
                    >
                      <UIcon name="i-lucide-pencil" class="h-4 w-4" />
                    </button>
                  </div>
                  <p
                    v-if="stop.address_line"
                    class="mt-2 text-xs"
                    :class="
                      stop.visit_status === 'done'
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-600 dark:text-gray-400'
                    "
                  >
                    {{ stop.address_line }}
                  </p>
                  <p v-if="stop.address_complement" class="text-xs text-gray-400">
                    {{ stop.address_complement }}
                  </p>
                  <p v-if="stop.distance_km_from_prev > 0" class="mt-1 text-xs text-gray-400">
                    {{ stop.distance_km_from_prev.toFixed(1) }} km · ~{{ stop.drive_min_from_prev }} min
                  </p>
                </div>
              </div>
            </NuxtLink>

            <div
              v-if="stop.visit_status === 'done'"
              class="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-gray-900/35 dark:bg-black/45"
            >
              <div class="flex flex-col items-center gap-2">
                <div
                  class="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] border-emerald-500 bg-white shadow-md dark:bg-gray-900"
                >
                  <UIcon name="i-lucide-check" class="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span class="rounded-full bg-white px-3 py-1 text-base font-bold tracking-wide text-emerald-700 shadow-sm dark:bg-gray-900 dark:text-emerald-300">Effectué</span>
              </div>
            </div>
          </div>

          <div
            v-if="stop.visit_status !== 'done'"
            class="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-2.5 dark:border-gray-800"
          >
            <UButton
              size="xs"
              variant="solid"
              icon="i-lucide-navigation"
              class="!bg-[#33CCFF] !text-white hover:!bg-[#2db8e6]"
              @click="openNav(stop)"
            >
              Waze
            </UButton>
            <UButton
              v-if="stop.phone"
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-lucide-phone"
              @click="callPatient(stop.phone)"
            >
              Appeler
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              icon="i-lucide-calendar-plus"
              @click="downloadIcs"
            >
              Calendrier
            </UButton>
            <UButton
              size="xs"
              color="success"
              icon="i-lucide-check"
              :disabled="saving"
              @click="markDone(stop.stop_id)"
            >
              Terminer
            </UButton>
          </div>
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

    <NurseTourRescheduleModal
      :open="Boolean(rescheduleTarget)"
      :stop="rescheduleTarget"
      :saving="saving"
      @close="rescheduleTarget = null"
      @confirm="onRescheduleConfirm"
    />
  </AppPageShell>
</template>

<script setup lang="ts">
import { formatAvailabilityDisplayFr } from '~/utils/appointment-datetime-fr';
import type { NurseTourStop } from '~/composables/useNurseTourWeb';
import type { CareCategoryRowMinimal } from '~/utils/care-icons';
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
  sortModes,
  mapMarkers,
  moveStop,
  onDragStart,
  onDrop,
  applySortMode,
  resetOrder,
  markDone,
  rescheduleStop,
  callPatient,
  openNav,
  downloadIcs,
} = useNurseTourWeb();

const rescheduleTarget = ref<NurseTourStop | null>(null);
const careCategories = ref<CareCategoryRowMinimal[]>([]);

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

const mapCenter = computed((): [number, number] => {
  const first = mapMarkers.value[0];
  if (first) return [first.lat, first.lng];
  return [48.8566, 2.3522];
});

const progressPct = computed(() => {
  const total = tour.value?.summary.total_stops ?? 0;
  const done = tour.value?.summary.done_stops ?? 0;
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
});

const remainingLabel = computed(() => {
  const total = tour.value?.summary.total_stops ?? 0;
  const done = tour.value?.summary.done_stops ?? 0;
  const remaining = Math.max(0, total - done);
  if (remaining === 0) return 'Tournée terminée';
  return `${remaining} passage${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}`;
});

function slotLabel(stop: NurseTourStop): string {
  return formatAvailabilityDisplayFr(stop.availability, stop.scheduled_at) || '—';
}

function openReschedule(stop: NurseTourStop) {
  rescheduleTarget.value = stop;
}

async function onRescheduleConfirm(payload: { scheduled_at: string; availability: string }) {
  if (!rescheduleTarget.value) return;
  await rescheduleStop(rescheduleTarget.value.stop_id, payload);
  rescheduleTarget.value = null;
}
</script>
