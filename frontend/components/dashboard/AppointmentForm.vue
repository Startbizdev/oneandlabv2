<template>
  <div class="min-h-full bg-gray-50/50 dark:bg-gray-950 pb-20">
    <!-- Header séparateur collé en haut sans marge (comme admin/users) -->
    <div class="-mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div class="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <UButton
            to="/admin/appointments"
            variant="ghost"
            color="gray"
            size="sm"
            icon="i-lucide-arrow-left"
            :aria-label="isCreate ? 'Retour' : 'Retour à la liste'"
          />
          <div class="min-w-0">
            <h1 class="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
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
          <UButton v-if="isEdit && appointmentId" :to="`/admin/appointments/${appointmentId}`" variant="ghost" color="gray" size="sm">
            Voir détail
          </UButton>
          <UButton type="button" variant="ghost" color="gray" to="/admin/appointments" class="hidden sm:inline-flex">Annuler</UButton>
          <UButton type="submit" color="primary" :loading="saving" icon="i-lucide-check" size="sm" @click="submit">
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
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Rendez-vous introuvable</h3>
        <p class="text-gray-500 mb-6">Ce rendez-vous n'existe pas ou a été supprimé.</p>
        <UButton to="/admin/appointments" color="gray" variant="solid">Retour à la liste</UButton>
      </div>

      <form v-else-if="isCreate || (isEdit && appointment)" @submit.prevent="submit" class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div class="lg:col-span-7 space-y-6">
          
          <section v-if="isCreate" class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
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
                :search-input="{ placeholder: 'Rechercher...' }"
                :filter-fields="['label']"
                icon="i-lucide-user"
              >
                <template #label>
                  <span v-if="selectedPatientId === NEW_PATIENT_VALUE" class="text-primary-600 font-medium">✨ Nouveau patient</span>
                  <span v-else>{{ patientSelectItems.find(i => i.value === selectedPatientId)?.label }}</span>
                </template>
              </USelectMenu>
            </UFormField>
          </section>

          <section class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
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
                 <UFormField label="Email" name="email" required>
                  <UInput v-model="form.form_data.email" type="email" icon="i-lucide-mail" placeholder="email@exemple.fr" size="md" class="w-full" />
                </UFormField>
                <UFormField label="Téléphone" name="phone" required>
                  <UInput v-model="form.form_data.phone" type="tel" icon="i-lucide-phone" placeholder="06 12 34 56 78" size="md" class="w-full" />
                </UFormField>
              </div>
            </div>
          </section>

          <section class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UIcon name="i-lucide-clipboard-list" class="w-5 h-5 text-primary-500 shrink-0" />
              Nature de l'intervention
            </h2>

            <div class="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 mb-4">
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

            <div class="space-y-4">
              <UFormField :label="form.type === 'blood_test' ? 'Type d\'analyse' : 'Type de soin'" name="category_id" required>
                <USelectMenu 
                  v-model="form.form_data.category_id" 
                  :items="categoryOptions" 
                  value-key="value" 
                  searchable
                  placeholder="Sélectionner dans la liste..." 
                  size="md" 
                  class="w-full min-w-0"
                />
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
                  <p v-if="form.form_data.blood_test_type === 'single'" class="text-xs text-gray-500 mt-1.5">Une seule prise de sang</p>
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
                  <UFormField label="Durée estimée" name="duration_days">
                    <USelect v-model="form.form_data.duration_days" :items="nursingDurationOptions" placeholder="Sélectionner" class="w-full" />
                  </UFormField>
                  
                  <UFormField v-if="form.form_data.duration_days && form.form_data.duration_days !== '1'" label="Fréquence de passage" name="frequency">
                    <USelect v-model="form.form_data.frequency" :items="frequencyOptions" placeholder="Sélectionner" class="w-full" />
                  </UFormField>
                </div>
              </template>
            </div>
          </section>

          <section class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
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
          
          <section class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
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
                    <span class="text-xs uppercase tracking-wide text-gray-400 font-bold">Heure</span>
                    <span class="text-lg font-mono font-bold text-primary-600">
                      {{ formatTime(availabilityRange[0]) }} - {{ formatTime(availabilityRange[1]) }}
                    </span>
                  </div>
                  <USlider v-model="availabilityRange" :min="8" :max="17" :step="1" color="primary" />
                  <div class="flex justify-between text-[10px] text-gray-400 mt-2 font-mono">
                    <span>08:00</span>
                    <span>12:00</span>
                    <span>17:00</span>
                  </div>
                  <p v-if="availabilityRange[1] - availabilityRange[0] < 2" class="text-xs text-orange-500 mt-2 flex items-center gap-1">
                    <UIcon name="i-lucide-alert-triangle" class="w-3 h-3" /> Minimum 2h d'écart recommandé
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

          <section v-if="form.type === 'blood_test'" class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UIcon name="i-lucide-flask-conical" class="w-5 h-5 text-primary-500 shrink-0" />
              Assigner à un laboratoire
            </h2>
            <UFormField label="Laboratoire" name="assigned_lab_id" help="Optionnel : assignez ce RDV à un labo pour la prise de sang.">
              <USelectMenu
                v-model="form.assigned_lab_id"
                :items="labSelectItems"
                value-key="value"
                placeholder="Rechercher un laboratoire..."
                size="md"
                class="w-full"
                :loading="labsLoading"
                :search-input="{ placeholder: 'Nom, email...' }"
                :filter-fields="['label']"
              />
            </UFormField>
          </section>

          <section v-else-if="form.type === 'nursing'" class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
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
              />
            </UFormField>
          </section>

          <section class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
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

          <section class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <UIcon name="i-lucide-file-up" class="w-5 h-5 text-primary-500 shrink-0" />
              Documents requis
            </h2>
            <p class="text-xs text-gray-500 mb-4 ml-7">Glissez les fichiers ou cliquez pour importer.</p>
            
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
                      : (form.files[doc.key] || (isEdit && existingFileNames[doc.key])) 
                        ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-900/10' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  ]"
                  @click="triggerFileInput(doc.key)"
                >
                  <div 
                    class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                    :class="[
                       (form.files[doc.key] || (isEdit && existingFileNames[doc.key])) ? 'bg-green-100 text-green-600' : doc.iconBg + ' ' + doc.iconColor
                    ]"
                  >
                     <UIcon :name="doc.icon" class="w-5 h-5" />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ doc.label }}</p>
                    <p v-if="form.files[doc.key]" class="text-xs text-green-600 font-medium truncate">{{ form.files[doc.key].name }}</p>
                    <p v-else-if="isEdit && existingFileNames[doc.key]" class="text-xs text-green-600/80 truncate">Fichier existant</p>
                    <p v-else class="text-xs text-gray-400 group-hover:text-primary-500 transition-colors">Ajouter un fichier</p>
                  </div>

                  <div v-if="form.files[doc.key]" class="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500" @click.stop="delete form.files[doc.key]">
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
              class="w-full !py-4 text-base font-semibold"
            >
              {{ isCreate ? 'Créer le rendez-vous' : 'Enregistrer les modifications' }}
            </UButton>
          </div>

        </div>

        <div class="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200 dark:border-gray-800 sm:hidden z-40 flex gap-3">
          <UButton block variant="soft" color="gray" to="/admin/appointments" class="flex-1">Annuler</UButton>
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
import type { Address, Appointment } from '~/types/appointments';

