<template>
  <AppPageShell class="mx-auto max-w-2xl space-y-4">
    <AppPageHeader title="Documents" :edge-bleed="false" />

    <div v-if="loading" class="flex justify-center py-16" role="status" aria-label="Chargement des documents">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary-500" />
    </div>

    <div v-else-if="loadError" class="space-y-3">
      <UAlert color="error" title="Documents indisponibles" :description="loadError" />
      <UButton color="neutral" variant="outline" @click="load">Réessayer</UButton>
    </div>

    <template v-else>
      <UButton color="neutral" variant="outline" :to="backPath" icon="i-lucide-arrow-left">
        Retour au passage
      </UButton>
      <UCard class="overflow-hidden" :ui="{ body: 'p-4 sm:p-4' }">
        <AppointmentDocumentsSection
          :documents="listedDocuments"
          :loading="docsLoading"
          :show-upload-area="canUpload"
          :upload-types="uploadDocumentTypes"
          :show-resultats="false"
          :merge-resultats-into-documents-list="appointmentType === 'blood_test'"
          :can-replace="canUpload"
          :downloading-ids="downloadingIds"
          :uploading-types="uploadingTypes"
          :omit-care-photos-in-list="true"
          @download="downloadDocument"
          @upload="uploadDocumentFile"
          @replaced="loadDocuments"
        />
      </UCard>
    </template>
  </AppPageShell>
</template>

<script setup lang="ts">
import { canUploadMedicalDocumentsForAppointmentStatus } from '~/utils/appointment-documents-upload';
import { buildAppointmentDetailUploadTypes } from '~/utils/appointment-detail-document-types';
import {
  isAllowedMedicalDocumentFile,
  isMedicalDocumentTooLarge,
  medicalDocumentFormatError,
} from '~/utils/medical-document-upload';
import { passageDetailPath, passageListDocuments } from '~/utils/passage-documents';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

useHead({ title: 'Documents – Passage' });

const route = useRoute();
const toast = useAppToast();
const rawSeriesId = computed(() => String(route.params.seriesId ?? ''));
const appointmentId = computed(() => String(route.query.appointment_id ?? ''));
const stopId = computed(() => String(route.query.stop_id ?? ''));
const backPath = computed(() =>
  passageDetailPath(rawSeriesId.value, { appointmentId: appointmentId.value, stopId: stopId.value }),
);

const loading = ref(true);
const loadError = ref('');
const appointmentStatus = ref<string | null>(null);
const appointmentType = ref<string | null>(null);
const downloadingIds = ref(new Set<string>());
const uploadingTypes = ref(new Set<string>());
const uploadDocumentTypes = buildAppointmentDetailUploadTypes();

const {
  documents,
  loading: docsLoading,
  error: documentsError,
  load: loadDocuments,
} = usePassageDocumentsWeb(appointmentId);

const listedDocuments = computed(() => passageListDocuments(documents.value));
const canUpload = computed(() => canUploadMedicalDocumentsForAppointmentStatus(appointmentStatus.value));

const DOC_LABELS: Record<string, string> = {
  carte_vitale: 'Carte Vitale',
  carte_mutuelle: 'Carte Mutuelle',
  attestation_droits_ame: 'Attestation de droits / AME',
  ordonnance: 'Ordonnance',
  resultats: 'Résultats',
  autres_assurances: 'Autre prescription',
  other: 'Autre',
};

async function load() {
  loading.value = true;
  loadError.value = '';
  if (!appointmentId.value) {
    loadError.value = 'Rendez-vous manquant — ouvrez les documents depuis le passage.';
    loading.value = false;
    return;
  }
  try {
    const aptRes = await apiFetch<{ success: boolean; data?: { status?: string; type?: string }; error?: string }>(
      `/appointments/${appointmentId.value}`,
    );
    if (!aptRes?.success || !aptRes.data) {
      throw new Error(aptRes?.error || 'Impossible de charger ce rendez-vous.');
    }
    appointmentStatus.value = typeof aptRes.data.status === 'string' ? aptRes.data.status : null;
    appointmentType.value = typeof aptRes.data.type === 'string' ? aptRes.data.type : null;
    await loadDocuments();
    if (documentsError.value) throw new Error(documentsError.value);
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Impossible de charger les documents.';
  } finally {
    loading.value = false;
  }
}

async function uploadDocumentFile(docType: string, file: File) {
  if (!appointmentId.value) return;
  if (isMedicalDocumentTooLarge(file)) {
    toast.add({ title: 'Fichier trop volumineux', description: 'Le fichier dépasse la limite de 25 Mo autorisée.', color: 'error' });
    return;
  }
  if (!isAllowedMedicalDocumentFile(file, docType)) {
    toast.add({ title: 'Format non accepté', description: medicalDocumentFormatError(docType), color: 'error' });
    return;
  }
  uploadingTypes.value.add(docType);
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('appointment_id', appointmentId.value);
    formData.append('document_type', docType);
    const response = await apiFetch<{ success: boolean; error?: string }>('/medical-documents', { method: 'POST', body: formData });
    if (!response.success) {
      toast.add({ title: "Erreur d'upload", description: response.error || "Impossible d'envoyer le document", color: 'error' });
      return;
    }
    toast.add({ title: 'Document ajouté', description: `${DOC_LABELS[docType] ?? 'Document'} ajouté.`, color: 'success' });
    await loadDocuments();
    if (documentsError.value) {
      toast.add({ title: 'Liste non rafraîchie', description: documentsError.value, color: 'error' });
    }
  } catch (error) {
    toast.add({
      title: "Erreur d'upload",
      description: error instanceof Error ? error.message : "Une erreur est survenue lors de l'envoi",
      color: 'error',
    });
  } finally {
    uploadingTypes.value.delete(docType);
  }
}

async function downloadDocument(doc: { id: string; file_name?: string }) {
  downloadingIds.value.add(doc.id);
  try {
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase || '/api';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await fetch(`${apiBase}/medical-documents/${doc.id}/download`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erreur lors du téléchargement');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name || 'document';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    toast.add({
      title: 'Téléchargement impossible',
      description: error instanceof Error ? error.message : 'Réessayez dans un instant.',
      color: 'error',
    });
  } finally {
    downloadingIds.value.delete(doc.id);
  }
}

onMounted(load);
</script>
