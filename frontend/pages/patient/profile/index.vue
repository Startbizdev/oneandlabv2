<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Mon profil"
      description="Consultez et modifiez vos informations personnelles"
    />

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

    <!-- Formulaire de profil -->
    <UCard v-else>
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

        <!-- Email (lecture seule) -->
        <UFormField label="Email" name="email">
          <UInput
            :model-value="profileForm.email"
            placeholder="Votre email"
            size="xl"
            class="w-full"
            disabled
          />
          <template #description>
            L'email ne peut pas être modifié. Contactez le support pour changer votre email.
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
          placeholder="Commencez à taper votre adresse..."
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

    <!-- Section Documents médicaux -->
    <UCard class="mt-8">
      <template #header>
        <div>
          <h2 class="text-xl font-normal">Documents médicaux</h2>
          <p class="text-sm text-gray-500 mt-1">
            Gérez vos documents de couverture santé. Ces documents seront automatiquement utilisés lors de vos prochains rendez-vous (sauf l'ordonnance qui change à chaque fois).
          </p>
        </div>
      </template>

      <div v-if="loadingDocuments" class="text-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
        <p class="text-gray-500">Chargement des documents...</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Carte Vitale -->
        <UCard
          class="hover:shadow-md transition-all duration-200"
          :ui="{ 
            body: { padding: 'p-4' },
            ring: 'ring-1 ring-gray-200 dark:ring-gray-800',
            shadow: 'shadow-sm'
          }"
        >
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <UIcon name="i-lucide-credit-card" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-normal text-base text-gray-900 dark:text-gray-100">Carte Vitale</h3>
                  <UBadge color="amber" variant="subtle" size="xs" class="mt-1">
                    Obligatoire
                  </UBadge>
                </div>
              </div>
              <UButton
                v-if="documents.carte_vitale"
                variant="ghost"
                size="xs"
                color="primary"
                icon="i-lucide-download"
                @click="downloadDocument(documents.carte_vitale.medical_document_id)"
                class="shrink-0"
              />
            </div>
            
            <div v-if="documents.carte_vitale" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div class="flex items-start gap-2">
                <UIcon name="i-lucide-check-circle-2" class="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-green-900 dark:text-green-100 truncate">
                    {{ documents.carte_vitale.file_name }}
                  </p>
                  <p class="text-xs text-green-700 dark:text-green-300 mt-0.5">
                    Mis à jour : {{ formatDate(documents.carte_vitale.updated_at) }}
                  </p>
                </div>
              </div>
            </div>
            
            <UFileUpload
              v-model="documentFiles.carte_vitale"
              accept="image/*,application/pdf"
              :label="documents.carte_vitale ? 'Remplacer le document' : 'Glisser-déposer ou cliquer'"
              description="JPG, PNG, PDF (max 5MB)"
              :compact="true"
              @change="() => onFileSelected('carte_vitale', documentFiles.carte_vitale)"
            />
            
            <div v-if="uploadingDocument === 'carte_vitale'" class="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin text-primary" />
              <span>Enregistrement en cours...</span>
            </div>
          </div>
        </UCard>

        <!-- Carte Mutuelle -->
        <UCard
          class="hover:shadow-md transition-all duration-200"
          :ui="{ 
            body: { padding: 'p-4' },
            ring: 'ring-1 ring-gray-200 dark:ring-gray-800',
            shadow: 'shadow-sm'
          }"
        >
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-normal text-base text-gray-900 dark:text-gray-100">Carte Mutuelle</h3>
                  <UBadge color="amber" variant="subtle" size="xs" class="mt-1">
                    Obligatoire
                  </UBadge>
                </div>
              </div>
              <UButton
                v-if="documents.carte_mutuelle"
                variant="ghost"
                size="xs"
                color="primary"
                icon="i-lucide-download"
                @click="downloadDocument(documents.carte_mutuelle.medical_document_id)"
                class="shrink-0"
              />
            </div>
            
            <div v-if="documents.carte_mutuelle" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div class="flex items-start gap-2">
                <UIcon name="i-lucide-check-circle-2" class="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-green-900 dark:text-green-100 truncate">
                    {{ documents.carte_mutuelle.file_name }}
                  </p>
                  <p class="text-xs text-green-700 dark:text-green-300 mt-0.5">
                    Mis à jour : {{ formatDate(documents.carte_mutuelle.updated_at) }}
                  </p>
                </div>
              </div>
            </div>
            
            <UFileUpload
              v-model="documentFiles.carte_mutuelle"
              accept="image/*,application/pdf"
              :label="documents.carte_mutuelle ? 'Remplacer le document' : 'Glisser-déposer ou cliquer'"
              description="JPG, PNG, PDF (max 5MB)"
              :compact="true"
              @change="() => onFileSelected('carte_mutuelle', documentFiles.carte_mutuelle)"
            />
            
            <div v-if="uploadingDocument === 'carte_mutuelle'" class="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin text-primary" />
              <span>Enregistrement en cours...</span>
            </div>
          </div>
        </UCard>

        <!-- Autres Assurances -->
        <UCard
          class="hover:shadow-md transition-all duration-200"
          :ui="{ 
            body: { padding: 'p-4' },
            ring: 'ring-1 ring-gray-200 dark:ring-gray-800',
            shadow: 'shadow-sm'
          }"
        >
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                    <UIcon name="i-lucide-file-plus" class="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-normal text-base text-gray-900 dark:text-gray-100">Autres Assurances</h3>
                  <UBadge color="gray" variant="subtle" size="xs" class="mt-1">
                    Optionnel
                  </UBadge>
                </div>
              </div>
              <UButton
                v-if="documents.autres_assurances"
                variant="ghost"
                size="xs"
                color="primary"
                icon="i-lucide-download"
                @click="downloadDocument(documents.autres_assurances.medical_document_id)"
                class="shrink-0"
              />
            </div>
            
            <div v-if="documents.autres_assurances" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div class="flex items-start gap-2">
                <UIcon name="i-lucide-check-circle-2" class="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-green-900 dark:text-green-100 truncate">
                    {{ documents.autres_assurances.file_name }}
                  </p>
                  <p class="text-xs text-green-700 dark:text-green-300 mt-0.5">
                    Mis à jour : {{ formatDate(documents.autres_assurances.updated_at) }}
                  </p>
                </div>
              </div>
            </div>
            
            <UFileUpload
              v-model="documentFiles.autres_assurances"
              accept="image/*,application/pdf"
              :label="documents.autres_assurances ? 'Remplacer le document' : 'Glisser-déposer ou cliquer'"
              description="JPG, PNG, PDF (max 10MB)"
              :compact="true"
              @change="() => onFileSelected('autres_assurances', documentFiles.autres_assurances)"
            />
            
            <div v-if="uploadingDocument === 'autres_assurances'" class="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin text-primary" />
              <span>Enregistrement en cours...</span>
            </div>
          </div>
        </UCard>

        <UAlert
          v-if="documentError"
          color="red"
          :title="documentError"
          class="col-span-full mt-2"
        />
      </div>
    </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api'