// --- TYPES & INTERFACES ---
type ServiceType = 'blood_test' | 'nursing';
type StatusType = 'pending' | 'confirmed' | 'inProgress' | 'completed' | 'canceled' | 'expired' | 'refused';

interface SelectOption { label: string; value: string | number }

// --- PROPS ---
const props = defineProps<{
  mode: 'create' | 'edit';
  appointmentId?: string;
}>();

// --- CONSTANTS & OPTIONS (Static) ---
const NEW_PATIENT_VALUE = '__new_patient__';

const serviceTypes = [
  { value: 'blood_test', label: 'Prise de sang', description: 'Prélèvements à domicile', icon: 'i-lucide-droplet' },
  { value: 'nursing', label: 'Soins infirmiers', description: 'Pansements, injections...', icon: 'i-lucide-stethoscope' },
];

const documentTypes = [
  { key: 'carte_vitale', label: 'Carte Vitale', icon: 'i-lucide-credit-card', iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  { key: 'carte_mutuelle', label: 'Mutuelle', icon: 'i-lucide-shield', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  { key: 'ordonnance', label: 'Ordonnance', icon: 'i-lucide-file-text', iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400' },
  { key: 'autres_assurances', label: 'Autre doc.', icon: 'i-lucide-folder', iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
];

const genderOptions = [{ label: 'Homme', value: 'male' }, { label: 'Femme', value: 'female' }, { label: 'Autre', value: 'other' }];

const statusOptions = [
  { label: 'En attente', value: 'pending' }, { label: 'Confirmé', value: 'confirmed' }, { label: 'En cours', value: 'inProgress' },
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
const yearOptions = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => ({ label: String(1920 + i), value: 1920 + i })).reverse();

const bloodTestTypeOptions = [
  { label: 'Unique', value: 'single', description: 'Une seule prise de sang' },
  { label: 'Série', value: 'multiple', description: 'Plusieurs prélèvements sur plusieurs jours' },
];
const multipleDaysOptions = [{ label: '2 jours', value: '2' }, { label: '3 jours', value: '3' }, { label: '5 jours', value: '5' }, { label: '7 jours', value: '7' }, { label: '10 jours', value: '10' }, { label: 'Personnalisé', value: 'custom' }];
const nursingDurationOptions = [{ label: 'Ponctuel (1 jour)', value: '1' }, { label: 'Semaine (7 jours)', value: '7' }, { label: '15 jours', value: '15' }, { label: '1 mois', value: '30' }, { label: 'Longue durée (60+)', value: '60+' }];
const frequencyOptions = [{ label: 'Quotidien', value: 'daily' }, { label: '1j sur 2', value: 'every_other_day' }, { label: '2x / semaine', value: 'twice_weekly' }, { label: '3x / semaine', value: 'thrice_weekly' }];

// --- COMPOSABLES ---
const router = useRouter();
const toast = useToast();

// --- STATE ---
const isCreate = computed(() => props.mode === 'create');
const isEdit = computed(() => props.mode === 'edit');

const loading = ref(false);
const saving = ref(false);
const appointment = ref<Appointment | null>(null);

// Patient Data
const patients = ref<any[]>([]);
const patientsLoading = ref(false);
const selectedPatient = ref<any>(null);
const selectedPatientId = ref<string>(NEW_PATIENT_VALUE);

// Form Data
const categoryOptions = ref<SelectOption[]>([]);
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
  },
});

// UI State
const draggedOver = ref<string | null>(null);
const fileInputRefs: Record<string, HTMLInputElement | null> = {};

// --- COMPUTED ---
const patientSelectItems = computed(() => {
  const valid = patients.value.filter((p) => p.id != null);
  return [
    { label: '— Nouveau patient (Saisie manuelle)', value: NEW_PATIENT_VALUE },
    ...valid.map((p) => ({ 
      label: `${p.last_name?.toUpperCase() || ''} ${p.first_name || ''} (${p.email})`, 
      value: String(p.id) 
    })),
  ];
});

const existingFileNames = computed(() => {
  if (!isEdit.value || !appointment.value?.form_data?.files) return {};
  const files = appointment.value.form_data.files as Record<string, { name?: string; file_name?: string }>;
  return Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v?.name ?? v?.file_name ?? '']));
});

