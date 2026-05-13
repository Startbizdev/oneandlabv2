<template>
  <div
    ref="emblaRootRef"
    class="embla-view [-webkit-tap-highlight-color:transparent] seg-bleed-x-mobile"
    role="tablist"
    :aria-label="ariaLabel"
    tabindex="0"
    @keydown="onKeydown"
  >
    <div class="embla-track">
      <div
        v-for="(tab, index) in tabs"
        :key="tab.value"
        class="embla-slide"
        role="none"
      >
        <button
          type="button"
          role="tab"
          class="seg-card seg-card--embla h-full w-full touch-manipulation"
          :class="cardClasses(tab, modelValue === tab.value)"
          :aria-selected="modelValue === tab.value"
          @click="selectTabFromPointer(index)"
        >
          <div class="seg-card-inner">
            <span v-if="tab.iconSrc" class="seg-menu-img-wrap" aria-hidden="true">
              <img :src="tab.iconSrc" alt="" class="seg-menu-img" loading="lazy" decoding="async" />
            </span>
            <span v-else-if="tab.icon" class="seg-icon" :class="iconClasses(tab, modelValue === tab.value)">
              <UIcon :name="tab.icon" class="seg-icon-svg" aria-hidden="true" />
            </span>
            <p class="seg-label">{{ tab.label }}</p>
            <p v-if="tab.subLabel" class="seg-sublabel">{{ tab.subLabel }}</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IosSwipeFilterTab } from './IosSwipeSegmentFilter.types';
import emblaCarouselVue from 'embla-carousel-vue';
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    tabs: readonly IosSwipeFilterTab[];
    ariaLabel?: string;
    /**
     * Si défini : clic sur l’onglet déjà sélectionné repasse le modèle à cette valeur
     * (ex. `'all'` pour « tout afficher » sans onglet « Tous » dans la liste).
     */
    deselectTo?: string | null;
  }>(),
  {
    ariaLabel: 'Filtrer',
    deselectTo: null,
  },
);

const modelValue = defineModel<string>({ required: true });

/** Faux après scroll « valeur hors onglets » jusqu’à ce que le flux Embla se stabilise (évite d’appliquer la 1ʳᵉ catégorie par erreur). */
const carouselSelectReady = ref(true);

function themeComplete(tab: IosSwipeFilterTab) {
  if (!tab.cardIdle || !tab.cardActive) return false;
  if (tab.iconSrc) return true;
  return Boolean(tab.iconIdle && tab.iconActive);
}

function cardClasses(tab: IosSwipeFilterTab, selected: boolean) {
  if (themeComplete(tab)) {
    return selected ? tab.cardActive! : tab.cardIdle!;
  }
  return selected ? 'seg-card--active-fallback' : 'seg-card--idle-fallback';
}

function iconClasses(tab: IosSwipeFilterTab, selected: boolean) {
  if (themeComplete(tab)) {
    return selected ? tab.iconActive! : tab.iconIdle!;
  }
  return selected ? 'seg-icon--active-fallback' : 'seg-icon--idle-fallback';
}

const [emblaRootRef, emblaApi] = emblaCarouselVue({
  axis: 'x',
  align: 'start',
  containScroll: 'trimSnaps',
  dragFree: false,
  skipSnaps: false,
});

/** Après clic / clavier : ignore le 1er `select` Embla pour ne pas écraser le filtre si le snap est décalé. */
const ignoreCarouselSelectMatchingIndex = ref<number | null>(null);

function indexInTabs(v: string): number {
  return props.tabs.findIndex((t) => t.value === v);
}

function scrollToIndex(index: number, jump: boolean) {
  const api = emblaApi.value;
  if (!api || props.tabs.length <= 1) return;
  const clamped = Math.max(0, Math.min(index, props.tabs.length - 1));
  api.scrollTo(clamped, jump);
}

function selectTab(index: number, syncCarousel: boolean) {
  const tab = props.tabs[index];
  if (!tab) return;
  modelValue.value = tab.value;
  if (!syncCarousel) return;
  const clamped = Math.max(0, Math.min(index, props.tabs.length - 1));
  ignoreCarouselSelectMatchingIndex.value = clamped;
  scrollToIndex(clamped, true);
}

