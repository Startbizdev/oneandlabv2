<template>
  <div class="space-y-2.5">
    <p class="text-xs font-semibold uppercase tracking-wide text-muted">Constantes médicales</p>

    <div v-if="loading" class="grid grid-cols-3 gap-1.5 min-[360px]:grid-cols-4 min-[360px]:gap-2">
      <div v-for="i in 8" :key="i" class="h-[6rem] animate-pulse rounded-xl bg-elevated min-[360px]:h-[6.5rem]" />
    </div>

    <div v-else class="grid grid-cols-3 gap-1.5 min-[360px]:grid-cols-4 min-[360px]:gap-2">
      <button
        type="button"
        class="flex min-h-[6rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-2 transition hover:bg-primary/10 min-[360px]:min-h-[6.5rem] min-[360px]:gap-2 min-[360px]:p-2.5"
        @click="openAdd()"
      >
        <span class="flex size-8 items-center justify-center rounded-lg bg-primary/10 min-[360px]:size-9">
          <UIcon name="i-lucide-plus" class="size-4 text-primary min-[360px]:size-5" />
        </span>
        <span class="text-xs font-semibold text-primary">Ajouter</span>
      </button>

      <button
        v-for="cfg in CLINICAL_VITAL_UI"
        :key="cfg.type"
        type="button"
        class="flex min-h-[6rem] flex-col rounded-xl border p-2 text-left transition hover:opacity-90 min-[360px]:min-h-[6.5rem] min-[360px]:p-2.5"
        :class="latest[cfg.type] ? 'border-primary/30 bg-primary/5' : 'border-default/50 bg-elevated/30'"
        @click="latest[cfg.type] ? openHistory(cfg.type) : openAdd(cfg.type)"
      >
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-elevated/80 text-lg leading-none min-[360px]:size-9 min-[360px]:text-xl"
          aria-hidden="true"
        >
          {{ cfg.emoji }}
        </span>
        <span
          class="mt-1 truncate text-[10px] font-medium leading-tight text-muted min-[360px]:text-[11px]"
          :title="cfg.label_fr"
        >
          {{ cfg.card_label_fr }}
        </span>
        <div class="mt-auto flex flex-col gap-0.5">
          <template v-if="latest[cfg.type]">
            <span class="inline-flex flex-wrap items-baseline gap-0.5">
              <span class="text-sm font-bold leading-tight text-default min-[360px]:text-base">
                {{ formatClinicalVitalCardValue(latest[cfg.type]!) }}
              </span>
              <span class="text-xs font-medium text-muted">{{ cfg.unit }}</span>
            </span>
            <span class="truncate text-[10px] leading-tight text-muted min-[360px]:text-[11px]">
              {{ formatClinicalVitalCardDate(latest[cfg.type]!.recorded_at) }}
            </span>
          </template>
          <span v-else class="text-sm leading-tight text-muted min-[360px]:text-base">—</span>
        </div>
      </button>
    </div>

    <PatientClinicalVitalHistoryModal
      v-model:open="historyOpen"
      ref="historyModalRef"
      :patient-id="patientId"
      :vital-type="historyType"
      @add="(type) => openAdd(type)"
      @edit="openEdit"
    />

    <PatientClinicalVitalModal
      v-model:open="modalOpen"
      :patient-id="patientId"
      :reading="editReading"
      :initial-type="addType"
      :context="context"
      @saved="load"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  ClinicalVitalContext,
  ClinicalVitalReading,
  ClinicalVitalType,
  ClinicalVitalsListResponse,
} from '@oneandlab/shared-types';
import { CLINICAL_VITAL_UI } from '@oneandlab/shared-types';
import {
  formatClinicalVitalCardDate,
  formatClinicalVitalCardValue,
} from '~/utils/clinical-vital-display';
import PatientClinicalVitalHistoryModal from '~/components/dashboard/PatientClinicalVitalHistoryModal.vue';
import PatientClinicalVitalModal from '~/components/dashboard/PatientClinicalVitalModal.vue';

const props = defineProps<{
  patientId: string;
  context?: ClinicalVitalContext;
}>();

const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:8888/api';

const loading = ref(true);
const latest = ref<Partial<Record<ClinicalVitalType, ClinicalVitalReading>>>({});
const modalOpen = ref(false);
const historyOpen = ref(false);
const historyType = ref<ClinicalVitalType | null>(null);
const historyModalRef = ref<{ reload: () => Promise<void> } | null>(null);
const editReading = ref<ClinicalVitalReading | null>(null);
const addType = ref<ClinicalVitalType | null>(null);

function openHistory(type: ClinicalVitalType) {
  historyType.value = type;
  historyOpen.value = true;
}

function openAdd(type?: ClinicalVitalType) {
  editReading.value = null;
  addType.value = type ?? null;
  modalOpen.value = true;
}

function openEdit(reading: ClinicalVitalReading) {
  editReading.value = reading;
  addType.value = null;
  modalOpen.value = true;
}

async function load() {
  if (!props.patientId) return;
  loading.value = true;
  try {
    const res = await $fetch<{ success: boolean; data?: ClinicalVitalsListResponse; error?: string }>(
      `${apiBase}/patients/${encodeURIComponent(props.patientId)}/clinical-vitals`,
      { credentials: 'include' },
    );
    if (!res.success || !res.data) throw new Error(res.error ?? 'Erreur');
    latest.value = res.data.latest_by_type ?? {};
    if (historyOpen.value) await historyModalRef.value?.reload();
  } catch {
    latest.value = {};
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.patientId,
  () => {
    void load();
  },
  { immediate: true },
);
</script>
