<template>
  <AppPageShell class="mx-auto max-w-2xl space-y-4">
    <AppPageHeader title="Détail passage" :edge-bleed="false" />

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary-500" />
    </div>

    <template v-else-if="series || (isAppointmentOnly && appointment)">
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
        <div v-if="patientName" class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/50">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Patient</p>
          <p class="mt-1 text-lg font-bold text-gray-900 dark:text-white">{{ patientName }}</p>
          <a
            v-if="patientPhone"
            :href="`tel:${patientPhone}`"
            class="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600"
          >
            <UIcon name="i-lucide-phone" class="h-4 w-4" />
            {{ patientPhone }}
          </a>
        </div>

        <PassageFieldRow
          v-if="!isAppointmentOnly"
          label="Planification"
          :value="planningSummary"
          @click="editModal = 'planning'"
        />
        <PassageFieldRow
          label="Heure de passage"
          :value="timeSummary"
          @click="editModal = 'time'"
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

        <UButton
          v-if="canLaunchNavigation"
          block
          color="neutral"
          variant="outline"
          icon="i-lucide-navigation"
          class="mb-2"
          @click="launchNavigation"
        >
          Lancer la navigation
        </UButton>
        <UButton block color="primary" @click="actionsOpen = true">Actions</UButton>
      </div>

      <div v-else-if="tab === 'documents'" class="space-y-4">
        <template v-if="appointmentId && appointment">
          <AppointmentDocumentsSection
            :documents="documents"
            :loading="docsLoading"
            empty-description="Aucun document médical pour ce passage."
            :show-upload-area="true"
            :upload-types="uploadTypes"
            :can-replace="true"
            :downloading-ids="downloadingDocIds"
            :uploading-types="uploadingTypes"
            :omit-care-photos-in-list="true"
            @download="downloadDocument"
            @upload="onUploadDocument"
          />
          <PrescriptionSection
            v-if="!['canceled', 'cancelled'].includes(String(appointment.status ?? ''))"
            :patient-id="appointment.patient_id"
            :appointment="{ id: appointment.id }"
            :documents="documents"
            :load-documents="loadDocuments"
            kind="nursing"
          />
        </template>
        <UAlert
          v-else
          color="neutral"
          variant="subtle"
          title="Documents indisponibles"
          description="Ouvrez ce passage depuis la tournée pour accéder aux documents du rendez-vous."
        />
      </div>

      <div v-else-if="tab === 'health_record'" class="space-y-4">
        <PatientHealthRecordPanel
          v-if="effectivePatientId"
          :patient-id="effectivePatientId"
          editable
          clinical-vitals
          clinical-vital-context="passage"
        />
        <UAlert
          v-else
          color="neutral"
          variant="subtle"
          title="Carnet indisponible"
          description="Patient introuvable pour ce passage."
        />
      </div>
    </template>

    <!-- Modales édition -->
    <UModal v-model:open="planningOpen" title="Planification">
      <div class="space-y-3 p-1">
        <PassagePlanningFormFields v-model="planningState" />
        <UButton block :loading="saving" @click="savePlanning">Valider</UButton>
      </div>
    </UModal>

    <UModal v-model:open="timeOpen" title="Heure de passage">
      <div class="space-y-3 p-1">
        <USelect v-model="timeSlot" :items="slotItems" />
        <UInput v-if="timeSlot === 'custom'" v-model="customTime" type="time" label="Heure" />
        <UButton block :loading="saving" @click="saveTime">Valider</UButton>
      </div>
    </UModal>

    <UModal v-model:open="locationOpen" title="Lieu">
      <div class="space-y-3 p-1">
        <div class="flex items-center justify-between gap-3">
          <p class="font-medium">À domicile</p>
          <USwitch v-model="atHome" />
        </div>
        <UButton block :loading="saving" @click="saveLocation">Valider</UButton>
      </div>
    </UModal>

    <UModal v-model:open="durationOpen" title="Durée du passage">
      <div class="space-y-3 p-1">
        <USelect v-model="duration" :items="durationItems" />
        <UButton block :loading="saving" @click="saveDuration">Valider</UButton>
      </div>
    </UModal>

    <UModal v-model:open="careOpen" title="Soins" :ui="{ content: 'max-w-lg' }">
      <div class="space-y-3 p-1">
        <PassageCarePicker v-model="nursingItems" />
        <UButton block :loading="saving" @click="saveCare">Valider</UButton>
      </div>
    </UModal>

    <UModal v-model:open="notesOpen" title="Note">
      <div class="space-y-3 p-1">
        <UTextarea v-model="notes" :rows="4" placeholder="Note interne (optionnelle)" />
        <UButton block :loading="saving" @click="saveNotes">Valider</UButton>
      </div>
    </UModal>

    <UModal v-model:open="actionsOpen" title="Actions">
      <div class="divide-y divide-gray-100 dark:divide-gray-800">
        <button
          v-if="stopId"
          type="button"
          class="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
          @click="onEnRoute"
        >
          <UIcon name="i-lucide-car" class="h-5 w-5 text-primary-500" />
          <span class="text-sm font-semibold">Je pars — prévenir le patient</span>
        </button>
        <button
          v-if="stopId"
          type="button"
          class="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
          @click="onMarkDone"
        >
          <UIcon name="i-lucide-check-circle" class="h-5 w-5 text-primary-500" />
          <span class="text-sm font-semibold">Marquer comme effectué</span>
        </button>
        <button
          v-if="planningMode === 'manual' && !isAppointmentOnly"
          type="button"
          class="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
          @click="onMaterialize"
        >
          <UIcon name="i-lucide-calendar-plus" class="h-5 w-5 text-gray-500" />
          <span class="text-sm font-semibold">Planifier ce jour</span>
        </button>
        <button
          v-if="appointmentId"
          type="button"
          class="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
          @click="openFullAppointment"
        >
          <UIcon name="i-lucide-file-text" class="h-5 w-5 text-gray-500" />
          <span class="text-sm font-semibold">Voir fiche RDV complète</span>
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-3 px-1 py-3 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          @click="onDeleteOne"
        >
          <UIcon name="i-lucide-trash-2" class="h-5 w-5" />
          <span class="text-sm font-semibold">Supprimer ce passage</span>
        </button>
        <button
          v-if="!isAppointmentOnly"
          type="button"
          class="flex w-full items-center gap-3 px-1 py-3 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          @click="onDeleteSeries"
        >
          <UIcon name="i-lucide-layers" class="h-5 w-5" />
          <span class="text-sm font-semibold">Supprimer toute la série</span>
        </button>
      </div>
    </UModal>
  </AppPageShell>
