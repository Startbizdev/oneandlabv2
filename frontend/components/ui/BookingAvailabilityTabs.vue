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
  /** Borne basse du slider « créneau » (ex. heure Paris si jour même). */
  rangeSliderMinHour?: number | null;
}>();

const showUrgent = computed(() => props.showUrgentTab === true);
const minUrgent = computed(() => (props.minUrgentHour != null ? props.minUrgentHour : 6));
const maxUrgent = computed(() => (props.maxUrgentHour != null ? props.maxUrgentHour : 19));
const feeLabel = computed(() => props.urgencyFeeLabel ?? '8,90 € TTC');

/** Aligné sur le slider : pas en dessous de `rangeSliderMinHour` si fourni (jour même Paris). */
const effectiveRangeSliderMin = computed(() =>
  Math.max(AVAIL_MIN, props.rangeSliderMinHour != null ? props.rangeSliderMinHour : AVAIL_MIN),
);

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
      icon: 'i-lucide-sparkles',
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

watch(effectiveRangeSliderMin, () => {
  if (availabilityType.value !== 'custom') return;
  const r = availabilityRange.value;
  if (!r || !Array.isArray(r) || r.length !== 2) return;
  availabilityRange.value = clampRange(r[0], r[1]);
});

const rangeWarn = computed(
  () =>
    availabilityType.value === 'custom' &&
    availabilityRange.value[1] - availabilityRange.value[0] < AVAILABILITY_MIN_SPAN_HOURS,
);

function clampRange(lo: number, hi: number): [number, number] {
  const max = props.maxHour;
  const floor = effectiveRangeSliderMin.value;
  let l = Math.max(floor, Math.min(max, lo));
  let h = Math.max(floor, Math.min(max, hi));
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
  showUrgent.value ? 'grid grid-cols-3 gap-1.5 sm:gap-2' : 'grid grid-cols-2 gap-1.5 sm:gap-2',
);

function isVipTab(tab: { id: string }) {
  return tab.id === 'urgent';
}

function tabButtonClass(tab: { id: string }) {
  const on = availabilityType.value === tab.id;
  const focusBase = 'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-900';
  if (isVipTab(tab)) {
    const focusVip = `${focusBase} focus-visible:ring-amber-500/55`;
    if (on) {
      return [
        'vip-tab vip-tab--active cursor-pointer text-[#1c0e02] shadow-[0_0_26px_-5px_rgba(217,119,6,0.65)] ring-2 ring-amber-600/90 dark:text-amber-50',
        'dark:shadow-[0_0_32px_-4px_rgba(250,204,21,0.45)] dark:ring-amber-400/80',
        focusVip,
      ];
    }
    return [
      'vip-tab vip-tab--idle cursor-pointer text-[#1c0e02] ring-2 ring-amber-600/55 hover:ring-amber-500/80 dark:text-amber-50',
      'dark:ring-amber-500/70 dark:hover:ring-amber-300/85',
      focusVip,
    ];
  }
  const focusSky = `${focusBase} focus-visible:ring-sky-500/45`;
  if (on) {
    return [
      'z-[1] cursor-pointer border-2 border-sky-400 bg-sky-50 text-sky-950 shadow-[0_2px_8px_-2px_rgba(14,165,233,0.28)] outline-none dark:border-sky-500 dark:bg-sky-950/55 dark:text-sky-50 dark:shadow-[0_4px_14px_-4px_rgba(14,165,233,0.35)]',
      'hover:bg-sky-50 dark:hover:bg-sky-950/65 active:scale-[0.98]',
      focusSky,
    ];
  }
  return [
    'z-0 cursor-pointer border border-gray-300/95 bg-white text-gray-800 shadow-sm outline-none dark:border-gray-600 dark:bg-gray-800/95 dark:text-gray-100 dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]',
    'hover:border-gray-400 hover:bg-gray-50/95 hover:shadow-md active:scale-[0.98] dark:hover:border-gray-500 dark:hover:bg-gray-800 dark:hover:shadow-md',
    focusSky,
  ];
}

function tabIconClass(tab: { id: string }) {
  if (isVipTab(tab)) {
    return 'relative z-[1] size-5 shrink-0 drop-shadow-sm sm:size-[1.35rem]';
  }
  return 'relative z-[1] size-5 shrink-0 text-current opacity-90 transition-[color,opacity] sm:size-6';
}
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
          class="group relative flex min-h-[4.75rem] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-1.5 py-2.5 transition-[color,box-shadow,background,transform,border-color] duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-45 sm:min-h-[5.25rem] sm:gap-1.5 sm:px-2 sm:py-3"
          :class="tabButtonClass(tab)"
          @click="setTab(tab.id)"
        >
          <span
            v-if="isVipTab(tab)"
            class="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
            aria-hidden="true"
          >
            <span class="vip-shine-beam" />
            <span class="vip-shimmer-bg" />
          </span>
          <UIcon :name="tab.icon" :class="tabIconClass(tab)" aria-hidden="true" />
          <span
            :class="[
              'relative z-[1] max-w-[11rem] px-0.5 text-center font-bold leading-snug tracking-tight sm:max-w-none',
              isVipTab(tab)
                ? 'text-[11px] text-[#1c0e02] drop-shadow-[0_1px_0_rgba(255,250,235,0.35)] dark:text-amber-50 sm:text-xs'
                : 'text-[11px] text-current sm:text-[13px]',
            ]"
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
            :min="effectiveRangeSliderMin"
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

