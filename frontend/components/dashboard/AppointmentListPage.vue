<template>
  <div :class="listPageRootStackClass">
    <div v-if="!hideHeader" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl lg:text-[28px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
          {{ subtitle }}
        </p>
      </div>

      <div v-if="$slots.headerActions" class="flex items-center gap-2">
        <slot name="headerActions" />
      </div>
    </div>

    <!-- Barre unique infirmier : recherche + actions + filtres ; période dans le drawer ; Mes soins / Bilans sous la carte -->
    <div
      class="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900/50 p-2.5 sm:p-3 shadow-sm"
      :class="basePath === '/nurse' ? '' : 'space-y-2.5'"
    >
      <!-- Infirmier : recherche à gauche, une ligne ; scroll horizontal si besoin (pas de troncature des libellés) -->
      <div
        v-if="basePath === '/nurse'"
        class="flex flex-nowrap items-center gap-2.5 min-w-0 overflow-x-auto overscroll-x-contain scrollbar-thin pb-0.5 -mx-0.5 px-0.5 touch-pan-x"
      >
        <UInput
          v-model="searchQuery"
          placeholder="Nom, adresse, téléphone…"
          icon="i-lucide-search"
          size="sm"
          class="flex-1 min-w-[11rem] max-w-[min(100%,24rem)] lg:max-w-none"
          :ui="{ rounded: 'rounded-lg' }"
          clearable
        />
        <div v-if="nurseLockedSegment == null" class="flex items-center gap-1 shrink-0">
          <UButton
            v-if="nurseListTab === 'soins' && nurseSegment !== 'en_attente'"
            type="button"
            variant="soft"
            color="primary"
            size="xs"
            icon="i-lucide-inbox"
            class="shrink-0 whitespace-nowrap"
            aria-label="Filtrer les demandes à accepter ou refuser"
            title="Afficher uniquement les soins où vous êtes proposé(e) · à accepter ou refuser."
            @click="nurseSegment = 'en_attente'"
          >
            À accepter
          </UButton>
          <UButton
            v-if="nurseListTab === 'soins' && nurseSegment === 'en_attente'"
            type="button"
            variant="outline"
            color="neutral"
            size="xs"
            icon="i-lucide-layout-list"
            class="shrink-0 whitespace-nowrap"
            aria-label="Afficher tous vos rendez-vous concernés"
            title="Revenir à la vue complète : tous les soins qui vous concernent (assignés, offres, créations)."
            @click="nurseSegment = 'tous'"
          >
            Tout afficher
          </UButton>
        </div>
        <div class="flex items-center gap-1.5 shrink-0 ml-auto">
          <UButton
            v-if="nurseListTab === 'soins' && nurseLockedSegment == null"
            type="button"
            color="neutral"
            variant="soft"
            size="sm"
            class="shrink-0 whitespace-nowrap text-[11px] font-medium px-2 sm:px-2.5"
            :title="`${activeNurseSegmentShortLabel} · Ouvrir les filtres pour changer de vue`"
            @click="filtersSheetOpen = true"
          >
            {{ activeNurseSegmentShortLabel }}
          </UButton>
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            size="sm"
            class="shrink-0 whitespace-nowrap px-2 sm:px-2.5"
            :aria-label="`Filtres${extraFiltersCount ? `, ${extraFiltersCount} actif(s)` : ''}`"
            @click="filtersSheetOpen = true"
          >
            <UIcon name="i-lucide-sliders-horizontal" class="w-4 h-4 sm:mr-0.5" />
            <span class="text-xs">Filtres</span>
            <UBadge
              v-if="extraFiltersCount > 0"
              :label="String(extraFiltersCount)"
              color="primary"
              variant="subtle"
              size="xs"
              class="ml-0.5 rounded-md min-w-[1.125rem] justify-center p-0"
            />
          </UButton>
        </div>
      </div>

      <!-- Autres rôles : recherche + filtres (période dans le drawer) -->
      <div
        v-else
        class="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3 min-w-0"
      >
        <UInput
          v-model="searchQuery"
          placeholder="Nom, adresse, téléphone…"
          icon="i-lucide-search"
          size="sm"
          class="flex-1 min-w-0 md:min-w-[12rem]"
          :ui="{ rounded: 'rounded-lg' }"
          clearable
        />
        <div class="flex items-center gap-1.5 shrink-0 md:ml-auto">
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            size="sm"
            class="shrink-0 px-2 sm:px-2.5"
            :aria-label="`Filtres${extraFiltersCount ? `, ${extraFiltersCount} actif(s)` : ''}`"
            @click="filtersSheetOpen = true"
          >
            <UIcon name="i-lucide-sliders-horizontal" class="w-4 h-4 sm:mr-0.5" />
            <span class="hidden sm:inline text-xs">Filtres</span>
            <UBadge
              v-if="extraFiltersCount > 0"
              :label="String(extraFiltersCount)"
              color="primary"
              variant="subtle"
              size="xs"
              class="ml-0.5 rounded-md min-w-[1.125rem] justify-center p-0"
            />
          </UButton>
        </div>
      </div>
    </div>

    <!-- Infirmier : Mes soins / Bilans sanguins sous la barre filtres — soulignement actif (comme /patient) -->
    <div
      v-if="basePath === '/nurse' && nurseLockedSegment !== 'en_attente'"
      class="min-w-0"
      role="tablist"
      aria-label="Type de rendez-vous"
    >
      <div class="flex flex-wrap gap-8 sm:gap-10">
        <button
          v-for="t in nurseTabOptions"
          :key="t.value"
          type="button"
          role="tab"
          class="inline-flex items-center gap-1.5 border-b-[3px] pb-1 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
          :class="
            nurseListTab === t.value
              ? 'border-b-primary-600 text-gray-950 dark:border-b-primary-500 dark:text-white'
              : 'border-b-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
          "
          :aria-selected="nurseListTab === t.value"
          :title="t.hint"
          @click="nurseListTab = t.value"
        >
          <UIcon :name="t.icon" class="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden="true" />
          {{ t.label }}
        </button>
      </div>
    </div>

    <AppointmentListFiltersSheet
      v-model:open="filtersSheetOpen"
      v-model:date-filter="dateFilter"
      v-model:status-filter="statusFilter"
      v-model:date-range-start="dateRangeStart"
      v-model:date-range-end="dateRangeEnd"
      :use-date-filter="useDateFilter"
      :status-filter-options="statusFilterOptions"
      :show-nurse-filters="basePath === '/nurse' && nurseLockedSegment == null"
      v-model:nurse-tab="nurseListTab"
      v-model:nurse-segment="nurseSegment"
    />

    <div v-if="loading" class="flex flex-col items-center justify-center py-14">
      <UIcon
        name="i-lucide-loader-2"
        class="w-10 h-10 animate-spin text-primary-500 mb-4"
      />
      <p class="text-[15px] text-gray-500 dark:text-gray-400 font-medium">
        Chargement de vos rendez-vous...
      </p>
    </div>

    <UEmpty
      v-else-if="!loading && displayRows.length === 0"
      icon="i-lucide-calendar-x"
      :title="emptyStateTitle"
      :description="emptyStateDescription"
      class="py-12"
    />

    <div v-else :class="listResultsSectionClass">
      <div class="grid items-stretch" :class="appointmentGridClass">
        <AppointmentListCard
          v-for="row in displayRows"
          :key="row.kind === 'single' ? row.appointment.id : row.key"
          :row="row"
          :base-path="basePath"
          :nurse-card-body-class="nurseCardBodyClass"
          :resolve-card-href="resolvedCardHref"
          :display-patient-name="displayPatientName"
          :display-address="displayAddress"
          :batch-offer-footer="row.kind === 'batch' && batchHasOfferActions(row)"
          :single-offer-footer="row.kind === 'single' && showNurseOfferCardActions(row.appointment)"
          :offer-loading-accept="isOfferProcessing(offerTermsKey(row), 'accept')"
          :offer-loading-refuse="isOfferProcessing(offerTermsKey(row), 'refuse')"
          :categories="careCategoriesList"
          @card-click="emit('cardClick', $event)"
          @accept-batch="openAcceptOfferConfirmBatch(row)"
          @refuse-batch="nurseRefuseOfferBatch(row)"
          @accept-offer="openAcceptOfferConfirmSingle(row.appointment)"
          @refuse-offer="nurseRefuseOffer(row.appointment)"
        >
          <template v-if="slots.cardActions" #cardActions="slotProps">
            <slot name="cardActions" v-bind="slotProps" />
          </template>
        </AppointmentListCard>
      </div>

      <div
        v-if="showPaginationBar"
        class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-gray-100 dark:border-gray-800"
      >
        <p class="text-[14px] text-gray-500 dark:text-gray-400">
          Affichage de <span class="font-semibold text-gray-900 dark:text-white">{{ startIndex }}-{{ endIndex }}</span>
          sur <span class="font-semibold text-gray-900 dark:text-white">{{ totalItems }}</span>
          <span v-if="isAdminCardPagination"> cartes</span>
        </p>
        <UPagination
          v-model:page="currentPage"
          :total="totalItems"
          :items-per-page="effectivePageSize"
          :sibling-count="2"
          show-edges
          :ui="{ wrapper: 'gap-1', rounded: 'rounded-lg' }"
        />
      </div>
    </div>

    <ClientOnly>
      <Teleport to="body">
        <UModal
          v-model:open="acceptConfirmOpen"
          :ui="{ content: 'max-w-sm w-[calc(100vw-1.5rem)] rounded-xl shadow-lg border border-gray-200/80 dark:border-gray-800' }"
        >
          <template #content>
            <div class="p-4 sm:p-5">
              <div class="flex items-start gap-3">
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400"
                  aria-hidden="true"
                >
                  <UIcon name="i-lucide-handshake" class="h-4 w-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
                    <span class="font-semibold text-gray-900 dark:text-white">{{ acceptConfirmCopy.lead }}</span>{{ acceptConfirmCopy.tail }}
                  </p>
                </div>
              </div>
              <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <UButton
                  color="neutral"
                  variant="outline"
                  size="sm"
                  class="justify-center sm:min-w-[6rem]"
                  :disabled="acceptConfirmSubmitting"
                  @click="closeAcceptOfferConfirm"
                >
                  Annuler
                </UButton>
                <UButton
                  color="primary"
                  size="sm"
                  class="justify-center sm:min-w-[8rem] font-semibold"
                  :loading="acceptConfirmSubmitting"
                  @click="confirmAcceptOfferPending"
                >
                  Confirmer l’acceptation
                </UButton>
              </div>
            </div>
          </template>
        </UModal>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, useSlots, watch } from 'vue';
