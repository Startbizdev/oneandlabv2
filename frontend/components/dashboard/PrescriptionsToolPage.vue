<template>
  <AppPageShell class="space-y-8">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Ordonnances"
        description="Créez une ordonnance ou consultez l'historique complet."
      />
    </template>

    <div class="flex gap-2 p-1 rounded-lg bg-muted/40 ring-1 ring-default/50">
      <UButton
        size="md"
        class="flex-1 justify-center"
        :color="workspaceTab === 'create' ? 'primary' : 'neutral'"
        :variant="workspaceTab === 'create' ? 'solid' : 'ghost'"
        icon="i-lucide-plus-circle"
        @click="workspaceTab = 'create'"
      >
        Créer
      </UButton>
      <UButton
        size="md"
        class="flex-1 justify-center"
        :color="workspaceTab === 'history' ? 'primary' : 'neutral'"
        :variant="workspaceTab === 'history' ? 'solid' : 'ghost'"
        icon="i-lucide-history"
        @click="workspaceTab = 'history'"
      >
        Historique
      </UButton>
    </div>

    <UCard v-if="workspaceTab === 'history'" class="overflow-hidden ring-1 ring-default/60">
      <template #header>
        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 class="text-lg font-normal flex items-center gap-2">
            <UIcon name="i-lucide-history" class="w-5 h-5 text-primary shrink-0" />
            Historique
          </h2>
          <p v-if="!listLoading && prescriptions.length > 0" class="text-xs text-muted">
            {{ prescriptions.length }} sur cette page
          </p>
        </div>
      </template>

      <div v-if="listLoading" class="flex justify-center py-16">
        <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary" />
      </div>
      <template v-else>
        <div v-if="prescriptions.length === 0" class="py-12">
          <UEmpty
            icon="i-lucide-file-pen-line"
            title="Aucune ordonnance"
            description="Les ordonnances enregistrées apparaîtront ici."
            variant="naked"
          />
        </div>

        <div v-else class="space-y-2">
          <PrescriptionHistoryRow
            v-for="row in prescriptions"
            :key="row.id"
            :row="row"
            :role-base="roleBase"
            :show-patient="!initialPatientId"
            :downloading="downloadingId === row.id"
            @preview="previewPrescription"
            @download="downloadPrescription"
          />
        </div>

        <div
          v-if="pagination && pagination.pages > 1"
          class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-default/50"
        >
          <p class="text-sm text-muted text-center sm:text-left">
            Page {{ pagination.page }} / {{ pagination.pages }} · {{ pagination.total }} ordonnance(s)
          </p>
          <UPagination
            v-model:page="currentPage"
            :total="pagination.total"
            :items-per-page="pageSize"
            :sibling-count="2"
            show-edges
          />
        </div>
      </template>
    </UCard>

    <UCard v-else class="ring-1 ring-default/60">
      <template #header>
        <h2 class="text-lg font-normal flex items-center gap-2">
          <UIcon name="i-lucide-plus-circle" class="w-5 h-5 text-primary shrink-0" />
          Nouvelle ordonnance
        </h2>
      </template>
      <p class="text-sm text-muted mb-4">
        Recherchez un patient, puis générez l'ordonnance avec ou sans lien vers un rendez-vous.
      </p>
      <div class="space-y-4 max-w-xl">
        <UFormField v-if="!initialPatientId" label="Patient" name="patient">
          <div class="flex gap-2 items-start">
            <USelectMenu
              v-model="selectedPatientId"
              :items="patientSelectItems"
              value-key="value"
              placeholder="Rechercher un patient…"
              size="md"
              class="w-full min-w-0 flex-1"
              :loading="patientsLoading"
              :search-input="{ placeholder: patientSelectSearchPlaceholder }"
              :filter-fields="['label', 'searchText']"
            >
              <template #item-label="{ item }">
                <div class="min-w-0 flex-1 py-0.5 text-left">
                  <p class="truncate font-medium text-gray-900 dark:text-white">{{ item.label }}</p>
                  <p v-if="item.metaLine" class="truncate text-xs text-gray-500 dark:text-gray-400">
                    {{ item.metaLine }}
                  </p>
                </div>
              </template>
              <template #empty="{ searchTerm }">
                <PatientSelectMenuEmpty :search-term="searchTerm" :suggest-new-patient-option="false" />
              </template>
            </USelectMenu>
            <UButton
              v-if="selectedPatientId"
              size="md"
              color="neutral"
              variant="soft"
              icon="i-lucide-pen-line"
              :to="`/profile?userId=${selectedPatientId}`"
              aria-label="Modifier la fiche patient"
            />
          </div>
        </UFormField>

        <UFormField v-if="selectedPatientId" label="Lien rendez-vous" name="link-mode">
          <div class="flex flex-wrap gap-2">
            <UButton
              size="sm"
              :color="linkMode === 'standalone' ? 'primary' : 'neutral'"
              :variant="linkMode === 'standalone' ? 'solid' : 'soft'"
              @click="linkMode = 'standalone'"
            >
              Sans rendez-vous
            </UButton>
            <UButton
              size="sm"
              :color="linkMode === 'appointment' ? 'primary' : 'neutral'"
              :variant="linkMode === 'appointment' ? 'solid' : 'soft'"
              @click="linkMode = 'appointment'"
            >
              Liée à un rendez-vous
            </UButton>
          </div>
          <p class="text-xs text-muted mt-2">
            {{ linkMode === 'standalone'
              ? 'L\'ordonnance sera enregistrée pour le patient, sans document de RDV.'
              : 'L\'ordonnance sera attachée aux documents du rendez-vous choisi.' }}
          </p>
        </UFormField>

        <UFormField v-if="selectedPatientId && linkMode === 'appointment'" label="Rendez-vous" name="appointment">
          <USelectMenu
            v-model="selectedAppointmentId"
            :items="appointmentSelectItems"
            value-key="value"
            placeholder="Sélectionner un rendez-vous…"
            size="md"
            class="w-full"
            :loading="appointmentsLoading"
            :disabled="appointmentSelectItems.length === 0 && !appointmentsLoading"
          />
          <p v-if="selectedPatientId && !appointmentsLoading && appointmentSelectItems.length === 0" class="text-sm text-amber-600 dark:text-amber-400 mt-2">
            Aucun rendez-vous pour ce patient. Vous pouvez générer une ordonnance « sans rendez-vous ».
          </p>
        </UFormField>
      </div>

      <div
        v-if="selectedPatientId && (linkMode === 'standalone' || selectedAppointmentId)"
        class="mt-6 pt-6 border-t border-default/50"
      >
        <PrescriptionSection
          :patient-id="selectedPatientId"
          :appointment="linkMode === 'appointment' && selectedAppointmentId ? { id: selectedAppointmentId } : null"
          :documents="appointmentDocuments"
          :load-documents="loadAppointmentDocumentsAndRefreshList"
          :prescription-kind="prescriptionKind"
        />
      </div>
    </UCard>

    <PrescriptionPdfPreviewModal
      v-model="previewOpen"
      :pdf-url="previewUrl"
      :file-name="previewFileName"
      title="Aperçu ordonnance"
    />
  </AppPageShell>