const labSelectItems = computed(() =>
  labs.value.map((p) => ({
    label: `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || p.email || p.id,
    value: p.id,
  }))
);
const nurseSelectItems = computed(() =>
  nurses.value.map((p) => ({
    label: `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || p.email || p.id,
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
    case 'confirmed': return 'bg-green-500';
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
function processFile(file: File, key: string) {
  if (file.size > 10 * 1024 * 1024) {
    toast.add({ title: 'Fichier trop volumineux', description: 'Max 10 Mo', color: 'red', icon: 'i-lucide-alert-circle' });
    return;
  }
  form.files[key] = file;
  toast.add({ title: 'Fichier ajouté', description: file.name, color: 'green', icon: 'i-lucide-check', timeout: 2000 });
}

// Form Logic
function selectPatient(p: any) {
  selectedPatient.value = p;
  selectedPatientId.value = p?.id ?? NEW_PATIENT_VALUE;
  
  // Auto-fill
  form.form_data.first_name = p.first_name || '';
  form.form_data.last_name = p.last_name || '';
  form.form_data.email = p.email || '';
  form.form_data.phone = p.phone || '';
  form.form_data.gender = (p.gender as any) || '';
  form.form_data.address_complement = (p.address as any)?.complement || '';
  
  if (p.birth_date) {
    const [y, m, d] = p.birth_date.split('-');
    if (y && m && d) {
      birthYear.value = parseInt(y);
      birthMonth.value = parseInt(m);
      birthDay.value = parseInt(d);
    }
  } else {
    resetBirthDate();
  }

  if (p.address) {
    form.address = typeof p.address === 'object' 
      ? { label: p.address.label || '', lat: p.address.lat || 0, lng: p.address.lng || 0 }
      : null;
  }
}

function clearPatient() {
  selectedPatient.value = null;
  selectedPatientId.value = NEW_PATIENT_VALUE;
  form.form_data.first_name = '';
  form.form_data.last_name = '';
  form.form_data.email = '';
  form.form_data.phone = '';
  form.form_data.gender = '';
  form.address = null;
  form.form_data.address_complement = '';
  resetBirthDate();
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
  if (form.type === 'blood_test') {
    form.form_data.frequency = '';
    form.form_data.blood_test_type = 'single';
  } else {
    form.form_data.blood_test_type = '';
    form.form_data.duration_days = '';
    form.form_data.custom_days = null;
  }
}

// API Calls
async function loadCategories(type: 'blood_test' | 'nursing') {
  try {
    const res = await apiFetch(`/categories?type=${type}`, { method: 'GET' });
    if (res.success && Array.isArray(res.data)) {
      categoryOptions.value = (res.data as Array<{ id: string; name: string }>).map((c) => ({ label: c.name, value: String(c.id) }));
    } else {
      categoryOptions.value = [];
    }
  } catch {
    categoryOptions.value = [];
  }
}

async function fetchPatients() {
  patientsLoading.value = true;
  try {
    const res = await apiFetch('/users?limit=300', { method: 'GET' });
    if (res.success && Array.isArray(res.data)) {
      patients.value = (res.data as any[]).filter((u) => u.role === 'patient');
    }
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
      form.form_data.category_id = fd.category_id ?? data.category_id ?? '';
      form.form_data.duration_days = fd.duration_days ?? '';
      form.form_data.frequency = fd.frequency ?? '';
      form.form_data.notes = fd.notes ?? '';
      form.form_data.blood_test_type = fd.blood_test_type ?? 'single';
      form.form_data.custom_days = fd.custom_days ?? null;
      
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
             availabilityRange.value = [av.range[0], av.range[1]];
             previousAvailabilityRange.value = [...availabilityRange.value];
          }
        } catch {}
      } else if (data.scheduled_at) {
        const h = new Date(data.scheduled_at).getHours();
        const start = Math.max(8, Math.min(15, h));
        availabilityRange.value = [start, start + 2];
      }

      await loadCategories(appType);
    }
  } catch (e) {
    toast.add({ title: 'Erreur', description: 'Impossible de charger le rendez-vous', color: 'red' });
  } finally {
    loading.value = false;
  }
}