</template>

<script setup lang="ts">
import type {
  NursePassageNursingItem,
  NursePassageSeriesInput,
  PassagePlanningConfig,
  PassageTimeSlot,
} from '@oneandlab/shared-types';
import PassageCarePicker from '~/components/nurse/PassageCarePicker.vue';
import PassageFieldRow from '~/components/nurse/PassageFieldRow.vue';
import PassagePlanningFormFields from '~/components/nurse/PassagePlanningFormFields.vue';
import AppointmentDocumentsSection from '~/components/dashboard/AppointmentDocumentsSection.vue';
import PrescriptionSection from '~/components/dashboard/PrescriptionSection.vue';
import PatientHealthRecordPanel from '~/components/dashboard/PatientHealthRecordPanel.vue';
import { cancelAppointmentWithOptionalPhoto } from '~/utils/appointment-cancellation';
import {
  formatCareSummary,
  formatLocationSummary,
  formatNotesSummary,
  formatPassageDurationSummary,
  formatPlanningSummary,
  formatTimeSummary,
} from '~/utils/passage-form-summaries';
import {
  buildPlanningPayload,
  planningStateFromSeries,
  previewPassageCount,
  type PassagePlanningFormState,
} from '~/utils/passage-planning';
import {
  buildAppointmentPassageUpdateBody,
  initPassageFormFromAppointment,
} from '~/utils/passage-appointment-update';
import {
  appointmentDetailAddressLine,
  buildNavigationUrl,
  parseRawPatientAddress,
} from '@oneandlab/shared-utils';
import type { CareCategoryRowMinimal } from '~/utils/care-icons';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

useHead({ title: 'Détail passage – Infirmier' });

