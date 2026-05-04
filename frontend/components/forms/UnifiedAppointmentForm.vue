<template>
  <UForm :state="form" @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Champs spécifiques par soin -->
    <UCard
      v-for="(svc, idx) in renderedServices"
      :id="`wizard-rdv-service-${svc.id}`"
      :key="svc.id"
      class="rounded-2xl border border-gray-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
    >
      <template #header>
        <div class="flex items-center gap-3">
          <div :class="['w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', isBloodTestAppointment(svc.type) ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600']">
            <UIcon :name="svc.icon || (isBloodTestAppointment(svc.type) ? 'i-lucide-droplet' : 'i-lucide-heart-pulse')" class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white truncate">
              {{ isUnifiedBloodTest ? 'Prise de sang à domicile' : svc.name }}
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ isUnifiedBloodTest ? `${selectedServices.length} actes regroupés en une seule visite` : (selectedServices.length > 1 ? `Rendez-vous #${idx + 1}` : 'Rendez-vous') }}
              <span class="mx-1">·</span>
              {{ isBloodTestAppointment(svc.type) ? 'Laboratoire' : 'Soins infirmiers' }}
            </p>
          </div>
        </div>
      </template>

      <div
        v-if="isUnifiedBloodTest"
        class="mb-4 rounded-2xl border border-red-100 bg-red-50/60 p-4 dark:border-red-900/40 dark:bg-red-950/20"
      >
        <p class="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
          Actes inclus dans cette visite
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UBadge
            v-for="service in selectedServices"
            :key="service.id"
            color="error"
            variant="subtle"
            class="max-w-full"
          >
            <span class="truncate">{{ service.name }}</span>
          </UBadge>
        </div>
      </div>

      <!-- Date et créneaux par soin (toujours dans la carte) -->
      <div class="space-y-4 mb-4">
        <UFormField :label="'Date souhaitée'" :name="`scheduled_at_${svc.id}`" required>
          <DatePicker
            v-model="formDataByService[svc.id].scheduled_at"
            placeholder="Sélectionner une date"
            :appointment-type="isBloodTestAppointment(svc.type) ? 'lab' : 'nurse'"
            :min-lead-time-hours="minLeadTimeHours ?? undefined"
            :accept-saturday="acceptSaturday !== false"
            :accept-sunday="acceptSunday !== false"
          />
        </UFormField>
        <UAlert
          v-if="servicePremiumDayKind(svc.id)"
          color="warning"
          variant="soft"
          icon="i-lucide-calendar-clock"
          class="mt-3 rounded-xl"
          :title="servicePremiumDayAlertTitle(svc.id)"
        >
          <template #description>
            <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {{ servicePremiumDayAlertDescription(svc.id) }}
            </p>
          </template>
        </UAlert>
        <UFormField :label="'Disponibilités horaires'" :name="`availability_${svc.id}`" required>
          <div class="space-y-4">
            <USelect v-model="formDataByService[svc.id].availability_type" :items="availabilityTypeOptions" placeholder="Choisissez" size="xl" class="w-full" />
            <div v-if="formDataByService[svc.id].availability_type === 'custom'" class="space-y-2">
              <div
                class="rounded-xl border border-blue-100/90 bg-gradient-to-br from-sky-50/90 via-white to-indigo-50/70 p-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:rounded-2xl sm:p-4 dark:border-blue-900/40 dark:from-slate-900/50 dark:via-slate-900/30 dark:to-indigo-950/30"
              >
                <div class="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div class="min-w-0">
                    <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Créneau souhaité</p>
                    <p class="text-base font-semibold tabular-nums text-slate-900 dark:text-white sm:text-lg">
                      {{ formatAvailabilityRangeLabel(formDataByService[svc.id].availabilityRange) }}
                    </p>
                  </div>
                  <div class="-mx-1 flex gap-1.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
                    <button
                      v-for="preset in availabilityPresetsFor(svc)"
                      :key="preset.label"
                      type="button"
                      class="shrink-0 rounded-full border border-slate-200/90 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/80 sm:px-3 sm:py-1.5 sm:text-xs dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-blue-950/40"
                      @click="applyAvailabilityPreset(svc.id, preset.range)"
                    >
                      {{ preset.label }}
                    </button>
                  </div>
                </div>
                <div class="mt-3 sm:mt-4">
                  <div
                    class="mb-2 flex flex-wrap justify-between gap-x-1 gap-y-0.5 px-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500"
                  >
                    <span>6h</span>
                    <span class="hidden sm:inline">9h</span>
                    <span>12h</span>
                    <span class="hidden md:inline">15h</span>
                    <span>17h</span>
                    <template v-if="!isBloodTestAppointment(svc.type)">
                      <span class="hidden lg:inline">20h</span>
                      <span>22h</span>
                    </template>
                  </div>
                  <USlider
                    v-model="formDataByService[svc.id].availabilityRange"
                    :min="6"
                    :max="availabilityMaxHour(svc.type)"
                    :step="1"
                    color="primary"
                    size="xl"
                    class="w-full touch-manipulation py-1"
                    :ui="{
                      thumb: 'size-6 ring-2 shadow-md sm:size-6',
                      track: 'h-3.5 sm:h-4',
                    }"
                  />
                  <div class="mt-1.5 flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span>Début</span>
                    <span>Fin</span>
                  </div>
                </div>
              </div>
              <p
                v-if="getServiceAvailabilityRange(svc.id) && getServiceAvailabilityRange(svc.id)![1] - getServiceAvailabilityRange(svc.id)![0] < AVAILABILITY_MIN_SPAN_HOURS"
                class="text-xs text-error-500"
              >
                L'écart minimum est de {{ AVAILABILITY_MIN_SPAN_HOURS }} h
              </p>
            </div>
          </div>
        </UFormField>
      </div>

      <!-- Sous-choix dynamiques par catégorie (avant Prise en charge) -->
      <div v-if="getCategoryOptions(svc.id).length" class="space-y-4 mb-4">
        <template v-for="opt in getCategoryOptions(svc.id)" :key="`${svc.id}-${opt.option_key}`">
          <UFormField v-if="opt.field_type === 'select'" :label="opt.label" :name="`care_${svc.id}_${opt.option_key}`" :required="!!opt.is_required">
            <USelect
              v-model="formDataByService[svc.id].care_options![opt.option_key]"
              :items="(opt.options || []).map(o => ({ label: o.label, value: o.value }))"
              value-key="value"
              placeholder="Choisir"
              size="xl"
              class="w-full"
            />
          </UFormField>
          <UFormField v-else-if="opt.field_type === 'text'" :label="opt.label" :name="`care_${svc.id}_${opt.option_key}`" :required="!!opt.is_required">
            <UInput v-model="formDataByService[svc.id].care_options![opt.option_key]" placeholder="" size="xl" class="w-full" />
          </UFormField>
          <UFormField v-else-if="opt.field_type === 'number'" :label="opt.label" :name="`care_${svc.id}_${opt.option_key}`" :required="!!opt.is_required">
            <UInput v-model.number="formDataByService[svc.id].care_options![opt.option_key]" type="number" placeholder="" size="xl" class="w-full" />
          </UFormField>
        </template>
      </div>

      <!-- Champs Lab -->
      <div v-if="isBloodTestAppointment(svc.type)" class="space-y-4">
        <UFormField label="Type de prélèvement" :name="`blood_test_type_${svc.id}`" required>
          <URadioGroup v-model="formDataByService[svc.id].blood_test_type" :items="bloodTestTypeOptions" size="xl" variant="list" />
        </UFormField>
        <UFormField v-if="formDataByService[svc.id].blood_test_type === 'multiple'" label="Nombre de jours" :name="`duration_days_${svc.id}`" required>
          <div class="space-y-3">
            <URadioGroup v-model="formDataByService[svc.id].duration_days" :items="multipleDaysOptions" size="xl" variant="list" />
            <UInput
              v-if="formDataByService[svc.id].duration_days === 'custom'"
              v-model.number="formDataByService[svc.id].custom_days"
              type="number"
              placeholder="Nombre de jours"
              min="1"
              size="xl"
              class="w-full"
            />
          </div>
        </UFormField>
      </div>

      <!-- Champs Nursing -->
      <div v-else class="space-y-4">
        <UFormField label="Prise en charge" :name="`duration_days_${svc.id}`" required>
          <div class="space-y-3">
            <USelect v-model="formDataByService[svc.id].duration_days" :items="durationOptions" value-key="value" placeholder="Choisir" size="xl" class="w-full" />
            <UInput
              v-if="formDataByService[svc.id].duration_days === 'custom'"
              v-model.number="formDataByService[svc.id].custom_days"
              type="number"
              placeholder="Nombre de jours"
              size="xl"
              class="w-full"
              min="1"
            />
          </div>
        </UFormField>
        <UFormField v-if="showNursingFrequency(formDataByService[svc.id].duration_days)" label="Fréquence des passages" :name="`frequency_${svc.id}`" required :key="`freq-${svc.id}`">
          <USelect v-model="formDataByService[svc.id].frequency" :items="frequencyOptions" value-key="value" placeholder="Sélectionner" size="xl" class="w-full" />
        </UFormField>
        <UFormField
          v-if="isNursingAppointment(svc.type) && !hidePreferredNurseGender"
          label="Préférence pour l'infirmier"
          :name="`preferred_nurse_gender_${svc.id}`"
        >
          <URadioGroup
            v-model="formDataByService[svc.id].preferred_nurse_gender"
            :items="preferredNurseGenderOptions"
            size="xl"
            variant="list"
          />
        </UFormField>
      </div>

      <!-- Documents par soin (ordonnance, autre prescription) -->
      <div class="mt-4">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Documents du soin</p>
        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="docType in serviceDocTypes"
            :key="`${svc.id}-${docType.key}`"
            class="relative"
            @dragover.prevent="draggedOver = `${svc.id}_${docType.key}`"
            @dragleave.prevent="draggedOver = null"
            @drop.prevent="handleDropMulti($event, svc.id, docType.key)"
          >
            <button
              type="button"
              :class="[
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all cursor-pointer border-2 border-dashed',
                hasServiceDocFromProfile(svc.id, docType.key)
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                  : draggedOver === `${svc.id}_${docType.key}`
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800/50',
              ]"
              @click="openFileInputMulti(svc.id, docType.key)"
            >
              <input
                :ref="(el) => { if (el) fileInputRefs[`${svc.id}_${docType.key}`] = el as HTMLInputElement }"
                type="file"
                accept="image/*,.pdf"
                class="hidden"
                @change="handleFileSelectMulti($event, svc.id, docType.key)"
              />
              <div :class="['w-7 h-7 rounded flex items-center justify-center flex-shrink-0', docType.iconClass]">
                <UIcon :name="docType.icon" class="w-3.5 h-3.5" />
              </div>
              <div class="min-w-0 flex-1 flex flex-col gap-0.5 justify-center">
                <span class="text-xs font-medium text-gray-900 dark:text-white leading-tight">{{ docType.label }}</span>
                <span
                  v-if="!getServiceFiles(svc.id)[docType.key] && profileDocuments[docType.key]?.file_name"
                  class="text-[10px] text-green-700/90 dark:text-green-400/90 truncate"
                >
                  {{ profileDocuments[docType.key].file_name }}
                </span>
              </div>
              <UIcon v-if="hasServiceDocFromProfile(svc.id, docType.key)" name="i-lucide-check" class="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              <UIcon v-else name="i-lucide-upload" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </button>
          </div>
          <p class="col-span-2 text-center text-[10px] text-gray-400 mt-1 mb-0 leading-snug">
            JPG, PNG, PDF • Max 10 MB
          </p>
        </div>
        <UAlert
          v-if="!hasServiceDocFromProfile(svc.id, 'ordonnance')"
          color="warning"
          variant="soft"
          icon="i-lucide-file-warning"
          class="mt-3 rounded-xl"
          :title="missingPrescriptionAlertTitle(svc.type)"
        >
          <template #description>
            <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {{ missingPrescriptionAlertDescription(svc.type) }}
            </p>
          </template>
        </UAlert>
      </div>

      <!-- Message optionnel par rendez-vous -->
      <div class="mt-4">
        <div class="flex items-center justify-between gap-3">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Souhaitez-vous ajouter un message à ce rendez-vous ?</label>
          <USwitch v-model="formDataByService[svc.id].showNotes" class="shrink-0" />
        </div>
        <UFormField v-if="formDataByService[svc.id].showNotes" :name="`notes_${svc.id}`" class="mt-3">
          <UTextarea v-model="formDataByService[svc.id].notes" :rows="3" placeholder="Informations complémentaires..." size="xl" class="w-full" />
        </UFormField>
      </div>
    </UCard>

    <!-- « Pour qui ? » et blocs parent (doit rester au-dessus des infos perso) -->
    <slot name="beforeFooter" />

    <!-- Informations personnelles (en bas) — marge explicite pour ne pas coller au bloc « Pour qui » -->
    <UCard
      v-if="!hidePersonalInfo"
      :id="patientSectionId || undefined"
      class="mt-8 rounded-2xl border border-gray-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:mt-10"
    >
      <template #header>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <UIcon name="i-lucide-user" class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">Informations personnelles</h3>
            <p v-if="!user?.id" class="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <NuxtLink :to="loginReturnHref" class="text-primary-600 hover:text-primary-700 underline font-medium inline-flex items-center gap-1">
                <UIcon name="i-lucide-log-in" class="w-3 h-3" />
                Connectez-vous
              </NuxtLink>
            </p>
          </div>
        </div>
      </template>
      <slot name="patientToolbar" />
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Nom" name="last_name" required>
            <UInput v-model="form.last_name" placeholder="Entrez votre nom" size="xl" class="w-full" />
          </UFormField>
          <UFormField label="Prénom" name="first_name" required>
            <UInput v-model="form.first_name" placeholder="Entrez votre prénom" size="xl" class="w-full" />
          </UFormField>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Genre" name="gender" required>
            <USelect v-model="form.gender" :items="genderOptions" placeholder="Sélectionner votre genre" size="xl" class="w-full" />
          </UFormField>
          <UFormField label="Date de naissance" name="birth_date" required>
            <div class="flex space-x-2">
              <USelect v-model="birthDay" :items="dayOptions" placeholder="Jour" size="xl" class="flex-1" />
              <USelect v-model="birthMonth" :items="monthOptions" placeholder="Mois" size="xl" class="flex-1" />
              <USelect v-model="birthYear" :items="yearOptions" placeholder="Année" size="xl" class="flex-1" />
            </div>
          </UFormField>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Email" name="email" :required="!patientEmailOptional">
            <div class="relative">
              <UInput
                v-model="form.email"
                type="email"
                placeholder="Entrez votre email"
                size="xl"
                class="w-full"
                :disabled="user?.id && !relative && !allowPatientEmailEdit"
                :ui="{ disabled: 'cursor-not-allowed opacity-60', base: user?.id && !relative && !allowPatientEmailEdit ? 'bg-gray-50 dark:bg-gray-900/50' : '' }"
              />
              <UIcon v-if="user?.id && !relative && !allowPatientEmailEdit" name="i-lucide-lock" class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            <p
              v-if="patientEmailOptional"
              class="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-snug"
            >
              Facultatif — si vide, l’e-mail de votre compte sera utilisé.
            </p>
          </UFormField>
          <UFormField label="Téléphone" name="phone" required>
            <UInput v-model="form.phone" type="tel" placeholder="Entrez votre numéro" size="xl" class="w-full" />
          </UFormField>
        </div>
        <AddressSelector
          v-model="form.address"
          label="Adresse"
          name="address"
          required
          :show-complement="true"
          :complement-value="form.address_complement"
          @update:complement="form.address_complement = $event"
        />

        <!-- Documents personnels (Carte Vitale, Mutuelle) -->
        <div class="pt-4 pb-0 border-t border-gray-100 dark:border-gray-800">
          <div class="flex items-center justify-between gap-2 mb-2">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Documents personnels</p>
            <p v-if="loadingProfileDocuments" class="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <UIcon name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin shrink-0" />
              Chargement…
            </p>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="docType in personalDocTypes"
              :key="docType.key"
              class="relative"
              @dragover.prevent="draggedOver = `personal_${docType.key}`"
              @dragleave.prevent="draggedOver = null"
              @drop.prevent="handleDropPersonal($event, docType.key)"
            >
              <button
                type="button"
                :class="[
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all cursor-pointer border-2 border-dashed',
                  (form.personalFiles?.[docType.key] || profileDocuments[docType.key])
                    ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                    : draggedOver === `personal_${docType.key}`
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                ]"
                @click="openFileInputPersonal(docType.key)"
              >
                <input
                  :ref="(el) => { if (el) fileInputRefs[`personal_${docType.key}`] = el as HTMLInputElement }"
                  type="file"
                  accept="image/*,.pdf"
                  class="hidden"
                  @change="handleFileSelectPersonal($event, docType.key)"
                />
                <div :class="['w-7 h-7 rounded flex items-center justify-center flex-shrink-0', docType.iconClass]">
                  <UIcon :name="docType.icon" class="w-3.5 h-3.5" />
                </div>
                <div class="min-w-0 flex-1 flex flex-col gap-0.5 justify-center">
                  <span class="text-xs font-medium text-gray-900 dark:text-white leading-tight">{{ docType.label }}</span>
                  <span
                    v-if="!form.personalFiles?.[docType.key] && profileDocuments[docType.key]?.file_name"
                    class="text-[10px] text-green-700/90 dark:text-green-400/90 truncate"
                  >
                    {{ profileDocuments[docType.key].file_name }}
                  </span>
                </div>
                <UIcon v-if="form.personalFiles?.[docType.key] || profileDocuments[docType.key]" name="i-lucide-check" class="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <UIcon v-else name="i-lucide-upload" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </button>
            </div>
            <p class="col-span-2 text-center text-[10px] text-gray-400 mt-1 mb-0 leading-snug">
              JPG, PNG, PDF • Max 10 MB
            </p>
          </div>
        </div>
      </div>
    </UCard>

    <slot name="footer" />
  </UForm>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onMounted, computed, nextTick } from 'vue';
