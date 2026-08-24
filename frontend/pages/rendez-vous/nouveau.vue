<template>
  <div>
    <BookingCelebrationOverlay
      :show="bookingOverlayShow"
      :images="bookingCelebrationImageUrls"
      :rotate-icons="bookingCelebrationRotateIcons"
    />

    <RendezVousCareSelection
      v-if="step === 0"
      v-model:selected-services="selectedServices"
      :categories="careCategoriesList"
      :loading="categoriesLoading"
      :provider-name="providerName"
      :initial-care-filter-tab="careSelectionInitialFilterTab"
      :form-data-by-service="(formData.formDataByService ?? {}) as Record<string, BookingServiceFormSlice | undefined>"
      @continue="confirmStep0AndNext"
      @quick-add-service="mergeQuickServiceIntoBooking"
      @remove-service-from-cart="removeServiceFromCareSelection"
    />

    <LabBrandPreferenceStep
      v-else-if="step === 1 && patientNeedsLabPreferenceStep"
      v-model:model-value-mode="labPreferenceMode"
      v-model:model-value-brand-id="preferredLabBrandId"
      :selected-services="selectedServices"
      :validation-error="validationError"
      @prev="prevStep"
      @continue="confirmLabPreferenceAndNext"
    />

    <RendezVousFormStep
      v-else-if="step === 2"
      ref="rdvFormStepRef"
      v-model:form-data="formData"
      v-model:selected-relative="selectedRelative"
      v-model:show-relatives-selector="showRelativesSelector"
      v-model:show-full-form="showFullForm"
      v-model:consent="consent"
      :validation-error="validationError"
      :selected-services="selectedServices"
      :categories="careCategoriesList"
      :provider-name="providerName"
      :is-authenticated="!!isAuthenticated"
      :relatives="relatives"
      :prefilled-info="prefilledInfo"
      :relative-for-form="relativeForForm"
      :hide-personal-info="hidePersonalInfoForForm"
      :min-lead-time-hours="isProviderBooking && providerType === 'lab' ? providerMinLeadTimeHours : undefined"
      :accept-saturday="isProviderBooking && providerType === 'lab' ? providerAcceptSaturday : true"
      :accept-sunday="isProviderBooking && providerType === 'lab' ? providerAcceptSunday : true"
      :submit-busy="step1SubmitBusy"
      :booking-wizard-section="patientBookingWizardSection"
      :booking-active-slot-service-id="patientActiveSlotServiceId"
      :booking-active-documents-service-id="patientActiveDocumentsServiceId"
      :booking-wizard-final-step="patientBookingWizardFinalStep"
      patient-booking-urgency-stripe
      @submit="handleFormSubmit"
      @wizard-next="onPatientBookingWizardNext"
      @prev="prevStep"
      @select-for-myself="selectForMyself"
      @toggle-proche="toggleProcheSelector"
      @load-relative="onLoadRelativeFromFormStep"
      @edit-relative="openEditRelativeModal"
      @delete-relative="confirmDeleteRelative"
      @add-relative="openAddRelativeModal"
      @show-full-form="showFullForm = true"
      @back-to-selection="onBackToCareSelection"
    />

    <div v-else-if="step === 3" class="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-app-canvas dark:bg-gray-950 p-4">
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
                    type="number"
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
              :disabled="otpCodeString.length !== 6 || step3SubmitBusy"
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
                :disabled="step3SubmitBusy"
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
      v-if="step === 2 && bookingWizardPersonalStepVisible"
      v-model:open="showRelativeDrawer"
      :relative="editingRelativeForDrawer"
      @saved="handleRelativeSaved"
    />

    <!-- Modal de confirmation de suppression Tailwind -->
    <div
      v-if="step === 2 && bookingWizardPersonalStepVisible && showDeleteModal"
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
import { nextTick, onBeforeUnmount, onMounted, onUnmounted, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { apiFetch, preloadCsrfToken } from '~/utils/api';
import { resolveCareCategoryImageSrc, resolveCareIconFromCategory } from '~/utils/care-icons';
import { runWithBookingCelebrationOverlay } from '~/composables/useBookingCelebrationOverlay';
import { bookingDbg, celebrationRotateIconsFromServices } from '~/utils/booking-celebration-debug';
import { AVAILABILITY_MIN_SPAN_HOURS } from '~/constants/availability-slot';
import { isBloodTestAppointment, isNursingAppointment } from '~/utils/appointment-type-rules';
import {
  servicesRequiringOwnSlots,
  countGroupedAppointmentPayloads,
  type SelectedServiceInput,
} from '~/utils/dashboard-unified-rdv';
import { normalizeCategorySkipPrescriptionDocuments } from '~/utils/category-skip-prescription-documents';
import { filterStaffOnlyCareCategoriesForPatient, formSliceNeedsVipPayment, bloodTestNeedsLabPreferenceStep, applyLabPreferenceToBloodPayloads } from '@oneandlab/shared-utils';
import type { LabPreferenceMode } from '@oneandlab/shared-types';
import {
  type BookingServiceFormSlice,
  formDataSliceForQuickAddedService,
} from '~/utils/booking-service-form-slice';

function bookingServiceLineFromCategory(cat: {
  id: string;
  type: string;
  name: string;
  image_url?: string | null;
  icon?: string | null;
  skip_prescription_documents?: boolean | null;
}): {
  id: string;
  type: string;
  name: string;
  category_id: string;
  icon: string;
  category_image_url: string | null;
  skip_prescription_documents?: boolean;
} {
  const id =
    typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `svc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    type: cat.type,
    name: cat.name,
    category_id: cat.id,
    icon: resolveCareIconFromCategory(cat),
    category_image_url: cat.image_url ?? null,
    ...(normalizeCategorySkipPrescriptionDocuments((cat as { skip_prescription_documents?: unknown }).skip_prescription_documents)
      ? { skip_prescription_documents: true as const }
      : {}),
  };
}

definePageMeta({
  layout: 'patient',
  middleware: ['rdv-patient-only'],
});

const toast = useAppToast();

const route = useRoute();
const router = useRouter();
const { createMultipleAppointments, loading: appointmentsLoading } = useAppointments();
const { verifyOTP: verifyOTPAuth, isAuthenticated, user } = useAuth();

const step = ref(0);
const labPreferenceMode = ref<LabPreferenceMode | ''>('platform_match');
const preferredLabBrandId = ref<string | null>(null);
const patientNeedsLabPreferenceStep = computed(() =>
  bloodTestNeedsLabPreferenceStep(selectedServices.value, { skipForProviderBooking: isProviderBooking.value }),
);
function firstStepAfterCareSelection(): number {
  return patientNeedsLabPreferenceStep.value ? 1 : 2;
}
/** Sous-étapes après la sélection des soins : indices 0…N-1 créneaux par carte, N…2N-1 documents par carte, 2N infos perso + envoi. */
const bookingWizardIndex = ref(0);
const rdvFormStepRef = ref<{ flushBookingDraftToParent?: () => void } | null>(null);
/** Services sélectionnés (multi-sélection) : { id, type, name, category_id } */
const selectedServices = ref<Array<{ id: string; type: string; name: string; category_id: string | null; icon?: string; category_image_url?: string | null }>>([]);
const consent = ref(true);

watch(isAuthenticated, (auth, wasAuth) => {
  if (auth && wasAuth === false) {
    consent.value = true;
  }
});

const careCategoriesList = ref<
  Array<{
    id: string;
    name: string;
    description?: string;
    type: string;
    icon?: string | null;
    appointment_count?: number;
    image_url?: string | null;
    catalog_group?: string | null;
    skip_prescription_documents?: boolean | null;
  }>
>([]);
const categoriesLoading = ref(true);
const formData = ref<any>({});

/** `?type=blood_test` / `?type=nursing` : onglet filtre uniquement ; pas de « première catégorie » imposée ni saut d’étape (multi-analyses OK). */
const careSelectionInitialFilterTab = computed((): 'all' | 'analyses' | 'domicile' | undefined => {
  const t = route.query.type as string | undefined;
  if (t === 'blood_test') return 'analyses';
  if (t === 'nursing') return 'domicile';
  return undefined;
});

// Provider (profil public) : URL en priorité + brouillon sessionStorage si la query a été perdue (login, refresh, lien interne)
const stickyProviderBooking = ref<{ provider_id: string; provider_type: string; utm_qr?: string } | null>(null);
const stickyUtmQr = ref<string | null>(null);
watch(
  () => [route.query.provider_id, route.query.provider_type, route.query.utm_qr] as const,
  ([pid, pty, utm]) => {
    if (pid && pty) {
      stickyProviderBooking.value = {
        provider_id: String(pid),
        provider_type: String(pty),
        ...(utm ? { utm_qr: String(utm) } : {}),
      };
    }
    if (utm) {
      stickyUtmQr.value = String(utm);
    }
  },
  { immediate: true },
);
const providerId = computed(
  () =>
    ((route.query.provider_id as string) || '').trim() || stickyProviderBooking.value?.provider_id || null,
);
const providerType = computed(
  () =>
    ((route.query.provider_type as string) || '').trim() || stickyProviderBooking.value?.provider_type || null,
);
const utmQr = computed(
  () =>
    ((route.query.utm_qr as string) || '').trim() || stickyUtmQr.value || stickyProviderBooking.value?.utm_qr || null,
);
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
/** type number → clavier numérique mobile (reka-ui PinInput) */
const otpCode = ref<(number | string)[]>([]);
const otpCodeString = computed(() =>
  otpCode.value.map((x) => (x === undefined || x === null ? '' : String(x))).join(''),
);
const userId = ref('');
const sessionId = ref('');
const countdown = ref(0);
const otpSent = ref(false); // Indique si un code OTP a déjà été envoyé

const bookingOverlayShow = ref(false);
const bookingSubmissionLocked = ref(false);
const runtimeConfig = useRuntimeConfig();

const bookingCelebrationImageUrls = computed(() => {
  const base = runtimeConfig.public.apiBase as string | undefined;
  const seen = new Set<string>();
  const urls: string[] = [];

  function pushSrc(raw: string | null | undefined) {
    const resolved = resolveCareCategoryImageSrc(raw ?? null, base);
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved);
      urls.push(resolved);
    }
  }

  /** Images déjà connues sur les lignes sélectionnées (souvent présentes alors que la liste catégories n’a pas image_url). */
  for (const svc of selectedServices.value) {
    pushSrc(svc.category_image_url ?? null);
  }

  const selectedCatIds = new Set(
    selectedServices.value
      .map((s) => s.category_id)
      .filter((id): id is string => id != null && String(id).trim() !== ''),
  );

  const collectFromCategories = (filterBySelection: boolean) => {
    for (const c of careCategoriesList.value) {
      if (filterBySelection && selectedCatIds.size > 0 && !selectedCatIds.has(c.id)) continue;
      pushSrc(c.image_url ?? null);
    }
  };

  collectFromCategories(true);
  if (urls.length === 0) collectFromCategories(false);

  return urls;
});

const bookingCelebrationRotateIcons = computed(() => celebrationRotateIconsFromServices(selectedServices.value));

/** Étape formulaire : évite double clic sur « Confirmer le rendez-vous » */
const step1SubmitBusy = computed(
  () => step.value === 2 && (requestingOTP.value || otpLoading.value || bookingSubmissionLocked.value),
);

/** Étape OTP : évite double validation */
const step3SubmitBusy = computed(() => step.value === 3 && (otpLoading.value || bookingSubmissionLocked.value));

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

const relativeForForm = computed(() =>
  typeof selectedRelative.value === 'string'
    ? relatives.value.find((r) => r.id === selectedRelative.value) ?? null
    : null
);

const hidePersonalInfoForForm = computed(
  () =>
    isAuthenticated.value &&
    (selectedRelative.value !== undefined || showRelativesSelector.value) &&
    !showFullForm.value
);

// Options pour le select des proches
const relativesOptions = computed(() => {
  return relatives.value.map(relative => ({
    label: `${relative.first_name} ${relative.last_name}${relative.relationship_type ? ` (${getRelationshipLabel(relative.relationship_type)})` : ''}`,
    value: relative.id
  }));
});

const serviceItems = [
  { label: 'Prélèvement', value: 'blood_test', icon: 'i-lucide-droplet', description: 'À domicile' },
  { label: 'Soins infirmiers', value: 'nursing', icon: 'i-lucide-heart-pulse', description: 'Soins à domicile par des professionnels' },
];

function confirmStep0AndNext() {
  if (selectedServices.value.length > 0) {
    consent.value = true;
    bookingWizardIndex.value = 0;
    step.value = firstStepAfterCareSelection();
    error.value = '';
    validationError.value = '';
    nextTick(() => { if (typeof window !== 'undefined') window.scrollTo(0, 0); });
  }
}

function confirmLabPreferenceAndNext() {
  validationError.value = '';
  formData.value.lab_preference_mode = labPreferenceMode.value;
  formData.value.preferred_lab_brand_id = labPreferenceMode.value === 'brand_choice' ? preferredLabBrandId.value : null;
  step.value = 2;
  bookingWizardIndex.value = 0;
  error.value = '';
  nextTick(() => { if (typeof window !== 'undefined') window.scrollTo(0, 0); });
}

function onBackToCareSelection() {
  step.value = 0;
  bookingWizardIndex.value = 0;
}

function mergeQuickServiceIntoBooking(payload: { service: SelectedServiceInput; slice: BookingServiceFormSlice }) {
  const { service, slice } = payload;
  const existing = selectedServices.value;
  const priorFd = formData.value.formDataByService as Record<string, BookingServiceFormSlice | undefined> | undefined;

  selectedServices.value = [...existing, service];

  if (!formData.value.formDataByService) {
    formData.value.formDataByService = {};
  }

  formData.value.formDataByService[service.id] = formDataSliceForQuickAddedService({
    serviceType: service.type,
    slice,
    priorSelectedServices: existing,
    priorFormDataByService: priorFd,
    careCategory: { name: service.name, label: service.name },
  });
}

function removeServiceFromCareSelection(serviceId: string) {
  selectedServices.value = selectedServices.value.filter((s) => s.id !== serviceId);
  const by = formData.value.formDataByService as Record<string, BookingServiceFormSlice | undefined> | undefined;
  if (by && by[serviceId]) {
    const next = { ...by };
    delete next[serviceId];
    formData.value.formDataByService = next;
  }
}

function normalizeCareCategoriesApiRows(rows: unknown[]): typeof careCategoriesList.value {
  const normalized = (rows as Array<Record<string, unknown>>).map((c) => ({
    ...(c as object),
    skip_prescription_documents: normalizeCategorySkipPrescriptionDocuments(c.skip_prescription_documents),
  })) as typeof careCategoriesList.value;
  return filterStaffOnlyCareCategoriesForPatient(normalized);
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
        careCategoriesList.value = normalizeCareCategoriesApiRows(response.data as unknown[]);
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
      careCategoriesList.value = normalizeCareCategoriesApiRows(response.data as unknown[]);
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

const handleFormSubmit = (data: any) => {
  formData.value = data;
  validateAndNextStep();
};

// Helper : récupérer une valeur depuis formData ou form_data
const getField = (field: string) => formData.value?.[field] ?? formData.value?.form_data?.[field];

const isMultiServices = computed(() => selectedServices.value.length > 1);

/** Lots fusionnés (même ordre que le formulaire / API). */
const patientSlotRows = computed(() =>
  servicesRequiringOwnSlots(selectedServices.value as SelectedServiceInput[]),
);

/** Sous-étapes « documents ordonnance » : une par ligne de soin qui n’a pas l’option catalogue « masquer prescription ». */
const patientDocumentsSlotRows = computed(() =>
  patientSlotRows.value.filter((svc) => !careCategorySkipsPrescription(svc.category_id)),
);

function careCategorySkipsPrescription(categoryId: string | null | undefined): boolean {
  if (categoryId == null || String(categoryId).trim() === '') return false;
  const svc = selectedServices.value.find((s) => String(s.category_id) === String(categoryId));
  if (svc && normalizeCategorySkipPrescriptionDocuments(svc.skip_prescription_documents)) {
    return true;
  }
  const cat = careCategoriesList.value.find((c) => String(c.id) === String(categoryId));
  if (!cat) return false;
  return normalizeCategorySkipPrescriptionDocuments((cat as { skip_prescription_documents?: unknown }).skip_prescription_documents);
}

const patientBookingWizardSection = computed((): 'slot-datetime' | 'documents' | 'personal' => {
  const n = patientSlotRows.value.length;
  const nDoc = patientDocumentsSlotRows.value.length;
  const i = bookingWizardIndex.value;
  if (n === 0) return 'personal';
  if (i < n) return 'slot-datetime';
  if (nDoc > 0 && i < n + nDoc) return 'documents';
  return 'personal';
});

const patientBookingWizardFinalStep = computed(() => patientBookingWizardSection.value === 'personal');

/** En arrivant sur l’étape infos perso (changement d’index), effacer un message d’erreur résiduel — la validation ne s’affiche qu’après « Confirmer ». */
watch(bookingWizardIndex, () => {
  if (step.value === 2 && patientBookingWizardSection.value === 'personal') {
    validationError.value = '';
  }
});

const patientActiveSlotServiceId = computed(() => {
  if (patientBookingWizardSection.value !== 'slot-datetime') return null;
  return patientSlotRows.value[bookingWizardIndex.value]?.id ?? null;
});

const patientActiveDocumentsServiceId = computed(() => {
  if (patientBookingWizardSection.value !== 'documents') return null;
  const n = patientSlotRows.value.length;
  const docRows = patientDocumentsSlotRows.value;
  const i = bookingWizardIndex.value;
  const docIdx = i - n;
  return docRows[docIdx]?.id ?? null;
});

const bookingWizardPersonalStepVisible = computed(
  () => step.value === 2 && patientBookingWizardSection.value === 'personal',
);

/** Recaler l’index si le nombre de sous-étapes « documents » baisse (ex. activation masquage ordonnance). */
watch(
  () => [patientSlotRows.value.length, patientDocumentsSlotRows.value.length] as const,
  () => {
    const maxIx = patientSlotRows.value.length + patientDocumentsSlotRows.value.length;
    if (bookingWizardIndex.value > maxIx) {
      bookingWizardIndex.value = Math.max(0, maxIx);
    }
  },
);

function pushPatientAvailabilityErrors(
  svcData: Record<string, any>,
  svcName: string,
  missingFields: string[],
): void {
  const t = svcData.availability_type;
  if (t === 'all_day') return;

  if (t === 'urgent') {
    const mode = svcData.urgentTimingMode;
    if (mode === 'asap') return;
    const h = svcData.urgentHour;
    const m = Number(svcData.urgentMinute ?? 0);
    if (h == null || Number(h) < 6 || Number(h) > 19) {
      missingFields.push(`Indiquez une heure entre 6h et 19h pour l’option Horaire VIP (${svcName}).`);
    }
    if (![0, 15, 30, 45].includes(m)) {
      missingFields.push(`Les minutes doivent être par pas de 15 min (${svcName}).`);
    }
    return;
  }

  if (t === 'custom') {
    const range = svcData.availabilityRange ?? [9, 11];
    if (Array.isArray(range) && range.length === 2) {
      if (range[1] - range[0] >= AVAILABILITY_MIN_SPAN_HOURS) return;
      missingFields.push(`L'écart minimum des créneaux est de ${AVAILABILITY_MIN_SPAN_HOURS} h pour ${svcName}`);
      return;
    }
  }

  const availability = svcData.availability;
  let availabilityValid = false;
  if (availability && typeof availability === 'string' && availability.trim() !== '') {
    try {
      const availabilityData = JSON.parse(availability);
      if (!availabilityData || typeof availabilityData.type !== 'string') {
        /* fall through */
      } else if (availabilityData.type === 'urgent') {
        if (availabilityData.asap === true || String((availabilityData as any).mode ?? '') === 'asap') {
          availabilityValid = true;
          return;
        }
        const hour = Number(availabilityData.hour);
        const minute = Number((availabilityData as any).minute ?? 0);
        availabilityValid =
          !Number.isNaN(hour) &&
          hour >= 6 &&
          hour <= 19 &&
          [0, 15, 30, 45].includes(minute);
        if (!availabilityValid) {
          missingFields.push(`Créneau Horaire VIP invalide pour ${svcName}`);
        }
        return;
      } else if (availabilityData.type === 'custom' || availabilityData.type === 'all_day') {
        if (availabilityData.type === 'custom') {
          if (availabilityData.range && Array.isArray(availabilityData.range) && availabilityData.range.length === 2) {
            if (availabilityData.range[1] - availabilityData.range[0] >= AVAILABILITY_MIN_SPAN_HOURS) {
              availabilityValid = true;
            } else {
              missingFields.push(`L'écart minimum des créneaux est de ${AVAILABILITY_MIN_SPAN_HOURS} h pour ${svcName}`);
            }
          }
        } else {
          availabilityValid = true;
        }
      }
    } catch {
      /* ignore */
    }
  }
  if (!availabilityValid && !missingFields.some((m) => m.includes(svcName) && m.includes('créneaux'))) {
    missingFields.push(`Les créneaux de disponibilité sont obligatoires pour ${svcName}`);
  }
}