async function submit() {
  saving.value = true;
  try {
    // Prep Data
    const hour = form.form_data.availability_type === 'custom' ? Math.floor(availabilityRange.value[0]) : 9;
    const scheduledAtStr = form.scheduled_at ? `${form.scheduled_at} ${String(hour).padStart(2, '0')}:00:00` : '';
    const scheduledAtIso = scheduledAtStr ? new Date(scheduledAtStr).toISOString() : undefined;
    
    const addressPayload = form.address?.label 
      ? { ...form.address, complement: form.form_data.address_complement || undefined } 
      : undefined;

    const filesMeta = Object.keys(form.files).reduce((acc, key) => {
      if (form.files[key]) acc[key] = { field: key, name: form.files[key].name };
      return acc;
    }, {} as Record<string, { field: string; name: string }>);

    // Créneau horaire : construire depuis le slider pour être sûr d'envoyer la valeur actuelle
    const availabilityPayload = form.form_data.availability_type === 'custom'
      ? JSON.stringify({ type: 'custom', range: [Number(availabilityRange.value[0]), Number(availabilityRange.value[1])] })
      : JSON.stringify({ type: 'all_day' });

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
        // Specifics cleanup
        blood_test_type: form.type === 'blood_test' ? form.form_data.blood_test_type : undefined,
        custom_days: form.type === 'blood_test' ? form.form_data.custom_days : undefined,
        frequency: form.type === 'nursing' ? form.form_data.frequency : undefined,
      }
    };

    let response;
    if (isCreate.value) {
      const createBody: Record<string, unknown> = {
        ...basePayload,
        status: 'pending',
        patient_id: selectedPatient.value?.id || undefined,
      };
      if (form.type === 'blood_test' && form.assigned_lab_id) createBody.assigned_lab_id = form.assigned_lab_id;
      if (form.type === 'nursing' && form.assigned_nurse_id) createBody.assigned_nurse_id = form.assigned_nurse_id;
      response = await apiFetch('/appointments', { method: 'POST', body: createBody });
    } else {
      if (!appointment.value) return;
      response = await apiFetch(`/appointments/${appointment.value.id}`, { 
        method: 'PUT', 
        body: { ...basePayload, status: form.status } 
      });
    }

    if (response.success) {
      toast.add({ title: isCreate.value ? 'Rendez-vous créé' : 'Modifications enregistrées', color: 'green', icon: 'i-lucide-check-circle' });
      const id = (response as any).data?.id || appointment.value?.id;
      if (id) await router.push(`/admin/appointments/${id}`);
    } else {
      throw new Error((response as any).error);
    }

  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e.message || 'Une erreur est survenue', color: 'red' });
  } finally {
    saving.value = false;
  }
}

