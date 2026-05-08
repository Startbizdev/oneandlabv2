<script setup lang="ts">
import { AVAILABILITY_MIN_SPAN_HOURS } from '~/constants/availability-slot';

const AVAIL_MIN = 6;

const props = defineProps<{
  formatHour: (h: number) => string;
  maxHour: number;
  disabled?: boolean;
  /** Patient / prise de sang uniquement — 3ᵉ onglet « Horaire VIP » + paiement Stripe (hors wizard pro). */
  showUrgentTab?: boolean;
  minUrgentHour?: number;
  maxUrgentHour?: number;
  /** Libellé marketing sous l’option VIP (ex. supplément TTC). */
  urgencyFeeLabel?: string;
}>();

const showUrgent = computed(() => props.showUrgentTab === true);
const minUrgent = computed(() => (props.minUrgentHour != null ? props.minUrgentHour : 6));
const maxUrgent = computed(() => (props.maxUrgentHour != null ? props.maxUrgentHour : 19));
const feeLabel = computed(() => props.urgencyFeeLabel ?? '8,90 € TTC');

const availabilityType = defineModel<string>('availabilityType', { required: true });
const availabilityRange = defineModel<[number, number]>('availabilityRange', { required: true });
const urgentHour = defineModel<number>('urgentHour', { default: 9 });
/** `asap` = le plus vite possible ; `scheduled` = heure précise par pas de 15 min. */
const urgentTimingMode = defineModel<'asap' | 'scheduled'>('urgentTimingMode', { default: 'scheduled' });
const urgentMinute = defineModel<number>('urgentMinute', { default: 0 });

const minuteStepItems = [
  { label: '00', value: 0 },
  { label: '15', value: 15 },
  { label: '30', value: 30 },
  { label: '45', value: 45 },
];

const tabs = computed(() => {
  const base = [
    {
      id: 'all_day',
      label: 'Toute la journée',
      icon: 'i-lucide-sun',
    },
    {
      id: 'custom',
      label: 'Créneau horaire',
      icon: 'i-lucide-clock',
    },
  ];
  if (!showUrgent.value) return base;
  return [
    ...base,
    {
      id: 'urgent',
      label: 'Horaire VIP',
      icon: 'i-lucide-star',
    },
  ];
});

const urgentHourItems = computed(() => {
  const out: { label: string; value: number }[] = [];
  for (let h = minUrgent.value; h <= maxUrgent.value; h++) {
    out.push({ label: `${Math.floor(h)}h`, value: Math.floor(h) });
  }
  return out;
});

function clampMinute(m: number) {
  const s = minuteStepItems.map((x) => x.value);
  if (s.includes(m)) return m;
  const closest = s.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a), 0);
  return closest;
}

function clampUrgentTimeFields() {
  const lo = minUrgent.value;
  const hi = maxUrgent.value;
  let h = urgentHour.value;
  h = Math.min(Math.max(lo, Math.floor(Number(h))), hi);
  urgentHour.value = Number.isFinite(h) ? h : lo;
  urgentMinute.value = clampMinute(Number(urgentMinute.value) || 0);
}

function setTab(id: string) {
  if (props.disabled) return;
  availabilityType.value = id;
  if (id === 'urgent') {
    clampUrgentTimeFields();
  }
}

watch(
  availabilityType,
  (t) => {
    if (t === 'urgent' && showUrgent.value) {
      clampUrgentTimeFields();
    }
  },
  { immediate: true },
);

watch([urgentHour, urgentMinute, urgentTimingMode, minUrgent, maxUrgent], () => {
  if (availabilityType.value === 'urgent' && showUrgent.value) {
    clampUrgentTimeFields();
  }
});

const rangeWarn = computed(
  () =>
    availabilityType.value === 'custom' &&
    availabilityRange.value[1] - availabilityRange.value[0] < AVAILABILITY_MIN_SPAN_HOURS,
);

function clampRange(lo: number, hi: number): [number, number] {
  const max = props.maxHour;
  let l = Math.max(AVAIL_MIN, Math.min(max, lo));
  let h = Math.max(AVAIL_MIN, Math.min(max, hi));
  if (h < l) [l, h] = [h, l];
  if (h - l < AVAILABILITY_MIN_SPAN_HOURS) {
    h = Math.min(max, l + AVAILABILITY_MIN_SPAN_HOURS);
  }
  return [l, h];
}

