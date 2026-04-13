<template>
  <div class="min-h-[calc(100vh-4rem)] bg-gray-50 pb-28">
    <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <!-- Titre d’étape uniquement : le header global (logo, nav, avatar) vient du layout patient -->
      <header class="mb-6 text-left">
        <h1 class="text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          {{ selectionTitle || 'Quels soins vous concernent ?' }}
        </h1>
        <p v-if="providerName" class="mt-1 text-sm font-medium text-primary-600 dark:text-primary-400">
          Rendez-vous avec {{ providerName }}
        </p>
      </header>

      <!-- Recherche -->
      <div class="relative mb-6">
        <UIcon
          name="i-lucide-search"
          class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
        />
        <input
          v-model="searchQuery"
          type="search"
          autocomplete="off"
          placeholder="Rechercher un soin…"
          class="w-full rounded-2xl border border-gray-200/90 bg-white py-3.5 pl-12 pr-4 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15 sm:text-lg"
        />
      </div>

      <!-- Chargement -->
      <div v-if="loading" class="space-y-4">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div v-for="i in 4" :key="i" class="h-36 animate-pulse rounded-2xl bg-gray-200/90" />
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div v-for="i in 6" :key="'s' + i" class="h-[4.75rem] animate-pulse rounded-2xl bg-gray-200/90" />
        </div>
      </div>

      <template v-else>
        <!-- Les plus demandés (cartes centrées, type appli de santé) -->
        <section v-if="showTopSection" class="mb-6">
          <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Les plus demandés
          </h2>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              v-for="item in topFour"
              :key="'top-' + item.id"
              type="button"
              class="group flex h-36 flex-col items-center justify-center gap-3 rounded-2xl border bg-white p-4 text-center shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition hover:shadow-md"
              :class="
                isSelected(item.id)
                  ? 'border-2 border-blue-600 shadow-[0_2px_8px_rgba(37,99,235,0.12)]'
                  : 'border border-transparent shadow-gray-200/80'
              "
              @click="toggleItem(item.raw)"
            >
              <div
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition"
                :style="{ backgroundColor: item.tileBg }"
              >
                <UIcon :name="item.iconName" class="h-7 w-7" :style="{ color: item.iconColor }" />
              </div>
              <span class="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">{{ item.label }}</span>
            </button>
          </div>
        </section>

        <!-- Filtres : segment control compact (barre grise + pastille blanche active) -->
        <div
          v-if="showFilterTabs"
          class="mb-5 flex w-full gap-0.5 rounded-full bg-gray-100/95 p-1 ring-1 ring-gray-200/60"
          role="tablist"
          aria-label="Filtrer les soins"
        >
          <button
            v-for="tab in filterTabs"
            :key="tab.value"
            type="button"
            role="tab"
            :aria-selected="filterPill === tab.value"
            class="min-h-10 flex-1 min-w-0 rounded-full px-2 py-2 text-center text-sm transition-colors duration-200 sm:px-3"
            :class="
              filterPill === tab.value
                ? 'bg-white font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200/70'
                : 'font-medium text-gray-600 hover:text-gray-900'
            "
            @click="filterPill = tab.value"
          >
            <span class="block truncate">{{ tab.label }}</span>
          </button>
        </div>

        <!-- Grille principale : 2 colonnes, titre + sous-titre + radio -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            v-for="item in filteredMainList"
            :key="item.id"
            type="button"
            class="group flex min-h-[4.75rem] w-full items-center gap-3 rounded-2xl border bg-white p-3.5 pr-4 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition hover:shadow-md"
            :class="
              isSelected(item.id)
                ? 'border-2 border-blue-600 shadow-[0_2px_8px_rgba(37,99,235,0.1)]'
                : 'border border-transparent shadow-gray-200/70'
            "
            @click="toggleItem(item.raw)"
          >
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition"
              :style="{ backgroundColor: item.tileBg }"
            >
              <UIcon :name="item.iconName" class="h-6 w-6" :style="{ color: item.iconColor }" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold leading-tight text-gray-900">{{ item.label }}</p>
              <p class="mt-0.5 text-xs text-gray-500">{{ categorySubtitle(item.category) }}</p>
            </div>
            <span
              class="relative flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition"
              :class="
                isSelected(item.id)
                  ? 'border-blue-600 bg-white'
                  : 'border-gray-300 bg-white'
              "
              aria-hidden="true"
            >
              <span
                v-if="isSelected(item.id)"
                class="h-2.5 w-2.5 rounded-full bg-blue-600"
              />
            </span>
          </button>
        </div>

        <p v-if="!loading && filteredMainList.length === 0" class="py-8 text-center text-sm text-gray-500">
          Aucun soin ne correspond à votre recherche.
        </p>
      </template>
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
          <p class="text-center text-sm leading-snug text-gray-700 dark:text-gray-300 sm:text-left">
            <span class="text-gray-600 dark:text-gray-400">Sélection :</span>
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ selectedServices.length }} soin{{ selectedServices.length > 1 ? 's' : '' }}
            </span>
          </p>
        </template>
      </RendezVousStickyFooter>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  buildAccentMapForSortedIds,
  getAccentFallback,
  isAutreCategoryLabel,
  resolveCareIconFromCategory,
} from '~/utils/care-icons';

export type SelectedService = {
  id: string;
  type: string;
  name: string;
  category_id: string | null;
  icon?: string;
};

export type CareCategoryRow = {
  id: string;
  name: string;
  description?: string;
  type: string;
  icon?: string | null;
  appointment_count?: number;
};

