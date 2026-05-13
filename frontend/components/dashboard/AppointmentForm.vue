<template>
  <div class="min-h-full bg-app-canvas/50 dark:bg-gray-950 pb-20">
    <!-- Header séparateur collé en haut sans marge (comme admin/users) -->
    <div class="-mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div class="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <UButton
            :to="appointmentsBasePath"
            variant="ghost"
            color="gray"
            size="sm"
            icon="i-lucide-arrow-left"
            :aria-label="isCreate ? 'Retour' : 'Retour à la liste'"
          />
          <div class="min-w-0">
            <h1 class="text-lg sm:text-xl font-normal text-gray-900 dark:text-white truncate flex items-center gap-2">
              {{ isCreate ? 'Nouveau rendez-vous' : 'Édition du rendez-vous' }}
              <UBadge v-if="!isCreate && appointment" :color="getStatusColor(form.status)" variant="subtle" size="xs" class="flex-shrink-0">
                {{ getStatusLabel(form.status) }}
              </UBadge>
            </h1>
            <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block truncate">
              <template v-if="isCreate">Configurez le patient et les détails de l'intervention.</template>
              <template v-else-if="appointment">Réf. <span class="font-mono">{{ appointment.id?.substring(0, 8).toUpperCase() }}</span></template>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <UButton v-if="isEdit && appointmentId" :to="`${appointmentsBasePath}/${appointmentId}`" variant="ghost" color="gray" size="sm">
            Voir détail
          </UButton>
          <UButton type="button" variant="ghost" color="gray" :to="appointmentsBasePath" class="hidden sm:inline-flex">Annuler</UButton>
          <UButton v-if="!postCreateAppointmentId" type="submit" color="primary" :loading="saving" icon="i-lucide-check" size="sm" :on-click="submit">
            {{ isCreate ? 'Créer' : 'Enregistrer' }}
          </UButton>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      
      <div v-if="isEdit && loading" class="flex flex-col items-center justify-center py-24 space-y-4">
        <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary-500" />
        <p class="text-sm text-gray-500">Chargement des données...</p>
      </div>

      <div v-else-if="isEdit && !loading && !appointment" class="flex flex-col items-center justify-center py-24 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div class="p-4 rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
          <UIcon name="i-lucide-alert-circle" class="w-8 h-8 text-red-500" />
        </div>
        <h3 class="text-lg font-normal text-gray-900 dark:text-white">Rendez-vous introuvable</h3>
        <p class="text-gray-500 mb-6">Ce rendez-vous n'existe pas ou a été supprimé.</p>
        <UButton :to="appointmentsBasePath" color="gray" variant="solid">Retour à la liste</UButton>
      </div>

      <!-- Après création : section ordonnance (pro uniquement) - télécharger, régénérer, enregistrer -->
      <div v-else-if="postCreateAppointmentId && showPrescriptionAfterCreate" class="space-y-6 max-w-2xl">
        <div class="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <UIcon name="i-lucide-check-circle" class="w-8 h-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div>
            <p class="font-medium text-emerald-800 dark:text-emerald-200">Rendez-vous créé avec succès</p>
            <p class="text-sm text-emerald-600 dark:text-emerald-300">Modifiez le texte si besoin, régénérez le PDF ou téléchargez l'ordonnance déjà enregistrée.</p>
          </div>
        </div>
        <DashboardPrescriptionSection
          :appointment="{ id: postCreateAppointmentId }"
          :documents="postCreateDocuments"
          :load-documents="loadPostCreateDocuments"
          :initial-prescription-text="prescriptionTextDuringCreate"
        />
        <div class="flex gap-3">
          <UButton :to="`${appointmentsBasePath}/${postCreateAppointmentId}`" color="primary" leading-icon="i-lucide-eye">
            Voir le détail du RDV
          </UButton>
          <UButton :to="appointmentsBasePath" variant="outline" color="neutral">
            Retour à la liste
          </UButton>
        </div>
      </div>

      <form v-else-if="isCreate || (isEdit && appointment)" @submit.prevent="submit" class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div class="lg:col-span-7 space-y-6">
          
          <section
            v-if="isCreate"
            id="appointment-form-section-patient-search"
            class="scroll-mt-28 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
          >
            <h2 class="text-lg font-normal text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UIcon name="i-lucide-search" class="w-5 h-5 text-primary-500 shrink-0" />
              Recherche Patient
            </h2>
            
            <UFormField label="Rechercher un patient" name="patient_id" help="Sélectionnez un patient existant ou choisissez 'Nouveau patient' pour une saisie manuelle.">
              <USelectMenu
                v-model="selectedPatientId"
                :items="patientSelectItems"
                value-key="value"
                placeholder="Tapez un nom, un email..."
                size="lg"
                class="w-full"
                :loading="patientsLoading"
                :search-input="{ placeholder: patientSelectSearchPlaceholder }"
                :filter-fields="['label', 'searchText']"
                icon="i-lucide-user"
              >
                <template #label>
                  <span v-if="selectedPatientId === NEW_PATIENT_VALUE" class="text-primary-600 font-medium">✨ Nouveau patient</span>
                  <span v-else>{{ patientSelectItems.find(i => i.value === selectedPatientId)?.label }}</span>
                </template>
                <template #item-label="{ item }">
                  <div class="min-w-0 flex-1 py-0.5 text-left">
                    <p class="truncate font-medium text-gray-900 dark:text-white">{{ item.label }}</p>
                    <p v-if="item.metaLine" class="truncate text-xs text-gray-500 dark:text-gray-400">
                      {{ item.metaLine }}
                    </p>
                  </div>
                </template>
                <template #empty="{ searchTerm }">
                  <PatientSelectMenuEmpty :search-term="searchTerm" />
                </template>
              </USelectMenu>
            </UFormField>
          </section>

          <section
            id="appointment-form-section-identity"
            class="scroll-mt-28 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
          >
            <h2 class="text-lg font-normal text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UIcon name="i-lucide-user-circle" class="w-5 h-5 text-primary-500 shrink-0" />
              Identité du patient
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <UFormField label="Nom" name="last_name" required>
                <UInput v-model="form.form_data.last_name" placeholder="Nom de famille" size="md" class="w-full" />
              </UFormField>
              <UFormField label="Prénom" name="first_name" required>
                <UInput v-model="form.form_data.first_name" placeholder="Prénom" size="md" class="w-full" />
              </UFormField>
              
              <UFormField label="Genre" name="gender" required>
                <USelect v-model="form.form_data.gender" :items="genderOptions" value-key="value" placeholder="Sélectionner" size="md" class="w-full" />
              </UFormField>
              
              <UFormField label="Date de naissance" name="birth_date" required>
                <div class="flex gap-2">
                  <USelect v-model="birthDay" :items="dayOptions" placeholder="J" size="md" class="flex-1 min-w-0" />
                  <USelect v-model="birthMonth" :items="monthOptions" placeholder="Mois" size="md" class="flex-1 min-w-0" />
                  <USelect v-model="birthYear" :items="yearOptions" placeholder="Année" size="md" class="flex-1 min-w-0" />
                </div>
              </UFormField>

              <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-gray-100 dark:border-gray-800">
                 <UFormField label="Email" name="email" :required="!isProForm">
                  <UInput v-model="form.form_data.email" type="email" icon="i-lucide-mail" placeholder="email@exemple.fr" size="md" class="w-full" />
                  <p v-if="isProForm" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Optionnel : si le patient n’a pas d’e-mail, les notifications peuvent utiliser votre adresse professionnelle.
                  </p>
                </UFormField>
                <UFormField label="Téléphone" name="phone" required>
                  <UInput v-model="form.form_data.phone" type="tel" icon="i-lucide-phone" placeholder="06 12 34 56 78" size="md" class="w-full" />
                </UFormField>
              </div>
            </div>
          </section>

          <section
            id="appointment-form-section-intervention"
            class="scroll-mt-28 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
          >
            <h2 class="text-lg font-normal text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UIcon name="i-lucide-clipboard-list" class="w-5 h-5 text-primary-500 shrink-0" />
              Nature de l'intervention
            </h2>

            <div v-if="isCreate && supportsMultiCareCreate" class="mb-4">
              <UCheckbox
                v-model="multiCareEnabled"
                label="Plusieurs soins (même patient, même date et créneau)"
                class="text-sm"
              />
            </div>

            <div v-if="!isLabForm && !isSubaccountForm" class="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 mb-4">
              <button
                v-for="type in serviceTypes"
                :key="type.value"
                type="button"
                class="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all"
                :class="form.type === type.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'"
                @click="setServiceType(type.value)"
              >
                <UIcon :name="type.icon" class="w-4 h-4 shrink-0" />
                {{ type.label }}
              </button>
            </div>

            <!-- Un seul soin (comportement historique) -->
            <div v-if="!supportsMultiCareCreate || !multiCareEnabled" class="space-y-4">
              <UFormField :label="form.type === 'blood_test' ? 'Type d\'analyse' : 'Type de soin'" name="category_id" required>
                <USelectMenu 
                  v-model="form.form_data.category_id" 
                  :items="categoryOptions" 
                  value-key="value" 
                  searchable
                  placeholder="Sélectionner dans la liste..." 
                  size="md" 
                  class="w-full min-w-0"
                  :filter-fields="['label']"
                >
                  <template #label>
                    <span v-if="!form.form_data.category_id || typeof form.form_data.category_id === 'object'">Sélectionner dans la liste...</span>
                    <span v-else>{{ categoryOptions.find(c => String(c.value) === String(form.form_data.category_id))?.label ?? 'Sélectionner dans la liste...' }}</span>
                  </template>
                </USelectMenu>
              </UFormField>

              <template v-if="form.type === 'blood_test'">
                <UFormField label="Prélèvement" name="blood_test_type">
                  <div class="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                    <button
                      v-for="opt in bloodTestTypeOptions"
                      :key="opt.value"
                      type="button"
                      class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all"
                      :class="form.form_data.blood_test_type === opt.value
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
                      @click="form.form_data.blood_test_type = opt.value"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                  <p v-if="form.form_data.blood_test_type === 'single'" class="text-xs text-gray-500 mt-1.5">Une seule fois</p>
                  <p v-else-if="form.form_data.blood_test_type === 'multiple'" class="text-xs text-gray-500 mt-1.5">Plusieurs prélèvements sur plusieurs jours</p>
                </UFormField>
                
                <UFormField 
                  v-if="form.form_data.blood_test_type === 'multiple'" 
                  label="Durée du protocole" 
                  name="duration_days"
                >
                  <USelect v-model="form.form_data.duration_days" :items="multipleDaysOptions" placeholder="Choisir une durée" class="w-full" />
                  <UInput 
                    v-if="form.form_data.duration_days === 'custom'" 
                    v-model.number="form.form_data.custom_days" 
                    type="number" 
                    placeholder="Nombre de jours précis" 
                    class="mt-2 w-full" 
                    icon="i-lucide-calendar-days"
                  />
                </UFormField>
              </template>

              <template v-if="form.type === 'nursing'">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <UFormField label="Prise en charge" name="duration_days">
                    <USelect v-model="form.form_data.duration_days" :items="nursingDurationOptions" placeholder="Sélectionner" class="w-full" />
                    <UInput
                      v-if="form.form_data.duration_days === 'custom'"
                      v-model.number="form.form_data.custom_days"
                      type="number"
                      placeholder="Nombre de jours"
                      class="mt-2 w-full"
                      min="1"
                    />
                  </UFormField>
                  <UFormField v-if="showNursingFreq(form.form_data.duration_days)" label="Fréquence de passage" name="frequency">
                    <USelect v-model="form.form_data.frequency" :items="frequencyOptions" placeholder="Sélectionner" class="w-full" />
                  </UFormField>
                </div>
                <UFormField
                  v-if="!isNurseForm"
                  label="Préférence pour l'infirmier"
                  name="preferred_nurse_gender"
                  class="mt-4"
                >
                  <URadioGroup
                    v-model="form.form_data.preferred_nurse_gender"
                    :items="preferredNurseGenderOptions"
                    size="md"
                    variant="list"
                  >
                    <template #label="{ item }">
                      <span class="inline-flex items-center gap-2">
                        <UIcon
                          :name="iconForPreferredNurseGenderPreference(item.value)"
                          class="size-4 shrink-0 text-gray-500 dark:text-gray-400"
                          aria-hidden="true"
                        />
                        <span>{{ item.label }}</span>
                      </span>
                    </template>
                  </URadioGroup>
                </UFormField>
              </template>

              <div v-if="categoryOptionsForCare.length" class="space-y-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <template v-for="opt in categoryOptionsForCare" :key="opt.option_key">
                  <UFormField v-if="opt.field_type === 'select'" :label="opt.label" :name="`care_${opt.option_key}`" :required="!!opt.is_required">
                    <USelect
                      v-model="form.form_data.care_options[opt.option_key]"
                      :items="(opt.options || []).map(o => ({ label: o.label, value: o.value }))"
                      value-key="value"
                      placeholder="Choisissez une option"
                      size="md"
                      class="w-full"
                      @update:model-value="(v: unknown) => clearAutreDetailUnlessSelected(form.form_data.care_options, opt.option_key, v)"
                    />
                  </UFormField>
                  <UFormField
                    v-if="opt.field_type === 'select' && categorySelectHasAutreOption(opt) && isAutreSelectValue(form.form_data.care_options[opt.option_key])"
                    label="Précisez"
                    :name="`care_${careAutreDetailKey(opt.option_key)}`"
                    required
                  >
                    <CareAutreDetailInput
                      v-model="form.form_data.care_options[careAutreDetailKey(opt.option_key)]"
                      :category-name="careCategoryNameSingleForm"
                      :category-type="form.type"
                      placeholder="Tapez ou choisissez une suggestion"
                      size="md"
                    />
                  </UFormField>
                  <UFormField v-else-if="opt.field_type === 'text'" :label="opt.label" :name="`care_${opt.option_key}`" :required="!!opt.is_required">
                    <CareAutreDetailInput
                      v-model="form.form_data.care_options[opt.option_key]"
                      :category-name="careCategoryNameSingleForm"
                      :category-type="form.type"
                      placeholder="Tapez ou choisissez une suggestion"
                      size="md"
                    />
                  </UFormField>
                  <UFormField v-else-if="opt.field_type === 'number'" :label="opt.label" :name="`care_${opt.option_key}`" :required="!!opt.is_required">
                    <UInput v-model.number="form.form_data.care_options[opt.option_key]" type="number" placeholder="" size="md" class="w-full" />
                  </UFormField>
                </template>
              </div>
            </div>

            <!-- Plusieurs soins : un bloc par catégorie / ligne métier -->
            <div v-else class="space-y-6">
              <div
                v-for="(block, idx) in careBlocks"
                :key="block.id"
                class="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30 p-4 space-y-4"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    Soin {{ idx + 1 }}
                  </p>
                  <UButton
                    v-if="careBlocks.length > 1"
                    type="button"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    @click="removeCareBlock(idx)"
                  >
                    Retirer
                  </UButton>
                </div>

                <UFormField :label="form.type === 'blood_test' ? 'Type d\'analyse' : 'Type de soin'" :name="`category_id_${block.id}`" required>
                  <USelectMenu
                    v-model="block.category_id"
                    :items="categoryOptions"
                    value-key="value"
                    searchable
                    placeholder="Sélectionner dans la liste..."
                    size="md"
                    class="w-full min-w-0"
                    :filter-fields="['label']"
                  >
                    <template #label>
                      <span v-if="!block.category_id">Sélectionner dans la liste...</span>
                      <span v-else>{{ categoryOptions.find(c => String(c.value) === String(block.category_id))?.label ?? 'Sélectionner dans la liste...' }}</span>
                    </template>
                  </USelectMenu>
                </UFormField>

                <template v-if="form.type === 'blood_test'">
                  <UFormField label="Prélèvement" :name="`blood_test_type_${block.id}`">
                    <div class="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                      <button
                        v-for="opt in bloodTestTypeOptions"
                        :key="opt.value"
                        type="button"
                        class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all"
                        :class="block.blood_test_type === opt.value
                          ? 'bg-primary-500 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
                        @click="block.blood_test_type = opt.value"
                      >
                        {{ opt.label }}
                      </button>
                    </div>
                  </UFormField>
                  <UFormField
                    v-if="block.blood_test_type === 'multiple'"
                    label="Durée du protocole"
                    :name="`duration_days_${block.id}`"
                  >
                    <USelect v-model="block.duration_days" :items="multipleDaysOptions" placeholder="Choisir une durée" class="w-full" />
                    <UInput
                      v-if="block.duration_days === 'custom'"
                      v-model.number="block.custom_days"
                      type="number"
                      placeholder="Nombre de jours précis"
                      class="mt-2 w-full"
                      icon="i-lucide-calendar-days"
                    />
                  </UFormField>
                </template>

                <template v-if="form.type === 'nursing'">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <UFormField label="Prise en charge" :name="`duration_days_${block.id}`">
                      <USelect v-model="block.duration_days" :items="nursingDurationOptions" placeholder="Sélectionner" class="w-full" />
                      <UInput
                        v-if="block.duration_days === 'custom'"
                        v-model.number="block.custom_days"
                        type="number"
                        placeholder="Nombre de jours"
                        class="mt-2 w-full"
                        min="1"
                      />
                    </UFormField>
                    <UFormField v-if="showNursingFreq(block.duration_days)" label="Fréquence de passage" :name="`frequency_${block.id}`">
                      <USelect v-model="block.frequency" :items="frequencyOptions" placeholder="Sélectionner" class="w-full" />
                    </UFormField>
                  </div>
                  <UFormField
                    v-if="!isNurseForm"
                    label="Préférence pour l'infirmier"
                    :name="`preferred_nurse_gender_${block.id}`"
                    class="mt-4"
                  >
                    <URadioGroup
                      v-model="block.preferred_nurse_gender"
                      :items="preferredNurseGenderOptions"
                      size="md"
                      variant="list"
                    >
                      <template #label="{ item }">
                        <span class="inline-flex items-center gap-2">
                          <UIcon
                            :name="iconForPreferredNurseGenderPreference(item.value)"
                            class="size-4 shrink-0 text-gray-500 dark:text-gray-400"
                            aria-hidden="true"
                          />
                          <span>{{ item.label }}</span>
                        </span>
                      </template>
                    </URadioGroup>
                  </UFormField>
                </template>

                <div v-if="getCareOptionsForBlock(block).length" class="space-y-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <template v-for="opt in getCareOptionsForBlock(block)" :key="block.id + opt.option_key">
                    <UFormField v-if="opt.field_type === 'select'" :label="opt.label" :name="`care_${block.id}_${opt.option_key}`" :required="!!opt.is_required">
                      <USelect
                        v-model="block.care_options[opt.option_key]"
                        :items="(opt.options || []).map(o => ({ label: o.label, value: o.value }))"
                        value-key="value"
                        placeholder="Choisissez une option"
                        size="md"
                        class="w-full"
                        @update:model-value="(v: unknown) => clearAutreDetailUnlessSelected(block.care_options, opt.option_key, v)"
                      />
                    </UFormField>
                    <UFormField
                      v-if="opt.field_type === 'select' && categorySelectHasAutreOption(opt) && isAutreSelectValue(block.care_options[opt.option_key])"
                      label="Précisez"
                      :name="`care_${block.id}_${careAutreDetailKey(opt.option_key)}`"
                      required
                    >
                      <CareAutreDetailInput
                        v-model="block.care_options[careAutreDetailKey(opt.option_key)]"
                        :category-name="careCategoryNameForBlock(block)"
                        :category-type="form.type"
                        placeholder="Tapez ou choisissez une suggestion"
                        size="md"
                      />
                    </UFormField>
                    <UFormField v-else-if="opt.field_type === 'text'" :label="opt.label" :name="`care_${block.id}_${opt.option_key}`" :required="!!opt.is_required">
                      <CareAutreDetailInput
                        v-model="block.care_options[opt.option_key]"
                        :category-name="careCategoryNameForBlock(block)"
                        :category-type="form.type"
                        placeholder="Tapez ou choisissez une suggestion"
                        size="md"
                      />
                    </UFormField>
                    <UFormField v-else-if="opt.field_type === 'number'" :label="opt.label" :name="`care_${block.id}_${opt.option_key}`" :required="!!opt.is_required">
                      <UInput v-model.number="block.care_options[opt.option_key]" type="number" placeholder="" size="md" class="w-full" />
                    </UFormField>
                  </template>
                </div>
              </div>

              <UButton
                type="button"
                class="w-full justify-center"
                variant="outline"
                color="primary"
                icon="i-lucide-plus"
                @click="addCareBlock"
              >
                Ajouter un soin
              </UButton>
            </div>
          </section>

          <!-- Ordonnance pendant la création (pro uniquement) - à gauche au-dessus des notes -->
          <section
            v-if="isCreate && showPrescriptionAfterCreate"
            class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
          >
            <h2 class="text-lg font-normal text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="w-5 h-5 text-primary-500 shrink-0" />
              Ordonnance (optionnel)
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-4 ml-7">
              Saisissez le contenu de l'ordonnance. Elle sera générée et enregistrée sur le RDV à la création.
            </p>
            <UFormField label="Prescription (médicaments, posologie, durée…)" name="prescription_during_create" class="ml-0">
              <UTextarea
                v-model="prescriptionTextDuringCreate"
                placeholder="Ex: Doliprane 1000 mg - 1 cp x 3/jour pendant 5 jours..."
                :rows="5"
                class="font-mono text-sm w-full"
              />
            </UFormField>
          </section>

          <!-- Ordonnance en édition (nurse / pro) - à gauche au-dessus des notes -->
          <section
            v-if="isEdit && showPrescriptionAfterCreate && appointment"
            class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
          >
            <DashboardPrescriptionSection
              :appointment="appointment"
              :documents="editModeDocuments"
              :load-documents="loadEditModeDocuments"
            />
          </section>

          <section
            id="appointment-form-section-notes"
            class="scroll-mt-28 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
          >
            <h2 class="text-lg font-normal text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="w-5 h-5 text-primary-500 shrink-0" />
              Notes & Instructions
            </h2>
            <UFormField label="Notes (Facultatif)" name="notes">
              <UTextarea 
                v-model="form.form_data.notes" 
                placeholder="Digicode, instructions spécifiques pour l'infirmier(e), contexte médical..." 
                :rows="3" 
                variant="outline" 
                class="w-full" 
              />
            </UFormField>
          </section>
        </div>

        <div class="lg:col-span-5 space-y-6">
          
          <section
            id="appointment-form-section-planning"
            class="scroll-mt-28 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
          >
            <h2 class="text-lg font-normal text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UIcon name="i-lucide-calendar-clock" class="w-5 h-5 text-primary-500 shrink-0" />
              Planification
            </h2>

            <div class="space-y-6">
              <UFormField v-if="isEdit" label="Statut du rendez-vous" name="status">
                <USelectMenu v-model="form.status" :items="statusOptions" value-key="value" size="md" class="w-full">
                   <template #label>
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full" :class="getStatusColorDot(form.status)"></span>
                      {{ getStatusLabel(form.status) }}
                    </div>
                  </template>
                </USelectMenu>
              </UFormField>

              <UFormField label="Date d'intervention" name="scheduled_at" required>
                <DatePicker 
                  v-model="form.scheduled_at" 
                  class="w-full"
                  :appointment-type="form.type === 'blood_test' ? 'lab' : 'nurse'"
                  :accept-saturday="true"
                  :accept-sunday="true"
                />
              </UFormField>

              <div class="pt-4 border-t border-gray-100 dark:border-gray-800">
                <div class="flex items-center justify-between mb-4">
                  <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Créneau horaire</label>
                  <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button 
                      type="button"
                      class="px-3 py-1 text-xs font-medium rounded-md transition-all"
                      :class="form.form_data.availability_type === 'custom' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'"
                      @click="form.form_data.availability_type = 'custom'"
                    >
                      Précis
                    </button>
                    <button 
                      type="button"
                      class="px-3 py-1 text-xs font-medium rounded-md transition-all"
                      :class="form.form_data.availability_type === 'all_day' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'"
                      @click="form.form_data.availability_type = 'all_day'"
                    >
                      Journée
                    </button>
                  </div>
                </div>

                <div v-if="form.form_data.availability_type === 'custom'" class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <div class="flex justify-between items-end mb-4">
                    <span class="text-xs uppercase tracking-wide text-gray-400 font-normal">Heure</span>
                    <span class="text-lg font-mono font-normal text-primary-600">
                      {{ formatTime(availabilityRange[0]) }} - {{ formatTime(availabilityRange[1]) }}
                    </span>
                  </div>
                  <USlider v-model="availabilityRange" :min="6" :max="availabilitySliderMax" :step="1" color="primary" />
                  <div class="flex justify-between text-[10px] text-gray-400 mt-2 font-mono">
                    <span>06:00</span>
                    <span>12:00</span>
                    <span v-if="availabilitySliderMax > 17">18:00</span>
                    <span>{{ String(availabilitySliderMax).padStart(2, '0') }}:00</span>
                  </div>
                  <p v-if="availabilityRange[1] - availabilityRange[0] < AVAILABILITY_MIN_SPAN_HOURS" class="text-xs text-orange-500 mt-2 flex items-center gap-1">
                    <UIcon name="i-lucide-alert-triangle" class="w-3 h-3" /> Minimum {{ AVAILABILITY_MIN_SPAN_HOURS }} h d'écart
                  </p>
                </div>

                <div v-else class="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 p-4 rounded-lg flex gap-3">
                  <UIcon name="i-lucide-sun" class="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p class="text-sm font-medium text-green-800 dark:text-green-300">Disponible toute la journée</p>
                    <p class="text-xs text-green-600 dark:text-green-400 mt-1">L'heure de passage exacte sera définie avec le praticien.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            v-if="form.type === 'blood_test' && !isSubaccountForm && showBloodTestLabAssignSection"
            id="appointment-form-section-assign-lab"
            class="scroll-mt-28 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
          >
            <h2 class="text-lg font-normal text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UIcon name="i-lucide-flask-conical" class="w-5 h-5 text-primary-500 shrink-0" />
              Assigner à
            </h2>
            <UFormField
              label="Laboratoire ou sous-compte"
              name="assigned_lab_id"
              :help="isLabForm ? 'Votre compte laboratoire ou un sous-compte qui réalisera le prélèvement.' : 'Optionnel : assignez ce RDV à un labo pour le prélèvement.'"
            >
              <USelectMenu
                v-model="form.assigned_lab_id"
                :items="labSelectItems"
                value-key="value"
                :placeholder="isLabForm ? 'Laboratoire ou sous-compte...' : 'Rechercher un laboratoire...'"
                size="md"
                class="w-full"
                :loading="labsLoading"
                :search-input="isLabForm ? { placeholder: 'Rechercher...' } : { placeholder: 'Nom, email...' }"
                :filter-fields="['label']"
              >
                <template #empty>
                  <div class="py-6 px-4">
                    <UEmpty
                      icon="i-lucide-building-2"
                      title="Aucun laboratoire trouvé"
                      description="Aucun laboratoire ne correspond à votre recherche. Laissez vide pour laisser le système assigner automatiquement."
                      variant="naked"
                      size="sm"
                    />
                  </div>
                </template>
              </USelectMenu>
            </UFormField>
          </section>

          <section
            v-else-if="form.type === 'nursing'"
            id="appointment-form-section-assign-nurse"
            class="scroll-mt-28 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
          >
            <h2 class="text-lg font-normal text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UIcon name="i-lucide-stethoscope" class="w-5 h-5 text-primary-500 shrink-0" />
              Assigner à un infirmier
            </h2>
            <UFormField label="Infirmier(ère)" name="assigned_nurse_id" help="Optionnel : assignez ce RDV à un infirmier pour les soins.">
              <USelectMenu
                v-model="form.assigned_nurse_id"
                :items="nurseSelectItems"
                value-key="value"
                placeholder="Rechercher un infirmier..."
                size="md"
                class="w-full"
                :loading="nursesLoading"
                :search-input="{ placeholder: 'Nom, email...' }"
                :filter-fields="['label']"
              >
                <template #empty>
                  <div class="py-6 px-4">
                    <UEmpty
                      icon="i-lucide-stethoscope"
                      title="Aucun infirmier trouvé"
                      description="Aucun infirmier ne correspond à votre recherche. Laissez vide pour laisser le système assigner automatiquement."
                      variant="naked"
                      size="sm"
                    />
                  </div>
                </template>
              </USelectMenu>
            </UFormField>
          </section>

          <section
            id="appointment-form-section-address"
            class="scroll-mt-28 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
          >
            <h2 class="text-lg font-normal text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-primary-500 shrink-0" />
              Lieu du RDV
            </h2>
             <div class="space-y-4">
               <AddressSelector
                v-model="form.address"
                label="Adresse complète"
                name="address"
                required
                :show-complement="true"
                :complement-value="form.form_data.address_complement"
                @update:complement="form.form_data.address_complement = $event"
              />
             </div>
          </section>

          <section
            id="appointment-form-section-documents"
            class="scroll-mt-28 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
          >
            <h2 class="text-lg font-normal text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <UIcon name="i-lucide-file-up" class="w-5 h-5 text-primary-500 shrink-0" />
              Documents requis
            </h2>
            <p class="text-xs text-gray-500 mb-4 ml-7">
              <span v-if="loadingPatientDocuments" class="inline-flex items-center gap-1.5">
                <UIcon name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
                Chargement des documents du patient…
              </span>
              <template v-else>Glissez les fichiers ou cliquez pour importer.</template>
            </p>
            
            <div class="space-y-3">
              <div 
                v-for="doc in documentTypes" 
                :key="doc.key" 
                class="group relative"
                @dragover.prevent="draggedOver = doc.key" 
                @dragleave.prevent="draggedOver = null" 
                @drop.prevent="handleDrop($event, doc.key)"
              >
                <input :ref="(el) => setFileInputRef(doc.key, el)" type="file" accept="image/*,.pdf" class="hidden" @change="handleFileSelect($event, doc.key)" />
                
                <div 
                  class="flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer"
                  :class="[
                    draggedOver === doc.key 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.02]' 
                      : hasDocumentForType(doc.key) 
                        ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-900/10' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  ]"
                  @click="triggerFileInput(doc.key)"
                >
                  <div 
                    class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                    :class="[
                       hasDocumentForType(doc.key) ? 'bg-green-100 text-green-600' : doc.iconBg + ' ' + doc.iconColor
                    ]"
                  >
                     <UIcon :name="doc.icon" class="w-5 h-5" />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ doc.label }}</p>
                    <p v-if="form.files[doc.key]" class="text-xs text-green-600 font-medium truncate">{{ form.files[doc.key].name }}</p>
                    <p v-else-if="isEdit && existingFileNames[doc.key]" class="text-xs text-green-600/80 truncate">Fichier existant</p>
                    <p v-else-if="patientDocuments[doc.key]" class="text-xs truncate" :class="uploadingDocumentType === doc.key ? 'text-gray-500' : 'text-green-600/80'" :title="patientDocuments[doc.key].file_name">
                      {{ uploadingDocumentType === doc.key ? 'Enregistrement…' : patientDocuments[doc.key].file_name }}
                    </p>
                    <p v-else class="text-xs text-gray-400 group-hover:text-primary-500 transition-colors">Ajouter un fichier</p>
                  </div>

                  <div v-if="patientDocuments[doc.key] && !form.files[doc.key]" class="flex items-center gap-1 shrink-0">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-download"
                      :loading="uploadingDocumentType === doc.key"
                      :disabled="!!uploadingDocumentType"
                      :on-click="(e) => { e?.stopPropagation?.(); downloadPatientDocument(patientDocuments[doc.key].medical_document_id, patientDocuments[doc.key].file_name); }"
                    >
                      Télécharger
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-file-up"
                      :loading="uploadingDocumentType === doc.key"
                      :disabled="!!uploadingDocumentType"
                      :on-click="(e) => { e?.stopPropagation?.(); triggerFileInput(doc.key); }"
                    >
                      Remplacer
                    </UButton>
                  </div>
                  <div v-else-if="form.files[doc.key]" class="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500" @click.stop="delete form.files[doc.key]">
                    <UIcon name="i-lucide-x" class="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div class="pt-2">
            <UButton
              block
              type="submit"
              color="primary"
              size="xl"
              :loading="saving"
              icon="i-lucide-check"
              class="w-full !py-4 text-base font-normal"
            >
              {{ isCreate ? 'Créer le rendez-vous' : 'Enregistrer les modifications' }}
            </UButton>
          </div>

        </div>

        <div class="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200 dark:border-gray-800 sm:hidden z-40 flex gap-3">
          <UButton block variant="soft" color="gray" :to="appointmentsBasePath" class="flex-1">Annuler</UButton>
          <UButton block type="submit" color="primary" size="lg" :loading="saving" class="flex-1">
             {{ isCreate ? 'Créer le rendez-vous' : 'Sauvegarder' }}
          </UButton>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';