import { watch, nextTick } from 'vue'

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
const documentFiles = ref<Record<string, File | null>>({
  carte_vitale: null,
  carte_mutuelle: null,
  autres_assurances: null,
})
const uploadingDocument = ref<string | null>(null)
const isResettingAfterUpload = ref<string | null>(null)

// Formulaire
const profileForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: null as string | null,
  birth_date: null as string | null,
  gender: null as string | null,
  address: null as any,
  address_complement: null as string | null,
})

// Sauvegarde de l'état initial pour la réinitialisation
const initialForm = ref({ ...profileForm.value })

// Options pour le genre
const genderOptions = [
  { label: 'Homme', value: 'male' },
  { label: 'Femme', value: 'female' },
  { label: 'Autre', value: 'other' },
]

// Fonction pour comparer si deux fichiers sont identiques
const isSameFile = (file1: File | null, file2: File | null): boolean => {
  if (!file1 || !file2) return file1 === file2
  // Comparer par nom, taille et date de modification
  return (
    file1.name === file2.name &&
    file1.size === file2.size &&
    file1.lastModified === file2.lastModified
  )
}

// Gérer la sélection d'un fichier directement depuis le composant
const onFileSelected = (documentType: string, file: File | null) => {
  console.log('onFileSelected appelé:', { documentType, fileName: file?.name, file })
  
  // Ignorer si on est en train de réinitialiser après un upload réussi
  if (isResettingAfterUpload.value === documentType) {
    console.log('Réinitialisation en cours pour', documentType, '- Ignoré')
    return
  }
  
  // Ignorer si aucun fichier n'a été sélectionné
  if (!file) {
    console.log('Aucun fichier sélectionné pour', documentType)
    return
  }
  
  // Ignorer si un upload est déjà en cours
  if (uploadingDocument.value === documentType) {
    console.log('Upload déjà en cours pour', documentType, '- Ignoré')
    return
  }
  
  // Déclencher l'upload automatiquement après un court délai pour laisser le v-model se mettre à jour
  console.log('✅ Déclenchement upload automatique pour', documentType, '- Fichier:', file.name, '(', file.size, 'bytes)')
  nextTick(() => {
    handleDocumentChange(documentType, file)
  })
}

