<template>
  <div>
    <BookingCelebrationOverlay
      :show="bookingOverlayShow"
      :images="bookingCelebrationImageUrls"
      :rotate-icons="bookingCelebrationRotateIcons"
    />

    <ClientOnly>
      <Teleport to="body">
        <UModal
          v-model:open="duplicatePatientModalOpen"
          :ui="{ content: 'max-w-sm w-full !p-0 sm:!p-0' }"
          @update:open="onDuplicatePatientModalToggle"
        >
          <template #content>
            <UCard class="w-full border-0 shadow-none ring-0" :ui="{ body: '!p-0 sm:!p-0' }">
              <div
                class="px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 sm:pb-6"
              >
                <div class="flex flex-col gap-2.5 items-start sm:gap-3">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100/90 ring-1 ring-sky-200/70 dark:bg-sky-950/55 dark:ring-sky-800/55"
                    aria-hidden="true"
                  >
                    <UIcon name="i-lucide-user-search" class="h-[22px] w-[22px] text-sky-600 dark:text-sky-400" />
                  </div>
                  <div class="w-full min-w-0 text-left">
                    <p class="text-base font-semibold leading-snug text-gray-900 dark:text-white sm:text-[1.05rem]">Patient déjà enregistré</p>
                    <p class="mt-1 text-[11px] leading-snug text-gray-600 dark:text-gray-400 sm:mt-1.5 sm:text-xs">
                      Même e-mail ou téléphone qu’un dossier existant. Vous pouvez l’utiliser pour éviter un doublon.
                    </p>
                  </div>
                </div>
                <dl
                  v-if="duplicatePatientRow"
                  class="mt-2 space-y-1 rounded-lg border border-gray-200/90 bg-gray-50/90 px-2.5 py-2 text-xs sm:mt-2.5 sm:px-3 sm:py-2 dark:border-gray-700 dark:bg-gray-900/50"
                >
                  <div class="flex items-baseline justify-between gap-2">
                    <dt class="shrink-0 text-gray-500 dark:text-gray-400">Identité</dt>
                    <dd class="min-w-0 text-right text-[13px] font-semibold text-gray-900 dark:text-white">
                      {{ duplicatePatientDisplayName }}
                    </dd>
                  </div>
                  <div v-if="duplicatePatientBirthLabel" class="flex items-baseline justify-between gap-2">
                    <dt class="shrink-0 text-gray-500 dark:text-gray-400">Naissance</dt>
                    <dd class="text-right text-[13px] font-medium text-gray-900 dark:text-white">
                      {{ duplicatePatientBirthLabel }}
                    </dd>
                  </div>
                </dl>
                <div class="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:gap-2">
                  <UButton
                    color="primary"
                    size="xl"
                    block
                    class="min-h-11 justify-center text-sm font-semibold sm:min-h-12 sm:text-base"
                    @click="confirmAdoptExistingPatientFromLookup"
                  >
                    Utiliser ce patient
                  </UButton>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    block
                    class="text-xs underline underline-offset-2"
                    @click="dismissDuplicatePatientModal"
                  >
                    Modifier l’e-mail ou le téléphone
                  </UButton>
                </div>
              </div>
            </UCard>
          </template>
        </UModal>
      </Teleport>
    </ClientOnly>

    <RendezVousCareSelection
      v-if="step === 0"
      v-model:selected-services="selectedServices"
      :categories="careCategoriesList"
      :loading="categoriesLoading"
      :restrict-category-types="restrictCategoryTypes"
      :selection-title="selectionTitle"
      :dashboard-layout="true"
      :form-data-by-service="(formData.formDataByService ?? {}) as Record<string, BookingServiceFormSlice | undefined>"
      @continue="confirmStep0"
      @quick-add-service="mergeQuickServiceIntoBooking"
      @remove-service-from-cart="removeServiceFromCareSelection"
    />

    <div v-else class="min-h-[calc(100vh-4rem)] bg-app-canvas dark:bg-gray-950 pb-32">
      <div class="mx-auto w-full max-w-5xl px-0 pt-3 pb-5 sm:px-6 sm:pt-4 sm:pb-6 md:max-w-3xl">
        <template v-if="selectedServices.length > 0">
          <header
            :class="[
              'px-4 text-left sm:px-0',
              dashboardWizardBookingHeaderIntro
                ? 'mb-1.5 sm:mb-2'
                : dashboardBookingWizardSection === 'personal'
                  ? 'mb-2 sm:mb-3'
                  : 'mb-4 sm:mb-6',
            ]"
          >
            <h1 class="text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl">
              {{ dashboardWizardPageHeading }}
            </h1>
          </header>

          <UAlert
            v-if="validationError"
            color="error"
            variant="soft"
            icon="i-lucide-alert-circle"
            title="Champs obligatoires manquants"
            class="mx-4 mb-6 scroll-mt-6 sm:mx-0"
            id="form-error-alert"
          >
          <template #description>
            <div class="whitespace-pre-line">{{ validationError }}</div>
          </template>
        </UAlert>

        <section
          v-if="isAdminDashboard && dashboardBookingWizardSection === 'personal'"
          class="mx-4 mb-6 space-y-4 rounded-xl border border-dashed border-amber-200/90 bg-amber-50/50 p-4 dark:border-amber-900/35 dark:bg-amber-950/20 sm:mx-0"
          aria-labelledby="admin-rdv-settings-title"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield-check" class="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
            <h2 id="admin-rdv-settings-title" class="text-sm font-semibold text-gray-900 dark:text-white">
              Réglages administrateur
            </h2>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <UFormField label="Statut à la création" name="admin_status">
              <USelect
                v-model="adminRdvStatus"
                :items="adminStatusSelectOptions"
                value-key="value"
                placeholder="Statut…"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Laboratoire (prélèvement)"
              name="assigned_lab_id"
            >
              <USelectMenu
                v-model="adminAssignedLabId"
                :items="adminLabSelectItems"
                value-key="value"
                placeholder="Libre ou auto…"
                class="w-full min-w-0"
                clearable
                :loading="adminLabsLoading"
                :filter-fields="['label']"
                :search-input="{ placeholder: 'Rechercher un lab…' }"
              >
                <template #label>
                  <span v-if="!adminAssignedLabId" class="text-muted">Sans assignation laboratoire</span>
                  <span v-else>{{ adminLabSelectItems.find((i) => i.value === adminAssignedLabId)?.label }}</span>
                </template>
              </USelectMenu>
            </UFormField>
            <UFormField
              label="Infirmier(ère)"
              name="assigned_nurse_id"
            >
              <USelectMenu
                v-model="adminAssignedNurseId"
                :items="adminNurseSelectItems"
                value-key="value"
                placeholder="Sans assignation préalable…"
                class="w-full min-w-0"
                clearable
                :loading="adminNursesLoading"
                :filter-fields="['label']"
                :search-input="{ placeholder: 'Rechercher un infirmier…' }"
              >
                <template #label>
                  <span v-if="!adminAssignedNurseId" class="text-muted">Sans assignation infirmier</span>
                  <span v-else>{{ adminNurseSelectItems.find((i) => i.value === adminAssignedNurseId)?.label }}</span>
                </template>
              </USelectMenu>
            </UFormField>
          </div>
        </section>

        <ClientOnly>
          <UnifiedAppointmentForm
            v-if="selectedServices.length > 0"
            ref="unifiedFormRef"
            v-model="formData"
            :selected-services="selectedServices"
            :categories="careCategoriesList"
            patient-section-id="wizard-rdv-patient-card"
            :patient-document-user-id="patientDocumentUserIdForForm"
            :allow-patient-email-edit="true"
            :skip-logged-in-patient-prefill="true"
            :hide-preferred-nurse-gender="isNurseDashboard"
            :patient-email-optional="patientEmailOptional"
            :patient-phone-optional="patientPhoneOptional"
            :accept-saturday="true"
            :accept-sunday="true"
            :min-lead-time-hours="0"
            :booking-wizard-section="dashboardBookingWizardSection"
            :active-slot-service-id="dashboardActiveSlotServiceId"
            :active-documents-service-id="dashboardActiveDocumentsServiceId"
            @submit="onUnifiedSubmit"
          >
            <template #patientToolbar>
              <div class="flex flex-col gap-3 sm:gap-4">
                <div
                  class="relative overflow-visible rounded-2xl border border-gray-200/95 bg-gray-100/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-gray-700/90 dark:bg-gray-900/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-2"
                  role="tablist"
                  aria-label="Mode patient"
                >
                  <div class="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      role="tab"
                      :aria-selected="patientMode === 'existing'"
                      class="group relative flex min-h-[2.75rem] min-w-0 flex-row items-center justify-center gap-2 rounded-xl px-2.5 py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-900 sm:min-h-[3rem] sm:rounded-[0.8125rem] sm:px-3 sm:py-2.5"
                      :class="
                        patientMode === 'existing'
                          ? 'z-[1] bg-sky-50 text-sky-950 shadow-[0_1px_3px_rgba(14,165,233,0.14)] outline outline-1 outline-sky-300/75 dark:bg-sky-950/40 dark:text-sky-50 dark:shadow-[0_2px_8px_-2px_rgba(14,165,233,0.2)] dark:outline-sky-500/35'
                          : 'z-0 text-gray-600 hover:bg-white/75 hover:text-gray-900 active:bg-white/90 dark:text-gray-400 dark:hover:bg-gray-800/80 dark:hover:text-gray-50 dark:active:bg-gray-800'
                      "
                      @click="patientMode = 'existing'"
                    >
                      <UIcon
                        name="i-lucide-users"
                        class="size-4 shrink-0 transition-[color] sm:size-[1.125rem]"
                        aria-hidden="true"
                      />
                      <span class="max-w-full text-left text-[11px] font-semibold leading-tight sm:text-sm">
                        Patient dans la liste
                      </span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      :aria-selected="patientMode === 'new'"
                      class="group relative flex min-h-[2.75rem] min-w-0 flex-row items-center justify-center gap-2 rounded-xl px-2.5 py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-900 sm:min-h-[3rem] sm:rounded-[0.8125rem] sm:px-3 sm:py-2.5"
                      :class="
                        patientMode === 'new'
                          ? 'z-[1] bg-sky-50 text-sky-950 shadow-[0_1px_3px_rgba(14,165,233,0.14)] outline outline-1 outline-sky-300/75 dark:bg-sky-950/40 dark:text-sky-50 dark:shadow-[0_2px_8px_-2px_rgba(14,165,233,0.2)] dark:outline-sky-500/35'
                          : 'z-0 text-gray-600 hover:bg-white/75 hover:text-gray-900 active:bg-white/90 dark:text-gray-400 dark:hover:bg-gray-800/80 dark:hover:text-gray-50 dark:active:bg-gray-800'
                      "
                      @click="patientMode = 'new'"
                    >
                      <UIcon
                        name="i-lucide-user-plus"
                        class="size-4 shrink-0 transition-[color] sm:size-[1.125rem]"
                        aria-hidden="true"
                      />
                      <span class="max-w-full text-left text-[11px] font-semibold leading-tight sm:text-sm">
                        Nouveau patient
                      </span>
                    </button>
                  </div>
                </div>
                <UFormField v-if="patientMode === 'existing'" label="Choisir un patient" name="patient_id" required>
                  <USelectMenu
                    v-model="selectedPatientId"
                    :items="patientSelectItems"
                    value-key="value"
                    :loading="patientsLoading || patientProfileLoading"
                    placeholder="Sélectionner un patient…"
                    size="lg"
                    class="w-full min-w-0"
                    :search-input="{ placeholder: patientSelectSearchPlaceholder }"
                    :filter-fields="['label', 'searchText']"
                  >
                    <template #label>
                      <span v-if="!selectedPatientId" class="text-gray-400">Sélectionner un patient…</span>
                      <span v-else>{{ selectedPatientSelectLabel }}</span>
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
                      <PatientSelectMenuEmpty :search-term="searchTerm" :suggest-new-patient-option="false" />
                    </template>
                  </USelectMenu>
                  <p v-if="patientProfileLoading" class="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <UIcon name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin shrink-0" />
                    Chargement du dossier patient (adresse, documents)…
                  </p>
                  <div
                    v-else-if="selectedPatientId"
                    class="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40"
                  >
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">Fiche patient</p>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <template v-if="existingPatientProfileIncomplete">
                        Complétez les informations manquantes ci-dessous (genre, date de naissance…) pour valider le rendez-vous.
                      </template>
                      <template v-else>
                        Vous pouvez corriger les coordonnées ci-dessous avant la prise de rendez-vous.
                      </template>
                    </p>
                  </div>
                </UFormField>
              </div>
            </template>

            <template #footer>
              <div
                v-if="showProNurseAssignment && dashboardBookingWizardSection === 'personal'"
                id="wizard-pro-nurse-assignment"
                class="mb-4 scroll-mt-28 space-y-3 rounded-xl border border-gray-200/90 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/40"
              >
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">Affectation infirmier(ère)</p>
                  <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Dispatch Cary (par défaut) ou infirmier(ère) du patient.
                  </p>
                </div>
                <div class="flex rounded-lg border border-gray-200/90 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-950">
                  <button
                    type="button"
                    class="flex-1 rounded-md px-2 py-2 text-[12px] font-medium transition-colors"
                    :class="
                      nurseAssignmentMode === 'cary_dispatch'
                        ? 'bg-primary-50 text-primary-800 shadow-sm dark:bg-primary-950/40 dark:text-primary-100'
                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                    "
                    @click="nurseAssignmentMode = 'cary_dispatch'"
                  >
                    Trouver sur Cary
                  </button>
                  <button
                    type="button"
                    class="flex-1 rounded-md px-2 py-2 text-[12px] font-medium transition-colors"
                    :class="
                      nurseAssignmentMode === 'patient_nurse'
                        ? 'bg-primary-50 text-primary-800 shadow-sm dark:bg-primary-950/40 dark:text-primary-100'
                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                    "
                    @click="nurseAssignmentMode = 'patient_nurse'"
                  >
                    Infirmier du patient
                  </button>
                </div>
                <template v-if="nurseAssignmentMode === 'patient_nurse'">
                  <UFormField label="Choisir dans la liste" name="pro_linked_nurse">
                    <USelectMenu
                      v-model="proLinkedNurseId"
                      :items="proLinkedNurseSelectItems"
                      value-key="value"
                      placeholder="Infirmier(ère) déjà intervenu(e)…"
                      class="w-full min-w-0"
                      clearable
                      :loading="proLinkedNursesLoading"
                      :disabled="proLinkedNurseChoice === 'external'"
                      :filter-fields="['label']"
                      :search-input="{ placeholder: 'Rechercher…' }"
                      @update:model-value="onProLinkedNursePick"
                    >
                      <template #label>
                        <span v-if="!proLinkedNurseId" class="text-muted">Sélectionner ou ajouter ci-dessous</span>
                        <span v-else>{{ proLinkedNurseSelectItems.find((i) => i.value === proLinkedNurseId)?.label }}</span>
                      </template>
                    </USelectMenu>
                  </UFormField>
                  <div class="relative flex items-center py-1">
                    <div class="grow border-t border-gray-200 dark:border-gray-700" />
                    <span class="mx-3 shrink-0 text-[11px] font-medium text-gray-400">ou inviter par SMS</span>
                    <div class="grow border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <UFormField
                    label="Téléphone mobile de l'infirmier(ère)"
                    help="Un SMS avec votre nom, celui du patient et le lien Cary sera envoyé."
                  >
                    <UInput
                      v-model="externalNursePhone"
                      type="tel"
                      autocomplete="off"
                      placeholder="06 12 34 56 78"
                      :disabled="!!proLinkedNurseId"
                      @update:model-value="onExternalNursePhoneEdit"
                    />
                  </UFormField>
                </template>
              </div>
              <div
                v-if="dashboardBookingWizardSection === 'personal'"
                id="wizard-rgpd-consent"
                class="mb-4 scroll-mt-28"
              >
                <UCheckbox
                  v-model="rgpdConsent"
                  :label="STAFF_PATIENT_BOOKING_CONSENT_LABEL"
                  :ui="{ label: 'text-xs font-medium leading-snug text-default' }"
                />
              </div>
              <RendezVousStickyFooter
                dashboard-layout
                :primary-label="
                  dashboardBookingWizardFinalStep ? 'Confirmer le rendez-vous' : 'Continuer'
                "
                :primary-submit="false"
                :primary-loading="saving"
                :primary-disabled="saving || bookingSubmissionLocked"
                :back-disabled="saving || bookingSubmissionLocked"
                @back="prevStep"
                @primary="onDashboardFooterPrimary"
              />
            </template>
          </UnifiedAppointmentForm>
          <template #fallback>
            <div
              class="flex min-h-[12rem] flex-col items-center justify-center gap-3 py-10"
              role="status"
              aria-live="polite"
            >
              <UIcon name="i-lucide-loader-2" class="h-9 w-9 animate-spin text-primary-500" aria-hidden="true" />
              <span class="sr-only">Chargement du formulaire</span>
            </div>
          </template>
        </ClientOnly>

        </template>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, watch } from 'vue';
