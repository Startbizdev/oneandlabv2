<template>
  <UCard>
    <template #header>
      <h2 class="text-lg font-normal flex items-center gap-2">
        <UIcon name="i-lucide-file-text" class="w-5 h-5" />
        Créer une ordonnance
      </h2>
    </template>
    <div v-if="hasExistingOrdonnance" class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg space-y-3">
      <p class="text-sm text-amber-800 dark:text-amber-200">
        Une ordonnance est déjà enregistrée pour ce rendez-vous. Vous pouvez la télécharger ou modifier le texte ci-dessous pour en régénérer une nouvelle.
      </p>
      <UButton
        v-if="existingOrdonnanceDoc"
        size="sm"
        color="neutral"
        variant="soft"
        leading-icon="i-lucide-download"
        :loading="downloadingExisting"
        @click="downloadExistingOrdonnance"
      >
        Télécharger l'ordonnance enregistrée
      </UButton>
    </div>
    <div class="space-y-4">
      <UFormField label="Prescription (médicaments, posologie, durée...)" name="prescription">
        <UTextarea
          v-model="prescriptionText"
          placeholder="Ex: Doliprane 1000mg - 1 cp x 3/jour pendant 5 jours..."
          :rows="6"
          class="font-mono text-sm w-full"
        />
      </UFormField>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="primary"
          leading-icon="i-lucide-file-output"
          :loading="generating"
          :disabled="!prescriptionText.trim()"
          @click="generateAndDownload"
        >
          Générer le PDF
        </UButton>
        <UButton
          v-if="generatedPdfBase64"
          color="success"
          variant="soft"
          leading-icon="i-lucide-upload"
          :loading="uploading"
          @click="saveToAppointment"
        >
          Enregistrer sur le RDV
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  appointment: { id: string } | null;
  documents: any[];
  loadDocuments?: () => Promise<void>;
  /** Texte de prescription initial (ex. après création du RDV pour modifier / régénérer) */
  initialPrescriptionText?: string;
}>();

const toast = useAppToast();
const prescriptionText = ref(props.initialPrescriptionText ?? '');
const generating = ref(false);
const uploading = ref(false);
const generatedPdfBase64 = ref<string | null>(null);
const downloadingExisting = ref(false);

watch(() => props.initialPrescriptionText, (v) => {
  if (v != null && v !== prescriptionText.value) prescriptionText.value = v;
}, { immediate: true });

const hasExistingOrdonnance = computed(() =>
  (props.documents || []).some((d: any) => d.document_type === 'ordonnance')
);

const existingOrdonnanceDoc = computed(() =>
  (props.documents || []).find((d: any) => d.document_type === 'ordonnance')
);

async function generateAndDownload() {
  if (!props.appointment?.id || !prescriptionText.value.trim()) return;
  generating.value = true;
  generatedPdfBase64.value = null;
  try {
    const res = await apiFetch(`/appointments/${props.appointment.id}/generate-prescription`, {
      method: 'POST',
      body: { prescription_text: prescriptionText.value.trim() },
    });
    if (!res?.success || !res?.data?.pdf_base64) {
      toast.add({ title: 'Erreur', description: (res as any)?.error ?? 'Impossible de générer le PDF', color: 'error' });
      return;
    }
    generatedPdfBase64.value = res.data.pdf_base64;
    const fileName = res.data.file_name || 'ordonnance.pdf';
    const blob = base64ToBlob(res.data.pdf_base64, 'application/pdf');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.add({ title: 'PDF généré', description: 'Téléchargez-le ou enregistrez-le sur le RDV.', color: 'success' });
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Génération impossible', color: 'error' });
  } finally {
    generating.value = false;
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

async function downloadExistingOrdonnance() {
  const doc = existingOrdonnanceDoc.value;
  if (!doc?.id) return;
  downloadingExisting.value = true;
  try {
    const config = useRuntimeConfig();
    const apiBase = config.public?.apiBase || '';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`${apiBase}/medical-documents/${doc.id}/download`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Téléchargement impossible');
    const blob = await res.blob();
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

async function saveToAppointment() {
  if (!props.appointment?.id || !generatedPdfBase64.value) return;
  uploading.value = true;
  try {
    const blob = base64ToBlob(generatedPdfBase64.value, 'application/pdf');
    const formData = new FormData();
    formData.append('file', blob, 'ordonnance.pdf');
    formData.append('appointment_id', props.appointment.id);
    formData.append('document_type', 'ordonnance');
    const res = await apiFetch('/medical-documents', { method: 'POST', body: formData });
    if (res?.success) {
      toast.add({ title: 'Ordonnance enregistrée', description: "L'ordonnance a été ajoutée aux documents du RDV.", color: 'success' });
      generatedPdfBase64.value = null;
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
</script>