// Surveiller les changements de fichiers pour déclencher l'upload automatiquement
watch(documentFiles, (newFiles, oldFiles) => {
  console.log('Watch documentFiles déclenché:', { newFiles, oldFiles })
  
  // Pour chaque type de document
  Object.keys(newFiles).forEach((documentType) => {
    const newFile = newFiles[documentType]
    const oldFile = oldFiles?.[documentType]
    
    const isSame = isSameFile(newFile, oldFile)
    console.log('Vérification', documentType, ':', { 
      newFile: newFile?.name, 
      oldFile: oldFile?.name, 
      uploading: uploadingDocument.value,
      isSameFile: isSame,
      newFileSize: newFile?.size,
      oldFileSize: oldFile?.size
    })
    
    // Ignorer si on est en train de réinitialiser après un upload réussi
    if (isResettingAfterUpload.value === documentType) {
      console.log('Réinitialisation après upload pour', documentType, '- Watcher ignoré')
      return
    }
    
    // Ignorer si aucun fichier n'a été sélectionné
    if (!newFile) {
      return
    }
    
    // Ignorer si c'est le même fichier (même nom, taille et date)
    if (isSame) {
      console.log('Fichier identique pour', documentType, '- Upload ignoré')
      return
    }
    
    // Ignorer si un upload est déjà en cours pour ce type de document
    if (uploadingDocument.value === documentType) {
      console.log('Upload déjà en cours pour', documentType, '- Ignoré')
      return
    }
    
    // Déclencher l'upload pour un nouveau fichier
    console.log('Déclenchement upload pour', documentType, '- Nouveau fichier détecté:', newFile.name)
    handleDocumentChange(documentType, newFile)
  })
}, { deep: true })

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
      email: userData.email || '',
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

    console.log('Réponse API complète:', JSON.stringify(response, null, 2))
    console.log('Type de response:', typeof response)
    console.log('response.success:', response.success)
    console.log('response.data:', response.data)
    console.log('response.data est un tableau?', Array.isArray(response.data))
    console.log('response.data.length:', response.data?.length)
    
    if (response.success) {
      // Organiser les documents par type
      documents.value = {}
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        response.data.forEach((doc: any) => {
          if (doc.document_type) {
            documents.value[doc.document_type] = doc
          }
        })
        console.log('Documents organisés par type:', JSON.stringify(documents.value, null, 2))
        console.log('Nombre de documents:', response.data.length)
      } else {
        console.log('Aucun document dans la réponse (tableau vide ou null)')
        console.log('response.data:', response.data)
        console.log('response.debug:', response.debug)
        documents.value = {}
      }
    } else {
      console.log('Réponse API non réussie:', JSON.stringify(response, null, 2))
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

// Gérer le changement de document
const handleDocumentChange = async (documentType: string, file: File | null) => {
  console.log('=== handleDocumentChange DÉBUT ===')
  console.log('documentType:', documentType)
  console.log('file:', file)
  console.log('file.name:', file?.name)
  console.log('file.size:', file?.size)
  console.log('uploadingDocument.value:', uploadingDocument.value)
  
  if (!file) {
    console.log('❌ Pas de fichier, sortie')
    return
  }

  // Éviter les uploads multiples simultanés pour le même document
  if (uploadingDocument.value === documentType) {
    console.log('❌ Upload déjà en cours pour', documentType)
    return
  }
  
  console.log('✅ Démarrage de l\'upload pour', documentType)
  uploadingDocument.value = documentType
  documentError.value = null

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', documentType)

    console.log('=== UPLOAD START ===')
    console.log('Fichier:', file.name, '(' + file.size + ' bytes)')
    console.log('Type:', documentType)
    console.log('FormData créé:', formData)
    console.log('Envoi de la requête vers /patient-documents/upload...')
    
    // Utiliser apiFetch qui gère automatiquement le token CSRF et l'authentification
    const result = await apiFetch('/patient-documents/upload', {
      method: 'POST',
      body: formData,
    })
    
    console.log('=== UPLOAD RESPONSE ===')
    console.log('Résultat complet:', JSON.stringify(result, null, 2))
    console.log('result.success:', result.success)
    console.log('result.data:', result.data)
    console.log('result.error:', result.error)

    if (result.success) {
      toast.add({
        title: 'Document enregistré',
        description: 'Votre document a été enregistré avec succès',
        color: 'green',
      })

      // Marquer qu'on est en train de réinitialiser pour éviter que le watcher se déclenche
      isResettingAfterUpload.value = documentType
      
      // Réinitialiser le fichier dans le v-model pour permettre un nouvel upload
      documentFiles.value[documentType] = null
      
      // Attendre un peu pour s'assurer que la base de données est à jour
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Recharger les documents
      await loadDocuments()
      
      // Réinitialiser le flag après un court délai pour permettre au watcher de fonctionner à nouveau
      setTimeout(() => {
        isResettingAfterUpload.value = null
      }, 100)
    } else {
      throw new Error(result.error || 'Erreur lors de l\'enregistrement')
    }
  } catch (err: any) {
    console.error('=== UPLOAD ERROR ===')
    console.error('Erreur complète:', err)
    console.error('Message:', err.message)
    console.error('Stack:', err.stack)
    
    documentError.value = err.message || 'Erreur lors de l\'enregistrement du document'
    toast.add({
      title: 'Erreur',
      description: err.message || 'Impossible d\'enregistrer le document',
      color: 'red',
    })
    console.error('Erreur lors de l\'enregistrement du document:', err)
  } finally {
    uploadingDocument.value = null
    // S'assurer que le flag de réinitialisation est aussi réinitialisé en cas d'erreur
    if (isResettingAfterUpload.value === documentType) {
      setTimeout(() => {
        isResettingAfterUpload.value = null
      }, 100)
    }
  }
}

// Télécharger un document
const downloadDocument = async (documentId: string) => {
  try {
    const apiBase = useRuntimeConfig().public.apiBase || 'http://localhost:8888/api'
    const token = localStorage.getItem('auth_token')
    
    const response = await fetch(`${apiBase}/medical-documents/${documentId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Erreur lors du téléchargement')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `document-${documentId}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
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
  }
}

// Formater une date
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}
</script>

