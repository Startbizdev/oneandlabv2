<template>
  <AppPageShell class="mx-auto max-w-2xl space-y-4">
    <AppPageHeader title="Nouveau passage" :edge-bleed="false" />

    <div v-if="!patientId" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Patient requis — repassez par la sélection patient depuis la tournée.
    </div>

    <template v-else>
      <div v-if="patientName" class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Patient</p>
        <p class="mt-1 text-lg font-bold text-gray-900 dark:text-white">{{ patientName }}</p>
      </div>

      <div class="flex gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900/50">
        <UButton
          v-for="item in tabItems"
          :key="item.value"
          block
          size="sm"
          :variant="tab === item.value ? 'solid' : 'ghost'"
          :color="tab === item.value ? 'primary' : 'neutral'"
          @click="tab = item.value"
        >
          {{ item.label }}
        </UButton>
      </div>

      <div v-if="tab === 'information'" class="space-y-3">
        <PassageFieldRow
          label="Planification"
          :value="planningSummary"
          @click="editModal = 'planning'"
        />
        <PassageFieldRow
          label="Créneaux de passage"
          :value="dailyTimesSummary"
          @click="editModal = 'daily_times'"
        />
        <PassageFieldRow
          label="Lieu"
          :value="locationSummary"
          @click="editModal = 'location'"
        />
        <PassageFieldRow
          label="Durée du passage"
          :value="durationSummary"
          @click="editModal = 'duration'"
        />
        <PassageFieldRow
          label="Soins"
          :value="careSummary"
          :empty="nursingItems.length === 0"
          @click="editModal = 'care'"
        />
        <PassageFieldRow
          label="Note"
          :value="notesSummary"
          :empty="!notes.trim()"
          @click="editModal = 'notes'"
        />

        <UButton block color="primary" :loading="saving" @click="submit">
          Enregistrer le passage
        </UButton>
      </div>

      <div v-else-if="tab === 'documents'" class="space-y-4">
        <template v-if="canGeneratePrescription">
          <UAlert
            color="neutral"
            variant="subtle"
            title="Ordonnance"
            description="Générez une ordonnance ici ou depuis le détail du passage après création. Elle sera rattachée au rendez-vous si vous l'enregistrez depuis la fiche passage."
          />
          <PrescriptionSection
            :patient-id="patientId"
            prescription-kind="nursing"
          />
        </template>
        <UEmpty
          v-else
          icon="i-lucide-file-pen-line"
          title="Génération d'ordonnances désactivée"
          description="Contactez l'administration Cary pour activer cette fonctionnalité."
          variant="outline"
          class="py-12"
        />
      </div>

      <div v-else-if="tab === 'health_record'" class="space-y-4">
        <PatientHealthRecordPanel
          :patient-id="patientId"
          editable
          clinical-vitals
          clinical-vital-context="passage"
        />
      </div>
    </template>

    <UModal v-model:open="planningOpen" title="Planification">
      <div class="space-y-3 p-1">
        <PassagePlanningFormFields v-model="planningState" />
        <UButton block @click="confirmPlanning">Valider</UButton>
      </div>
    </UModal>

    <UModal v-model:open="dailyTimesOpen" title="Créneaux de passage">
      <div class="space-y-3 p-1">
        <p class="text-sm text-gray-500">Choisissez les moments à créer chaque jour (ex. matin + midi).</p>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="item in dailySlotItems"
            :key="item.value"
            size="sm"
            :variant="dailyTimeSlots.some((s) => s.time_slot === item.value) ? 'solid' : 'outline'"
            @click="toggleDailySlot(item.value)"
          >
            {{ item.label }}
          </UButton>
        </div>
        <UButton block @click="editModal = null">Valider</UButton>
      </div>
    </UModal>

    <UModal v-model:open="locationOpen" title="Lieu">
      <div class="space-y-3 p-1">
        <div class="flex items-center justify-between gap-3">
          <p class="font-medium">À domicile</p>
          <USwitch v-model="atHome" />
        </div>
        <p v-if="!atHome" class="text-sm text-gray-500">Adresse cabinet (profil pro)</p>
        <UButton block @click="editModal = null">Valider</UButton>
      </div>
    </UModal>

    <UModal v-model:open="durationOpen" title="Durée du passage">
      <div class="space-y-3 p-1">
        <USelect v-model="duration" :items="durationItems" />
        <UButton block @click="editModal = null">Valider</UButton>
      </div>
    </UModal>

    <UModal v-model:open="careOpen" title="Soins" :ui="{ content: 'max-w-lg' }">
      <div class="space-y-3 p-1">
        <PassageCarePicker v-model="nursingItems" />
        <UButton block @click="editModal = null">Valider</UButton>
      </div>
    </UModal>

    <UModal v-model:open="notesOpen" title="Note">
      <div class="space-y-3 p-1">
        <UTextarea v-model="notes" :rows="4" placeholder="Note interne (optionnelle)" />
        <UButton block @click="editModal = null">Valider</UButton>
      </div>
    </UModal>
  </AppPageShell>
