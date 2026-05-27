<template>
  <div class="min-h-[calc(100vh-4rem)] bg-app-canvas pb-32 dark:bg-gray-950">
    <div
      :class="[
        'mx-auto w-full max-w-5xl px-0 pt-3 pb-5 sm:px-6 sm:pt-4 sm:pb-6',
        !dashboardLayout && 'md:max-w-3xl',
      ]"
    >
      <!-- En-tête : aligné marges/titre avec RendezVousFormStep -->
      <header class="mb-4 px-4 text-left sm:mb-6 sm:px-0">
        <h1 class="text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl">
          {{ selectionTitle || 'Quels soins vous concernent ?' }}
        </h1>
        <p
          v-if="providerName"
          class="mt-2 text-sm text-gray-500 dark:text-gray-400"
        >
          Avec <span class="font-medium text-gray-700 dark:text-gray-300">{{ providerName }}</span>
        </p>
      </header>

      <div class="px-4 sm:px-0">
      <!-- Chargement : grille alignée sur la liste (1 col mobile, 2 cols à partir de md) -->
      <div
        v-if="loading"
        class="grid grid-cols-1 gap-2 sm:gap-2.5 md:grid-cols-2"
        aria-busy="true"
      >
        <div v-for="i in 7" :key="i" class="h-[4.5rem] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-900/80" />
      </div>

      <template v-else>
        <p
          v-if="showFilterTabs"
          class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
        >
          Par catégorie
        </p>
        <!-- Filtre horizontal swipe (Embla) : cartes façon iOS avec aperçu de la carte suivante -->
        <ClientOnly>
          <IosSwipeSegmentFilter
            v-if="showFilterTabs"
            v-model="filterPill"
            :tabs="filterTabs"
            deselect-to="all"
            aria-label="Filtrer par catégorie de soins"
          />
          <template #fallback>
            <div
              v-if="showFilterTabs"
              class="relative -mx-4 mb-8 sm:-mx-0 sm:mb-9"
              aria-hidden="true"
            >
              <div class="mx-4 h-[5.25rem] animate-pulse rounded-2xl bg-gray-100 sm:mx-0 dark:bg-gray-900/80" />
            </div>
          </template>
        </ClientOnly>

        <p
          class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          :class="showFilterTabs ? '-mt-1 sm:mt-0' : ''"
        >
          {{ careListSectionHeading }}
        </p>

        <!-- Liste : 1 carte par ligne ; seul le chip « Ajouter » ouvre les options (mini modal) ou retire le soin. -->
        <ul class="grid grid-cols-1 gap-1.5 sm:gap-2 md:grid-cols-2" role="list" aria-label="Liste des soins">
          <li v-for="item in filteredMainList" :key="item.id" class="list-none min-w-0" role="presentation">
            <div
              :ref="(el) => setCareCardEl(item.id, el)"
              class="group flex w-full min-h-[3rem] items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-[box-shadow,transform,background-color] duration-150 sm:gap-3 sm:px-3.5 sm:py-2.5"
              :class="
                isRowSelected(item.raw, item.id)
                  ? 'border border-primary-300/50 bg-primary-50/70 shadow-[0_2px_10px_rgba(28,199,181,0.12)] dark:border-primary-500/35 dark:bg-primary-950/25 dark:shadow-[0_2px_12px_rgba(28,199,181,0.08)]'
                  : 'border border-gray-100/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_14px_rgba(15,23,42,0.05)] hover:shadow-[0_2px_6px_rgba(15,23,42,0.06),0_8px_20px_rgba(15,23,42,0.07)] dark:border-gray-800/80 dark:bg-gray-950 dark:shadow-[0_2px_8px_rgba(0,0,0,0.35)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.45)]'
              "
            >
              <div
                class="care-add-flight-visual flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-gray-100/90 bg-gray-50/90 dark:border-gray-700/80 dark:bg-gray-900/60"
                aria-hidden="true"
              >
                <span
                  v-if="item.emoji"
                  class="select-none text-[1.25rem] leading-none"
                  role="img"
                >{{ item.emoji }}</span>
                <CareCategoryVisual
                  v-else
                  :emoji="item.emoji"
                  :image-src="item.imageSrc"
                  :icon-name="item.iconName"
                  :icon-color="item.iconColor"
                  emoji-class="text-[1.25rem] leading-none"
                  img-class="block max-h-full max-w-full object-contain"
                  icon-class="h-5 w-5 shrink-0"
                />
              </div>
              <p
                class="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight text-gray-900 dark:text-white sm:text-sm"
              >
                {{ item.label }}
              </p>
              <div class="shrink-0 self-center">
                <button
                  type="button"
                  class="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/80 focus-visible:ring-offset-2 rounded-full dark:focus-visible:ring-offset-gray-950"
                  :aria-pressed="isRowSelected(item.raw, item.id)"
                  :aria-label="
                    isRowSelected(item.raw, item.id)
                      ? `Retirer ${item.label} de la sélection`
                      : `Configurer et ajouter ${item.label}`
                  "
                  @click="onAjouterChipClick(item, $event)"
                >
                  <span
                    v-if="!isRowSelected(item.raw, item.id)"
                    class="pointer-events-none inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary-200/90 bg-primary-50/80 text-primary-700 transition-colors group-hover:border-primary-300 group-hover:bg-primary-50 dark:border-primary-500/30 dark:bg-primary-950/40 dark:text-primary-300"
                  >
                    <UIcon name="i-lucide-plus" class="h-4 w-4 shrink-0 opacity-90" />
                  </span>
                  <span
                    v-else
                    class="pointer-events-none inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary-400/60 bg-white text-primary-700 shadow-sm dark:border-primary-500/40 dark:bg-gray-900 dark:text-primary-300"
                  >
                    <UIcon name="i-lucide-check" class="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
                  </span>
                </button>
              </div>
            </div>
          </li>
        </ul>

        <p
          v-if="filteredMainList.length === 0"
          class="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400"
        >
          Aucun soin dans cette vue. Essayez un autre filtre.
        </p>
      </template>
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <RendezVousStickyFooter
        v-if="selectedServices.length > 0"
        :dashboard-layout="dashboardLayout"
        :show-back="false"
        primary-label="Continuer"
        :primary-submit="false"
        @primary="emit('continue')"
      >
        <template #leading>
          <div
            class="flex min-w-0 max-w-[min(100%,12rem)] items-center gap-2 sm:max-w-xs sm:gap-2"
            role="status"
            aria-live="polite"
            :aria-label="selectionStatusAria"
          >
            <span
              ref="cartBadgeEl"
              class="care-cart-count-badge relative flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-base font-bold tabular-nums leading-none tracking-tight text-white shadow-[0_1px_8px_-2px_rgba(16,185,129,0.4)] ring-1 ring-white/20 dark:ring-white/12"
            >
              {{ selectedServices.length }}
            </span>
            <div class="min-w-0 flex-1 text-left">
              <SelectedServicesCartSummary
                :headline="selectionHeadline"
                :selected-services="selectedServices"
                :categories="categories"
                :form-data-by-service="formDataByService"
                @remove-service="onRemoveServiceFromCart"
              />
            </div>
          </div>
        </template>
      </RendezVousStickyFooter>
    </Transition>

    <CareServiceQuickOptionsModal
      v-model="quickModalOpen"
      :category="quickModalCategory"
      :categories="categories ?? []"
      :only-category-options="quickModalOnlyCategoryOptions"
      :build-service-line="buildServiceLineForModal"
      @confirm="onQuickModalConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  buildAccentMapForSortedIds,
  getAccentFallback,
  isAutreCategoryLabel,
  resolveCareCategoryImageSrc,
  resolveCareIconFromCategory,
} from '~/utils/care-icons';
import {
  careCategoryEmojiForCategory,
  getBookingCareDisplayRank,
  isCareCategoryEmoji,
} from '@oneandlab/shared-utils';
import { isBloodTestAppointment, isNursingAppointment } from '~/utils/appointment-type-rules';
import {
  bloodServicesInSelection,
  nursingServicesInSelection,
  type SelectedServiceInput,
} from '~/utils/dashboard-unified-rdv';
import type { BookingServiceFormSlice } from '~/utils/booking-service-form-slice';
import CareServiceQuickOptionsModal from '~/components/rendez-vous/CareServiceQuickOptionsModal.vue';
import type { QuickModalCategoryRow } from '~/components/rendez-vous/CareServiceQuickOptionsModal.vue';
import {
  catalogSegmentThemeForKey,
  FALLBACK_SEGMENT_THEME,
  type CatalogSegmentTabTheme,
} from '~/utils/catalog-segment-tab-theme';
import SelectedServicesCartSummary from '~/components/rendez-vous/SelectedServicesCartSummary.vue';
import { normalizeCategorySkipPrescriptionDocuments } from '~/utils/category-skip-prescription-documents';