import { apiFetch } from '~/utils/api';
import { appointmentListAddressLine } from '~/utils/address-display';
import { isPendingIncomingOffer } from '~/utils/appointment-offer';
import {
  NURSE_SEGMENT_OPTIONS,
  NURSE_TAB_OPTIONS,
  isValidNurseSegment,
  normalizeNurseSegment,
  type NurseListTab,
  type NurseSegment,
} from '~/constants/nurse-appointments-filters';
import {
  NURSE_APPOINTMENT_LIST_CARD_BODY,
  NURSE_APPOINTMENT_LIST_GRID_COLS,
  NURSE_APPOINTMENT_LIST_GRID_GAP,
  NURSE_APPOINTMENT_LIST_PAGE_STACK,
  NURSE_APPOINTMENT_LIST_RESULTS_STACK,
} from '~/constants/nurse-appointment-list-ui';
import {
  groupAppointmentsByBatch,
  groupAppointmentsForNurseMesDemandes,
  type AppointmentListRow,
} from '~/utils/appointment-batch';
import { useAppointmentModalQueue } from '~/composables/useAppointmentModalQueue';
import {
  appointmentPatientDisplayName,
  appointmentPatientSearchTextLower,
  normalizeAppointmentFormData,
} from '~/utils/appointment-patient-display';
import type { CareCategoryRowMinimal } from '~/utils/care-icons';