// --- WATCHERS ---

watch(selectedPatientId, (id) => {
  if (id === NEW_PATIENT_VALUE || !id) {
    clearPatient();
  } else {
    const p = patients.value.find((x) => String(x.id) === id);
    if (p) selectPatient(p);
  }
});

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

// Prevent Slider Collisions (Min gap 2h)
watch(availabilityRange, (newVal) => {
  if (form.form_data.availability_type !== 'custom') return;
  const [start, end] = newVal;
  if (end - start < 2) {
    const [prevStart, prevEnd] = previousAvailabilityRange.value;
    if (Math.abs(end - prevEnd) > Math.abs(start - prevStart)) {
      availabilityRange.value = [Math.max(8, end - 2), end];
    } else {
      availabilityRange.value = [start, Math.min(17, start + 2)];
    }
  }
  previousAvailabilityRange.value = [...availabilityRange.value];
}, { deep: true });

// --- LIFECYCLE ---
onMounted(async () => {
  if (isCreate.value) {
    loadCategories('blood_test');
    fetchPatients();
    labsLoading.value = true;
    nursesLoading.value = true;
    try {
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
    } catch (e) {
      console.error('Erreur chargement labos/infirmiers:', e);
    } finally {
      labsLoading.value = false;
      nursesLoading.value = false;
    }
  } else if (props.appointmentId) {
    await loadAppointment();
    labsLoading.value = true;
    nursesLoading.value = true;
    try {
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
    } catch (e) {
      console.error('Erreur chargement labos/infirmiers:', e);
    } finally {
      labsLoading.value = false;
      nursesLoading.value = false;
    }
  }
});
</script>