import { apiFetch } from '~/utils/api';
import { resolveCareCategoryImageSrc } from '~/utils/care-icons';
import { joinFrenchAndList } from '~/utils/join-french-list';
import { runWithBookingCelebrationOverlay } from '~/composables/useBookingCelebrationOverlay';
import { bookingDbg, celebrationRotateIconsFromServices } from '~/utils/booking-celebration-debug';
import { fetchAllPatientsForDashboard } from '~/utils/fetch-all-patients';
import { AVAILABILITY_MIN_SPAN_HOURS } from '~/constants/availability-slot';
import { isBloodTestAppointment, isNursingAppointment } from '~/utils/appointment-type-rules';
import {
  validateUnifiedRdvPayload,
  buildDashboardAppointmentPayloads,
  countGroupedAppointmentPayloads,
  servicesRequiringOwnSlots,
  type SelectedServiceInput,
} from '~/utils/dashboard-unified-rdv';
import {
  type BookingServiceFormSlice,
  formDataSliceForQuickAddedService,
} from '~/utils/booking-service-form-slice';
import { resolvePatientAddressForRdvForm, parseRawPatientAddress } from '~/utils/patient-address-rdv';
import {
  PATIENT_SELECT_SEARCH_PLACEHOLDER,
  buildPatientSelectRow,
} from '~/utils/patient-select-menu';
import { normalizeCategorySkipPrescriptionDocuments } from '~/utils/category-skip-prescription-documents';
import {
  STAFF_PATIENT_BOOKING_CONSENT_LABEL,
  STAFF_PATIENT_BOOKING_CONSENT_ERROR,
} from '~/constants/staff-patient-booking-consent';
import { lookupPatientByContact } from '~/utils/patient-contact-lookup';