export type CareCategoryRow = {
  id: string;
  name: string;
  description?: string;
  type: string;
  icon?: string | null;
  image_url?: string | null;
  appointment_count?: number;
  /** Groupe catalogue (migration 058) : examens, soins, suivi, hygiene, prevention, divers, … */
  catalog_group?: string | null;
  /** Masquer ordonnance + autre prescription (admin). */
  skip_prescription_documents?: unknown;
  options?: Array<{
    option_key: string;
    label: string;
    field_type: string;
    options?: { value: string; label: string }[];
    is_required?: boolean;
    sort_order?: number;
  }>;
};

type CareItem = {
  id: string;
  label: string;
  catalogGroup: string;
  emoji: string;
  iconName: string;
  imageSrc: string | null;
  iconColor: string;
  appointmentCount: number;
  raw: CareCategoryRow | FallbackRow;
};

type FallbackRow = { id: string; name: string; type: string; icon: string; appointment_count: number };

const props = withDefaults(
  defineProps<{
    categories: CareCategoryRow[];
    loading?: boolean;
    providerName?: string | null;
    restrictCategoryTypes?: ('blood_test' | 'nursing')[];
    /**
     * Une seule fois depuis l’URL (`?type=blood_test` | `?type=nursing`) : pré-filtre la liste par type métier
     * (sans remplir le panier). Les libellés d’onglets viennent de `catalog_group` côté données.
     */
    initialCareFilterTab?: 'all' | 'analyses' | 'domicile';
    selectionTitle?: string;
    dashboardLayout?: boolean;
    /** Données options mini-modal (étape 0) — pour résumé / modal panier. */
    formDataByService?: Record<string, BookingServiceFormSlice | undefined> | null;
  }>(),
  {
    loading: false,
    providerName: null,
    restrictCategoryTypes: undefined,
    initialCareFilterTab: undefined,
    selectionTitle: undefined,
    dashboardLayout: false,
    formDataByService: undefined,
  },
);