type CareItem = {
  id: string;
  label: string;
  category: 'analyses' | 'domicile';
  iconName: string;
  /** Teintes HSL uniques par catégorie (répartition sur le cercle, pas de doublon) */
  iconColor: string;
  tileBg: string;
  appointmentCount: number;
  raw: CareCategoryRow | FallbackRow;
};

type FallbackRow = { id: string; name: string; type: string; icon: string; appointment_count: number };

const props = withDefaults(
  defineProps<{
    categories: CareCategoryRow[];
    loading?: boolean;
    providerName?: string | null;
    /** Espace pro / lab / infirmier : limiter aux types affichés (ex. uniquement soins infirmiers). */
    restrictCategoryTypes?: ('blood_test' | 'nursing')[];
    /** Titre de l’étape (ex. espace pro connecté). */
    selectionTitle?: string;
    /** Barre d’action fixe alignée sur la zone contenu (sidebar dashboard md+). */
    dashboardLayout?: boolean;
  }>(),
  {
    loading: false,
    providerName: null,
    restrictCategoryTypes: undefined,
    selectionTitle: undefined,
    dashboardLayout: false,
  }
);

const emit = defineEmits<{
  continue: [];
}>();

const selectedServices = defineModel<SelectedService[]>('selectedServices', { required: true });

const searchQuery = ref('');
const filterPill = ref<'all' | 'analyses' | 'domicile'>('all');

function categorySubtitle(category: CareItem['category']): string {
  return category === 'analyses' ? 'Prélèvement' : 'Soins infirmiers';
}

/** Ids triés → une teinte HSL distincte par rang (aucune réutilisation sur l’écran courant) */
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
    const rows: Array<{ id: string; label: string; category: CareItem['category']; iconName: string; type: string }> = [
      { id: 'blood_test', label: 'Prise de sang', category: 'analyses', iconName: 'i-lucide-droplet', type: 'blood_test' },
      { id: 'nursing', label: 'Soins infirmiers', category: 'domicile', iconName: 'i-lucide-heart-pulse', type: 'nursing' },
    ];
    return rows.map((row, i) => {
      const accent = accentFor(row.id);
      return {
        id: row.id,
        label: row.label,
        category: row.category,
        iconName: row.iconName,
        iconColor: accent.iconColor,
        tileBg: accent.tileBg,
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
    const category: CareItem['category'] = cat.type === 'blood_test' ? 'analyses' : 'domicile';
    const accent = accentFor(cat.id);
    return {
      id: cat.id,
      label: cat.name,
      category,
      iconName: resolveCareIconFromCategory(cat),
      iconColor: accent.iconColor,
      tileBg: accent.tileBg,
      appointmentCount: Number(cat.appointment_count ?? 0),
      raw: cat,
    };
  });
});

/** Liste complète triée : « Autre » toujours en dernier */
const sortedFullList = computed(() => {
  const list = [...allItems.value];
  list.sort((a, b) => {
    const aAutre = isAutreCategoryLabel(a.label) ? 1 : 0;
    const bAutre = isAutreCategoryLabel(b.label) ? 1 : 0;
    if (aAutre !== bAutre) return aAutre - bAutre;
    if (b.appointmentCount !== a.appointmentCount) return b.appointmentCount - a.appointmentCount;
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

/** Après filtre rôle (lab = prises de sang, infirmier = soins, etc.) */
const sortedFullListRestricted = computed(() => sortedFullList.value.filter(itemMatchesRestrict));

const showFilterTabs = computed(() => !(props.restrictCategoryTypes?.length === 1));

const searchActive = computed(() => searchQuery.value.trim().length > 0);

const showTopSection = computed(() => !props.loading && !searchActive.value && sortedFullListRestricted.value.length > 0);

const topFour = computed(() => {
  const nonAutre = sortedFullListRestricted.value.filter((i) => !isAutreCategoryLabel(i.label));
  return [...nonAutre]
    .sort((a, b) => b.appointmentCount - a.appointmentCount)
    .slice(0, 4);
});

const filterTabs: ReadonlyArray<{
  value: 'all' | 'analyses' | 'domicile';
  label: string;
}> = [
  { value: 'all', label: 'Tous les soins' },
  { value: 'analyses', label: 'Prélèvement' },
  { value: 'domicile', label: 'Soins infirmiers' },
];

const filteredMainList = computed(() => {
  let list = sortedFullListRestricted.value;
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((i) => i.label.toLowerCase().includes(q));
  }
  if (showFilterTabs.value) {
    if (filterPill.value === 'analyses') {
      list = list.filter((i) => i.category === 'analyses');
    } else if (filterPill.value === 'domicile') {
      list = list.filter((i) => i.category === 'domicile');
    }
  }
  return list;
});

function isSelected(id: string): boolean {
  return selectedServices.value.some((s) => s.id === id);
}

function toggleItem(raw: CareItem['raw']) {
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
    }
    return;
  }
  const cat = raw as CareCategoryRow;
  const idx = selectedServices.value.findIndex((s) => s.id === cat.id);
  if (idx >= 0) {
    selectedServices.value = selectedServices.value.filter((s) => s.id !== cat.id);
  } else {
    selectedServices.value = [
      ...selectedServices.value,
      {
        id: cat.id,
        type: cat.type,
        name: cat.name,
        category_id: cat.id,
        icon: resolveCareIconFromCategory(cat),
      },
    ];
  }
}
</script>