import { fetchAllPatientsForDashboard } from '~/utils/fetch-all-patients';
import { PATIENT_SELECT_SEARCH_PLACEHOLDER, buildPatientSelectRow } from '~/utils/patient-select-menu';
import type { Address, Appointment } from '~/types/appointments';
import { MIN_BIRTH_YEAR } from '~/constants/birth-date';
import { NURSING_DURATION_OPTIONS, showNursingFrequency as showNursingFreq } from '~/constants/nursing-duration';
import {
  AVAILABILITY_MIN_SPAN_HOURS,
  AVAILABILITY_MAX_HOUR_BLOOD_TEST,
  AVAILABILITY_MAX_HOUR_NURSING,
} from '~/constants/availability-slot';
import { MAX_UPLOAD_BYTES } from '~/constants/upload-limits';
import { isBloodTestAppointment, isNursingAppointment, iconForPreferredNurseGenderPreference } from '~/utils/appointment-type-rules';
import {
  careAutreDetailKey,
  categorySelectHasAutreOption,
  isAutreSelectValue,
} from '~/utils/care-category-autre-detail';
import DashboardPrescriptionSection from '~/components/dashboard/PrescriptionSection.vue';

// --- TYPES & INTERFACES ---
type ServiceType = 'blood_test' | 'nursing';
type StatusType = 'pending' | 'confirmed' | 'inProgress' | 'completed' | 'canceled' | 'expired' | 'refused';