const emit = defineEmits<{
  continue: [];
  quickAddService: [payload: { service: SelectedServiceInput; slice: BookingServiceFormSlice }];
  removeServiceFromCart: [serviceId: string];
}>();

const selectedServices = defineModel<SelectedServiceInput[]>('selectedServices', { required: true });

const selectionHeadline = computed(() => {
  const n = selectedServices.value.length;
  if (n <= 1) return 'Soin sélectionné';
  return 'Soins sélectionnés';
});

const selectionStatusAria = computed(() => {
  const n = selectedServices.value.length;
  if (n <= 0) return 'Aucun soin sélectionné.';
  if (n === 1) return 'Un soin sélectionné. Ouvrez pour voir le détail ou retirer du panier.';
  return `${n} soins sélectionnés. Ouvrez pour les détails ou en retirer.`;
});

function onRemoveServiceFromCart(serviceId: string): void {
  emit('removeServiceFromCart', serviceId);
}

const quickModalOpen = ref(false);
const quickModalCategory = ref<CareCategoryRow | null>(null);
const quickModalOnlyCategoryOptions = ref(false);

const cartBadgeEl = ref<HTMLElement | null>(null);
const careCardEls = new Map<string, HTMLElement>();

function setCareCardEl(id: string, el: unknown) {
  const k = String(id);
  if (el == null) {
    careCardEls.delete(k);
    return;
  }
  if (el instanceof HTMLElement) careCardEls.set(k, el);
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const FLIGHT_DURATION_MS = 1000;

function bumpCartBadge(): void {
  const badge = cartBadgeEl.value;
  if (!badge) return;
  badge.classList.remove('care-cart-badge-catch');
  void badge.offsetWidth;
  badge.classList.add('care-cart-badge-catch');
  window.setTimeout(() => badge.classList.remove('care-cart-badge-catch'), 960);
}

/** Fantôme = vignette (image / icône) qui rejoint le badge panier ; la carte garde le wisp. */
function playAddToCartMotion(cardEl: HTMLElement | undefined): void {
  if (typeof document === 'undefined') return;
  if (!cardEl) {
    bumpCartBadge();
    return;
  }

  const visualEl = cardEl.querySelector('.care-add-flight-visual') as HTMLElement | null;
  const sourceEl = visualEl ?? cardEl;

  if (prefersReducedMotion()) {
    cardEl.classList.add('care-card-add-wisp');
    window.setTimeout(() => cardEl.classList.remove('care-card-add-wisp'), 380);
    bumpCartBadge();
    return;
  }

  const badge = cartBadgeEl.value;
  const from = sourceEl.getBoundingClientRect();
  let targetX = from.left + from.width / 2;
  let targetY = from.top + from.height / 2;
  if (badge) {
    const br = badge.getBoundingClientRect();
    targetX = br.left + br.width / 2;
    targetY = br.top + br.height / 2;
  } else {
    targetX = window.innerWidth - 40;
    targetY = window.innerHeight - 28;
  }
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  const dx = targetX - cx;
  const dy = targetY - cy;
  const badgeApprox = 28;
  const endScale = Math.min(badgeApprox / from.width, badgeApprox / from.height, 0.55);

  const ghost = document.createElement('div');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.className = 'care-add-flight-ghost care-add-flight-ghost--thumb';
  ghost.style.left = `${from.left}px`;
  ghost.style.top = `${from.top}px`;
  ghost.style.width = `${from.width}px`;
  ghost.style.height = `${from.height}px`;

  try {
    const clone = sourceEl.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.style.pointerEvents = 'none';
    clone.style.width = '100%';
    clone.style.height = '100%';
    ghost.appendChild(clone);
  } catch {
    /* cloneNode rarement en échec */
  }

  document.body.appendChild(ghost);

  cardEl.classList.add('care-card-add-wisp');
  window.setTimeout(() => cardEl.classList.remove('care-card-add-wisp'), FLIGHT_DURATION_MS + 80);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ghost.style.setProperty('--care-flight-dx', `${dx}px`);
      ghost.style.setProperty('--care-flight-dy', `${dy}px`);
      ghost.style.setProperty('--care-flight-scale', String(endScale));
      ghost.classList.add('care-add-flight-ghost--active');
    });
  });

  window.setTimeout(() => {
    ghost.remove();
    bumpCartBadge();
  }, FLIGHT_DURATION_MS + 16);
}

