<template>
  <NuxtLayout :name="user?.role === 'patient' ? 'patient' : 'dashboard'">
    <div :class="user?.role === 'patient' ? 'container mx-auto px-4 py-8 max-w-7xl' : ''">
      <TitleDashboard
        v-if="user?.role !== 'patient'"
        title="Mon profil"
        description="Consultez et modifiez vos informations personnelles"
      />

      <h1 v-else class="text-3xl font-bold mb-8">Mon profil</h1>

      <!-- Chargement -->
      <div v-if="loading" class="text-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
        <p class="text-gray-500">Chargement de votre profil...</p>
      </div>

      <div v-else class="space-y-6">
        <!-- Informations personnelles -->
        <UCard>
          <template #header>
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <UIcon name="i-lucide-user" class="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 class="text-lg font-semibold">Informations personnelles</h2>
                <p class="text-sm text-muted mt-0.5">
                  Vos coordonnées et informations de contact
                </p>
              </div>
            </div>
          </template>

          <UForm :state="profileForm" @submit="saveProfile" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Nom du labo (lab uniquement) -->
              <UFormField v-if="isLab" label="Nom du laboratoire" name="name">
                <UInput v-model="profileForm.name" placeholder="Laboratoire Dupont" size="xl" class="w-full" />
              </UFormField>

              <UFormField label="Prénom" name="first_name">
                <UInput v-model="profileForm.first_name" placeholder="Votre prénom" size="xl" class="w-full" />
              </UFormField>

              <UFormField label="Nom" name="last_name">
                <UInput v-model="profileForm.last_name" placeholder="Votre nom" size="xl" class="w-full" />
              </UFormField>

              <UFormField label="Email" name="email">
                <UInput v-model="profileForm.email" type="email" size="xl" class="w-full bg-gray-50" readonly>
                  <template #trailing>
                    <UIcon name="i-lucide-lock" class="w-5 h-5 text-gray-400" />
                  </template>
                </UInput>
                <template #hint>
                  L'email ne peut pas être modifié.
                </template>
              </UFormField>

              <UFormField label="Téléphone" name="phone">
                <UInput v-model="profileForm.phone" type="tel" placeholder="+33 6 XX XX XX XX" size="xl" class="w-full" />
              </UFormField>

              <!-- RPPS (nurse uniquement) -->
              <UFormField v-if="isNurse" label="RPPS" name="rpps">
                <UInput v-model="profileForm.rpps" placeholder="Numéro RPPS" size="xl" class="w-full" />
              </UFormField>

              <!-- SIRET (lab uniquement) -->
              <UFormField v-if="isLab" label="SIRET" name="siret">
                <UInput v-model="profileForm.siret" placeholder="123 456 789 00012" size="xl" class="w-full" />
              </UFormField>
            </div>

            <!-- Date de naissance (patient uniquement) -->
            <UFormField v-if="isPatient" label="Date de naissance" name="birth_date">
              <BirthdayPicker v-model="profileForm.birth_date" />
            </UFormField>

            <!-- Genre (patient uniquement) -->
            <UFormField v-if="isPatient" label="Genre" name="gender">
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
              placeholder="Commencez à taper votre adresse..."
              :show-complement="isPatient"
              :complement-value="profileForm.address_complement"
              @update:complement="profileForm.address_complement = $event"
            />

            <div class="flex justify-end gap-3 pt-2">
              <UButton variant="outline" color="neutral" @click="resetForm" :disabled="saving">
                Annuler
              </UButton>
              <UButton type="submit" :loading="saving" icon="i-lucide-check">
                Enregistrer
              </UButton>
            </div>
          </UForm>
        </UCard>

        <!-- Section Zone de couverture (nurse, lab, subaccount) -->
        <UCard v-if="hasCoverageZone">
          <template #header>
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <UIcon name="i-lucide-map-pin" class="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 class="text-lg font-semibold">Zone de couverture</h2>
                <p class="text-sm text-muted mt-0.5">
                  Rayon d'intervention autour de votre adresse (en km)
                </p>
              </div>
            </div>
          </template>

          <div v-if="!hasValidAddress" class="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div class="flex gap-3">
              <UIcon name="i-lucide-alert-circle" class="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p class="font-medium text-amber-900">Adresse requise</p>
                <p class="text-sm text-amber-800/90 mt-1">
                  Définissez d'abord votre adresse dans la section ci-dessus pour configurer votre zone de couverture.
                </p>
              </div>
            </div>
          </div>

          <div v-else class="space-y-6">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Rayon</span>
                <span class="text-lg font-semibold tabular-nums text-primary">
                  {{ coverageRadius }} km
                </span>
              </div>
              <USlider
                v-model="coverageRadius"
                :min="5"
                :max="100"
                :step="5"
                size="lg"
              />
              <div class="flex justify-between text-xs text-muted">
                <span>5 km</span>
                <span>100 km</span>
              </div>
            </div>
            <div class="flex justify-end pt-2">
              <UButton variant="outline" :loading="savingCoverage" icon="i-lucide-save" @click="saveCoverage">
                Enregistrer le rayon
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- Section Types de soins (nurse uniquement) -->
        <UCard v-if="isNurse">
          <template #header>
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <UIcon name="i-lucide-heart-pulse" class="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 class="text-lg font-semibold">Types de soins acceptés</h2>
                <p class="text-sm text-muted mt-0.5">
                  Activez ou désactivez les types de soins que vous acceptez
                </p>
              </div>
            </div>
          </template>

          <div v-if="loadingCategories" class="text-center py-12">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary-500" />
            <p class="text-sm text-gray-500 mt-3">Chargement des catégories...</p>
          </div>

          <UEmpty
            v-else-if="categoryPreferences.length === 0"
            icon="i-lucide-alert-circle"
            title="Aucune catégorie disponible"
            description="Aucune catégorie de soins n'est actuellement disponible."
            variant="naked"
          />

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            <div
              v-for="pref in categoryPreferences"
              :key="pref.category_id"
              :class="[
                'group relative flex flex-col p-3 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden',
                pref.is_enabled
                  ? 'bg-white border-gray-200 shadow-sm'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              ]"
              @click="updateCategoryPreference(pref.category_id, !pref.is_enabled)"
            >
              <h3 class="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug mb-2 min-w-0">
                {{ pref.name }}
              </h3>
              <p v-if="pref.description" class="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-3 flex-grow min-h-0">
                {{ pref.description }}
              </p>
              <div class="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-gray-100">
                <div class="flex items-center gap-1.5">
                  <div :class="['w-2 h-2 rounded-full', pref.is_enabled ? 'bg-green-500' : 'bg-gray-300']" />
                  <span :class="['text-xs font-medium', pref.is_enabled ? 'text-green-600' : 'text-gray-500']">
                    {{ pref.is_enabled ? 'Actif' : 'Inactif' }}
                  </span>
                </div>
                <USwitch
                  v-model="pref.is_enabled"
                  @update:model-value="updateCategoryPreference(pref.category_id, $event)"
                  @click.stop
                  :loading="updatingCategories.has(pref.category_id)"
                  :disabled="updatingCategories.has(pref.category_id)"
                  size="sm"
                  class="flex-shrink-0"
                />
              </div>
            </div>
          </div>
        </UCard>

        <!-- Section Horaires de disponibilité (lab uniquement) -->
        <UCard v-if="isLab">
          <template #header>
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <UIcon name="i-lucide-clock" class="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold">Horaires de disponibilité</h2>
                  <p class="text-sm text-muted mt-0.5">
                    Créneaux proposés aux patients pour les prises de sang
                  </p>
                </div>
              </div>
              <UButton size="sm" variant="outline" icon="i-lucide-pencil" @click="openAvailabilitySlideover">
                Modifier
              </UButton>
            </div>
          </template>

          <div v-if="loadingAvailability" class="flex flex-col items-center py-12">
            <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary mb-3" />
            <p class="text-sm text-muted">Chargement des horaires...</p>
          </div>

          <div v-else-if="weeklyScheduleRows.length > 0" class="divide-y divide-default/50">
            <div
              v-for="row in weeklyScheduleRows"
              :key="row.day"
              class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <span class="font-medium">{{ row.label }}</span>
              <span class="text-muted tabular-nums">
                {{ row.start && row.end ? `${row.start} – ${row.end}` : 'Fermé' }}
              </span>
            </div>
          </div>

          <UEmpty
            v-else
            icon="i-lucide-clock"
            title="Aucun horaire défini"
            description="Définissez vos horaires pour que les patients puissent réserver des créneaux."
            :actions="[{ label: 'Définir les horaires', icon: 'i-lucide-plus', onClick: openAvailabilitySlideover }]"
            variant="naked"
          />
        </UCard>

        <!-- Slideover Horaires (lab uniquement) -->
        <USlideover
          v-if="isLab"
          v-model:open="showAvailabilitySlideover"
          title="Horaires de disponibilité"
          description="Indiquez les plages horaires pour chaque jour. Laissez vide pour un jour fermé."
          :ui="{ body: 'flex flex-col', footer: 'justify-end gap-2' }"
        >
          <template #body>
            <UForm @submit="saveAvailability" class="flex flex-col flex-1 min-h-0">
              <div class="space-y-4 flex-1 overflow-y-auto pr-1">
                <div
                  v-for="day in DAYS"
                  :key="day.key"
                  class="rounded-lg border border-default/50 p-4 space-y-3"
                >
                  <p class="font-medium text-sm">{{ day.label }}</p>
                  <div class="grid grid-cols-2 gap-3">
                    <UFormField label="Ouverture" :name="`${day.key}_start`">
                      <UInput v-model="editingSchedule[day.key].start" type="time" placeholder="09:00" />
                    </UFormField>
                    <UFormField label="Fermeture" :name="`${day.key}_end`">
                      <UInput v-model="editingSchedule[day.key].end" type="time" placeholder="18:00" />
                    </UFormField>
                  </div>
                </div>
              </div>
            </UForm>
          </template>
          <template #footer="{ close }">
            <UButton variant="ghost" @click="close()">Annuler</UButton>
            <UButton :loading="savingAvailability" @click="saveAvailability">
              Enregistrer
            </UButton>
          </template>
        </USlideover>

        <!-- Section Documents médicaux (patient uniquement) -->
        <UCard v-if="isPatient">
          <template #header>
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <UIcon name="i-lucide-file-text" class="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 class="text-lg font-semibold">Documents médicaux</h2>
                <p class="text-sm text-muted mt-0.5">
                  Gérez vos documents de couverture santé. Ces documents seront automatiquement utilisés lors de vos prochains rendez-vous.
                </p>
              </div>
            </div>
          </template>

          <div v-if="loadingDocuments" class="text-center py-8">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
            <p class="text-gray-500">Chargement des documents...</p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Carte Vitale -->
            <UCard class="hover:shadow-md transition-all duration-200" :ui="{ body: { padding: 'p-4' }, ring: 'ring-1 ring-gray-200', shadow: 'shadow-sm' }">
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-start gap-3 flex-1 min-w-0">
                    <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-lucide-credit-card" class="w-5 h-5 text-blue-600" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="font-semibold text-base text-gray-900">Carte Vitale</h3>
                      <UBadge color="amber" variant="subtle" size="xs" class="mt-1">Obligatoire</UBadge>
                    </div>
                  </div>
                  <UButton v-if="documents.carte_vitale" variant="ghost" size="xs" color="primary" icon="i-lucide-download" @click="downloadDocument(documents.carte_vitale.medical_document_id)" class="shrink-0" />
                </div>
                <div v-if="documents.carte_vitale" class="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div class="flex items-start gap-2">
                    <UIcon name="i-lucide-check-circle-2" class="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-green-900 truncate">{{ documents.carte_vitale.file_name }}</p>
                      <p class="text-xs text-green-700 mt-0.5">Mis à jour : {{ formatDate(documents.carte_vitale.updated_at) }}</p>
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
                <div v-if="uploadingDocument === 'carte_vitale'" class="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin text-primary" />
                  <span>Enregistrement en cours...</span>
                </div>
              </div>
            </UCard>

            <!-- Carte Mutuelle -->
            <UCard class="hover:shadow-md transition-all duration-200" :ui="{ body: { padding: 'p-4' }, ring: 'ring-1 ring-gray-200', shadow: 'shadow-sm' }">
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-start gap-3 flex-1 min-w-0">
                    <div class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-purple-600" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="font-semibold text-base text-gray-900">Carte Mutuelle</h3>
                      <UBadge color="amber" variant="subtle" size="xs" class="mt-1">Obligatoire</UBadge>
                    </div>
                  </div>
                  <UButton v-if="documents.carte_mutuelle" variant="ghost" size="xs" color="primary" icon="i-lucide-download" @click="downloadDocument(documents.carte_mutuelle.medical_document_id)" class="shrink-0" />
                </div>
                <div v-if="documents.carte_mutuelle" class="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div class="flex items-start gap-2">
                    <UIcon name="i-lucide-check-circle-2" class="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-green-900 truncate">{{ documents.carte_mutuelle.file_name }}</p>
                      <p class="text-xs text-green-700 mt-0.5">Mis à jour : {{ formatDate(documents.carte_mutuelle.updated_at) }}</p>
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
                <div v-if="uploadingDocument === 'carte_mutuelle'" class="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin text-primary" />
                  <span>Enregistrement en cours...</span>
                </div>
              </div>
            </UCard>

            <!-- Autres Assurances -->
            <UCard class="hover:shadow-md transition-all duration-200" :ui="{ body: { padding: 'p-4' }, ring: 'ring-1 ring-gray-200', shadow: 'shadow-sm' }">
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-start gap-3 flex-1 min-w-0">
                    <div class="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-lucide-file-plus" class="w-5 h-5 text-gray-600" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="font-semibold text-base text-gray-900">Autres Assurances</h3>
                      <UBadge color="gray" variant="subtle" size="xs" class="mt-1">Optionnel</UBadge>
                    </div>
                  </div>
                  <UButton v-if="documents.autres_assurances" variant="ghost" size="xs" color="primary" icon="i-lucide-download" @click="downloadDocument(documents.autres_assurances.medical_document_id)" class="shrink-0" />
                </div>
                <div v-if="documents.autres_assurances" class="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div class="flex items-start gap-2">
                    <UIcon name="i-lucide-check-circle-2" class="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-green-900 truncate">{{ documents.autres_assurances.file_name }}</p>
                      <p class="text-xs text-green-700 mt-0.5">Mis à jour : {{ formatDate(documents.autres_assurances.updated_at) }}</p>
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
                <div v-if="uploadingDocument === 'autres_assurances'" class="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin text-primary" />
                  <span>Enregistrement en cours...</span>
                </div>
              </div>
            </UCard>

            <UAlert v-if="documentError" color="red" :title="documentError" class="col-span-full mt-2" />
          </div>
        </UCard>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import { apiFetch } from '~/utils/api'