const props = withDefaults(
  defineProps<{
    basePath: string
    title?: string
    subtitle?: string
    /** Masque l'en-tête interne (titre + actions) : à fournir sur la page via `AppPageHeader` (souvent avec `hide-header`). */
    hideHeader?: boolean
    /** Si true, utilise les filtres date (À venir / Passés) et fetch nurse-style. Sinon fetch tous et filtre côté client par search/status si besoin. */
    useDateFilter?: boolean
    /** Statuts à inclure dans l'API (ex: "confirmed,inProgress,completed,canceled,refused" pour nurse). Vide = tous. */
    statusFilterApi?: string
    /** Filtre optionnel : n'afficher que les RDV assignés à ce préleveur (lab). */
    assignedToPreleveurId?: string
    /** Filtre optionnel : n'afficher que les RDV assignés à ce sous-compte / lab (assigned_lab_id). */
    assignedToLabId?: string
    /** Filtre optionnel (admin) : n'afficher que les RDV de cet utilisateur (user_id). */
    userIdFilter?: string
    /**
     * Destination du clic sur la carte. Retourner `null` pour gérer le clic via @card-click (ex. modal offre entrante).
     * Par défaut : `${basePath}/appointments/:id`.
     */
    cardHref?: (appointment: any) => string | null
    /** Verrouille la vue infirmier (plus de filtres segment / sheet « vues »). `tous` = liste RDV ; `en_attente` = page « Mes demandes ». */
    nurseLockedSegment?: 'tous' | 'en_attente'
    /** Grille plus dense (mini-cartes) pour Mes demandes. */
    nurseCompactCards?: boolean
  }>(),
  {
    title: 'Mes rendez-vous',
    subtitle: 'Gérez vos rendez-vous',
    hideHeader: false,
    useDateFilter: true,
    statusFilterApi: '',
    assignedToPreleveurId: '',
    assignedToLabId: '',
    userIdFilter: '',
    cardHref: undefined,
    nurseLockedSegment: undefined,
    nurseCompactCards: false,
  }
);

const emit = defineEmits<{
  cardClick: [appointment: any]
}>();

const slots = useSlots();

function nurseSegmentEffective(): NurseSegment {
  return (props.nurseLockedSegment ?? nurseSegment.value) as NurseSegment;
}

function resolvedCardHref(appointment: any): string | null {
  if (props.cardHref) return props.cardHref(appointment);
  if (props.basePath === '/nurse') {
    const seg = nurseSegmentEffective();
    if (seg === 'en_attente' && isPendingIncomingOffer(appointment, user.value?.id)) {
      return `/nurse/appointments/${appointment.id}`;
    }
    if (isPendingIncomingOffer(appointment, user.value?.id)) {
      return null;
    }
  }
  return `${props.basePath}/appointments/${appointment.id}`;
}

function offerTermsKey(row: AppointmentListRow): string {
  return row.kind === 'batch' ? row.key : row.appointment.id;
}

const toast = useAppToast();
const { user } = useAuth();
const route = useRoute();
const router = useRouter();
const { shareTokenForAccept } = useAppointmentModalQueue();

const careCategoriesList = ref<CareCategoryRowMinimal[]>([]);

async function loadCareCategoriesForAppointmentList() {
  try {
    const response = await apiFetch('/categories', { method: 'GET' });
    if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
      careCategoriesList.value = response.data as CareCategoryRowMinimal[];
    }
  } catch {
    /* ignore */
  }
}

/** Filtres infirmier (liste + URL) — utilisés seulement si basePath === /nurse */
const nurseListTab = ref<NurseListTab>('soins');
const nurseSegment = ref<NurseSegment>('tous');
const nurseTabOptions = NURSE_TAB_OPTIONS;
const nurseSegmentOptions = NURSE_SEGMENT_OPTIONS;

const listPageRootStackClass = computed(() =>
  props.basePath === '/nurse' ? NURSE_APPOINTMENT_LIST_PAGE_STACK : 'space-y-3 lg:space-y-4',
);

const listResultsSectionClass = computed(() =>
  props.basePath === '/nurse' ? NURSE_APPOINTMENT_LIST_RESULTS_STACK : 'space-y-5',
);

/** Corps carte : même rythme que cartes patient (`gap-2 px-4 py-2.5 …`) ; variant compact légèrement resserrée. */
const nurseCardBodyClass = computed(() => {
  if (props.basePath === '/nurse') return NURSE_APPOINTMENT_LIST_CARD_BODY;
  return props.nurseCompactCards
    ? 'gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5'
    : 'gap-2 px-4 py-2.5 sm:px-5 sm:py-3';
});

/** Grille liste RDV : `/nurse` suit `nurse-appointment-list-ui.ts` (colonnes + gap alignés Mes demandes / Mes RDV). */
const appointmentGridClass = computed(() => {
  if (props.basePath === '/nurse') {
    return `${NURSE_APPOINTMENT_LIST_GRID_COLS} ${NURSE_APPOINTMENT_LIST_GRID_GAP}`;
  }
  if (props.nurseCompactCards) {
    return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5';
  }
  return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4';
});

/** Libellé court de la vue (chip + sheet) */
const activeNurseSegmentShortLabel = computed(() => {
  const o = nurseSegmentOptions.find((x) => x.value === nurseSegment.value);
  return o?.label ?? 'Vue';
});

function applyNurseNavFromRoute() {
  if (props.basePath !== '/nurse') return;
  // Page « Mes demandes » verrouillée sur en_attente : prioriser — sinon tab=demandes + shareToken
  // forçait nurse_tab=demandes (API = bilans sanguins / envoyes) et vidait la liste des soins infirmiers.
  if (props.nurseLockedSegment) {
    nurseListTab.value = 'soins';
    nurseSegment.value = props.nurseLockedSegment;
    return;
  }
  // Lien partagé (WhatsApp) sur liste sans segment verrouillé : onglet Bilans sanguins
  if (route.query.tab === 'demandes' && route.query.shareToken) {
    nurseListTab.value = 'demandes';
    return;
  }
  if (route.query.tab === 'demandes') {
    nurseListTab.value = 'demandes';
    return;
  }
  nurseListTab.value = 'soins';
  const s = route.query.segment;
  if (typeof s === 'string' && isValidNurseSegment(s)) {
    nurseSegment.value = normalizeNurseSegment(s);
  } else {
    nurseSegment.value = 'tous';
  }
}