function patientContactSuppressKey(email: string, phone: string, patientId: string): string {
  return `${email.trim().toLowerCase()}|${phone.replace(/\D/g, '')}|${patientId}`;
}

const props = withDefaults(
  defineProps<{
    basePath: string;
    restrictCategoryTypes?: ('blood_test' | 'nursing')[];
    selectionTitle?: string;
  }>(),
  {
    restrictCategoryTypes: undefined,
    selectionTitle: undefined,
  },
);

const route = useRoute();
const router = useRouter();
const toast = useAppToast();
const { user } = useAuth();
const { createMultipleAppointments } = useAppointments();

const isNurseDashboard = computed(() => props.basePath === '/nurse');
const isAdminDashboard = computed(() => props.basePath === '/admin');
const isProDashboard = computed(() => props.basePath === '/pro');

const hasNursingInSelection = computed(() =>
  selectedServices.value.some((s) => isNursingAppointment(s.type)),
);

/** Pro : dispatch Cary (défaut) ou infirmier du patient. */
type NurseAssignmentMode = 'cary_dispatch' | 'patient_nurse';
const nurseAssignmentMode = ref<NurseAssignmentMode>('cary_dispatch');
const proLinkedNurseId = ref<string | undefined>(undefined);
const proLinkedNurses = ref<Array<{ id: string; display_name: string; phone?: string | null }>>([]);
const proLinkedNursesLoading = ref(false);
const proLinkedNurseChoice = ref<'linked' | 'external' | ''>('');
const externalNursePhone = ref('');

const showProNurseAssignment = computed(
  () => isProDashboard.value && hasNursingInSelection.value && step.value >= 1,
);

const proLinkedNurseSelectItems = computed(() =>
  proLinkedNurses.value.map((n) => ({
    label: n.display_name,
    value: String(n.id),
  })),
);

async function loadLinkedNursesForPatient(patientId: string) {
  proLinkedNursesLoading.value = true;
  try {
    const res = await apiFetch(`/patients/${patientId}/linked-nurses`, { method: 'GET' });
    proLinkedNurses.value = res.success && Array.isArray(res.data) ? res.data : [];
  } catch {
    proLinkedNurses.value = [];
  } finally {
    proLinkedNursesLoading.value = false;
  }
}

