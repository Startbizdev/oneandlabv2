<template>
  <div class="min-h-[calc(100vh-4rem)] bg-app-canvas dark:bg-gray-950 pb-32">
    <div class="mx-auto w-full max-w-5xl px-0 pt-3 pb-5 sm:px-6 sm:pt-4 sm:pb-6 md:max-w-3xl">
      <template v-if="selectedServices.length > 0">
        <div>
              <header
                v-if="providerName"
                :class="[
                  'px-4 text-left sm:px-0',
                  wizardBookingHeaderIntro ? 'mb-1.5 sm:mb-2' : 'mb-4 sm:mb-6',
                ]"
              >
                <h1
                  :class="[
                    'text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl',
                    wizardBookingHeaderIntro ? '' : 'hidden sm:block',
                  ]"
                >
                  {{ wizardBookingPageHeading }}
                </h1>
                <p
                  v-if="showGuestPersonalLoginHintUnderTitle"
                  class="mt-2 text-sm leading-snug text-gray-500 dark:text-gray-400"
                >
                  <span>Déjà client&nbsp;?</span>{{ ' ' }}
                  <NuxtLink
                    :to="bookingGuestPersonalLoginHref"
                    class="font-semibold text-primary-600 underline underline-offset-2 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    @click="flushDraftBeforeGuestLoginNavigate"
                  >
                    Se connecter
                  </NuxtLink>
                </p>
                <p
                  class="text-sm font-medium text-primary-600 dark:text-primary-400"
                  :class="showGuestPersonalLoginHintUnderTitle ? 'mt-2' : 'mt-0 sm:mt-1'"
                >
                  Avec {{ providerName }}
                </p>
              </header>
              <header
                v-else
                :class="[
                  'px-4 text-left sm:block sm:px-0',
                  wizardBookingHeaderIntro ? 'mb-1.5 sm:mb-2' : 'mb-4 sm:mb-6',
                ]"
              >
                <h1 class="text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl">
                  {{ wizardBookingPageHeading }}
                </h1>
                <p
                  v-if="showGuestPersonalLoginHintUnderTitle"
                  class="mt-2 text-sm leading-snug text-gray-500 dark:text-gray-400"
                >
                  <span>Déjà client&nbsp;?</span>{{ ' ' }}
                  <NuxtLink
                    :to="bookingGuestPersonalLoginHref"
                    class="font-semibold text-primary-600 underline underline-offset-2 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    @click="flushDraftBeforeGuestLoginNavigate"
                  >
                    Se connecter
                  </NuxtLink>
                </p>
              </header>

              <UAlert
                v-if="validationError"
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

              <ClientOnly>
                <UnifiedAppointmentForm
                  ref="unifiedFormRef"
                  v-model="formData"
                  :selected-services="selectedServices"
                  :categories="categories"
                  :relative="relativeForForm"
                  :hide-personal-info="hidePersonalInfo"
                  :min-lead-time-hours="minLeadTimeHours ?? undefined"
                  :accept-saturday="acceptSaturday !== false"
                  :accept-sunday="acceptSunday !== false"
                  :hide-booking-care-details="true"
                  :booking-wizard-section="effectiveBookingWizardSection"
                  :active-slot-service-id="bookingActiveSlotServiceId ?? undefined"
                  :active-documents-service-id="bookingActiveDocumentsServiceId ?? undefined"
                  :patient-booking-urgency-stripe="patientBookingUrgencyStripe === true"
                  @submit="emit('submit', $event)"
                >
                  <template #beforeFooter>
            <div v-if="showBeneficiaryCard" class="mb-0 mt-6 space-y-5">
              <div class="flex items-start gap-2.5 px-1">
                <UIcon name="i-lucide-users" class="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
                <div class="min-w-0 flex-1 space-y-0.5">
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Bénéficiaire
                  </p>
                  <h3 class="text-sm font-semibold leading-snug text-gray-900 dark:text-white">
                    Pour qui prenez-vous ce rendez-vous&nbsp;?
                  </h3>
                </div>
              </div>

              <div class="space-y-3">
                <div
                  class="flex flex-col gap-2 overflow-hidden sm:flex-row sm:rounded-lg sm:border sm:border-gray-200 sm:divide-x sm:divide-gray-200 dark:sm:border-gray-700 dark:sm:divide-gray-700"
                >
                  <button
                    type="button"
                    @click="emit('select-for-myself')"
                    :class="[
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors sm:min-h-0 sm:flex-1 sm:rounded-none sm:border-0 sm:py-3',
                      myselfSelected
                        ? 'border-primary-300 bg-primary-50 dark:border-primary-500/40 dark:bg-primary-950/35'
                        : 'border-gray-200 bg-white hover:bg-gray-50/90 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-900/40',
                    ]"
                  >
                    <UIcon
                      name="i-lucide-user"
                      :class="[
                        'h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]',
                        myselfSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400',
                      ]"
                      aria-hidden="true"
                    />
                    <div class="min-w-0 flex-1">
                      <p
                        :class="[
                          'text-sm font-semibold',
                          myselfSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white',
                        ]"
                      >
                        Pour moi-même
                      </p>
                      <p
                        :class="[
                          'mt-0.5 text-xs',
                          myselfSelected ? 'text-primary-600/90 dark:text-primary-400/90' : 'text-gray-500 dark:text-gray-400',
                        ]"
                      >
                        Mes informations
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    @click="emit('toggle-proche')"
                    :class="[
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors sm:min-h-0 sm:flex-1 sm:rounded-none sm:border-0 sm:py-3',
                      procheSelected
                        ? 'border-primary-300 bg-primary-50 dark:border-primary-500/40 dark:bg-primary-950/35'
                        : 'border-gray-200 bg-white hover:bg-gray-50/90 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-900/40',
                    ]"
                  >
                    <UIcon
                      name="i-lucide-heart"
                      :class="[
                        'h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]',
                        procheSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400',
                      ]"
                      aria-hidden="true"
                    />
                    <div class="min-w-0 flex-1">
                      <p
                        :class="[
                          'text-sm font-semibold',
                          procheSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white',
                        ]"
                      >
                        Pour un proche
                      </p>
                      <p
                        :class="[
                          'mt-0.5 line-clamp-2 text-xs',
                          procheSelected ? 'text-primary-600/90 dark:text-primary-400/90' : 'text-gray-500 dark:text-gray-400',
                        ]"
                      >
                        {{
                          typeof selectedRelative === 'string'
                            ? `${relatives.find((r) => r.id === selectedRelative)?.first_name || 'Proche'} sélectionné(e)`
                            : 'Enfant, parent, conjoint…'
                        }}
                      </p>
                    </div>
                    <UIcon
                      :name="showRelativesSelector ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                      :class="[
                        'h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]',
                        procheSelected ? 'text-primary-500 dark:text-primary-400' : 'text-gray-400',
                      ]"
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div
                  v-if="showRelativesSelector"
                  class="rounded-lg border border-gray-100 bg-gray-50/40 p-3 dark:border-gray-800 dark:bg-gray-900/25"
                >
                  <label class="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Proche concerné
                  </label>

                  <div v-if="relatives.length > 0" class="space-y-2">
                    <button
                      v-for="relative in relatives"
                      :key="relative.id"
                      type="button"
                      @click="emit('load-relative', relative.id)"
                      :class="[
                        'flex w-full items-center gap-3 rounded-md border px-2 py-2 text-left transition-colors',
                        selectedRelative === relative.id
                          ? 'border-gray-900/25 bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] dark:border-white/15 dark:bg-gray-950'
                          : 'border-transparent hover:bg-white/80 dark:hover:bg-gray-950/60',
                      ]"
                    >
                      <span
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-[11px] font-semibold tabular-nums text-gray-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
                      >
                        {{ relative.first_name?.charAt(0).toUpperCase() }}{{ relative.last_name?.charAt(0).toUpperCase() }}
                      </span>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {{ relative.first_name }} {{ relative.last_name }}
                        </p>
                        <div class="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <UIcon :name="getRelationshipIcon(relative.relationship_type)" class="h-3.5 w-3.5 shrink-0 opacity-80" />
                          <span class="truncate">{{ getRelationshipDescription(relative.relationship_type, relative.gender) }}</span>
                        </div>
                      </div>
                      <div class="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          @click.stop="emit('edit-relative', relative)"
                          class="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Modifier"
                        >
                          <UIcon name="i-lucide-pencil" class="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          @click.stop="emit('delete-relative', relative)"
                          class="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          title="Supprimer"
                        >
                          <UIcon name="i-lucide-trash-2" class="h-4 w-4" />
                        </button>
                      </div>
                    </button>
                    <UButton
                      type="button"
                      variant="outline"
                      size="sm"
                      icon="i-lucide-plus"
                      color="neutral"
                      class="w-full justify-center border-dashed"
                      @click="emit('add-relative')"
                    >
                      Ajouter un autre proche
                    </UButton>
                  </div>

                  <UEmpty
                    v-else
                    icon="i-lucide-users"
                    title="Aucun proche enregistré"
                    description="Ajoutez un proche pour réserver à sa place ; vous réutiliserez ses informations ensuite."
                    class="rounded-lg border border-dashed border-gray-200 bg-white py-6 dark:border-gray-700 dark:bg-gray-950/40"
                    :actions="[{ label: 'Ajouter un proche', icon: 'i-lucide-plus', variant: 'solid', onClick: () => emit('add-relative') }]"
                  />
                </div>

                <div
                  v-if="
                    ((selectedRelative === null && !showRelativesSelector) || (typeof selectedRelative === 'string' && selectedRelative.length > 0)) &&
                    !showFullForm
                  "
                  class="rounded-lg border border-gray-100 bg-gray-50/40 p-3 dark:border-gray-800 dark:bg-gray-900/25"
                >
                  <div class="mb-2 flex justify-end">
                    <UButton type="button" variant="outline" size="xs" color="neutral" icon="i-lucide-pencil" @click="emit('show-full-form')">
                      Modifier
                    </UButton>
                  </div>

                  <div class="grid grid-cols-1 gap-x-4 gap-y-2.5 text-sm md:grid-cols-2">
                    <div class="flex items-start gap-2.5">
                      <UIcon name="i-lucide-user" class="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                      <div class="min-w-0">
                        <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Nom complet</p>
                        <p class="truncate font-medium text-gray-900 dark:text-white">
                          {{ prefilledInfo.first_name }} {{ prefilledInfo.last_name }}
                        </p>
                      </div>
                    </div>

                    <div v-if="prefilledInfo.birth_date" class="flex items-start gap-2.5">
                      <UIcon name="i-lucide-cake" class="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                      <div class="min-w-0">
                        <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Date de naissance</p>
                        <p class="font-medium text-gray-900 dark:text-white">{{ formatBirthDate(prefilledInfo.birth_date) }}</p>
                      </div>
                    </div>

                    <div v-if="prefilledInfo.email" class="flex items-start gap-2.5">
                      <UIcon name="i-lucide-mail" class="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                      <div class="min-w-0">
                        <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Email</p>
                        <p class="truncate font-medium text-gray-900 dark:text-white">{{ prefilledInfo.email }}</p>
                      </div>
                    </div>

                    <div v-if="prefilledInfo.phone" class="flex items-start gap-2.5">
                      <UIcon name="i-lucide-phone" class="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                      <div class="min-w-0">
                        <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Téléphone</p>
                        <p class="font-medium text-gray-900 dark:text-white">{{ prefilledInfo.phone }}</p>
                      </div>
                    </div>

                    <div v-if="prefilledInfo.address" class="flex items-start gap-2.5 md:col-span-2">
                      <UIcon name="i-lucide-map-pin" class="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                      <div class="min-w-0 flex-1">
                        <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Adresse</p>
                        <p class="font-medium text-gray-900 dark:text-white">
                          {{ typeof prefilledInfo.address === 'string' ? prefilledInfo.address : prefilledInfo.address?.label }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <template #footer>
            <div
              v-if="bookingWizardFinalStep && selectedServices.length > 0"
              id="rendez-vous-rgpd-consent"
              class="mb-3 mt-8 max-w-full scroll-mt-24"
            >
              <UCheckbox
                v-model="consent"
                :ui="{
                  root: 'flex flex-row items-start gap-2',
                  container: 'shrink-0 pt-px',
                  wrapper: 'min-w-0 flex-1',
                  label: 'text-[11px] font-medium leading-snug text-default cursor-pointer',
                }"
              >
                <template #label>
                  <span class="text-[11px] leading-snug">
                    J’accepte la
                    {{ ' ' }}
                    <NuxtLink
                      to="/politique-confidentialite"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-medium text-primary-600 underline underline-offset-[2px] hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      @click.stop
                    >
                      politique de confidentialité
                    </NuxtLink>
                    {{ ' ' }}
                    et consens au traitement de mes données de santé. J’autorise OneAndLab à communiquer les informations
                    nécessaires aux professionnels de santé concernés par ce rendez-vous.
                  </span>
                </template>
              </UCheckbox>
            </div>
            <RendezVousStickyFooter
              :primary-label="bookingWizardFinalStep ? 'Confirmer le rendez-vous' : 'Continuer'"
              :primary-submit="false"
              :primary-loading="submitBusy"
              :primary-disabled="submitBusy"
              :back-disabled="submitBusy"
              @back="emit('prev')"
              @primary="onBookingFooterPrimary"
            />
                  </template>
                </UnifiedAppointmentForm>
                <template #fallback>
                  <div class="py-8 text-center">
                    <p class="text-gray-500">Chargement du formulaire...</p>
                  </div>
                </template>
              </ClientOnly>
        </div>
      </template>

      <div v-else class="py-8 text-center">
        <p class="text-gray-500">Veuillez sélectionner au moins un soin</p>
        <UButton class="mt-4" @click="emit('back-to-selection')">Retour à la sélection</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isBloodTestAppointment, isNursingAppointment } from '~/utils/appointment-type-rules';