</template>

<script setup lang="ts">
import type { NursePassageNursingItem, NursePassageSeriesInput, PassageDailyTimeSlot, PassageTimeSlot } from '@oneandlab/shared-types';
import PassageCarePicker from '~/components/nurse/PassageCarePicker.vue';
import PassageFieldRow from '~/components/nurse/PassageFieldRow.vue';
import PassagePlanningFormFields from '~/components/nurse/PassagePlanningFormFields.vue';
import PrescriptionSection from '~/components/dashboard/PrescriptionSection.vue';
import { prescriptionGenerationEnabled } from '~/utils/prescription-access';
import PatientHealthRecordPanel from '~/components/dashboard/PatientHealthRecordPanel.vue';
import {
  formatCareSummary,
  formatDailyTimesSummary,
  formatLocationSummary,
  formatNotesSummary,
  formatPassageDurationSummary,
  formatPlanningSummary,
} from '~/utils/passage-form-summaries';
import {
  buildPlanningPayload,
  defaultPlanningFormState,
  embedTimeRangeInPlanningConfig,
  previewPassageCount,
  suggestPlanningFromCare,
  type PassagePlanningFormState,
} from '~/utils/passage-planning';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

useHead({ title: 'Nouveau passage – Infirmier' });

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { user } = useAuth();
const canGeneratePrescription = computed(() => prescriptionGenerationEnabled(user.value));
const { saving, createSeries } = useNursePassageWeb();

const patientId = computed(() => String(route.query.patient_id ?? ''));
const stripDate = computed(() => String(route.query.start_date ?? new Date().toISOString().slice(0, 10)));
const flowMode = computed(() => (route.query.mode === 'recurring' ? 'recurring' : 'single_day'));

const tab = ref('information');
const tabItems = [
  { label: 'Informations', value: 'information' },
  { label: 'Documents', value: 'documents' },
  { label: 'Carnet', value: 'health_record' },
];

const patientProfile = ref<Record<string, unknown> | null>(null);
const careCategories = ref<Array<{ id: string; name?: string; label?: string; options?: unknown[] }>>([]);
const duration = ref(30);
const atHome = ref(true);
const notes = ref('');
const nursingItems = ref<NursePassageNursingItem[]>([]);
const planningEdited = ref(false);
const planningState = ref<PassagePlanningFormState>(
  (() => {
    const base = defaultPlanningFormState(stripDate.value, { recurring: flowMode.value === 'recurring' });
    if (flowMode.value === 'recurring') {
      return { ...base, planningMode: 'interval', openEnded: true };
    }
    return base;
  })(),
);
const dailyTimeSlots = ref<PassageDailyTimeSlot[]>([{ time_slot: 'morning', custom_time: null }]);

const editModal = ref<'planning' | 'daily_times' | 'location' | 'duration' | 'care' | 'notes' | null>(null);
const planningOpen = computed({ get: () => editModal.value === 'planning', set: (v) => { if (!v) editModal.value = null; } });
const dailyTimesOpen = computed({ get: () => editModal.value === 'daily_times', set: (v) => { if (!v) editModal.value = null; } });
const locationOpen = computed({ get: () => editModal.value === 'location', set: (v) => { if (!v) editModal.value = null; } });
const durationOpen = computed({ get: () => editModal.value === 'duration', set: (v) => { if (!v) editModal.value = null; } });
const careOpen = computed({ get: () => editModal.value === 'care', set: (v) => { if (!v) editModal.value = null; } });
const notesOpen = computed({ get: () => editModal.value === 'notes', set: (v) => { if (!v) editModal.value = null; } });

const durationItems = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 h', value: 60 },
];

const dailySlotItems = [
  { label: 'Matin', value: 'morning' as PassageTimeSlot },
  { label: 'Midi', value: 'noon' as PassageTimeSlot },
  { label: 'Après-midi', value: 'afternoon' as PassageTimeSlot },
  { label: 'Soir', value: 'evening' as PassageTimeSlot },
  { label: 'Nuit', value: 'night' as PassageTimeSlot },
  { label: 'Toute la journée', value: 'all_day' as PassageTimeSlot },
];