function resetProNurseAssignment() {
  nurseAssignmentMode.value = 'cary_dispatch';
  proLinkedNurseId.value = undefined;
  proLinkedNurseChoice.value = '';
  externalNursePhone.value = '';
}

function onProLinkedNursePick(id: string | undefined) {
  if (id) {
    proLinkedNurseChoice.value = 'linked';
    externalNursePhone.value = '';
  } else if (proLinkedNurseChoice.value === 'linked') {
    proLinkedNurseChoice.value = '';
  }
}

function onExternalNursePhoneEdit() {
  if (externalNursePhone.value.trim()) {
    proLinkedNurseChoice.value = 'external';
    proLinkedNurseId.value = undefined;
  } else if (proLinkedNurseChoice.value === 'external') {
    proLinkedNurseChoice.value = '';
  }
}

/** Même API /patients/lookup pour pro, infirmier, laboratoire, sous-compte et super_admin (nouveau patient). */
const canLookupPatientByContact = computed(() => {
  const r = user.value?.role;
  return r === 'pro' || r === 'nurse' || r === 'lab' || r === 'subaccount' || r === 'super_admin';
});

const step = ref(0);
const saving = ref(false);
const bookingOverlayShow = ref(false);
const bookingSubmissionLocked = ref(false);
const validationError = ref('');
const categoriesLoading = ref(true);
const runtimeConfig = useRuntimeConfig();
const careCategoriesList = ref<
  Array<{
    id: string;
    name: string;
    description?: string;
    type: string;
    icon?: string | null;
    appointment_count?: number;
    image_url?: string | null;
    skip_prescription_documents?: boolean;
  }>
>([]);

const selectedServices = ref<SelectedServiceInput[]>([]);

const unifiedFormRef = ref<{
  flushDraftToParent?: () => void;
  commitPatientWizardSubmit?: () => void;
} | null>(null);

/** Créneaux → documents → infos perso (même logique que le parcours patient public). */
const bookingWizardIndex = ref(0);

const dashboardSlotRows = computed(() => servicesRequiringOwnSlots(selectedServices.value as SelectedServiceInput[]));

function dashboardCareCategorySkipsPrescription(categoryId: string | null | undefined): boolean {
  if (categoryId == null || String(categoryId).trim() === '') return false;
  const svc = selectedServices.value.find((s) => String(s.category_id) === String(categoryId));
  if (svc && normalizeCategorySkipPrescriptionDocuments(svc.skip_prescription_documents)) {
    return true;
  }
  const cat = careCategoriesList.value.find((c) => String(c.id) === String(categoryId));
  if (!cat) return false;
  return normalizeCategorySkipPrescriptionDocuments(cat.skip_prescription_documents);
}

const dashboardDocumentsSlotRows = computed(() =>
  dashboardSlotRows.value.filter((svc) => !dashboardCareCategorySkipsPrescription(svc.category_id)),
);

const dashboardBookingWizardSection = computed((): 'slot-datetime' | 'documents' | 'personal' => {
  const n = dashboardSlotRows.value.length;
  const nDoc = dashboardDocumentsSlotRows.value.length;
  const i = bookingWizardIndex.value;
  if (n === 0) return 'personal';
  if (i < n) return 'slot-datetime';
  if (nDoc > 0 && i < n + nDoc) return 'documents';
  return 'personal';
});

const dashboardBookingWizardFinalStep = computed(() => dashboardBookingWizardSection.value === 'personal');

const dashboardActiveSlotServiceId = computed(() => {
  if (dashboardBookingWizardSection.value !== 'slot-datetime') return null;
  return dashboardSlotRows.value[bookingWizardIndex.value]?.id ?? null;
});

const dashboardActiveDocumentsServiceId = computed(() => {
  if (dashboardBookingWizardSection.value !== 'documents') return null;
  const n = dashboardSlotRows.value.length;
  const docRows = dashboardDocumentsSlotRows.value;
  const i = bookingWizardIndex.value;
  const docIdx = i - n;
  return docRows[docIdx]?.id ?? null;
});

watch(bookingWizardIndex, () => {
  if (step.value === 1 && dashboardBookingWizardSection.value === 'personal') {
    validationError.value = '';
  }
});

watch(
  () => [dashboardSlotRows.value.length, dashboardDocumentsSlotRows.value.length] as const,
  () => {
    const maxIx = dashboardSlotRows.value.length + dashboardDocumentsSlotRows.value.length;
    if (bookingWizardIndex.value > maxIx) bookingWizardIndex.value = Math.max(0, maxIx);
  },
);

