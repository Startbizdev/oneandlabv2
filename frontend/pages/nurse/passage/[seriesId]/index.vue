<template>
  <AppPageShell class="mx-auto max-w-2xl space-y-4">
    <AppPageHeader title="Détail passage" :edge-bleed="false" />

    <div v-if="loading" class="flex justify-center py-16" role="status" aria-label="Chargement du passage">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary-500" />
    </div>

    <div v-else-if="loadError" class="space-y-3">
      <UAlert color="error" title="Passage indisponible" :description="loadError" />
      <UButton color="neutral" variant="outline" @click="loadContext">Réessayer</UButton>
    </div>
    <div v-else-if="!hasPassageContent" class="space-y-3">
      <UAlert
        color="neutral"
        variant="subtle"
        title="Passage introuvable"
        description="Ouvrez ce passage depuis la tournée ou vérifiez le lien."
      />
      <UButton color="neutral" variant="outline" to="/nurse/tournee">Retour à la tournée</UButton>
    </div>
    <template v-else>
      <div class="flex gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900/50">
        <UButton
          v-for="item in tabItems"
          :key="item.value"
          block
          size="sm"
          :variant="tab === item.value ? 'solid' : 'ghost'"
          :color="tab === item.value ? 'primary' : 'neutral'"
          @click="($event) => { tab = item.value }"
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

        <NuxtLink
          v-if="documentsRowShown"
          :to="documentsPath"
          class="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:bg-gray-800/50"
        >
          <UIcon name="i-lucide-file-text" class="h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold text-gray-900 dark:text-white">Documents</span>
            <span v-if="documentsHint" class="block text-xs text-gray-500">{{ documentsHint }}</span>
          </span>
          <span v-if="listedDocuments.length" class="text-sm text-gray-500">{{ listedDocuments.length }}</span>
          <UIcon name="i-lucide-chevron-right" class="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        </NuxtLink>

        <NurseCoNursesPanel
          v-if="coNurseAppointment"
          :appointment="coNurseAppointment"
          :viewer-id="user?.id"
          :passage-series-id="seriesId || null"
          @self-removed="router.replace('/nurse/tournee')"
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
        <UButton block color="primary" @click="($event) => { actionsOpen = true }">Actions</UButton>
      </div>

      <div v-else-if="tab === 'health_record'" class="space-y-4">
        <PatientHealthRecordPanel
          v-if="effectivePatientId"
          :patient-id="effectivePatientId"
          editable
          clinical-vitals
          :clinical-vital-context="{ type: 'passage', id: seriesId || undefined }"
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
      <template #body>
      <div class="space-y-3 p-1">
        <PassagePlanningFormFields v-model="planningState" />
        <UButton block :loading="saving" @click="savePlanning">Valider</UButton>
      </div>
          </template>
    </UModal>

    <UModal v-model:open="timeOpen" title="Heure de passage">
      <template #body>
      <div class="space-y-3 p-1">
        <USelect v-model="timeSlot" :items="slotItems" />
        <UInput v-if="timeSlot === 'custom'" v-model="customTime" type="time" label="Heure" />
        <UButton block :loading="saving" @click="saveTime">Valider</UButton>
      </div>
          </template>
    </UModal>

    <UModal v-model:open="locationOpen" title="Lieu">
      <template #body>
      <div class="space-y-3 p-1">
        <div class="flex items-center justify-between gap-3">
          <p class="font-medium">À domicile</p>
          <USwitch v-model="atHome" />
        </div>
        <UButton block :loading="saving" @click="saveLocation">Valider</UButton>
      </div>
          </template>
    </UModal>

    <UModal v-model:open="durationOpen" title="Durée du passage">
      <template #body>
      <div class="space-y-3 p-1">
        <USelect v-model="duration" :items="durationItems" />
        <UButton block :loading="saving" @click="saveDuration">Valider</UButton>
      </div>
          </template>
    </UModal>

    <UModal v-model:open="careOpen" title="Soins" :ui="{ content: 'max-w-lg' }">
      <template #body>
      <div class="space-y-3 p-1">
        <PassageCarePicker v-model="nursingItems" />
        <UButton block :loading="saving" @click="saveCare">Valider</UButton>
      </div>
          </template>
    </UModal>

    <UModal v-model:open="notesOpen" title="Note">
      <template #body>
      <div class="space-y-3 p-1">
        <UTextarea v-model="notes" :rows="4" placeholder="Note interne (optionnelle)" />
        <UButton block :loading="saving" @click="saveNotes">Valider</UButton>
      </div>
          </template>
    </UModal>

    <UModal v-model:open="actionsOpen" title="Actions">
      <template #body>
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
          v-if="canCancelCurrentAppointment"
          type="button"
          class="flex w-full items-center gap-3 px-1 py-3 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          @click="onDeleteOne"
        >
          <UIcon name="i-lucide-trash-2" class="h-5 w-5" />
          <span class="text-sm font-semibold">Supprimer ce passage</span>
        </button>
        <button
          v-if="!isAppointmentOnly && ownerActions"
          type="button"
          class="flex w-full items-center gap-3 px-1 py-3 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          @click="onDeleteSeries"
        >
          <UIcon name="i-lucide-layers" class="h-5 w-5" />
          <span class="text-sm font-semibold">Supprimer toute la série</span>
        </button>
      </div>
          </template>
    </UModal>
  </AppPageShell>
