<template>
  <UCard>
    <template #header>
      <h2 class="text-lg font-normal flex items-center gap-2">
        <UIcon name="i-lucide-file-text" class="w-5 h-5" />
        {{ sectionTitle }}
      </h2>
    </template>
    <div v-if="linkedToAppointment && hasExistingOrdonnance" class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg space-y-3">
      <p class="text-sm text-amber-800 dark:text-amber-200">
        Une ordonnance est déjà enregistrée pour ce rendez-vous. Vous pouvez la consulter, la télécharger ou modifier le texte ci-dessous pour en régénérer une nouvelle.
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="existingOrdonnanceDoc"
          size="sm"
          color="neutral"
          variant="soft"
          leading-icon="i-lucide-eye"
          :loading="previewingExisting"
          @click="previewExistingOrdonnance"
        >
          Voir
        </UButton>
        <UButton
          v-if="existingOrdonnanceDoc"
          size="sm"
          color="neutral"
          variant="soft"
          leading-icon="i-lucide-download"
          :loading="downloadingExisting"
          @click="downloadExistingOrdonnance"
        >
          Télécharger
        </UButton>
      </div>
    </div>
    <div class="space-y-4">
      <PrescriptionProfileGapsAlert
        :gaps="profileGaps"
        :patient-id="patientId"
        :prescriber-role="user?.role"
        @sign-prescriber="openSignatureModal(false)"
      />

      <UFormField label="Date de l'ordonnance" name="prescription_date">
        <UInput v-model="prescriptionDate" type="date" class="w-full max-w-xs" />
      </UFormField>

      <div class="flex items-start justify-between gap-3">
        <label class="flex flex-1 items-start gap-3 cursor-pointer min-w-0">
          <UCheckbox v-model="includeSignature" />
          <span class="text-sm min-w-0">
            <span class="font-medium text-gray-900 dark:text-gray-100">Inclure ma signature manuscrite</span>
            <span class="block text-muted">
              {{ hasStoredSignature ? 'Signature enregistrée sur votre compte' : 'Vous serez invité à signer avant génération' }}
            </span>
          </span>
        </label>
        <UButton
          v-if="hasStoredSignature || includeSignature"
          size="xs"
          color="primary"
          variant="ghost"
          icon="i-lucide-pen-line"
          aria-label="Modifier ma signature manuscrite"
          @click="openSignatureModal(false)"
        />
      </div>

      <PrescriptionMedicalFields v-model="medicalFields" />
      <div class="flex flex-wrap gap-2">
        <UButton
          color="primary"
          leading-icon="i-lucide-file-output"
          :loading="generating"
          :disabled="!canGenerate"
          @click="onGenerateClick"
        >
          Générer le PDF
        </UButton>
        <UButton
          v-if="generatedPdfBase64 && !hasExistingOrdonnance"
          color="neutral"
          variant="soft"
          leading-icon="i-lucide-eye"
          @click="previewGenerated"
        >
          Aperçu
        </UButton>
        <UButton
          v-if="generatedPdfBase64 && !hasExistingOrdonnance && saveFailed"
          color="success"
          variant="soft"
          leading-icon="i-lucide-upload"
          :loading="uploading"
          @click="savePrescription"
        >
          {{ saveButtonLabel }}
        </UButton>
      </div>
    </div>

    <PrescriptionPdfPreviewModal
      v-model="previewOpen"
      :pdf-url="previewUrl"
      :file-name="previewFileName"
      :title="sectionTitle"
    />

    <UModal v-model:open="signatureModalOpen" title="Signer l'ordonnance">
      <template #body>
        <p class="text-sm text-muted mb-3">
          Votre signature sera enregistrée sur votre compte professionnel.
        </p>
        <PrescriptionSignaturePad ref="signaturePadRef" />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="signatureModalOpen = false">Annuler</UButton>
          <UButton color="primary" :loading="signatureSaving" @click="saveSignatureAndGenerate">
            Enregistrer et générer
          </UButton>
        </div>
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import PrescriptionSignaturePad from '~/components/prescription/PrescriptionSignaturePad.vue';
import PrescriptionProfileGapsAlert from '~/components/prescription/PrescriptionProfileGapsAlert.vue';
import PrescriptionMedicalFields from '~/components/prescription/PrescriptionMedicalFields.vue';
import {
  getPrescriptionProfileGaps,
  type PrescriptionProfileSnapshot,
  composeMedicalPrescriptionText,
  hasMedicalPrescriptionContent,
  parseMedicalPrescriptionText,
  type MedicalPrescriptionFields,
} from '@oneandlab/shared-utils';
const props = defineProps<{
  patientId: string;
  appointment?: { id: string } | null;
  documents?: any[];
  loadDocuments?: () => Promise<void>;
  initialPrescriptionText?: string;
  prescriptionKind?: 'medical' | 'nursing';
}>();