function syncNurseQueryToUrl() {
  if (props.basePath !== '/nurse') return;
  if (props.nurseLockedSegment) {
    const q = { ...route.query } as Record<string, string | string[] | undefined>;
    delete q.segment;
    // Conserver tab=demandes + jeton partage (ouverture depuis lien WhatsApp)
    if (nurseListTab.value === 'demandes' && route.query.shareToken) {
      q.tab = 'demandes';
    }
    const a = JSON.stringify(route.query);
    const b = JSON.stringify(q);
    if (a !== b) void router.replace({ path: route.path, query: q });
    return;
  }
  const q = { ...route.query } as Record<string, string | string[] | undefined>;
  if (nurseListTab.value === 'demandes') {
    q.tab = 'demandes';
    delete q.segment;
  } else {
    delete q.tab;
    if (nurseSegment.value !== 'tous') q.segment = nurseSegment.value;
    else delete q.segment;
  }
  const a = JSON.stringify(route.query);
  const b = JSON.stringify(q);
  if (a !== b) void router.replace({ path: route.path, query: q });
}

watch(() => route.query, applyNurseNavFromRoute, { immediate: true });

const currentPage = ref(1);
/** Cartes par page (admin : lots regroupés). Autres rôles : lignes API. */
const ADMIN_CARD_PAGE_SIZE = 12;
const pageSize = ref(24);
const totalItems = ref(0);
/** Indique qu’il existe (probablement) une page suivante — renvoyé par l’API ou déduit. */
const serverHasMore = ref(false);
/**
 * Admin / pro / lab sans filtre période : pagination + filtres statut/dates côté API.
 * Re-filtrer côté client sur 24 lignes vide la grille alors que le total serveur reste > 0.
 */
const isServerPaginatedList = computed(() => !props.useDateFilter);
/** Admin : pagination par cartes (lots regroupés), pas par lignes API brutes. */
const isAdminCardPagination = computed(() => props.basePath === '/admin');
const effectivePageSize = computed(() =>
  isAdminCardPagination.value ? ADMIN_CARD_PAGE_SIZE : pageSize.value,
);
const hasClientSearchFilter = computed(() => (searchQuery.value || '').trim().length > 0);
const totalPages = computed(() => Math.ceil(totalItems.value / effectivePageSize.value));
/** Afficher la barre si plus d’une page, ou page suivante possible, ou déjà au-delà de la page 1. */
const showPaginationBar = computed(() => {
  if (hasClientSearchFilter.value) return false;
  return totalPages.value > 1 || serverHasMore.value || currentPage.value > 1;
});

const loading = ref(false);

type AcceptOfferConfirmPending =
  | { mode: 'single'; apt: any }
  | { mode: 'batch'; row: Extract<AppointmentListRow, { kind: 'batch' }> };

const acceptConfirmOpen = ref(false);
const acceptConfirmPending = ref<AcceptOfferConfirmPending | null>(null);
const acceptConfirmSubmitting = ref(false);

watch(acceptConfirmOpen, (open) => {
  if (!open && !acceptConfirmSubmitting.value) {
    acceptConfirmPending.value = null;
  }
});

const acceptConfirmCopy = computed(() => {
  const p = acceptConfirmPending.value;
  if (!p) {
    return { lead: '', tail: '' };
  }
  const engagement =
    ' En confirmant, vous vous engagez à assurer la prestation aux créneaux prévus, sous votre responsabilité professionnelle et dans le respect du secret médical.';
  if (p.mode === 'single') {
    return {
      lead: 'Accepter ce rendez-vous.',
      tail: engagement,
    };
  }
  const offered = p.row.appointments.filter((a) => showNurseOfferCardActions(a));
  const n = Math.max(1, offered.length);
  const plural = n > 1;
  return {
    lead: plural ? `Accepter ces ${n} rendez-vous.` : 'Accepter ce rendez-vous.',
    tail: plural
      ? ` En confirmant, vous vous engagez à réaliser chaque soin aux dates prévues, sous votre responsabilité professionnelle et dans le respect du secret médical.`
      : engagement,
  };
});

function openAcceptOfferConfirmSingle(apt: any) {
  acceptConfirmPending.value = { mode: 'single', apt };
  acceptConfirmOpen.value = true;
}

function openAcceptOfferConfirmBatch(row: Extract<AppointmentListRow, { kind: 'batch' }>) {
  acceptConfirmPending.value = { mode: 'batch', row };
  acceptConfirmOpen.value = true;
}

function closeAcceptOfferConfirm() {
  if (acceptConfirmSubmitting.value) return;
  acceptConfirmOpen.value = false;
  acceptConfirmPending.value = null;
}

async function confirmAcceptOfferPending() {
  const p = acceptConfirmPending.value;
  if (!p || acceptConfirmSubmitting.value) return;
  acceptConfirmSubmitting.value = true;
  try {
    const ok =
      p.mode === 'single'
        ? await nurseAcceptOffer(p.apt)
        : await nurseAcceptOfferBatch(p.row);
    if (ok) {
      acceptConfirmOpen.value = false;
      acceptConfirmPending.value = null;
    }
  } finally {
    acceptConfirmSubmitting.value = false;
  }
}

const adminCardPageRows = ref<AppointmentListRow[]>([]);

type AdminCardCache = {
  filterKey: string;
  accumulated: any[];
  grouped: AppointmentListRow[];
  apiPage: number;
  apptHasMore: boolean;
};

const adminCardCache = ref<AdminCardCache | null>(null);

function adminListFilterKey(): string {
  return JSON.stringify({
    status: statusFilter.value,
    dateFrom: dateRangeStart.value,
    dateTo: dateRangeEnd.value,
    userId: props.userIdFilter,
  });
}

function invalidateAdminCardCache() {
  adminCardCache.value = null;
}

function appointmentsFromListRow(row: AppointmentListRow): any[] {
  return row.kind === 'batch' ? row.appointments : [row.appointment];
}

function filterListRowsBySearch(rows: AppointmentListRow[], q: string): AppointmentListRow[] {
  if (!q) return rows;
  const searchPhone = q.replace(/\s/g, '');
  return rows.filter((row) =>
    appointmentsFromListRow(row).some((a) => {
      const fd = normalizeAppointmentFormData(a.form_data) ?? {};
      const phone = String(fd.phone ?? '').replace(/\s/g, '');
      const address =
        typeof a.address === 'string' ? a.address.toLowerCase() : (a.address?.label || '').toLowerCase();
      const nameBlob = appointmentPatientSearchTextLower(a);
      return nameBlob.includes(q) || phone.includes(searchPhone) || address.includes(q);
    }),
  );
}