import { apiFetch } from '~/utils/api';
import { MIN_BIRTH_YEAR } from '~/constants/birth-date';
import { NURSING_DURATION_OPTIONS, NURSING_FREQUENCY_OPTIONS, showNursingFrequency } from '~/constants/nursing-duration';
import {
  AVAILABILITY_MIN_SPAN_HOURS,
  AVAILABILITY_MAX_HOUR_BLOOD_TEST,
  AVAILABILITY_MAX_HOUR_NURSING,
} from '~/constants/availability-slot';
import { MAX_UPLOAD_BYTES } from '~/constants/upload-limits';
import { getBloodTestPremiumDayKind, type PremiumDayKind } from '~/utils/french-public-holidays';
import { isBloodTestAppointment, isNursingAppointment } from '~/utils/appointment-type-rules';

const props = defineProps<{
  modelValue: any;
  selectedServices: Array<{ id: string; type: string; name: string; category_id: string | null; icon?: string }>;
  categories?: Array<{ id: string; options?: Array<{ option_key: string; label: string; field_type: string; options?: { value: string; label: string }[]; is_required?: boolean; sort_order?: number }> }>;
  relative?: any;
  hidePersonalInfo?: boolean;
  /**
   * Pro / infirmier / lab (wizard dashboard) : id du patient pour charger ses pièces (carte Vitale, mutuelle…)
   * via GET /patient-documents?user_id= — fusionnées au RDV comme AppointmentForm (copie medical_documents).
   */
  patientDocumentUserId?: string | null;
  /** Ancrage scroll (validation wizard) sur la carte infos patient. */
  patientSectionId?: string;
  /** Wizard dashboard : l’email saisi est celui du patient, pas verrouillé sur le compte connecté. */
  allowPatientEmailEdit?: boolean;
  /** Wizard dashboard : ne pas préremplir nom/adresse avec le profil du professionnel connecté. */
  skipLoggedInPatientPrefill?: boolean;
  /** Wizard pro / infirmier / lab / sous-compte : champ email patient non obligatoire (nouveau patient). */
  patientEmailOptional?: boolean;
  /** Espace infirmier : pas de choix patient (le RDV est pour un de ses patients, assigné à lui — pas de file d’attente pour les autres). */
  hidePreferredNurseGender?: boolean;
  minLeadTimeHours?: number | null;
  acceptSaturday?: boolean;
  acceptSunday?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: any];
  submit: [value: any];
}>();