function pushPatientServiceBusinessErrorsForSlot(svc: SelectedServiceInput, missingFields: string[]) {
  const formDataByService = formData.value?.formDataByService ?? {};
  const svcData = formDataByService[svc.id] ?? {};
  if (isBloodTestAppointment(svc.type)) {
    if (!svcData.blood_test_type) {
      missingFields.push(`Type de prélèvement obligatoire pour ${svc.name}`);
    } else if (svcData.blood_test_type === 'multiple') {
      if (!svcData.duration_days) missingFields.push(`Nombre de jours obligatoire pour ${svc.name}`);
      if (svcData.duration_days === 'custom' && (!svcData.custom_days || svcData.custom_days < 1)) {
        missingFields.push(`Indiquez le nombre de jours pour ${svc.name}`);
      }
    }
  } else {
    if (!svcData.duration_days) {
      missingFields.push(`Prise en charge obligatoire pour ${svc.name}`);
    } else if (svcData.duration_days !== '1' && svcData.duration_days !== 'to_define' && !svcData.frequency) {
      missingFields.push(`Fréquence des passages obligatoire pour ${svc.name}`);
    }
  }
}

/** Validation affichée pour « Continuer » entre sous-étapes (pas OTP). */
function validateBookingWizardSubstep(): string[] {
  const missingFields: string[] = [];
  const rows = patientSlotRows.value;
  const n = rows.length;
  const i = bookingWizardIndex.value;
  if (i < n) {
    const svc = rows[i];
    const svcData = formData.value?.formDataByService?.[svc.id] ?? {};
    const scheduledAt = svcData.scheduled_at;
    if (!scheduledAt || (typeof scheduledAt === 'string' && scheduledAt.trim() === '')) {
      missingFields.push(`La date souhaitée est obligatoire pour ${svc.name}`);
    }
    pushPatientAvailabilityErrors(svcData, svc.name, missingFields);
    pushPatientServiceBusinessErrorsForSlot(svc, missingFields);
  }
  return missingFields;
}

