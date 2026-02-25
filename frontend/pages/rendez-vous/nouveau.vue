<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
      <!-- Étape 0 : Choix catégorie — mobile-first, description visible partout -->
      <div v-if="step === 0" class="max-w-5xl mx-auto px-0 sm:px-2">
        <header class="text-center mb-5 sm:mb-6 px-1">
          <h1 class="text-xl sm:text-2xl md:text-3xl font-normal text-gray-900 dark:text-white mb-1.5 sm:mb-2 tracking-tight">
            Quel type de soin souhaitez-vous ?
          </h1>
          <p v-if="providerName" class="text-xs sm:text-sm md:text-base text-primary-600 dark:text-primary-400 font-medium mb-1">
            Rendez-vous avec {{ providerName }}
          </p>
          <p class="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Choisissez une catégorie pour continuer vers le formulaire de prise de rendez-vous.
          </p>
        </header>

        <!-- Chargement -->
        <div v-if="categoriesLoading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3">
          <div v-for="i in 8" :key="i" class="rounded-xl bg-gray-100 dark:bg-gray-800 min-h-[8rem] sm:min-h-[7.5rem] animate-pulse" />
        </div>

        <!-- Grille catégories : mobile 2 cols avec description, touch-friendly -->
        <div
          v-else-if="careCategoriesList.length > 0"
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3"
        >
          <button
            v-for="cat in careCategoriesList"
            :key="cat.id"
            type="button"
            @click="selectCategory(cat)"
            class="group relative flex flex-col items-center justify-center text-center min-h-[7.75rem] sm:min-h-[7.5rem] py-4 px-3 sm:py-4 sm:px-4 rounded-xl border-2 border-primary-200 dark:border-primary-800 bg-primary-50/80 dark:bg-primary-950/30 hover:border-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 active:scale-[0.98] transition-all duration-200 touch-manipulation"
          >
            <UBadge
              :color="cat.type === 'blood_test' ? 'error' : 'primary'"
              variant="soft"
              size="xs"
              class="absolute top-1.5 right-1.5 sm:top-2 sm:right-2"
            >
              {{ cat.type === 'blood_test' ? 'Laboratoire' : 'Soins infirmiers' }}
            </UBadge>
            <div
              :class="[
                'w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 mb-2',
                cat.type === 'blood_test'
                  ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                  : 'bg-primary-200 dark:bg-primary-800 text-primary-600 dark:text-primary-400',
              ]"
            >
              <ClientOnly>
                <UIcon :name="categoryIcon(cat)" class="w-5 h-5 sm:w-6 sm:h-6" />
                <template #fallback>
                  <span class="w-5 h-5 sm:w-6 sm:h-6 rounded bg-current opacity-50" />
                </template>
              </ClientOnly>
            </div>
            <h3 class="font-normal text-gray-900 dark:text-white text-xs sm:text-sm line-clamp-2 leading-tight">
              {{ cat.name }}
            </h3>
            <p v-if="cat.description" class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-snug">
              {{ cat.description }}
            </p>
          </button>
        </div>

        <!-- Fallback si aucune catégorie -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            v-for="item in serviceItems"
            :key="item.value"
            type="button"
            @click="selectFallbackService(item.value)"
            class="relative flex flex-col items-center justify-center text-center min-h-[7.75rem] py-4 px-4 rounded-xl border-2 border-primary-200 dark:border-primary-800 bg-primary-50/80 hover:bg-primary-100 dark:hover:bg-primary-900/30 active:scale-[0.99] transition-all touch-manipulation"
          >
            <UBadge
              :color="item.value === 'blood_test' ? 'error' : 'primary'"
              variant="soft"
              size="xs"
              class="absolute top-2 right-2"
            >
              {{ item.value === 'blood_test' ? 'Laboratoire' : 'Soins infirmiers' }}
            </UBadge>
            <div
              :class="[
                'w-10 h-10 rounded-lg flex items-center justify-center mb-2',
                item.value === 'blood_test' ? 'bg-red-100 text-red-600' : 'bg-primary-200 text-primary-600',
              ]"
            >
              <UIcon :name="item.icon" class="w-5 h-5" />
            </div>
            <h3 class="font-normal text-gray-900 dark:text-white text-sm">{{ item.label }}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-snug">{{ item.description }}</p>
          </button>
        </div>
      </div>
      
      <!-- Étape 2 : Formulaire -->
      <div v-if="step === 1" class="max-w-4xl mx-auto">
        <!-- Message d'erreur en haut -->
        <UAlert 
          v-if="validationError && step === 1" 
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          title="Champs obligatoires manquants"
          class="mb-6"
          id="form-error-alert"
        >
          <template #description>
            <div class="whitespace-pre-line">{{ validationError }}</div>
          </template>
        </UAlert>

        <!-- Section "Pour qui ?" si connecté -->
        <UCard v-if="isAuthenticated" class="mb-6">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="w-5 h-5 text-primary" />
              <h3 class="text-lg font-normal">Pour qui prenez-vous ce rendez-vous ?</h3>
            </div>
          </template>

          <div class="space-y-4">
            <!-- Choix Pour moi-même / Pour un proche -->
            <div class="grid grid-cols-2 gap-3">
              <button
                @click="selectForMyself"
                :class="[
                  'p-4 rounded-lg border-2 transition-all text-left',
                  selectedRelative === null && !showRelativesSelector
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                ]"
              >
                <div class="flex items-center gap-3">
                  <div :class="[
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    selectedRelative === null && !showRelativesSelector ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                  ]">
                    <UIcon 
                      name="i-lucide-user" 
                      :class="[
                        'w-5 h-5',
                        selectedRelative === null && !showRelativesSelector ? 'text-white' : 'text-gray-500'
                      ]" 
                    />
                  </div>
                  <div>
                    <p class="font-normal text-gray-900 dark:text-white">Pour moi-même</p>
                    <p class="text-xs text-gray-500">Mes informations</p>
                  </div>
                </div>
              </button>

              <button
                @click="showRelativesSelector = !showRelativesSelector; if (showRelativesSelector) { selectedRelative = undefined }"
                :class="[
                  'p-4 rounded-lg border-2 transition-all text-left',
                  showRelativesSelector || (typeof selectedRelative === 'string')
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                ]"
              >
                <div class="flex items-center justify-between w-full">
                  <div class="flex items-center gap-3">
                    <div :class="[
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      showRelativesSelector || (typeof selectedRelative === 'string') ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                    ]">
                      <UIcon 
                        name="i-lucide-heart" 
                        :class="[
                          'w-5 h-5',
                          showRelativesSelector || (typeof selectedRelative === 'string') ? 'text-white' : 'text-gray-500'
                        ]" 
                      />
                    </div>
                    <div>
                      <p class="font-normal text-gray-900 dark:text-white">Pour un proche</p>
                      <p class="text-xs text-gray-500">
                        {{ typeof selectedRelative === 'string' ? relatives.find(r => r.id === selectedRelative)?.first_name + ' sélectionné(e)' : 'Enfant, parent, conjoint...' }}
                      </p>
                    </div>
                  </div>
                  <UIcon 
                    :name="showRelativesSelector ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" 
                    class="w-5 h-5 text-gray-400 flex-shrink-0" 
                  />
                </div>
              </button>
            </div>

            <!-- Sélecteur de proche -->
            <div v-if="showRelativesSelector" class="pt-4 border-t space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Choisissez le proche concerné
                </label>
                
                <!-- Liste des proches en cartes -->
                <div v-if="relatives.length > 0" class="space-y-3">
                  <div class="grid grid-cols-1 gap-3">
                  <button
                    v-for="relative in relatives"
                    :key="relative.id"
                    @click="selectedRelative = relative.id; loadRelativeData(relative.id)"
                    :class="[
                      'relative p-4 rounded-lg border-2 transition-all text-left hover:shadow-md',
                      selectedRelative === relative.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    ]"
                  >
                    <div class="flex items-center gap-3">
                      <!-- Avatar avec initiale -->
                      <div :class="[
                        'w-12 h-12 rounded-full flex items-center justify-center text-white font-normal flex-shrink-0',
                        selectedRelative === relative.id
                          ? 'bg-gradient-to-br from-primary-500 to-primary-600'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      ]">
                        {{ relative.first_name?.charAt(0).toUpperCase() }}{{ relative.last_name?.charAt(0).toUpperCase() }}
                      </div>
                      
                      <div class="flex-1 min-w-0">
                        <p class="font-normal text-gray-900 dark:text-white mb-1">
                          {{ relative.first_name }} {{ relative.last_name }}
                        </p>
                        
                        <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <UIcon :name="getRelationshipIcon(relative.relationship_type)" class="w-3.5 h-3.5" />
                          <span>{{ getRelationshipDescription(relative.relationship_type, relative.gender) }}</span>
                        </div>
                      </div>
                      
                      <!-- Actions -->
                      <div class="flex-shrink-0 flex items-center gap-2">
                        <button
                          @click.stop="openEditRelativeModal(relative)"
                          class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                          title="Modifier"
                        >
                          <UIcon name="i-lucide-pencil" class="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          @click.stop="confirmDeleteRelative(relative)"
                          class="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="Supprimer"
                        >
                          <UIcon name="i-lucide-trash-2" class="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </button>
                  </div>
                  <UButton
                    @click="openAddRelativeModal"
                    variant="outline"
                    size="sm"
                    icon="i-lucide-plus"
                    class="w-full border-dashed"
                  >
                    Ajouter un autre proche
                  </UButton>
                </div>
                
                <!-- Empty state : aucun proche -->
                <UEmpty
                  v-else
                  icon="i-lucide-users"
                  title="Aucun proche enregistré"
                  description="Ajoutez un proche (enfant, parent, conjoint…) pour prendre rendez-vous à sa place. Vous pourrez réutiliser ses informations à chaque réservation."
                  class="rounded-xl border-2 border-dashed border-default py-8"
                  :actions="[{ label: 'Ajouter un proche', icon: 'i-lucide-plus', variant: 'solid', onClick: openAddRelativeModal }]"
                />
              </div>
            </div>

            <!-- Récapitulatif des infos pré-remplies -->
            <div v-if="((selectedRelative === null && !showRelativesSelector) || (typeof selectedRelative === 'string' && selectedRelative.length > 0)) && !showFullForm" class="pt-4 border-t">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h4 class="text-sm font-normal text-gray-900 dark:text-white">Informations enregistrées</h4>
                  <p class="text-xs text-gray-500 mt-0.5">Complétez le reste du formulaire ci-dessous</p>
                </div>
                <UButton
                  variant="outline"
                  size="sm"
                  icon="i-lucide-pencil"
                  @click="showFullForm = true"
                >
                  Modifier
                </UButton>
              </div>
              
              <!-- Carte moderne des infos -->
              <div class="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-primary-100 dark:border-primary-800">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <!-- Nom complet -->
                  <div class="flex items-start gap-3">
                    <div class="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-lucide-user" class="w-4 h-4 text-primary-600" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs text-gray-500 dark:text-gray-400">Nom complet</p>
                      <p class="text-sm font-normal text-gray-900 dark:text-white truncate">
                        {{ prefilledInfo.first_name }} {{ prefilledInfo.last_name }}
                      </p>
                    </div>
                  </div>

                  <!-- Date de naissance -->
                  <div v-if="prefilledInfo.birth_date" class="flex items-start gap-3">
                    <div class="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-lucide-cake" class="w-4 h-4 text-primary-600" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs text-gray-500 dark:text-gray-400">Date de naissance</p>
                      <p class="text-sm font-normal text-gray-900 dark:text-white">
                        {{ formatBirthDate(prefilledInfo.birth_date) }}
                      </p>
                    </div>
                  </div>

                  <!-- Email -->
                  <div v-if="prefilledInfo.email" class="flex items-start gap-3">
                    <div class="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-lucide-mail" class="w-4 h-4 text-primary-600" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <p class="text-sm font-normal text-gray-900 dark:text-white truncate">
                        {{ prefilledInfo.email }}
                      </p>
                    </div>
                  </div>

                  <!-- Téléphone -->
                  <div v-if="prefilledInfo.phone" class="flex items-start gap-3">
                    <div class="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-lucide-phone" class="w-4 h-4 text-primary-600" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs text-gray-500 dark:text-gray-400">Téléphone</p>
                      <p class="text-sm font-normal text-gray-900 dark:text-white">
                        {{ prefilledInfo.phone }}
                      </p>
                    </div>
                  </div>

                  <!-- Adresse -->
                  <div v-if="prefilledInfo.address" class="flex items-start gap-3 md:col-span-2">
                    <div class="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-primary-600" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs text-gray-500 dark:text-gray-400">Adresse</p>
                      <p class="text-sm font-normal text-gray-900 dark:text-white">
                        {{ typeof prefilledInfo.address === 'string' ? prefilledInfo.address : prefilledInfo.address?.label }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Lien "Déjà un compte ?" si non connecté -->
        <UCard v-else class="mb-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">Vous avez déjà un compte ?</p>
              <p class="text-sm text-gray-500 mt-1">Connectez-vous pour pré-remplir vos informations</p>
            </div>
            <UButton
              to="/login"
              variant="outline"
              icon="i-lucide-log-in"
            >
              Se connecter
            </UButton>
          </div>
        </UCard>
        
        <ClientOnly>
          <LabForm
            v-if="selectedService === 'blood_test'"
            v-model="formData"
            @submit="handleFormSubmit"
            ref="labFormRef"
            :hide-personal-info="isAuthenticated && (selectedRelative !== undefined || showRelativesSelector) && !showFullForm"
            :min-lead-time-hours="isProviderBooking && providerType === 'lab' ? providerMinLeadTimeHours : undefined"
            :accept-saturday="isProviderBooking && providerType === 'lab' ? providerAcceptSaturday : true"
            :accept-sunday="isProviderBooking && providerType === 'lab' ? providerAcceptSunday : true"
          />
          <NursingForm 
            v-else-if="selectedService === 'nursing'"
            v-model="formData"
            @submit="handleFormSubmit"
            ref="nursingFormRef"
            :hide-personal-info="isAuthenticated && (selectedRelative !== undefined || showRelativesSelector) && !showFullForm"
          />
          <template #fallback>
            <div class="text-center py-8">
              <p class="text-gray-500">Chargement du formulaire...</p>
            </div>
          </template>
        </ClientOnly>
        <div v-if="!selectedService" class="text-center py-8">
          <p class="text-gray-500">Veuillez sélectionner un service</p>
          <UButton @click="step = 0" class="mt-4">Retour à la sélection</UButton>
        </div>
        <div v-if="selectedService" class="flex justify-between mt-6">
          <UButton @click="prevStep" variant="outline">Précédent</UButton>
          <UButton @click="validateAndNextStep" :disabled="!formData || Object.keys(formData).length === 0" size="xl">Continuer</UButton>
        </div>
      </div>
      
      <!-- Étape 3 : Récapitulatif -->
      <div v-if="step === 2" class="max-w-2xl mx-auto">
        <h2 class="text-2xl font-normal mb-6">Récapitulatif de votre demande</h2>
        
        <!-- Informations personnelles -->
        <UCard class="mb-4">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user" class="w-5 h-5 text-primary" />
              <h3 class="text-lg font-normal">Informations personnelles</h3>
            </div>
          </template>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-500">Nom</p>
                <p class="font-medium">{{ formData.last_name || '-' }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">Prénom</p>
                <p class="font-medium">{{ formData.first_name || '-' }}</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-500">Email</p>
                <p class="font-medium">{{ formData.email || '-' }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">Téléphone</p>
                <p class="font-medium">{{ formData.phone || '-' }}</p>
              </div>
            </div>
            <div v-if="formData.birth_date" class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-500">Date de naissance</p>
                <p class="font-medium">{{ formatDate(formData.birth_date) }}</p>
              </div>
              <div v-if="formData.gender">
                <p class="text-sm text-gray-500">Genre</p>
                <p class="font-medium">{{ formatGender(formData.gender) }}</p>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Informations du rendez-vous -->
        <UCard class="mb-4">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-calendar" class="w-5 h-5 text-primary" />
              <h3 class="text-lg font-normal">Informations du rendez-vous</h3>
            </div>
          </template>
          <div class="space-y-3">
            <div>
              <p class="text-sm text-gray-500">Type de service</p>
              <p class="font-medium">{{ selectedService === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}</p>
            </div>
            <div v-if="formData.category_id">
              <p class="text-sm text-gray-500">{{ selectedService === 'blood_test' ? 'Type d\'analyse' : 'Type de soin' }}</p>
              <p class="font-medium">{{ getCategoryName(formData.category_id) }}</p>
            </div>
            <div v-if="formData.scheduled_at">
              <p class="text-sm text-gray-500">Date souhaitée</p>
              <p class="font-medium">{{ formatDate(formData.scheduled_at) }}</p>
            </div>
            <div v-if="formData.duration_days">
              <p class="text-sm text-gray-500">Durée des soins</p>
              <p class="font-medium">{{ formatDuration(formData.duration_days) }}</p>
            </div>
            <div v-if="formData.frequency && formData.duration_days !== '1'">
              <p class="text-sm text-gray-500">Fréquence</p>
              <p class="font-medium">{{ formatFrequency(formData.frequency) }}</p>
            </div>
            <div v-if="formData.availability">
              <p class="text-sm text-gray-500">Disponibilités</p>
              <p class="font-medium">{{ formatAvailability(formData.availability) }}</p>
            </div>
          </div>
        </UCard>

        <!-- Adresse -->
        <UCard class="mb-4" v-if="formData.address">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-primary" />
              <h3 class="text-lg font-normal">Adresse</h3>
            </div>
          </template>
          <div>
            <p class="font-medium">{{ formData.address.label || formData.address }}</p>
            <p v-if="formData.address_complement" class="text-sm text-gray-500 mt-1">
              {{ formData.address_complement }}
            </p>
          </div>
        </UCard>

        <!-- Documents -->
        <UCard class="mb-4" v-if="hasDocuments">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="w-5 h-5 text-primary" />
              <h3 class="text-lg font-normal">Documents</h3>
            </div>
          </template>
          <div class="space-y-2">
            <!-- Afficher les fichiers réels (File objects) -->
            <template v-if="formData.files">
              <div v-for="(file, key) in formData.files" :key="key">
                <p v-if="file !== null && file !== undefined" class="text-sm">
                  <span class="font-medium">{{ formatDocumentName(key) }}:</span>
                  <span class="text-gray-600 ml-2">
                    {{ getFileName(file) }}
                  </span>
                </p>
              </div>
            </template>
            <!-- Afficher aussi les documents depuis form_data.files (métadonnées) -->
            <template v-if="formData.form_data?.files">
              <div v-for="(fileData, key) in formData.form_data.files" :key="`meta-${key}`">
                <p v-if="fileData && (!formData.files || !formData.files[key])" class="text-sm">
                  <span class="font-medium">{{ formatDocumentName(key) }}:</span>
                  <span class="text-gray-600 ml-2">
                    {{ fileData.name || 'Fichier téléchargé' }}
                  </span>
                </p>
              </div>
            </template>
          </div>
        </UCard>

        <!-- Notes -->
        <UCard class="mb-6" v-if="formData.notes">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-message-square" class="w-5 h-5 text-primary" />
              <h3 class="text-lg font-normal">Notes</h3>
            </div>
          </template>
          <p class="text-gray-700">{{ formData.notes }}</p>
        </UCard>
        
        <!-- Consentement RGPD -->
        <UCard class="mb-6">
          <UCheckbox v-model="consent" label="J'accepte les conditions RGPD/HDS et consens au traitement de mes données de santé" />
        </UCard>
        
        <!-- Message d'erreur -->
        <UAlert 
          v-if="error && step === 2" 
          color="red" 
          icon="i-lucide-alert-circle" 
          variant="soft"
          :title="error"
          class="mb-6 animate-in fade-in slide-in-from-top-2 duration-300"
        />
        
        <div class="flex gap-4 justify-center max-w-md mx-auto">
          <UButton @click="prevStep" variant="outline" size="xl">Précédent</UButton>
          <UButton @click="requestOTP" :disabled="!consent || requestingOTP" :loading="requestingOTP" size="xl">
            Valider et continuer
          </UButton>
        </div>
      </div>

      <!-- Étape 4 : Vérification OTP -->
      <div v-if="step === 3" class="min-h-screen flex items-center justify-center p-4">
        <UCard class="w-full max-w-sm shadow-xl">
          <template #header>
            <div class="flex flex-col items-center gap-2">
              <div class="relative">
                <UIcon 
                  name="i-lucide-shield-check" 
                  class="w-10 h-10 text-primary transition-transform duration-300"
                  :class="{ 'animate-pulse': otpLoading }"
                />
              </div>
              <h1 class="text-2xl font-normal text-center">
                Code de vérification
              </h1>
              <p class="text-sm text-gray-600 text-center">
                Code envoyé à <span class="font-normal text-primary">{{ formData.email }}</span>
              </p>
            </div>
          </template>
          
          <form class="space-y-4" @submit.prevent="verifyOTPAndCreate">
            <!-- Champ OTP -->
            <div class="space-y-3">
              <UFormField name="otp" label="Code à 6 chiffres" required>
                <div class="flex justify-center">
                  <UPinInput 
                    id="otp"
                    v-model="otpCode" 
                    :length="6"
                    :disabled="otpLoading"
                    otp
                    size="xl"
                  />
                </div>
              </UFormField>
            </div>
            
            <!-- Bouton principal -->
            <UButton 
              type="submit" 
              block 
              size="xl"
              :loading="otpLoading"
              :disabled="otpCodeString.length !== 6"
              class="w-full"
            >
              Valider le code
            </UButton>
            
            <!-- Boutons secondaires OTP - Côte à côte -->
            <div class="flex items-center justify-between gap-4 mt-2">
              <!-- Bouton retour à gauche -->
              <UButton 
                variant="outline" 
                size="sm"
                type="button"
                :disabled="otpLoading"
                @click="prevStep"
                class="text-xs"
              >
                <UIcon name="i-lucide-arrow-left" class="w-4 h-4 mr-1.5" />
                Modifier l'email
              </UButton>
              
              <!-- Bouton renvoyer à droite -->
              <UButton 
                variant="ghost" 
                size="sm"
                type="button"
                :disabled="countdown > 0 || resending"
                :loading="resending"
                @click="resendOTP"
                class="text-xs"
              >
                <UIcon name="i-lucide-refresh-cw" class="w-4 h-4 mr-1.5" />
                {{ resending ? 'Envoi...' : countdown > 0 ? `Renvoyer (${formatCountdown})` : 'Renvoyer' }}
              </UButton>
            </div>
            
            <!-- Messages d'erreur -->
            <UAlert 
              v-if="error" 
              color="red" 
              icon="i-lucide-alert-circle" 
              variant="soft"
              :title="error"
              class="animate-in fade-in slide-in-from-top-2 duration-300"
            />
          </form>
        </UCard>
      </div>

    <!-- Drawer de création/édition de proche -->
    <RelativeDrawer
      v-if="step === 1"
      v-model:open="showRelativeDrawer"
      :relative="editingRelativeForDrawer"
      @saved="handleRelativeSaved"
    />

    <!-- Modal de confirmation de suppression Tailwind -->
    <div
      v-if="step === 1 && showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="showDeleteModal = false"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      
      <!-- Modal -->
      <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <!-- Header -->
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-lucide-alert-triangle" class="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 class="text-lg font-normal text-gray-900 dark:text-white">Supprimer ce proche ?</h3>
          </div>
        </div>

        <!-- Body -->
        <p class="text-gray-600 dark:text-gray-400">
          Êtes-vous sûr de vouloir supprimer
          <span class="font-normal text-gray-900 dark:text-white">{{ deletingRelative?.first_name }} {{ deletingRelative?.last_name }}</span> ?
          Cette action est irréversible.
        </p>

        <!-- Footer -->
        <div class="flex justify-end gap-3 pt-2">
          <button
            @click="showDeleteModal = false"
            :disabled="deletingRelativeLoading"
            class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <button
            @click="deleteRelative"
            :disabled="deletingRelativeLoading"
            class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <UIcon v-if="deletingRelativeLoading" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            Supprimer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { apiFetch } from '~/utils/api';

definePageMeta({
  layout: 'patient',
});

const toast = useAppToast();

const route = useRoute();
const router = useRouter();
const { createAppointment } = useAppointments();
const { verifyOTP: verifyOTPAuth, isAuthenticated, user } = useAuth();

const step = ref(0);
const selectedService = ref<string | null>(null);
const consent = ref(false);
const careCategoriesList = ref<Array<{ id: string; name: string; description?: string; type: string; icon?: string | null }>>([]);
const categoriesLoading = ref(true);
const formData = ref<any>({});

// Provider spécifique (quand on vient d'un profil public)
const providerId = computed(() => (route.query.provider_id as string) || null);
const providerType = computed(() => (route.query.provider_type as string) || null);
const providerName = ref<string | null>(null);
/** Délai min du lab (heures) pour griser les dates quand RDV depuis fiche publique */
const providerMinLeadTimeHours = ref<number | null>(null);
const providerAcceptSaturday = ref<boolean>(true);
const providerAcceptSunday = ref<boolean>(true);
const isProviderBooking = computed(() => !!providerId.value && !!providerType.value);
const requestingOTP = ref(false);
const otpLoading = ref(false);
const resending = ref(false);
const error = ref('');
const validationError = ref('');
const otpCode = ref([] as string[]);
const otpCodeString = computed(() => otpCode.value.join(''));
const userId = ref('');
const sessionId = ref('');
const countdown = ref(0);
const otpSent = ref(false); // Indique si un code OTP a déjà été envoyé
const categories = ref<Record<string, string>>({});

// Gestion des proches
const relatives = ref<any[]>([]);
const selectedRelative = ref<any>(null);
const showRelativesSelector = ref(false);
const showFullForm = ref(false);
const showRelativeDrawer = ref(false);
const showDeleteModal = ref(false);
const editingRelativeForDrawer = ref<any>(null);
const deletingRelative = ref<any>(null);
const deletingRelativeLoading = ref(false);

// Informations pré-remplies
const prefilledInfo = computed(() => {
  if (selectedRelative.value && selectedRelative.value !== null) {
    // Informations du proche
    const relative = relatives.value.find(r => r.id === selectedRelative.value);
    return {
      first_name: relative?.first_name || '',
      last_name: relative?.last_name || '',
      email: relative?.email || user.value?.email || '',
      phone: relative?.phone || user.value?.phone || '',
      birth_date: relative?.birth_date || '',
      address: relative?.address || user.value?.address || '',
    };
  } else if (selectedRelative.value === null) {
    // Informations de l'utilisateur connecté
    return {
      first_name: user.value?.first_name || '',
      last_name: user.value?.last_name || '',
      email: user.value?.email || '',
      phone: user.value?.phone || '',
      birth_date: user.value?.birth_date || '',
      address: user.value?.address || '',
    };
  }
  return {};
});

// Options pour le select des proches
const relativesOptions = computed(() => {
  return relatives.value.map(relative => ({
    label: `${relative.first_name} ${relative.last_name}${relative.relationship_type ? ` (${getRelationshipLabel(relative.relationship_type)})` : ''}`,
    value: relative.id
  }));
});

// Vérifier si des documents sont présents
const hasDocuments = computed(() => {
  if (!formData.value) return false;
  
  // Vérifier dans formData.files (fichiers réels)
  const hasRealFiles = formData.value.files && 
    Object.keys(formData.value.files).some(key => formData.value.files[key] !== null);
  
  // Vérifier dans formData.form_data.files (métadonnées)
  const hasMetadataFiles = formData.value.form_data?.files && 
    Object.keys(formData.value.form_data.files).length > 0;
  
  return hasRealFiles || hasMetadataFiles;
});

const serviceItems = [
  { label: 'Prise de sang', value: 'blood_test', icon: 'i-lucide-droplet', description: 'Prélèvements sanguins à domicile' },
  { label: 'Soins infirmiers', value: 'nursing', icon: 'i-lucide-heart-pulse', description: 'Soins à domicile par des professionnels' },
];

function categoryIcon(cat: { icon?: string | null; type: string }): string {
  const raw = cat.icon && String(cat.icon).trim();
  if (raw) {
    if (raw.startsWith('medical-icon:')) return 'i-medical-icon-' + raw.slice('medical-icon:'.length);
    if (raw.startsWith('healthicons:')) return 'i-healthicons-' + raw.slice('healthicons:'.length);
    if (raw.startsWith('covid:')) return 'i-covid-' + raw.slice('covid:'.length);
    const name = raw.replace(/^i-lucide-/, '').replace(/^lucide:/, '').replace(/\s+/g, '-').toLowerCase();
    if (name) return `i-lucide-${name}`;
  }
  return cat.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-heart-pulse';
}

function selectCategory(cat: { id: string; type: string }) {
  selectedService.value = cat.type;
  formData.value = { ...formData.value, category_id: cat.id };
  nextStep();
}

function selectFallbackService(value: string) {
  selectedService.value = value;
  formData.value = { ...formData.value };
  nextStep();
}

async function loadCareCategories() {
  categoriesLoading.value = true;
  careCategoriesList.value = [];
  try {
    if (isProviderBooking.value) {
      // Charger les catégories spécifiques au provider depuis son profil public
      await loadProviderCategories();
    } else {
      const response = await apiFetch('/categories', { method: 'GET' });
      if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        careCategoriesList.value = response.data;
      }
    }
  } catch (e) {
    console.error('Erreur chargement catégories:', e);
  } finally {
    categoriesLoading.value = false;
  }
}

async function loadProviderCategories() {
  if (!providerId.value || !providerType.value) return;
  try {
    const response = await apiFetch(`/categories?provider_id=${providerId.value}`, { method: 'GET' });
    if (response.success && response.data?.length > 0) {
      careCategoriesList.value = response.data;
    }
  } catch (e) {
    console.error('Erreur chargement catégories provider:', e);
  }
}

async function loadProviderName() {
  if (!providerId.value) return;
  try {
    const response = await apiFetch(`/public/provider-name?id=${providerId.value}`, { method: 'GET' });
    if (response.success && response.data?.name) {
      providerName.value = response.data.name;
    }
    if (response.success && response.data && typeof response.data.min_booking_lead_time_hours === 'number') {
      providerMinLeadTimeHours.value = response.data.min_booking_lead_time_hours;
    } else {
      providerMinLeadTimeHours.value = null;
    }
  } catch {
    providerName.value = null;
    providerMinLeadTimeHours.value = null;
  }
}

const labFormRef = ref<any>(null);
const nursingFormRef = ref<any>(null);

const handleFormSubmit = (data: any) => {
  formData.value = data;
};

// Valider les champs obligatoires avant de passer à l'étape suivante
const validateAndNextStep = async () => {
  validationError.value = '';
  
  // Liste des champs obligatoires communs
  const requiredFields: Record<string, string> = {
    last_name: 'Le nom est obligatoire',
    first_name: 'Le prénom est obligatoire',
    email: 'L\'email est obligatoire',
    phone: 'Le téléphone est obligatoire',
    gender: 'Le genre est obligatoire',
    birth_date: 'La date de naissance est obligatoire',
    category_id: 'Le type de soin/analyse est obligatoire',
    address: 'L\'adresse est obligatoire',
    scheduled_at: 'La date souhaitée est obligatoire',
  };
  
  // Champs spécifiques selon le type de service
  if (selectedService.value === 'nursing') {
    requiredFields.duration_days = 'La durée des soins est obligatoire';
  }
  
  // Vérifier chaque champ obligatoire
  const missingFields: string[] = [];
  
  for (const [field, message] of Object.entries(requiredFields)) {
    const value = formData.value[field];
    
    if (!value || (typeof value === 'string' && value.trim() === '') || 
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && value !== null && Object.keys(value).length === 0)) {
      missingFields.push(message);
    }
  }
  
  // Vérifier spécifiquement l'adresse (doit avoir label, lat, lng)
  if (formData.value.address) {
    if (!formData.value.address.label || !formData.value.address.lat || !formData.value.address.lng) {
      missingFields.push('L\'adresse est incomplète. Veuillez sélectionner une adresse valide.');
    }
  }
  
  // Vérifier la disponibilité (availability) - c'est une chaîne JSON
  let availabilityValid = false;
  if (formData.value.availability) {
    if (typeof formData.value.availability === 'string' && formData.value.availability.trim() !== '') {
      try {
        const availabilityData = JSON.parse(formData.value.availability);
        // Vérifier que le JSON contient bien les données nécessaires
        if (availabilityData && (availabilityData.type === 'custom' || availabilityData.type === 'all_day')) {
          if (availabilityData.type === 'custom') {
            // Pour custom, vérifier qu'il y a bien un range valide
            if (availabilityData.range && Array.isArray(availabilityData.range) && availabilityData.range.length === 2) {
              availabilityValid = true;
            }
          } else {
            // Pour all_day, c'est valide
            availabilityValid = true;
          }
        }
      } catch (e) {
        // JSON invalide
        availabilityValid = false;
      }
    }
  }
  
  if (!availabilityValid) {
    missingFields.push('Les créneaux de disponibilité sont obligatoires');
  }
  
  if (missingFields.length > 0) {
    // Afficher les erreurs avec UAlert - chaque élément sur une nouvelle ligne
    validationError.value = missingFields.length === 1 
      ? missingFields[0]
      : missingFields.map((msg, idx) => `${idx + 1}. ${msg}`).join('\n');
    
    // Faire défiler vers le haut de la page en tenant compte du header fixe
    if (typeof window !== 'undefined') {
      // Attendre que le DOM soit mis à jour
      await nextTick();
      
      // Scroller vers l'alerte avec un offset pour le header (environ 80px)
      setTimeout(() => {
        const alertElement = document.getElementById('form-error-alert');
        if (alertElement) {
          const headerHeight = 80; // Hauteur approximative du header sticky
          const elementPosition = alertElement.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - headerHeight;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        } else {
          // Fallback : scroller vers le haut avec offset
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
    
    return;
  }
  
  // Si tout est valide, passer à l'étape suivante
  nextStep();
};

const nextStep = () => {
  if (step.value < 3) {
    step.value++;
    // Réinitialiser les erreurs quand on change d'étape
    error.value = '';
    validationError.value = '';
  }
};

const prevStep = () => {
  if (step.value > 0) {
    step.value--;
    error.value = '';
    validationError.value = '';
    if (step.value === 0) {
      selectedService.value = null;
      formData.value = { ...formData.value, category_id: '' };
    }
  }
};

// Formater le compteur (MM:SS)
const formatCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60);
  const seconds = countdown.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Démarrer le compteur
function startCountdown(seconds: number = 300) {
  countdown.value = seconds;
  const interval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(interval);
    }
  }, 1000);
}

// Formater les dates
const formatDate = (date: string) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return date;
  }
};