function selectTabFromPointer(index: number): void {
  const tab = props.tabs[index];
  if (!tab) return;
  if (props.deselectTo != null && modelValue.value === tab.value) {
    modelValue.value = props.deselectTo;
    nextTick(() => {
      ignoreCarouselSelectMatchingIndex.value = 0;
      scrollToIndex(0, true);
    });
    return;
  }
  selectTab(index, true);
}

function syncCarouselIgnoreSelectOnce(targetIndex: number): void {
  const clamped = Math.max(0, Math.min(targetIndex, props.tabs.length - 1));
  ignoreCarouselSelectMatchingIndex.value = clamped;
  scrollToIndex(clamped, true);
}

function syncCarouselFromModel(jump: boolean) {
  const api = emblaApi.value;
  if (!api || props.tabs.length <= 1) return;
  const idx = indexInTabs(modelValue.value);
  if (idx < 0) {
    carouselSelectReady.value = false;
    ignoreCarouselSelectMatchingIndex.value = 0;
    scrollToIndex(0, jump);
    nextTick(() => {
      nextTick(() => {
        carouselSelectReady.value = true;
      });
    });
    return;
  }
  carouselSelectReady.value = true;
  if (jump) {
    syncCarouselIgnoreSelectOnce(idx);
  } else {
    scrollToIndex(idx, false);
  }
}

let detachSelect: (() => void) | null = null;

function attachSelect() {
  detachSelect?.();
  detachSelect = null;
  const api = emblaApi.value;
  if (!api || props.tabs.length <= 1) return;
  const handler = () => {
    const i = api.selectedScrollSnap();
    const guarded = ignoreCarouselSelectMatchingIndex.value;
    if (guarded !== null) {
      ignoreCarouselSelectMatchingIndex.value = null;
      return;
    }
    if (!carouselSelectReady.value) return;
    const tab = props.tabs[i];
    if (!tab) return;
    if (tab.value !== modelValue.value) {
      modelValue.value = tab.value;
    }
  };
  api.on('select', handler);
  api.on('reInit', handler);
  detachSelect = () => {
    api.off('select', handler);
    api.off('reInit', handler);
  };
}

watch(emblaApi, (api) => {
  detachSelect?.();
  detachSelect = null;
  if (!api || props.tabs.length <= 1) return;
  attachSelect();
  nextTick(() => syncCarouselFromModel(true));
});

watch(
  () => modelValue.value,
  () => {
    if (props.tabs.length <= 1) return;
    nextTick(() => syncCarouselFromModel(false));
  },
);

watch(
  () => props.tabs.map((t) => t.value).join('\0'),
  () => {
    if (props.tabs.length <= 1) return;
    nextTick(() => {
      emblaApi.value?.reInit();
      syncCarouselFromModel(true);
    });
  },
);

onBeforeUnmount(() => {
  detachSelect?.();
});

function onKeydown(e: KeyboardEvent) {
  const api = emblaApi.value;
  if (!api || props.tabs.length <= 1) return;
  const i = api.selectedScrollSnap();
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    selectTab(Math.min(i + 1, props.tabs.length - 1), true);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    selectTab(Math.max(i - 1, 0), true);
  }
}
</script>

<style scoped>
@reference '../../assets/css/main.css';

.seg-bleed-x-mobile {
  @apply px-4 sm:px-0;
}

.embla-view {
  @apply overflow-hidden py-2;
  touch-action: pan-x pinch-zoom;
}

@supports (width: 10cqi) {
  .embla-view {
    container-type: inline-size;
  }
}

.embla-track {
  @apply flex items-center;
}

/*
  4 tuiles pleines + 0,5 visible : W = 4,5×tuile + 4×marge-inter-tuiles.
  Marge réduite (0,375rem) pour gagner un peu de place horizontalement.
*/
.embla-slide {
  @apply flex min-w-0 shrink-0 flex-col;
  flex-basis: calc((100vw - 2rem - 4 * 0.375rem) / 4.5);
  margin-inline-end: 0.375rem;
}

@media (min-width: 640px) and (max-width: 767px) {
  .embla-slide {
    flex-basis: calc((100vw - 4 * 0.375rem) / 4.5);
  }
}