async function scrollToBookingFormError() {
  if (typeof window === 'undefined') return;
  await nextTick();
  setTimeout(() => {
    const alertElement = document.getElementById('form-error-alert');
    if (alertElement) {
      const headerHeight = 80;
      const elementPosition = alertElement.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: elementPosition - headerHeight, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, 100);
}

async function onPatientBookingWizardNext() {
  validationError.value = '';
  rdvFormStepRef.value?.flushBookingDraftToParent?.();
  await nextTick();
  const missing = validateBookingWizardSubstep();
  if (missing.length > 0) {
    validationError.value =
      missing.length === 1 ? missing[0] : missing.map((msg, idx) => `${idx + 1}. ${msg}`).join('\n');
    await scrollToBookingFormError();
    return;
  }
  const n = patientSlotRows.value.length;
  const nDoc = patientDocumentsSlotRows.value.length;
  const lastIndex = n + nDoc;
  if (bookingWizardIndex.value < lastIndex) {
    bookingWizardIndex.value++;
    nextTick(() => {
      if (typeof window !== 'undefined') window.scrollTo(0, 0);
    });
  }
}

// Valider les champs obligatoires avant de passer à l'étape suivante
const validateAndNextStep = async () => {
  validationError.value = '';
  
  // Liste des champs obligatoires communs
  // category_id : non requis car les soins sont dans selectedServices (chaque svc a category_id)
  const requiredFields: Record<string, string> = {
    last_name: 'Le nom est obligatoire',
    first_name: 'Le prénom est obligatoire',
    email: 'L\'email est obligatoire',
    phone: 'Le téléphone est obligatoire',
    gender: 'Le genre est obligatoire',
    birth_date: 'La date de naissance est obligatoire',
    address: 'L\'adresse est obligatoire',
  };
  
  // Champs spécifiques : validés par service ci-dessous
  
  // Vérifier chaque champ obligatoire
  const missingFields: string[] = [];
  
  for (const [field, message] of Object.entries(requiredFields)) {
    const value = getField(field);
    
    if (!value || (typeof value === 'string' && value.trim() === '') || 
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && value !== null && Object.keys(value).length === 0)) {
      missingFields.push(message);
    }
  }
  
  // Vérifier spécifiquement l'adresse (doit avoir label, lat, lng)
  const address = getField('address');
  if (address) {
    if (!address.label || !address.lat || !address.lng) {
      missingFields.push('L\'adresse est incomplète. Veuillez sélectionner une adresse valide.');
    }
  }
  
  // Vérifier date et disponibilité par service (toujours dans formDataByService)
  const servicesRequiringOwnSlot = servicesRequiringOwnSlots(selectedServices.value as SelectedServiceInput[]);
  for (const svc of servicesRequiringOwnSlot) {
    const svcData = formData.value?.formDataByService?.[svc.id] ?? {};
    const scheduledAt = svcData.scheduled_at;
    if (!scheduledAt || (typeof scheduledAt === 'string' && scheduledAt.trim() === '')) {
      missingFields.push(`La date souhaitée est obligatoire pour ${svc.name}`);
    }
    pushPatientAvailabilityErrors(svcData, svc.name, missingFields);
    pushPatientServiceBusinessErrorsForSlot(svc, missingFields);
  }

  if (missingFields.length > 0) {
    validationError.value =
      missingFields.length === 1
        ? missingFields[0]
        : missingFields.map((msg, idx) => `${idx + 1}. ${msg}`).join('\n');
    await scrollToBookingFormError();
    return;
  }

  if (!consent.value) {
    validationError.value =
      'Veuillez accepter la politique de confidentialité et le traitement de vos données de santé avant de continuer.';
    await nextTick();
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        document.getElementById('rendez-vous-rgpd-consent')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
    return;
  }

  // Formulaire validé : invités → OTP tout de suite ; connectés → création directe (dans requestOTP)
  await requestOTP();
};

const nextStep = () => {
  if (step.value < 3) {
    step.value++;
    error.value = '';
    validationError.value = '';
    nextTick(() => { if (typeof window !== 'undefined') window.scrollTo(0, 0); });
  }
};

const prevStep = () => {
  if (step.value === 3) {
    step.value = 2;
    bookingWizardIndex.value = Math.max(0, patientSlotRows.value.length + patientDocumentsSlotRows.value.length);
  } else if (step.value === 2) {
    if (bookingWizardIndex.value > 0) {
      bookingWizardIndex.value--;
    } else if (patientNeedsLabPreferenceStep.value) {
      step.value = 1;
    } else {
      step.value = 0;
    }
  } else if (step.value === 1) {
    step.value = 0;
  } else if (step.value > 0) {
    step.value--;
  } else {
    return;
  }
  error.value = '';
  validationError.value = '';
  nextTick(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  });
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

// Demander l'OTP
const requestOTP = async () => {
  if (!consent.value) {
    toast.add({
      title: 'Consentement requis',
      description: 'Veuillez accepter la politique de confidentialité et le traitement de vos données de santé avant de continuer.',
      color: 'warning',
    });
    return;
  }

  if (requestingOTP.value || bookingSubmissionLocked.value) {
    return;
  }

  if (!formData.value.email && !(isAuthenticated.value && user.value)) {
    error.value = 'Email requis';
    return;
  }

  // Si on est déjà à l'étape OTP et qu'on a déjà un userId, ne pas redemander un code
  // L'utilisateur peut utiliser le bouton "Renvoyer" s'il veut un nouveau code
  if (step.value === 3 && userId.value && !(isAuthenticated.value && user.value)) {
    return;
  }

  requestingOTP.value = true;
  error.value = '';

  // Si l'utilisateur est déjà connecté, créer directement le rendez-vous sans OTP
  if (isAuthenticated.value && user.value) {
    try {
      await createAppointmentDirectly();
    } finally {
      requestingOTP.value = false;
    }
    return;
  }

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

// Construire les payloads pour chaque soin sélectionné (plusieurs prélèvements → un seul RDV lab + items)
function buildAppointmentPayloads(patientId: string): any[] {
  const formDataByService = formData.value?.formDataByService ?? {};
  const svcs = selectedServices.value;
  const bloodList = svcs.filter((svc) => isBloodTestAppointment(svc.type));
  const nursingList = svcs.filter((svc) => isNursingAppointment(svc.type));
  const mergeBlood = bloodList.length > 1;
  const mergeNursing = nursingList.length > 1;
  const payloadCount = countGroupedAppointmentPayloads(svcs as SelectedServiceInput[]);
  const sharedBatchId =
    payloadCount > 1 && typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : undefined;
  const sharedBatchSize = payloadCount > 1 ? payloadCount : 0;
  const { formDataByService: _fd, selectedServices: _ss, isMultiServices: _im, ...commonForm } = formData.value ?? {};

  function decoratePublicPayload(payload: any, svc?: { type: string }) {
    if (sharedBatchId) {
      payload.creation_batch_id = sharedBatchId;
      payload.creation_batch_size = sharedBatchSize;
    }
    if (typeof selectedRelative.value === 'string') {
      payload.relative_id = selectedRelative.value;
    }
    if (isProviderBooking.value && providerId.value && providerType.value) {
      if (svc) {
        if (providerType.value === 'nurse' && isNursingAppointment(svc.type)) {
          payload.assigned_nurse_id = providerId.value;
        } else if (providerType.value === 'lab' && isBloodTestAppointment(svc.type)) {
          payload.assigned_lab_id = providerId.value;
        } else if (providerType.value === 'pro') {
          payload.assigned_pro_id = providerId.value;
        }
      } else if (providerType.value === 'lab') {
        payload.assigned_lab_id = providerId.value;
      } else if (providerType.value === 'pro') {
        payload.assigned_pro_id = providerId.value;
      }
    }
    if (utmQr.value) {
      payload.utm_qr = utmQr.value;
    }
  }

  function singlePayload(svc: (typeof svcs)[number]) {
    const svcData = formDataByService[svc.id] ?? {};
    const baseFormData: Record<string, unknown> = {
      ...commonForm,
      address: formData.value?.address,
      files: svcData.form_data_files ?? {},
      availability: svcData.availability,
      scheduled_at: svcData.scheduled_at,
    };
    if (isBloodTestAppointment(svc.type)) {
      Object.assign(baseFormData, {
        blood_test_type: svcData.blood_test_type,
        duration_days: svcData.blood_test_type === 'multiple' ? svcData.duration_days : undefined,
        custom_days: svcData.duration_days === 'custom' ? svcData.custom_days : undefined,
      });
      if (svcData.patient_urgency) {
        (baseFormData as Record<string, unknown>).patient_urgency = svcData.patient_urgency;
      }
    } else {
      Object.assign(baseFormData, {
        duration_days: svcData.duration_days,
        frequency: svcData.frequency,
        custom_days: svcData.duration_days === 'custom' ? svcData.custom_days : undefined,
        preferred_nurse_gender: svcData.preferred_nurse_gender ?? 'any',
      });
    }
    baseFormData.notes = svcData.notes || undefined;
    if (svcData.care_options && Object.keys(svcData.care_options).length) {
      baseFormData.care_options = svcData.care_options;
    }
    const payload: any = {
      type: svc.type,
      form_type: svc.type,
      category_id: svc.category_id,
      patient_id: patientId,
      address: formData.value?.address,
      scheduled_at: svcData.scheduled_at,
      form_data: baseFormData,
      files: svcData.files ?? {},
    };
    decoratePublicPayload(payload, svc);
    return payload;
  }

  function mergedBloodPayload() {
    const firstSvc = bloodList[0];
    const firstSvcData = formDataByService[firstSvc.id] ?? {};
    const bloodTestItems = bloodList.map((svc, index) => ({
      category_id: svc.category_id,
      label: svc.name,
      care_options: formDataByService[svc.id]?.care_options ?? {},
      sort_order: index,
    }));
    const baseFormData = {
      ...commonForm,
      address: formData.value?.address,
      files: firstSvcData.form_data_files ?? {},
      availability: firstSvcData.availability,
      scheduled_at: firstSvcData.scheduled_at,
      blood_test_type: firstSvcData.blood_test_type,
      duration_days: firstSvcData.blood_test_type === 'multiple' ? firstSvcData.duration_days : undefined,
      custom_days: firstSvcData.duration_days === 'custom' ? firstSvcData.custom_days : undefined,
      notes: firstSvcData.notes || undefined,
      care_options:
        firstSvcData.care_options && Object.keys(firstSvcData.care_options).length ? firstSvcData.care_options : undefined,
      blood_test_items: bloodTestItems,
      ...(firstSvcData.patient_urgency ? { patient_urgency: firstSvcData.patient_urgency } : {}),
    };
    const payload: any = {
      type: 'blood_test',
      form_type: 'blood_test',
      category_id: firstSvc.category_id,
      patient_id: patientId,
      address: formData.value?.address,
      scheduled_at: firstSvcData.scheduled_at,
      form_data: baseFormData,
      files: firstSvcData.files ?? formData.value?.files ?? {},
      blood_test_items: bloodTestItems,
    };
    decoratePublicPayload(payload);
    return payload;
  }

  function mergedNursingPayload() {
    const firstSvc = nursingList[0];
    const firstSvcData = formDataByService[firstSvc.id] ?? {};
    const nursingItems = nursingList.map((svc, index) => ({
      category_id: svc.category_id,
      label: svc.name,
      care_options: formDataByService[svc.id]?.care_options ?? {},
      sort_order: index,
    }));
    const baseFormData: Record<string, unknown> = {
      ...commonForm,
      address: formData.value?.address,
      files: firstSvcData.form_data_files ?? {},
      availability: firstSvcData.availability,
      scheduled_at: firstSvcData.scheduled_at,
      duration_days: firstSvcData.duration_days,
      frequency: firstSvcData.frequency,
      custom_days: firstSvcData.duration_days === 'custom' ? firstSvcData.custom_days : undefined,
      preferred_nurse_gender: firstSvcData.preferred_nurse_gender ?? 'any',
      notes: firstSvcData.notes || undefined,
      nursing_items: nursingItems,
    };
    if (nursingItems.length <= 1 && firstSvcData.care_options && Object.keys(firstSvcData.care_options).length) {
      baseFormData.care_options = firstSvcData.care_options;
    }
    const payload: any = {
      type: 'nursing',
      form_type: 'nursing',
      category_id: firstSvc.category_id,
      patient_id: patientId,
      address: formData.value?.address,
      scheduled_at: firstSvcData.scheduled_at,
      form_data: baseFormData,
      files: firstSvcData.files ?? formData.value?.files ?? {},
      nursing_items: nursingItems,
    };
    decoratePublicPayload(payload, firstSvc);
    return payload;
  }

  if (!mergeBlood && !mergeNursing) {
    return applyLabPreferenceToBloodPayloads(svcs.map(singlePayload), formData.value ?? {});
  }

  const out: any[] = [];
  let bloodEmitted = false;
  let nursingEmitted = false;
  for (const svc of svcs) {
    if (isBloodTestAppointment(svc.type)) {
      if (!mergeBlood) {
        out.push(singlePayload(svc));
      } else if (!bloodEmitted) {
        out.push(mergedBloodPayload());
        bloodEmitted = true;
      }
    } else if (isNursingAppointment(svc.type)) {
      if (!mergeNursing) {
        out.push(singlePayload(svc));
      } else if (!nursingEmitted) {
        out.push(mergedNursingPayload());
        nursingEmitted = true;
      }
    } else {
      out.push(singlePayload(svc));
    }
  }
  return applyLabPreferenceToBloodPayloads(out, formData.value ?? {});
}

function patientBookingNeedsUrgentStripePayment(): boolean {
  const fds = formData.value?.formDataByService ?? {};
  for (const svc of selectedServices.value) {
    if (formSliceNeedsVipPayment(svc.type, fds[svc.id] as Record<string, unknown> | undefined)) {
      return true;
    }
  }
  return false;
}

async function submitPatientUrgentDraftAndRedirectStripe(patientId: string): Promise<void> {
  const payloads = buildAppointmentPayloads(patientId);
  const jsonPayloads = payloads.map((p) => {
    const { files: _files, ...rest } = p as Record<string, unknown>;
    return rest;
  });
  const formDataBody = new FormData();
  formDataBody.append('payloads', JSON.stringify(jsonPayloads));
  for (let pi = 0; pi < payloads.length; pi++) {
    const pf = (payloads[pi] as { files?: Record<string, File> }).files;
    if (pf && typeof pf === 'object') {
      for (const [key, file] of Object.entries(pf)) {
        if (file instanceof File) {
          formDataBody.append(`u_${pi}_${key}`, file, file.name);
        }
      }
    }
  }
  await preloadCsrfToken().catch(() => {});
  const res = (await apiFetch('/patient/booking-draft', {
    method: 'POST',
    body: formDataBody,
    timeout: 120000,
  })) as { success?: boolean; data?: { draft_id?: string }; error?: string };
  if (!res?.success || !res.data?.draft_id) {
    throw new Error(res?.error || 'Échec enregistrement du brouillon');
  }
  const draftId = res.data.draft_id;
  const ck = (await apiFetch('/patient/booking-draft/checkout', {
    method: 'POST',
    body: { draft_id: draftId },
  })) as { success?: boolean; url?: string; error?: string };
  if (!ck?.success || !ck.url) {
    throw new Error(ck?.error || 'Échec préparation du paiement');
  }
  bookingDraftDisabled.value = true;
  clearBookingDraft();
  if (typeof window !== 'undefined') {
    window.location.href = ck.url;
  }
}

async function navigateAfterPatientBooking() {
  bookingDbg('navigation patient', { to: '/patient' });
  try {
    await router.push('/patient');
  } catch {
    if (typeof window !== 'undefined') window.location.assign('/patient');
  }
}

// Créer les rendez-vous (1 ou plusieurs)
const createAppointmentDirectly = async () => {
  if (!consent.value) {
    toast.add({
      title: 'Consentement requis',
      description: 'Veuillez accepter la politique de confidentialité et le traitement de vos données de santé avant de continuer.',
      color: 'warning',
    });
    return;
  }

  if (bookingSubmissionLocked.value) {
    return;
  }

  otpLoading.value = true;
  error.value = '';
  bookingSubmissionLocked.value = true;

  try {
    const patientId = user.value?.id;
    if (!patientId) {
      error.value = 'Utilisateur non connecté';
      return;
    }

    if (patientBookingNeedsUrgentStripePayment()) {
      await submitPatientUrgentDraftAndRedirectStripe(patientId);
      return;
    }

    const payloads = buildAppointmentPayloads(patientId);

    await preloadCsrfToken().catch(() => {});

    const wrapped = await runWithBookingCelebrationOverlay(bookingOverlayShow, async () => {
      bookingDbg('création RDV (API) début', { payloads: payloads.length });
      const result = await createMultipleAppointments(payloads);
      const success = result.success === true;
      const apiErr =
        !success && result?.error
          ? String(result.error).trim()
          : '';
      bookingDbg('création RDV (API) fin', {
        success,
        payloads: payloads.length,
        ...(apiErr ? { apiError: apiErr } : {}),
      });
      return { success, result };
    });

    const success = wrapped.success === true;
    const result = (wrapped as { success: boolean; result?: { success?: boolean; error?: string; createdIds?: string[] } }).result;

    if (!success) {
      error.value =
        result && typeof result === 'object' && result !== null && result.error
          ? String(result.error || '')
          : 'Erreur lors de la création du rendez-vous';
      if (!error.value) error.value = 'Erreur lors de la création du rendez-vous';
      return;
    }

    bookingDraftDisabled.value = true;
    clearBookingDraft();
    await navigateAfterPatientBooking();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erreur lors de la création du rendez-vous';
  } finally {
    otpLoading.value = false;
    bookingSubmissionLocked.value = false;
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

  if (bookingSubmissionLocked.value) {
    return;
  }
  
  otpLoading.value = true;
  bookingSubmissionLocked.value = true;
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

    await preloadCsrfToken().catch(() => {});

    const patientId = user.value?.id || otpResult.user?.id || userId.value;

    if (patientBookingNeedsUrgentStripePayment()) {
      await submitPatientUrgentDraftAndRedirectStripe(patientId);
      return;
    }

    const payloads = buildAppointmentPayloads(patientId);

    const wrapped = await runWithBookingCelebrationOverlay(bookingOverlayShow, async () => {
      bookingDbg('création RDV après OTP début', { payloads: payloads.length });
      const result = await createMultipleAppointments(payloads);
      const success = result.success === true;
      const apiErr =
        !success && result?.error
          ? String(result.error).trim()
          : '';
      bookingDbg('création RDV après OTP fin', {
        success,
        payloads: payloads.length,
        ...(apiErr ? { apiError: apiErr } : {}),
      });
      return { success, result };
    });

    const apiResult = (wrapped as { success: boolean; result?: { success?: boolean; error?: string; createdIds?: string[] } }).result;

    if (wrapped.success !== true) {
      error.value = apiResult?.error || 'Erreur lors de la création du rendez-vous';
      return;
    }

    bookingDraftDisabled.value = true;
    clearBookingDraft();
    await navigateAfterPatientBooking();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erreur lors de la vérification';
    otpCode.value = [];
  } finally {
    otpLoading.value = false;
    bookingSubmissionLocked.value = false;
  }
};

const BOOKING_STATE_KEY = 'appointment_booking_state';
/** Empêche toute re-sauvegarde du brouillon après validation finale du RDV. */
const bookingDraftDisabled = ref(false);

function clearBookingDraft() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(BOOKING_STATE_KEY);
  } catch {
    /* ignore */
  }
}