const formatGender = (gender: string) => {
  const genders: Record<string, string> = {
    'male': 'Homme',
    'female': 'Femme',
    'other': 'Autre'
  };
  return genders[gender] || gender;
};

const formatDuration = (duration: string) => {
  const durations: Record<string, string> = {
    '1': '1 jour',
    '7': '7 jours',
    '10': '10 jours',
    '15': '15 jours (ou jusqu\'à la cicatrisation)',
    '30': '30 jours',
    '60+': 'Longue durée (60 jours ou +)'
  };
  return durations[duration] || duration;
};

const formatFrequency = (frequency: string) => {
  const frequencies: Record<string, string> = {
    'daily': 'Chaque jour',
    'every_other_day': '1 jour sur 2',
    'twice_weekly': '2 fois par semaine',
    'thrice_weekly': '3 fois par semaine'
  };
  return frequencies[frequency] || frequency;
};

const formatAvailability = (availability: string) => {
  try {
    const avail = JSON.parse(availability);
    if (avail.type === 'all_day') {
      return 'Disponible toute la journée';
    } else if (avail.type === 'custom' && avail.range) {
      return `${avail.range[0]}h - ${avail.range[1]}h`;
    }
  } catch {
    return availability;
  }
  return availability;
};

const formatDocumentName = (key: string) => {
  const names: Record<string, string> = {
    'carte_vitale': 'Carte Vitale',
    'carte_mutuelle': 'Carte Mutuelle',
    'ordonnance': 'Ordonnance médicale',
    'autres_assurances': 'Autres Assurances'
  };
  return names[key] || key;
};