interface SelectOption { label: string; value: string | number }

/** Un « soin » en création multi-RDV (même patient, même planification). */
interface CareBlock {
  id: string;
  category_id: string;
  blood_test_type: 'single' | 'multiple';
  duration_days: string;
  custom_days: number | null;
  frequency: string;
  care_options: Record<string, string | number>;
  preferred_nurse_gender: 'any' | 'female' | 'male';
}

// --- PROPS ---
const props = withDefaults(
  defineProps<{
    mode: 'create' | 'edit';
    appointmentId?: string;
    /** Base path pour les liens Retour / Annuler (ex: /admin, /preleveur) */
    basePath?: string;
  }>(),
  { basePath: '/admin' }
);
const appointmentsBasePath = computed(() => `${props.basePath}/appointments`);

// --- CONSTANTS & OPTIONS (Static) ---
const NEW_PATIENT_VALUE = '__new_patient__';

const serviceTypes = [
  { value: 'blood_test', label: 'Prélèvement', description: 'À domicile', icon: 'i-lucide-droplet' },
  { value: 'nursing', label: 'Soins infirmiers', description: 'Pansements, injections...', icon: 'i-lucide-stethoscope' },
];

const documentTypes = [
  { key: 'carte_vitale', label: 'Carte Vitale', icon: 'i-lucide-credit-card', iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  { key: 'carte_mutuelle', label: 'Mutuelle', icon: 'i-lucide-shield', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  { key: 'ordonnance', label: 'Ordonnance', icon: 'i-lucide-file-text', iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400' },
  { key: 'autres_assurances', label: 'Autre prescription', icon: 'i-lucide-file-text', iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
];

const genderOptions = [{ label: 'Homme', value: 'male' }, { label: 'Femme', value: 'female' }, { label: 'Autre', value: 'other' }];

const statusOptions = [
  { label: 'En attente', value: 'pending' }, { label: 'Confirmé', value: 'confirmed' }, { label: 'Planifié', value: 'planned' }, { label: 'En cours', value: 'inProgress' },
  { label: 'Terminé', value: 'completed' }, { label: 'Annulé', value: 'canceled' }, { label: 'Expiré', value: 'expired' }, { label: 'Refusé', value: 'refused' },
];

// Date helpers
const currentYear = new Date().getFullYear();
const dayOptions = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: i + 1 }));
const monthOptions = [
  { label: 'Janvier', value: 1 }, { label: 'Février', value: 2 }, { label: 'Mars', value: 3 }, { label: 'Avril', value: 4 }, 
  { label: 'Mai', value: 5 }, { label: 'Juin', value: 6 }, { label: 'Juillet', value: 7 }, { label: 'Août', value: 8 }, 
  { label: 'Septembre', value: 9 }, { label: 'Octobre', value: 10 }, { label: 'Novembre', value: 11 }, { label: 'Décembre', value: 12 },
];
const yearOptions = Array.from({ length: currentYear - MIN_BIRTH_YEAR + 1 }, (_, i) => ({
  label: String(MIN_BIRTH_YEAR + i),
  value: MIN_BIRTH_YEAR + i,
})).reverse();

const bloodTestTypeOptions = [
  { label: 'Unique', value: 'single', description: 'Une seule fois' },
  { label: 'Série', value: 'multiple', description: 'Plusieurs prélèvements sur plusieurs jours' },
];
const multipleDaysOptions = [{ label: '2 jours', value: '2' }, { label: '3 jours', value: '3' }, { label: '5 jours', value: '5' }, { label: '7 jours', value: '7' }, { label: '10 jours', value: '10' }, { label: 'Personnalisé', value: 'custom' }];
const nursingDurationOptions = NURSING_DURATION_OPTIONS;
const frequencyOptions = [
  { label: '1 fois par jour', value: 'once_daily' },
  { label: '2 fois par jour', value: 'twice_daily' },
  { label: '3 fois par jour', value: 'thrice_daily' },
  { label: '2 fois par semaine', value: 'twice_weekly' },
  { label: '3 fois par semaine', value: 'thrice_weekly' },
  { label: 'A voir avec le professionnel', value: 'to_define' },
];
const preferredNurseGenderOptions = [
  { label: 'Peu importe', value: 'any' },
  { label: 'Femme', value: 'female' },
  { label: 'Homme', value: 'male' },
];

// --- COMPOSABLES ---
const router = useRouter();
const route = useRoute();
const toast = useAppToast();
const { user } = useAuth();
/** Formulaire utilisé par un pro ou nurse (basePath /pro ou /nurse) : patients via /patients */
const isProForm = computed(() => props.basePath === '/pro' || props.basePath === '/nurse');
/** Pro, nurse ou admin : peuvent créer des patients (POST /patients) pour les lier au RDV */
const canCreatePatientForAppointment = computed(
  () =>
    props.basePath === '/pro' ||
    props.basePath === '/nurse' ||
    props.basePath === '/admin' ||
    props.basePath === '/lab' ||
    props.basePath === '/subaccount'
);
/** Mode nurse : uniquement soins infirmiers, type forcé */
const isNurseForm = computed(() => props.basePath === '/nurse');
/** Mode lab : prise de sang uniquement, choix lab ou sous-comptes */
const isLabForm = computed(() => props.basePath === '/lab');
/** Mode subaccount : prise de sang uniquement, assigné à ce sous-compte */
const isSubaccountForm = computed(() => props.basePath === '/subaccount');

/** Créneau horaire : jusqu'à 22h pour les soins infirmiers (tous espaces), 17h pour prises de sang. */
const availabilitySliderMax = computed(() =>
  isNursingAppointment(form.type) ? AVAILABILITY_MAX_HOUR_NURSING : AVAILABILITY_MAX_HOUR_BLOOD_TEST,
);

// --- STATE ---
const isCreate = computed(() => props.mode === 'create');
const isEdit = computed(() => props.mode === 'edit');

const loading = ref(false);
const saving = ref(false);
const appointment = ref<Appointment | null>(null);

/** Après création (pro uniquement) : afficher la section ordonnance au lieu de rediriger */
const postCreateAppointmentId = ref<string | null>(null);
const postCreateDocuments = ref<any[]>([]);
const showPrescriptionAfterCreate = computed(() => props.basePath === '/pro');

/** Texte d'ordonnance saisi pendant la création du RDV (pro) — généré et enregistré à la soumission */
const prescriptionTextDuringCreate = ref('');

// Patient Data
const patients = ref<any[]>([]);
const patientsLoading = ref(false);
const selectedPatient = ref<any>(null);
const selectedPatientId = ref<string>(NEW_PATIENT_VALUE);
const patientDocuments = ref<Record<string, any>>({});
const loadingPatientDocuments = ref(false);
const uploadingDocumentType = ref<string | null>(null);
const PATIENT_DOC_TYPES = ['carte_vitale', 'carte_mutuelle', 'autres_assurances'];

/** Debounce recherche patient par email (nouveau patient) */
let emailLookupTimer: ReturnType<typeof setTimeout> | null = null;
const emailLookupLoading = ref(false);
const skipEmailLookupOnce = ref(false);

// Form Data
const categoryOptions = ref<SelectOption[]>([]);
const categoriesWithOptions = ref<Array<{ id: string; name: string; options?: Array<{ option_key: string; label: string; field_type: string; options?: { value: string; label: string }[]; is_required?: boolean; sort_order?: number }> }>>([]);
const categoryOptionsForCare = ref<Array<{ option_key: string; label: string; field_type: string; options?: { value: string; label: string }[]; is_required?: boolean; sort_order?: number }>>([]);
const birthDay = ref<number | null>(null);
const birthMonth = ref<number | null>(null);
const birthYear = ref<number | null>(null);
const availabilityRange = ref<[number, number]>([9, 11]);
const previousAvailabilityRange = ref<[number, number]>([9, 11]);

const labs = ref<any[]>([]);
const nurses = ref<any[]>([]);
const labsLoading = ref(false);
const nursesLoading = ref(false);

const form = reactive({
  type: 'blood_test' as ServiceType,
  status: 'pending' as string,
  scheduled_at: '',
  address: null as Address | null,
  assigned_lab_id: '' as string,
  assigned_nurse_id: '' as string,
  files: {} as Record<string, File>,
  form_data: {
    first_name: '', last_name: '', email: '', phone: '', birth_date: '', 
    gender: '' as 'male' | 'female' | 'other' | '',
    address_complement: '', category_id: '', 
    duration_days: '', frequency: '', notes: '',
    blood_test_type: 'single', custom_days: null as number | null, 
    availability_type: 'custom', availability: '',
    care_options: {} as Record<string, string | number>,
    /** Soins infirmiers : filtre dispatch (sauf espace infirmier → dérivé du profil) */
    preferred_nurse_gender: 'any' as 'any' | 'female' | 'male',
  },
});

function makeCareBlock(): CareBlock {
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `b-${Date.now()}-${Math.random()}`,
    category_id: '',
    blood_test_type: 'single',
    duration_days: '',
    custom_days: null,
    frequency: '',
    care_options: {},
    preferred_nurse_gender: 'any',
  };
}