const toast = useAppToast();
const config = useRuntimeConfig();
const { user } = useAuth();

const kind = computed(() => props.prescriptionKind ?? 'medical');
const linkedToAppointment = computed(() => Boolean(props.appointment?.id));
const sectionTitle = computed(() =>
  kind.value === 'nursing' ? 'Prescription d\'actes infirmiers' : 'Créer une ordonnance',
);
const saveButtonLabel = computed(() =>
  linkedToAppointment.value ? 'Enregistrer sur le RDV' : 'Enregistrer l\'ordonnance',
);

const medicalFields = ref<MedicalPrescriptionFields>(
  parseMedicalPrescriptionText(props.initialPrescriptionText ?? ''),
);
const composedPrescriptionText = computed(() =>
  composeMedicalPrescriptionText(medicalFields.value),
);
const prescriptionDate = ref(new Date().toISOString().slice(0, 10));
const includeSignature = ref(true);
const signatureModalOpen = ref(false);
const signaturePadRef = ref<InstanceType<typeof PrescriptionSignaturePad> | null>(null);
const signatureSaving = ref(false);
const pendingGenerateAfterSignature = ref(false);
const storedSignaturePng = ref<string | null>(null);
const prescriberProfile = ref<PrescriptionProfileSnapshot | null>(null);
const patientProfile = ref<PrescriptionProfileSnapshot | null>(null);
const generating = ref(false);
const uploading = ref(false);
const saveFailed = ref(false);
const generatedPdfBase64 = ref<string | null>(null);
const generatedMeta = ref<{ file_name?: string; prescription_number?: string; prescription_kind?: string } | null>(null);
const downloadingExisting = ref(false);
const previewingExisting = ref(false);
const previewOpen = ref(false);
const previewUrl = ref<string | null>(null);
const previewFileName = ref('ordonnance.pdf');
let previewBlobUrl: string | null = null;

const canGenerate = computed(() =>
  Boolean(props.patientId?.trim()) && hasMedicalPrescriptionContent(medicalFields.value),
);

const hasStoredSignature = computed(() => Boolean(storedSignaturePng.value?.trim()));

const profileGaps = computed(() =>
  getPrescriptionProfileGaps({
    patient: patientProfile.value,
    prescriber: prescriberProfile.value,
    prescriptionKind: kind.value,
    prescriberRole: user.value?.role,
    includeSignature: includeSignature.value,
  }),
);

function profileSnapshotFromApi(data: Record<string, unknown>): PrescriptionProfileSnapshot {
  return {
    first_name: (data.first_name as string | null | undefined) ?? null,
    last_name: (data.last_name as string | null | undefined) ?? null,
    birth_date: (data.birth_date as string | null | undefined) ?? null,
    nir: (data.nir as string | null | undefined) ?? null,
    address: data.address,
    rpps: (data.rpps as string | null | undefined) ?? null,
    adeli: (data.adeli as string | null | undefined) ?? null,
    emploi: (data.emploi as string | null | undefined) ?? null,
    prescription_signature_png: (data.prescription_signature_png as string | null | undefined) ?? null,
  };
}

async function loadPrescriberProfile() {
  const userId = user.value?.id;
  if (!userId) return;
  try {
    const res = await apiFetch(`/users/${userId}`);
    if (res?.success && res?.data) {
      const data = res.data as Record<string, unknown>;
      prescriberProfile.value = profileSnapshotFromApi(data);
      storedSignaturePng.value = (data.prescription_signature_png as string | null | undefined) ?? null;
    }
  } catch {
    /* ignore */
  }
}