const displayRows = computed((): AppointmentListRow[] => {
  if (isAdminCardPagination.value) {
    return filterListRowsBySearch(
      adminCardPageRows.value,
      (searchQuery.value || '').trim().toLowerCase(),
    );
  }
  const list = filteredAndSorted.value;
  if (props.basePath === '/nurse' && props.nurseLockedSegment === 'en_attente') {
    return groupAppointmentsForNurseMesDemandes(list);
  }
  return groupAppointmentsByBatch(list);
});
const dateFilter = ref('upcoming');
const searchQuery = ref('');
const filtersSheetOpen = ref(false);
const statusFilter = ref('all');
const dateRangeStart = ref<string | null>(null);
const dateRangeEnd = ref<string | null>(null);

/** Badge sur « Filtres » : statut ≠ tous, plage dates, période ≠ à venir (drawer), vue infirmier. */
const extraFiltersCount = computed(() => {
  let n = 0;
  if (statusFilter.value && statusFilter.value !== 'all') n += 1;
  if (dateRangeStart.value || dateRangeEnd.value) n += 1;
  if (props.useDateFilter && dateFilter.value !== 'upcoming') n += 1;
  if (props.basePath === '/nurse' && !props.nurseLockedSegment) {
    if (nurseListTab.value === 'demandes') n += 1;
    else if (nurseSegment.value !== 'tous') n += 1;
  }
  return n;
});
/** Accepter/refuser depuis la carte : spinner uniquement sur le bouton cliqué (pas les deux). */
const processingOfferAction = reactive<Record<string, 'accept' | 'refuse'>>({});
const processingAppointments = computed(() => new Set(Object.keys(processingOfferAction)));

const dateTabs = [
  { label: 'À venir', value: 'upcoming' },
  { label: 'Passés', value: 'past' },
];

const statusFilterOptions = [
  { label: 'Tous les statuts', value: 'all' },
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmé', value: 'confirmed' },
  { label: 'En cours', value: 'inProgress' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Annulé', value: 'canceled' },
  { label: 'Refusé', value: 'refused' },
];

/** Liste brute après fetch + filtre date uniquement (sans tri ni filtre statut/recherche). */
const baseAppointments = ref<any[]>([]);

/** Liste filtrée par statut et recherche (et préleveur si lab), triée du plus récent au plus ancien (created_at puis scheduled_at). */
const filteredAndSorted = computed(() => {
  let list = [...baseAppointments.value];
  // Infirmier « Mes rendez-vous » (segment tous) : ne pas afficher les offres à accepter (déjà sur Mes demandes)
  if (
    props.basePath === '/nurse'
    && nurseListTab.value === 'soins'
    && nurseSegmentEffective() === 'tous'
  ) {
    const uid = user.value?.id;
    list = list.filter(
      (a: any) => !(a?.type === 'nursing' && isPendingIncomingOffer(a, uid)),
    );
  }
  // Lab : filtre préleveur / sous-compte appliqué côté API (filter_assigned_*) pour total + pages corrects.
  if (props.basePath !== '/lab') {
    if (props.assignedToPreleveurId) {
      list = list.filter((a: any) => a.assigned_to === props.assignedToPreleveurId);
    }
    if (props.assignedToLabId) {
      list = list.filter((a: any) => a.assigned_lab_id === props.assignedToLabId);
    }
  }
  if (statusFilter.value && statusFilter.value !== 'all' && !isServerPaginatedList.value) {
    list = list.filter((a: any) => a.status === statusFilter.value);
  }
  if (!isServerPaginatedList.value && dateRangeStart.value) {
    const startDay = new Date(dateRangeStart.value);
    startDay.setHours(0, 0, 0, 0);
    const startTs = startDay.getTime();
    list = list.filter((a: any) => {
      const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      return at >= startTs;
    });
  }
  if (!isServerPaginatedList.value && dateRangeEnd.value) {
    const endDay = new Date(dateRangeEnd.value);
    endDay.setHours(23, 59, 59, 999);
    const endTs = endDay.getTime();
    list = list.filter((a: any) => {
      const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      return at <= endTs;
    });
  }
  const q = (searchQuery.value || '').trim().toLowerCase();
  if (q) {
    list = list.filter((a: any) => {
      const fd = normalizeAppointmentFormData(a.form_data) ?? {};
      const phone = String(fd.phone ?? '').replace(/\s/g, '');
      const address = typeof a.address === 'string' ? a.address.toLowerCase() : (a.address?.label || '').toLowerCase();
      const searchPhone = q.replace(/\s/g, '');
      const nameBlob = appointmentPatientSearchTextLower(a);
      return (
        nameBlob.includes(q) ||
        phone.includes(searchPhone) ||
        address.includes(q)
      );
    });
  }
  if (!isServerPaginatedList.value || hasClientSearchFilter.value) {
    list.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || a.scheduled_at || 0).getTime();
      const dateB = new Date(b.created_at || b.scheduled_at || 0).getTime();
      return dateB - dateA;
    });
  }
  return list;
});

/** Indices d’affichage : alignés sur le total serveur sauf recherche locale (page courante uniquement). */
const startIndex = computed(() => {
  if (hasClientSearchFilter.value) {
    return filteredAndSorted.value.length === 0 ? 0 : 1;
  }
  if (totalItems.value === 0) return 0;
  return (currentPage.value - 1) * effectivePageSize.value + 1;
});

const endIndex = computed(() => {
  if (hasClientSearchFilter.value) {
    return filteredAndSorted.value.length;
  }
  if (totalItems.value === 0) return 0;
  return Math.min(currentPage.value * effectivePageSize.value, totalItems.value);
});

const emptyStateTitle = computed(() => {
  if (isAdminCardPagination.value && adminCardPageRows.value.length > 0 && displayRows.value.length === 0) {
    return 'Aucun résultat';
  }
  if (baseAppointments.value.length > 0 && filteredAndSorted.value.length === 0 && !isAdminCardPagination.value) {
    return 'Aucun résultat';
  }
  if (props.nurseLockedSegment === 'en_attente' && baseAppointments.value.length === 0) {
    return 'Aucune demande en attente';
  }
  // Admin / lab : pas de filtre période côté API — éviter « à venir » alors que la requête charge tout
  if (!props.useDateFilter) {
    return 'Aucun rendez-vous';
  }
  const filterLabel = dateTabs.find((o) => o.value === dateFilter.value)?.label || '';
  return `Aucun rendez-vous ${filterLabel.toLowerCase()}`;
});