</template>

<script setup lang="ts">
import PrescriptionHistoryRow from '~/components/dashboard/PrescriptionHistoryRow.vue';
import { PATIENT_SELECT_SEARCH_PLACEHOLDER, buildPatientSelectRow } from '~/utils/patient-select-menu';
import type { Appointment } from '~/types/appointments';

const props = defineProps<{
  roleBase: string;
  prescriptionKind?: 'medical' | 'nursing';
  /** Pré-sélection patient (fiche patient) */
  initialPatientId?: string;
}>();

const prescriptionKind = computed(() => props.prescriptionKind ?? 'medical');

const toast = useAppToast();

interface ProPrescriptionRow {
  id: string;
  appointment_id: string | null;
  file_name: string;
  created_at: string;
  appointment_scheduled_at?: string | null;
  appointment_status?: string | null;
  appointment_type?: string | null;
  appointment_category_name?: string | null;
  appointment_availability?: unknown;
  patient_first_name?: string | null;
  patient_last_name?: string | null;
  prescription_kind?: string | null;
  prescription_number?: string | null;
  generated_at?: string | null;
}

const prescriptions = ref<ProPrescriptionRow[]>([]);
const listLoading = ref(true);
const pagination = ref<{ page: number; limit: number; total: number; pages: number } | null>(null);
const currentPage = ref(1);
const pageSize = ref(20);
const downloadingId = ref<string | null>(null);
const previewOpen = ref(false);
const previewUrl = ref<string | null>(null);
const previewFileName = ref('ordonnance.pdf');
let previewBlobUrl: string | null = null;
const config = useRuntimeConfig();