const getFileName = (file: any): string => {
  if (!file) return 'Fichier téléchargé';
  
  // Si c'est un objet File
  if (file instanceof File) {
    return file.name || 'Fichier téléchargé';
  }
  
  // Si c'est un objet avec file_name (document du profil)
  if (file.file_name) {
    return file.file_name;
  }
  
  // Si c'est un objet avec name
  if (file.name) {
    return file.name;
  }
  
  return 'Fichier téléchargé';
};

const getCategoryName = (categoryId: string | number) => {
  if (!categoryId) return '-';
  return categories.value[String(categoryId)] || `Catégorie ${categoryId}`;
};

// Charger les catégories
const loadCategories = async () => {
  if (!selectedService.value) return;
  
  try {
    const response = await apiFetch(`/categories?type=${selectedService.value}`, {
      method: 'GET',
    });
    
    if (response.success && response.data && response.data.length > 0) {
      const categoriesMap: Record<string, string> = {};
      response.data.forEach((cat: any) => {
        categoriesMap[cat.id] = cat.name;
      });
      categories.value = categoriesMap;
    }
  } catch (error) {
    console.error('Erreur lors du chargement des catégories:', error);
  }
};

// Charger les catégories quand le service change ou au montage
watch(selectedService, () => {
  if (selectedService.value) {
    loadCategories();
  }
}, { immediate: true });