definePageMeta({
  layout: false,
  middleware: ['auth'],
})

useHead({ title: 'Mon profil' })

const { user, fetchCurrentUser } = useAuth()
const toast = useToast()

// -- Helpers rôle --
const role = computed(() => user.value?.role)
const isPatient = computed(() => role.value === 'patient')
const isNurse = computed(() => role.value === 'nurse')
const isLab = computed(() => role.value === 'lab')
const isSubaccount = computed(() => role.value === 'subaccount')
const hasCoverageZone = computed(() => isNurse.value || isLab.value || isSubaccount.value)

// -- État global --
const loading = ref(true)
const saving = ref(false)

// -- Formulaire profil --
const profileForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  name: '',
  rpps: '',
  siret: '',
  birth_date: null as string | null,
  gender: null as string | null,
  address: null as any,
  address_complement: null as string | null,
})
const initialForm = ref({ ...profileForm.value })

const genderOptions = [
  { label: 'Homme', value: 'male' },
  { label: 'Femme', value: 'female' },
  { label: 'Autre', value: 'other' },
]

// -- Zone de couverture --
const coverageZone = ref<any>(null)
const coverageRadius = ref(20)
const savingCoverage = ref(false)

const hasValidAddress = computed(() => {
  const addr = profileForm.value.address
  return addr && typeof addr === 'object' && addr.lat && addr.lng
})

