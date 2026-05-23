<template>
  <AppPageShell class="space-y-6" header-bleed="patient">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Mon profil"
        description="Consultez et modifiez vos informations personnelles"
      />
    </template>

    <div class="container mx-auto px-4 max-w-7xl">
    <!-- Chargement -->
    <div v-if="loading" class="text-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
      <p class="text-gray-500">Chargement de votre profil...</p>
    </div>

    <!-- Erreur -->
    <div v-else-if="error" class="mb-6">
      <UAlert color="red" :title="error" />
    </div>

    <UCard v-else-if="!loading && !error" class="overflow-hidden mb-6">
      <template #header>
        <h2 class="text-xl font-normal">Photo de profil</h2>
        <p class="text-sm text-muted mt-0.5">Photo affichée sur votre compte Cary</p>
      </template>
      <ProfileImagesBlock
        v-model:profile-image="profileForm.profile_image_url"
        profile-label="Photo de profil"
        profile-icon="i-lucide-user"
        :show-cover="false"
      />
    </UCard>

    <!-- Formulaire de profil -->
    <UCard v-if="!loading && !error">
      <template #header>
        <h2 class="text-xl font-normal">Informations personnelles</h2>
      </template>

      <UForm :state="profileForm" @submit="saveProfile" class="space-y-6">
        <!-- Prénom et Nom -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Prénom" name="first_name" required>
            <UInput
              v-model="profileForm.first_name"
              placeholder="Votre prénom"
              size="xl"
              class="w-full"
              required
            />
          </UFormField>

          <UFormField label="Nom" name="last_name" required>
            <UInput
              v-model="profileForm.last_name"
              placeholder="Votre nom"
              size="xl"
              class="w-full"
              required
            />
          </UFormField>
        </div>

        <!-- Email (lecture seule) — ne jamais afficher delegated-…@patients.internal.local -->
        <UFormField label="Email" name="email">
          <div
            class="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 text-base text-gray-900 dark:text-white"
            :class="isTechnicalPatientEmail(profileForm.email) ? 'min-h-[4rem] whitespace-pre-wrap break-words' : ''"
          >
            {{ patientEmailShown }}
          </div>
          <template #description>
            <span v-if="isTechnicalPatientEmail(profileForm.email)">
              Vous n’avez pas d’adresse e-mail personnelle sur ce compte : les notifications utilisent l’adresse du professionnel de santé indiquée ci-dessus (compte créé par un infirmier, un laboratoire ou un professionnel).
            </span>
            <span v-else>
              L'email ne peut pas être modifié. Contactez le support pour changer votre email.
            </span>
          </template>
        </UFormField>

        <!-- Téléphone -->
        <UFormField label="Téléphone" name="phone">
          <UInput
            v-model="profileForm.phone"
            type="tel"
            placeholder="+33 6 XX XX XX XX"
            size="xl"
            class="w-full"
          />
        </UFormField>

        <!-- Date de naissance -->
        <UFormField label="Date de naissance" name="birth_date">
          <BirthdayPicker
            v-model="profileForm.birth_date"
            placeholder="Sélectionner votre date de naissance"
          />
        </UFormField>

        <!-- Genre -->
        <UFormField label="Genre" name="gender">
          <USelect
            v-model="profileForm.gender"
            :items="genderOptions"
            placeholder="Sélectionner votre genre (optionnel)"
            size="xl"
            class="w-full"
          />
        </UFormField>

        <!-- Adresse -->
        <AddressSelector
          v-model="profileForm.address"
          label="Adresse"
          name="address"
          :show-complement="true"
          :complement-value="profileForm.address_complement"
          @update:complement="profileForm.address_complement = $event"
        />

        <!-- Boutons d'action -->
        <div class="flex justify-end gap-4 pt-4 border-t">
          <UButton
            variant="outline"
            color="neutral"
            size="xl"
            @click="resetForm"
            :disabled="saving"
          >
            Annuler
          </UButton>
          <UButton
            type="submit"
            color="primary"
            size="xl"
            :loading="saving"
          >
            Enregistrer les modifications
          </UButton>
        </div>
      </UForm>
    </UCard>

    <ProfileDocuments
      v-if="!loading && !error"
      class="mt-8"
      :documents="documents"
      :is-loading="loadingDocuments"
      :uploading-type="uploadingDocument"
      :downloading-document-id="downloadingDocumentId"
      :error="documentError"
      @upload="handleDocumentUpload"
      @download="(id, fileName) => downloadDocument(id, fileName)"
      @update:error="documentError = $event"
    />
    </div>
  </AppPageShell>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api'
import type { DocumentType } from '~/types/profile'
import { isTechnicalPatientEmail, patientUiEmailLine } from '~/utils/patient-address-rdv'

definePageMeta({
  layout: 'patient',
  middleware: ['auth', 'role'],
  role: 'patient',
})

const { user, fetchCurrentUser } = useAuth()
const toast = useAppToast()

// État
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)

// Documents médicaux
const loadingDocuments = ref(false)
const documentError = ref<string | null>(null)
const documents = ref<Record<string, any>>({})
const uploadingDocument = ref<string | null>(null)
const downloadingDocumentId = ref<string | null>(null)

// Formulaire
const profileForm = ref({
  first_name: '',
  last_name: '',
  profile_image_url: '' as string,
  email: '',
  /** Libellé API si e-mail technique (delegated-…@patients.internal.local) */
  email_display: null as string | null,
  phone: null as string | null,
  birth_date: null as string | null,
  gender: null as string | null,
  address: null as any,
  address_complement: null as string | null,
})

// Sauvegarde de l'état initial pour la réinitialisation
const initialForm = ref({ ...profileForm.value })