</template>

<script setup lang="ts">
const toast = useAppToast();
import type {
  NursePassageNursingItem,
  NursePassageSeriesInput,
  PassagePlanningConfig,
  PassageTimeSlot,
} from '@oneandlab/shared-types';
import PassageCarePicker from '~/components/nurse/PassageCarePicker.vue';
import PassageFieldRow from '~/components/nurse/PassageFieldRow.vue';
import PassagePlanningFormFields from '~/components/nurse/PassagePlanningFormFields.vue';
import PatientHealthRecordPanel from '~/components/dashboard/PatientHealthRecordPanel.vue';
import {
  appointmentDocumentsRowHint,
  appointmentDocumentsRowVisible,
  canCancelAppointment,
  isCoNurseViewer,
  nurseOwnerOnlyActionsVisible,
} from '@oneandlab/shared-utils';
import { canUploadMedicalDocumentsForAppointmentStatus } from '~/utils/appointment-documents-upload';
import { passageDocumentsPath, passageListDocuments } from '~/utils/passage-documents';
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
const { user } = useAuth();
const { saving, fetchSeries, updateSeries, materializeSeries, deleteSeries } = useNursePassageWeb();
const { markEnRoute, markDone } = useNurseTourWeb({ autoLoad: false });

const APPOINTMENT_ONLY_SERIES_IDS = new Set(['rdv', '_', 'appointment']);

const rawSeriesId = computed(() => String(route.params.seriesId ?? ''));
const isAppointmentOnly = computed(() => APPOINTMENT_ONLY_SERIES_IDS.has(rawSeriesId.value));
const seriesId = computed(() => (isAppointmentOnly.value ? '' : rawSeriesId.value));
const appointmentId = computed(() => String(route.query.appointment_id ?? ''));
const stopId = computed(() => String(route.query.stop_id ?? ''));

const loading = ref(true);
const loadError = ref('');
let loadVersion = 0;

const hasPassageContent = computed(() => Boolean(series.value || appointment.value));
const tab = ref('information');
const tabItems = [
  { label: 'Informations', value: 'information' },
  { label: 'Carnet', value: 'health_record' },
];

