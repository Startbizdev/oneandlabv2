<template>
  <UCard class="overflow-hidden min-w-0">
    <template #header>
      <CardHeader
        icon="i-lucide-file-text"
        title="Documents médicaux"
        description="Déposez ou téléchargez vos documents de couverture santé."
      />
    </template>

    <LoadingState
      v-if="isLoading"
      message="Chargement des documents..."
      :compact="true"
    />

    <AppointmentDocumentsSection
      v-else
      :documents="documentsList"
      :loading="false"
      empty-description="Aucun document de couverture enregistré."
      :show-upload-area="true"
      :upload-types="profileUploadTypes"
      :can-replace="true"
      :downloading-ids="downloadingIdsSet"
      :uploading-types="uploadingTypesSet"
      @download="onSectionDownload"
      @upload="onSectionUpload"
    />

    <UAlert
      v-if="error"
      color="red"
      variant="soft"
      :title="error"
      class="mt-4"
      :closable="true"
      @close="$emit('update:error', null)"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { PatientDocument, DocumentType } from '~/types/profile'
import AppointmentDocumentsSection from '~/components/dashboard/AppointmentDocumentsSection.vue'

interface Props {
  documents: Record<string, PatientDocument>
  isLoading: boolean
  uploadingType: string | null
  error: string | null
  /** Optionnel : id du document médical en cours de téléchargement (pour le spinner) */
  downloadingDocumentId?: string | null
}

interface Emits {
  (e: 'upload', type: DocumentType, file: File): void
  (e: 'download', id: string, fileName: string): void
  (e: 'update:error', value: string | null): void
}

const props = withDefaults(defineProps<Props>(), {
  downloadingDocumentId: null,
})

const emit = defineEmits<Emits>()

const DOCUMENT_TYPES: DocumentType[] = ['carte_vitale', 'carte_mutuelle', 'autres_assurances']

/** Même grille que le détail RDV lab (sans résultats d'analyses) */
const profileUploadTypes = [
  {
    value: 'carte_vitale',
    label: 'Carte Vitale',
    icon: 'i-lucide-credit-card',
    color: 'green',
    accept: 'image/*,.pdf',
    hint: 'JPG, PNG, PDF • max 5 Mo',
  },
  {
    value: 'carte_mutuelle',
    label: 'Carte Mutuelle',
    icon: 'i-lucide-shield',
    color: 'blue',
    accept: 'image/*,.pdf',
    hint: 'JPG, PNG, PDF • max 5 Mo',
  },
  {
    value: 'autres_assurances',
    label: 'Autre prescription',
    icon: 'i-lucide-briefcase',
    color: 'purple',
    accept: 'image/*,.pdf',
    hint: 'JPG, PNG, PDF • max 25 Mo',
  },
] as const

const documentsList = computed(() => {
  const list: Array<{
    id: string
    document_type: string
    file_name: string
    source?: string
  }> = []
  for (const t of DOCUMENT_TYPES) {
    const d = props.documents[t]
    if (d?.medical_document_id) {
      list.push({
        id: d.medical_document_id,
        document_type: d.document_type || t,
        file_name: d.file_name,
        source: 'patient_profile',
      })
    }
  }
  return list
})

const uploadingTypesSet = computed(() => {
  const u = props.uploadingType
  return u ? new Set<string>([u]) : new Set<string>()
})

const downloadingIdsSet = computed(() => {
  const id = props.downloadingDocumentId
  return id ? new Set<string>([id]) : new Set<string>()
})

function onSectionDownload(doc: { id: string; file_name: string }) {
  emit('download', doc.id, doc.file_name)
}

function onSectionUpload(docType: string, file: File) {
  emit('upload', docType as DocumentType, file)
}
</script>
