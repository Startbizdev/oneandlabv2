<template>
  <div class="space-y-3">
    <UFormField label="Type de planification">
      <USelect v-model="planningMode" :items="planningModeItems" />
    </UFormField>

    <UFormField v-if="planningMode !== 'custom_dates'" label="Date de début">
      <UInput v-model="startDate" type="date" />
    </UFormField>

    <UFormField v-if="planningMode === 'interval'" label="Tous les (jours)">
      <UInput v-model="everyDays" type="number" min="1" />
    </UFormField>

    <div v-if="planningMode === 'weekdays'" class="space-y-2">
      <p class="text-sm font-medium">Jours de la semaine</p>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="d in weekdayOptions"
          :key="d.value"
          size="xs"
          :variant="weekdays.includes(d.value) ? 'solid' : 'outline'"
          @click="toggleWeekday(d.value)"
        >
          {{ d.label }}
        </UButton>
      </div>
    </div>

    <UFormField v-if="planningMode !== 'custom_dates'" label="Date de fin (optionnelle)">
      <UInput
        v-model="endDate"
        type="date"
        :disabled="openEnded && (planningMode === 'interval' || planningMode === 'weekdays')"
      />
    </UFormField>

    <div
      v-if="planningMode === 'interval' || planningMode === 'weekdays'"
      class="rounded-xl border p-3 transition-colors"
      :class="openEnded
        ? 'border-primary-300 bg-primary-50 dark:border-primary-600 dark:bg-primary-950/30'
        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40'"
    >
      <UCheckbox
        v-model="openEnded"
        label="Passage chronique (sans date de fin)"
        :ui="{ label: 'text-sm font-semibold' }"
        @update:model-value="onOpenEndedToggle"
      />
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Les passages sont planifiés sur 1 an, renouvelables ensuite.
      </p>
    </div>

    <template v-if="planningMode === 'custom_dates'">
      <UFormField label="Ajouter une date">
        <UInput v-model="customDateInput" type="date" @change="addCustomDate" />
      </UFormField>
      <div v-if="customDates.length" class="flex flex-wrap gap-2">
        <UBadge
          v-for="d in customDates"
          :key="d"
          color="primary"
          variant="subtle"
          class="cursor-pointer"
          @click="removeCustomDate(d)"
        >
          {{ d }} ×
        </UBadge>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PassagePlanningFormState } from '~/utils/passage-planning';

const state = defineModel<PassagePlanningFormState>({ required: true });

const planningModeItems = [
  { label: 'Un seul jour', value: 'single_day' },
  { label: 'Intervalle régulier', value: 'interval' },
  { label: 'Jours de la semaine', value: 'weekdays' },
  { label: 'Dates personnalisées', value: 'custom_dates' },
  { label: 'Ajout manuel', value: 'manual' },
];

const weekdayOptions = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mer', value: 3 },
  { label: 'Jeu', value: 4 },
  { label: 'Ven', value: 5 },
  { label: 'Sam', value: 6 },
  { label: 'Dim', value: 7 },
];

const customDateInput = ref('');

const planningMode = computed({
  get: () => state.value.planningMode,
  set: (v) => { state.value = { ...state.value, planningMode: v as PassagePlanningFormState['planningMode'] }; },
});
const startDate = computed({
  get: () => state.value.startDate,
  set: (v) => { state.value = { ...state.value, startDate: v }; },
});
const endDate = computed({
  get: () => state.value.endDate,
  set: (v) => { state.value = { ...state.value, endDate: v, openEnded: false }; },
});
const openEnded = computed({
  get: () => state.value.openEnded,
  set: (v) => { state.value = { ...state.value, openEnded: v }; },
});
const everyDays = computed({
  get: () => state.value.everyDays,
  set: (v) => { state.value = { ...state.value, everyDays: v }; },
});
const weekdays = computed({
  get: () => state.value.weekdays,
  set: (v) => { state.value = { ...state.value, weekdays: v }; },
});
const customDates = computed({
  get: () => state.value.customDates,
  set: (v) => { state.value = { ...state.value, customDates: v }; },
});

function onOpenEndedToggle(v: boolean) {
  state.value = {
    ...state.value,
    openEnded: v,
    ...(v ? { endDate: '' } : {}),
  };
}

function toggleWeekday(iso: number) {
  if (weekdays.value.includes(iso)) {
    weekdays.value = weekdays.value.filter((d) => d !== iso);
  } else {
    weekdays.value = [...weekdays.value, iso].sort((a, b) => a - b);
  }
}

function addCustomDate() {
  const d = customDateInput.value;
  if (!d || customDates.value.includes(d)) return;
  customDates.value = [...customDates.value, d].sort();
  customDateInput.value = '';
}

function removeCustomDate(d: string) {
  customDates.value = customDates.value.filter((x) => x !== d);
}
</script>