function lowerFirstLetter(s: string): string {
  const t = String(s).trim();
  if (!t) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

function buildDashboardWizardSegmentIntro(activeServiceId: string | null): {
  title: string;
  lines: { id: string; name: string; imageSrc: string | null; iconName: string }[];
} | null {
  if (!activeServiceId) return null;
  const rep = selectedServices.value.find((s) => s.id === activeServiceId);
  if (!rep) return null;

  const base = String(runtimeConfig.public.apiBase ?? '');
  const img = (svc: SelectedServiceInput) =>
    resolveCareCategoryImageSrc(svc.category_image_url ?? null, base);

  if (isNursingAppointment(rep.type)) {
    const nurs = selectedServices.value.filter((s) => isNursingAppointment(s.type));
    const lines = nurs.map((s) => ({
      id: s.id,
      name: s.name,
      imageSrc: img(s),
      iconName: s.icon || 'i-lucide-heart-pulse',
    }));
    return { title: 'soins infirmiers', lines };
  }

  if (isBloodTestAppointment(rep.type)) {
    const bloods = selectedServices.value.filter((s) => isBloodTestAppointment(s.type));
    const lines = bloods.map((s) => ({
      id: s.id,
      name: s.name,
      imageSrc: img(s),
      iconName: s.icon || 'i-lucide-droplet',
    }));
    return { title: 'prélèvement', lines };
  }

  return {
    title: lowerFirstLetter(rep.name),
    lines: [
      {
        id: rep.id,
        name: rep.name,
        imageSrc: img(rep),
        iconName: rep.icon || 'i-lucide-stethoscope',
      },
    ],
  };
}

const dashboardWizardSlotDatetimeIntro = computed(() => {
  if (dashboardBookingWizardSection.value !== 'slot-datetime') return null;
  return buildDashboardWizardSegmentIntro(dashboardActiveSlotServiceId.value);
});

const dashboardWizardDocumentsIntro = computed(() => {
  if (dashboardBookingWizardSection.value !== 'documents') return null;
  return buildDashboardWizardSegmentIntro(dashboardActiveDocumentsServiceId.value);
});

const dashboardWizardBookingHeaderIntro = computed(() => {
  if (dashboardBookingWizardSection.value === 'slot-datetime') {
    return dashboardWizardSlotDatetimeIntro.value;
  }
  if (dashboardBookingWizardSection.value === 'documents') {
    return dashboardWizardDocumentsIntro.value;
  }
  return null;
});

const dashboardWizardCareTypesLine = computed(() => {
  const intro = dashboardWizardBookingHeaderIntro.value;
  if (!intro?.lines?.length) return '';
  return joinFrenchAndList(intro.lines.map((l) => l.name));
});

/** Même logique titres que `RendezVousFormStep` (parcours `/rendez-vous/nouveau`). */
const dashboardWizardPageTitle = computed(() => {
  const sec = dashboardBookingWizardSection.value;
  if (sec === 'personal') return 'Informations personnelles';
  if (sec === 'documents') return 'Documents de votre rendez-vous';
  if (sec === 'slot-datetime') return 'Date de votre rendez-vous';
  return 'Date de votre rendez-vous';
});

const dashboardWizardPageHeading = computed(() => {
  const base = dashboardWizardPageTitle.value;
  const care = dashboardWizardCareTypesLine.value;
  if (!care) return base;
  return `${base} — ${care}`;
});

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
const formData = ref<Record<string, any>>({});
const rgpdConsent = ref(false);

/** Réglages admin : création avec statut libre et assignations optionnelles. */
const adminRdvStatus = ref<string>('pending');
const adminAssignedLabId = ref<string | undefined>(undefined);
const adminAssignedNurseId = ref<string | undefined>(undefined);
const adminLabs = ref<any[]>([]);
const adminNurses = ref<any[]>([]);
const adminLabsLoading = ref(false);
const adminNursesLoading = ref(false);

const adminStatusSelectOptions = [
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmé', value: 'confirmed' },
  { label: 'Planifié', value: 'planned' },
  { label: 'En cours', value: 'inProgress' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Refusé', value: 'refused' },
  { label: 'Expiré', value: 'expired' },
  { label: 'Annulé', value: 'canceled' },
];

const adminLabSelectItems = computed(() =>
  adminLabs.value.map((p: any) => ({
    label:
      (p.company_name && String(p.company_name).trim()) ||
      `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() ||
      p.email_display ||
      p.email ||
      p.id,
    value: String(p.id),
  })),
);

const adminNurseSelectItems = computed(() =>
  adminNurses.value.map((p: any) => ({
    label:
      `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || p.email_display || p.email || p.id,
    value: String(p.id),
  })),
);

async function loadLabsAndNursesForAdminDashboard() {
  adminLabsLoading.value = true;
  adminNursesLoading.value = true;
  try {
    const [labRes, subRes, nurseRes] = await Promise.all([
      apiFetch('/users?role=lab&limit=500', { method: 'GET' }),
      apiFetch('/users?role=subaccount&limit=500', { method: 'GET' }),
      apiFetch('/users?role=nurse&limit=500', { method: 'GET' }),
    ]);
    adminLabs.value = [
      ...(labRes.success && labRes.data ? (labRes.data as any[]) : []),
      ...(subRes.success && subRes.data ? (subRes.data as any[]) : []),
    ];
    adminNurses.value = nurseRes.success && nurseRes.data ? (nurseRes.data as any[]) : [];
  } catch {
    adminLabs.value = [];
    adminNurses.value = [];
  } finally {
    adminLabsLoading.value = false;
    adminNursesLoading.value = false;
  }
}

const patients = ref<any[]>([]);
const patientsLoading = ref(false);
const patientProfileLoading = ref(false);
const selectedPatientId = ref<string | undefined>(undefined);
/** Snapshot fiche patient chargée — évite PUT inutile avant création RDV. */
const loadedPatientSnapshot = ref<Record<string, string> | null>(null);
/** Patient existant (liste) ou création inline. */
const patientMode = ref<'existing' | 'new'>('existing');

/** Nouveau patient (wizard) : email patient facultatif pour pro, infirmier, lab, sous-compte, admin. */
const patientEmailOptional = computed(() => {
  if (patientMode.value !== 'new') return false;
  const r = user.value?.role ?? '';
  return r === 'nurse' || r === 'pro' || r === 'lab' || r === 'subaccount' || r === 'super_admin';
});

/** Admin : téléphone patient facultatif à la création. */
const patientPhoneOptional = computed(() => {
  if (patientMode.value !== 'new') return false;
  return (user.value?.role ?? '') === 'super_admin';
});

/** Id patient stable pour GET /patient-documents (évite ref/objet mal sérialisé par le select). */
const patientDocumentUserIdForForm = computed(() => {
  if (patientMode.value !== 'existing') return undefined;
  const id = selectedPatientId.value;
  if (id == null) return undefined;
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  if (typeof id === 'string') {
    const s = id.trim();
    return s || undefined;
  }
  return undefined;
});

function patientGenderIsSet(raw?: string | null): boolean {
  const g = String(raw ?? '').trim().toLowerCase();
  return (
    g === 'male'
    || g === 'female'
    || g === 'other'
    || g === 'm'
    || g === 'f'
    || g === 'homme'
    || g === 'femme'
  );
}

const existingPatientProfileIncomplete = computed(() => {
  if (patientMode.value !== 'existing' || !selectedPatientId.value) return false;
  const fd = formData.value ?? {};
  return !patientGenderIsSet(fd.gender) || !String(fd.birth_date ?? '').trim();
});

const patientSelectSearchPlaceholder = PATIENT_SELECT_SEARCH_PLACEHOLDER;

const patientSelectItems = computed(() => {
  let list = patients.value.filter((p) => p?.id != null);
  const pinned = pinnedLookupPatient.value;
  if (pinned?.id != null && !list.some((p) => String(p.id) === String(pinned.id))) {
    list = [...list, pinned];
  }
  return list.map((p) => buildPatientSelectRow(p, { labelStyle: 'natural' }));
});

const selectedPatientSelectLabel = computed(() => {
  const id = selectedPatientId.value;
  if (!id) return '';
  const item = patientSelectItems.value.find((i) => i.value === String(id));
  if (item?.label) return item.label;
  const fd = formData.value;
  const fromForm = [fd?.first_name, fd?.last_name].filter(Boolean).join(' ').trim();
  return fromForm || 'Patient';
});

const duplicatePatientModalOpen = ref(false);
const duplicatePatientRow = ref<Record<string, unknown> | null>(null);
const duplicatePatientSuppressKey = ref('');
const pinnedLookupPatient = ref<Record<string, unknown> | null>(null);
let patientContactLookupTimer: ReturnType<typeof setTimeout> | null = null;

const duplicatePatientDisplayName = computed(() => {
  const r = duplicatePatientRow.value as { first_name?: string; last_name?: string } | null;
  if (!r) return '';
  return [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || 'Patient';
});

const duplicatePatientBirthLabel = computed(() => {
  const r = duplicatePatientRow.value as { birth_date?: string } | null;
  const d = r?.birth_date;
  if (!d || typeof d !== 'string') return null;
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return d;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('fr-FR');
});

function clearPatientContactLookupTimer() {
  if (patientContactLookupTimer != null) {
    clearTimeout(patientContactLookupTimer);
    patientContactLookupTimer = null;
  }
}

function schedulePatientContactLookup() {
  clearPatientContactLookupTimer();
  patientContactLookupTimer = setTimeout(() => {
    patientContactLookupTimer = null;
    void runPatientContactLookup();
  }, 450);
}

async function runPatientContactLookup() {
  if (!canLookupPatientByContact.value) return;
  if (patientMode.value !== 'new') return;
  const email = String(formData.value?.email ?? '').trim();
  const phone = String(formData.value?.phone ?? '').trim();
  if (!email && !phone.replace(/\D/g, '')) {
    duplicatePatientModalOpen.value = false;
    duplicatePatientRow.value = null;
    return;
  }

  try {
    const row = await lookupPatientByContact(apiFetch, email, phone);
    if (!row || row.id == null) {
      duplicatePatientModalOpen.value = false;
      duplicatePatientRow.value = null;
      return;
    }
    const pid = String(row.id);
    const suppress = patientContactSuppressKey(email, phone, pid);
    if (duplicatePatientSuppressKey.value === suppress) {
      return;
    }
    duplicatePatientRow.value = row;
    duplicatePatientModalOpen.value = true;
  } catch {
    /* silencieux */
  }
}

function dismissDuplicatePatientModal() {
  duplicatePatientModalOpen.value = false;
}

function onDuplicatePatientModalToggle(open: boolean) {
  if (open || patientMode.value !== 'new') return;
  if (duplicatePatientRow.value?.id == null) return;
  duplicatePatientSuppressKey.value = patientContactSuppressKey(
    String(formData.value?.email ?? '').trim(),
    String(formData.value?.phone ?? '').trim(),
    String(duplicatePatientRow.value.id),
  );
  duplicatePatientRow.value = null;
}

async function confirmAdoptExistingPatientFromLookup() {
  const row = duplicatePatientRow.value as { id?: string } | null;
  if (!row?.id) return;
  const id = String(row.id);
  duplicatePatientRow.value = null;
  duplicatePatientModalOpen.value = false;
  duplicatePatientSuppressKey.value = '';

  if (!patients.value.some((x) => String(x.id) === id)) {
    patients.value = [...patients.value, row];
  }
  pinnedLookupPatient.value = row;
  patientMode.value = 'existing';
  await nextTick();
  selectedPatientId.value = id;

  toast.add({
    title: 'Patient sélectionné',
    description: 'Le dossier existant a été chargé pour ce rendez-vous.',
    color: 'green',
    icon: 'i-lucide-user-check',
  });
}

function clearPatientFieldsInForm() {
  const fd = formData.value || {};
  formData.value = {
    ...fd,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    gender: '',
    address: null,
    address_complement: '',
    personalFiles: {},
  };
}

function extractPatientCreateBody(payload: Record<string, any>): Record<string, unknown> {
  const addr = payload.address;
  let addressOut: Record<string, unknown> | null = null;
  if (addr && typeof addr === 'object' && addr !== null && 'label' in addr) {
    const a = addr as Record<string, unknown>;
    const lat = Number(a.lat);
    const lng = Number(a.lng);
    addressOut = {
      label: String(a.label ?? '').trim(),
      lat: Number.isFinite(lat) ? lat : 0,
      lng: Number.isFinite(lng) ? lng : 0,
    };
    const comp = (payload.address_complement as string | undefined)?.trim() || (a.complement as string | undefined)?.trim();
    if (comp) addressOut.complement = comp;
  }
  return {
    first_name: payload.first_name,
    last_name: payload.last_name,
    ...(String(payload.phone ?? '').trim() !== '' ? { phone: String(payload.phone).trim() } : {}),
    email: (payload.email != null ? String(payload.email) : '').trim(),
    birth_date: payload.birth_date || null,
    gender: payload.gender || null,
    address: addressOut,
  };
}

function buildPatientSnapshotFromPayload(payload: Record<string, any>): Record<string, string> {
  const addr = payload.address;
  let addressKey = '';
  if (addr && typeof addr === 'object' && addr !== null && 'label' in addr) {
    const a = addr as Record<string, unknown>;
    const comp =
      (payload.address_complement as string | undefined)?.trim() ||
      (a.complement as string | undefined)?.trim() ||
      '';
    addressKey = JSON.stringify({
      label: String(a.label ?? '').trim(),
      lat: Number(a.lat),
      lng: Number(a.lng),
      complement: comp,
    });
  }
  return {
    first_name: String(payload.first_name ?? '').trim(),
    last_name: String(payload.last_name ?? '').trim(),
    gender: String(payload.gender ?? '').trim(),
    birth_date: String(payload.birth_date ?? '').trim(),
    phone: String(payload.phone ?? '').replace(/\s/g, '').trim(),
    email: String(payload.email ?? '').trim(),
    address: addressKey,
  };
}

function patientPayloadDiffersFromSnapshot(payload: Record<string, any>): boolean {
  if (!loadedPatientSnapshot.value) return true;
  const next = buildPatientSnapshotFromPayload(payload);
  const prev = loadedPatientSnapshot.value;
  return (Object.keys(next) as Array<keyof typeof next>).some((k) => next[k] !== prev[k]);
}

async function syncExistingPatientFromPayload(
  patientId: string,
  payload: Record<string, any>,
): Promise<void> {
  if (!patientPayloadDiffersFromSnapshot(payload)) {
    return;
  }
  const addr = payload.address;
  let addressOut: Record<string, unknown> | null = null;
  if (addr && typeof addr === 'object' && addr !== null && 'label' in addr) {
    const a = addr as Record<string, unknown>;
    const lat = Number(a.lat);
    const lng = Number(a.lng);
    addressOut = {
      label: String(a.label ?? '').trim(),
      lat: Number.isFinite(lat) ? lat : 0,
      lng: Number.isFinite(lng) ? lng : 0,
    };
    const comp =
      (payload.address_complement as string | undefined)?.trim() ||
      (a.complement as string | undefined)?.trim();
    if (comp) addressOut.complement = comp;
  }
  const body: Record<string, unknown> = {
    first_name: payload.first_name,
    last_name: payload.last_name,
    gender: payload.gender || null,
    birth_date: payload.birth_date || null,
    phone: String(payload.phone ?? '').trim() || undefined,
    email: String(payload.email ?? '').trim() || undefined,
    ...(addressOut ? { address: addressOut } : {}),
  };
  const res = (await apiFetch(`/users/${encodeURIComponent(patientId)}`, {
    method: 'PUT',
    body,
  })) as { success?: boolean; error?: string };
  if (!res?.success) {
    throw new Error(res?.error || 'Mise à jour du patient impossible');
  }
  loadedPatientSnapshot.value = buildPatientSnapshotFromPayload(payload);
}

async function createPatientRecord(payload: Record<string, any>): Promise<string> {
  const body = {
    ...extractPatientCreateBody(payload),
    patient_booking_consent: true,
  };
  try {
    const res = (await apiFetch('/patients', { method: 'POST', body })) as {
      success?: boolean;
      data?: { id?: string };
      error?: string;
    };
    if (res?.success && res.data?.id) {
      return String(res.data.id);
    }
    throw new Error(res?.error || 'Création du patient impossible');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('existe déjà') || msg.includes('déjà avec cet email')) {
      throw new Error(
        'Un patient existe déjà avec cet e-mail. Choisissez « Patient dans la liste » ou modifiez l’e-mail.',
      );
    }
    throw e instanceof Error ? e : new Error(msg);
  }
}

async function loadCareCategories() {
  categoriesLoading.value = true;
  careCategoriesList.value = [];
  try {
    const response = await apiFetch('/categories', { method: 'GET' });
    if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
      careCategoriesList.value = (response.data as Array<Record<string, unknown>>).map((c) => ({
        ...(c as object),
        skip_prescription_documents: normalizeCategorySkipPrescriptionDocuments(c.skip_prescription_documents),
      })) as typeof careCategoriesList.value;
    }
  } catch (e) {
    console.error('Chargement catégories:', e);
  } finally {
    categoriesLoading.value = false;
  }
}

async function loadPatients() {
  if (!user.value?.id) return;
  patientsLoading.value = true;
  try {
    patients.value = await fetchAllPatientsForDashboard(apiFetch);
  } catch {
    patients.value = [];
  } finally {
    patientsLoading.value = false;
  }
}

async function applyPatientToForm(p: any) {
  if (!p) return;
  const addr = await resolvePatientAddressForRdvForm(p?.address);
  const parsed = parseRawPatientAddress(p?.address);
  const complement = addr?.complement ?? parsed?.complement ?? '';
  formData.value = {
    ...formData.value,
    first_name: p.first_name || '',
    last_name: p.last_name || '',
    email: p.email || '',
    phone: p.phone || '',
    birth_date: p.birth_date || '',
    gender: p.gender || '',
    address: addr ?? null,
    address_complement: complement || '',
  };
}

async function fetchAndApplyPatientDetail(id: string) {
  if (!id) return;
  let p: any = patients.value.find((x) => String(x.id) === String(id));
  patientProfileLoading.value = true;
  try {
    const res = await apiFetch(`/users/${encodeURIComponent(id)}`, { method: 'GET' });
    if (res?.success && res.data && typeof res.data === 'object') {
      const full = { ...(p || {}), ...res.data };
      const idx = patients.value.findIndex((x) => String(x.id) === String(id));
      if (idx >= 0) {
        patients.value[idx] = { ...patients.value[idx], ...res.data };
      } else {
        patients.value = [...patients.value, full];
      }
      p = full;
    }
  } catch {
    /* conserver la ligne liste si l’API échoue */
  } finally {
    patientProfileLoading.value = false;
  }
  if (p?.id) {
    const resolvedAddr = await resolvePatientAddressForRdvForm(p?.address);
    const parsedAddr = parseRawPatientAddress(p?.address);
    const complement = resolvedAddr?.complement ?? parsedAddr?.complement ?? '';
    loadedPatientSnapshot.value = buildPatientSnapshotFromPayload({
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      email: p.email || '',
      phone: p.phone || '',
      birth_date: p.birth_date || '',
      gender: p.gender || '',
      address: resolvedAddr ?? null,
      address_complement: complement || '',
    });
    await applyPatientToForm(p);
  }
}

watch(selectedPatientId, (id) => {
  if (patientMode.value !== 'existing' || !id) {
    loadedPatientSnapshot.value = null;
    resetProNurseAssignment();
    proLinkedNurses.value = [];
    return;
  }
  void fetchAndApplyPatientDetail(id);
  if (isProDashboard.value) {
    void loadLinkedNursesForPatient(String(id));
    resetProNurseAssignment();
  }
});

watch(patientMode, (m, prev) => {
  if (m !== 'new') {
    clearPatientContactLookupTimer();
    duplicatePatientModalOpen.value = false;
    duplicatePatientRow.value = null;
    duplicatePatientSuppressKey.value = '';
  }
  if (m === 'new') {
    selectedPatientId.value = undefined;
    if (prev === 'existing') {
      void nextTick(() => clearPatientFieldsInForm());
    }
  } else if (m === 'existing' && prev === 'new') {
    clearPatientFieldsInForm();
  }
});

watch(
  () =>
    [
      patientMode.value,
      String(formData.value?.email ?? '').trim(),
      String(formData.value?.phone ?? '').trim(),
    ] as const,
  (cur, prev) => {
    const [mode, em, ph] = cur;
    if (mode !== 'new') return;
    if (
      prev &&
      (em !== prev[1] || ph !== prev[2] || mode !== prev[0])
    ) {
      duplicatePatientSuppressKey.value = '';
    }
    schedulePatientContactLookup();
  },
);

onUnmounted(() => {
  clearPatientContactLookupTimer();
});

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

async function confirmStep0() {
  if (selectedServices.value.length === 0) return;
  bookingWizardIndex.value = 0;
  step.value = 1;
  await loadPatients();
  if (isAdminDashboard.value) {
    await loadLabsAndNursesForAdminDashboard();
  }
  await applyPatientFromRoute();
  nextTick(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function pushPatientAvailabilityErrors(
  svcData: Record<string, any>,
  svcName: string,
  missingFields: string[],
): void {
  const t = svcData.availability_type;
  if (t === 'all_day') return;

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
      if (availabilityData && (availabilityData.type === 'custom' || availabilityData.type === 'all_day')) {
        if (availabilityData.type === 'custom') {
          if (
            availabilityData.range &&
            Array.isArray(availabilityData.range) &&
            availabilityData.range.length === 2
          ) {
            if (
              availabilityData.range[1] - availabilityData.range[0] >= AVAILABILITY_MIN_SPAN_HOURS
            ) {
              availabilityValid = true;
            } else {
              missingFields.push(
                `L'écart minimum des créneaux est de ${AVAILABILITY_MIN_SPAN_HOURS} h pour ${svcName}`,
              );
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

function validateDashboardWizardSubstep(): string[] {
  const missingFields: string[] = [];
  const rows = dashboardSlotRows.value;
  const n = rows.length;
  const i = bookingWizardIndex.value;
  if (i < n) {
    const svc = rows[i]!;
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

function scrollWizardToTop() {
  nextTick(() => {
    requestAnimationFrame(() => {
      const main = document.querySelector('main.flex-1.overflow-y-auto');
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
      else if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

async function onDashboardWizardContinue() {
  validationError.value = '';
  unifiedFormRef.value?.flushDraftToParent?.();
  await nextTick();
  const missing = validateDashboardWizardSubstep();
  if (missing.length > 0) {
    validationError.value =
      missing.length === 1 ? missing[0] : missing.map((msg, idx) => `${idx + 1}. ${msg}`).join('\n');
    scrollToValidationError();
    return;
  }
  const n = dashboardSlotRows.value.length;
  const nDoc = dashboardDocumentsSlotRows.value.length;
  const lastIndex = n + nDoc;
  if (bookingWizardIndex.value < lastIndex) {
    bookingWizardIndex.value++;
    scrollWizardToTop();
  }
}

function onDashboardFooterPrimary() {
  if (dashboardBookingWizardFinalStep.value) {
    unifiedFormRef.value?.commitPatientWizardSubmit?.();
    return;
  }
  void onDashboardWizardContinue();
}

function prevStep() {
  if (step.value <= 0) return;
  if (step.value === 1 && bookingWizardIndex.value > 0) {
    bookingWizardIndex.value--;
    validationError.value = '';
    scrollWizardToTop();
    return;
  }
  step.value = 0;
  bookingWizardIndex.value = 0;
  validationError.value = '';
  nextTick(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/**
 * Le layout dashboard défile dans <main class="overflow-y-auto">, pas sur window.
 * scrollIntoView fait défiler le bon conteneur ; window.scrollTo ne bougeait pas la vue.
 * On cible d’abord l’UAlert récapitulatif ; sinon le bloc métier (#anchor).
 */
function scrollToValidationError(anchor?: string) {
  nextTick(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const alertEl = document.getElementById('form-error-alert');
        const anchorEl = anchor ? document.getElementById(anchor) : null;
        const el = alertEl ?? anchorEl;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          const main = document.querySelector('main.flex-1.overflow-y-auto');
          if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    });
  });
}

async function onUnifiedSubmit(payload: any) {
  validationError.value = '';
  formData.value = payload;

  if (!rgpdConsent.value) {
    validationError.value = STAFF_PATIENT_BOOKING_CONSENT_ERROR;
    scrollToValidationError('wizard-rgpd-consent');
    return;
  }

  if (showProNurseAssignment.value && nurseAssignmentMode.value === 'patient_nurse') {
    const linked = proLinkedNurseId.value?.trim() || '';
    const extPhone = externalNursePhone.value.replace(/\s/g, '').trim();
    if (!linked && !extPhone) {
      validationError.value =
        'Choisissez un infirmier(ère) dans la liste ou renseignez son numéro de mobile pour l\'invitation SMS.';
      scrollToValidationError('wizard-pro-nurse-assignment');
      return;
    }
  }

  if (patientMode.value === 'existing' && !selectedPatientId.value) {
    validationError.value = 'Veuillez sélectionner un patient dans la liste.';
    scrollToValidationError('wizard-rdv-patient-card');
    return;
  }

  const err = validateUnifiedRdvPayload(payload, selectedServices.value, {
    patientEmailOptional: patientEmailOptional.value,
    patientPhoneOptional: patientPhoneOptional.value,
  });
  if (err) {
    validationError.value = err.message;
    scrollToValidationError(err.scrollAnchor);
    return;
  }

  const uid = user.value?.id;
  const role = user.value?.role || '';
  if (!uid) {
    toast.add({ title: 'Session', description: 'Utilisateur non connecté.', color: 'error' });
    return;
  }

  if (bookingSubmissionLocked.value) {
    return;
  }

  bookingSubmissionLocked.value = true;
  saving.value = true;
  try {
    let patientId: string;
    if (patientMode.value === 'existing') {
      patientId = String(selectedPatientId.value);
      try {
        await syncExistingPatientFromPayload(patientId, payload);
      } catch (e: any) {
        toast.add({
          title: 'Mise à jour du patient',
          description: e?.message || 'Impossible de mettre à jour la fiche patient',
          color: 'error',
        });
        scrollToValidationError('wizard-rdv-patient-card');
        return;
      }
    } else {
      try {
        patientId = await createPatientRecord(payload);
      } catch (e: any) {
        toast.add({
          title: 'Création du patient',
          description: e?.message || 'Impossible de créer le patient',
          color: 'error',
        });
        scrollToValidationError('wizard-rdv-patient-card');
        return;
      }
    }

    const batchId =
      countGroupedAppointmentPayloads(selectedServices.value as SelectedServiceInput[]) > 1 &&
      typeof globalThis.crypto !== 'undefined' &&
      typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : undefined;
    const payloads = buildDashboardAppointmentPayloads(patientId, payload, selectedServices.value, {
      creationBatchId: batchId,
      creatorRole: role,
      creatorUserId: uid,
    }).map((raw) => ({
      ...raw,
      patient_booking_consent: true,
    }));

    const adminStatus = adminRdvStatus.value?.trim() || 'pending';
    const adminLab = adminAssignedLabId.value?.trim() || '';
    const adminNurse = adminAssignedNurseId.value?.trim() || '';
    if (isAdminDashboard.value) {
      for (const raw of payloads) {
        const p = raw as Record<string, unknown>;
        p.status = adminStatus;
        if (adminLab && typeof p.type === 'string' && isBloodTestAppointment(String(p.type))) {
          p.assigned_lab_id = adminLab;
        }
        if (adminNurse && typeof p.type === 'string' && isNursingAppointment(String(p.type))) {
          p.assigned_nurse_id = adminNurse;
        }
      }
    }

    if (isProDashboard.value && nurseAssignmentMode.value === 'patient_nurse') {
      const linkedNurseId = proLinkedNurseId.value?.trim() || '';
      const extPhone = externalNursePhone.value.replace(/\s/g, '').trim();
      let externalInviteAttached = false;
      for (const raw of payloads) {
        const p = raw as Record<string, unknown>;
        if (typeof p.type !== 'string' || !isNursingAppointment(String(p.type))) {
          continue;
        }
        if (linkedNurseId) {
          p.assigned_nurse_id = linkedNurseId;
        } else if (extPhone) {
          p.skip_zone_dispatch = true;
          if (!externalInviteAttached) {
            p.external_nurse_invite = {
              phone: extPhone,
            };
            externalInviteAttached = true;
          }
        }
      }
    }

    const wrapped = await runWithBookingCelebrationOverlay(bookingOverlayShow, async () => {
      bookingDbg('dashboard création RDV début', { payloads: payloads.length });
      const result = await createMultipleAppointments(payloads as any);
      const success = result.success === true;
      const apiErr =
        !success && result && typeof result === 'object' && result !== null && 'error' in result
          ? String((result as { error?: string }).error || '').trim()
          : '';
      bookingDbg('dashboard création RDV fin', {
        success,
        ...(apiErr ? { apiError: apiErr } : {}),
      });
      return { success, result };
    });

    const appointmentResult = (wrapped as { success: boolean; result?: { success?: boolean; error?: string; createdIds?: string[] } })
      .result;

    if (wrapped.success !== true) {
      toast.add({
        title: 'Erreur',
        description: appointmentResult?.error || 'Création impossible',
        color: 'error',
        icon: 'i-lucide-alert-circle',
      });
      return;
    }

    const ids = appointmentResult?.createdIds ?? [];
    const n = ids.length || payloads.length;
    toast.add({
      title: n > 1 ? 'Rendez-vous créés' : 'Rendez-vous créé',
      description: n > 1 ? `${n} rendez-vous ont été enregistrés.` : 'Le rendez-vous a été enregistré.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    });
    const t = useState<number>('appointments.listRefreshTrigger', () => 0);
    t.value += 1;
    const href = `${props.basePath}/appointments`;
    try {
      await router.push(href);
    } catch {
      if (typeof window !== 'undefined') window.location.assign(href);
    }
  } catch (e: any) {
    toast.add({
      title: 'Erreur',
      description: e?.message || 'Une erreur est survenue',
      color: 'error',
    });
  } finally {
    saving.value = false;
    bookingSubmissionLocked.value = false;
  }
}

async function applyPatientFromRoute() {
  const pid = route.query.patient_id;
  if (typeof pid !== 'string' || !pid) return;
  patientMode.value = 'existing';
  selectedPatientId.value = pid;
  await fetchAndApplyPatientDetail(pid);
}

onMounted(() => {
  void loadCareCategories();
});
</script>