const series = ref<Awaited<ReturnType<typeof fetchSeries>>>(null);
const appointment = ref<Record<string, unknown> | null>(null);
const coNurseAppointment = computed(() => {
  const apt = appointment.value;
  if (!apt?.id) return null;
  return {
    id: String(apt.id),
    status: typeof apt.status === 'string' ? apt.status : null,
    assigned_nurse_id: typeof apt.assigned_nurse_id === 'string' ? apt.assigned_nurse_id : null,
    is_co_nurse: apt.is_co_nurse === true,
    passage_series_id: typeof apt.passage_series_id === 'string' ? apt.passage_series_id : null,
  };
});
const ownerActions = computed(() => nurseOwnerOnlyActionsVisible(coNurseAppointment.value));
const canCancelCurrentAppointment = computed(
  () => ownerActions.value && canCancelAppointment(appointment.value, { role: user.value?.role, id: user.value?.id }),
);
const patientProfile = ref<Record<string, unknown> | null>(null);
const nurseProfile = ref<Record<string, unknown> | null>(null);
const {
  documents,
  loading: docsLoading,
  error: documentsError,
  load: loadDocuments,
  reset: resetDocuments,
} = usePassageDocumentsWeb(appointmentId);
const listedDocuments = computed(() => passageListDocuments(documents.value));
const canUploadDocuments = computed(() =>
  canUploadMedicalDocumentsForAppointmentStatus(appointment.value?.status),
);
const documentsSettled = computed(() => !docsLoading.value && !documentsError.value);
const documentsRowShown = computed(
  () =>
    Boolean(appointmentId.value && appointment.value) &&
    (!documentsSettled.value ||
      appointmentDocumentsRowVisible(listedDocuments.value.length, canUploadDocuments.value)),
);
const documentsHint = computed(() =>
  documentsSettled.value ? appointmentDocumentsRowHint(listedDocuments.value, canUploadDocuments.value) : undefined,
);
const documentsPath = computed(() =>
  passageDocumentsPath(rawSeriesId.value, { appointmentId: appointmentId.value, stopId: stopId.value }),
);

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

function applySeriesToForm(s: NonNullable<Awaited<ReturnType<typeof fetchSeries>>>) {
  series.value = s;
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

function applyAppointmentToForm(apt: Record<string, unknown>) {
  appointment.value = apt;
  if (!isAppointmentOnly.value && series.value) return;
  const fields = initPassageFormFromAppointment(apt);
  timeSlot.value = fields.time_slot;
  customTime.value = fields.custom_time ?? '09:00';
  duration.value = fields.duration_minutes;
  atHome.value = fields.at_home;
  notes.value = fields.notes ?? '';
  nursingItems.value = [...fields.nursing_items];
}

async function loadContext() {
  const version = ++loadVersion;
  loading.value = true;
  loadError.value = '';
  series.value = null;
  appointment.value = null;
  patientProfile.value = null;
  resetDocuments();

  if (isAppointmentOnly.value && !appointmentId.value) {
    loadError.value = 'Rendez-vous manquant — ouvrez ce passage depuis la tournée.';
    loading.value = false;
    return;
  }

  try {
    const [seriesResult, aptRes, meRes] = await Promise.all([
      seriesId.value
        ? fetchSeries(seriesId.value).then(
            (data) => ({ data, error: null as unknown }),
            (error: unknown) => ({ data: null, error }),
          )
        : Promise.resolve({ data: null, error: null as unknown }),
      appointmentId.value
        ? apiFetch<{ success: boolean; data?: Record<string, unknown>; error?: string; alreadyAccepted?: boolean }>(
            `/appointments/${appointmentId.value}`,
          )
        : Promise.resolve(null),
      apiFetch<{ success: boolean; data?: Record<string, unknown>; error?: string }>(
        '/users/me?detail=full',
      ),
    ]);

    if (version !== loadVersion) return;

    const s = seriesResult.data;
    if (s) applySeriesToForm(s);

    if (appointmentId.value) {
      if (aptRes?.alreadyAccepted) {
        throw new Error('Ce rendez-vous a déjà été accepté par un autre professionnel.');
      }
      if (!aptRes?.success || !aptRes.data) {
        throw new Error(aptRes?.error || 'Impossible de charger ce rendez-vous.');
      }
      applyAppointmentToForm(aptRes.data);
    } else if (seriesId.value && !s) {
      throw seriesResult.error instanceof Error
        ? seriesResult.error
        : new Error('Cette série ne peut pas être chargée. Réessayez dans un instant.');
    }

    nurseProfile.value = meRes?.data ?? null;

    // Utiliser la réponse locale : TypeScript ne peut pas déduire que
    // applyAppointmentToForm() a muté la ref appointment après son reset.
    const pid = String(aptRes?.data?.patient_id ?? s?.patient_id ?? '');
    if (pid) {
      try {
        const pRes = await apiFetch<{ success: boolean; data?: Record<string, unknown>; error?: string }>(
          `/users/${pid}?detail=full`,
        );
        if (version !== loadVersion) return;
        patientProfile.value = pRes?.data ?? null;
      } catch (error) {
        console.warn('[passage] profil patient', error);
        if (version !== loadVersion) return;
        patientProfile.value = null;
      }
    }

    if (appointmentId.value) {
      await loadDocuments();
      if (version !== loadVersion) return;
    }
  } catch (error) {
    if (version !== loadVersion) return;
    loadError.value = error instanceof Error ? error.message : 'Impossible de charger ce passage.';
  } finally {
    if (version === loadVersion) loading.value = false;
  }
}

if (import.meta.client) {
  watch(
    () => [seriesId.value, appointmentId.value, stopId.value] as const,
    () => {
      void loadContext();
    },
    { immediate: true },
  );
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
  })();
});