function runAddToCartAnimation(listRowId: string): void {
  void nextTick(() => {
    const waitForFooter = selectedServices.value.length === 1;
    const delayMs = waitForFooter ? 130 : 0;
    window.setTimeout(() => {
      const node = careCardEls.get(String(listRowId));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => playAddToCartMotion(node));
      });
    }, delayMs);
  });
}

/** Onglet segment : `all` ou clé `catalog_group` (examens, soins, …). */
const filterPill = ref<string>('all');

/** Pré-filtre type métier depuis `?type=` (consommé une fois). */
const typeFromUrl = ref<null | 'blood_test' | 'nursing'>(null);

const initialCareFilterConsumed = ref(false);
watch(
  () => props.initialCareFilterTab,
  (v) => {
    if (initialCareFilterConsumed.value) return;
    if (v === 'analyses') {
      typeFromUrl.value = 'blood_test';
      initialCareFilterConsumed.value = true;
    } else if (v === 'domicile') {
      typeFromUrl.value = 'nursing';
      initialCareFilterConsumed.value = true;
    }
  },
  { immediate: true },
);

/** Ordre d’affichage des onglets (aligné migration 058 + UX). */
const CATALOG_GROUP_ORDER = ['examens', 'soins', 'suivi', 'hygiene', 'prevention', 'divers'] as const;

/** Onglets nursing toujours proposés dès qu’au moins une catégorie infirmière est dans la vue (même segment vide). */
const NURSING_CATALOG_TAB_KEYS = ['soins', 'suivi', 'hygiene', 'prevention', 'divers'] as const;

