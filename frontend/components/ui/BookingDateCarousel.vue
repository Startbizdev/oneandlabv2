<script setup lang="ts">
/**
 * Fenêtre de dates (mobile 5×2, sm+ 7×2) : pagination par « pages » pleine largeur.
 *
 * Approche : scroll horizontal natif + scroll-snap (pas Embla). L’état des chevrons
 * vient des métriques réelles du viewport (scrollLeft / scrollWidth / clientWidth) :
 * aucune dépendance à canScrollNext() ou à des snaps recalculés par une lib tiers.
 */
import { CalendarDate, DateFormatter, parseDate, today } from '@internationalized/date';
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import {
  PARIS_TZ,
  bookingMinCalendarDate,
  isBookingDateUnavailable,
} from '~/utils/booking-date-constraints';

const DESKTOP_DAYS_PER_SLIDE = 14;
const MOBILE_DAYS_PER_SLIDE = 10;
const SLIDE_COUNT_DESKTOP = 32;
const TOTAL_BOOKING_DAYS = SLIDE_COUNT_DESKTOP * DESKTOP_DAYS_PER_SLIDE;

const props = defineProps<{
  modelValue?: string | null;
  minLeadTimeHours?: number | null;
  acceptSaturday?: boolean;
  acceptSunday?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

const dfWeekday = new DateFormatter('fr-FR', { weekday: 'short', timeZone: PARIS_TZ });
const dfMonthShort = new DateFormatter('fr-FR', {
  month: 'short',
  timeZone: PARIS_TZ,
});

const minDate = computed(() => bookingMinCalendarDate(props.minLeadTimeHours ?? undefined));

function readSmBreakpoint(): boolean {
  if (import.meta.server) return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(min-width: 640px)').matches;
}

const isSmAndUp = ref(readSmBreakpoint());

const daysPerSlide = computed(() =>
  isSmAndUp.value ? DESKTOP_DAYS_PER_SLIDE : MOBILE_DAYS_PER_SLIDE,
);

const slides = computed(() => {
  const start = minDate.value;
  const dps = daysPerSlide.value;
  const out: CalendarDate[][] = [];
  for (let offset = 0; offset < TOTAL_BOOKING_DAYS; offset += dps) {
    const len = Math.min(dps, TOTAL_BOOKING_DAYS - offset);
    out.push(
      Array.from({ length: len }, (_, d) => start.add({ days: offset + d })),
    );
  }
  return out;
});

function toParisDate(d: CalendarDate): Date {
  return d.toDate(PARIS_TZ);
}

function cleanFrMonthToken(s: string): string {
  return s.trim().replace(/\.$/, '');
}

function isUnavailable(date: CalendarDate): boolean {
  if (date.compare(minDate.value) < 0) return true;
  return isBookingDateUnavailable(date, {
    acceptSaturday: props.acceptSaturday !== false,
    acceptSunday: props.acceptSunday !== false,
  });
}

function isoFromCalendarDate(d: CalendarDate): string {
  const y = d.year;
  const m = String(d.month).padStart(2, '0');
  const day = String(d.day).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function weekdayShort(d: CalendarDate): string {
  return dfWeekday.format(toParisDate(d)).replace('.', '');
}

function calendarDayRibbonLabel(day: CalendarDate): string {
  const t = today(PARIS_TZ);
  if (day.compare(t) === 0) return 'Auj';
  if (day.compare(t.add({ days: 1 })) === 0) return 'Dem';
  return weekdayShort(day);
}

function calendarDayAriaLabel(day: CalendarDate): string {
  const t = today(PARIS_TZ);
  const mo = dayMonthShortLabel(day);
  if (day.compare(t) === 0) return `Aujourd'hui ${day.day} ${mo}`;
  if (day.compare(t.add({ days: 1 })) === 0) return `Demain ${day.day} ${mo}`;
  return `${weekdayShort(day)} ${day.day} ${mo}`;
}

function dayMonthShortLabel(day: CalendarDate): string {
  return cleanFrMonthToken(dfMonthShort.format(toParisDate(day))).toLocaleLowerCase('fr-FR');
}

function selectDay(day: CalendarDate) {
  if (props.disabled || isUnavailable(day)) return;
  emit('update:modelValue', isoFromCalendarDate(day));
}

function isDaySelected(day: CalendarDate): boolean {
  const s = selectedCalendar.value;
  if (!s) return false;
  return s.year === day.year && s.month === day.month && s.day === day.day;
}

const selectedCalendar = computed<CalendarDate | null>(() => {
  const raw = props.modelValue;
  if (!raw || String(raw).trim() === '') return null;
  const s = String(raw).trim();
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return parseDate(s);
    const dt = new Date(s);
    return new CalendarDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  } catch {
    return null;
  }
});

function slideIndexForDate(target: CalendarDate): number | null {
  if (target.compare(minDate.value) < 0) return null;
  let n = 0;
  let cur = minDate.value;
  while (cur.compare(target) < 0) {
    cur = cur.add({ days: 1 });
    n++;
  }
  return Math.floor(n / daysPerSlide.value);
}

/** Réf du viewport scrollable (pas un wrapper opaque du carousel). */
const scrollerRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | undefined;

const canScrollPrev = ref(false);
const canScrollNext = ref(false);

function updateArrowAffordance() {
  if (props.disabled) {
    canScrollPrev.value = false;
    canScrollNext.value = false;
    return;
  }
  const el = scrollerRef.value;
  if (!el || el.clientWidth <= 0) {
    canScrollPrev.value = false;
    canScrollNext.value = false;
    return;
  }
  const { scrollLeft, scrollWidth, clientWidth } = el;
  const maxScroll = Math.max(0, Math.round(scrollWidth - clientWidth));
  const x = Math.round(scrollLeft);
  const eps = 3;
  canScrollPrev.value = x > eps;
  canScrollNext.value = x < maxScroll - eps;
}

function scrollToSlideIndex(idx: number, behavior: ScrollBehavior = 'auto') {
  const el = scrollerRef.value;
  const n = slides.value.length;
  if (!el || n === 0 || el.clientWidth <= 0) return;
  const w = el.clientWidth;
  const clamped = Math.max(0, Math.min(idx, n - 1));
  el.scrollTo({ left: clamped * w, behavior });
  requestAnimationFrame(() => updateArrowAffordance());
}

function goPage(delta: -1 | 1) {
  const el = scrollerRef.value;
  if (!el || props.disabled) return;
  const w = el.clientWidth;
  const n = slides.value.length;
  if (w <= 0 || n === 0) return;
  let idx = Math.round(el.scrollLeft / w);
  idx = Math.max(0, Math.min(idx, n - 1));
  const target = Math.max(0, Math.min(idx + delta, n - 1));
  el.scrollTo({ left: target * w, behavior: 'smooth' });
  requestAnimationFrame(() => updateArrowAffordance());
}

function syncScrollFromSelectedDate() {
  const sel = selectedCalendar.value;
  if (!sel) return;
  const idx = slideIndexForDate(sel);
  if (idx == null) return;
  const run = () => scrollToSlideIndex(idx, 'auto');
  const el = scrollerRef.value;
  if (!el || el.clientWidth <= 0) {
    requestAnimationFrame(run);
    return;
  }
  run();
}

function arrowPrev() {
  goPage(-1);
}

function arrowNext() {
  goPage(1);
}

function attachResizeObserver(el: HTMLElement) {
  resizeObserver?.disconnect();
  resizeObserver = undefined;
  if (typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver(() => updateArrowAffordance());
  resizeObserver.observe(el);
}

watch(
  scrollerRef,
  (el) => {
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    if (!el) return;
    attachResizeObserver(el);
    nextTick(() => {
      updateArrowAffordance();
      syncScrollFromSelectedDate();
    });
  },
  { flush: 'post' },
);

watch(
  () => props.modelValue,
  () => {
    nextTick(() => syncScrollFromSelectedDate());
  },
);

watch(minDate, () => {
  nextTick(() => {
    syncScrollFromSelectedDate();
    updateArrowAffordance();
  });
});

let mediaQueryCleanup: (() => void) | undefined;

onMounted(() => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  const mq = window.matchMedia('(min-width: 640px)');
  const sync = () => {
    isSmAndUp.value = mq.matches;
  };
  sync();
  mq.addEventListener('change', sync);
  mediaQueryCleanup = () => mq.removeEventListener('change', sync);
});

watch(isSmAndUp, () => {
  nextTick(() => {
    syncScrollFromSelectedDate();
    updateArrowAffordance();
  });
});

onBeforeUnmount(() => {
  mediaQueryCleanup?.();
  resizeObserver?.disconnect();
});

const screenReaderInstructions =
  'Choisissez un jour parmi les propositions ci-dessous. Utilisez les boutons précédent et suivant pour changer la période.';
</script>

<template>
  <div
    class="booking-date-carousel relative z-10 min-w-0 overflow-x-visible overflow-y-visible bg-transparent pb-px shadow-none"
    role="group"
    :aria-label="screenReaderInstructions"
  >
    <p class="sr-only">{{ screenReaderInstructions }}</p>

    <ClientOnly>
      <div
        ref="scrollerRef"
        class="booking-date-carousel__scroller touch-pan-x flex w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain py-1 [scrollbar-width:none] sm:py-1.5 [&::-webkit-scrollbar]:hidden"
        style="-webkit-overflow-scrolling: touch"
        data-booking-date-scroller
        @scroll.passive="updateArrowAffordance"
      >
        <div
          v-for="(slide, sIdx) in slides"
          :key="`${isSmAndUp ? 'd' : 'm'}-${sIdx}`"
          class="box-border w-full shrink-0 snap-start snap-always"
          style="flex: 0 0 100%; min-width: 100%; max-width: 100%"
        >
          <div class="box-border px-1 sm:px-1.5 md:px-1 lg:px-0">
            <div
              class="grid auto-rows-max min-w-0 grid-cols-5 items-start gap-x-1.5 gap-y-2 sm:grid-cols-7 sm:gap-x-1.5 sm:gap-y-1.5 md:gap-2 [&>button]:min-h-0 [&>button]:min-w-0 [&>button]:self-start"
            >
              <button
                v-for="day in slide"
                :key="`${sIdx}-${day.year}-${day.month}-${day.day}`"
                type="button"
                :disabled="disabled || isUnavailable(day)"
                :aria-label="calendarDayAriaLabel(day)"
                :aria-pressed="isDaySelected(day)"
                class="box-border flex aspect-square w-full max-w-full flex-col items-center justify-center gap-0.5 self-start rounded-xl p-1.5 text-center transition-[border-color,background-color,color,transform,box-shadow] duration-150 sm:gap-px sm:p-1 md:gap-1 md:p-1.5 lg:p-2"
                :class="
                  disabled || isUnavailable(day)
                    ? 'cursor-not-allowed border border-gray-100/95 bg-gray-50/98 text-gray-400 shadow-none dark:border-gray-800/85 dark:bg-gray-950/55 dark:text-gray-600 dark:shadow-none'
                    : isDaySelected(day)
                      ? 'border border-emerald-800/95 bg-emerald-600 text-white shadow-none ring-0 hover:bg-emerald-600 dark:border-emerald-300/90 dark:bg-emerald-600 dark:text-white dark:shadow-none'
                      : 'border border-gray-200/90 bg-white ring-1 ring-inset ring-gray-950/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_-0.25px_rgba(15,23,42,0.08)] hover:-translate-y-px hover:border-gray-300/95 hover:bg-white hover:ring-gray-950/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_2px_4px_-0.25px_rgba(15,23,42,0.1)] dark:border-gray-600/90 dark:bg-gray-950 dark:ring-white/[0.05] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_2px_-0.25px_rgba(0,0,0,0.6)] dark:hover:border-gray-500 dark:hover:bg-gray-900 dark:hover:ring-white/[0.08] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_6px_-1px_rgba(0,0,0,0.65)] active:translate-y-0'
                "
                @click="selectDay(day)"
              >
                <span
                  class="text-[11px] font-semibold capitalize leading-none tracking-wide sm:text-[10px] md:text-xs md:font-semibold"
                  :class="
                    isDaySelected(day)
                      ? 'text-white/90'
                      : 'text-gray-500 dark:text-gray-400'
                  "
                  >{{ calendarDayRibbonLabel(day) }}</span
                >
                <span
                  class="text-[18px] tabular-nums leading-none sm:text-[17px] md:text-xl md:font-bold lg:text-2xl"
                  :class="
                    isDaySelected(day)
                      ? 'font-bold text-white'
                      : 'font-semibold text-gray-900 dark:text-gray-50'
                  "
                  >{{ day.day }}</span
                >
                <span
                  class="text-[10px] capitalize leading-none sm:text-[10px] md:text-xs"
                  :class="
                    isDaySelected(day)
                      ? 'font-medium text-white/85'
                      : 'font-normal text-gray-500 dark:text-gray-400'
                  "
                  >{{ dayMonthShortLabel(day) }}</span
                >
              </button>
            </div>
          </div>
        </div>
      </div>

      <nav
        class="pointer-events-none absolute inset-y-0 left-0 right-0 z-30"
        aria-label="Changer la période du calendrier"
      >
        <button
          v-if="!disabled && canScrollPrev"
          type="button"
          class="pointer-events-auto absolute left-1 top-1/2 z-10 inline-flex shrink-0 -translate-y-1/2 items-center justify-center rounded-full bg-gray-800 p-[2px] leading-none text-white shadow-md ring-1 ring-black/10 transition-[transform,background-color] hover:bg-gray-900 active:scale-[0.98] dark:bg-gray-700 dark:text-white dark:ring-white/10 dark:hover:bg-gray-600 sm:left-1.5"
          aria-label="Période précédente"
          @click="arrowPrev"
        >
          <UIcon name="i-lucide-chevron-left" class="block size-[14px] shrink-0" aria-hidden="true" />
        </button>
        <button
          v-if="!disabled && canScrollNext"
          type="button"
          class="pointer-events-auto absolute right-1 top-1/2 z-10 inline-flex shrink-0 -translate-y-1/2 items-center justify-center rounded-full bg-gray-800 p-[2px] leading-none text-white shadow-md ring-1 ring-black/10 transition-[transform,background-color] hover:bg-gray-900 active:scale-[0.98] dark:bg-gray-700 dark:text-white dark:ring-white/10 dark:hover:bg-gray-600 sm:right-1.5"
          aria-label="Période suivante"
          @click="arrowNext"
        >
          <UIcon name="i-lucide-chevron-right" class="block size-[14px] shrink-0" aria-hidden="true" />
        </button>
      </nav>

      <template #fallback>
        <div
          class="min-h-[152px] w-full rounded-xl bg-gray-100/70 dark:bg-gray-800/35"
          aria-hidden="true"
        />
      </template>
    </ClientOnly>
  </div>
</template>
