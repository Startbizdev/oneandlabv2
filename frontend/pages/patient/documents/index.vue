<template>
  <AppPageShell class="space-y-6" header-bleed="patient">
    <template #pageHeader>
    <AppPageHeader :edge-bleed="false"
      title="Mes documents médicaux"
      description="Consultez et gérez vos documents de santé"
    >
      <template #actions>
        <UButton :on-click="() => { showUploadModal = true }" color="primary" icon="i-lucide-upload" size="sm">
          Ajouter un document
        </UButton>
      </template>
    </AppPageHeader>
  </template>

    <div class="min-w-0">
    <div v-if="loading" class="py-12 text-center">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
      <p class="text-gray-500">Chargement des documents...</p>
    </div>

    <UAlert v-else-if="loadError" color="error" variant="soft" :title="loadError">
      <template #actions><UButton color="neutral" variant="outline" @click="fetchDocuments">Réessayer</UButton></template>
    </UAlert>

    <UEmpty
      v-else-if="documents.length === 0"
      icon="i-lucide-file-text"
      title="Aucun document"
      description="Vous n'avez pas encore de documents médicaux. Ajoutez-en un pour commencer."
    />

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="doc in documents" :key="doc.id" class="hover:shadow-lg transition">
        <div class="space-y-3">
          <div class="flex items-start justify-between">
            <div class="flex min-w-0 items-center gap-3">
              <UIcon name="i-lucide-file-text" class="size-6 shrink-0 text-primary-800 dark:text-primary-300" />
              <div class="min-w-0">
                <p class="break-words font-semibold">{{ doc.file_name }}</p>
                <p class="text-sm text-gray-500">{{ documentTypeLabel(doc.document_type) }}</p>
              </div>
            </div>
          </div>

          <div class="text-sm text-gray-600">
            <p>Ajouté le {{ formatDate(doc.created_at) }}</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton size="sm" icon="i-lucide-download" :on-click="() => downloadDocument(doc)">
              Télécharger
            </UButton>
            <UButton v-if="doc.can_delete === true || Number(doc.can_delete) === 1" size="sm" color="error" variant="ghost" icon="i-lucide-trash" :loading="deletingId === doc.id" :on-click="() => { documentToDelete = doc }">
              Supprimer
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Modal upload -->
    <UModal v-model:open="showUploadModal" title="Ajouter un document" description="PDF ou image, 25 Mo maximum." :dismissible="!uploading">
      <template #body>

        <UForm :state="uploadForm" @submit="uploadDocument" class="space-y-4">
          <UFormField label="Type de document" required>
            <USelect v-model="uploadForm.document_type" :items="docTypeOptions" class="w-full" />
          </UFormField>

          <UFormField label="Fichier" required>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
              aria-label="Fichier à ajouter"
              ref="fileInput"
              @change="handleFileSelect"
              class="block w-full min-w-0 max-w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-normal file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p v-if="uploadForm.file" class="text-sm text-gray-600 mt-2">
              {{ uploadForm.file.name }} ({{ (uploadForm.file.size / 1024 / 1024).toFixed(2) }} MB)
            </p>
          </UFormField>

          <UFormField label="Description">
            <UTextarea v-model="uploadForm.description" :rows="3" class="w-full" />
          </UFormField>

          <div class="flex flex-wrap justify-end gap-3">
            <UButton variant="ghost" :disabled="uploading" :on-click="() => { showUploadModal = false }">Annuler</UButton>
            <UButton type="submit" :loading="uploading">Envoyer</UButton>
          </div>
        </UForm>
      </template>
    </UModal>
    <UModal :open="!!documentToDelete" title="Supprimer ce document ?" description="Le document sera retiré de votre espace. Cette action est définitive." @update:open="value => { if (!value && !deletingId) documentToDelete = null }" :dismissible="!deletingId">
      <template #body><p class="break-words text-sm text-gray-600 dark:text-gray-400">{{ documentToDelete?.file_name }}</p></template>
      <template #footer>
        <div class="flex w-full flex-wrap justify-end gap-3">
          <UButton color="neutral" variant="outline" :disabled="!!deletingId" @click="($event) => { documentToDelete = null }">Conserver</UButton>
          <UButton color="error" :loading="!!deletingId" @click="deleteDocument(documentToDelete)">Supprimer le document</UButton>
        </div>
      </template>
    </UModal>
    </div>
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'patient',
  middleware: ['auth', 'role'],
  role: 'patient',
});