import { resolveCareCategoryImageSrc } from '~/utils/care-icons';
import { joinFrenchAndList } from '~/utils/join-french-list';

const props = withDefaults(
  defineProps<{
    validationError: string;
    selectedServices: Array<{ id: string; type: string; name: string; category_id: string | null; icon?: string; category_image_url?: string | null }>;
    /** Même forme que l’API /categories (options dynamiques par soin) */
    categories: Array<{
      id: string;
      name?: string;
      type?: string;
      options?: Array<{ option_key: string; label: string; field_type?: string; options?: { value: string; label: string }[] }>;
    }>;
    providerName?: string | null;
    isAuthenticated: boolean;
    relatives: any[];
    prefilledInfo: Record<string, any>;
    relativeForForm: any | null;
    hidePersonalInfo: boolean;
    minLeadTimeHours?: number | null;
    acceptSaturday?: boolean;
    acceptSunday?: boolean;
    /** Pendant envoi / overlay : désactive le pied de page pour éviter les doubles soumissions */
    submitBusy?: boolean;
    /** Wizard multi-étapes (patient) ; omis ⇒ formulaire complet (`all`). */
    bookingWizardSection?: 'all' | 'slot-datetime' | 'documents' | 'personal';
    /** Représentant du lot courant (id) pour `slot-datetime`. */
    bookingActiveSlotServiceId?: string | null;
    /** Représentant du lot courant (id) pour `documents` (une carte à la fois, comme les créneaux). */
    bookingActiveDocumentsServiceId?: string | null;
    /** Dernière sous-étape : RGPD + submit formulaire ; sinon bouton Continuer. */
    bookingWizardFinalStep?: boolean;
    /** Patient public : Horaire VIP lab + paiement Stripe (ne pas utiliser hors `/rendez-vous/nouveau`). */
    patientBookingUrgencyStripe?: boolean;
  }>(),
  {
    providerName: null,
    minLeadTimeHours: null,
    acceptSaturday: true,
    acceptSunday: true,
    submitBusy: false,
    bookingActiveSlotServiceId: null,
    bookingActiveDocumentsServiceId: null,
    bookingWizardFinalStep: true,
  }
);