const patientEmailShown = computed(() =>
  patientUiEmailLine({ email: profileForm.value.email, email_display: profileForm.value.email_display }),
)

// Options pour le genre
const genderOptions = [
  { label: 'Homme', value: 'male' },
  { label: 'Femme', value: 'female' },
  { label: 'Autre', value: 'other' },
]

function handleDocumentUpload(documentType: DocumentType, file: File) {
  handleDocumentChange(documentType, file)
}

// Charger les données du profil
onMounted(async () => {
  await Promise.all([
    loadProfile(),
    loadDocuments()
  ])
})

const loadProfile = async () => {
  loading.value = true
  error.value = null

  try {
    // Récupérer les données utilisateur complètes
    const userData = await fetchCurrentUser()
    
    if (!userData) {
      error.value = 'Impossible de charger votre profil'
      return
    }

    // Remplir le formulaire avec les données existantes
    // Extraire le complément de l'objet address s'il existe
    const addressComplement = userData.address?.complement || null
    
    profileForm.value = {
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      profile_image_url: userData.profile_image_url || '',
      email: userData.email || '',
      email_display: (userData as { email_display?: string | null }).email_display ?? null,
      phone: userData.phone || null,
      birth_date: userData.birth_date || null,
      gender: userData.gender || null,
      address: userData.address || null,
      address_complement: addressComplement,
    }

    // Sauvegarder l'état initial
    initialForm.value = { ...profileForm.value }
  } catch (err: any) {
    error.value = err.message || 'Erreur lors du chargement du profil'
    console.error('Erreur lors du chargement du profil:', err)
  } finally {
    loading.value = false
  }
}

const saveProfile = async () => {
  saving.value = true
  error.value = null

  try {
    if (!user.value?.id) {
      error.value = 'Utilisateur non identifié'
      return
    }

    // Préparer les données à envoyer
    const updateData: any = {
      first_name: profileForm.value.first_name,
      last_name: profileForm.value.last_name,
      profile_image_url: profileForm.value.profile_image_url || null,
    }

    // Ajouter les champs optionnels (même s'ils sont null pour permettre de les effacer)
    updateData.phone = profileForm.value.phone || null
    updateData.birth_date = profileForm.value.birth_date || null
    updateData.gender = profileForm.value.gender || null
    
    // Inclure le complément d'adresse dans l'objet address
    if (profileForm.value.address) {
      updateData.address = {
        ...profileForm.value.address,
        complement: profileForm.value.address_complement || null
      }
    } else {
      updateData.address = null
    }

    // Envoyer la mise à jour
    const response = await apiFetch(`/users/${user.value.id}`, {
      method: 'PUT',
      body: updateData,
    })

    if (response.success) {
      toast.add({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées avec succès',
        color: 'green',
      })

      // Recharger les données utilisateur pour synchroniser
      await fetchCurrentUser()
      
      // Mettre à jour l'état initial
      initialForm.value = { ...profileForm.value }
    } else {
      error.value = response.error || 'Erreur lors de la sauvegarde'
    }
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la sauvegarde du profil'
    console.error('Erreur lors de la sauvegarde:', err)
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  profileForm.value = { ...initialForm.value }
  error.value = null
}

// Charger les documents du profil
const loadDocuments = async () => {
  loadingDocuments.value = true
  documentError.value = null

  try {
    const response = await apiFetch('/patient-documents', {
      method: 'GET',
    })

    if (response.success) {
      documents.value = {}
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        response.data.forEach((doc: any) => {
          if (doc.document_type) {
            documents.value[doc.document_type] = doc
          }
        })
      } else {
        documents.value = {}
      }
    } else {
      documents.value = {}
    }
  } catch (err: any) {
    documentError.value = err.message || 'Erreur lors du chargement des documents'
    console.error('Erreur lors du chargement des documents:', err)
    documents.value = {}
  } finally {
    loadingDocuments.value = false
  }
}

async function handleDocumentChange(documentType: string, file: File | null) {
  if (!file) return
  if (uploadingDocument.value === documentType) return

  uploadingDocument.value = documentType
  documentError.value = null

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', documentType)

    const result = await apiFetch('/patient-documents/upload', {
      method: 'POST',
      body: formData,
    })

    if (result.success) {
      toast.add({
        title: 'Document enregistré',
        description: 'Votre document a été enregistré avec succès',
        color: 'green',
      })
      await new Promise((resolve) => setTimeout(resolve, 300))
      await loadDocuments()
    } else {
      throw new Error((result as any).error || 'Erreur lors de l\'enregistrement')
    }
  } catch (err: any) {
    documentError.value = err.message || 'Erreur lors de l\'enregistrement du document'
    toast.add({
      title: 'Erreur',
      description: err.message || 'Impossible d\'enregistrer le document',
      color: 'red',
    })
  } finally {
    uploadingDocument.value = null
  }
}

async function downloadDocument(documentId: string, fileName?: string) {
  downloadingDocumentId.value = documentId
  try {
    const apiBase = useRuntimeConfig().public.apiBase || 'http://localhost:8888/api'
    const token = localStorage.getItem('auth_token')
    const url = `${apiBase}/medical-documents/${documentId}/download?t=${Date.now()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!response.ok) throw new Error('Erreur lors du téléchargement')

    const blob = await response.blob()
    const objectUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = fileName && fileName.trim() ? fileName : `document-${documentId}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(objectUrl)
    document.body.removeChild(a)

    toast.add({
      title: 'Téléchargement',
      description: 'Le document est en cours de téléchargement',
      color: 'green',
    })
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.message || 'Impossible de télécharger le document',
      color: 'red',
    })
  } finally {
    downloadingDocumentId.value = null
  }
}
</script>