const { user } = useAuth();
const route = useRoute();
const loginReturnHref = computed(() => `/login?returnTo=${encodeURIComponent(route.fullPath)}`);

const hasLabService = computed(() => props.selectedServices.some(s => isBloodTestAppointment(s.type)));
const isMultiServices = computed(() => props.selectedServices.length > 1);
const isUnifiedBloodTest = computed(() => props.selectedServices.length > 1 && props.selectedServices.every(s => isBloodTestAppointment(s.type)));
const renderedServices = computed(() => isUnifiedBloodTest.value ? props.selectedServices.slice(0, 1) : props.selectedServices);

const form = reactive({
  last_name: '',
  first_name: '',
  birth_date: '',
  phone: '',
  email: '',
  address: null as any,
  address_complement: '',
  scheduled_at: '',
  availability: '',
  availability_type: 'custom',
  files: {} as Record<string, File>,
  personalFiles: {} as Record<string, File>,
  gender: '',
});

const draggedOver = ref<string | null>(null);
const fileInputRefs = ref<Record<string, HTMLInputElement>>({});

type ServiceFormData = {
  blood_test_type?: string;
  duration_days?: string;
  custom_days?: number | null;
  frequency?: string;
  /** Soins infirmiers uniquement : préférence de genre pour le dispatch */
  preferred_nurse_gender?: 'any' | 'female' | 'male';
  care_options?: Record<string, string | number>;
  scheduled_at?: string;
  availability?: string;
  availability_type?: string;
  availabilityRange?: [number, number];
  files?: Record<string, File>;
  notes?: string;
  showNotes?: boolean;
};
const formDataByService = reactive<Record<string, ServiceFormData>>({});