const supportsMultiCareCreate = computed(
  () =>
    isCreate.value &&
    (isNurseForm.value || isLabForm.value || isSubaccountForm.value || isProForm.value),
);
const multiCareEnabled = ref(false);
const careBlocks = ref<CareBlock[]>([makeCareBlock()]);

function getCareOptionsForBlock(block: CareBlock) {
  const cat = categoriesWithOptions.value.find((c) => String(c.id) === String(block.category_id));
  if (!cat?.options || !Array.isArray(cat.options)) return [];
  return [...cat.options].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function clearAutreDetailUnlessSelected(
  co: Record<string, string | number>,
  optionKey: string,
  value: unknown,
): void {
  if (isAutreSelectValue(value)) return;
  const dk = careAutreDetailKey(optionKey);
  if (co[dk] !== undefined && co[dk] !== '') co[dk] = '';
}

function resolvedCategoryId(raw: unknown): string {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as { value?: unknown; id?: unknown };
    const v = o.value ?? o.id;
    if (v != null && String(v).trim() !== '') return String(v);
    return '';
  }
  return String(raw).trim();
}

const careCategoryNameSingleForm = computed(() => {
  const id = resolvedCategoryId(form.form_data.category_id);
  if (!id) return '';
  const row = categoryOptions.value.find((c) => String(c.value) === id);
  return row?.label ?? '';
});

function careCategoryNameForBlock(block: CareBlock): string {
  const id = String(block.category_id || '').trim();
  if (!id) return '';
  const row = categoryOptions.value.find((c) => String(c.value) === id);
  return row?.label ?? '';
}

function addCareBlock() {
  careBlocks.value.push(makeCareBlock());
}

function removeCareBlock(idx: number) {
  if (careBlocks.value.length <= 1) return;
  careBlocks.value.splice(idx, 1);
}

function resolvedPreferredNurseGenderForBlock(block: CareBlock): 'any' | 'female' | 'male' {
  if (!isNurseForm.value) {
    return block.preferred_nurse_gender || 'any';
  }
  const g = (user.value as { gender?: string } | null)?.gender;
  if (g === 'male') return 'male';
  if (g === 'female') return 'female';
  return 'any';
}

// UI State
const draggedOver = ref<string | null>(null);
const fileInputRefs: Record<string, HTMLInputElement | null> = {};

// --- COMPUTED ---
const showBloodTestLabAssignSection = computed(() => {
  if (!isLabForm.value) return true;
  return labs.value.length > 0;
});

const patientSelectSearchPlaceholder = PATIENT_SELECT_SEARCH_PLACEHOLDER;

const patientSelectItems = computed(() => {
  const valid = patients.value.filter((p) => p.id != null);
  return [
    {
      label: '— Nouveau patient (saisie manuelle)',
      value: NEW_PATIENT_VALUE,
      searchText: 'nouveau patient création saisie manuelle',
      metaLine: '',
    },
    ...valid.map((p) => buildPatientSelectRow(p, { labelStyle: 'professional' })),
  ];
});

const existingFileNames = computed(() => {
  if (!isEdit.value || !appointment.value?.form_data?.files) return {};
  const files = appointment.value.form_data.files as Record<string, { name?: string; file_name?: string }>;
  return Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v?.name ?? v?.file_name ?? '']));
});

const labSelectItems = computed(() =>
  labs.value.map((p) => {
    const isSelf = isLabForm.value && user.value?.id && p.id === user.value.id;
    const label = isSelf
      ? 'Mon laboratoire'
      : (p.company_name && String(p.company_name).trim()) || `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || p.email_display || p.email || p.id;
    return { label, value: p.id };
  })
);
const nurseSelectItems = computed(() =>
  nurses.value.map((p) => ({
    label: `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || p.email_display || p.email || p.id,
    value: p.id,
  }))
);

// --- METHODS ---

// Visual Helpers
function getStatusLabel(status: string) {
  return statusOptions.find(s => s.value === status)?.label || status;
}

function getStatusColor(status: string): 'primary' | 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  const map: Record<string, 'primary' | 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'info',
    planned: 'info',
    inProgress: 'primary',
    completed: 'success',
    canceled: 'error',
    refused: 'error',
    expired: 'neutral',
  };
  return map[status] ?? 'neutral';
}
function getStatusColorDot(status: string) {
  switch (status) {
    case 'confirmed': case 'planned': return 'bg-green-500';
    case 'completed': return 'bg-primary-500';
    case 'canceled': case 'refused': return 'bg-red-500';
    case 'pending': return 'bg-orange-500';
    default: return 'bg-gray-400';
  }
}

function formatTime(h: number) {
  const hour = Math.floor(h);
  return `${hour}h00`;
}

function setServiceType(type: ServiceType) {
  form.type = type;
  onTypeChange();
}

// File Handling
function hasDocumentForType(key: string) {
  if (form.files[key]) return true;
  if (isEdit.value && (existingFileNames.value[key] || patientDocuments.value[key])) return true;
  if (isCreate.value && selectedPatientId.value !== NEW_PATIENT_VALUE && patientDocuments.value[key]) return true;
  return false;
}

function setFileInputRef(key: string, el: unknown) {
  if (el && el instanceof HTMLInputElement) fileInputRefs[key] = el;
}
function triggerFileInput(key: string) {
  fileInputRefs[key]?.click();
}
function handleFileSelect(event: Event, key: string) {
  const target = event.target as HTMLInputElement;
  if (target.files?.[0]) processFile(target.files[0], key);
  target.value = '';
}
function handleDrop(event: DragEvent, key: string) {
  draggedOver.value = null;
  const file = event.dataTransfer?.files?.[0];
  if (file) processFile(file, key);
}
async function processFile(file: File, key: string) {
  if (file.size > MAX_UPLOAD_BYTES) {
    toast.add({ title: 'Fichier trop volumineux', description: 'Max 25 Mo', color: 'red', icon: 'i-lucide-alert-circle' });
    return;
  }
  const isPatientDocType = PATIENT_DOC_TYPES.includes(key);
  const canUpdateProfile = isProForm.value && selectedPatientId.value !== NEW_PATIENT_VALUE && selectedPatient.value?.id;
  if (isPatientDocType && canUpdateProfile) {
    await uploadPatientDocumentToProfile(key, file);
    return;
  }
  form.files[key] = file;
  toast.add({ title: 'Fichier ajouté', description: file.name, color: 'green', icon: 'i-lucide-check', timeout: 2000 });
}

function getApiBase(): string {
  if (import.meta.client && (window as any).__NUXT__?.config?.public?.apiBase) {
    return (window as any).__NUXT__.config.public.apiBase;
  }
  return import.meta.env?.NUXT_PUBLIC_API_BASE || 'http://localhost:8888/api';
}

async function downloadPatientDocument(medicalDocumentId: string, fileName?: string) {
  try {
    const apiBase = getApiBase();
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const url = `${apiBase}/medical-documents/${medicalDocumentId}/download?t=${Date.now()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Erreur lors du téléchargement');
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = (fileName && fileName.trim()) ? fileName : `document-${medicalDocumentId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(objectUrl);
    document.body.removeChild(a);
    toast.add({ title: 'Téléchargement démarré', color: 'green', icon: 'i-lucide-download', timeout: 2000 });
  } catch (e) {
    console.error('Download error:', e);
    toast.add({ title: 'Erreur', description: 'Impossible de télécharger le document', color: 'red', icon: 'i-lucide-alert-circle' });
  }
}

async function uploadPatientDocumentToProfile(key: string, file: File) {
  const patientId = selectedPatient.value?.id;
  if (!patientId) return;
  uploadingDocumentType.value = key;
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', key);
    formData.append('user_id', patientId);
    const res = await apiFetch('/patient-documents/upload', { method: 'POST', body: formData });
    if (res?.success) {
      toast.add({ title: 'Document enregistré', description: 'La fiche patient a été mise à jour.', color: 'green', icon: 'i-lucide-check', timeout: 2000 });
      await loadPatientDocuments(patientId);
    } else {
      throw new Error((res as any)?.error || 'Erreur lors de l\'enregistrement');
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message || 'Impossible d\'enregistrer le document', color: 'red', icon: 'i-lucide-alert-circle' });
  } finally {
    uploadingDocumentType.value = null;
  }
}