const patients = ref<any[]>([]);
const patientsLoading = ref(false);
const selectedPatientId = ref<string | undefined>(undefined);

const appointments = ref<Appointment[]>([]);
const appointmentsLoading = ref(false);
const selectedAppointmentId = ref<string | undefined>(undefined);
const linkMode = ref<'standalone' | 'appointment'>('standalone');

const appointmentDocuments = ref<any[]>([]);
const workspaceTab = ref<'create' | 'history'>('create');

const patientSelectSearchPlaceholder = PATIENT_SELECT_SEARCH_PLACEHOLDER;

const patientSelectItems = computed(() =>
  (patients.value ?? []).map((p: any) => buildPatientSelectRow(p, { labelStyle: 'natural' }))
);

const appointmentSelectItems = computed(() =>
  (appointments.value ?? []).map((a) => ({
    label: appointmentOptionLabel(a),
    value: a.id,
  }))
);


function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function appointmentStatusLabelFr(status: string | null | undefined): string {
  const s = String(status ?? '').trim();
  const map: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    planned: 'Planifié',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return map[s] || s || '—';
}

function statusBadgeColor(status: string | null | undefined): 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info' {
  const s = String(status ?? '');
  if (s === 'completed' || s === 'confirmed') return 'success';
  if (s === 'pending' || s === 'planned') return 'warning';
  if (s === 'inProgress') return 'primary';
  if (s === 'canceled' || s === 'expired' || s === 'refused') return 'error';
  return 'neutral';
}

function appointmentOptionLabel(a: Appointment) {
  const when = a.scheduled_at ? formatDateTime(a.scheduled_at) : '—';
  const st = a.status ? appointmentStatusLabelFr(a.status) : '';
  return st && st !== '—' ? `${when} · ${st}` : when;
}