async function loadPatientProfile() {
  const id = props.patientId?.trim();
  if (!id) {
    patientProfile.value = null;
    return;
  }
  try {
    const res = await apiFetch(`/users/${id}`);
    if (res?.success && res?.data) {
      patientProfile.value = profileSnapshotFromApi(res.data as Record<string, unknown>);
    } else {
      patientProfile.value = null;
    }
  } catch {
    patientProfile.value = null;
  }
}

onMounted(async () => {
  await loadPrescriberProfile();
  await loadPatientProfile();
});

watch(() => props.patientId, () => {
  void loadPatientProfile();
});

function openSignatureModal(pendingGenerate = false) {
  pendingGenerateAfterSignature.value = pendingGenerate;
  signatureModalOpen.value = true;
  nextTick(() => signaturePadRef.value?.loadFromBase64(storedSignaturePng.value));
}

async function saveSignatureAndGenerate() {
  const userId = user.value?.id;
  const png = signaturePadRef.value?.exportPngBase64();
  if (!userId || !png) {
    toast.add({ title: 'Signature requise', description: 'Dessinez votre signature.', color: 'warning' });
    return;
  }
  signatureSaving.value = true;
  try {
    const res = await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      body: { prescription_signature_png: png },
    });
    if (!res?.success) throw new Error((res as any)?.error ?? 'Enregistrement impossible');
    storedSignaturePng.value = png;
    prescriberProfile.value = {
      ...(prescriberProfile.value ?? {}),
      prescription_signature_png: png,
    };
    signatureModalOpen.value = false;
    if (pendingGenerateAfterSignature.value) {
      pendingGenerateAfterSignature.value = false;
      await generatePdf();
    } else {
      toast.add({ title: 'Signature enregistrée', color: 'success' });
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Enregistrement impossible', color: 'error' });
  } finally {
    signatureSaving.value = false;
  }
}

async function onGenerateClick() {
  if (includeSignature.value && !hasStoredSignature.value) {
    openSignatureModal(true);
    return;
  }
  await generatePdf();
}

watch(() => props.initialPrescriptionText, (v) => {
  if (v == null) return;
  medicalFields.value = parseMedicalPrescriptionText(v);
}, { immediate: true });

const hasExistingOrdonnance = computed(() =>
  linkedToAppointment.value &&
  (props.documents || []).some((d: any) => d.document_type === 'ordonnance'),
);

const existingOrdonnanceDoc = computed(() =>
  (props.documents || []).find((d: any) => d.document_type === 'ordonnance'),
);

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

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

function openBlobPreview(blob: Blob, fileName: string) {
  revokePreviewBlob();
  previewBlobUrl = URL.createObjectURL(blob);
  previewUrl.value = previewBlobUrl;
  previewFileName.value = fileName;
  previewOpen.value = true;
}

async function uploadGeneratedPrescription(base64: string, fileName: string) {
  const blob = base64ToBlob(base64, 'application/pdf');
  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('document_type', 'ordonnance');
  formData.append('patient_id', props.patientId);
  if (props.appointment?.id) {
    formData.append('appointment_id', props.appointment.id);
  }
  formData.append('prescription_kind', generatedMeta.value?.prescription_kind || kind.value);
  formData.append('prescription_text', composedPrescriptionText.value);
  if (generatedMeta.value?.prescription_number) {
    formData.append('prescription_number', generatedMeta.value.prescription_number);
  }
  return apiFetch('/medical-documents', { method: 'POST', body: formData });
}