/** Copie les documents du patient (fiche) vers le RDV pour que lab / infirmier / admin y aient accès. */
async function copyPatientDocumentsToAppointment(appointmentId: string) {
  for (const key of PATIENT_DOC_TYPES) {
    // Ne pas copier si l'admin a uploadé un nouveau fichier pour ce type
    if (form.files[key]) continue;
    const doc = patientDocuments.value[key];
    if (!doc?.medical_document_id) continue;
    try {
      const res = await apiFetch('/medical-documents/copy', {
        method: 'POST',
        body: {
          source_medical_document_id: doc.medical_document_id,
          appointment_id: appointmentId,
          document_type: key,
        },
      });
      if (!res?.success) console.warn('Copy doc failed:', key, (res as any)?.error);
    } catch (e) {
      console.warn('Copy doc error:', key, e);
    }
  }
}

/** Upload les fichiers du formulaire (form.files) vers le RDV via POST /medical-documents. */
async function uploadFormFilesToAppointment(appointmentId: string) {
  const fieldMapping: Record<string, string> = {
    carte_vitale: 'carte_vitale',
    carte_mutuelle: 'carte_mutuelle',
    ordonnance: 'ordonnance',
    autres_assurances: 'autres_assurances',
  };
  for (const [key, file] of Object.entries(form.files)) {
    if (!file || !(file instanceof File)) continue;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('appointment_id', appointmentId);
      formData.append('document_type', fieldMapping[key] || key);
      await apiFetch('/medical-documents', { method: 'POST', body: formData });
    } catch (e) {
      console.error('Erreur upload document', key, e);
      toast.add({ title: 'Document non enregistré', description: `Impossible d'uploader ${key}`, color: 'red', icon: 'i-lucide-alert-circle' });
    }
  }
}

/** Génère l'ordonnance (PDF) et l'enregistre sur le RDV quand le texte a été saisi pendant la création. */
async function generateAndAttachPrescriptionDuringCreate(appointmentId: string): Promise<void> {
  const text = prescriptionTextDuringCreate.value?.trim();
  if (!text) return;
  try {
    const res = await apiFetch(`/appointments/${appointmentId}/generate-prescription`, {
      method: 'POST',
      body: { prescription_text: text },
    });
    if (!res?.success || !(res as any).data?.pdf_base64) {
      toast.add({ title: 'Ordonnance', description: (res as any)?.error ?? 'Génération du PDF impossible', color: 'orange', icon: 'i-lucide-alert-circle' });
      return;
    }
    const base64 = (res as any).data.pdf_base64 as string;
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', blob, (res as any).data?.file_name || 'ordonnance.pdf');
    formData.append('appointment_id', appointmentId);
    formData.append('document_type', 'ordonnance');
    await apiFetch('/medical-documents', { method: 'POST', body: formData });
    toast.add({ title: 'Ordonnance enregistrée', description: "L'ordonnance a été générée et ajoutée au RDV.", color: 'green', icon: 'i-lucide-check-circle' });
  } catch (e: any) {
    toast.add({ title: 'Ordonnance', description: e?.message ?? 'Impossible de générer ou enregistrer l\'ordonnance', color: 'orange', icon: 'i-lucide-alert-circle' });
  }
}

// Form Logic — adresse patient : objet, chaîne JSON, ou libellé seul (coords complétées via BAN)
function parseRawPatientAddress(raw: unknown): { label: string; lat?: number; lng?: number; complement?: string } | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    try {
      const j = JSON.parse(t) as Record<string, unknown>;
      if (j && typeof j === 'object' && !Array.isArray(j)) {
        return {
          label: String(j.label ?? ''),
          lat: typeof j.lat === 'number' ? j.lat : undefined,
          lng: typeof j.lng === 'number' ? j.lng : undefined,
          complement: typeof j.complement === 'string' ? j.complement : undefined,
        };
      }
    } catch {
      return { label: t };
    }
    return { label: t };
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      label: String(o.label ?? ''),
      lat: typeof o.lat === 'number' ? o.lat : undefined,
      lng: typeof o.lng === 'number' ? o.lng : undefined,
      complement: typeof o.complement === 'string' ? o.complement : undefined,
    };
  }
  return null;
}

async function applyPatientAddressToForm(p: any) {
  const parsed = parseRawPatientAddress(p?.address);
  if (!parsed?.label?.trim()) {
    form.address = null;
    return;
  }
  const label = parsed.label.trim();
  let lat =
    typeof parsed.lat === 'number' && Number.isFinite(parsed.lat) ? parsed.lat : NaN;
  let lng =
    typeof parsed.lng === 'number' && Number.isFinite(parsed.lng) ? parsed.lng : NaN;
  if (!Number.isFinite(lat)) lat = parseFloat(String((parsed as any).lat ?? ''));
  if (!Number.isFinite(lng)) lng = parseFloat(String((parsed as any).lng ?? ''));

  const coordsMissing =
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    (lat === 0 && lng === 0);

  if (coordsMissing && label.length >= 3) {
    try {
      const res = await apiFetch(`/ban/search?q=${encodeURIComponent(label)}&limit=1`, { method: 'GET' });
      if (res?.success && Array.isArray(res.data) && res.data[0]) {
        const first = res.data[0] as { lat?: number; lng?: number };
        if (first.lat != null && first.lng != null) {
          lat = Number(first.lat);
          lng = Number(first.lng);
        }
      }
    } catch {
      /* recherche BAN optionnelle */
    }
  }

  if (!Number.isFinite(lat)) lat = 0;
  if (!Number.isFinite(lng)) lng = 0;

  form.address = { label, lat, lng };
}

async function selectPatient(p: any) {
  selectedPatient.value = p;
  selectedPatientId.value = p?.id ?? NEW_PATIENT_VALUE;

  let full = p;
  if (p?.id && (isProForm.value || isNurseForm.value || isLabForm.value || isSubaccountForm.value || props.basePath === '/admin')) {
    try {
      const res = await apiFetch(`/users/${encodeURIComponent(p.id)}`, { method: 'GET' });
      if (res?.success && res.data && typeof res.data === 'object') {
        full = { ...p, ...res.data };
        const idx = patients.value.findIndex((x) => String(x.id) === String(p.id));
        if (idx >= 0) {
          patients.value[idx] = { ...patients.value[idx], ...res.data };
        }
      }
    } catch {
      /* garde les données liste */
    }
  }

  // Auto-fill
  form.form_data.first_name = full.first_name || '';
  form.form_data.last_name = full.last_name || '';
  form.form_data.email = full.email || '';
  form.form_data.phone = full.phone || '';
  form.form_data.gender = (full.gender as any) || '';
  const addrParsed = parseRawPatientAddress(full?.address);
  form.form_data.address_complement = addrParsed?.complement || (full.address as any)?.complement || '';

  if (full.birth_date) {
    const [y, m, d] = String(full.birth_date).split('-');
    if (y && m && d) {
      birthYear.value = parseInt(y, 10);
      birthMonth.value = parseInt(m, 10);
      birthDay.value = parseInt(d, 10);
    }
  } else {
    resetBirthDate();
  }
  if (birthYear.value && birthMonth.value && birthDay.value) {
    form.form_data.birth_date = `${birthYear.value}-${String(birthMonth.value).padStart(2, '0')}-${String(birthDay.value).padStart(2, '0')}`;
  } else {
    form.form_data.birth_date = '';
  }

  await applyPatientAddressToForm(full);
  if (full?.id) loadPatientDocuments(full.id);
}

function clearPatient() {
  selectedPatient.value = null;
  selectedPatientId.value = NEW_PATIENT_VALUE;
  patientDocuments.value = {};
  form.form_data.first_name = '';
  form.form_data.last_name = '';
  form.form_data.email = '';
  form.form_data.phone = '';
  form.form_data.gender = '';
  form.address = null;
  form.form_data.address_complement = '';
  resetBirthDate();
}

async function loadPatientDocuments(patientId: string) {
  if (!patientId) return;
  loadingPatientDocuments.value = true;
  patientDocuments.value = {};
  try {
    const res = await apiFetch(`/patient-documents?user_id=${encodeURIComponent(patientId)}`, { method: 'GET' });
    if (res?.success && res.data && Array.isArray(res.data)) {
      const map: Record<string, any> = {};
      (res.data as any[]).forEach((doc: any) => {
        if (doc.document_type) map[doc.document_type] = doc;
      });
      patientDocuments.value = map;
    }
  } catch (e) {
    console.error('Erreur chargement documents patient:', e);
  } finally {
    loadingPatientDocuments.value = false;
  }
}

/** En édition : charger les documents attachés au RDV (medical_documents avec appointment_id) pour les afficher. */
async function loadAppointmentDocuments(appointmentId: string) {
  if (!appointmentId) return;
  loadingPatientDocuments.value = true;
  try {
    const res = await apiFetch(`/medical-documents?appointment_id=${encodeURIComponent(appointmentId)}`, { method: 'GET' });
    if (res?.success && res.data && Array.isArray(res.data)) {
      const map: Record<string, any> = {};
      (res.data as any[]).forEach((doc: any) => {
        if (doc.document_type) {
          map[doc.document_type] = {
            medical_document_id: doc.id,
            file_name: doc.file_name,
            document_type: doc.document_type,
          };
        }
      });
      patientDocuments.value = { ...patientDocuments.value, ...map };
    }
  } catch (e) {
    console.error('Erreur chargement documents du RDV:', e);
  } finally {
    loadingPatientDocuments.value = false;
  }
}

/** En édition (nurse/pro) : liste des documents du RDV pour la section ordonnance (tableau pour PrescriptionSection). */
const editModeDocuments = ref<any[]>([]);

async function loadEditModeDocuments() {
  const appointmentId = appointment.value?.id;
  if (!appointmentId) return;
  try {
    const res = await apiFetch(`/medical-documents?appointment_id=${encodeURIComponent(appointmentId)}`, { method: 'GET' });
    if (res?.success && res.data && Array.isArray(res.data)) {
      editModeDocuments.value = res.data as any[];
    } else {
      editModeDocuments.value = [];
    }
  } catch (e) {
    console.error('Erreur chargement documents RDV (édition):', e);
    editModeDocuments.value = [];
  }
}

/** Après création : charger les documents du RDV pour PrescriptionSection. */
async function loadPostCreateDocuments() {
  if (!postCreateAppointmentId.value) return;
  try {
    const res = await apiFetch(`/medical-documents?appointment_id=${encodeURIComponent(postCreateAppointmentId.value)}`, { method: 'GET' });
    if (res?.success && res.data && Array.isArray(res.data)) {
      postCreateDocuments.value = res.data as any[];
    } else {
      postCreateDocuments.value = [];
    }
  } catch (e) {
    console.error('Erreur chargement documents post-création:', e);
    postCreateDocuments.value = [];
  }
}

function resetBirthDate() {
  birthYear.value = null;
  birthMonth.value = null;
  birthDay.value = null;
}

function onTypeChange() {
  loadCategories(form.type === 'nursing' ? 'nursing' : 'blood_test');
  form.assigned_lab_id = '';
  form.assigned_nurse_id = '';
  form.form_data.category_id = ''; // Réinitialiser pour afficher le placeholder (liste différente selon type)
  form.form_data.care_options = {};
  if (isBloodTestAppointment(form.type)) {
    form.form_data.frequency = '';
    form.form_data.blood_test_type = 'single';
  } else {
    form.form_data.blood_test_type = '';
    form.form_data.duration_days = '';
    form.form_data.custom_days = null;
    form.form_data.preferred_nurse_gender = 'any';
  }
  if (multiCareEnabled.value && supportsMultiCareCreate.value) {
    careBlocks.value = [makeCareBlock()];
  }
}

/** Préférence dispatch soins infirmiers : espace infirmier = genre du compte, sinon choix formulaire */
function resolvedPreferredNurseGender(): 'any' | 'female' | 'male' {
  if (!isNurseForm.value) {
    return form.form_data.preferred_nurse_gender || 'any';
  }
  const g = (user.value as { gender?: string } | null)?.gender;
  if (g === 'male') return 'male';
  if (g === 'female') return 'female';
  return 'any';
}

// API Calls
async function loadCategories(type: 'blood_test' | 'nursing') {
  try {
    const res = await apiFetch(`/categories?type=${type}`, { method: 'GET' });
    if (res.success && Array.isArray(res.data)) {
      const data = res.data as Array<{ id: string; name: string; options?: Array<{ option_key: string; label: string; field_type: string; options?: { value: string; label: string }[]; is_required?: boolean; sort_order?: number }> }>;
      categoriesWithOptions.value = data;
      categoryOptions.value = data.map((c) => ({ label: c.name, value: String(c.id) }));
    } else {
      categoriesWithOptions.value = [];
      categoryOptions.value = [];
    }
  } catch {
    categoriesWithOptions.value = [];
    categoryOptions.value = [];
  }
}

function loadCategoryOptionsForCare(categoryId: string) {
  if (!categoryId) {
    categoryOptionsForCare.value = [];
    return;
  }
  const cat = categoriesWithOptions.value.find((c) => String(c.id) === String(categoryId));
  if (cat?.options && Array.isArray(cat.options)) {
    categoryOptionsForCare.value = [...cat.options].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  } else {
    categoryOptionsForCare.value = [];
  }
}

