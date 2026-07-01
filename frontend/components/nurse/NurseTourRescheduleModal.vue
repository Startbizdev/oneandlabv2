<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden="true" @click="emit('close')" />
      <div
        role="dialog"
        aria-modal="true"
        class="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-700/80 dark:bg-slate-900 sm:rounded-2xl"
      >
        <div class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">Modifier le créneau</h2>
            <p v-if="stop" class="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
              {{ stop.patient_name }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fermer"
            @click="emit('close')"
          >
            <UIcon name="i-lucide-x" class="h-5 w-5" />
          </button>
        </div>

        <div v-if="stop" class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-4">
          <div class="space-y-1.5">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</span>
            <DatePicker
              v-model="formDate"
              class="w-full [&_button]:h-11"
              appointment-type="nurse"
              popover-content-class="z-[1000]"
            />
          </div>

          <BookingAvailabilityTabs
            v-model:availability-type="availabilityType"
            v-model:availability-range="availabilityRange"
            :format-hour="formatHour"
            :max-hour="19"
            :range-slider-min-hour="rangeSliderMinHour"
          />
        </div>

        <div class="shrink-0 border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <UButton
            color="primary"
            block
            size="lg"
            :loading="saving"
            :disabled="!canSubmit"
            @click="submit"
          >
            Enregistrer le créneau
          </UButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { AVAILABILITY_MIN_SPAN_HOURS } from '~/constants/availability-slot';
import type { NurseTourStop } from '~/composables/useNurseTourWeb';

const props = defineProps<{
  open: boolean;
  stop: NurseTourStop | null;
  saving?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [payload: { scheduled_at: string; availability: string }];
}>();

const formDate = ref('');
const availabilityType = ref<'all_day' | 'custom'>('custom');
const availabilityRange = ref<[number, number]>([9, 11]);

function parseAvailability(raw: unknown): { type: 'all_day' | 'custom'; range: [number, number] } {
  try {
    const av = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (av?.type === 'all_day') return { type: 'all_day', range: [9, 11] };
    if (av?.type === 'custom' && Array.isArray(av.range) && av.range.length === 2) {
      return { type: 'custom', range: [Number(av.range[0]), Number(av.range[1])] };
    }
  } catch {
    /* default */
  }
  return { type: 'custom', range: [9, 11] };
}

watch(
  () => props.stop,
  (stop) => {
    if (!stop) return;
    formDate.value = (stop.scheduled_at ?? '').slice(0, 10);
    const parsed = parseAvailability((stop as NurseTourStop & { availability?: unknown }).availability);
    availabilityType.value = parsed.type;
    availabilityRange.value = parsed.range;
  },
  { immediate: true },
);

const formatHour = (h: number) => `${Math.floor(h)}h${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

const rangeSliderMinHour = computed(() => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
  if (formDate.value !== today) return null;
  const hour = Number(
    new Date().toLocaleString('en-GB', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false }),
  );
  return Number.isFinite(hour) ? Math.max(6, hour) : null;
});

const canSubmit = computed(() => {
  if (!formDate.value) return false;
  if (availabilityType.value === 'all_day') return true;
  return availabilityRange.value[1] - availabilityRange.value[0] >= AVAILABILITY_MIN_SPAN_HOURS;
});

function submit() {
  if (!props.stop || !canSubmit.value) return;
  const hour = availabilityType.value === 'custom' ? Math.floor(availabilityRange.value[0]) : 9;
  const scheduledAt = `${formDate.value} ${String(hour).padStart(2, '0')}:00:00`;
  const availability =
    availabilityType.value === 'all_day'
      ? JSON.stringify({ type: 'all_day' })
      : JSON.stringify({ type: 'custom', range: availabilityRange.value });
  emit('confirm', { scheduled_at: scheduledAt, availability });
}
</script>