const emptyStateDescription = computed(() => {
  if (baseAppointments.value.length > 0 && filteredAndSorted.value.length === 0) {
    if (hasClientSearchFilter.value && isServerPaginatedList.value) {
      return 'Aucun résultat sur cette page — la recherche ne parcourt que les 24 RDV affichés. Effacez la recherche ou changez de page.';
    }
    return 'Aucun rendez-vous ne correspond à la recherche ou au filtre de statut. Modifiez vos critères.';
  }
  if (props.nurseLockedSegment === 'en_attente' && baseAppointments.value.length === 0) {
    return 'Les nouvelles propositions de soins apparaîtront ici. La liste se met à jour automatiquement.';
  }
  if (!props.useDateFilter) {
    if (props.basePath === '/admin') {
      return 'Soit aucun RDV en base, soit un filtre restreint la liste (statut, dates dans Filtres, recherche). Vérifiez aussi l’URL : un paramètre user_id limite la vue au périmètre de cet utilisateur.';
    }
    return 'Aucun RDV ne correspond aux critères (recherche, statut, plage de dates dans Filtres).';
  }
  switch (dateFilter.value) {
    case 'upcoming':
      return "Aucun rendez-vous à venir. Ils apparaîtront ici une fois créés ou acceptés.";
    case 'past':
      return "Aucun rendez-vous dans l'historique.";
    default:
      return 'Aucun rendez-vous trouvé.';
  }
});

function buildAppointmentListParams(apiPage: number, apiLimit: number): Record<string, string> {
  const params: Record<string, string> = {
    page: String(apiPage),
    limit: String(apiLimit),
  };
  if (props.statusFilterApi) {
    params.status = props.statusFilterApi;
  } else if (statusFilter.value && statusFilter.value !== 'all') {
    params.status = statusFilter.value;
  }
  if (props.userIdFilter) {
    params.user_id = props.userIdFilter;
  }
  if (isServerPaginatedList.value) {
    params.sort = 'created_at';
  }
  const now = new Date();
  if (dateRangeStart.value) {
    params.date_from = new Date(dateRangeStart.value + 'T00:00:00')
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
  } else if (props.useDateFilter && dateFilter.value === 'upcoming') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    params.date_from = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())} ${pad(start.getHours())}:${pad(start.getMinutes())}:${pad(start.getSeconds())}`;
  }
  if (dateRangeEnd.value) {
    params.date_to = new Date(dateRangeEnd.value + 'T23:59:59').toISOString().slice(0, 19).replace('T', ' ');
  } else if (props.useDateFilter && dateFilter.value === 'past') {
    params.date_to = now.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (props.basePath === '/nurse') {
    params.nurse_tab = nurseListTab.value;
    const seg = props.nurseLockedSegment ?? nurseSegment.value;
    if (nurseListTab.value === 'soins' && seg !== 'tous') {
      params.nurse_segment = seg;
    }
  }
  if (props.basePath === '/lab') {
    const pre = (props.assignedToPreleveurId || '').trim();
    const slab = (props.assignedToLabId || '').trim();
    if (pre) params.filter_assigned_to = pre;
    if (slab) params.filter_assigned_lab_id = slab;
  }
  return params;
}

/** Admin : 12 cartes/page, cache + requêtes API limitées (pas de re-scan complet). */
async function fetchAdminCardPage() {
  const perPage = ADMIN_CARD_PAGE_SIZE;
  const cardPage = currentPage.value;
  const skip = (cardPage - 1) * perPage;
  const need = skip + perPage;
  const filterKey = adminListFilterKey();

  if (adminCardCache.value?.filterKey !== filterKey) {
    adminCardCache.value = null;
  }

  const cache: AdminCardCache = adminCardCache.value ?? {
    filterKey,
    accumulated: [],
    grouped: [],
    apiPage: 1,
    apptHasMore: true,
  };

  /** ~3 RDV bruts / carte en moyenne ; plafond 2 requêtes API par chargement. */
  const apiChunk = perPage * 3;
  const maxFetchesPerLoad = 2;
  let fetches = 0;

  while (cache.grouped.length < need && cache.apptHasMore && fetches < maxFetchesPerLoad) {
    const params = buildAppointmentListParams(cache.apiPage, apiChunk);
    const response = await apiFetch(`/appointments?${new URLSearchParams(params).toString()}`, {
      method: 'GET',
    });
    if (!response.success || !Array.isArray(response.data)) {
      throw new Error((response as { error?: string }).error || 'Erreur lors du chargement des rendez-vous');
    }
    const chunk = response.data as any[];
    if (chunk.length === 0) {
      cache.apptHasMore = false;
      break;
    }
    cache.accumulated = cache.accumulated.concat(chunk);
    cache.grouped = groupAppointmentsByBatch(cache.accumulated);
    const pag = response.pagination as { has_more?: boolean } | undefined;
    cache.apptHasMore = chunk.length >= apiChunk && pag?.has_more !== false;
    cache.apiPage += 1;
    fetches += 1;
  }

  adminCardCache.value = cache;
  adminCardPageRows.value = cache.grouped.slice(skip, skip + perPage);
  baseAppointments.value = cache.accumulated;

  const hasMoreCards = cache.grouped.length > skip + perPage || cache.apptHasMore;
  serverHasMore.value = hasMoreCards;
  totalItems.value = hasMoreCards ? Math.max(skip + perPage + 1, cache.grouped.length) : cache.grouped.length;
}

const fetchAppointments = async (silent = false) => {
  if (!silent) loading.value = true;
  try {
    if (isAdminCardPagination.value) {
      await fetchAdminCardPage();
      return;
    }
    const params = buildAppointmentListParams(currentPage.value, pageSize.value);
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/appointments?${queryString}`, { method: 'GET' });

    if (response.success && response.data) {
      baseAppointments.value = response.data;
      const pag = response.pagination as
        | { total?: number; has_more?: boolean; limit?: number }
        | undefined;
      const len = response.data.length;
      let total = pag != null && Number.isFinite(Number(pag.total)) ? Number(pag.total) : 0;
      const hasMoreFlag = pag?.has_more === true;
      serverHasMore.value = hasMoreFlag;
      if (total === 0 && len > 0) {
        total = (currentPage.value - 1) * pageSize.value + len;
      }
      if (hasMoreFlag) {
        total = Math.max(total, currentPage.value * pageSize.value + 1);
      }
      totalItems.value = total;
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Erreur lors du chargement des rendez-vous',
        color: 'red',
      });
      baseAppointments.value = [];
      adminCardPageRows.value = [];
      totalItems.value = 0;
      serverHasMore.value = false;
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue',
      color: 'red',
    });
    baseAppointments.value = [];
    adminCardPageRows.value = [];
    totalItems.value = 0;
    serverHasMore.value = false;
  } finally {
    if (!silent) loading.value = false;
  }
};