function labelForUnknownCatalogGroup(key: string): string {
  if (!key) return key;
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function sortCatalogGroupKeys(keys: string[]): string[] {
  const order = CATALOG_GROUP_ORDER;
  return [...keys].sort((a, b) => {
    const ia = order.indexOf(a as (typeof order)[number]);
    const ib = order.indexOf(b as (typeof order)[number]);
    const sa = ia === -1 ? 999 : ia;
    const sb = ib === -1 ? 999 : ib;
    if (sa !== sb) return sa - sb;
    const la = catalogSegmentThemeForKey(a)?.label ?? labelForUnknownCatalogGroup(a);
    const lb = catalogSegmentThemeForKey(b)?.label ?? labelForUnknownCatalogGroup(b);
    return la.localeCompare(lb, 'fr', { sensitivity: 'base' });
  });
}

function resolveCatalogGroup(cat: CareCategoryRow | FallbackRow): string {
  const row = cat as CareCategoryRow & { catalogGroup?: string };
  const snake = row.catalog_group != null && String(row.catalog_group).trim() !== '' ? String(row.catalog_group).trim().toLowerCase() : '';
  if (snake) return snake;
  const camel = row.catalogGroup != null && String(row.catalogGroup).trim() !== '' ? String(row.catalogGroup).trim().toLowerCase() : '';
  if (camel) return camel;
  if (cat.type === 'blood_test') return 'examens';
  /* Sans `catalog_group` en BDD : ne pas tout regrouper sous « soins » (masque suivi / hygiène / etc.). */
  return 'divers';
}

const config = useRuntimeConfig();

const categoryIdsForAccent = computed((): string[] => {
  if (props.categories.length > 0) {
    return props.categories.map((c) => c.id);
  }
  if (!props.loading && props.categories.length === 0) {
    return ['blood_test', 'nursing'];
  }
  return [];
});

const idAccentMap = computed(() => {
  const sorted = [...new Set(categoryIdsForAccent.value)].sort((a, b) => a.localeCompare(b, 'fr'));
  return buildAccentMapForSortedIds(sorted);
});

const useFallback = computed(() => !props.loading && props.categories.length === 0);

const allItems = computed((): CareItem[] => {
  const map = idAccentMap.value;
  const accentFor = (id: string) => map.get(id) ?? getAccentFallback();

  if (useFallback.value) {
    const mockCounts = [128, 96];
    const rows: Array<{
      id: string;
      label: string;
      catalogGroup: string;
      iconName: string;
      imageSrc: null;
      type: string;
    }> = [
      {
        id: 'blood_test',
        label: 'Prélèvement',
        catalogGroup: 'examens',
        iconName: 'i-lucide-droplet',
        imageSrc: null,
        type: 'blood_test',
      },
      {
        id: 'nursing',
        label: 'Soins infirmiers',
        catalogGroup: 'soins',
        iconName: 'i-lucide-heart-pulse',
        imageSrc: null,
        type: 'nursing',
      },
    ];
    return rows.map((row, i) => {
      const accent = accentFor(row.id);
      return {
        id: row.id,
        label: row.label,
        catalogGroup: row.catalogGroup,
        emoji: careCategoryEmojiForCategory({ name: row.label, icon: row.iconName, type: row.type }),
        iconName: row.iconName,
        imageSrc: row.imageSrc,
        iconColor: accent.iconColor,
        appointmentCount: mockCounts[i] ?? 0,
        raw: {
          id: row.id,
          name: row.label,
          type: row.type,
          icon: row.iconName,
          appointment_count: mockCounts[i] ?? 0,
        },
      };
    });
  }
  return props.categories.map((cat) => {
    const catalogGroup = resolveCatalogGroup(cat);
    const accent = accentFor(cat.id);
    return {
      id: cat.id,
      label: cat.name,
      catalogGroup,
      emoji: careCategoryEmojiForCategory({ name: cat.name, icon: cat.icon, type: cat.type }),
      iconName: resolveCareIconFromCategory(cat),
      imageSrc: isCareCategoryEmoji(cat.icon)
        ? null
        : resolveCareCategoryImageSrc(cat.image_url ?? null, config.public.apiBase),
      iconColor: accent.iconColor,
      appointmentCount: Number(cat.appointment_count ?? 0),
      raw: cat,
    };
  });
});

function bookingRankForCareItem(item: CareItem): number {
  const raw = item.raw as CareCategoryRow | FallbackRow;
  return getBookingCareDisplayRank({
    name: raw.name,
    label: item.label,
    type: raw.type,
  });
}

const sortedFullList = computed(() => {
  const list = [...allItems.value];
  list.sort((a, b) => {
    const ra = bookingRankForCareItem(a);
    const rb = bookingRankForCareItem(b);
    if (ra !== rb) return ra - rb;
    return a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' });
  });
  return list;
});

function itemMatchesRestrict(item: CareItem): boolean {
  const r = props.restrictCategoryTypes;
  if (!r?.length) return true;
  if (useFallback.value) {
    const fb = item.raw as FallbackRow;
    return r.includes(fb.type as 'blood_test' | 'nursing');
  }
  const cat = item.raw as CareCategoryRow;
  return r.includes(cat.type as 'blood_test' | 'nursing');
}

const sortedFullListRestricted = computed(() => sortedFullList.value.filter(itemMatchesRestrict));

/** Liste après restrict + pré-filtre URL `?type=`. */
const baseListAfterTypeUrl = computed(() => {
  let list = sortedFullListRestricted.value;
  const u = typeFromUrl.value;
  if (!u) return list;
  return list.filter((item) => {
    const t = useFallback.value ? (item.raw as FallbackRow).type : (item.raw as CareCategoryRow).type;
    return t === u;
  });
});

function itemRowType(item: CareItem): string {
  return useFallback.value ? (item.raw as FallbackRow).type : (item.raw as CareCategoryRow).type;
}

const uniqueCatalogGroupKeys = computed(() => {
  const set = new Set<string>();
  for (const item of baseListAfterTypeUrl.value) {
    set.add(item.catalogGroup);
  }
  return sortCatalogGroupKeys([...set]);
});

/** Clés d’onglets : groupes réellement présents + ensemble canonique si la vue mélange sang / soins. */
const segmentKeysForTabs = computed(() => {
  const u = baseListAfterTypeUrl.value;
  const hasBlood = u.some((item) => itemRowType(item) === 'blood_test');
  const hasNursing = u.some((item) => itemRowType(item) === 'nursing');
  const keys = new Set<string>(uniqueCatalogGroupKeys.value);
  if (hasBlood) keys.add('examens');
  if (hasNursing) {
    for (const g of NURSING_CATALOG_TAB_KEYS) keys.add(g);
  }
  return sortCatalogGroupKeys([...keys]);
});

const showFilterTabs = computed(
  () => !(props.restrictCategoryTypes?.length === 1) && segmentKeysForTabs.value.length > 1,
);

function tabRowFromTheme(
  theme: CatalogSegmentTabTheme,
  value: string,
  labelOverride?: string,
  subLabel?: string,
) {
  return {
    value,
    label: labelOverride ?? theme.label,
    ...(subLabel ? { subLabel } : {}),
    iconSrc: theme.iconSrc,
    icon: theme.icon,
    cardIdle: theme.cardIdle,
    cardActive: theme.cardActive,
    iconIdle: theme.iconIdle,
    iconActive: theme.iconActive,
  };
}

const filterTabs = computed(() => {
  const keys = segmentKeysForTabs.value;
  return keys.map((key) => {
    const t = catalogSegmentThemeForKey(key);
    if (t) return tabRowFromTheme(t, key);
    return tabRowFromTheme(FALLBACK_SEGMENT_THEME, key, labelForUnknownCatalogGroup(key));
  });
});

/** Titre au-dessus de la grille de soins (« Tous les soins » ou nom du segment actif). */
const careListSectionHeading = computed(() => {
  if (!showFilterTabs.value) return 'Tous les soins';
  if (filterPill.value === 'all') return 'Tous les soins';
  const tab = filterTabs.value.find((t) => t.value === filterPill.value);
  return tab?.label ? String(tab.label) : 'Soins';
});

watch(
  [segmentKeysForTabs, filterPill],
  () => {
    if (filterPill.value === 'all') return;
    if (!segmentKeysForTabs.value.includes(filterPill.value)) {
      filterPill.value = 'all';
    }
  },
  { flush: 'post' },
);

const filteredMainList = computed(() => {
  let list = baseListAfterTypeUrl.value;
  if (showFilterTabs.value && filterPill.value !== 'all') {
    list = list.filter((i) => i.catalogGroup === filterPill.value);
  }
  return list;
});

function newServiceInstanceId(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `svc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function catalogIdForRaw(raw: CareItem['raw']): string | null {
  if (useFallback.value) return (raw as FallbackRow).id;
  return (raw as CareCategoryRow).id;
}

/** Au moins une entrée panier rattache cette `care_categories.id`. */
function isCatalogCategorySelected(categoryId: string | null): boolean {
  if (categoryId == null || String(categoryId).trim() === '') return false;
  const key = String(categoryId);
  return selectedServices.value.some((s) => String(s.category_id ?? '') === key);
}

/** Ligne grille : checklist si la catégorie métier ou le fallback générique figure au panier. */
function isRowSelected(raw: CareItem['raw'], fallbackListId: string): boolean {
  if (useFallback.value) return selectedServices.value.some((s) => s.id === fallbackListId);
  const cid = catalogIdForRaw(raw);
  return cid != null ? isCatalogCategorySelected(cid) : false;
}

function categoryLineFromCatalog(cat: CareCategoryRow): SelectedServiceInput {
  const line: SelectedServiceInput = {
    id: newServiceInstanceId(),
    type: cat.type,
    name: cat.name,
    category_id: cat.id,
    icon: cat.icon && String(cat.icon).trim() !== '' ? String(cat.icon) : resolveCareIconFromCategory(cat),
    category_image_url: isCareCategoryEmoji(cat.icon) ? null : (cat.image_url ?? null),
  };
  if (normalizeCategorySkipPrescriptionDocuments(cat.skip_prescription_documents)) {
    line.skip_prescription_documents = true;
  }
  return line;
}

function categoryOptionsLength(catId: string): number {
  const cat = props.categories?.find((c) => String(c.id) === String(catId));
  const opts = cat?.options;
  return Array.isArray(opts) ? opts.length : 0;
}

/** 2ᵉ prélèvement ou 2ᵉ soin infirmier : champs communs déjà saisis sur le 1ᵉʳ acte. */
function onlyCategoryOptionsForCandidate(cat: CareCategoryRow): boolean {
  const sel = selectedServices.value;
  if (isBloodTestAppointment(cat.type)) {
    return bloodServicesInSelection(sel).length > 0;
  }
  if (isNursingAppointment(cat.type)) {
    return nursingServicesInSelection(sel).length > 0;
  }
  return false;
}

/** Après ajout au panier : revenir sur « Tous les soins » pour ne pas rester sur un segment filtré. */
function resetCategoryFilterToAll(): void {
  filterPill.value = 'all';
}

function attemptCatalogAdd(cat: CareCategoryRow): void {
  const addonOnly = onlyCategoryOptionsForCandidate(cat);
  if (addonOnly && categoryOptionsLength(cat.id) === 0) {
    const service = categoryLineFromCatalog(cat);
    emit('quickAddService', { service, slice: {} });
    resetCategoryFilterToAll();
    runAddToCartAnimation(String(cat.id));
    return;
  }
  quickModalCategory.value = cat;
  quickModalOnlyCategoryOptions.value = addonOnly;
  quickModalOpen.value = true;
}

function removeCatalogCategory(cat: CareCategoryRow): void {
  const catKey = String(cat.id);
  selectedServices.value = selectedServices.value.filter((s) => String(s.category_id ?? '') !== catKey);
}

function buildServiceLineForModal(cat: QuickModalCategoryRow): SelectedServiceInput {
  return categoryLineFromCatalog(cat as CareCategoryRow);
}

function onQuickModalConfirm(payload: { service: SelectedServiceInput; slice: BookingServiceFormSlice }): void {
  const rowId = quickModalCategory.value?.id ?? payload.service.category_id;
  emit('quickAddService', payload);
  resetCategoryFilterToAll();
  if (rowId != null && String(rowId).trim() !== '') {
    runAddToCartAnimation(String(rowId));
  } else {
    bumpCartBadge();
  }
}

function onAjouterChipClick(item: CareItem, event: MouseEvent): void {
  const raw = item.raw;
  if (useFallback.value) {
    const fb = raw as FallbackRow;
    const idx = selectedServices.value.findIndex((s) => s.id === fb.id);
    if (idx >= 0) {
      selectedServices.value = selectedServices.value.filter((s) => s.id !== fb.id);
    } else {
      selectedServices.value = [
        ...selectedServices.value,
        {
          id: fb.id,
          type: fb.type,
          name: fb.name,
          category_id: null,
          icon: fb.icon,
        },
      ];
      resetCategoryFilterToAll();
      runAddToCartAnimation(fb.id);
    }
    return;
  }

  const cat = raw as CareCategoryRow;
  const catKey = String(cat.id);
  const selected = isRowSelected(raw, item.id);

  if (selected) {
    if (event.altKey && isBloodTestAppointment(cat.type) && isCatalogCategorySelected(catKey)) {
      event.preventDefault();
      attemptCatalogAdd(cat);
      return;
    }
    removeCatalogCategory(cat);
    return;
  }

  attemptCatalogAdd(cat);
}
</script>

<style>
/* Animation globale : clone sous body, hors scope du composant */
.care-add-flight-ghost {
  position: fixed;
  z-index: 200;
  pointer-events: none;
  box-sizing: border-box;
  border-radius: 0.5rem;
  border: 2px solid rgba(16, 185, 129, 0.55);
  background: rgba(255, 255, 255, 0.82);
  box-shadow:
    0 12px 36px -10px rgba(16, 185, 129, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  transform-origin: center center;
  transform: translate(0, 0) scale(1);
  opacity: 0.92;
  transition: none;
  will-change: transform, opacity, filter;
}
html.dark .care-add-flight-ghost {
  background: rgba(17, 24, 39, 0.88);
  box-shadow:
    0 12px 36px -10px rgba(16, 185, 129, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset;
}

/* Vignette clonée (image / icône), pas le cadre carte */
.care-add-flight-ghost--thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  border: none;
  background: transparent;
  box-shadow: none;
  filter: drop-shadow(0 8px 20px rgba(16, 185, 129, 0.4));
}
html.dark .care-add-flight-ghost--thumb {
  background: transparent;
  border: none;
  box-shadow: none;
  filter: drop-shadow(0 8px 22px rgba(16, 185, 129, 0.32));
}

.care-add-flight-ghost--active {
  transition:
    transform 1s cubic-bezier(0.22, 0.92, 0.32, 1),
    opacity 1s cubic-bezier(0.35, 0, 0.2, 1),
    filter 1s ease-out;
  transform: translate(var(--care-flight-dx, 0px), var(--care-flight-dy, 0px)) scale(var(--care-flight-scale, 0.15));
  opacity: 0;
  filter: blur(4px) saturate(0.85);
}
.care-add-flight-ghost--thumb.care-add-flight-ghost--active {
  filter: drop-shadow(0 2px 8px rgba(16, 185, 129, 0.12)) blur(5px) saturate(0.8);
}

@keyframes care-card-add-wisp {
  0% {
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
  }
  35% {
    opacity: 0.38;
    filter: blur(3px);
    transform: scale(0.96);
  }
  100% {
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
  }
}
.care-card-add-wisp {
  animation: care-card-add-wisp 0.85s cubic-bezier(0.4, 0, 0.2, 1);
}

/* À l’arrivée de la vignette : le cercle « absorbe » puis rebondit + onde */
@keyframes care-cart-badge-catch {
  0% {
    transform: scale(1);
    box-shadow:
      0 1px 8px -2px rgba(16, 185, 129, 0.4),
      0 0 0 0 rgba(16, 185, 129, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.2);
  }
  22% {
    transform: scale(0.82);
    box-shadow:
      0 2px 14px -2px rgba(16, 185, 129, 0.55),
      0 0 0 3px rgba(16, 185, 129, 0.38),
      0 0 0 1px rgba(255, 255, 255, 0.25);
  }
  48% {
    transform: scale(1.24);
    box-shadow:
      0 6px 24px -6px rgba(16, 185, 129, 0.5),
      0 0 0 14px rgba(16, 185, 129, 0),
      0 0 0 1px rgba(255, 255, 255, 0.3);
  }
  68% {
    transform: scale(0.92);
    box-shadow:
      0 2px 12px -3px rgba(16, 185, 129, 0.45),
      0 0 0 5px rgba(16, 185, 129, 0.07),
      0 0 0 1px rgba(255, 255, 255, 0.18);
  }
  100% {
    transform: scale(1);
    box-shadow:
      0 1px 8px -2px rgba(16, 185, 129, 0.4),
      0 0 0 0 transparent,
      0 0 0 1px rgba(255, 255, 255, 0.2);
  }
}
.care-cart-badge-catch {
  animation: care-cart-badge-catch 0.9s cubic-bezier(0.34, 1.12, 0.45, 1);
}

@keyframes care-cart-badge-catch-dark {
  0% {
    transform: scale(1);
    box-shadow:
      0 1px 8px -2px rgba(16, 185, 129, 0.35),
      0 0 0 0 rgba(52, 211, 153, 0.45),
      0 0 0 1px rgba(255, 255, 255, 0.1);
  }
  22% {
    transform: scale(0.82);
    box-shadow:
      0 2px 14px -2px rgba(16, 185, 129, 0.45),
      0 0 0 3px rgba(52, 211, 153, 0.32),
      0 0 0 1px rgba(255, 255, 255, 0.12);
  }
  48% {
    transform: scale(1.24);
    box-shadow:
      0 6px 24px -6px rgba(16, 185, 129, 0.42),
      0 0 0 14px rgba(52, 211, 153, 0),
      0 0 0 1px rgba(255, 255, 255, 0.14);
  }
  68% {
    transform: scale(0.92);
    box-shadow:
      0 2px 12px -3px rgba(16, 185, 129, 0.38),
      0 0 0 5px rgba(52, 211, 153, 0.06),
      0 0 0 1px rgba(255, 255, 255, 0.1);
  }
  100% {
    transform: scale(1);
    box-shadow:
      0 1px 8px -2px rgba(16, 185, 129, 0.35),
      0 0 0 0 transparent,
      0 0 0 1px rgba(255, 255, 255, 0.1);
  }
}
html.dark .care-cart-count-badge.care-cart-badge-catch {
  animation: care-cart-badge-catch-dark 0.9s cubic-bezier(0.34, 1.12, 0.45, 1);
}
.dark .care-cart-count-badge.care-cart-badge-catch {
  animation: care-cart-badge-catch-dark 0.9s cubic-bezier(0.34, 1.12, 0.45, 1);
}

</style>