async function fetchPatients() {
  patientsLoading.value = true;
  try {
    if (isProForm.value || isLabForm.value || isSubaccountForm.value) {
      patients.value = await fetchAllPatientsForDashboard(apiFetch);
    } else {
      const res = await apiFetch('/users?limit=300', { method: 'GET' });
      if (res.success && Array.isArray(res.data)) {
        patients.value = (res.data as any[]).filter((u) => u.role === 'patient');
      } else {
        patients.value = [];
      }
    }
  } catch (e) {
    console.error('Erreur chargement patients:', e);
    patients.value = [];
  } finally {
    patientsLoading.value = false;
  }
}

async function loadAppointment() {
  if (!props.appointmentId) return;
  loading.value = true;
  try {
    const response = await apiFetch(`/appointments/${props.appointmentId}`, { method: 'GET' });
    if (response.success && response.data) {
      const data = response.data as Appointment;
      appointment.value = data;
      
      const appType = (data.type === 'nursing' || data.type === 'nurse') ? 'nursing' : 'blood_test';
      form.type = appType;
      form.status = data.status;
      form.scheduled_at = data.scheduled_at ? data.scheduled_at.slice(0, 10) : '';
      form.assigned_lab_id = (data as any).assigned_lab_id ?? '';
      form.assigned_nurse_id = (data as any).assigned_nurse_id ?? '';
      
      // Normalize Address
      const rawAddr = data.address;
      if (rawAddr && typeof rawAddr === 'object' && (rawAddr as any).label) {
        form.address = { label: (rawAddr as any).label, lat: (rawAddr as any).lat ?? 0, lng: (rawAddr as any).lng ?? 0 };
      }

      // Fill Form Data
      const fd = data.form_data || {};
      form.form_data.first_name = fd.first_name ?? '';
      form.form_data.last_name = fd.last_name ?? '';
      form.form_data.email = fd.email ?? '';
      form.form_data.phone = fd.phone ?? '';
      form.form_data.gender = (fd.gender as any) ?? '';
      form.form_data.address_complement = fd.address_complement ?? '';
      // Normaliser category_id : toujours une string (id). Si l'API renvoie un objet { id, name }, prendre id.
      const rawCategoryId = fd.category_id ?? data.category_id ?? '';
      form.form_data.category_id = (rawCategoryId && typeof rawCategoryId === 'object' && (rawCategoryId as any).id)
        ? String((rawCategoryId as any).id)
        : (rawCategoryId ? String(rawCategoryId) : '');
      form.form_data.duration_days = fd.duration_days ?? '';
      form.form_data.frequency = fd.frequency ?? '';
      form.form_data.preferred_nurse_gender = (fd.preferred_nurse_gender as 'any' | 'female' | 'male') ?? 'any';
      form.form_data.notes = fd.notes ?? '';
      form.form_data.blood_test_type = fd.blood_test_type ?? 'single';
      form.form_data.custom_days = fd.custom_days ?? null;
      form.form_data.care_options = (fd.care_options && typeof fd.care_options === 'object') ? { ...fd.care_options } : {};
      
      // Date handling
      if (fd.birth_date) {
        const [y, m, d] = fd.birth_date.split('-');
        if (y) birthYear.value = parseInt(y);
        if (m) birthMonth.value = parseInt(m);
        if (d) birthDay.value = parseInt(d);
      }

      // Availability Logic
      form.form_data.availability = fd.availability ?? '';
      form.form_data.availability_type = 'custom'; // default
      
      if (form.form_data.availability) {
        try {
          const av = JSON.parse(form.form_data.availability);
          if (av.type === 'all_day') {
             form.form_data.availability_type = 'all_day';
          } else if (av.type === 'custom' && Array.isArray(av.range)) {
             form.form_data.availability_type = 'custom';
             const max = availabilitySliderMax.value;
             let r0 = Number(av.range[0]);
             let r1 = Number(av.range[1]);
             r1 = Math.min(max, Math.max(r1, r0 + AVAILABILITY_MIN_SPAN_HOURS));
             r0 = Math.max(6, Math.min(r0, r1 - AVAILABILITY_MIN_SPAN_HOURS));
             availabilityRange.value = [r0, r1];
             previousAvailabilityRange.value = [...availabilityRange.value];
          }
        } catch {}
      } else if (data.scheduled_at) {
        const h = new Date(data.scheduled_at).getHours();
        const start = Math.max(6, Math.min(15, h));
        availabilityRange.value = [start, start + AVAILABILITY_MIN_SPAN_HOURS];
      }

      await loadCategories(appType);
      loadCategoryOptionsForCare(form.form_data.category_id);

      // Présélectionner le patient si le RDV a un patient_id
      const pid = (data as any).patient_id;
      if (pid && patients.value.length > 0) {
        const p = patients.value.find((x) => String(x.id) === String(pid));
        if (p) {
          selectedPatient.value = p;
          selectedPatientId.value = String(p.id);
        }
      }

      // Charger les documents attachés au RDV pour les afficher (Télécharger / Remplacer)
      await loadAppointmentDocuments(props.appointmentId!);
      if (showPrescriptionAfterCreate.value) await loadEditModeDocuments();
    }
  } catch (e) {
    toast.add({ title: 'Erreur', description: 'Impossible de charger le rendez-vous', color: 'red' });
  } finally {
    loading.value = false;
  }
}

