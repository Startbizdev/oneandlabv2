<template>
  <UModal v-model:open="openProxy" :ui="{ content: 'max-w-lg w-full' }">
    <template #content>
      <div class="max-h-[85vh] space-y-4 overflow-y-auto p-4">
        <div class="flex items-start justify-between gap-3">
          <h3 class="text-lg font-semibold">{{ transmission ? 'Modifier la transmission' : 'Nouvelle transmission' }}</h3>
          <UButton icon="i-lucide-x" variant="ghost" color="neutral" aria-label="Fermer" @click="close" />
        </div>

        <UFormField label="Jour du soin">
          <UInput :model-value="draft.occurredOn" type="date" :max="today" @update:model-value="onDateChange" />
        </UFormField>

        <div class="space-y-2">
          <p class="text-sm font-medium text-default">Soins réalisés</p>
          <p v-if="showsCatalog" class="text-xs text-muted">Aucun passage ce jour-là : choisissez dans le catalogue.</p>
          <p v-if="loadingCare" class="text-xs text-muted">Chargement des soins…</p>
          <p v-else-if="careError" class="text-xs text-error">{{ careError }}</p>
          <div v-if="options.length" class="flex flex-wrap gap-2">
            <UButton
              v-for="item in options"
              :key="careItemKey(item)"
              size="sm"
              :variant="isSelected(item) ? 'soft' : 'outline'"
              :color="isSelected(item) ? 'primary' : 'neutral'"
              :icon="isSelected(item) ? 'i-lucide-check' : undefined"
              :aria-pressed="isSelected(item)"
              @click="toggle(item)"
            >
              {{ item.label }}
            </UButton>
          </div>
        </div>

        <UFormField label="Transmission">
          <UTextarea
            v-model="draft.body"
            :rows="5"
            :maxlength="TRANSMISSION_BODY_MAX_LENGTH"
            placeholder="Observations, évolution, consignes…"
            class="w-full"
          />
        </UFormField>

        <UCheckbox v-model="draft.forDoctor" label="Pour le médecin : le médecin du dossier est notifié" />

        <p v-if="error" class="text-sm text-error" role="alert">{{ error }}</p>

        <UButton block :loading="saving" :disabled="!draft.body.trim()" @click="save">Enregistrer</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import {
  TRANSMISSION_BODY_MAX_LENGTH,
  type PatientTransmission,
  type TransmissionCareItem,
  type TransmissionCareItemsForDate,
} from '@oneandlab/shared-types';
import {
  appointmentDayFrance,
  careItemKey,
  initialTransmissionDraft,
  toggleCareItem,
  transmissionCareOptions,
  transmissionInputFromDraft,
  withOccurredOn,
} from '@oneandlab/shared-utils';
import { apiFetch } from '~/utils/api';

const props = defineProps<{
  open: boolean;
  patientId: string;
  /** Modification par son auteur (moins de 24 h). */
  transmission?: PatientTransmission | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  saved: [];
}>();

const openProxy = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
});

const today = appointmentDayFrance(new Date());
const draft = ref(initialTransmissionDraft(today));
const careItems = ref<TransmissionCareItemsForDate | undefined>(undefined);
const loadingCare = ref(false);
const careError = ref<string | null>(null);
const saving = ref(false);
const error = ref<string | null>(null);

const options = computed(() => transmissionCareOptions(careItems.value, draft.value.selected));
const showsCatalog = computed(() => careItems.value !== undefined && careItems.value.passage_items.length === 0);

function isSelected(item: TransmissionCareItem): boolean {
  const key = careItemKey(item);
  return draft.value.selected.some((s) => careItemKey(s) === key);
}

function toggle(item: TransmissionCareItem) {
  draft.value = { ...draft.value, selected: toggleCareItem(draft.value.selected, item) };
}

function onDateChange(value: string | number) {
  const iso = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
  draft.value = withOccurredOn(draft.value, iso > today ? today : iso);
  void loadCareItems();
}

async function loadCareItems() {
  const date = draft.value.occurredOn;
  loadingCare.value = true;
  careError.value = null;
  try {
    const res = await apiFetch<{ success: boolean; data?: TransmissionCareItemsForDate; error?: string }>(
      `/patients/${encodeURIComponent(props.patientId)}/transmission-care-items?date=${encodeURIComponent(date)}`,
    );
    if (!res.success || !res.data) throw new Error(res.error ?? 'Soins indisponibles');
    if (draft.value.occurredOn === date) careItems.value = res.data;
  } catch (e) {
    careItems.value = undefined;
    careError.value = e instanceof Error ? e.message : 'Soins indisponibles';
  } finally {
    loadingCare.value = false;
  }
}

function close() {
  openProxy.value = false;
}

async function save() {
  if (!draft.value.body.trim() || saving.value) return;
  saving.value = true;
  error.value = null;
  const base = `/patients/${encodeURIComponent(props.patientId)}/transmissions`;
  try {
    const res = await apiFetch<{ success: boolean; error?: string }>(
      props.transmission ? `${base}?transmission_id=${encodeURIComponent(props.transmission.id)}` : base,
      {
        method: props.transmission ? 'PATCH' : 'POST',
        body: transmissionInputFromDraft(draft.value, careItems.value),
      },
    );
    if (!res.success) throw new Error(res.error ?? 'Enregistrement impossible');
    emit('saved');
    close();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Enregistrement impossible';
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    draft.value = initialTransmissionDraft(today, props.transmission);
    careItems.value = undefined;
    error.value = null;
    void loadCareItems();
  },
);
</script>
