<script setup lang="ts">
/**
 * Fenêtre de dates (mobile 5×2, sm+ 7×2) : pagination par « pages » pleine largeur.
 *
 * Approche : scroll horizontal natif + scroll-snap (pas Embla). L’état des chevrons
 * vient des métriques réelles du viewport (scrollLeft / scrollWidth / clientWidth) :
 * aucune dépendance à canScrollNext() ou à des snaps recalculés par une lib tiers.
 */
import { CalendarDate, DateFormatter, parseDate } from '@internationalized/date';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
  return weekdayShort(day);
}

function calendarDayAriaLabel(day: CalendarDate): string {
  const mo = dayMonthShortLabel(day);
  return `${weekdayShort(day)} ${day.day} ${mo} ${day.year}`;
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

const currentSlide = ref(0);
const visiblePeriod = computed(() => {
  const days = slides.value[currentSlide.value];
  if (!days?.length) return '';
  const formatter = new DateFormatter('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: PARIS_TZ });
  return `${formatter.format(toParisDate(days[0]))} – ${formatter.format(toParisDate(days[days.length - 1]))}`;
});
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
  currentSlide.value = Math.max(0, Math.min(slides.value.length - 1, Math.round(scrollLeft / clientWidth)));
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
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollTo({ left: target * w, behavior: reduceMotion ? 'auto' : 'smooth' });
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
      <nav class="mb-3 flex items-center justify-between gap-2" aria-label="Changer la période du calendrier">
        <button type="button" :disabled="disabled || !canScrollPrev" class="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200" aria-label="Période précédente" @click="arrowPrev">
          <UIcon name="i-lucide-chevron-left" class="size-5" aria-hidden="true" />
        </button>
        <p class="min-w-0 text-center text-xs font-medium leading-relaxed text-gray-700 dark:text-gray-300" aria-live="polite">{{ visiblePeriod }}</p>
        <button type="button" :disabled="disabled || !canScrollNext" class="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200" aria-label="Période suivante" @click="arrowNext">
          <UIcon name="i-lucide-chevron-right" class="size-5" aria-hidden="true" />
        </button>
      </nav>
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
          :inert="sIdx !== currentSlide"
          :aria-hidden="sIdx !== currentSlide"
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
                      ? 'border border-primary-500 bg-primary-500 text-primary-950 shadow-none'
                      : 'border border-gray-200 bg-white hover:border-primary-500 hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-primary-950'
                "
                @click="selectDay(day)"
              >
                <span
                  class="text-xs font-medium capitalize leading-none"
                  :class="
                    isDaySelected(day)
                      ? 'text-primary-950'
                      : 'text-gray-500 dark:text-gray-400'
                  "
                  >{{ calendarDayRibbonLabel(day) }}</span
                >
                <span
                  class="text-[18px] tabular-nums leading-none sm:text-[17px] md:text-xl md:font-bold lg:text-2xl"
                  :class="
                    isDaySelected(day)
                      ? 'font-bold text-primary-950'
                      : 'font-semibold text-gray-900 dark:text-gray-50'
                  "
                  >{{ day.day }}</span
                >
                <span
                  class="text-xs capitalize leading-none"
                  :class="
                    isDaySelected(day)
                      ? 'font-medium text-primary-950'
                      : 'font-normal text-gray-500 dark:text-gray-400'
                  "
                  >{{ dayMonthShortLabel(day) }}</span
                >
              </button>
            </div>
          </div>
        </div>
      </div>



      <template #fallback>
        <div
          class="min-h-[152px] w-full rounded-xl bg-gray-100/70 dark:bg-gray-800/35"
          aria-hidden="true"
        />
      </template>
    </ClientOnly>
  </div>
</template>