/** Polling pour nurse, lab, subaccount : rafraîchir la liste en arrière-plan (ex. après acceptation dans la modal) */
const shouldPollList = computed(() =>
  ['/nurse', '/lab', '/subaccount'].some((p) => props.basePath.startsWith(p))
);
const { holdCount } = useBookingApiHold();
const { start: startListPolling } = usePolling(
  () => fetchAppointments(true),
  15000,
  { shouldSkip: () => holdCount.value > 0 },
);

/** Rafraîchir immédiatement quand la modal accepte/refuse (trigger du layout) */
const listRefreshTrigger = useState<number>('appointments.listRefreshTrigger', () => 0);
watch(listRefreshTrigger, () => {
  if (shouldPollList.value) fetchAppointments(true);
});

function showNurseOfferCardActions(apt: any): boolean {
  if (props.basePath !== '/nurse') return false;
  if (nurseSegmentEffective() !== 'en_attente') return false;
  if (apt?.type !== 'nursing') return false;
  return isPendingIncomingOffer(apt, user.value?.id);
}

function batchHasOfferActions(row: AppointmentListRow): boolean {
  if (row.kind !== 'batch') return false;
  return row.appointments.some((a) => showNurseOfferCardActions(a));
}

/** Premier RDV du lot avec offre entrante (ex. ouverture modal). */
function primaryAppointmentForBatchOffer(row: Extract<AppointmentListRow, { kind: 'batch' }>): any {
  return row.appointments.find((a) => showNurseOfferCardActions(a)) ?? row.appointments[0];
}

/** Premier soin chronologiquement — pour ouvrir la fiche détail où le lot complet est déjà affiché (`batch_siblings`). */
function firstBatchAppointmentForDetail(row: Extract<AppointmentListRow, { kind: 'batch' }>): any {
  return [...row.appointments].sort(
    (a, b) =>
      new Date(a.scheduled_at || a.created_at || 0).getTime() -
      new Date(b.scheduled_at || b.created_at || 0).getTime(),
  )[0]!;
}

async function nurseAcceptOfferBatch(row: Extract<AppointmentListRow, { kind: 'batch' }>): Promise<boolean> {
  const termsKey = offerTermsKey(row);
  const apts = row.appointments.filter((a) => showNurseOfferCardActions(a));
  if (apts.length === 0) return false;
  /** Fiche `/nurse/appointments/:id` : GET charge le RDV + les frères de lot (`batch_siblings`) — même URL pour tout le lot. */
  const detailTarget = firstBatchAppointmentForDetail(row);

  const sharedBid = row.appointments[0]?.creation_batch_id;
  const allSameBackendBatch =
    !!sharedBid && row.appointments.every((a) => a.creation_batch_id === sharedBid);

  if (allSameBackendBatch && row.appointments.length > 1) {
    return await nurseAcceptOffer(detailTarget, { termsKey, isBatch: true });
  }

  processingOfferAction[termsKey] = 'accept';
  try {
    const shareTok =
      (typeof route.query.shareToken === 'string' && route.query.shareToken.trim() !== ''
        ? route.query.shareToken.trim()
        : '') ||
      shareTokenForAccept.value ||
      '';
    const aptsChrono = [...apts].sort(
      (a, b) =>
        new Date(a.scheduled_at || a.created_at || 0).getTime() -
        new Date(b.scheduled_at || b.created_at || 0).getTime(),
    );
    for (let i = 0; i < aptsChrono.length; i++) {
      const apt = aptsChrono[i]!;
      const body: Record<string, unknown> = { status: 'confirmed' };
      if (i === 0 && shareTok) body.share_token = shareTok;
      const res = await apiFetch(`/appointments/${apt.id}`, { method: 'PUT', body });
      if (!res.success) {
        toast.add({
          title: 'Erreur',
          description: (res as any).error || `Impossible d’accepter le rendez-vous ${i + 1}/${aptsChrono.length}.`,
          color: 'red',
        });
        return false;
      }
    }
    if (shareTok) shareTokenForAccept.value = null;
    toast.add({
      title: 'Demandes acceptées',
      description: `${aptsChrono.length} soin(s) pris en charge · la fiche liste l’ensemble du lot.`,
      color: 'green',
    });
    listRefreshTrigger.value++;
    await navigateTo(`/nurse/appointments/${detailTarget.id}`);
    void fetchAppointments(true);
    return true;
  } catch (err: any) {
    if (err?.code === 'PLAN_LIMIT' || (err?.message && /limite|offre Découverte/i.test(String(err.message)))) {
      toast.add({
        title: 'Limite atteinte',
        description: err?.message || 'Passez à l’offre Pro pour accepter sans limite.',
        color: 'warning',
      });
    } else {
      toast.add({ title: 'Erreur', description: err?.message || 'Impossible d’accepter', color: 'red' });
    }
    return false;
  } finally {
    delete processingOfferAction[termsKey];
  }
}