/** Sérialisation JSON : les File ne sont pas persistés (re-téléversement au besoin après retour). */
function bookingStateReplacer(_key: string, value: unknown): unknown {
  if (value instanceof File) {
    return { __bookingFileStub: true, name: value.name, size: value.size, type: value.type };
  }
  return value;
}

// Brouillon RDV : sauvegarde continue + à la sortie de page (login, profil, etc.)
const saveFormState = () => {
  if (typeof window === 'undefined') return;
  if (bookingDraftDisabled.value) return;
  const hasProgress =
    step.value > 0 ||
    selectedServices.value.length > 0 ||
    (formData.value && Object.keys(formData.value).length > 0);
  if (!hasProgress) return;
  try {
    const state = {
      step: step.value,
      bookingWizardIndex: bookingWizardIndex.value,
      selectedServices: selectedServices.value,
      formData: formData.value,
      consent: consent.value,
      selectedRelative: selectedRelative.value,
      showRelativesSelector: showRelativesSelector.value,
      showFullForm: showFullForm.value,
      userId: userId.value,
      sessionId: sessionId.value,
      otpSent: otpSent.value,
      otpCode: otpCode.value,
      labPreferenceMode: labPreferenceMode.value,
      preferredLabBrandId: preferredLabBrandId.value,
      providerBooking:
        providerId.value && providerType.value
          ? {
              provider_id: providerId.value,
              provider_type: providerType.value,
              ...(utmQr.value ? { utm_qr: utmQr.value } : {}),
            }
          : null,
    };
    sessionStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(state, bookingStateReplacer));
  } catch (e) {
    console.error('Erreur lors de la sauvegarde de l\'état:', e);
  }
};

let bookingSaveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSaveFormState() {
  if (typeof window === 'undefined') return;
  if (bookingDraftDisabled.value) return;
  if (bookingSaveTimer) clearTimeout(bookingSaveTimer);
  bookingSaveTimer = setTimeout(() => {
    bookingSaveTimer = null;
    saveFormState();
  }, 400);
}

watch(
  [
    step,
    bookingWizardIndex,
    selectedServices,
    formData,
    consent,
    selectedRelative,
    showRelativesSelector,
    showFullForm,
    userId,
    sessionId,
    otpSent,
    otpCode,
    labPreferenceMode,
    preferredLabBrandId,
  ],
  () => scheduleSaveFormState(),
  { deep: true },
);

// Sauvegarder à chaque sortie du formulaire (connexion, avatar → profil, etc.)
onBeforeRouteLeave((to, from, next) => {
  if (from.path === '/rendez-vous/nouveau' && to.path !== from.path) {
    if (bookingDraftDisabled.value) {
      next();
      return;
    }
    rdvFormStepRef.value?.flushBookingDraftToParent?.();
    saveFormState();
  }
  next();
});

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return;
  bookingOverlayShow.value = false;
  bookingSubmissionLocked.value = false;
  if (bookingDraftDisabled.value) return;
  saveFormState();
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