@supports (width: 10cqi) {
  .embla-slide {
    flex-basis: calc((100cqi - 4 * 0.375rem) / 4.5);
  }
}

.embla-slide:last-child {
  margin-inline-end: 0;
}

.seg-card {
  @apply box-border flex flex-col rounded-2xl text-center transition-[transform,background-color,border-color] duration-150 ease-out;
  @apply focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950;
}

.seg-card:active {
  @apply scale-[0.985];
}

.seg-card--embla {
  /* items-center : le bouton est en flex-col stretch par défaut — sans ça le bloc icône+titre reste calé au start (text-start hérité des pages). */
  @apply aspect-auto min-h-[5.25rem] w-full shrink-0 items-center pb-px text-center;
}

.seg-card--idle-fallback {
  @apply border border-gray-200/90 bg-white shadow-none dark:border-gray-700/85 dark:bg-gray-950;
}

.seg-card--active-fallback {
  @apply border border-gray-200/90 bg-primary-100 shadow-none dark:border-gray-700/85 dark:bg-primary-950/40;
}

.seg-card-inner {
  @apply flex min-h-0 flex-1 flex-col items-center justify-center;
}

.seg-menu-img-wrap {
  @apply flex shrink-0 items-center justify-center overflow-visible bg-transparent p-0 shadow-none ring-0;
}

.seg-menu-img {
  @apply block max-h-full max-w-full object-contain object-center select-none pointer-events-none;
}

.seg-card--embla .seg-menu-img-wrap {
  @apply h-7 w-7;
}

@media (min-width: 360px) {
  .seg-card--embla .seg-menu-img-wrap {
    @apply h-[1.875rem] w-[1.875rem];
  }
}

@media (min-width: 390px) {
  .seg-card--embla .seg-menu-img-wrap {
    @apply h-8 w-8;
  }
}

@media (min-width: 480px) {
  .seg-card--embla .seg-menu-img-wrap {
    @apply h-[2.125rem] w-[2.125rem];
  }

  .seg-card--embla {
    @apply min-h-[5.5rem];
  }
}

.seg-card--embla .seg-card-inner {
  @apply w-full max-w-full gap-0.5 px-0.5 pb-1.5 pt-1.5 text-center;
}

.seg-card--embla .seg-icon {
  @apply flex h-7 w-7 shrink-0 items-center justify-center rounded-md;
}

@media (min-width: 390px) {
  .seg-card--embla .seg-icon {
    @apply h-8 w-8;
  }
}

@media (min-width: 480px) {
  .seg-card--embla .seg-icon {
    @apply h-[2.125rem] w-[2.125rem] rounded-[0.45rem];
  }
}

.seg-card--embla .seg-icon-svg {
  @apply size-[0.8125rem];
}

@media (min-width: 390px) {
  .seg-card--embla .seg-icon-svg {
    @apply size-[0.875rem];
  }
}

@media (min-width: 480px) {
  .seg-card--embla .seg-icon-svg {
    @apply size-[1rem];
  }
}

/* line-clamp-3 + typo légère ; pas de text-pretty (conflit visuel perçu avec text-start hérité sur mobile). */
.seg-card--embla .seg-label {
  @apply mt-0.5 line-clamp-3 w-full max-w-full text-center text-[8px] font-semibold leading-[1.15] tracking-tight text-gray-900 dark:text-gray-100 sm:text-[9px];
}

.seg-card--embla .seg-sublabel {
  @apply line-clamp-2 w-full max-w-full text-center text-[7px] font-medium uppercase leading-tight tracking-wide text-gray-500 dark:text-gray-400 sm:text-[7.5px];
}

@media (min-width: 390px) {
  .seg-card--embla .seg-label {
    @apply text-[8.75px] leading-snug;
  }
}

@media (min-width: 480px) {
  .seg-card--embla .seg-label {
    @apply text-[9.5px] leading-snug;
  }
}

.seg-label {
  overflow-wrap: anywhere;
}

.seg-icon {
  box-sizing: border-box;
}

.seg-icon--idle-fallback {
  @apply bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300;
}

.seg-icon--active-fallback {
  @apply bg-primary-600 text-white dark:bg-primary-500;
}
</style>
