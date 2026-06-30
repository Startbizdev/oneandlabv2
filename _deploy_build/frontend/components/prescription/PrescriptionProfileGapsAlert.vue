<template>
  <div
    v-if="gaps.length > 0"
    class="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-4 flex gap-3"
    role="status"
  >
    <UIcon name="i-lucide-triangle-alert" class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
    <div class="min-w-0 flex-1 space-y-3">
      <div>
        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
          À compléter pour l'ordonnance
        </p>
        <p class="text-xs text-muted mt-1 leading-relaxed">
          Ces informations figureront sur le PDF. Vous pouvez générer quand même, mais le document sera incomplet.
        </p>
      </div>

      <div v-if="patientGaps.length > 0" class="space-y-1.5">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Fiche patient
        </p>
        <div
          v-for="gap in patientGaps"
          :key="gap.id"
          class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
        >
          <span class="text-gray-800 dark:text-gray-200">· {{ gap.message }}</span>
          <button
            type="button"
            class="font-semibold text-primary hover:underline"
            @click="onGapAction(gap)"
          >
            {{ gap.actionLabel }}
          </button>
        </div>
      </div>

      <div v-if="prescriberGaps.length > 0" class="space-y-1.5">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Votre profil
        </p>
        <div
          v-for="gap in prescriberGaps"
          :key="gap.id"
          class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
        >
          <span class="text-gray-800 dark:text-gray-200">· {{ gap.message }}</span>
          <button
            type="button"
            class="font-semibold text-primary hover:underline"
            @click="onGapAction(gap)"
          >
            {{ gap.actionLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PrescriptionProfileGap } from '@oneandlab/shared-utils';

const props = defineProps<{
  gaps: PrescriptionProfileGap[];
  patientId?: string;
  prescriberRole?: string;
}>();

const emit = defineEmits<{
  signPrescriber: [];
}>();

const patientGaps = computed(() => props.gaps.filter((g) => g.action === 'edit_patient'));
const prescriberGaps = computed(() => props.gaps.filter((g) => g.action !== 'edit_patient'));

function onGapAction(gap: PrescriptionProfileGap) {
  if (gap.action === 'edit_patient' && props.patientId) {
    navigateTo(`/profile?userId=${encodeURIComponent(props.patientId)}`);
    return;
  }
  if (gap.action === 'sign_prescriber') {
    emit('signPrescriber');
    return;
  }
  navigateTo('/profile');
}
</script>