/** Évite boucle emit → modelValue → assign pendant la synchro depuis le parent (brouillon / restauration). */
const syncingFromParent = ref(false);

const birthDay = ref<number | null>(null);
const birthMonth = ref<number | null>(null);
const birthYear = ref<number | null>(null);

const currentYear = new Date().getFullYear();
const dayOptions = Array.from({ length: 31 }, (_, i) => ({ label: i + 1, value: i + 1 }));
const monthOptions = [
  { label: 'Janvier', value: 1 }, { label: 'Février', value: 2 }, { label: 'Mars', value: 3 },
  { label: 'Avril', value: 4 }, { label: 'Mai', value: 5 }, { label: 'Juin', value: 6 },
  { label: 'Juillet', value: 7 }, { label: 'Août', value: 8 }, { label: 'Septembre', value: 9 },
  { label: 'Octobre', value: 10 }, { label: 'Novembre', value: 11 }, { label: 'Décembre', value: 12 },
];
const yearOptions = Array.from({ length: currentYear - MIN_BIRTH_YEAR + 1 }, (_, i) => ({
  label: String(MIN_BIRTH_YEAR + i),
  value: MIN_BIRTH_YEAR + i,
})).reverse();

const genderOptions = [
  { label: 'Homme', value: 'male' },
  { label: 'Femme', value: 'female' },
  { label: 'Autre', value: 'other' },
];

const availabilityTypeOptions = [
  { label: 'Je choisis mon créneau horaire', value: 'custom' },
  { label: 'Disponible toute la journée', value: 'all_day' },
];

const AVAILABILITY_MIN = 6;