// -- Catégories nurse --
const categoryPreferences = ref<any[]>([])
const loadingCategories = ref(false)
const updatingCategories = ref(new Set<string>())

// -- Horaires lab --
const DAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
]
const defaultWeeklySchedule = () =>
  Object.fromEntries(DAYS.map((d) => [d.key, { start: '', end: '' }]))

const availability = ref<any>(null)
const loadingAvailability = ref(false)
const savingAvailability = ref(false)
const showAvailabilitySlideover = ref(false)
const editingSchedule = ref<Record<string, { start: string; end: string }>>(defaultWeeklySchedule())

const weeklyScheduleRows = computed(() => {
  const schedule = availability.value?.weekly_schedule
  if (!schedule || typeof schedule !== 'object') return []
  return DAYS.map((d) => ({
    day: d.key,
    label: d.label,
    start: schedule[d.key]?.start || '',
    end: schedule[d.key]?.end || '',
  }))
})

// -- Documents patient --
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

// ============================
// Chargement des données
// ============================

onMounted(async () => {
  await loadProfile()

  const promises: Promise<void>[] = []
  if (hasCoverageZone.value) promises.push(loadCoverage())
  if (isNurse.value) promises.push(loadCategoryPreferences())
  if (isLab.value) promises.push(loadAvailability())
  if (isPatient.value) promises.push(loadDocuments())
  await Promise.all(promises)
})