const unifiedFormRef = ref<{
  flushDraftToParent?: () => void;
  commitPatientWizardSubmit?: () => void;
} | null>(null);

const route = useRoute();

/** Même logique que le layout patient : retour sur le RDV en cours après OTP. */
const bookingGuestPersonalLoginHref = computed(
  () => `/login?returnTo=${encodeURIComponent(route.fullPath)}`,
);

function flushDraftBeforeGuestLoginNavigate() {
  unifiedFormRef.value?.flushDraftToParent?.();
}

function onBookingFooterPrimary() {
  if (props.bookingWizardFinalStep) {
    unifiedFormRef.value?.commitPatientWizardSubmit?.();
    return;
  }
  emit('wizard-next');
}

const formData = defineModel<any>('formData', { required: true });

function flushBookingDraftToParent() {
  unifiedFormRef.value?.flushDraftToParent?.();
}

defineExpose({ flushBookingDraftToParent });
/** null = pour moi-même, string = id proche, undefined = non défini */
const selectedRelative = defineModel<any>('selectedRelative');
const showRelativesSelector = defineModel<boolean>('showRelativesSelector', { default: false });
const showFullForm = defineModel<boolean>('showFullForm', { default: false });
const consent = defineModel<boolean>('consent', { required: true, default: true });