function availabilityMaxHour(serviceType: string): number {
  return isBloodTestAppointment(serviceType) ? AVAILABILITY_MAX_HOUR_BLOOD_TEST : AVAILABILITY_MAX_HOUR_NURSING;
}

function availabilityPresetsFor(svc: { type: string }): ReadonlyArray<{ label: string; range: [number, number] }> {
  const max = availabilityMaxHour(svc.type);
  if (isBloodTestAppointment(svc.type)) {
    return [
      { label: 'Matin', range: [8, 12] },
      { label: 'Midi', range: [11, 14] },
      { label: 'Après-midi', range: [14, 17] },
      { label: 'Journée', range: [9, 17] },
    ];
  }
  return [
    { label: 'Matin', range: [8, 12] },
    { label: 'Midi', range: [11, 14] },
    { label: 'Après-midi', range: [14, 18] },
    { label: 'Soirée', range: [18, 22] },
    { label: 'Journée', range: [9, 22] },
  ];
}

function formatHourFr(h: number): string {
  const n = Math.floor(h);
  return `${n}h${Math.round((h - n) * 60).toString().padStart(2, '0')}`;
}

function formatAvailabilityRangeLabel(range: [number, number] | undefined): string {
  const r = range ?? [9, 11];
  const a = r[0] ?? 9;
  const b = r[1] ?? 11;
  return `De ${formatHourFr(a)} à ${formatHourFr(b)}`;
}

function applyAvailabilityPreset(svcId: string, range: [number, number]) {
  const data = formDataByService[svcId];
  if (!data) return;
  const svc = props.selectedServices.find((s) => s.id === svcId);
  const max = svc ? availabilityMaxHour(svc.type) : AVAILABILITY_MAX_HOUR_BLOOD_TEST;
  let lo = Math.max(AVAILABILITY_MIN, Math.min(max, range[0]));
  let hi = Math.max(AVAILABILITY_MIN, Math.min(max, range[1]));
  if (hi - lo < AVAILABILITY_MIN_SPAN_HOURS) {
    hi = Math.min(max, lo + AVAILABILITY_MIN_SPAN_HOURS);
  }
  data.availabilityRange = [lo, hi];
}

const bloodTestTypeOptions = [
  { label: 'Une seule fois', value: 'single' },
  { label: 'Plusieurs prélèvements sur plusieurs jours', value: 'multiple' },
];

const multipleDaysOptions = [
  { label: '2 jours', value: '2' }, { label: '3 jours', value: '3' }, { label: '5 jours', value: '5' },
  { label: '7 jours', value: '7' }, { label: '10 jours', value: '10' }, { label: '15 jours', value: '15' },
  { label: 'Personnalisé', value: 'custom' },
];

const frequencyOptions = NURSING_FREQUENCY_OPTIONS;
const durationOptions = NURSING_DURATION_OPTIONS;

const preferredNurseGenderOptions = [
  { label: 'Peu importe', value: 'any' },
  { label: 'Femme', value: 'female' },
  { label: 'Homme', value: 'male' },
];