function scrollToFormSection(sectionId: string) {
  if (typeof document === 'undefined') return;
  void nextTick(() => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

type ClientValidationFail = { sectionId: string; title: string; description: string };

function validateIdentityAndPlanningShared(): ClientValidationFail | null {
  if (!form.scheduled_at?.trim()) {
    return {
      sectionId: 'appointment-form-section-planning',
      title: 'Date requise',
      description: 'Indiquez la date d’intervention dans la section Planification.',
    };
  }

  if (
    form.form_data.availability_type === 'custom' &&
    availabilityRange.value[1] - availabilityRange.value[0] < AVAILABILITY_MIN_SPAN_HOURS
  ) {
    return {
      sectionId: 'appointment-form-section-planning',
      title: 'Créneau trop court',
      description: `Ajustez le créneau horaire : minimum ${AVAILABILITY_MIN_SPAN_HOURS} h d’écart entre le début et la fin.`,
    };
  }

  if (!form.form_data.last_name?.trim()) {
    return {
      sectionId: 'appointment-form-section-identity',
      title: 'Nom requis',
      description: 'Renseignez le nom du patient.',
    };
  }
  if (!form.form_data.first_name?.trim()) {
    return {
      sectionId: 'appointment-form-section-identity',
      title: 'Prénom requis',
      description: 'Renseignez le prénom du patient.',
    };
  }
  if (!form.form_data.gender) {
    return {
      sectionId: 'appointment-form-section-identity',
      title: 'Genre requis',
      description: 'Sélectionnez le genre dans le formulaire.',
    };
  }
  if (!birthYear.value || !birthMonth.value || !birthDay.value) {
    return {
      sectionId: 'appointment-form-section-identity',
      title: 'Date de naissance requise',
      description: 'Indiquez le jour, le mois et l’année de naissance.',
    };
  }
  if (!form.form_data.phone?.trim()) {
    return {
      sectionId: 'appointment-form-section-identity',
      title: 'Téléphone requis',
      description: 'Renseignez un numéro de téléphone pour joindre le patient.',
    };
  }
  const emailRequired = !isProForm.value;
  if (emailRequired && !form.form_data.email?.trim()) {
    return {
      sectionId: 'appointment-form-section-identity',
      title: 'E-mail requis',
      description: 'Renseignez une adresse e-mail valide.',
    };
  }
  return null;
}

function validateMultiCareBlocks(): ClientValidationFail | null {
  const idErr = validateIdentityAndPlanningShared();
  if (idErr) return idErr;

  for (let i = 0; i < careBlocks.value.length; i++) {
    const block = careBlocks.value[i];
    const prefix = `Soin ${i + 1}`;
    const hasCat = String(block.category_id || '').trim() !== '';
    if (!hasCat) {
      return {
        sectionId: 'appointment-form-section-intervention',
        title: 'Type d’intervention requis',
        description: `${prefix} : choisissez une catégorie dans la liste.`,
      };
    }
    const opts = getCareOptionsForBlock(block);
    for (const opt of opts) {
      if (!opt.is_required) continue;
      const v = block.care_options[opt.option_key];
      const empty =
        v === undefined || v === null || (typeof v === 'string' && !String(v).trim());
      if (empty) {
        return {
          sectionId: 'appointment-form-section-intervention',
          title: 'Champ requis',
          description: `${prefix} : renseignez « ${opt.label} ».`,
        };
      }
    }
    for (const opt of opts) {
      if (opt.field_type !== 'select' || !categorySelectHasAutreOption(opt)) continue;
      if (!isAutreSelectValue(block.care_options[opt.option_key])) continue;
      const dk = careAutreDetailKey(opt.option_key);
      const d = block.care_options[dk];
      if (d === '' || d == null || String(d).trim() === '') {
        return {
          sectionId: 'appointment-form-section-intervention',
          title: 'Précision requise',
          description: `${prefix} : précisez « ${opt.label} » (choix Autre).`,
        };
      }
    }

    if (isBloodTestAppointment(form.type) && block.blood_test_type === 'multiple') {
      if (!block.duration_days) {
        return {
          sectionId: 'appointment-form-section-intervention',
          title: 'Durée du protocole',
          description: `${prefix} : indiquez la durée du protocole de prélèvements.`,
        };
      }
      if (block.duration_days === 'custom' && !block.custom_days) {
        return {
          sectionId: 'appointment-form-section-intervention',
          title: 'Durée précise',
          description: `${prefix} : indiquez le nombre de jours du protocole.`,
        };
      }
    }

    if (isNursingAppointment(form.type) && block.duration_days === 'custom' && !block.custom_days) {
      return {
        sectionId: 'appointment-form-section-intervention',
        title: 'Durée requise',
        description: `${prefix} : indiquez le nombre de jours de prise en charge.`,
      };
    }

    if (isNursingAppointment(form.type) && showNursingFreq(block.duration_days) && !block.frequency) {
      return {
        sectionId: 'appointment-form-section-intervention',
        title: 'Fréquence requise',
        description: `${prefix} : indiquez la fréquence de passage des soins.`,
      };
    }
  }
  return null;
}

function validateAppointmentFormClient(): ClientValidationFail | null {
  if (multiCareEnabled.value && supportsMultiCareCreate.value) {
    return validateMultiCareBlocks();
  }

  const idErr = validateIdentityAndPlanningShared();
  if (idErr) return idErr;

  const catRaw = form.form_data.category_id;
  const hasCategory = (() => {
    if (catRaw == null || catRaw === '') return false;
    if (typeof catRaw === 'object') {
      const o = catRaw as { value?: unknown; id?: unknown };
      const v = o.value ?? o.id;
      return v != null && String(v).trim() !== '';
    }
    return String(catRaw).trim() !== '';
  })();

  if (!hasCategory) {
    return {
      sectionId: 'appointment-form-section-intervention',
      title: 'Type d’intervention requis',
      description: 'Choisissez le type d’analyse ou de soin dans la liste.',
    };
  }

  for (const opt of categoryOptionsForCare.value) {
    if (!opt.is_required) continue;
    const v = form.form_data.care_options[opt.option_key];
    const empty =
      v === undefined || v === null || (typeof v === 'string' && !String(v).trim());
    if (empty) {
      return {
        sectionId: 'appointment-form-section-intervention',
        title: 'Champ requis',
        description: `Renseignez « ${opt.label} » pour ce type de soin.`,
      };
    }
  }

  for (const opt of categoryOptionsForCare.value) {
    if (opt.field_type !== 'select' || !categorySelectHasAutreOption(opt)) continue;
    if (!isAutreSelectValue(form.form_data.care_options[opt.option_key])) continue;
    const dk = careAutreDetailKey(opt.option_key);
    const d = form.form_data.care_options[dk];
    if (d === '' || d == null || String(d).trim() === '') {
      return {
        sectionId: 'appointment-form-section-intervention',
        title: 'Précision requise',
        description: `Précisez « ${opt.label} » (choix Autre).`,
      };
    }
  }

  if (isBloodTestAppointment(form.type) && form.form_data.blood_test_type === 'multiple') {
    if (!form.form_data.duration_days) {
      return {
        sectionId: 'appointment-form-section-intervention',
        title: 'Durée du protocole',
        description: 'Indiquez la durée du protocole de prélèvements.',
      };
    }
    if (form.form_data.duration_days === 'custom' && !form.form_data.custom_days) {
      return {
        sectionId: 'appointment-form-section-intervention',
        title: 'Durée précise',
        description: 'Indiquez le nombre de jours du protocole.',
      };
    }
  }

  if (isNursingAppointment(form.type) && form.form_data.duration_days === 'custom' && !form.form_data.custom_days) {
    return {
      sectionId: 'appointment-form-section-intervention',
      title: 'Durée requise',
      description: 'Indiquez le nombre de jours de prise en charge.',
    };
  }

  if (isNursingAppointment(form.type) && showNursingFreq(form.form_data.duration_days) && !form.form_data.frequency) {
    return {
      sectionId: 'appointment-form-section-intervention',
      title: 'Fréquence requise',
      description: 'Indiquez la fréquence de passage des soins.',
    };
  }

  return null;
}

function inferSectionFromErrorMessage(msg: string): string | null {
  const m = msg.toLowerCase();
  if (/(scheduled|date|planification|créneau|horaire)/.test(m)) {
    return 'appointment-form-section-planning';
  }
  if (/(adresse|address|lat|lng|coordonn)/.test(m)) {
    return 'appointment-form-section-address';
  }
  if (/(patient|email|courriel|téléphone|phone)/.test(m)) {
    return 'appointment-form-section-identity';
  }
  if (/(catégorie|category|type de soin|type d'analyse)/.test(m)) {
    return 'appointment-form-section-intervention';
  }
  if (/(document|ordonnance|fichier)/.test(m)) {
    return 'appointment-form-section-documents';
  }
  return null;
}

function mergeFormDataForCareBlock(
  block: CareBlock,
  availabilityPayload: string,
  filesMeta: Record<string, { field: string; name: string }>,
): Record<string, unknown> {
  const fd: Record<string, unknown> = {
    ...form.form_data,
    category_id: block.category_id || undefined,
    gender: form.form_data.gender || undefined,
    availability: availabilityPayload,
    files: filesMeta,
    notes: form.form_data.notes,
  };
  if (isBloodTestAppointment(form.type)) {
    fd.blood_test_type = block.blood_test_type;
    fd.custom_days = block.blood_test_type === 'multiple' ? block.custom_days : undefined;
    fd.duration_days = block.blood_test_type === 'multiple' ? block.duration_days : undefined;
    fd.frequency = undefined;
    fd.preferred_nurse_gender = undefined;
  } else {
    fd.blood_test_type = undefined;
    fd.duration_days = block.duration_days;
    fd.custom_days = block.duration_days === 'custom' ? block.custom_days : undefined;
    fd.frequency = block.frequency;
    fd.preferred_nurse_gender = resolvedPreferredNurseGenderForBlock(block);
  }
  fd.care_options =
    block.care_options && Object.keys(block.care_options).length ? { ...block.care_options } : undefined;
  return fd;
}

async function submitMultiCareBatch(
  scheduledAtIso: string | undefined,
  addressPayload: { label: string; lat: number; lng: number; complement?: string },
  availabilityPayload: string,
  filesMeta: Record<string, { field: string; name: string }>,
) {
  let patientId = selectedPatient.value?.id || undefined;

  const shouldCreatePatient =
    canCreatePatientForAppointment.value &&
    selectedPatientId.value === NEW_PATIENT_VALUE &&
    form.form_data.first_name?.trim() &&
    form.form_data.last_name?.trim() &&
    form.form_data.phone?.trim() &&
    (form.form_data.email?.trim() || isProForm.value);

  if (shouldCreatePatient) {
    const addressForPatient = form.address?.label
      ? { ...form.address, complement: form.form_data.address_complement || undefined }
      : undefined;
    const bodyPatient: Record<string, unknown> = {
      first_name: form.form_data.first_name.trim(),
      last_name: form.form_data.last_name.trim(),
      phone: form.form_data.phone.trim(),
      birth_date: form.form_data.birth_date || undefined,
      gender: form.form_data.gender || undefined,
      address: addressForPatient,
    };
    const em = form.form_data.email?.trim();
    if (em) bodyPatient.email = em;
    const patientRes = await apiFetch('/patients', {
      method: 'POST',
      body: bodyPatient,
    });
    if (patientRes.success && (patientRes as any).data?.id) {
      patientId = (patientRes as any).data.id;
    }
  }

  if (isBloodTestAppointment(form.type)) {
    const firstBlock = careBlocks.value[0];
    if (!firstBlock) {
      throw new Error('Aucun acte de prélèvement à créer');
    }
    const bloodTestItems = careBlocks.value.map((block, index) => {
      const categoryId = String(block.category_id || '').trim();
      const category = categoryOptions.value.find((opt) => String(opt.value) === categoryId);
      return {
        category_id: categoryId || undefined,
        label: String(category?.label || `Analyse ${index + 1}`),
        care_options:
          block.care_options && Object.keys(block.care_options).length
            ? { ...block.care_options }
            : {},
        sort_order: index,
      };
    });
    const rawFormData = mergeFormDataForCareBlock(firstBlock, availabilityPayload, filesMeta);
    rawFormData.blood_test_items = bloodTestItems;
    const categoryId = String(firstBlock.category_id || '').trim() || undefined;
    const createBody: Record<string, unknown> = {
      type: 'blood_test',
      form_type: 'blood_test',
      scheduled_at: scheduledAtIso,
      address: addressPayload,
      form_data: rawFormData,
      status: 'pending',
      patient_id: patientId,
      category_id: categoryId,
      blood_test_items: bloodTestItems,
    };
    if (!patientId && form.form_data.email?.trim()) {
      createBody.guest_email = form.form_data.email.trim();
    }
    if (form.assigned_lab_id) createBody.assigned_lab_id = form.assigned_lab_id;

    const response = await apiFetch('/appointments', { method: 'POST', body: createBody });
    if (!response.success) {
      throw new Error((response as any).error || 'Création impossible');
    }

    const id = (response as any).data?.id as string | undefined;
    if (!id) {
      throw new Error('Identifiant du rendez-vous manquant');
    }
    if (selectedPatientId.value !== NEW_PATIENT_VALUE) {
      await copyPatientDocumentsToAppointment(id);
    }
    const hasFormFiles = Object.keys(form.files).some((k) => form.files[k] instanceof File);
    if (hasFormFiles) {
      await uploadFormFilesToAppointment(id);
    }
    toast.add({
      title: 'Rendez-vous créé',
      description: 'Le rendez-vous a été enregistré.',
      color: 'green',
      icon: 'i-lucide-check-circle',
    });
    if (showPrescriptionAfterCreate.value && prescriptionTextDuringCreate.value?.trim()) {
      await generateAndAttachPrescriptionDuringCreate(id);
    }
    await router.push(`${props.basePath}/appointments/${id}`);
    return;
  }

  const batchId = crypto.randomUUID();
  const createdIds: string[] = [];
  const failures: string[] = [];

  for (let i = 0; i < careBlocks.value.length; i++) {
    const block = careBlocks.value[i];
    const rawFormData = mergeFormDataForCareBlock(block, availabilityPayload, filesMeta);
    const categoryId = String(block.category_id || '').trim() || undefined;
    const createBody: Record<string, unknown> = {
      type: form.type,
      form_type: form.type,
      scheduled_at: scheduledAtIso,
      address: addressPayload,
      form_data: rawFormData,
      status: 'pending',
      patient_id: patientId,
      category_id: categoryId,
      creation_batch_id: batchId,
    };
    if (careBlocks.value.length > 1) {
      createBody.creation_batch_size = careBlocks.value.length;
    }
    if (!patientId && form.form_data.email?.trim()) {
      createBody.guest_email = form.form_data.email.trim();
    }
    if (isBloodTestAppointment(form.type) && form.assigned_lab_id) createBody.assigned_lab_id = form.assigned_lab_id;
    if (isNursingAppointment(form.type) && form.assigned_nurse_id) createBody.assigned_nurse_id = form.assigned_nurse_id;

    const response = await apiFetch('/appointments', { method: 'POST', body: createBody });
    if (response.success) {
      const id = (response as any).data?.id as string | undefined;
      if (id) {
        createdIds.push(id);
        if (selectedPatientId.value !== NEW_PATIENT_VALUE) {
          await copyPatientDocumentsToAppointment(id);
        }
        const hasFormFiles = Object.keys(form.files).some((k) => form.files[k] instanceof File);
        if (hasFormFiles) {
          await uploadFormFilesToAppointment(id);
        }
      }
    } else {
      failures.push(`Soin ${i + 1} : ${(response as any).error || 'erreur'}`);
    }
  }

  if (failures.length) {
    toast.add({
      title: createdIds.length ? 'Création partielle' : 'Erreur',
      description: createdIds.length
        ? `${createdIds.length} RDV créé(s). ${failures.join(' ')}`
        : failures.join(' '),
      color: createdIds.length ? 'warning' : 'red',
      icon: 'i-lucide-alert-circle',
    });
  } else {
    toast.add({
      title: 'Rendez-vous créés',
      description: `${createdIds.length} rendez-vous ont été enregistrés.`,
      color: 'green',
      icon: 'i-lucide-check-circle',
    });
  }

  if (createdIds.length) {
    if (showPrescriptionAfterCreate.value && prescriptionTextDuringCreate.value?.trim()) {
      await generateAndAttachPrescriptionDuringCreate(createdIds[0]!);
    }
    const dest =
      createdIds.length > 1
        ? `${props.basePath}/appointments`
        : `${props.basePath}/appointments/${createdIds[0]!}`;
    await router.push(dest);
  } else {
    throw new Error(failures.join(' ') || 'Aucun rendez-vous créé');
  }
}

async function submit() {
  saving.value = true;
  try {
    const clientErr = validateAppointmentFormClient();
    if (clientErr) {
      toast.add({
        title: clientErr.title,
        description: clientErr.description,
        color: 'red',
        icon: 'i-lucide-alert-circle',
      });
      scrollToFormSection(clientErr.sectionId);
      saving.value = false;
      return;
    }

    // Prep Data
    const hour = form.form_data.availability_type === 'custom' ? Math.floor(availabilityRange.value[0]) : 9;
    const scheduledAtStr = form.scheduled_at ? `${form.scheduled_at} ${String(hour).padStart(2, '0')}:00:00` : '';
    const scheduledAtIso = scheduledAtStr ? new Date(scheduledAtStr).toISOString() : undefined;

    const addressPayload =
      form.address?.label?.trim()
        ? {
            label: form.address.label.trim(),
            lat: Number(form.address.lat),
            lng: Number(form.address.lng),
            ...(form.form_data.address_complement?.trim()
              ? { complement: form.form_data.address_complement.trim() }
              : {}),
          }
        : undefined;

    if (!addressPayload) {
      toast.add({
        title: 'Adresse requise',
        description:
          'Choisissez une adresse (recherche) ou un patient dont le dossier contient une adresse. Les coordonnées sont complétées automatiquement quand c’est possible.',
        color: 'red',
      });
      scrollToFormSection('appointment-form-section-address');
      saving.value = false;
      return;
    }
    if (!Number.isFinite(addressPayload.lat) || !Number.isFinite(addressPayload.lng)) {
      toast.add({
        title: 'Adresse incomplète',
        description: 'Sélectionnez une adresse dans la liste de suggestions pour enregistrer la position sur la carte.',
        color: 'red',
      });
      scrollToFormSection('appointment-form-section-address');
      saving.value = false;
      return;
    }

    const filesMeta = Object.keys(form.files).reduce((acc, key) => {
      if (form.files[key]) acc[key] = { field: key, name: form.files[key].name };
      return acc;
    }, {} as Record<string, { field: string; name: string }>);

    // Créneau horaire : construire depuis le slider pour être sûr d'envoyer la valeur actuelle
    const availabilityPayload = form.form_data.availability_type === 'custom'
      ? JSON.stringify({ type: 'custom', range: [Number(availabilityRange.value[0]), Number(availabilityRange.value[1])] })
      : JSON.stringify({ type: 'all_day' });

    if (isCreate.value && multiCareEnabled.value && supportsMultiCareCreate.value) {
      await submitMultiCareBatch(scheduledAtIso, addressPayload, availabilityPayload, filesMeta);
      return;
    }

    const basePayload = {
      type: form.type,
      form_type: form.type,
      scheduled_at: scheduledAtIso,
      address: addressPayload,
      form_data: {
        ...form.form_data,
        category_id: form.form_data.category_id || undefined,
        gender: form.form_data.gender || undefined,
        availability: availabilityPayload,
        files: filesMeta,
        blood_test_type: isBloodTestAppointment(form.type) ? form.form_data.blood_test_type : undefined,
        custom_days: isBloodTestAppointment(form.type) ? form.form_data.custom_days : (isNursingAppointment(form.type) && form.form_data.duration_days === 'custom' ? form.form_data.custom_days : undefined),
        frequency: isNursingAppointment(form.type) ? form.form_data.frequency : undefined,
        preferred_nurse_gender: isNursingAppointment(form.type) ? resolvedPreferredNurseGender() : undefined,
        care_options: form.form_data.care_options && Object.keys(form.form_data.care_options).length ? form.form_data.care_options : undefined,
      }
    };

    const categoryId = form.form_data.category_id || undefined;
    let response;
    if (isCreate.value) {
      let patientId = selectedPatient.value?.id || undefined;

      // Pro (ou admin) + nouveau patient : créer le patient d'abord pour qu'il apparaisse dans "Mes patients"
      const shouldCreatePatient =
        canCreatePatientForAppointment.value &&
        selectedPatientId.value === NEW_PATIENT_VALUE &&
        form.form_data.first_name?.trim() &&
        form.form_data.last_name?.trim() &&
        form.form_data.phone?.trim() &&
        (form.form_data.email?.trim() || isProForm.value);

      if (shouldCreatePatient) {
        const addressForPatient = form.address?.label
          ? { ...form.address, complement: form.form_data.address_complement || undefined }
          : undefined;
        const bodyPatient: Record<string, unknown> = {
          first_name: form.form_data.first_name.trim(),
          last_name: form.form_data.last_name.trim(),
          phone: form.form_data.phone.trim(),
          birth_date: form.form_data.birth_date || undefined,
          gender: form.form_data.gender || undefined,
          address: addressForPatient,
        };
        const em = form.form_data.email?.trim();
        if (em) bodyPatient.email = em;
        const patientRes = await apiFetch('/patients', {
          method: 'POST',
          body: bodyPatient,
        });
        if (patientRes.success && (patientRes as any).data?.id) {
          patientId = (patientRes as any).data.id;
        }
      }

      const createBody: Record<string, unknown> = {
        ...basePayload,
        status: 'pending',
        patient_id: patientId,
        category_id: categoryId,
      };
      // Backend exige patient_id OU guest_email : si toujours pas de patient_id, envoyer guest_email
      if (!patientId && form.form_data.email?.trim()) {
        createBody.guest_email = form.form_data.email.trim();
      }
      if (isBloodTestAppointment(form.type) && form.assigned_lab_id) createBody.assigned_lab_id = form.assigned_lab_id;
      if (isNursingAppointment(form.type) && form.assigned_nurse_id) createBody.assigned_nurse_id = form.assigned_nurse_id;
      response = await apiFetch('/appointments', { method: 'POST', body: createBody });
    } else {
      if (!appointment.value) return;
      response = await apiFetch(`/appointments/${appointment.value.id}`, { 
        method: 'PUT', 
        body: { ...basePayload, status: form.status, category_id: categoryId } 
      });
    }

    if (response.success) {
      const id = (response as any).data?.id || appointment.value?.id;
      if (id) {
        if (isCreate.value) {
          // 1. Copier les documents du patient (fiche) vers le RDV (sauf si admin a uploadé un nouveau fichier)
          if (selectedPatientId.value !== NEW_PATIENT_VALUE) {
            await copyPatientDocumentsToAppointment(id);
          }
        }
        // 2. Uploader les fichiers du formulaire (création ou édition : nouveau patient, remplacement, ou ajout)
        const hasFormFiles = Object.keys(form.files).some((k) => form.files[k] instanceof File);
        if (hasFormFiles) {
          await uploadFormFilesToAppointment(id);
        }
      }
      toast.add({ title: isCreate.value ? 'Rendez-vous créé' : 'Modifications enregistrées', color: 'green', icon: 'i-lucide-check-circle' });
      if (id) {
        if (isCreate.value && showPrescriptionAfterCreate.value && prescriptionTextDuringCreate.value?.trim()) {
          await generateAndAttachPrescriptionDuringCreate(id);
        }
        await router.push(`${props.basePath}/appointments/${id}`);
      }
    } else {
      throw new Error((response as any).error);
    }

  } catch (e: any) {
    const msg = String(e?.message || 'Une erreur est survenue');
    toast.add({ title: 'Erreur', description: msg, color: 'red' });
    const inferred = inferSectionFromErrorMessage(msg);
    if (inferred) scrollToFormSection(inferred);
  } finally {
    saving.value = false;
  }
}

// --- WATCHERS ---

watch(() => form.form_data.category_id, (newId, oldId) => {
  loadCategoryOptionsForCare(newId || '');
  if (oldId !== undefined && newId !== oldId) {
    form.form_data.care_options = {};
  }
});

watch(multiCareEnabled, (on) => {
  if (!supportsMultiCareCreate.value) return;
  if (on) {
    careBlocks.value = [
      {
        ...makeCareBlock(),
        category_id: String(form.form_data.category_id || ''),
        blood_test_type: form.form_data.blood_test_type as 'single' | 'multiple',
        duration_days: form.form_data.duration_days,
        custom_days: form.form_data.custom_days,
        frequency: form.form_data.frequency,
        care_options: { ...form.form_data.care_options },
        preferred_nurse_gender: form.form_data.preferred_nurse_gender as 'any' | 'female' | 'male',
      },
    ];
  } else if (careBlocks.value[0]) {
    const b = careBlocks.value[0];
    form.form_data.category_id = b.category_id;
    form.form_data.blood_test_type = b.blood_test_type;
    form.form_data.duration_days = b.duration_days;
    form.form_data.custom_days = b.custom_days;
    form.form_data.frequency = b.frequency;
    form.form_data.care_options = { ...b.care_options };
    form.form_data.preferred_nurse_gender = b.preferred_nurse_gender;
    loadCategoryOptionsForCare(form.form_data.category_id || '');
  }
});

watch(
  () => careBlocks.value.map((b) => b.category_id),
  (newIds, oldIds) => {
    if (!multiCareEnabled.value || !oldIds?.length) return;
    newIds.forEach((id, i) => {
      if (oldIds[i] !== id && careBlocks.value[i]) {
        careBlocks.value[i].care_options = {};
      }
    });
  },
);

watch(selectedPatientId, async (id) => {
  if (id === NEW_PATIENT_VALUE || !id) {
    clearPatient();
  } else {
    const p = patients.value.find((x) => String(x.id) === id);
    if (p) await selectPatient(p);
  }
});

async function runPatientEmailLookup(emailTrim: string) {
  if (!isCreate.value || selectedPatientId.value !== NEW_PATIENT_VALUE) return;
  if (!canCreatePatientForAppointment.value) return;
  if (!(isProForm.value || isNurseForm.value || isLabForm.value || isSubaccountForm.value || props.basePath === '/admin')) return;
  emailLookupLoading.value = true;
  try {
    const res = await apiFetch(`/patients/lookup?email=${encodeURIComponent(emailTrim)}`, { method: 'GET' });
    if (res?.success && (res as any).data?.id) {
      const row = (res as any).data;
      skipEmailLookupOnce.value = true;
      selectedPatientId.value = String(row.id);
      await selectPatient(row);
      if (!patients.value.some((x) => String(x.id) === String(row.id))) {
        patients.value = [...patients.value, row];
      }
      toast.add({
        title: 'Patient existant',
        description: 'Un compte avec cet e-mail a été trouvé — données préremplies.',
        color: 'green',
        icon: 'i-lucide-user-check',
      });
    }
  } catch {
    /* silencieux */
  } finally {
    emailLookupLoading.value = false;
  }
}

watch(
  () => form.form_data.email,
  (em) => {
    if (!isCreate.value || selectedPatientId.value !== NEW_PATIENT_VALUE) return;
    if (!canCreatePatientForAppointment.value) return;
    if (!(isProForm.value || isNurseForm.value || isLabForm.value || isSubaccountForm.value || props.basePath === '/admin')) return;
    if (skipEmailLookupOnce.value) {
      skipEmailLookupOnce.value = false;
      return;
    }
    if (emailLookupTimer) {
      clearTimeout(emailLookupTimer);
      emailLookupTimer = null;
    }
    const t = (em || '').trim();
    if (!t || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return;
    emailLookupTimer = setTimeout(() => {
      emailLookupTimer = null;
      runPatientEmailLookup(t);
    }, 400);
  }
);

watch([birthYear, birthMonth, birthDay], () => {
  if (birthYear.value && birthMonth.value && birthDay.value) {
    form.form_data.birth_date = `${birthYear.value}-${String(birthMonth.value).padStart(2, '0')}-${String(birthDay.value).padStart(2, '0')}`;
  } else {
    form.form_data.birth_date = '';
  }
});

// Update Availability JSON string when inputs change
watch([() => form.form_data.availability_type, availabilityRange], () => {
  if (form.form_data.availability_type === 'custom') {
    form.form_data.availability = JSON.stringify({ type: 'custom', range: availabilityRange.value });
  } else {
    form.form_data.availability = JSON.stringify({ type: 'all_day' });
  }
}, { deep: true });

// Écart minimum entre les deux poignées du slider
watch(availabilityRange, (newVal) => {
  if (form.form_data.availability_type !== 'custom') return;
  const [start, end] = newVal;
  if (end - start < AVAILABILITY_MIN_SPAN_HOURS) {
    const [prevStart, prevEnd] = previousAvailabilityRange.value;
    if (Math.abs(end - prevEnd) > Math.abs(start - prevStart)) {
      availabilityRange.value = [Math.max(6, end - AVAILABILITY_MIN_SPAN_HOURS), end];
    } else {
      availabilityRange.value = [start, Math.min(availabilitySliderMax.value, start + AVAILABILITY_MIN_SPAN_HOURS)];
    }
  }
  previousAvailabilityRange.value = [...availabilityRange.value];
}, { deep: true });

/** Ligne « mon laboratoire » pour le sélecteur d’assignation (complété par GET /lab/subaccounts). */
function buildLabSelfRow(): Record<string, string> | null {
  if (!user.value?.id) return null;
  return {
    id: user.value.id,
    company_name: (user.value as any).company_name || '',
    first_name: '',
    last_name: '',
    email: (user.value as any).email || '',
  };
}

// --- LIFECYCLE ---
onMounted(async () => {
  if (isCreate.value) {
    if (isLabForm.value || isSubaccountForm.value) {
      form.type = 'blood_test';
      if (user.value?.id && isSubaccountForm.value) {
        form.assigned_lab_id = user.value.id;
      }
    } else if (isNurseForm.value) {
      form.type = 'nursing';
    }
    loadCategories(form.type === 'nursing' ? 'nursing' : 'blood_test');
    /** Plusieurs soins (même patient, même créneau) : activé par défaut pour la création infirmier. */
    if (isCreate.value && isNurseForm.value && supportsMultiCareCreate.value) {
      multiCareEnabled.value = true;
    }
    await fetchPatients();
    const patientIdFromQueryCreate = route.query.patient_id as string | undefined;
    if (patientIdFromQueryCreate && patients.value.length > 0) {
      const p = patients.value.find((x) => String(x.id) === String(patientIdFromQueryCreate));
      if (p) await selectPatient(p);
    }
    labsLoading.value = true;
    nursesLoading.value = true;
    try {
      if (isLabForm.value && user.value?.id) {
        const subRes = await apiFetch('/lab/subaccounts?limit=100', { method: 'GET' });
        const subs = subRes.success && subRes.data ? (subRes.data as any[]) : [];
        const selfRow = buildLabSelfRow();
        labs.value = selfRow ? [selfRow, ...subs] : subs;
        form.assigned_lab_id = user.value.id;
        nurses.value = [];
      } else if (isSubaccountForm.value) {
        labs.value = [];
        nurses.value = [];
      } else {
        const [labRes, subRes, nurseRes] = await Promise.all([
          apiFetch('/users?role=lab&limit=500', { method: 'GET' }),
          apiFetch('/users?role=subaccount&limit=500', { method: 'GET' }),
          apiFetch('/users?role=nurse&limit=500', { method: 'GET' }),
        ]);
        labs.value = [
          ...(labRes.success && labRes.data ? (labRes.data as any[]) : []),
          ...(subRes.success && subRes.data ? (subRes.data as any[]) : []),
        ];
        nurses.value = nurseRes.success && nurseRes.data ? (nurseRes.data as any[]) : [];
      }
    } catch (e) {
      console.error('Erreur chargement labos/infirmiers:', e);
    } finally {
      labsLoading.value = false;
      nursesLoading.value = false;
    }
  } else if (props.appointmentId) {
    await fetchPatients();
    await loadAppointment();
    labsLoading.value = true;
    nursesLoading.value = true;
    try {
      if (isLabForm.value && user.value?.id) {
        const subRes = await apiFetch('/lab/subaccounts?limit=100', { method: 'GET' });
        const subs = subRes.success && subRes.data ? (subRes.data as any[]) : [];
        const selfRow = buildLabSelfRow();
        labs.value = selfRow ? [selfRow, ...subs] : subs;
        nurses.value = [];
      } else if (isSubaccountForm.value) {
        labs.value = [];
        nurses.value = [];
      } else {
        const [labRes, subRes, nurseRes] = await Promise.all([
          apiFetch('/users?role=lab&limit=500', { method: 'GET' }),
          apiFetch('/users?role=subaccount&limit=500', { method: 'GET' }),
          apiFetch('/users?role=nurse&limit=500', { method: 'GET' }),
        ]);
        labs.value = [
          ...(labRes.success && labRes.data ? (labRes.data as any[]) : []),
          ...(subRes.success && subRes.data ? (subRes.data as any[]) : []),
        ];
        nurses.value = nurseRes.success && nurseRes.data ? (nurseRes.data as any[]) : [];
      }
    } catch (e) {
      console.error('Erreur chargement labos/infirmiers:', e);
    } finally {
      labsLoading.value = false;
      nursesLoading.value = false;
    }
  }
});
</script>

