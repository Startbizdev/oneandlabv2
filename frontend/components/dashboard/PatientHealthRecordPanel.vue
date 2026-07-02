<template>
  <UCard class="overflow-hidden ring-1 ring-default/60">
    <template #header>
      <h2 class="text-lg font-normal flex items-center gap-2">
        <UIcon name="i-lucide-heart-pulse" class="w-5 h-5 text-primary shrink-0" />
        Carnet de santé
      </h2>
    </template>

    <div v-if="loading" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Carnet inaccessible"
      :description="error"
    />

    <template v-else-if="recap">
      <UAlert
        color="warning"
        variant="soft"
        class="mb-4"
        title="Données déclarées par le patient"
        :description="
          editable
            ? 'Vous pouvez les compléter ou corriger ici.'
            : 'À confirmer en consultation — lecture seule.'
        "
      />

      <div class="mb-4 flex items-center gap-4 rounded-xl border border-default/60 bg-elevated/30 p-4">
        <div class="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg width="64" height="64" class="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" stroke-width="5" class="text-default/15" />
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="currentColor"
              stroke-width="5"
              :stroke-dasharray="`${ringCirc} ${ringCirc}`"
              :stroke-dashoffset="ringOffset"
              stroke-linecap="round"
              class="text-primary"
            />
          </svg>
          <span class="relative text-sm font-bold text-default">{{ percent }}%</span>
        </div>
        <div class="min-w-0">
          <p class="font-semibold text-default">Carnet de santé</p>
          <p class="text-sm text-muted">{{ heroSubtitle }}</p>
        </div>
      </div>

      <PatientClinicalVitalsPanel
        v-if="clinicalVitals"
        class="mb-4"
        :patient-id="patientId"
        :context="clinicalVitalContext"
      />

      <div class="space-y-4">
        <div
          v-for="section in recap.sections ?? []"
          :key="section.id"
          class="rounded-xl border border-default/50 p-4 space-y-3"
        >
          <component
            :is="editable ? 'button' : 'div'"
            :type="editable ? 'button' : undefined"
            class="w-full text-left space-y-2"
            :class="editable ? 'hover:opacity-90 transition' : ''"
            @click="editable ? openSection(section.id) : undefined"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-default flex items-center gap-2">
                <span aria-hidden="true">{{ sectionEmoji(section.id) }}</span>
                {{ section.label_fr }}
              </p>
              <UIcon v-if="editable" name="i-lucide-chevron-right" class="size-5 shrink-0 text-muted" />
            </div>
            <div class="flex items-center gap-2">
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-default/10">
                <div
                  class="h-full rounded-full bg-success transition-all"
                  :style="{ width: `${sectionProgress(section)}%` }"
                />
              </div>
              <UBadge
                :color="sectionFilled(section) >= section.items.length ? 'success' : 'warning'"
                variant="subtle"
                size="sm"
              >
                {{
                  sectionFilled(section) >= section.items.length
                    ? 'Complet'
                    : `${sectionFilled(section)}/${section.items.length}`
                }}
              </UBadge>
            </div>
          </component>

          <ul class="space-y-3">
            <li v-for="item in section.items" :key="item.key" class="space-y-1">
              <p class="text-xs font-medium text-muted">{{ item.label_fr }}</p>
              <div
                v-if="!isEmptyDisplay(item.display)"
                class="flex items-start gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2.5"
              >
                <UIcon name="i-lucide-circle-check" class="mt-0.5 size-4 shrink-0 text-success" />
                <span class="text-sm font-semibold text-default">{{ formatItemDisplay(item.display) }}</span>
              </div>
              <div
                v-else
                class="flex items-center gap-2 rounded-lg border border-dashed border-default/40 bg-elevated/40 px-3 py-2.5"
              >
                <UIcon name="i-lucide-circle-dashed" class="size-4 shrink-0 text-muted" />
                <span class="text-sm text-muted">{{ HEALTH_RECORD_EMPTY_LABEL }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <p v-if="recap.disclaimer_fr" class="mt-4 text-xs text-muted">
        {{ recap.disclaimer_fr }}
      </p>
    </template>

    <PatientHealthRecordSectionModal
      v-if="editable"
      v-model:open="sectionModalOpen"
      :patient-id="patientId"
      :section-id="editSectionId"
      @saved="load"
    />
  </UCard>
</template>

<script setup lang="ts">
import { healthRecordStaffHeroSubtitle } from '~/utils/health-record-display';
import PatientHealthRecordSectionModal from '~/components/dashboard/PatientHealthRecordSectionModal.vue';
import PatientClinicalVitalsPanel from '~/components/dashboard/PatientClinicalVitalsPanel.vue';
import type { ClinicalVitalContext } from '@oneandlab/shared-types';

const props = defineProps<{
  patientId: string;
  editable?: boolean;
  /** Afficher les constantes médicales (infirmier / pro). */
  clinicalVitals?: boolean;
  clinicalVitalContext?: ClinicalVitalContext;
}>();

interface HealthRecordRecap {
  completion?: { percent?: number; missing_count?: number };
  sections?: Array<{
    id: string;
    label_fr: string;
    items: Array<{ key: string; label_fr: string; display: string }>;
  }>;
  open_gaps?: Array<{ gap_key: string; label_fr: string }>;
  disclaimer_fr?: string;
}

const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:8888/api';

const loading = ref(true);
const error = ref<string | null>(null);
const recap = ref<HealthRecordRecap | null>(null);
const sectionModalOpen = ref(false);
const editSectionId = ref<string | null>(null);

const HEALTH_RECORD_EMPTY_LABEL = 'Non renseigné';
const ringCirc = 2 * Math.PI * 26;

const SECTION_EMOJI: Record<string, string> = {
  general: '📏',
  cardio: '💓',
  metabolic: '🍎',
  allergies: '🤧',
  treatments: '💊',
  lifestyle: '🌿',
  surgical: '🩹',
  family: '🧬',
  gynecology: '🤰',
};

const percent = computed(() => recap.value?.completion?.percent ?? 0);
const ringOffset = computed(() => ringCirc - (percent.value / 100) * ringCirc);
const heroSubtitle = computed(() =>
  healthRecordStaffHeroSubtitle(
    percent.value,
    recap.value?.completion?.missing_count ?? 0,
  ),
);

function sectionEmoji(sectionId: string): string {
  return SECTION_EMOJI[sectionId] ?? '📋';
}

function isEmptyDisplay(display: string | undefined): boolean {
  if (!display?.trim()) return true;
  return display === HEALTH_RECORD_EMPTY_LABEL || display === '—';
}

function formatItemDisplay(display: string | undefined): string {
  if (!display?.trim() || display === '—') return HEALTH_RECORD_EMPTY_LABEL;
  return display;
}

function sectionFilled(section: { items: Array<{ display: string }> }): number {
  return section.items.filter((item) => !isEmptyDisplay(item.display)).length;
}

function sectionProgress(section: { items: Array<{ display: string }> }): number {
  if (!section.items.length) return 0;
  return Math.round((sectionFilled(section) / section.items.length) * 100);
}

function openSection(sectionId: string) {
  editSectionId.value = sectionId;
  sectionModalOpen.value = true;
}

async function load() {
  if (!props.patientId) return;
  loading.value = true;
  error.value = null;
  try {
    const res = await $fetch<{ success: boolean; data?: HealthRecordRecap; error?: string }>(
      `${apiBase}/patients/${encodeURIComponent(props.patientId)}/health-record`,
      { credentials: 'include' },
    );
    if (!res.success || !res.data) {
      throw new Error(res.error ?? 'Carnet indisponible');
    }
    recap.value = res.data;
  } catch (e) {
    recap.value = null;
    error.value = e instanceof Error ? e.message : 'Erreur de chargement';
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