// Demander l'OTP
const requestOTP = async () => {
  // Si l'utilisateur est déjà connecté, créer directement le rendez-vous sans OTP
  if (isAuthenticated.value && user.value) {
    await createAppointmentDirectly();
    return;
  }

  if (!formData.value.email) {
    error.value = 'Email requis';
    return;
  }

  // Si on est déjà à l'étape OTP et qu'on a déjà un userId, ne pas redemander un code
  // L'utilisateur peut utiliser le bouton "Renvoyer" s'il veut un nouveau code
  if (step.value === 3 && userId.value) {
    // Si l'utilisateur clique à nouveau, juste passer à l'étape OTP sans redemander
    return;
  }

  requestingOTP.value = true;
  error.value = '';

  try {
    const response = await apiFetch('/auth/guest-to-user', {
      method: 'POST',
      body: {
        email: formData.value.email.trim(),
        first_name: formData.value.first_name || '',
        last_name: formData.value.last_name || '',
        phone: formData.value.phone || null,
      },
    });

    if (response.success && response.user_id) {
      userId.value = response.user_id;
      sessionId.value = response.session_id || '';
      otpCode.value = [];
      step.value = 3; // Passer à l'étape OTP
      startCountdown(); // Démarrer le compteur
      error.value = ''; // Réinitialiser l'erreur en cas de succès
      otpSent.value = true; // Marquer qu'un code a été envoyé
    } else {
      error.value = response.error || 'Erreur lors de l\'envoi du code';
    }
  } catch (err: any) {
    console.error('Erreur requestOTP:', err);
    // Message d'erreur plus explicite
    if (err.message && err.message.includes('Impossible de se connecter')) {
      error.value = 'Le serveur backend n\'est pas accessible. Veuillez vérifier qu\'il est démarré.';
    } else {
      error.value = err.message || 'Erreur lors de l\'envoi du code. Veuillez réessayer.';
    }
  } finally {
    requestingOTP.value = false;
  }
};

