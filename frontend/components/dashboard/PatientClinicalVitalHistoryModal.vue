<template>
  <UModal v-model:open="openModel" :title="title" :ui="{ width: 'sm:max-w-md' }">
    <template #body>
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 4" :key="i" class="h-16 animate-pulse rounded-xl bg-elevated" />
      </div>
      <p v-else-if="error" class="text-sm text-error">{{ error }}</p>
      <div v-else-if="!history.length" class="space-y-3 py-4 text-center">
        <p class="text-sm text-muted">Aucune mesure enregistrée pour cette constante.</p>
        <UButton variant="outline" @click="emitAdd">Ajouter une mesure</UButton>
      </div>
      <ul v-else class="max-h-[min(60vh,28rem)] space-y-2 overflow-y-auto">
        <li v-for="(reading, index) in history" :key="reading.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:opacity-90"
            :class="index === 0 ? 'border-primary/40 bg-primary/5' : 'border-default/50 bg-elevated/20'"
            @click="emitEdit(reading)"
          >
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex items-center justify-between gap-2">
                <span class="text-lg font-bold text-default">
                  {{ formatClinicalVitalCardValue(reading) }}
                  <span class="text-sm font-medium text-muted">{{ unit }}</span>
                </span>
                <span
                  v-if="index === 0"
                  class="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                >
                  Dernière
                </span>
              </div>
              <p class="truncate text-xs text-muted">{{ formatClinicalVitalHistoryDate(reading.recorded_at) }}</p>
              <p class="truncate text-xs text-muted/80">
                Par {{ formatClinicalVitalRecorderName(reading) }}
              </p>
              <p v-if="reading.notes?.trim()" class="line-clamp-2 text-sm text-muted">
                {{ reading.notes.trim() }}
              </p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-muted" />
          </button>
        </li>
      </ul>
    </template>
    <template #footer>
      <UButton block @click="emitAdd">Nouvelle mesure</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type {
  ClinicalVitalReading,
  ClinicalVitalType,
  ClinicalVitalsHistoryResponse,
} from '@oneandlab/shared-types';
import { clinicalVitalUiConfig } from '@oneandlab/shared-types';
import {
  formatClinicalVitalCardValue,
  formatClinicalVitalHistoryDate,
  formatClinicalVitalRecorderName,
} from '~/utils/clinical-vital-display';

const props = defineProps<{
  open: boolean;
  patientId: string;
  vitalType: ClinicalVitalType | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  add: [type: ClinicalVitalType];
  edit: [reading: ClinicalVitalReading];
}>();

const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:8888/api';

const loading = ref(false);
const error = ref('');
const history = ref<ClinicalVitalReading[]>([]);
const unit = ref('');

const openModel = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
});

const title = computed(() => {
  const cfg = props.vitalType ? clinicalVitalUiConfig(props.vitalType) : null;
  return cfg ? `${cfg.emoji} ${cfg.label_fr}` : 'Historique';
});

async function load() {
  if (!props.patientId || !props.vitalType) return;
  loading.value = true;
  error.value = '';
  try {
    const res = await $fetch<{ success: boolean; data?: ClinicalVitalsHistoryResponse; error?: string }>(
      `${apiBase}/patients/${encodeURIComponent(props.patientId)}/clinical-vitals?vital_type=${encodeURIComponent(props.vitalType)}&limit=50`,
      { credentials: 'include' },
    );
    if (!res.success || !res.data) throw new Error(res.error ?? 'Erreur');
    history.value = res.data.history ?? [];
    unit.value = res.data.unit ?? '';
  } catch (e) {
    history.value = [];
    error.value = e instanceof Error ? e.message : 'Historique indisponible';
  } finally {
    loading.value = false;
  }
}

function emitAdd() {
  if (!props.vitalType) return;
  emit('add', props.vitalType);
}

function emitEdit(reading: ClinicalVitalReading) {
  emit('edit', reading);
}

watch(
  () => [props.open, props.patientId, props.vitalType] as const,
  ([open]) => {
    if (open) void load();
  },
  { immediate: true },
);

defineExpose({ reload: load });
</script>
