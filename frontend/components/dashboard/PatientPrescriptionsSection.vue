<template>
  <UCard class="overflow-hidden ring-1 ring-default/60">
    <template #header>
      <h2 class="text-lg font-normal flex items-center gap-2">
        <UIcon name="i-lucide-file-pen-line" class="w-5 h-5 text-primary shrink-0" />
        Ordonnances
      </h2>
    </template>

    <div v-if="listLoading" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>
    <template v-else>
      <div v-if="prescriptions.length === 0" class="py-6">
        <UEmpty
          icon="i-lucide-file-pen-line"
          title="Aucune ordonnance"
          :description="emptyDescription"
          variant="naked"
        />
      </div>
      <ul v-else class="space-y-2 mb-6">
        <li v-for="row in prescriptions" :key="row.id">
          <PrescriptionHistoryRow
            :row="row"
            :role-base="roleBase"
            :show-patient="false"
            :downloading="downloadingId === row.id"
            @preview="previewRow"
            @download="downloadRow"
          />
        </li>
      </ul>
    </template>

    <div class="pt-4 border-t border-default/50 space-y-4">
      <p class="text-sm text-muted">{{ createHint }}</p>

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

      <UFormField v-if="linkMode === 'appointment'" label="Rendez-vous" name="rx-appointment">
        <USelectMenu
          v-model="selectedAppointmentId"
          :items="appointmentSelectItems"
          value-key="value"
          placeholder="Choisir un rendez-vous…"
          size="md"
          class="w-full"
          :loading="appointmentsLoading"
          :disabled="appointmentSelectItems.length === 0 && !appointmentsLoading"
        />
      </UFormField>
      <p
        v-if="linkMode === 'appointment' && !appointmentsLoading && appointmentSelectItems.length === 0"
        class="text-sm text-amber-600 dark:text-amber-400"
      >
        Aucun rendez-vous — utilisez « sans rendez-vous ».
      </p>
      <PrescriptionSection
        v-if="linkMode === 'standalone' || selectedAppointmentId"
        :patient-id="patientId"
        :appointment="linkMode === 'appointment' && selectedAppointmentId ? { id: selectedAppointmentId } : null"
        :documents="appointmentDocuments"
        :load-documents="reloadAll"
        :prescription-kind="prescriptionKind"
      />
    </div>

    <PrescriptionPdfPreviewModal
      v-model="previewOpen"
      :pdf-url="previewUrl"
      :file-name="previewFileName"
      title="Aperçu ordonnance"
    />
  </UCard>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';
import type { Appointment } from '~/types/appointments';

const props = defineProps<{
  patientId: string;
  roleBase: string;
  prescriptionKind: 'medical' | 'nursing';
}>();

interface PrescriptionRow {
  id: string;
  appointment_id?: string | null;
  file_name: string;
  created_at: string;
  generated_at?: string | null;
  prescription_kind?: string | null;
  appointment_scheduled_at?: string | null;
  appointment_status?: string | null;
  appointment_type?: string | null;
  appointment_category_name?: string | null;
  appointment_availability?: unknown;
}

const toast = useAppToast();
const config = useRuntimeConfig();

const prescriptions = ref<PrescriptionRow[]>([]);
const listLoading = ref(true);
const appointments = ref<Appointment[]>([]);
const appointmentsLoading = ref(false);
const selectedAppointmentId = ref<string | undefined>(undefined);
const linkMode = ref<'standalone' | 'appointment'>('standalone');
const appointmentDocuments = ref<any[]>([]);
const downloadingId = ref<string | null>(null);

const previewOpen = ref(false);
const previewUrl = ref<string | null>(null);
const previewFileName = ref('ordonnance.pdf');
let previewBlobUrl: string | null = null;

const emptyDescription = computed(() =>
  props.prescriptionKind === 'nursing'
    ? 'Les prescriptions d\'actes infirmiers apparaîtront ici.'
    : 'Les ordonnances enregistrées apparaîtront ici.',
);

const createHint = computed(() =>
  props.prescriptionKind === 'nursing'
    ? 'Prescription d\'actes infirmiers — avec ou sans rendez-vous.'
    : 'Ordonnance médicale — avec ou sans rendez-vous.',
);

const appointmentSelectItems = computed(() =>
  (appointments.value ?? [])
    .filter((a) => (props.prescriptionKind === 'nursing' ? a.type === 'nursing' : true))
    .map((a) => ({
      label: appointmentOptionLabel(a),
      value: a.id,
    })),
);

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function appointmentOptionLabel(a: Appointment) {
  const when = a.scheduled_at ? formatDateTime(a.scheduled_at) : '—';
  const st = a.status ?? '';
  return st ? `${when} · ${st}` : when;
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

async function fetchPrescriptions() {
  listLoading.value = true;
  try {
    const q = new URLSearchParams({ page: '1', limit: '50', patient_id: props.patientId });
    const res = await apiFetch(`${props.roleBase}/prescriptions?${q.toString()}`, { method: 'GET' });
    prescriptions.value = res?.success && Array.isArray(res.data) ? res.data : [];
  } catch {
    prescriptions.value = [];
  } finally {
    listLoading.value = false;
  }
}

async function fetchAppointments() {
  appointmentsLoading.value = true;
  try {
    const params = new URLSearchParams({ patient_id: props.patientId, limit: '80', page: '1' });
    const res = await apiFetch(`/appointments?${params.toString()}`, { method: 'GET' });
    appointments.value = res?.success && Array.isArray(res.data) ? res.data : [];
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
    appointmentDocuments.value = res?.success && Array.isArray(res.data) ? res.data : [];
  } catch {
    appointmentDocuments.value = [];
  }
}

async function reloadAll() {
  if (linkMode.value === 'appointment' && selectedAppointmentId.value) {
    await loadAppointmentDocuments();
  } else {
    appointmentDocuments.value = [];
  }
  await fetchPrescriptions();
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

async function previewRow(row: PrescriptionRow) {
  revokePreviewBlob();
  previewUrl.value = null;
  previewFileName.value = row.file_name || 'ordonnance.pdf';
  previewOpen.value = true;
  try {
    const blob = await fetchPdfBlob(row.id);
    if (!blob) {
      toast.add({ title: 'Erreur', description: 'Aperçu impossible', color: 'error' });
      return;
    }
    previewBlobUrl = URL.createObjectURL(blob);
    previewUrl.value = previewBlobUrl;
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Aperçu impossible', color: 'error' });
  }
}

async function downloadRow(row: PrescriptionRow) {
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
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Téléchargement impossible', color: 'error' });
  } finally {
    downloadingId.value = null;
  }
}

watch(selectedAppointmentId, (id) => {
  if (id) loadAppointmentDocuments();
  else appointmentDocuments.value = [];
});

watch(linkMode, (mode) => {
  if (mode === 'standalone') {
    selectedAppointmentId.value = undefined;
    appointmentDocuments.value = [];
  }
});

watch(previewOpen, (open) => {
  if (!open) revokePreviewBlob();
});

watch(
  () => props.patientId,
  () => {
    selectedAppointmentId.value = undefined;
    fetchPrescriptions();
    fetchAppointments();
  },
  { immediate: true },
);
</script>