const loadProfile = async () => {
  loading.value = true
  try {
    const userData = await fetchCurrentUser()
    if (!userData) return

    profileForm.value = {
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      email: userData.email || '',
      phone: userData.phone || '',
      name: userData.name || '',
      rpps: userData.rpps || '',
      siret: userData.siret || '',
      birth_date: userData.birth_date || null,
      gender: userData.gender || null,
      address: userData.address || null,
      address_complement: userData.address?.complement || null,
    }
    initialForm.value = { ...profileForm.value }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || 'Impossible de charger le profil', color: 'red' })
  } finally {
    loading.value = false
  }
}

// ============================
// Sauvegarde profil
// ============================

const saveProfile = async () => {
  saving.value = true
  try {
    if (!user.value?.id) return

    const body: any = {
      first_name: profileForm.value.first_name,
      last_name: profileForm.value.last_name,
      phone: profileForm.value.phone || null,
    }

    // Champs spécifiques par rôle
    if (isNurse.value) {
      body.rpps = profileForm.value.rpps
    }
    if (isLab.value) {
      body.name = profileForm.value.name
      body.siret = profileForm.value.siret
    }
    if (isPatient.value) {
      body.birth_date = profileForm.value.birth_date || null
      body.gender = profileForm.value.gender || null
    }

    // Adresse
    if (profileForm.value.address) {
      body.address = {
        ...profileForm.value.address,
        ...(isPatient.value && { complement: profileForm.value.address_complement || null }),
      }
    } else {
      body.address = null
    }

    const response = await apiFetch(`/users/${user.value.id}`, {
      method: 'PUT',
      body,
    })

    if (response.success) {
      toast.add({ title: 'Profil mis à jour', description: 'Vos informations ont été enregistrées avec succès.', color: 'green' })
      await fetchCurrentUser()
      initialForm.value = { ...profileForm.value }
    } else {
      toast.add({ title: 'Erreur', description: response.error || 'Impossible de sauvegarder', color: 'red' })
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || 'Une erreur est survenue', color: 'red' })
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  profileForm.value = { ...initialForm.value }
}

