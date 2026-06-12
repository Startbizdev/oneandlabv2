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
      <UFormField :label="textareaLabel" name="prescription">
        <UTextarea
          v-model="prescriptionText"
          :placeholder="textareaPlaceholder"
          :rows="6"
          class="font-mono text-sm w-full"
        />
      </UFormField>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="primary"
          leading-icon="i-lucide-file-output"
          :loading="generating"
          :disabled="!canGenerate"
          @click="generatePdf"
        >
          Générer le PDF
        </UButton>
        <UButton
          v-if="generatedPdfBase64"
          color="neutral"
          variant="soft"
          leading-icon="i-lucide-eye"
          @click="previewGenerated"
        >
          Aperçu
        </UButton>
        <UButton
          v-if="generatedPdfBase64"
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
  </UCard>
</template>

<script setup lang="ts">
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

const kind = computed(() => props.prescriptionKind ?? 'medical');
const linkedToAppointment = computed(() => Boolean(props.appointment?.id));
const sectionTitle = computed(() =>
  kind.value === 'nursing' ? 'Prescription d\'actes infirmiers' : 'Créer une ordonnance',
);
const saveButtonLabel = computed(() =>
  linkedToAppointment.value ? 'Enregistrer sur le RDV' : 'Enregistrer l\'ordonnance',
);
const textareaLabel = computed(() =>
  kind.value === 'nursing'
    ? 'Actes de soins infirmiers (pansements, injections, surveillance…)'
    : 'Prescription (médicaments, posologie, durée…)',
);
const textareaPlaceholder = computed(() =>
  kind.value === 'nursing'
    ? 'Ex: Pansement quotidien — surveillance plaie — injection sous-cutanée…'
    : 'Ex: Doliprane 1000mg - 1 cp x 3/jour pendant 5 jours...',
);

const prescriptionText = ref(props.initialPrescriptionText ?? '');
const generating = ref(false);
const uploading = ref(false);
const generatedPdfBase64 = ref<string | null>(null);
const generatedMeta = ref<{ file_name?: string; prescription_number?: string; prescription_kind?: string } | null>(null);
const downloadingExisting = ref(false);
const previewingExisting = ref(false);
const previewOpen = ref(false);
const previewUrl = ref<string | null>(null);
const previewFileName = ref('ordonnance.pdf');
let previewBlobUrl: string | null = null;

const canGenerate = computed(() =>
  Boolean(props.patientId?.trim()) && Boolean(prescriptionText.value.trim()),
);

watch(() => props.initialPrescriptionText, (v) => {
  if (v != null && v !== prescriptionText.value) prescriptionText.value = v;
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

async function generatePdf() {
  if (!canGenerate.value) return;
  generating.value = true;
  generatedPdfBase64.value = null;
  generatedMeta.value = null;
  try {
    const body: Record<string, string> = {
      patient_id: props.patientId,
      prescription_text: prescriptionText.value.trim(),
      prescription_kind: kind.value,
    };
    if (props.appointment?.id) {
      body.appointment_id = props.appointment.id;
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
    toast.add({
      title: 'PDF généré',
      description: linkedToAppointment.value
        ? 'Consultez l\'aperçu ou enregistrez sur le RDV.'
        : 'Consultez l\'aperçu ou enregistrez l\'ordonnance.',
      color: 'success',
    });
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
    const blob = base64ToBlob(generatedPdfBase64.value, 'application/pdf');
    const fileName = generatedMeta.value?.file_name || 'ordonnance.pdf';
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('document_type', 'ordonnance');
    formData.append('patient_id', props.patientId);
    if (props.appointment?.id) {
      formData.append('appointment_id', props.appointment.id);
    }
    formData.append('prescription_kind', generatedMeta.value?.prescription_kind || kind.value);
    formData.append('prescription_text', prescriptionText.value.trim());
    if (generatedMeta.value?.prescription_number) {
      formData.append('prescription_number', generatedMeta.value.prescription_number);
    }
    const res = await apiFetch('/medical-documents', { method: 'POST', body: formData });
    if (res?.success) {
      toast.add({
        title: 'Ordonnance enregistrée',
        description: linkedToAppointment.value
          ? "L'ordonnance a été ajoutée aux documents du RDV."
          : "L'ordonnance a été enregistrée dans l'historique du patient.",
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