// Créer le rendez-vous directement si l'utilisateur est connecté
const createAppointmentDirectly = async () => {
  otpLoading.value = true;
  error.value = '';

  try {
    const appointmentPayload: any = {
      type: selectedService.value,
      form_type: selectedService.value,
      patient_id: user.value?.id,
      ...formData.value,
    };
    // Assigner directement au provider si on vient d'un profil public
    if (isProviderBooking.value && providerId.value) {
      if (providerType.value === 'nurse') {
        appointmentPayload.assigned_nurse_id = providerId.value;
      } else if (providerType.value === 'lab') {
        appointmentPayload.assigned_lab_id = providerId.value;
      }
    }
    const result = await createAppointment(appointmentPayload);

    if (result.success) {
      router.push('/patient');
    } else {
      error.value = result.error || 'Erreur lors de la création du rendez-vous';
    }
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la création du rendez-vous';
  } finally {
    otpLoading.value = false;
  }
};

// Renvoyer l'OTP
const resendOTP = async () => {
  if (countdown.value > 0 || resending.value) return;
  
  resending.value = true;
  error.value = '';
  
  try {
    await requestOTP();
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de l\'envoi du code';
  } finally {
    resending.value = false;
  }
};

// Vérifier l'OTP et créer le RDV
const verifyOTPAndCreate = async () => {
  const cleanedOTP = otpCodeString.value.replace(/[^0-9]/g, '').trim();
  
  if (cleanedOTP.length !== 6) {
    error.value = 'Veuillez entrer les 6 chiffres du code';
    return;
  }
  
  // Vérifier que l'OTP ne contient que des chiffres
  if (!/^\d{6}$/.test(cleanedOTP)) {
    error.value = 'Le code doit contenir exactement 6 chiffres';
    return;
  }
  
  otpLoading.value = true;
  error.value = '';
  
  try {
    // Vérifier l'OTP
    const otpResult = await verifyOTPAuth(userId.value, cleanedOTP, sessionId.value);
    
    if (!otpResult.success) {
      error.value = otpResult.error || 'Code invalide';
      otpCode.value = [];
      return;
    }

    // Attendre un peu pour que le token soit bien stocké et synchronisé
    await new Promise(resolve => setTimeout(resolve, 200));

    // Vérifier que l'utilisateur est maintenant authentifié
    // Vérifier à la fois le state et localStorage pour être sûr
    let isAuth = isAuthenticated.value;
    if (!isAuth && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      isAuth = !!storedToken;
    }

    if (!isAuth) {
      error.value = 'Erreur lors de l\'authentification. Veuillez réessayer.';
      otpCode.value = [];
      return;
    }

    // S'assurer que les infos utilisateur sont à jour
    // Le patient_id peut venir de user.value (après fetchCurrentUser) ou de userId.value
    const patientId = user.value?.id || otpResult.user?.id || userId.value;

    // Créer le rendez-vous avec le patient_id de l'utilisateur authentifié
    const otpPayload: any = {
      type: selectedService.value,
      form_type: selectedService.value,
      patient_id: patientId,
      ...formData.value,
    };
    // Assigner directement au provider si on vient d'un profil public
    if (isProviderBooking.value && providerId.value) {
      if (providerType.value === 'nurse') {
        otpPayload.assigned_nurse_id = providerId.value;
      } else if (providerType.value === 'lab') {
        otpPayload.assigned_lab_id = providerId.value;
      }
    }
    const result = await createAppointment(otpPayload);

    if (result.success) {
      router.push('/patient');
    } else {
      error.value = result.error || 'Erreur lors de la création du rendez-vous';
    }
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la vérification';
    otpCode.value = [];
  } finally {
    otpLoading.value = false;
  }
};