async function fetchPrescriptionsList() {
  listLoading.value = true;
  try {
    const q = new URLSearchParams({
      page: String(currentPage.value),
      limit: String(pageSize.value),
    });
    if (props.initialPatientId) {
      q.set('patient_id', props.initialPatientId);
    }
    const res = await apiFetch(`${props.roleBase}/prescriptions?${q.toString()}`, { method: 'GET' });
    if (res?.success && Array.isArray(res.data)) {
      prescriptions.value = res.data;
      pagination.value = res.pagination ?? null;
    } else {
      prescriptions.value = [];
      pagination.value = null;
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Chargement impossible', color: 'error' });
    prescriptions.value = [];
  } finally {
    listLoading.value = false;
  }
}

async function fetchPatients() {
  patientsLoading.value = true;
  try {
    const res = await apiFetch('/patients', { method: 'GET' });
    if (res?.success && Array.isArray(res.data)) {
      patients.value = res.data;
    } else {
      patients.value = [];
    }
  } catch {
    patients.value = [];
  } finally {
    patientsLoading.value = false;
  }
}

async function fetchAppointmentsForPatient(patientId: string) {
  appointmentsLoading.value = true;
  appointments.value = [];
  try {
    const params = new URLSearchParams({
      patient_id: patientId,
      limit: '80',
      page: '1',
    });
    const res = await apiFetch(`/appointments?${params.toString()}`, { method: 'GET' });
    if (res?.success && Array.isArray(res.data)) {
      appointments.value = res.data.filter((a: Appointment) =>
        prescriptionKind.value === 'nursing' ? a.type === 'nursing' : true,
      );
    } else {
      appointments.value = [];
    }
  } catch {
    appointments.value = [];
  } finally {
    appointmentsLoading.value = false;
  }
}

async function loadAppointmentDocuments() {
  if (!selectedAppointmentId.value) {
    appointmentDocuments.value = [];
    return;
  }
  try {
    const res = await apiFetch(`/medical-documents?appointment_id=${selectedAppointmentId.value}`, {
      method: 'GET',
    });
    if (res?.success && Array.isArray(res.data)) {
      appointmentDocuments.value = res.data;
    } else {
      appointmentDocuments.value = [];
    }
  } catch {
    appointmentDocuments.value = [];
  }
}

async function loadAppointmentDocumentsAndRefreshList() {
  if (linkMode.value === 'appointment' && selectedAppointmentId.value) {
    await loadAppointmentDocuments();
  } else {
    appointmentDocuments.value = [];
  }
  await fetchPrescriptionsList();
}

async function fetchPdfBlob(docId: string): Promise<Blob | null> {
  const apiBase = config.public?.apiBase || '';
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const res = await fetch(`${apiBase}/medical-documents/${docId}/download`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  return res.blob();
}

function revokePreviewBlob() {
  if (previewBlobUrl) {
    try {
      URL.revokeObjectURL(previewBlobUrl);
    } catch {
      /* ignore */
    }
    previewBlobUrl = null;
  }
}

async function previewPrescription(row: ProPrescriptionRow) {
  revokePreviewBlob();
  previewUrl.value = null;
  previewFileName.value = row.file_name || 'ordonnance.pdf';
  previewOpen.value = true;
  try {
    const blob = await fetchPdfBlob(row.id);
    if (!blob) throw new Error('Aperçu impossible');
    previewBlobUrl = URL.createObjectURL(blob);
    previewUrl.value = previewBlobUrl;
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Aperçu impossible', color: 'error' });
  }
}

async function downloadPrescription(row: ProPrescriptionRow) {
  downloadingId.value = row.id;
  try {
    const blob = await fetchPdfBlob(row.id);
    if (!blob) throw new Error('Téléchargement impossible');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = row.file_name || 'ordonnance.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.add({ title: 'Téléchargement', description: 'Document téléchargé.', color: 'success' });
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Impossible de télécharger', color: 'error' });
  } finally {
    downloadingId.value = null;
  }
}

watch(currentPage, () => {
  fetchPrescriptionsList();
});

watch(selectedPatientId, (id) => {
  selectedAppointmentId.value = undefined;
  appointmentDocuments.value = [];
  if (id) {
    fetchAppointmentsForPatient(id);
  } else {
    appointments.value = [];
  }
});

watch(linkMode, (mode) => {
  if (mode === 'standalone') {
    selectedAppointmentId.value = undefined;
    appointmentDocuments.value = [];
  }
});

watch(selectedAppointmentId, (id) => {
  if (id) {
    loadAppointmentDocuments();
  } else {
    appointmentDocuments.value = [];
  }
});

onMounted(() => {
  if (props.initialPatientId) {
    selectedPatientId.value = props.initialPatientId;
  }
  fetchPrescriptionsList();
  fetchPatients();
});

watch(previewOpen, (open) => {
  if (!open) revokePreviewBlob();
});
</script>
