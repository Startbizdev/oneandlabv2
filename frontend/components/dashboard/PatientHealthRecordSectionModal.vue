<template>
  <UModal v-model:open="openProxy" :ui="{ content: 'max-w-lg w-full' }">
    <template #content>
      <div class="p-4 space-y-4 max-h-[85vh] overflow-y-auto">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold">{{ sectionTitle }}</h3>
            <p v-if="questions.length" class="text-sm text-muted mt-1">
              Question {{ stepIndex + 1 }} / {{ questions.length }}
            </p>
          </div>
          <UButton icon="i-lucide-x" variant="ghost" color="neutral" @click="close" />
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
        </div>

        <template v-else-if="currentQuestion">
          <p class="font-medium text-default">{{ currentQuestion.label_fr }}</p>

          <div v-if="currentQuestion.type === 'yes_no_unknown'" class="flex flex-wrap gap-2">
            <UButton
              v-for="opt in yesNoOptions"
              :key="opt.value"
              :variant="String(savedAnswers[currentQuestion.key]) === opt.value ? 'solid' : 'outline'"
              @click="saveAnswer(opt.value)"
            >
              {{ opt.label }}
            </UButton>
          </div>

          <USelect
            v-else-if="currentQuestion.type === 'enum' && currentQuestion.options?.length"
            :model-value="String(savedAnswers[currentQuestion.key] ?? '')"
            :items="currentQuestion.options.map((o) => ({ label: enumLabel(o), value: o }))"
            value-key="value"
            placeholder="Choisir"
            @update:model-value="(v: string) => saveAnswer(v)"
          />

          <UInput
            v-else-if="currentQuestion.type === 'number'"
            :model-value="String(draftValue)"
            type="number"
            @update:model-value="(v: string) => (draftValue = v)"
          />

          <UTextarea
            v-else-if="currentQuestion.type === 'textarea'"
            :model-value="String(draftValue)"
            @update:model-value="(v: string) => (draftValue = v)"
          />

          <UInput
            v-else
            :model-value="String(draftValue)"
            @update:model-value="(v: string) => (draftValue = v)"
          />

          <div class="flex flex-wrap gap-2 pt-2">
            <UButton
              v-if="currentQuestion.type !== 'yes_no_unknown' && currentQuestion.type !== 'enum'"
              :loading="saving"
              @click="saveAnswer(parseDraftValue())"
            >
              Enregistrer
            </UButton>
            <UButton variant="ghost" color="neutral" @click="skipQuestion">Passer</UButton>
            <UButton v-if="stepIndex > 0" variant="outline" @click="stepIndex -= 1">Précédent</UButton>
          </div>
        </template>

        <p v-else class="text-sm text-muted">Aucune question dans cette section.</p>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  patientId: string;
  sectionId: string | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  saved: [];
}>();

const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:8888/api';

interface HealthRecordQuestion {
  key: string;
  label_fr: string;
  type: string;
  options?: string[];
}

interface HealthRecordSection {
  id: string;
  label_fr: string;
  questions: HealthRecordQuestion[];
}

interface RecapItem {
  key: string;
  value: unknown;
}

const openProxy = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
});

const loading = ref(false);
const saving = ref(false);
const stepIndex = ref(0);
const draftValue = ref('');
const schemaSections = ref<HealthRecordSection[]>([]);
const savedAnswers = ref<Record<string, unknown>>({});

const yesNoOptions = [
  { label: 'Oui', value: 'yes' },
  { label: 'Non', value: 'no' },
  { label: 'Je ne sais pas', value: 'unknown' },
];

const ENUM_LABELS: Record<string, string> = {
  never: 'Jamais',
  former: 'Ancien fumeur',
  yes: 'Oui',
  no: 'Non',
  unknown: 'Je ne sais pas',
  occasional: 'Occasionnel',
  regular: 'Régulier',
  sedentary: 'Sédentaire',
  moderate: 'Modérée',
  active: 'Active',
};

function enumLabel(v: string): string {
  return ENUM_LABELS[v] ?? v;
}

const section = computed(() =>
  schemaSections.value.find((s) => s.id === props.sectionId) ?? null,
);

const sectionTitle = computed(() => section.value?.label_fr ?? 'Carnet de santé');
const questions = computed(() => section.value?.questions ?? []);
const currentQuestion = computed(() => questions.value[stepIndex.value] ?? null);

watch(
  () => [props.open, props.sectionId, props.patientId] as const,
  () => {
    if (props.open && props.sectionId && props.patientId) void load();
  },
);

watch(currentQuestion, (q) => {
  if (!q) return;
  const saved = savedAnswers.value[q.key];
  draftValue.value =
    saved !== undefined && saved !== null && saved !== '' ? String(saved) : '';
});

async function load() {
  loading.value = true;
  stepIndex.value = 0;
  try {
    const [schemaRes, recapRes] = await Promise.all([
      $fetch<{ success: boolean; data?: { sections: HealthRecordSection[] } }>(
        `${apiBase}/health-record/schema`,
        { credentials: 'include' },
      ),
      $fetch<{ success: boolean; data?: { sections: Array<{ items: RecapItem[] }> } }>(
        `${apiBase}/patients/${encodeURIComponent(props.patientId)}/health-record`,
        { credentials: 'include' },
      ),
    ]);
    schemaSections.value = schemaRes.data?.sections ?? [];
    const map: Record<string, unknown> = {};
    for (const sec of recapRes.data?.sections ?? []) {
      for (const item of sec.items ?? []) {
        if (item.key) map[item.key] = item.value;
      }
    }
    savedAnswers.value = map;
  } finally {
    loading.value = false;
  }
}

function parseDraftValue(): unknown {
  const q = currentQuestion.value;
  if (!q) return '';
  if (q.type === 'number') {
    const n = Number(draftValue.value);
    return Number.isFinite(n) ? n : draftValue.value;
  }
  return draftValue.value;
}

async function saveAnswer(value: unknown) {
  const q = currentQuestion.value;
  if (!q || saving.value) return;
  saving.value = true;
  try {
    const res = await $fetch<{ success: boolean; data?: unknown; error?: string }>(
      `${apiBase}/patients/${encodeURIComponent(props.patientId)}/health-record`,
      {
        method: 'PATCH',
        credentials: 'include',
        body: { answers: { [q.key]: { value } } },
      },
    );
    if (!res.success) throw new Error(res.error ?? 'Enregistrement impossible');
    savedAnswers.value = { ...savedAnswers.value, [q.key]: value };
    advance();
    emit('saved');
  } catch (e) {
    console.error(e);
  } finally {
    saving.value = false;
  }
}

function skipQuestion() {
  advance();
}

function advance() {
  if (stepIndex.value < questions.value.length - 1) {
    stepIndex.value += 1;
  } else {
    close();
  }
}

function close() {
  openProxy.value = false;
}
</script>