// ============================
// Zone de couverture
// ============================

const loadCoverage = async () => {
  try {
    const coverageRole = isSubaccount.value ? 'subaccount' : role.value
    const response = await apiFetch(`/coverage-zones?owner_id=${user.value?.id}&role=${coverageRole}`, { method: 'GET' })
    if (response.success && response.data?.length > 0) {
      coverageZone.value = response.data[0]
      if (coverageZone.value.radius_km) {
        coverageRadius.value = coverageZone.value.radius_km
      }
    }
  } catch {
    // Valeurs par défaut conservées
  }
}

const saveCoverage = async () => {
  if (!hasValidAddress.value) {
    toast.add({ title: 'Adresse requise', description: "Définissez d'abord votre adresse.", color: 'red' })
    return
  }
  savingCoverage.value = true
  try {
    const coverageRole = isSubaccount.value ? 'subaccount' : role.value
    const response = await apiFetch('/coverage-zones', {
      method: coverageZone.value ? 'PUT' : 'POST',
      body: {
        center_lat: profileForm.value.address.lat,
        center_lng: profileForm.value.address.lng,
        radius_km: coverageRadius.value,
        role: coverageRole,
      },
    })
    if (response.success) {
      toast.add({ title: 'Rayon enregistré', description: `Zone de ${coverageRadius.value} km mise à jour.`, color: 'green' })
      await loadCoverage()
    } else {
      toast.add({ title: 'Erreur', description: response.error || "Impossible d'enregistrer", color: 'red' })
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || 'Une erreur est survenue', color: 'red' })
  } finally {
    savingCoverage.value = false
  }
}

