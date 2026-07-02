<template>
  <UModal v-model:open="openProxy" :ui="{ content: 'max-w-md w-full' }">
    <template #content>
      <div class="p-4 space-y-4 max-h-[85vh] overflow-y-auto">
        <div class="flex items-start justify-between gap-3">
          <h3 class="text-lg font-semibold">{{ title }}</h3>
          <UButton icon="i-lucide-x" variant="ghost" color="neutral" @click="close" />
        </div>

        <div v-if="!isEdit" class="flex flex-wrap gap-2">
          <UButton
            v-for="item in CLINICAL_VITAL_UI"
            :key="item.type"
            size="sm"
            :variant="vitalType === item.type ? 'solid' : 'outline'"
            @click="vitalType = item.type"
          >
            {{ item.emoji }} {{ item.label_fr }}
          </UButton>
        </div>

        <template v-if="vitalConfig?.has_secondary">
          <UFormField label="Systolique (mmHg)">
            <UInput v-model="value" type="number" inputmode="decimal" placeholder="120" />
          </UFormField>
          <UFormField label="Diastolique (mmHg)">
            <UInput v-model="valueSecondary" type="number" inputmode="decimal" placeholder="80" />
          </UFormField>
        </template>
        <UFormField v-else :label="`Valeur (${vitalConfig?.unit ?? ''})`">
          <UInput v-model="value" type="number" inputmode="decimal" />
        </UFormField>

        <UFormField label="Note (optionnelle)">
          <UTextarea v-model="notes" placeholder="Contexte, position, remarque…" :rows="2" />
        </UFormField>

        <p v-if="error" class="text-sm text-error">{{ error }}</p>

        <div class="flex flex-wrap gap-2 pt-1">
          <UButton :loading="saving" @click="save">{{ isEdit ? 'Enregistrer' : 'Ajouter' }}</UButton>
          <UButton v-if="isEdit" color="error" variant="soft" :loading="deleting" @click="remove">
            Supprimer
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type {
  ClinicalVitalContext,
  ClinicalVitalReading,
  ClinicalVitalType,
} from '@oneandlab/shared-types';
import { CLINICAL_VITAL_UI } from '@oneandlab/shared-types';

const props = defineProps<{
  open: boolean;
  patientId: string;
  reading?: ClinicalVitalReading | null;
  initialType?: ClinicalVitalType | null;
  context?: ClinicalVitalContext;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  saved: [];
}>();

const runtimeConfig = useRuntimeConfig();
const apiBase = runtimeConfig.public.apiBase || 'http://localhost:8888/api';

const openProxy = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
});

const isEdit = computed(() => Boolean(props.reading?.id));
const vitalType = ref<ClinicalVitalType>('heart_rate');
const value = ref('');
const valueSecondary = ref('');
const notes = ref('');
const saving = ref(false);
const deleting = ref(false);
const error = ref<string | null>(null);

const vitalConfig = computed(() => CLINICAL_VITAL_UI.find((c) => c.type === vitalType.value));

const title = computed(() =>
  isEdit.value
    ? `Modifier — ${vitalConfig.value?.label_fr ?? 'Constante'}`
    : vitalConfig.value?.label_fr ?? 'Nouvelle constante',
);

watch(
  () => [props.open, props.reading, props.initialType] as const,
  () => {
    if (!props.open) return;
    error.value = null;
    vitalType.value = props.reading?.vital_type ?? props.initialType ?? 'heart_rate';
    value.value = props.reading ? String(props.reading.value) : '';
    valueSecondary.value =
      props.reading?.value_secondary != null ? String(props.reading.value_secondary) : '';
    notes.value = props.reading?.notes ?? '';
  },
);

function parseNum(raw: string): number | null {
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

async function save() {
  error.value = null;
  const num = parseNum(value.value);
  if (num == null) {
    error.value = 'Valeur invalide';
    return;
  }
  saving.value = true;
  try {
    const body: Record<string, unknown> = {
      vital_type: vitalType.value,
      value: num,
      notes: notes.value.trim() || null,
    };
    if (vitalConfig.value?.has_secondary) {
      const sec = parseNum(valueSecondary.value);
      if (sec == null) {
        error.value = 'Diastolique requise';
        return;
      }
      body.value_secondary = sec;
    }
    if (props.context) {
      body.context_type = props.context.type;
      body.context_id = props.context.id ?? null;
    }

    const url = isEdit.value
      ? `${apiBase}/patients/${encodeURIComponent(props.patientId)}/clinical-vitals?vital_id=${encodeURIComponent(props.reading!.id)}`
      : `${apiBase}/patients/${encodeURIComponent(props.patientId)}/clinical-vitals`;

    const res = await $fetch<{ success: boolean; error?: string }>(url, {
      method: isEdit.value ? 'PATCH' : 'POST',
      credentials: 'include',
      body,
    });
    if (!res.success) throw new Error(res.error ?? 'Enregistrement impossible');
    emit('saved');
    close();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erreur';
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!props.reading?.id) return;
  deleting.value = true;
  error.value = null;
  try {
    const res = await $fetch<{ success: boolean; error?: string }>(
      `${apiBase}/patients/${encodeURIComponent(props.patientId)}/clinical-vitals?vital_id=${encodeURIComponent(props.reading.id)}`,
      { method: 'DELETE', credentials: 'include' },
    );
    if (!res.success) throw new Error(res.error ?? 'Suppression impossible');
    emit('saved');
    close();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erreur';
  } finally {
    deleting.value = false;
  }
}

function close() {
  openProxy.value = false;
}
</script>
