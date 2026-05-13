<template>
  <AppPageShell class="space-y-8">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Ordonnances"
        description="Documents générés ou enregistrés pour vos patients, liés à un rendez-vous."
      />
    </template>

    <UCard class="overflow-hidden ring-1 ring-default/60">
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

        <!-- Mobile : cartes -->
        <div v-else class="md:hidden space-y-3">
          <div
            v-for="row in prescriptions"
            :key="row.id"
            class="rounded-xl border border-default/50 bg-default/5 p-4 space-y-3"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-muted uppercase tracking-wide">Enregistrée le</p>
                <p class="text-sm font-medium">{{ formatDateTime(row.created_at) }}</p>
              </div>
              <UBadge v-if="row.appointment_status" :color="statusBadgeColor(row.appointment_status)" variant="subtle" size="sm">
                {{ appointmentStatusLabelFr(row.appointment_status) }}
              </UBadge>
            </div>
            <div>
              <p class="text-xs text-muted">Patient</p>
              <p class="text-sm font-medium truncate">{{ patientLabel(row) }}</p>
            </div>
            <div v-if="row.appointment_id">
              <p class="text-xs text-muted">Rendez-vous</p>
              <NuxtLink
                :to="`${roleBase}/appointments/${row.appointment_id}`"
                class="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                {{ formatDateTime(row.appointment_scheduled_at) }}
                <UIcon name="i-lucide-arrow-up-right" class="w-3.5 h-3.5" />
              </NuxtLink>
            </div>
            <div>
              <p class="text-xs text-muted">Fichier</p>
              <p class="text-sm truncate" :title="row.file_name">{{ row.file_name || '—' }}</p>
            </div>
            <UButton
              block
              size="sm"
              color="primary"
              variant="soft"
              leading-icon="i-lucide-download"
              :loading="downloadingId === row.id"
              @click="downloadPrescription(row)"
            >
              Télécharger
            </UButton>
          </div>
        </div>

        <!-- Tableau desktop -->
        <div v-if="prescriptions.length > 0" class="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-default/60 text-left text-muted">
                <th class="px-4 py-3 font-medium">Date</th>
                <th class="px-4 py-3 font-medium">Patient</th>
                <th class="px-4 py-3 font-medium">Rendez-vous</th>
                <th class="px-4 py-3 font-medium">Statut</th>
                <th class="px-4 py-3 font-medium">Fichier</th>
                <th class="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in prescriptions"
                :key="`t-${row.id}`"
                class="border-b border-default/40 hover:bg-default/30 transition-colors"
              >
                <td class="px-4 py-3 whitespace-nowrap">{{ formatDateTime(row.created_at) }}</td>
                <td class="px-4 py-3">{{ patientLabel(row) }}</td>
                <td class="px-4 py-3">
                  <template v-if="row.appointment_id">
                    <NuxtLink
                      :to="`${roleBase}/appointments/${row.appointment_id}`"
                      class="text-primary hover:underline font-medium"
                    >
                      {{ formatDateTime(row.appointment_scheduled_at) }}
                    </NuxtLink>
                  </template>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="px-4 py-3">
                  <UBadge v-if="row.appointment_status" :color="statusBadgeColor(row.appointment_status)" variant="subtle" size="sm">
                    {{ appointmentStatusLabelFr(row.appointment_status) }}
                  </UBadge>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="px-4 py-3 max-w-[220px] truncate" :title="row.file_name">{{ row.file_name || '—' }}</td>
                <td class="px-4 py-3 text-right">
                  <UButton
                    size="xs"
                    variant="soft"
                    color="primary"
                    leading-icon="i-lucide-download"
                    :loading="downloadingId === row.id"
                    @click="downloadPrescription(row)"
                  >
                    Télécharger
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
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

    <UCard class="ring-1 ring-default/60">
      <template #header>
        <h2 class="text-lg font-normal flex items-center gap-2">
          <UIcon name="i-lucide-plus-circle" class="w-5 h-5 text-primary shrink-0" />
          Nouvelle ordonnance
        </h2>
      </template>
      <p class="text-sm text-muted mb-4">
        Choisissez un patient puis un rendez-vous existant. Le PDF sera lié à ce rendez-vous.
      </p>
      <div class="space-y-4 max-w-xl">
        <UFormField label="Patient" name="patient">
          <USelectMenu
            v-model="selectedPatientId"
            :items="patientSelectItems"
            value-key="value"
            placeholder="Sélectionner un patient…"
            size="md"
            class="w-full"
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
        </UFormField>
        <UFormField v-if="selectedPatientId" label="Rendez-vous" name="appointment">
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
            Aucun rendez-vous pour ce patient. Créez d’abord un rendez-vous depuis la fiche patient ou le calendrier.
          </p>
        </UFormField>
      </div>

      <div v-if="selectedAppointmentId" class="mt-6 pt-6 border-t border-default/50">
        <PrescriptionSection
          :appointment="{ id: selectedAppointmentId }"
          :documents="appointmentDocuments"
          :load-documents="loadAppointmentDocumentsAndRefreshList"
        />
      </div>
    </UCard>
  </AppPageShell>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';
import { PATIENT_SELECT_SEARCH_PLACEHOLDER, buildPatientSelectRow } from '~/utils/patient-select-menu';
import type { Appointment } from '~/types/appointments';

const props = defineProps<{
  roleBase: string;
}>();

const toast = useAppToast();

interface ProPrescriptionRow {
  id: string;
  appointment_id: string | null;
  file_name: string;
  created_at: string;
  appointment_scheduled_at?: string | null;
  appointment_status?: string | null;
  patient_first_name?: string | null;
  patient_last_name?: string | null;
}

const prescriptions = ref<ProPrescriptionRow[]>([]);
const listLoading = ref(true);
const pagination = ref<{ page: number; limit: number; total: number; pages: number } | null>(null);
const currentPage = ref(1);
const pageSize = ref(20);
const downloadingId = ref<string | null>(null);

const patients = ref<any[]>([]);
const patientsLoading = ref(false);
const selectedPatientId = ref<string | undefined>(undefined);

const appointments = ref<Appointment[]>([]);
const appointmentsLoading = ref(false);
const selectedAppointmentId = ref<string | undefined>(undefined);

const appointmentDocuments = ref<any[]>([]);

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

function patientLabel(row: ProPrescriptionRow) {
  const n = [String(row.patient_first_name ?? '').trim(), String(row.patient_last_name ?? '').trim()]
    .filter(Boolean)
    .join(' ');
  return n || '—';
}

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
      appointments.value = res.data;
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
  await loadAppointmentDocuments();
  await fetchPrescriptionsList();
}

async function downloadPrescription(row: ProPrescriptionRow) {
  downloadingId.value = row.id;
  try {
    const config = useRuntimeConfig();
    const apiBase = config.public?.apiBase || '';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`${apiBase}/medical-documents/${row.id}/download`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Téléchargement impossible');
    const blob = await res.blob();
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

watch(selectedAppointmentId, (id) => {
  if (id) {
    loadAppointmentDocuments();
  } else {
    appointmentDocuments.value = [];
  }
});

onMounted(() => {
  fetchPrescriptionsList();
  fetchPatients();
});
</script>