// ============================
// Catégories nurse
// ============================

const loadCategoryPreferences = async () => {
  loadingCategories.value = true
  try {
    const response = await apiFetch('/nurse-category-preferences', { method: 'GET' })
    if (response.success && response.data) {
      categoryPreferences.value = response.data.map((pref: any) => ({
        ...pref,
        is_enabled: Boolean(pref.is_enabled),
      }))
    }
  } catch {
    // Valeurs par défaut conservées
  } finally {
    loadingCategories.value = false
  }
}

const updateCategoryPreference = async (categoryId: string, isEnabled: boolean) => {
  const preference = categoryPreferences.value.find(p => p.category_id === categoryId)
  if (!preference) return

  const oldValue = preference.is_enabled
  preference.is_enabled = isEnabled
  updatingCategories.value.add(categoryId)

  try {
    const response = await apiFetch('/nurse-category-preferences', {
      method: 'PUT',
      body: { category_id: categoryId, is_enabled: isEnabled },
    })
    if (response.success) {
      toast.add({ title: 'Préférence mise à jour', description: `"${preference.name}" ${isEnabled ? 'activé' : 'désactivé'}.`, color: 'green' })
    } else {
      preference.is_enabled = oldValue
      toast.add({ title: 'Erreur', description: response.error || 'Impossible de mettre à jour', color: 'red' })
    }
  } catch (err: any) {
    preference.is_enabled = oldValue
    toast.add({ title: 'Erreur', description: err.message || 'Une erreur est survenue', color: 'red' })
  } finally {
    updatingCategories.value.delete(categoryId)
  }
}

// ============================
// Horaires lab
// ============================

const loadAvailability = async () => {
  loadingAvailability.value = true
  try {
    const response = await apiFetch(`/availability-settings?owner_id=${user.value?.id}&role=lab`, { method: 'GET' })
    if (response.success && response.data) {
      availability.value = response.data
      const ws = response.data.weekly_schedule || {}
      editingSchedule.value = { ...defaultWeeklySchedule() }
      DAYS.forEach((d) => {
        if (ws[d.key]) {
          editingSchedule.value[d.key] = { start: ws[d.key].start || '', end: ws[d.key].end || '' }
        }
      })
    } else {
      availability.value = null
      editingSchedule.value = defaultWeeklySchedule()
    }
  } catch {
    availability.value = null
    editingSchedule.value = defaultWeeklySchedule()
  } finally {
    loadingAvailability.value = false
  }
}