const personalDocTypes = [
  { key: 'carte_vitale', label: 'Carte Vitale', icon: 'i-lucide-credit-card', iconClass: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
  { key: 'carte_mutuelle', label: 'Carte Mutuelle', icon: 'i-lucide-shield', iconClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
];
const serviceDocTypes = [
  { key: 'ordonnance', label: 'Ordonnance', icon: 'i-lucide-file-text', iconClass: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' },
  { key: 'autres_assurances', label: 'Autre prescription', icon: 'i-lucide-file-text', iconClass: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
];

const profileDocuments = ref<Record<string, any>>({});
const loadingProfileDocuments = ref(false);

watch(() => props.selectedServices, (svcs) => {
  svcs?.forEach(s => {
    if (!formDataByService[s.id]) {
      const base: ServiceFormData = isBloodTestAppointment(s.type)
        ? { blood_test_type: 'single' }
        : { duration_days: '1', preferred_nurse_gender: 'any' };
      formDataByService[s.id] = {
        ...base,
        care_options: {},
        scheduled_at: '',
        availability_type: 'custom',
        availabilityRange: [9, 11],
        files: {},
        notes: '',
        showNotes: false,
      };
    } else {
      const cur = formDataByService[s.id];
      if (cur.care_options === undefined) cur.care_options = {};
      if (cur.notes === undefined) cur.notes = '';
      if (cur.showNotes === undefined) cur.showNotes = false;
      if (cur.scheduled_at === undefined) cur.scheduled_at = '';
      if (cur.availability_type === undefined) cur.availability_type = 'custom';
      if (cur.availabilityRange === undefined) cur.availabilityRange = [9, 11];
      if (cur.files === undefined) cur.files = {};
      if (isNursingAppointment(s.type) && cur.preferred_nurse_gender === undefined) cur.preferred_nurse_gender = 'any';
    }
  });
}, { immediate: true, deep: true });

// Enforcer l'écart minimum et les bornes max par type de soin
watch(formDataByService, () => {
  props.selectedServices.forEach((s) => {
    const max = availabilityMaxHour(s.type);
    const range = formDataByService[s.id]?.availabilityRange;
    if (!range || !Array.isArray(range) || range.length !== 2) return;
    let lo = Math.max(AVAILABILITY_MIN, Math.min(max, range[0]));
    let hi = Math.max(AVAILABILITY_MIN, Math.min(max, range[1]));
    if (hi < lo) [lo, hi] = [hi, lo];
    if (hi - lo < AVAILABILITY_MIN_SPAN_HOURS) {
      hi = Math.min(max, lo + AVAILABILITY_MIN_SPAN_HOURS);
    }
    if (lo !== range[0] || hi !== range[1]) {
      formDataByService[s.id].availabilityRange = [lo, hi];
    }
  });
}, { deep: true });

watch([birthYear, birthMonth, birthDay], () => {
  if (birthYear.value && birthMonth.value && birthDay.value) {
    form.birth_date = `${birthYear.value}-${String(birthMonth.value).padStart(2, '0')}-${String(birthDay.value).padStart(2, '0')}`;
  } else {
    form.birth_date = '';
  }
});

watch(() => form.birth_date, (d) => {
  if (d) {
    const [y, m, day] = d.split('-');
    if (y && m && day) {
      birthYear.value = parseInt(y);
      birthMonth.value = parseInt(m);
      birthDay.value = parseInt(day);
    }
  }
}, { immediate: true });

const MODEL_VALUE_META_KEYS = new Set(['formDataByService', 'selectedServices', 'isMultiServices', 'form_data']);

watch(
  () => props.modelValue,
  (v) => {
    if (!v || typeof v !== 'object') return;
    syncingFromParent.value = true;
    try {
      for (const key of Object.keys(v)) {
        if (MODEL_VALUE_META_KEYS.has(key)) continue;
        if (key in form) {
          (form as Record<string, unknown>)[key] = (v as Record<string, unknown>)[key];
        }
      }
      if (v.personalFiles && typeof v.personalFiles === 'object') {
        form.personalFiles = { ...v.personalFiles };
      }
      if (v.birth_date) {
        const [y, m, d] = v.birth_date.split('-');
        if (y && m && d) {
          birthYear.value = parseInt(y);
          birthMonth.value = parseInt(m);
          birthDay.value = parseInt(d);
        }
      }
      if (v.formDataByService) {
        for (const svc of props.selectedServices) {
          const prev = v.formDataByService[svc.id];
          if (prev && formDataByService[svc.id]) {
            if (prev.notes !== undefined) formDataByService[svc.id].notes = prev.notes;
            if (prev.showNotes !== undefined) formDataByService[svc.id].showNotes = prev.showNotes;
            if (prev.care_options !== undefined) formDataByService[svc.id].care_options = { ...prev.care_options };
            if (prev.scheduled_at !== undefined) formDataByService[svc.id].scheduled_at = prev.scheduled_at;
            if (prev.availability_type !== undefined) formDataByService[svc.id].availability_type = prev.availability_type;
            if (prev.availabilityRange !== undefined) formDataByService[svc.id].availabilityRange = [...prev.availabilityRange];
            if (prev.files !== undefined) formDataByService[svc.id].files = { ...prev.files };
            if (prev.preferred_nurse_gender !== undefined) {
              formDataByService[svc.id].preferred_nurse_gender = prev.preferred_nurse_gender;
            }
            if (prev.availability !== undefined) formDataByService[svc.id].availability = prev.availability;
            if (prev.blood_test_type !== undefined) formDataByService[svc.id].blood_test_type = prev.blood_test_type;
            if (prev.duration_days !== undefined) formDataByService[svc.id].duration_days = prev.duration_days;
            if (prev.custom_days !== undefined) formDataByService[svc.id].custom_days = prev.custom_days;
            if (prev.frequency !== undefined) formDataByService[svc.id].frequency = prev.frequency;
          }
        }
      }
    } finally {
      nextTick(() => {
        syncingFromParent.value = false;
      });
    }
  },
  { deep: true, immediate: true },
);

const loadProfileDocuments = async () => {
  if (!user.value?.id) return;

  let url: string | null = null;
  const rawPid = props.patientDocumentUserId;
  const patientId =
    rawPid != null && String(rawPid).trim() !== '' ? String(rawPid).trim() : '';

  if (props.relative?.id) {
    url = `/patient-documents?relative_id=${encodeURIComponent(String(props.relative.id))}`;
  } else if (patientId) {
    url = `/patient-documents?user_id=${encodeURIComponent(patientId)}`;
  } else if (user.value.role === 'patient') {
    url = '/patient-documents';
  } else {
    profileDocuments.value = {};
    return;
  }

  profileDocuments.value = {};
  loadingProfileDocuments.value = true;
  try {
    const res = await apiFetch(url, { method: 'GET' });
    if (res.success && Array.isArray(res.data)) {
      res.data.forEach((doc: any) => {
        if (doc.document_type) profileDocuments.value[doc.document_type] = doc;
      });
    }
  } catch {
    profileDocuments.value = {};
  } finally {
    loadingProfileDocuments.value = false;
  }
};

watch(
  () => [props.patientDocumentUserId, props.relative?.id, user.value?.id] as const,
  () => {
    void loadProfileDocuments();
  },
  { immediate: true },
);

const prefillForm = async () => {
  if (props.skipLoggedInPatientPrefill) {
    return;
  }
  if (user.value?.id && !props.relative) {
    try {
      const { fetchCurrentUser } = useAuth();
      const u = await fetchCurrentUser();
      if (u) {
        form.first_name = u.first_name || '';
        form.last_name = u.last_name || '';
        form.birth_date = u.birth_date || '';
        form.gender = u.gender || '';
        form.email = u.email || '';
        form.phone = u.phone || '';
        form.address = u.address || null;
        form.address_complement = u.address?.complement || '';
      }
    } catch {}
  } else if (props.relative) {
    form.first_name = props.relative.first_name || '';
    form.last_name = props.relative.last_name || '';
    form.birth_date = props.relative.birth_date || '';
    form.gender = props.relative.gender || '';
    form.email = props.relative.email || user.value?.email || '';
    form.phone = props.relative.phone || user.value?.phone || '';
    form.address = props.relative.address || null;
  }
};

function getServiceAvailabilityRange(svcId: string): [number, number] | undefined {
  return formDataByService[svcId]?.availabilityRange;
}

function getCategoryOptions(categoryId: string) {
  const cat = props.categories?.find((c) => c.id === categoryId);
  const opts = cat?.options ?? [];
  return opts.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function getServiceFiles(svcId: string): Record<string, File> {
  return formDataByService[svcId]?.files ?? {};
}

/** Fichier joint au RDV ou pièce déjà enregistrée sur le dossier patient (ordonnance, autre prescription…). */
function hasServiceDocFromProfile(svcId: string, docKey: string): boolean {
  return !!(getServiceFiles(svcId)[docKey] || profileDocuments.value[docKey]);
}

function servicePremiumDayKind(svcId: string): PremiumDayKind | null {
  return getBloodTestPremiumDayKind(formDataByService[svcId]?.scheduled_at);
}

function servicePremiumDayAlertTitle(svcId: string): string {
  const k = servicePremiumDayKind(svcId);
  if (k === 'sunday') return 'Passage à domicile un dimanche';
  if (k === 'holiday') return 'Passage à domicile un jour férié';
  if (k === 'both') return 'Passage à domicile un dimanche férié';
  return '';
}

function servicePremiumDayAlertDescription(svcId: string): string {
  const k = servicePremiumDayKind(svcId);
  const suite =
    'Des frais de déplacement ou une majoration peuvent s’appliquer par rapport à un créneau ouvré classique. Le détail vous sera communiqué par le laboratoire ou le professionnel avant ou lors de l’intervention.';
  if (k === 'sunday') {
    return `Les interventions à domicile le dimanche sont souvent soumises à des conditions tarifaires spécifiques. ${suite}`;
  }
  if (k === 'holiday') {
    return `Les interventions à domicile un jour férié (férié légal en France métropolitaine) peuvent entraîner un supplément lié au déplacement. ${suite}`;
  }
  if (k === 'both') {
    return `Ce jour tombe un dimanche et un jour férié : des majorations ou frais complémentaires sont possibles. ${suite}`;
  }
  return '';
}

function missingPrescriptionAlertTitle(serviceType: string): string {
  return isBloodTestAppointment(serviceType) ? 'Examens sans ordonnance médicale' : 'Soins sans prescription médicale';
}

function missingPrescriptionAlertDescription(serviceType: string): string {
  if (isBloodTestAppointment(serviceType)) {
    return (
      'Sans prescription médicale, les actes de biologie médicale ne sont en principe pas pris en charge par l’Assurance Maladie et ' +
      'restent intégralement à votre charge. Une participation de votre complémentaire santé n’est possible que dans le cadre ' +
      'des garanties prévues par votre contrat.'
    );
  }
  return (
    'Sans prescription médicale, les actes de soins infirmiers ne sont en principe pas pris en charge par l’Assurance Maladie et ' +
    'restent intégralement à votre charge. Une participation de votre complémentaire santé n’est possible que dans le cadre ' +
    'des garanties prévues par votre contrat.'
  );
}

const openFileInputMulti = (svcId: string, docType: string) => {
  fileInputRefs.value[`${svcId}_${docType}`]?.click();
};

const handleFileSelectMulti = (event: Event, svcId: string, docType: string) => {
  const target = event.target as HTMLInputElement;
  if (target.files?.[0]) {
    const file = target.files[0];
    if (file.size > MAX_UPLOAD_BYTES) {
      useAppToast().add({ title: 'Fichier trop volumineux', description: 'Max 25 Mo', color: 'error' });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) {
      useAppToast().add({ title: 'Format non accepté', description: 'JPG, PNG, PDF uniquement', color: 'error' });
      return;
    }
    if (!formDataByService[svcId].files) formDataByService[svcId].files = {};
    formDataByService[svcId].files![docType] = file;
    target.value = '';
  }
};

const handleDropMulti = (event: DragEvent, svcId: string, docType: string) => {
  draggedOver.value = null;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handleFileSelectMulti({ target: input } as any, svcId, docType);
  }
};

const openFileInputPersonal = (key: string) => {
  fileInputRefs.value[`personal_${key}`]?.click();
};

const handleFileSelectPersonal = (event: Event, docType: string) => {
  const target = event.target as HTMLInputElement;
  if (target.files?.[0]) {
    const file = target.files[0];
    if (file.size > MAX_UPLOAD_BYTES) {
      useAppToast().add({ title: 'Fichier trop volumineux', description: 'Max 25 Mo', color: 'error' });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) {
      useAppToast().add({ title: 'Format non accepté', description: 'JPG, PNG, PDF uniquement', color: 'error' });
      return;
    }
    if (!form.personalFiles) form.personalFiles = {};
    form.personalFiles[docType] = file;
    target.value = '';
  }
};

const handleDropPersonal = (event: DragEvent, docType: string) => {
  draggedOver.value = null;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handleFileSelectPersonal({ target: input } as any, docType);
  }
};

onMounted(() => {
  prefillForm();
});

function buildAvailabilityForService(svcId: string): string {
  const data = formDataByService[svcId];
  if (!data) return '';
  if (data.availability_type === 'all_day') return JSON.stringify({ type: 'all_day' });
  const range = data.availabilityRange ?? [9, 11];
  return JSON.stringify({ type: 'custom', range });
}

/** Brouillon pour le parent (sessionStorage, retour login) : mêmes champs que la soumission, sans fusion pièces profil. */
function buildDraftModelValue() {
  const addressWithComplement = form.address ? { ...form.address, complement: form.address_complement || null } : null;
  const formDataByServiceDraft: Record<string, ServiceFormData & { availability?: string }> = {};
  for (const svc of props.selectedServices) {
    const data = formDataByService[svc.id];
    if (!data) continue;
    formDataByServiceDraft[svc.id] = {
      ...data,
      availability: buildAvailabilityForService(svc.id),
    };
  }
  return {
    last_name: form.last_name,
    first_name: form.first_name,
    birth_date: form.birth_date,
    phone: form.phone,
    email: form.email,
    address: addressWithComplement,
    address_complement: form.address_complement,
    gender: form.gender,
    personalFiles: { ...form.personalFiles },
    files: { ...form.files },
    scheduled_at: form.scheduled_at,
    availability: form.availability,
    availability_type: form.availability_type,
    formDataByService: formDataByServiceDraft,
    selectedServices: props.selectedServices,
    isMultiServices: isMultiServices.value,
  };
}

let draftEmitTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleEmitDraft() {
  if (syncingFromParent.value) return;
  if (props.selectedServices.length === 0) return;
  if (draftEmitTimer) clearTimeout(draftEmitTimer);
  draftEmitTimer = setTimeout(() => {
    draftEmitTimer = null;
    if (syncingFromParent.value) return;
    emit('update:modelValue', buildDraftModelValue());
  }, 250);
}

/** Appelé avant navigation (ex. /login) pour éviter un brouillon vide si le debounce n’a pas encore tiré. */
function flushDraftToParent() {
  if (draftEmitTimer) {
    clearTimeout(draftEmitTimer);
    draftEmitTimer = null;
  }
  if (syncingFromParent.value || props.selectedServices.length === 0) return;
  emit('update:modelValue', buildDraftModelValue());
}

watch(form, () => scheduleEmitDraft(), { deep: true });
watch(formDataByService, () => scheduleEmitDraft(), { deep: true });
watch(
  () => props.selectedServices,
  () => scheduleEmitDraft(),
  { deep: true },
);

defineExpose({ flushDraftToParent });

/** Aligné sur AppointmentForm : en création infirmier, le dispatch suit le genre renseigné sur le compte. */
function resolvedPreferredNurseGenderFromNurseAccount(): 'any' | 'female' | 'male' {
  const g = (user.value as { gender?: string } | null)?.gender;
  if (g === 'male') return 'male';
  if (g === 'female') return 'female';
  return 'any';
}

function buildMergedFilesForService(svcId: string): { files: Record<string, File>; form_data_files: Record<string, any> } {
  const personalFiles = form.personalFiles ?? {};
  const svcFiles = formDataByService[svcId]?.files ?? {};
  const mergedFiles: Record<string, File> = {
    ...(personalFiles.carte_vitale ? { carte_vitale: personalFiles.carte_vitale } : {}),
    ...(personalFiles.carte_mutuelle ? { carte_mutuelle: personalFiles.carte_mutuelle } : {}),
    ...(svcFiles.ordonnance ? { ordonnance: svcFiles.ordonnance } : {}),
    ...(svcFiles.autres_assurances ? { autres_assurances: svcFiles.autres_assurances } : {}),
  };
  const filesData: Record<string, any> = {};
  ['carte_vitale', 'carte_mutuelle', 'ordonnance', 'autres_assurances'].forEach(key => {
    if (mergedFiles[key]) {
      filesData[key] = { field: key, name: mergedFiles[key].name, size: mergedFiles[key].size, type: mergedFiles[key].type, isNew: true };
    } else if (profileDocuments.value[key]) {
      filesData[key] = { field: key, name: profileDocuments.value[key].file_name, medical_document_id: profileDocuments.value[key].medical_document_id, isNew: false };
    }
  });
  return { files: mergedFiles, form_data_files: filesData };
}

const handleSubmit = () => {
  const addressWithComplement = form.address ? { ...form.address, complement: form.address_complement || null } : null;

  const formDataByServiceSerialized: Record<string, ServiceFormData & { availability?: string; form_data_files?: Record<string, any> }> = {};
  for (const svc of props.selectedServices) {
    const data = formDataByService[svc.id];
    let scheduledAt = data?.scheduled_at ?? '';
    if (scheduledAt && !scheduledAt.includes('T') && !scheduledAt.includes(' ')) {
      const range = data?.availabilityRange ?? [9, 11];
      const h = range[0] ?? 9;
      scheduledAt = `${scheduledAt} ${String(Math.floor(h)).padStart(2, '0')}:00:00`;
    }
    const { files: mergedFiles, form_data_files: filesData } = buildMergedFilesForService(svc.id);
    const nursingPref =
      isNursingAppointment(svc.type)
        ? props.hidePreferredNurseGender
          ? resolvedPreferredNurseGenderFromNurseAccount()
          : (data?.preferred_nurse_gender ?? 'any')
        : data?.preferred_nurse_gender;
    formDataByServiceSerialized[svc.id] = {
      ...data,
      ...(isNursingAppointment(svc.type) ? { preferred_nurse_gender: nursingPref } : {}),
      availability: buildAvailabilityForService(svc.id),
      scheduled_at: scheduledAt,
      files: mergedFiles,
      form_data_files: filesData,
      care_options: data?.care_options && Object.keys(data.care_options || {}).length ? data.care_options : undefined,
    } as any;
  }

  const payload: any = {
    ...form,
    address: addressWithComplement,
    selectedServices: props.selectedServices,
    formDataByService: formDataByServiceSerialized,
    isMultiServices: isMultiServices.value,
  };

  if (isUnifiedBloodTest.value) {
    const firstSvc = props.selectedServices[0];
    const firstData = formDataByServiceSerialized[firstSvc.id];
    const bloodTestItems = props.selectedServices.map((svc, index) => ({
      category_id: svc.category_id,
      label: svc.name,
      care_options: formDataByServiceSerialized[svc.id]?.care_options ?? {},
      sort_order: index,
    }));
    payload.scheduled_at = firstData.scheduled_at;
    payload.files = firstData.files;
    payload.form_data = {
      ...form,
      address: addressWithComplement,
      scheduled_at: firstData.scheduled_at,
      availability: firstData.availability,
      files: firstData.form_data_files,
      notes: firstData.notes || undefined,
      blood_test_items: bloodTestItems,
      care_options: firstData.care_options && Object.keys(firstData.care_options).length ? firstData.care_options : undefined,
    };
    (payload as any).blood_test_items = bloodTestItems;
    emit('update:modelValue', payload);
    emit('submit', payload);
    return;
  }

  if (isMultiServices.value) {
    emit('update:modelValue', payload);
    emit('submit', payload);
    return;
  }

  const firstSvc = props.selectedServices[0];
  const firstData = formDataByServiceSerialized[firstSvc.id];
  payload.scheduled_at = firstData.scheduled_at;
  payload.files = firstData.files;
  payload.form_data = {
    ...form,
    address: addressWithComplement,
    scheduled_at: firstData.scheduled_at,
    files: firstData.form_data_files,
    notes: firstData.notes || undefined,
    care_options: firstData.care_options && Object.keys(firstData.care_options).length ? firstData.care_options : undefined,
  };

  emit('update:modelValue', payload);
  emit('submit', payload);
};
</script>