// Sauvegarder l'état du formulaire avant de quitter la page
const saveFormState = () => {
  if (typeof window !== 'undefined' && (step.value > 0 || Object.keys(formData.value).length > 0)) {
    try {
      const state = {
        step: step.value,
        selectedService: selectedService.value,
        formData: formData.value,
      };
      sessionStorage.setItem('appointment_booking_state', JSON.stringify(state));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde de l\'état:', e);
    }
  }
};

// Sauvegarder l'état avant de quitter la page vers login (si non connecté)
onBeforeRouteLeave((to, from, next) => {
  if (!isAuthenticated.value && to.path === '/login') {
    saveFormState();
  }
  next();
});

// Charger les proches (403 = endpoint réservé à certains rôles : on garde une liste vide)
const fetchRelatives = async () => {
  if (!isAuthenticated.value) return;
  
  try {
    const response = await apiFetch('/patient-relatives', {
      method: 'GET',
    });
    
    if (response.success && response.data) {
      relatives.value = response.data;
    }
  } catch (error: any) {
    const msg = error?.message?.toLowerCase() ?? '';
    if (msg.includes('refusé') || msg.includes('403') || msg.includes('forbidden')) {
      relatives.value = [];
      return;
    }
    console.error('Erreur lors du chargement des proches:', error);
  }
};