const myselfSelected = computed(() => selectedRelative.value === null && !showRelativesSelector.value);
const procheSelected = computed(() => showRelativesSelector.value || typeof selectedRelative.value === 'string');

/** `undefined` ⇒ mode formulaire unique (dashboard / legacy). */
const effectiveBookingWizardSection = computed(() => props.bookingWizardSection ?? 'all');

const showGuestPersonalLoginHintUnderTitle = computed(
  () => !props.isAuthenticated && effectiveBookingWizardSection.value === 'personal',
);

const showBeneficiaryCard = computed(
  () =>
    props.isAuthenticated &&
    props.selectedServices.length > 0 &&
    (effectiveBookingWizardSection.value === 'all' || effectiveBookingWizardSection.value === 'personal'),
);

const runtimeWizard = useRuntimeConfig();

/** Suite du H1 : pas de majuscule forcée en tête (continuation de phrase). */
function lowerFirstLetter(s: string): string {
  const t = String(s).trim();
  if (!t) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/** Une carte créneaux / documents : même titre et pastilles que l’étape date (sans fusionner plusieurs lots). */
function buildWizardSegmentIntro(activeServiceId: string | null) {
  if (!activeServiceId) return null;
  const rep = props.selectedServices.find((s) => s.id === activeServiceId);
  if (!rep) return null;

  const base = String(runtimeWizard.public.apiBase ?? '');
  const img = (svc: (typeof props.selectedServices)[number]) =>
    resolveCareCategoryImageSrc(svc.category_image_url ?? null, base);

  if (isNursingAppointment(rep.type)) {
    const nurs = props.selectedServices.filter((s) => isNursingAppointment(s.type));
    const lines = nurs.map((s) => ({
      id: s.id,
      name: s.name,
      imageSrc: img(s),
      iconName: s.icon || 'i-lucide-heart-pulse',
    }));
    return { title: 'soins infirmiers', lines };
  }

  if (isBloodTestAppointment(rep.type)) {
    const bloods = props.selectedServices.filter((s) => isBloodTestAppointment(s.type));
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

const wizardSlotDatetimeIntro = computed(() => {
  if (effectiveBookingWizardSection.value !== 'slot-datetime' || !props.bookingActiveSlotServiceId) return null;
  return buildWizardSegmentIntro(props.bookingActiveSlotServiceId);
});

/** Sous-étape documents alignée sur le lot courant (comme pour la date). */
const wizardDocumentsIntro = computed(() => {
  if (effectiveBookingWizardSection.value !== 'documents' || !props.bookingActiveDocumentsServiceId) return null;
  return buildWizardSegmentIntro(props.bookingActiveDocumentsServiceId);
});

const wizardBookingHeaderIntro = computed(() => {
  if (effectiveBookingWizardSection.value === 'slot-datetime') return wizardSlotDatetimeIntro.value;
  if (effectiveBookingWizardSection.value === 'documents') return wizardDocumentsIntro.value;
  return null;
});

/** Libellés des soins du lot courant — concaténés dans le H1 (ex. après un tiret cadratin). */
const wizardBookingCareTypesLine = computed(() => {
  const intro = wizardBookingHeaderIntro.value;
  if (!intro?.lines?.length) return '';
  return joinFrenchAndList(intro.lines.map((l) => l.name));
});

const wizardBookingPageTitle = computed(() => {
  const sec = effectiveBookingWizardSection.value;
  if (sec === 'personal') return 'Informations personnelles';
  if (sec === 'documents') return 'Documents de votre rendez-vous';
  if (sec === 'slot-datetime') return 'Date de votre rendez-vous';
  return 'Date de votre rendez-vous';
});

/** Titre affiché : base + soins dans le même `<h1>` lorsque pertinent. */
const wizardBookingPageHeading = computed(() => {
  const base = wizardBookingPageTitle.value;
  const care = wizardBookingCareTypesLine.value;
  if (!care) return base;
  return `${base} — ${care}`;
});

const emit = defineEmits<{
  submit: [data: any];
  prev: [];
  'wizard-next': [];
  'select-for-myself': [];
  'toggle-proche': [];
  'load-relative': [id: string];
  'edit-relative': [relative: any];
  'delete-relative': [relative: any];
  'add-relative': [];
  'show-full-form': [];
  'back-to-selection': [];
}>();

function getRelationshipIcon(type: string) {
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
}

function getRelationshipDescription(type: string, gender?: string) {
  const descriptions: Record<string, Record<string, string>> = {
    child: { male: 'Votre fils', female: 'Votre fille', other: 'Votre enfant' },
    parent: { male: 'Votre père', female: 'Votre mère', other: 'Votre parent' },
    spouse: { male: 'Votre conjoint', female: 'Votre conjointe', other: 'Votre conjoint(e)' },
    sibling: { male: 'Votre frère', female: 'Votre sœur', other: 'Votre frère/sœur' },
    grandparent: { male: 'Votre grand-père', female: 'Votre grand-mère', other: 'Votre grand-parent' },
    grandchild: { male: 'Votre petit-fils', female: 'Votre petite-fille', other: 'Votre petit-enfant' },
    other: { male: 'Proche', female: 'Proche', other: 'Proche' },
  };
  const typeDescriptions = descriptions[type] || descriptions.other;
  return typeDescriptions[gender || 'other'] || typeDescriptions.other;
}

function formatBirthDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
</script>