const openAvailabilitySlideover = () => {
  const ws = availability.value?.weekly_schedule || {}
  editingSchedule.value = { ...defaultWeeklySchedule() }
  DAYS.forEach((d) => {
    if (ws[d.key]) {
      editingSchedule.value[d.key] = { start: ws[d.key].start || '', end: ws[d.key].end || '' }
    }
  })
  showAvailabilitySlideover.value = true
}

const saveAvailability = async () => {
  savingAvailability.value = true
  try {
    const weeklySchedule: Record<string, { start: string; end: string }> = {}
    DAYS.forEach((d) => {
      const s = editingSchedule.value[d.key]
      if (s?.start && s?.end) weeklySchedule[d.key] = { start: s.start, end: s.end }
    })

    const response = await apiFetch('/availability-settings', {
      method: 'PUT',
      body: { owner_id: user.value?.id, role: 'lab', weekly_schedule: weeklySchedule },
    })

    if (response.success) {
      toast.add({ title: 'Horaires enregistrés', description: 'Les créneaux ont été mis à jour.', color: 'green' })
      showAvailabilitySlideover.value = false
      await loadAvailability()
    } else {
      toast.add({ title: 'Erreur', description: response.error || "Impossible d'enregistrer", color: 'red' })
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || 'Une erreur est survenue', color: 'red' })
  } finally {
    savingAvailability.value = false
  }
}

// ============================
// Documents patient
// ============================

const loadDocuments = async () => {
  loadingDocuments.value = true
  documentError.value = null
  try {
    const response = await apiFetch('/patient-documents', { method: 'GET' })
    if (response.success) {
      documents.value = {}
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach((doc: any) => {
          if (doc.document_type) documents.value[doc.document_type] = doc
        })
      }
    }
  } catch (err: any) {
    documentError.value = err.message || 'Erreur lors du chargement des documents'
  } finally {
    loadingDocuments.value = false
  }
}

const onFileSelected = (documentType: string, file: File | null) => {
  if (isResettingAfterUpload.value === documentType) return
  if (!file) return
  if (uploadingDocument.value === documentType) return
  nextTick(() => handleDocumentChange(documentType, file))
}

const handleDocumentChange = async (documentType: string, file: File | null) => {
  if (!file) return
  if (uploadingDocument.value === documentType) return

  uploadingDocument.value = documentType
  documentError.value = null

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', documentType)

    const result = await apiFetch('/patient-documents/upload', { method: 'POST', body: formData })

    if (result.success) {
      toast.add({ title: 'Document enregistré', description: 'Votre document a été enregistré avec succès.', color: 'green' })
      isResettingAfterUpload.value = documentType
      documentFiles.value[documentType] = null
      await new Promise(resolve => setTimeout(resolve, 500))
      await loadDocuments()
      setTimeout(() => { isResettingAfterUpload.value = null }, 100)
    } else {
      throw new Error(result.error || "Erreur lors de l'enregistrement")
    }
  } catch (err: any) {
    documentError.value = err.message || "Erreur lors de l'enregistrement du document"
    toast.add({ title: 'Erreur', description: err.message || "Impossible d'enregistrer le document", color: 'red' })
  } finally {
    uploadingDocument.value = null
    if (isResettingAfterUpload.value === documentType) {
      setTimeout(() => { isResettingAfterUpload.value = null }, 100)
    }
  }
}

const downloadDocument = async (documentId: string) => {
  try {
    const apiBase = useRuntimeConfig().public.apiBase || 'http://localhost:8888/api'
    const token = localStorage.getItem('auth_token')

    const response = await fetch(`${apiBase}/medical-documents/${documentId}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (!response.ok) throw new Error('Erreur lors du téléchargement')

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `document-${documentId}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.add({ title: 'Téléchargement', description: 'Le document est en cours de téléchargement.', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || 'Impossible de télécharger le document', color: 'red' })
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateString
  }
}
</script>