import { apiFetch } from '~/utils/api';
import { downloadMedicalDocument } from '~/utils/download-medical-document';
useHead({ title: 'Mes documents médicaux | Cary' });

const documents = ref<any[]>([]);
const loading = ref(true);
const showUploadModal = ref(false);
const uploading = ref(false);
const loadError = ref<string | null>(null);
const documentToDelete = ref<any | null>(null);
const deletingId = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const toast = useAppToast();

const uploadForm = reactive({
  document_type: 'ordonnance',
  file: null as File | null,
  description: '',
});

const docTypeOptions = [
  { label: 'Ordonnance', value: 'ordonnance' },
  { label: 'Résultat analyse', value: 'resultats' },
  { label: 'Compte-rendu ou autre document', value: 'other' },
];

/** Libellés pour les types renvoyés par l’API (clés inchangées côté backend). */
function documentTypeLabel(type: string | null | undefined): string {
  const t = String(type || '');
  const map: Record<string, string> = {
    carte_vitale: 'Carte Vitale',
    carte_mutuelle: 'Carte mutuelle',
    ordonnance: 'Ordonnance',
    autres_assurances: 'Autre prescription',
    resultats: 'Résultats',
    other: 'Autre document',
    prescription: 'Ordonnance',
    lab_result: 'Résultat analyse',
    report: 'Compte-rendu',
  };
  return map[t] || t || '—';
}

onMounted(async () => {
  await fetchDocuments();
});

const fetchDocuments = async () => {
  loading.value = true;
  loadError.value = null;
  try {
    const response = await apiFetch('/medical-documents', {
      method: 'GET',
    });
    if (response.success && response.data) {
      documents.value = response.data;
    } else {
      throw new Error(response.error || 'Chargement impossible');
    }
  } catch (error) {
    loadError.value = 'Impossible de charger vos documents. Réessayez dans quelques instants.';
  } finally {
    loading.value = false;
  }
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    if (file.size > 25 * 1024 * 1024) {
      uploadForm.file = null;
      target.value = '';
      toast.add({ title: 'Fichier trop volumineux', description: 'Choisissez un fichier de 25 Mo maximum.', color: 'error' });
      return;
    }
    uploadForm.file = file;
  }
};

const uploadDocument = async () => {
  if (!uploadForm.file) {
    toast.add({ title: 'Erreur', description: 'Sélectionnez un fichier', color: 'red' });
    return;
  }

  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('document_type', uploadForm.document_type);
    if (uploadForm.description) {
      formData.append('description', uploadForm.description);
    }

    const result = await apiFetch('/medical-documents', { method: 'POST', body: formData });

    if (result.success) {
      toast.add({ title: 'Document ajouté', color: 'green' });
      showUploadModal.value = false;
      uploadForm.file = null;
      uploadForm.description = '';
      await fetchDocuments();
    } else {
      throw new Error(result.error || 'Erreur upload');
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  } finally {
    uploading.value = false;
  }
};

const downloadDocument = async (doc: any) => {
  try {
    await downloadMedicalDocument(doc.id, doc.file_name);
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  }
};

const deleteDocument = async (doc: any) => {
  if (!doc?.id || deletingId.value) return;
  deletingId.value = doc.id;

  try {
    const result = await apiFetch(`/medical-documents/${encodeURIComponent(doc.id)}`, {
      method: 'DELETE',
    });
    if (!result.success) throw new Error(result.error || 'Suppression impossible');
    documentToDelete.value = null;
    toast.add({ title: 'Document supprimé', color: 'green' });
    await fetchDocuments();
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  } finally {
    deletingId.value = null;
  }
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
</script>