// Basculer "Pour un proche" : pré-sélectionner le premier de la liste si présent
const toggleProcheSelector = () => {
  showRelativesSelector.value = !showRelativesSelector.value;
  if (showRelativesSelector.value) {
    if (relatives.value.length > 0) {
      const first = relatives.value[0];
      selectedRelative.value = first.id;
      loadRelativeData(first.id);
    } else {
      selectedRelative.value = undefined;
    }
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

function onLoadRelativeFromFormStep(relativeId: string) {
  selectedRelative.value = relativeId;
  loadRelativeData(relativeId);
}

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

// Charger les catégories (liste pour l’étape 0), restaurer un brouillon, puis appliquer les query params si besoin
onMounted(async () => {
  let restoredFromDraft = false;

  if (typeof window !== 'undefined') {
    const savedState = sessionStorage.getItem(BOOKING_STATE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.step !== undefined) {
          let s = state.step;
          const hasFormProgress =
            (typeof state.bookingWizardIndex === 'number' && state.bookingWizardIndex > 0) ||
            !!state.formData?.email ||
            !!state.formData?.first_name;
          if (s === 1 && hasFormProgress) s = 2;
          if (s === 1 && !patientNeedsLabPreferenceStep.value) s = 2;
          step.value = s;
        }
        if (state.labPreferenceMode) labPreferenceMode.value = state.labPreferenceMode;
        if ('preferredLabBrandId' in state) preferredLabBrandId.value = state.preferredLabBrandId ?? null;
        if (state.selectedServices?.length) {
          selectedServices.value = state.selectedServices.map((s: any) => ({
            ...s,
            icon: s.icon || (s.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-heart-pulse'),
          }));
        }
        if (typeof state.bookingWizardIndex === 'number' && Number.isFinite(state.bookingWizardIndex)) {
          bookingWizardIndex.value = state.bookingWizardIndex;
        }
        if (state.formData) formData.value = state.formData;
        // Consentement RGPD : toujours repartir sur « accepté » à l’affichage du formulaire (pas de restauration depuis le brouillon).
        if ('selectedRelative' in state) selectedRelative.value = state.selectedRelative;
        if (typeof state.showRelativesSelector === 'boolean') showRelativesSelector.value = state.showRelativesSelector;
        if (typeof state.showFullForm === 'boolean') showFullForm.value = state.showFullForm;
        if (state.userId) userId.value = state.userId;
        if (state.sessionId) sessionId.value = state.sessionId;
        if (typeof state.otpSent === 'boolean') otpSent.value = state.otpSent;
        if (Array.isArray(state.otpCode)) otpCode.value = state.otpCode;
        if (
          state.providerBooking?.provider_id &&
          state.providerBooking?.provider_type &&
          !route.query.provider_id
        ) {
          stickyProviderBooking.value = state.providerBooking;
          if (state.providerBooking?.utm_qr) {
            stickyUtmQr.value = state.providerBooking.utm_qr;
          }
        }
        restoredFromDraft = true;
        // Ne pas supprimer le brouillon ici : permet retour login/refresh sans perdre les champs ;
        // nettoyage dans clearBookingDraft() après création du RDV.
      } catch (e) {
        console.error('Erreur lors de la restauration de l\'état:', e);
      }
    }
  }

  if (isAuthenticated.value) {
    consent.value = true;
  }

  if (isProviderBooking.value) {
    loadProviderName();
  }

  if (utmQr.value && import.meta.client) {
    try {
      const sessionKey = `qr_visit_${utmQr.value}`;
      if (!sessionStorage.getItem(sessionKey)) {
        await apiFetch('/qr/visit', {
          method: 'POST',
          body: { token: utmQr.value, session_id: sessionKey },
        });
        sessionStorage.setItem(sessionKey, '1');
      }
    } catch {
      /* non bloquant */
    }
  }

  await loadCareCategories();

  /** Recale l’index wizard une fois les catégories connues (sous-étapes « documents » variables). */
  if (selectedServices.value.length > 0) {
    const nSlots = patientSlotRows.value.length;
    const maxIx = Math.max(0, nSlots + patientDocumentsSlotRows.value.length);
    bookingWizardIndex.value = Math.min(Math.max(0, bookingWizardIndex.value), maxIx);
  }

  const typeFromUrl = route.query.type as string | undefined;
  const categoryFromUrl = route.query.category as string | undefined;

  if (!restoredFromDraft && (typeFromUrl === 'blood_test' || typeFromUrl === 'nursing')) {
    if (categoryFromUrl && careCategoriesList.value.length > 0) {
      const cat = careCategoriesList.value.find((c: any) => c.id === categoryFromUrl);
      if (cat) {
        selectedServices.value = [bookingServiceLineFromCategory(cat)];
        step.value = firstStepAfterCareSelection();
        bookingWizardIndex.value = 0;
      }
    } else if (careCategoriesList.value.length === 0) {
      const fallback = serviceItems.find((i: any) => i.value === typeFromUrl);
      if (fallback) {
        selectedServices.value = [{ id: fallback.value, type: fallback.value, name: fallback.label, category_id: null, icon: fallback.icon }];
        step.value = firstStepAfterCareSelection();
        bookingWizardIndex.value = 0;
      }
    }
    // `?type=` seul : aucune ligne forcée (`careSelectionInitialFilterTab` + étape 0 pour cumuler plusieurs analyses).
  }

  if (isAuthenticated.value) {
    await fetchRelatives();
    if (!restoredFromDraft) {
      selectForMyself();
    }
  }
});

// Nettoyer le compteur à la destruction
onUnmounted(() => {
  countdown.value = 0;
});
</script>