function buildPayload(extra: Partial<NursePassageSeriesInput> = {}): Partial<NursePassageSeriesInput> {
  return {
    time_slot: timeSlot.value,
    custom_time: timeSlot.value === 'custom' ? customTime.value : null,
    duration_minutes: duration.value,
    at_home: atHome.value,
    nursing_items: nursingItems.value,
    notes: notes.value.trim() || null,
    ...extra,
  };
}

async function persist(extra: Partial<NursePassageSeriesInput> = {}) {
  if (saving.value) return;
  if (isAppointmentOnly.value || !series.value || isCoNurseViewer(coNurseAppointment.value)) {
    if (!appointment.value) return;
    saving.value = true;
    try {
    const snapshot = {
      time_slot: timeSlot.value,
      custom_time: timeSlot.value === 'custom' ? customTime.value : null,
      duration_minutes: duration.value,
      at_home: atHome.value,
      nursing_items: nursingItems.value,
      notes: notes.value.trim() || null,
    };
    const body = buildAppointmentPassageUpdateBody(appointment.value, extra, snapshot);
    const result = await apiFetch(`/appointments/${appointmentId.value}`, { method: 'PUT', body });
    if (!result?.success) throw new Error(result?.error || 'Enregistrement impossible. Réessayez.');
    const aptRes = await apiFetch<{ success: boolean; data?: Record<string, unknown>; error?: string }>(`/appointments/${appointmentId.value}`);
    if (!aptRes?.success || !aptRes.data) throw new Error('Passage enregistré, mais actualisation impossible. Réessayez.');
    appointment.value = aptRes.data;
    editModal.value = null;
    } catch (error) {
      toast.add({ title: 'Modification non confirmée', description: error instanceof Error ? error.message : 'Réessayez.', color: 'error' });
    } finally {
      saving.value = false;
    }
    return;
  }
  const result = await updateSeries(seriesId.value, buildPayload(extra));
  if (result) editModal.value = null;
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
  if (result.ok) {
    await router.push('/nurse/tournee');
    return;
  }
  toast.add({ title: 'Annulation impossible', description: result.error, color: 'error' });
}

async function onDeleteSeries() {
  actionsOpen.value = false;
  const ok = await deleteSeries(seriesId.value);
  if (ok) await router.push('/nurse/tournee');
}
</script>