<style scoped>
/* Horaire VIP : fond doré + reflet animé (respect prefers-reduced-motion) */
.vip-tab {
  position: relative;
  overflow: hidden;
}

.vip-tab--idle {
  background: linear-gradient(155deg, #fde047 0%, #facc15 18%, #eab308 42%, #ca8a04 68%, #b45309 92%);
  box-shadow:
    inset 0 2px 3px rgba(255, 253, 230, 0.85),
    inset 0 -2px 4px rgba(146, 64, 14, 0.28),
    0 2px 6px rgba(180, 83, 9, 0.22);
}

.dark .vip-tab--idle {
  background: linear-gradient(150deg, #713f12 0%, #a16207 38%, #ca8a04 68%, #eab308 100%);
  box-shadow:
    inset 0 1px 0 rgba(254, 243, 199, 0.22),
    inset 0 -2px 6px rgba(0, 0, 0, 0.45),
    0 0 22px -6px rgba(250, 204, 21, 0.35);
}

.vip-tab--active {
  background: linear-gradient(142deg, #ffef9e 0%, #fde047 16%, #fbbf24 38%, #f59e0b 58%, #d97706 78%, #92400e 100%);
  box-shadow:
    inset 0 2px 4px rgba(255, 255, 255, 0.72),
    inset 0 -2px 5px rgba(120, 53, 15, 0.35),
    0 0 28px -4px rgba(245, 158, 11, 0.55);
}

.dark .vip-tab--active {
  background: linear-gradient(142deg, #78350f 0%, #92400e 22%, #b45309 48%, #d97706 72%, #f59e0b 92%, #fbbf24 100%);
  box-shadow:
    inset 0 2px 2px rgba(255, 251, 235, 0.18),
    inset 0 -2px 8px rgba(0, 0, 0, 0.5),
    0 0 36px -3px rgba(251, 191, 36, 0.42);
}

.vip-shimmer-bg {
  position: absolute;
  inset: -40% -60%;
  background: linear-gradient(
    110deg,
    transparent 0%,
    transparent 38%,
    rgba(255, 253, 240, 0.22) 48%,
    rgba(255, 255, 255, 0.38) 50%,
    rgba(255, 248, 220, 0.2) 52%,
    transparent 62%,
    transparent 100%
  );
  animation: vip-shimmer-pan 4.5s ease-in-out infinite;
  opacity: 0.9;
  pointer-events: none;
}

.dark .vip-shimmer-bg {
  background: linear-gradient(
    110deg,
    transparent 0%,
    transparent 38%,
    rgba(254, 240, 138, 0.12) 48%,
    rgba(253, 224, 71, 0.2) 50%,
    rgba(254, 243, 199, 0.1) 52%,
    transparent 62%,
    transparent 100%
  );
  opacity: 0.85;
}

.vip-shine-beam {
  position: absolute;
  top: -60%;
  left: -30%;
  height: 220%;
  width: 42%;
  background: linear-gradient(
    100deg,
    transparent,
    rgba(255, 255, 255, 0) 38%,
    rgba(255, 255, 255, 0.75) 50%,
    rgba(255, 255, 255, 0) 62%,
    transparent
  );
  filter: blur(0.5px);
  animation: vip-beam-sweep 2.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
  opacity: 0.95;
  pointer-events: none;
}

.dark .vip-shine-beam {
  background: linear-gradient(
    100deg,
    transparent,
    transparent 38%,
    rgba(255, 251, 235, 0.45) 50%,
    transparent 62%,
    transparent
  );
}

.vip-tab--active .vip-shine-beam {
  animation-duration: 2.15s;
}

@keyframes vip-beam-sweep {
  0% {
    transform: translateX(-20%) skewX(-14deg);
  }
  100% {
    transform: translateX(340%) skewX(-14deg);
  }
}

@keyframes vip-shimmer-pan {
  0%,
  100% {
    transform: translateX(-6%) translateY(2%);
    opacity: 0.72;
  }
  50% {
    transform: translateX(6%) translateY(-2%);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vip-shine-beam,
  .vip-shimmer-bg {
    animation: none !important;
  }

  .vip-shimmer-bg {
    opacity: 0.35;
  }

  .vip-shine-beam {
    opacity: 0;
  }
}
</style>