const route = useRoute();
const router = useRouter();
const { saving, fetchSeries, updateSeries, materializeSeries, deleteSeries } = useNursePassageWeb();
const { markEnRoute, markDone } = useNurseTourWeb();

const APPOINTMENT_ONLY_SERIES_IDS = new Set(['rdv', '_', 'appointment']);

const rawSeriesId = computed(() => String(route.params.seriesId ?? ''));
const isAppointmentOnly = computed(() => APPOINTMENT_ONLY_SERIES_IDS.has(rawSeriesId.value));
const seriesId = computed(() => (isAppointmentOnly.value ? '' : rawSeriesId.value));
const appointmentId = computed(() => String(route.query.appointment_id ?? ''));
const stopId = computed(() => String(route.query.stop_id ?? ''));

const loading = ref(true);
const tab = ref('information');
const tabItems = [
  { label: 'Informations', value: 'information' },
  { label: 'Documents', value: 'documents' },
  { label: 'Carnet', value: 'health_record' },
];

const series = ref<Awaited<ReturnType<typeof fetchSeries>>>(null);
const appointment = ref<Record<string, unknown> | null>(null);
const patientProfile = ref<Record<string, unknown> | null>(null);
const nurseProfile = ref<Record<string, unknown> | null>(null);
const documents = ref<any[]>([]);
const docsLoading = ref(false);
const downloadingDocIds = ref<string[]>([]);
const uploadingTypes = ref<string[]>([]);
const uploadTypes = ['carte_vitale', 'carte_mutuelle', 'ordonnance', 'autres_assurances', 'other'];

const timeSlot = ref<PassageTimeSlot>('morning');
const customTime = ref('09:00');
const duration = ref(30);
const atHome = ref(true);
const notes = ref('');
const nursingItems = ref<NursePassageNursingItem[]>([]);
const planningState = ref<PassagePlanningFormState>(
  planningStateFromSeries('single_day', { start_date: new Date().toISOString().slice(0, 10) }, new Date().toISOString().slice(0, 10)),
);
const materializeDate = ref('');
const careCategories = ref<CareCategoryRowMinimal[]>([]);

const editModal = ref<'planning' | 'time' | 'location' | 'duration' | 'care' | 'notes' | null>(null);
const actionsOpen = ref(false);

const planningOpen = computed({ get: () => editModal.value === 'planning', set: (v) => { if (!v) editModal.value = null; } });
const timeOpen = computed({ get: () => editModal.value === 'time', set: (v) => { if (!v) editModal.value = null; } });
const locationOpen = computed({ get: () => editModal.value === 'location', set: (v) => { if (!v) editModal.value = null; } });
const durationOpen = computed({ get: () => editModal.value === 'duration', set: (v) => { if (!v) editModal.value = null; } });
const careOpen = computed({ get: () => editModal.value === 'care', set: (v) => { if (!v) editModal.value = null; } });
const notesOpen = computed({ get: () => editModal.value === 'notes', set: (v) => { if (!v) editModal.value = null; } });