// Sélectionner "Pour moi-même"
const selectForMyself = () => {
  selectedRelative.value = null;
  showRelativesSelector.value = false;
  showFullForm.value = false;
  
  // Pré-remplir avec les données de l'utilisateur
  if (user.value) {
    formData.value = {
      ...formData.value,
      first_name: user.value.first_name || '',
      last_name: user.value.last_name || '',
      email: user.value.email || '',
      phone: user.value.phone || '',
      birth_date: user.value.birth_date || '',
      gender: user.value.gender || '',
      address: user.value.address || null,
    };
  }
};

// Charger les données d'un proche
const loadRelativeData = (relativeId: string) => {
  const relative = relatives.value.find(r => r.id === relativeId);
  if (relative) {
    showFullForm.value = false;
    formData.value = {
      ...formData.value,
      first_name: relative.first_name || '',
      last_name: relative.last_name || '',
      email: relative.email || user.value?.email || '',
      phone: relative.phone || user.value?.phone || '',
      birth_date: relative.birth_date || '',
      gender: relative.gender || '',
      address: relative.address || user.value?.address || null,
    };
  }
};

// Ouvrir le drawer d'ajout
const openAddRelativeModal = () => {
  editingRelativeForDrawer.value = null;
  showRelativeDrawer.value = true;
};