function updateRange(raw: [number, number]) {
  if (props.disabled) return;
  availabilityRange.value = clampRange(raw[0], raw[1]);
}

const tabsGridClass = computed(() =>
  showUrgent.value ? 'grid grid-cols-3 gap-1 sm:gap-1.5' : 'grid grid-cols-2 gap-1.5 sm:gap-2',
);
</script>

<template>
  <div class="space-y-3">
    <!-- Segmented control : pas d'overflow-hidden pour éviter de couper hover / focus ring -->
    <div
      class="relative overflow-visible rounded-2xl border border-gray-200/95 bg-gray-100/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-gray-700/90 dark:bg-gray-900/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-2"
      role="tablist"
      aria-label="Disponibilité horaire"
    >
      <div :class="tabsGridClass">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="availabilityType === tab.id"
          :disabled="disabled"
          class="group relative flex min-h-[2.75rem] min-w-0 flex-row items-center justify-center gap-1 rounded-xl px-1.5 py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 disabled:pointer-events-none disabled:opacity-45 dark:focus-visible:ring-offset-gray-900 sm:min-h-[3rem] sm:gap-2 sm:rounded-[0.8125rem] sm:px-2 sm:py-2.5"
          :class="
            availabilityType === tab.id
              ? 'z-[1] bg-sky-50 text-sky-950 shadow-[0_1px_3px_rgba(14,165,233,0.14)] outline outline-1 outline-sky-300/75 dark:bg-sky-950/40 dark:text-sky-50 dark:shadow-[0_2px_8px_-2px_rgba(14,165,233,0.2)] dark:outline-sky-500/35'
              : 'z-0 text-gray-600 hover:bg-white/75 hover:text-gray-900 active:bg-white/90 dark:text-gray-400 dark:hover:bg-gray-800/80 dark:hover:text-gray-50 dark:active:bg-gray-800'
          "
          @click="setTab(tab.id)"
        >
          <UIcon
            :name="tab.icon"
            class="size-4 shrink-0 transition-[color] sm:size-[1.125rem]"
            aria-hidden="true"
          />
          <span
            class="max-w-full text-left text-[10px] font-semibold leading-tight sm:text-[11px] sm:leading-snug md:text-sm"
          >
            {{ tab.label }}
          </span>
        </button>
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-0.5"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-0.5"
    >
      <div v-if="availabilityType === 'custom'" class="space-y-2">
        <div>
          <div
            class="mb-2 flex justify-between gap-3 text-base font-semibold tabular-nums text-gray-900 dark:text-gray-100 sm:text-lg"
          >
            <span>{{ formatHour((availabilityRange ?? [9, 11])[0]) }}</span>
            <span>{{ formatHour((availabilityRange ?? [9, 11])[1]) }}</span>
          </div>
          <USlider
            :model-value="availabilityRange"
            :disabled="disabled"
            :min="AVAIL_MIN"
            :max="maxHour"
            :step="1"
            color="primary"
            size="xs"
            class="w-full touch-manipulation py-0.5"
            :ui="{
              track: 'h-1 rounded-full',
              range: 'rounded-full',
              thumb: 'size-4 shrink-0 bg-primary shadow-md ring-2 ring-white dark:bg-primary dark:ring-gray-950',
            }"
            @update:model-value="(v) => v != null && updateRange(v as [number, number])"
          />
        </div>
        <p v-if="rangeWarn" class="text-xs text-error-500">
          L'écart minimum est de {{ AVAILABILITY_MIN_SPAN_HOURS }} h
        </p>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-0.5"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-0.5"
    >
      <div v-if="availabilityType === 'urgent' && showUrgent" class="space-y-3">
        <div class="rounded-xl border border-neutral-200/95 bg-white dark:border-neutral-800 dark:bg-gray-950">
          <div class="flex gap-3 border-b border-neutral-100 px-3 py-3 dark:border-neutral-800/80 sm:px-4">
            <div
              class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:bg-amber-400/12 dark:text-amber-400"
              aria-hidden="true"
            >
              <UIcon name="i-lucide-star" class="size-[18px]" />
            </div>
            <div class="min-w-0 flex-1 space-y-1">
              <p class="text-[13px] font-semibold leading-snug text-neutral-900 dark:text-neutral-50">
                Horaire VIP · {{ feeLabel }}
              </p>
              <p class="text-[11px] leading-snug text-neutral-600 dark:text-neutral-400">
                Votre demande est traitée en <span class="font-medium text-neutral-800 dark:text-neutral-200">priorité Horaire VIP</span>
                (<span class="tabular-nums">6h–19h</span>). Au moment de la validation,
                <span class="font-medium text-neutral-800 dark:text-neutral-200">vous accédez à la page de paiement 3-D Secure</span>
                pour confirmer votre réservation en toute confiance.
              </p>
            </div>
          </div>

          <div class="space-y-3 px-3 pb-3 pt-3 sm:px-4">
            <p class="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Quand ?
            </p>
            <div class="grid min-w-0 grid-cols-2 gap-1.5 sm:gap-2">
              <button
                type="button"
                :disabled="disabled"
                class="flex min-w-0 flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-45 dark:focus-visible:ring-offset-gray-950 sm:gap-1.5 sm:px-3 sm:py-3"
                :class="
                  urgentTimingMode === 'asap'
                    ? 'border-amber-500/80 bg-amber-500/[0.07] dark:border-amber-500/50 dark:bg-amber-500/10'
                    : 'border-neutral-200 bg-neutral-50/60 hover:border-neutral-300 hover:bg-white dark:border-neutral-800 dark:bg-neutral-900/40 dark:hover:border-neutral-700'
                "
                @click="urgentTimingMode = 'asap'"
              >
                <UIcon
                  name="i-lucide-fast-forward"
                  class="size-[18px] shrink-0 text-amber-600 dark:text-amber-400 sm:size-5"
                  aria-hidden="true"
                />
                <span class="w-full min-w-0">
                  <span class="block text-center text-[11px] font-semibold leading-snug text-neutral-900 dark:text-white sm:text-[13px]">
                    Le plus vite possible
                  </span>
                  <span class="mt-1 block text-center text-[10px] leading-snug text-neutral-500 dark:text-neutral-400 sm:text-[11px]">
                    Priorisation pour le jour choisi.
                  </span>
                </span>
              </button>
              <button
                type="button"
                :disabled="disabled"
                class="flex min-w-0 flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-45 dark:focus-visible:ring-offset-gray-950 sm:gap-1.5 sm:px-3 sm:py-3"
                :class="
                  urgentTimingMode === 'scheduled'
                    ? 'border-amber-500/80 bg-amber-500/[0.07] dark:border-amber-500/50 dark:bg-amber-500/10'
                    : 'border-neutral-200 bg-neutral-50/60 hover:border-neutral-300 hover:bg-white dark:border-neutral-800 dark:bg-neutral-900/40 dark:hover:border-neutral-700'
                "
                @click="urgentTimingMode = 'scheduled'"
              >
                <UIcon name="i-lucide-clock" class="size-[18px] shrink-0 text-sky-600 dark:text-sky-400 sm:size-5" aria-hidden="true" />
                <span class="w-full min-w-0">
                  <span class="block text-center text-[11px] font-semibold leading-snug text-neutral-900 dark:text-white sm:text-[13px]">
                    Heure précise
                  </span>
                  <span class="mt-1 block text-center text-[10px] leading-snug text-neutral-500 dark:text-neutral-400 sm:text-[11px]">
                    Par pas de 15 minutes.
                  </span>
                </span>
              </button>
            </div>

            <Transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-0.5"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-0.5"
            >
              <div v-if="urgentTimingMode === 'scheduled'" class="space-y-2">
                <p class="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Horaire
                </p>
                <div class="flex flex-wrap items-center gap-2">
                  <USelect
                    v-model="urgentHour"
                    :items="urgentHourItems"
                    value-key="value"
                    :disabled="disabled"
                    size="md"
                    class="min-w-[6.5rem]"
                  />
                  <span class="text-sm font-medium text-neutral-400" aria-hidden="true">:</span>
                  <USelect
                    v-model="urgentMinute"
                    :items="minuteStepItems"
                    value-key="value"
                    :disabled="disabled"
                    size="md"
                    class="min-w-[4.5rem]"
                  />
                </div>
                <p class="text-[11px] leading-snug text-muted">
                  Choix au quart d'heure, de {{ minUrgent }}h à {{ maxUrgent }}h.
                </p>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