const slotItems = [
  { label: 'Toute la journée', value: 'all_day' },
  { label: 'Matin', value: 'morning' },
  { label: 'Midi', value: 'noon' },
  { label: 'Après-midi', value: 'afternoon' },
  { label: 'Soir', value: 'evening' },
  { label: 'Nuit', value: 'night' },
  { label: 'Personnalisée', value: 'custom' },
];
const durationItems = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 h', value: 60 },
];
const passageCount = computed(() => previewPassageCount(planningState.value, nursingItems.value));
const planningMode = computed(() => planningState.value.planningMode);
const planningSummary = computed(() => formatPlanningSummary(planningState.value, passageCount.value));
const timeSummary = computed(() => formatTimeSummary(timeSlot.value, customTime.value));
const durationSummary = computed(() => formatPassageDurationSummary(duration.value, ''));
const careSummary = computed(() => formatCareSummary(nursingItems.value, careCategories.value));
const notesSummary = computed(() => formatNotesSummary(notes.value));
const locationSummary = computed(() => {
  const addr = atHome.value
    ? (patientProfile.value?.address as { label?: string } | undefined)?.label
    : (nurseProfile.value?.address as { label?: string } | undefined)?.label;
  return formatLocationSummary(atHome.value, addr);
});
const patientName = computed(() => {
  const p = patientProfile.value;
  if (!p) return '';
  return [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
});
const patientPhone = computed(() => String(patientProfile.value?.phone ?? ''));
const effectivePatientId = computed(() =>
  String(appointment.value?.patient_id ?? series.value?.patient_id ?? ''),
);

function profileAddressTarget(raw: unknown) {
  const parsed = parseRawPatientAddress(raw);
  if (!parsed?.label?.trim()) return null;
  return {
    lat: parsed.lat ?? null,
    lng: parsed.lng ?? null,
    addressLine: parsed.label.trim(),
  };
}

const navigationTarget = computed(() => {
  if (!atHome.value) {
    return profileAddressTarget(nurseProfile.value?.address);
  }
  const apt = appointment.value;
  if (apt) {
    const line = appointmentDetailAddressLine(apt as Record<string, unknown>);
    const coords =
      parseRawPatientAddress(apt.address) ??
      parseRawPatientAddress((apt.form_data as { address?: unknown } | undefined)?.address);
    if (line || coords?.label) {
      return {
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        addressLine: line || coords?.label || null,
      };
    }
  }
  return profileAddressTarget(patientProfile.value?.address);
});

const canLaunchNavigation = computed(() =>
  Boolean(navigationTarget.value && buildNavigationUrl('waze', navigationTarget.value)),
);

async function launchNavigation() {
  const url = buildNavigationUrl('waze', navigationTarget.value ?? {});
  if (url) window.open(url, '_blank');
  if (stopId.value) {
    await markEnRoute(stopId.value);
  }
}

async function loadDocuments() {
  if (!appointmentId.value) return;
  docsLoading.value = true;
  try {
    const res = await apiFetch<any[]>(
      `/medical-documents?appointment_id=${encodeURIComponent(appointmentId.value)}`,
    );
    documents.value = res?.data ?? [];
  } finally {
    docsLoading.value = false;
  }
}

async function loadContext() {
  loading.value = true;
  let s = null as Awaited<ReturnType<typeof fetchSeries>> | null;
  if (seriesId.value) {
    s = await fetchSeries(seriesId.value);
    series.value = s;
    if (s) {
      timeSlot.value = s.time_slot;
      customTime.value = s.custom_time ?? '09:00';
      duration.value = s.duration_minutes;
      atHome.value = s.at_home;
      notes.value = s.notes ?? '';
      nursingItems.value = [...(s.nursing_items ?? [])];
      planningState.value = planningStateFromSeries(
        s.planning_type,
        s.planning_config as PassagePlanningConfig,
        s.first_date ?? new Date().toISOString().slice(0, 10),
      );
      materializeDate.value = s.first_date ?? new Date().toISOString().slice(0, 10);
    }
  } else {
    series.value = null;
  }

  if (appointmentId.value) {
    const aptRes = await apiFetch<Record<string, unknown>>(`/appointments/${appointmentId.value}`);
    appointment.value = aptRes?.data ?? null;
    if (isAppointmentOnly.value && appointment.value) {
      const fields = initPassageFormFromAppointment(appointment.value);
      timeSlot.value = fields.time_slot;
      customTime.value = fields.custom_time ?? '09:00';
      duration.value = fields.duration_minutes;
      atHome.value = fields.at_home;
      notes.value = fields.notes ?? '';
      nursingItems.value = [...fields.nursing_items];
    }
    const pid = String(appointment.value?.patient_id ?? s?.patient_id ?? '');
    if (pid) {
      const pRes = await apiFetch<Record<string, unknown>>(`/users/${pid}?detail=full`);
      patientProfile.value = pRes?.data ?? null;
    }
    await loadDocuments();
  } else if (s?.patient_id) {
    const pRes = await apiFetch<Record<string, unknown>>(`/users/${s.patient_id}?detail=full`);
    patientProfile.value = pRes?.data ?? null;
  }

  const me = await apiFetch<Record<string, unknown>>('/users/me?detail=full');
  nurseProfile.value = me?.data ?? null;
  loading.value = false;
}

onMounted(() => {
  void (async () => {
    try {
      const response = await apiFetch('/categories?type=nursing', { method: 'GET' });
      if (response?.success && Array.isArray(response.data)) {
        careCategories.value = response.data;
      }
    } catch {
      careCategories.value = [];
    }
    await loadContext();
  })();
});

function buildPayload(extra: Partial<NursePassageSeriesInput> = {}): Partial<NursePassageSeriesInput> {
  return {
    time_slot: timeSlot.value,
    custom_time: timeSlot.value === 'custom' ? customTime.value : null,
    duration_minutes: duration.value,
    at_home: atHome.value,
    nursing_items: nursingItems.value,
    notes: notes.trim() || null,
    ...extra,
  };
}

async function persist(extra: Partial<NursePassageSeriesInput> = {}) {
  if (isAppointmentOnly.value) {
    if (!appointment.value) return;
    const snapshot = {
      time_slot: timeSlot.value,
      custom_time: timeSlot.value === 'custom' ? customTime.value : null,
      duration_minutes: duration.value,
      at_home: atHome.value,
      nursing_items: nursingItems.value,
      notes: notes.trim() || null,
    };
    const body = buildAppointmentPassageUpdateBody(appointment.value, extra, snapshot);
    await apiFetch(`/appointments/${appointmentId.value}`, { method: 'PUT', body });
    const aptRes = await apiFetch<Record<string, unknown>>(`/appointments/${appointmentId.value}`);
    appointment.value = aptRes?.data ?? null;
    editModal.value = null;
    return;
  }
  await updateSeries(seriesId.value, buildPayload(extra));
  editModal.value = null;
}

async function savePlanning() {
  const built = buildPlanningPayload(planningState.value, nursingItems.value);
  await persist({ planning_type: built.planning_type, planning_config: built.planning_config });
}
async function saveTime() {
  await persist();
}
async function saveLocation() {
  await persist();
}
async function saveDuration() {
  await persist();
}
async function saveCare() {
  await persist();
}
async function saveNotes() {
  await persist();
}

async function onMaterialize() {
  actionsOpen.value = false;
  if (materializeDate.value) {
    await updateSeries(seriesId.value, { planning_config: { start_date: materializeDate.value } });
  }
  await materializeSeries(seriesId.value);
}

async function onEnRoute() {
  actionsOpen.value = false;
  if (!stopId.value) return;
  await markEnRoute(stopId.value);
}

async function onMarkDone() {
  actionsOpen.value = false;
  if (!stopId.value) return;
  await markDone(stopId.value, { finalizeAppointment: true });
  await router.push('/nurse/tournee');
}

function openFullAppointment() {
  actionsOpen.value = false;
  if (appointmentId.value) void router.push(`/nurse/appointments/${appointmentId.value}`);
}

async function onDeleteOne() {
  actionsOpen.value = false;
  if (!appointmentId.value) return;
  const ok = window.confirm('Supprimer ce passage (annuler le rendez-vous) ?');
  if (!ok) return;
  const result = await cancelAppointmentWithOptionalPhoto(appointmentId.value, {
    reason: 'other',
    comment: '',
    photoFile: null,
  });
  if (result.ok) await router.push('/nurse/tournee');
}

async function onDeleteSeries() {
  actionsOpen.value = false;
  const ok = await deleteSeries(seriesId.value);
  if (ok) await router.push('/nurse/tournee');
}

async function downloadDocument(doc: { id: string; file_name?: string }) {
  downloadingDocIds.value.push(doc.id);
  try {
    window.open(`/api/medical-documents/${doc.id}/download`, '_blank');
  } finally {
    downloadingDocIds.value = downloadingDocIds.value.filter((id) => id !== doc.id);
  }
}

async function onUploadDocument(docType: string, file: File) {
  if (!appointmentId.value || !appointment.value?.patient_id) return;
  uploadingTypes.value.push(docType);
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('document_type', docType);
    fd.append('patient_id', String(appointment.value.patient_id));
    fd.append('appointment_id', appointmentId.value);
    await apiFetch('/medical-documents', { method: 'POST', body: fd });
    await loadDocuments();
  } finally {
    uploadingTypes.value = uploadingTypes.value.filter((t) => t !== docType);
  }
}
</script>
