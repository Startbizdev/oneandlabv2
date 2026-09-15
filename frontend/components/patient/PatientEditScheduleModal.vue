<template>
  <UModal :open="open" title="Modifier date et créneau" description="La modification est possible tant que le rendez-vous attend sa validation." :dismissible="!saving" @update:open="value => { if (!value && !saving) emit('close') }">
    <template #body>
      <div v-if="appointment" class="space-y-5">
        <UFormField label="Date du rendez-vous" required>
          <DatePicker v-model="formDate" class="w-full" :appointment-type="appointment.type === 'blood_test' ? 'lab' : 'nurse'" popover-content-class="z-[1000]" />
        </UFormField>
        <BookingAvailabilityTabs v-model:availability-type="availabilityType" v-model:availability-range="availabilityRange" :format-hour="formatHour" :max-hour="maxHour" :range-slider-min-hour="rangeSliderMinHour" />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full flex-wrap justify-end gap-3">
        <UButton color="neutral" variant="outline" :disabled="saving" @click="emit('close')">Annuler</UButton>
        <UButton :loading="saving" :disabled="!canSubmit" @click="submit">Enregistrer</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { AVAILABILITY_MIN_SPAN_HOURS } from '~/constants/availability-slot';

const props = defineProps<{
  open: boolean;
  appointment: Record<string, unknown> | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const toast = useAppToast();
const saving = ref(false);

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
  () => props.appointment,
  (apt) => {
    if (!apt) return;
    formDate.value = String(apt.scheduled_at ?? '').slice(0, 10);
    const fd = (apt.form_data ?? {}) as Record<string, unknown>;
    const parsed = parseAvailability(fd.availability);
    availabilityType.value = parsed.type;
    availabilityRange.value = parsed.range;
  },
  { immediate: true },
);

const maxHour = computed(() => (props.appointment?.type === 'blood_test' ? 15 : 19));

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

async function submit() {
  if (!props.appointment?.id || !canSubmit.value || saving.value) return;
  const hour = availabilityType.value === 'custom' ? Math.floor(availabilityRange.value[0]) : 9;
  const scheduled_at = `${formDate.value} ${String(hour).padStart(2, '0')}:00:00`;
  const availability =
    availabilityType.value === 'all_day'
      ? { type: 'all_day' }
      : { type: 'custom', range: availabilityRange.value };
  const fd = { ...((props.appointment.form_data as Record<string, unknown>) ?? {}), availability };
  saving.value = true;
  try {
    const res = await apiFetch(`/appointments/${props.appointment.id}`, {
      method: 'PUT',
      body: { scheduled_at, form_data: fd },
    });
    if (!res?.success) {
      toast.add({
        title: 'Erreur',
        description: (res as { error?: string })?.error ?? 'Enregistrement impossible',
        color: 'red',
      });
      return;
    }
    emit('saved');
  } catch (e: unknown) {
    toast.add({
      title: 'Erreur',
      description: e instanceof Error ? e.message : 'Enregistrement impossible',
      color: 'red',
    });
  } finally {
    saving.value = false;
  }
}
</script>