// Ouvrir le drawer d'édition
const openEditRelativeModal = (relative: any) => {
  editingRelativeForDrawer.value = relative;
  showRelativeDrawer.value = true;
};

// Callback après sauvegarde
const handleRelativeSaved = async () => {
  await fetchRelatives();
};

// Confirmer la suppression
const confirmDeleteRelative = (relative: any) => {
  deletingRelative.value = relative;
  showDeleteModal.value = true;
};

// Supprimer un proche
const deleteRelative = async () => {
  if (!deletingRelative.value) return;
  
  deletingRelativeLoading.value = true;
  
  try {
    const response = await apiFetch(`/patient-relatives/${deletingRelative.value.id}`, {
      method: 'DELETE',
    });
    
    if (response.success) {
      toast.add({
        title: 'Succès',
        description: 'Proche supprimé',
        color: 'success',
      });
      
      // Si c'était le proche sélectionné, réinitialiser
      if (selectedRelative.value === deletingRelative.value.id) {
        selectedRelative.value = null;
        selectForMyself();
      }
      
      await fetchRelatives();
      showDeleteModal.value = false;
      deletingRelative.value = null;
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Impossible de supprimer ce proche',
        color: 'error',
      });
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Impossible de supprimer ce proche',
      color: 'error',
    });
  } finally {
    deletingRelativeLoading.value = false;
  }
};

// Label de type de relation
const getRelationshipLabel = (type: string) => {
  const labels: Record<string, string> = {
    child: 'Enfant',
    parent: 'Parent',
    spouse: 'Conjoint(e)',
    sibling: 'Frère/Sœur',
    grandparent: 'Grand-parent',
    grandchild: 'Petit-enfant',
    other: 'Autre',
  };
  return labels[type] || type;
};

// Couleur du badge de relation
const getRelationshipColor = (type: string) => {
  const colors: Record<string, string> = {
    child: 'info',
    parent: 'success',
    spouse: 'primary',
    sibling: 'warning',
    grandparent: 'secondary',
    grandchild: 'error',
    other: 'neutral',
  };
  return colors[type] || 'neutral';
};

// Icône de relation
const getRelationshipIcon = (type: string) => {
  const icons: Record<string, string> = {
    child: 'i-lucide-baby',
    parent: 'i-lucide-users',
    spouse: 'i-lucide-heart',
    sibling: 'i-lucide-user',
    grandparent: 'i-lucide-user-round',
    grandchild: 'i-lucide-baby',
    other: 'i-lucide-user',
  };
  return icons[type] || 'i-lucide-user';
};

// Description de relation
const getRelationshipDescription = (type: string, gender?: string) => {
  const descriptions: Record<string, Record<string, string>> = {
    child: {
      male: 'Votre fils',
      female: 'Votre fille',
      other: 'Votre enfant',
    },
    parent: {
      male: 'Votre père',
      female: 'Votre mère',
      other: 'Votre parent',
    },
    spouse: {
      male: 'Votre conjoint',
      female: 'Votre conjointe',
      other: 'Votre conjoint(e)',
    },
    sibling: {
      male: 'Votre frère',
      female: 'Votre sœur',
      other: 'Votre frère/sœur',
    },
    grandparent: {
      male: 'Votre grand-père',
      female: 'Votre grand-mère',
      other: 'Votre grand-parent',
    },
    grandchild: {
      male: 'Votre petit-fils',
      female: 'Votre petite-fille',
      other: 'Votre petit-enfant',
    },
    other: {
      male: 'Proche',
      female: 'Proche',
      other: 'Proche',
    },
  };
  
  const typeDescriptions = descriptions[type] || descriptions.other;
  return typeDescriptions[gender || 'other'] || typeDescriptions.other;
};

// Formater la date de naissance
const formatBirthDate = (dateStr: string) => {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

// Charger les catégories (liste pour l’étape 0) et appliquer les query params
onMounted(async () => {
  if (isProviderBooking.value) {
    loadProviderName();
  }
  await loadCareCategories();

  const typeFromUrl = route.query.type as string | undefined;
  const categoryFromUrl = route.query.category as string | undefined;

  if (typeFromUrl === 'blood_test' || typeFromUrl === 'nursing') {
    selectedService.value = typeFromUrl;
    if (categoryFromUrl) {
      formData.value = { ...formData.value, category_id: categoryFromUrl };
    }
    if (categoryFromUrl || careCategoriesList.value.length === 0) {
      step.value = 1;
    }
  }

  if (selectedService.value) {
    loadCategories();
  }

  if (typeof window !== 'undefined') {
    const savedState = sessionStorage.getItem('appointment_booking_state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.step !== undefined) step.value = state.step;
        if (state.selectedService) selectedService.value = state.selectedService;
        if (state.formData) formData.value = state.formData;
        sessionStorage.removeItem('appointment_booking_state');
      } catch (e) {
        console.error('Erreur lors de la restauration de l\'état:', e);
      }
    }
  }

  if (isAuthenticated.value) {
    fetchRelatives();
    selectForMyself();
  }
});

// Nettoyer le compteur à la destruction
onUnmounted(() => {
  countdown.value = 0;
});
</script>