async function nurseRefuseOfferBatch(row: Extract<AppointmentListRow, { kind: 'batch' }>) {
  const termsKey = offerTermsKey(row);
  const apts = row.appointments.filter((a) => showNurseOfferCardActions(a));
  if (apts.length === 0) return;
  processingOfferAction[termsKey] = 'refuse';
  try {
    const results = await Promise.all(
      apts.map((apt) =>
        apiFetch(`/appointments/${apt.id}`, { method: 'PUT', body: { status: 'refused' } }),
      ),
    );
    const allSuccess = results.every((r: any) => r.success);
    if (!allSuccess) {
      toast.add({ title: 'Erreur', description: 'Impossible de refuser tout le lot.', color: 'red' });
      return;
    }
    const anyDeclined = results.some((r: any) => r.declined_offer);
    if (anyDeclined) {
      toast.add({
        title: 'Propositions retirées',
        description: 'Le lot reste en attente pour le patient.',
        color: 'neutral',
      });
    } else {
      toast.add({ title: 'Rendez-vous refusés', color: 'warning' });
    }
    listRefreshTrigger.value++;
    await fetchAppointments(true);
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err?.message || 'Impossible de refuser', color: 'red' });
  } finally {
    delete processingOfferAction[termsKey];
  }
}

async function nurseAcceptOffer(
  apt: any,
  opts?: { termsKey?: string; isBatch?: boolean },
): Promise<boolean> {
  const termsKey = opts?.termsKey ?? apt.id;
  processingOfferAction[termsKey] = 'accept';
  try {
    const shareTok =
      (typeof route.query.shareToken === 'string' && route.query.shareToken.trim() !== ''
        ? route.query.shareToken.trim()
        : '') ||
      shareTokenForAccept.value ||
      '';
    const body: Record<string, unknown> = { status: 'confirmed' };
    if (shareTok) body.share_token = shareTok;
    const res = await apiFetch(`/appointments/${apt.id}`, { method: 'PUT', body });
    if (res.success) {
      if (shareTok) shareTokenForAccept.value = null;
      toast.add({
        title: opts?.isBatch ? 'Lot multisoins accepté' : 'Rendez-vous accepté',
        color: 'green',
      });
      listRefreshTrigger.value++;
      await navigateTo(`/nurse/appointments/${apt.id}`);
      void fetchAppointments(true);
      return true;
    }
    toast.add({
      title: 'Erreur',
      description: (res as any).error || 'Impossible d’accepter ce rendez-vous.',
      color: 'red',
    });
    return false;
  } catch (err: any) {
    if (err?.code === 'PLAN_LIMIT' || (err?.message && /limite|offre Découverte/i.test(String(err.message)))) {
      toast.add({
        title: 'Limite atteinte',
        description: err?.message || 'Passez à l’offre Pro pour accepter sans limite.',
        color: 'warning',
      });
    } else {
      toast.add({ title: 'Erreur', description: err?.message || 'Impossible d’accepter', color: 'red' });
    }
    return false;
  } finally {
    delete processingOfferAction[termsKey];
  }
}

async function nurseRefuseOffer(apt: any, opts?: { termsKey?: string }) {
  const termsKey = opts?.termsKey ?? apt.id;
  processingOfferAction[termsKey] = 'refuse';
  try {
    const res = await apiFetch(`/appointments/${apt.id}`, { method: 'PUT', body: { status: 'refused' } });
    if (res.success) {
      if (res.declined_offer) {
        toast.add({
          title: 'Proposition retirée',
          description: 'Le rendez-vous reste en attente pour le patient.',
          color: 'neutral',
        });
      } else {
        toast.add({ title: 'Rendez-vous refusé', color: 'warning' });
      }
      listRefreshTrigger.value++;
      await fetchAppointments(true);
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err?.message || 'Impossible de refuser', color: 'red' });
  } finally {
    delete processingOfferAction[termsKey];
  }
}

watch([dateFilter, statusFilter, dateRangeStart, dateRangeEnd], () => {
  invalidateAdminCardCache();
  currentPage.value = 1;
  fetchAppointments();
});

watch([nurseListTab, nurseSegment], () => {
  if (props.basePath !== '/nurse') return;
  currentPage.value = 1;
  syncNurseQueryToUrl();
  fetchAppointments();
});

watch(currentPage, () => {
  fetchAppointments();
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

function canStart(appointment: any) {
  const now = new Date();
  const scheduled = new Date(appointment.scheduled_at);
  const diffMinutes = (scheduled.getTime() - now.getTime()) / (1000 * 60);
  return diffMinutes <= 30 && appointment.status === 'confirmed';
}

/** Pour nurse, lab, subaccount : masquer les données sensibles pour les offres pending reçues (pas si le viewer est le créateur). */
function shouldMaskSensitive(apt: any): boolean {
  const uid = user.value?.id;
  if (uid == null || uid === '') {
    return false;
  }
  return shouldPollList.value && isPendingIncomingOffer(apt, uid);
}

function maskString(val: string, visibleStart = 1, visibleEnd = 0): string {
  if (!val || typeof val !== 'string') return '••••••';
  const s = val.trim();
  if (s.length <= visibleStart + visibleEnd) return '••••••';
  const start = s.slice(0, visibleStart);
  const end = visibleEnd > 0 ? s.slice(-visibleEnd) : '';
  const mid = '•'.repeat(Math.min(6, s.length - visibleStart - visibleEnd));
  return start + mid + end;
}

function displayPatientName(apt: any): string {
  if (!apt) return '·';
  const full = appointmentPatientDisplayName(apt);
  if (!full) return '·';
  if (shouldMaskSensitive(apt)) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '••••••';
    if (parts.length === 1) return maskString(parts[0], 1, 0);
    return `${maskString(parts[0], 1, 0)} ${maskString(parts[parts.length - 1], 1, 0)}`.trim() || '••••••';
  }
  return full;
}

function displayAddress(apt: any): string {
  return appointmentListAddressLine(apt);
}

function isOfferProcessing(id: string, action: 'accept' | 'refuse'): boolean {
  return processingOfferAction[id] === action;
}

function isProcessing(id: string) {
  return processingOfferAction[id] !== undefined;
}

defineExpose({
  fetchAppointments,
  processingAppointments,
  canStart,
  isProcessing,
  loading,
});

watch(() => props.userIdFilter, () => {
  invalidateAdminCardCache();
  currentPage.value = 1;
  fetchAppointments();
});

/** Recherche = filtre client sur la page courante ; si on n’est pas en page 1, revenir à la page 1 (déclenche le fetch). */
watch(searchQuery, () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1;
  }
});

onMounted(() => {
  fetchAppointments();
  loadCareCategoriesForAppointmentList();
  if (shouldPollList.value) startListPolling();
});

onActivated(() => {
  fetchAppointments();
});
</script>