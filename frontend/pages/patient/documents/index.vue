<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold">Mes documents médicaux</h1>
      <UButton @click="showUploadModal = true" color="primary" icon="i-lucide-upload" size="lg">
        Ajouter un document
      </UButton>
    </div>

    <div v-if="loading" class="py-12 text-center">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
      <p class="text-gray-500">Chargement des documents...</p>
    </div>

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
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-file-text" class="w-8 h-8 text-blue-500" />
              <div>
                <p class="font-semibold">{{ doc.file_name }}</p>
                <p class="text-sm text-gray-500">{{ doc.document_type }}</p>
              </div>
            </div>
          </div>
          
          <div class="text-sm text-gray-600">
            <p>Ajouté le {{ formatDate(doc.created_at) }}</p>
          </div>
          
          <div class="flex gap-2">
            <UButton size="sm" icon="i-lucide-download" @click="downloadDocument(doc)">
              Télécharger
            </UButton>
            <UButton size="sm" color="red" variant="ghost" icon="i-lucide-trash" @click="deleteDocument(doc)">
              Supprimer
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Modal upload -->
    <UModal v-model="showUploadModal">
      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">Ajouter un document</h2>
        </template>
        
        <UForm :state="uploadForm" @submit="uploadDocument" class="space-y-4">
          <UFormGroup label="Type de document" required>
            <USelect v-model="uploadForm.document_type" :options="docTypeOptions" />
          </UFormGroup>
          
          <UFormGroup label="Fichier" required>
            <input 
              type="file" 
              ref="fileInput"
              @change="handleFileSelect"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p v-if="uploadForm.file" class="text-sm text-gray-600 mt-2">
              {{ uploadForm.file.name }} ({{ (uploadForm.file.size / 1024 / 1024).toFixed(2) }} MB)
            </p>
          </UFormGroup>
          
          <UFormGroup label="Description">
            <UTextarea v-model="uploadForm.description" rows="3" />
          </UFormGroup>
          
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showUploadModal = false">Annuler</UButton>
            <UButton type="submit" :loading="uploading">Envoyer</UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'role'],
  role: 'patient',
});

import { apiFetch } from '~/utils/api';

const documents = ref<any[]>([]);
const loading = ref(true);
const showUploadModal = ref(false);
const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const toast = useToast();

const uploadForm = reactive({
  document_type: 'prescription',
  file: null as File | null,
  description: '',
});

const docTypeOptions = [
  { label: 'Ordonnance', value: 'prescription' },
  { label: 'Résultat analyse', value: 'lab_result' },
  { label: 'Compte-rendu', value: 'report' },
  { label: 'Autre', value: 'other' },
];

onMounted(async () => {
  await fetchDocuments();
});

const fetchDocuments = async () => {
  loading.value = true;
  try {
    const response = await apiFetch('/medical-documents', {
      method: 'GET',
    });
    if (response.success && response.data) {
      documents.value = response.data;
    }
  } catch (error) {
    console.error('Erreur chargement documents:', error);
  } finally {
    loading.value = false;
  }
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    uploadForm.file = target.files[0];
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
    
    const response = await fetch('http://localhost:8888/api/medical-documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${useCookie('token').value}`,
      },
      body: formData,
    });
    
    const result = await response.json();
    
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
    window.open(`http://localhost:8888/api/medical-documents/${doc.id}/download`, '_blank');
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  }
};

const deleteDocument = async (doc: any) => {
  if (!confirm('Supprimer ce document ?')) return;
  
  try {
    await apiFetch(`/medical-documents/${doc.id}`, {
      method: 'DELETE',
    });
    toast.add({ title: 'Document supprimé', color: 'green' });
    await fetchDocuments();
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
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