const passageCount = computed(() => previewPassageCount(planningState.value, nursingItems.value, dailyTimeSlots.value.length));
const planningSummary = computed(() => formatPlanningSummary(planningState.value, passageCount.value));
const dailyTimesSummary = computed(() => formatDailyTimesSummary(dailyTimeSlots.value));
const durationSummary = computed(() => formatPassageDurationSummary(duration.value, ''));
const careSummary = computed(() => formatCareSummary(nursingItems.value, careCategories.value));
const notesSummary = computed(() => formatNotesSummary(notes.value));
const patientName = computed(() => {
  const p = patientProfile.value;
  if (!p) return '';
  return [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
});
const locationSummary = computed(() => {
  const raw = atHome.value ? patientProfile.value?.address : user.value?.address;
  const label = typeof raw === 'object' && raw && 'label' in raw
    ? String((raw as { label?: string }).label ?? '')
    : typeof raw === 'string'
      ? raw
      : '';
  return formatLocationSummary(atHome.value, label);
});

watch(stripDate, (d) => {
  if (d) planningState.value = { ...planningState.value, startDate: d };
});

watch(nursingItems, (items) => {
  if (planningEdited.value || items.length === 0) return;
  const patch = suggestPlanningFromCare(planningState.value, items);
  if (patch) planningState.value = { ...planningState.value, ...patch };
}, { deep: true });

function toggleDailySlot(slot: PassageTimeSlot) {
  const order = dailySlotItems.map((i) => i.value);
  const current = dailyTimeSlots.value.map((s) => s.time_slot);
  if (slot === 'all_day') {
    dailyTimeSlots.value = [{ time_slot: 'all_day', custom_time: null }];
    return;
  }
  const currentWithoutAllDay = dailyTimeSlots.value.filter((s) => s.time_slot !== 'all_day');
  if (current.includes(slot)) {
    if (currentWithoutAllDay.length <= 1) return;
    dailyTimeSlots.value = currentWithoutAllDay.filter((s) => s.time_slot !== slot);
  } else {
    dailyTimeSlots.value = [...currentWithoutAllDay, { time_slot: slot, custom_time: null }]
      .sort((a, b) => order.indexOf(a.time_slot) - order.indexOf(b.time_slot));
  }
}

function confirmPlanning() {
  planningEdited.value = true;
  editModal.value = null;
}

onMounted(async () => {
  try {
    const response = await apiFetch('/categories?type=nursing', { method: 'GET' });
    if (response?.success && Array.isArray(response.data)) {
      careCategories.value = response.data;
    }
  } catch {
    careCategories.value = [];
  }
  if (!patientId.value) return;
  const res = await apiFetch<Record<string, unknown>>(`/users/${patientId.value}?detail=full`);
  patientProfile.value = res?.data ?? null;
});

async function submit() {
  if (!patientId.value) {
    toast.add({ title: 'Patient requis', color: 'error' });
    return;
  }
  if (nursingItems.value.length === 0) {
    toast.add({ title: 'Ajoutez au moins un soin', color: 'error' });
    return;
  }
  if (planningState.value.planningMode === 'weekdays' && planningState.value.weekdays.length === 0) {
    toast.add({ title: 'Sélectionnez au moins un jour de la semaine', color: 'error' });
    return;
  }
  if (planningState.value.planningMode === 'custom_dates' && planningState.value.customDates.length === 0) {
    toast.add({ title: 'Sélectionnez au moins une date', color: 'error' });
    return;
  }

  const built = buildPlanningPayload(planningState.value, nursingItems.value);
  const slotsPayload: PassageDailyTimeSlot[] =
    dailyTimeSlots.value.length > 0
      ? dailyTimeSlots.value
      : [{ time_slot: 'morning', custom_time: null }];
  const primarySlot = slotsPayload[0];
  const planningConfig = embedTimeRangeInPlanningConfig(built.planning_config, null, slotsPayload);
  const input: NursePassageSeriesInput = {
    patient_id: patientId.value,
    planning_type: built.planning_type,
    planning_config: planningConfig,
    time_slot: primarySlot.time_slot,
    custom_time: primarySlot.time_slot === 'custom' ? primarySlot.custom_time ?? null : null,
    duration_minutes: duration.value,
    at_home: atHome.value,
    nursing_items: nursingItems.value,
    notes: notes.trim() || null,
  };

  const result = await createSeries(input);
  if (result) await router.push('/nurse/tournee');
}
</script>