async function generatePdf() {
  if (!canGenerate.value) return;
  generating.value = true;
  generatedPdfBase64.value = null;
  generatedMeta.value = null;
  saveFailed.value = false;
  try {
    const body: Record<string, string> = {
      patient_id: props.patientId,
      prescription_kind: kind.value,
      prescription_date: prescriptionDate.value,
      ald_prescription: medicalFields.value.ald.trim(),
      hors_ald_prescription: medicalFields.value.horsAld.trim(),
      prescription_text: composedPrescriptionText.value,
    };
    if (props.appointment?.id) {
      body.appointment_id = props.appointment.id;
    }
    if (includeSignature.value) {
      body.include_handwritten_signature = '1';
    }
    const res = await apiFetch('/prescriptions/generate', {
      method: 'POST',
      body,
    });
    if (!res?.success || !res?.data?.pdf_base64) {
      toast.add({ title: 'Erreur', description: (res as any)?.error ?? 'Impossible de générer le PDF', color: 'error' });
      return;
    }
    generatedPdfBase64.value = res.data.pdf_base64;
    generatedMeta.value = {
      file_name: res.data.file_name,
      prescription_number: res.data.prescription_number,
      prescription_kind: res.data.prescription_kind,
    };
    const fileName = res.data.file_name || 'ordonnance.pdf';
    openBlobPreview(base64ToBlob(res.data.pdf_base64, 'application/pdf'), fileName);

    const saveRes = await uploadGeneratedPrescription(res.data.pdf_base64, fileName);
    if (saveRes?.success) {
      saveFailed.value = false;
      toast.add({
        title: 'Ordonnance enregistrée',
        description: linkedToAppointment.value
          ? "L'ordonnance a été enregistrée sur le rendez-vous."
          : "L'ordonnance a été enregistrée dans l'historique.",
        color: 'success',
      });
      await props.loadDocuments?.();
    } else {
      saveFailed.value = true;
      toast.add({
        title: 'Erreur',
        description: (saveRes as any)?.error ?? 'PDF généré — enregistrement impossible, réessayez',
        color: 'error',
      });
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Génération impossible', color: 'error' });
  } finally {
    generating.value = false;
  }
}

function previewGenerated() {
  if (!generatedPdfBase64.value) return;
  const fileName = generatedMeta.value?.file_name || 'ordonnance.pdf';
  openBlobPreview(base64ToBlob(generatedPdfBase64.value, 'application/pdf'), fileName);
}

async function fetchExistingBlob(docId: string): Promise<Blob | null> {
  const apiBase = config.public?.apiBase || '';
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const res = await fetch(`${apiBase}/medical-documents/${docId}/download`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.blob();
}

async function previewExistingOrdonnance() {
  const doc = existingOrdonnanceDoc.value;
  if (!doc?.id) return;
  previewingExisting.value = true;
  try {
    const blob = await fetchExistingBlob(doc.id);
    if (!blob) throw new Error('Aperçu impossible');
    openBlobPreview(blob, doc.file_name || 'ordonnance.pdf');
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Aperçu impossible', color: 'error' });
  } finally {
    previewingExisting.value = false;
  }
}

async function downloadExistingOrdonnance() {
  const doc = existingOrdonnanceDoc.value;
  if (!doc?.id) return;
  downloadingExisting.value = true;
  try {
    const blob = await fetchExistingBlob(doc.id);
    if (!blob) throw new Error('Téléchargement impossible');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name || 'ordonnance.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.add({ title: 'Téléchargement', description: 'Ordonnance téléchargée.', color: 'success' });
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Impossible de télécharger', color: 'error' });
  } finally {
    downloadingExisting.value = false;
  }
}

async function savePrescription() {
  if (!generatedPdfBase64.value || !props.patientId) return;
  uploading.value = true;
  try {
    const fileName = generatedMeta.value?.file_name || 'ordonnance.pdf';
    const res = await uploadGeneratedPrescription(generatedPdfBase64.value, fileName);
    if (res?.success) {
      saveFailed.value = false;
      toast.add({
        title: 'Ordonnance enregistrée',
        description: linkedToAppointment.value
          ? "L'ordonnance a été enregistrée sur le rendez-vous."
          : "L'ordonnance a été enregistrée dans l'historique.",
        color: 'success',
      });
      generatedPdfBase64.value = null;
      generatedMeta.value = null;
      await props.loadDocuments?.();
    } else {
      toast.add({ title: 'Erreur', description: (res as any)?.error ?? "Impossible d'enregistrer", color: 'error' });
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? "Enregistrement impossible", color: 'error' });
  } finally {
    uploading.value = false;
  }
}

watch(previewOpen, (open) => {
  if (!open) revokePreviewBlob();
});
</script>
