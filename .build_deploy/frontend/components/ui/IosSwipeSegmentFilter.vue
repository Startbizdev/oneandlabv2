<template>
  <!-- Mobile : Embla (sous-composant). Desktop (md+) : grille égale, pas de scroll — les 7 filtres visibles. -->
  <div class="relative -mx-4 mb-8 sm:-mx-0 sm:mb-9">
    <!-- 1 seul segment -->
    <div
      v-if="tabs.length === 1"
      class="mx-auto flex justify-center px-4 sm:px-0"
      role="tablist"
      :aria-label="ariaLabel"
    >
      <button
        type="button"
        role="tab"
        :aria-selected="deselectTo != null ? modelValue === tabs[0].value : true"
        class="seg-card seg-card--solo touch-manipulation"
        :class="cardClasses(tabs[0], deselectTo != null ? modelValue === tabs[0].value : true)"
        @click="onSoloTabClick(tabs[0])"
      >
        <div class="seg-card-inner">
          <span v-if="tabs[0].iconSrc" class="seg-menu-img-wrap" aria-hidden="true">
            <img :src="tabs[0].iconSrc" alt="" class="seg-menu-img" loading="lazy" decoding="async" />
          </span>
          <span v-else-if="tabs[0].icon" class="seg-icon" :class="iconClasses(tabs[0], true)">
            <UIcon :name="tabs[0].icon" class="seg-icon-svg" aria-hidden="true" />
          </span>
          <p class="seg-label">{{ tabs[0].label }}</p>
          <p v-if="tabs[0].subLabel" class="seg-sublabel-desktop">{{ tabs[0].subLabel }}</p>
        </div>
      </button>
    </div>

    <IosSwipeSegmentFilterCarousel
      v-else-if="tabs.length > 1 && !isMdUp"
      v-model="modelValue"
      :tabs="tabs"
      :aria-label="ariaLabel"
      :deselect-to="deselectTo ?? undefined"
    />

    <div
      v-else-if="tabs.length > 1 && isMdUp"
      class="seg-bleed-desktop grid gap-2 px-4 sm:px-0 sm:gap-2.5"
      :style="desktopGridColsStyle"
      role="tablist"
      :aria-label="ariaLabel"
    >
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        role="tab"
        class="seg-card seg-card-desktop-tile touch-manipulation"
        :class="cardClasses(tab, modelValue === tab.value)"
        :aria-selected="modelValue === tab.value"
        @click="onDesktopTabClick(tab)"
      >
        <div class="seg-card-inner">
          <span v-if="tab.iconSrc" class="seg-menu-img-wrap" aria-hidden="true">
            <img :src="tab.iconSrc" alt="" class="seg-menu-img" loading="lazy" decoding="async" />
          </span>
          <span v-else-if="tab.icon" class="seg-icon" :class="iconClasses(tab, modelValue === tab.value)">
            <UIcon :name="tab.icon" class="seg-icon-svg" aria-hidden="true" />
          </span>
          <p class="seg-label">{{ tab.label }}</p>
          <p v-if="tab.subLabel" class="seg-sublabel-desktop">{{ tab.subLabel }}</p>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import IosSwipeSegmentFilterCarousel from './IosSwipeSegmentFilterCarousel.vue';
import type { IosSwipeFilterTab } from '~/components/ui/IosSwipeSegmentFilter.types';

export type { IosSwipeFilterTab };

const props = withDefaults(
  defineProps<{
    tabs: readonly IosSwipeFilterTab[];
    ariaLabel?: string;
    deselectTo?: string | null;
  }>(),
  {
    ariaLabel: 'Filtrer',
    deselectTo: null,
  },
);

const modelValue = defineModel<string>({ required: true });

const isMdUp = useMediaQuery('(min-width: 768px)');

function onSoloTabClick(tab: IosSwipeFilterTab) {
  if (props.deselectTo != null && modelValue.value === tab.value) {
    modelValue.value = props.deselectTo;
    return;
  }
  modelValue.value = tab.value;
}

function onDesktopTabClick(tab: IosSwipeFilterTab) {
  if (props.deselectTo != null && modelValue.value === tab.value) {
    modelValue.value = props.deselectTo;
    return;
  }
  modelValue.value = tab.value;
}

const desktopGridColsStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.tabs.length}, minmax(0, 1fr))`,
}));

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
</script>

<style scoped>
@reference '../../assets/css/main.css';

.seg-bleed-desktop {
  @apply py-2;
}

.seg-card {
  @apply box-border flex flex-col rounded-2xl text-center transition-[transform,background-color,border-color] duration-150 ease-out;
  @apply focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950;
}

.seg-card:active {
  @apply scale-[0.985];
}

/* Tuile grille desktop : même hauteur, texte jusqu’à 3 lignes */
.seg-card-desktop-tile {
  @apply aspect-auto min-h-[5.75rem] w-full min-w-0;
}

@media (min-width: 1024px) {
  .seg-card-desktop-tile {
    @apply min-h-[6rem];
  }
}

.seg-card--solo {
  @apply aspect-square shrink-0 max-w-none;
  width: 5.875rem;
  height: 5.875rem;
}

@media (min-width: 1024px) {
  .seg-card--solo {
    width: 6.125rem;
    height: 6.125rem;
  }
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

.seg-card-desktop-tile .seg-card-inner {
  @apply gap-2 px-2 py-2.5;
}

.seg-card-desktop-tile .seg-icon {
  @apply flex h-11 w-11 shrink-0 items-center justify-center rounded-xl;
}

@media (min-width: 1024px) {
  .seg-card-desktop-tile .seg-icon {
    @apply h-[3rem] w-[3rem];
  }
}

.seg-card-desktop-tile .seg-menu-img-wrap {
  @apply h-11 w-11;
}

@media (min-width: 1024px) {
  .seg-card-desktop-tile .seg-menu-img-wrap {
    @apply h-[3rem] w-[3rem];
  }
}

.seg-card-desktop-tile .seg-icon-svg {
  @apply size-[1.1875rem];
}

@media (min-width: 1024px) {
  .seg-card-desktop-tile .seg-icon-svg {
    @apply size-[1.3125rem];
  }
}

.seg-card-desktop-tile .seg-label {
  @apply mt-1 line-clamp-3 max-w-full text-pretty text-[11px] font-semibold leading-snug tracking-tight text-gray-900 dark:text-gray-100;
}

@media (min-width: 1024px) {
  .seg-card-desktop-tile .seg-label {
    @apply text-[12px];
  }
}

/* Onglet unique */
.seg-card--solo .seg-card-inner {
  @apply gap-1.5 px-2 py-2;
}

@media (min-width: 1024px) {
  .seg-card--solo .seg-card-inner {
    @apply gap-2 px-2.5 py-2.5;
  }
}

.seg-card--solo .seg-icon {
  @apply flex h-11 w-11 shrink-0 items-center justify-center rounded-xl lg:h-[3rem] lg:w-[3rem];
}

.seg-card--solo .seg-menu-img-wrap {
  @apply h-11 w-11 lg:h-[3rem] lg:w-[3rem];
}

.seg-card--solo .seg-icon-svg {
  @apply size-[1.1875rem] lg:size-[1.3125rem];
}

.seg-card--solo .seg-label {
  @apply mt-1 line-clamp-2 max-w-full text-pretty text-[12px] font-semibold leading-snug tracking-tight text-gray-900 dark:text-gray-100 lg:text-[13px];
}

.seg-card-desktop-tile .seg-sublabel-desktop {
  @apply line-clamp-2 max-w-full text-center text-[9px] font-medium uppercase leading-tight tracking-wide text-gray-500 dark:text-gray-400;
}

@media (min-width: 1024px) {
  .seg-card-desktop-tile .seg-sublabel-desktop {
    @apply text-[10px];
  }
}

.seg-card--solo .seg-sublabel-desktop {
  @apply line-clamp-2 max-w-full text-center text-[10px] font-medium uppercase leading-tight tracking-wide text-gray-500 dark:text-gray-400 lg:text-[10.5px];
}

.seg-icon {
  box-sizing: border-box;
}

.seg-label {
  overflow-wrap: anywhere;
}

.seg-icon--idle-fallback {
  @apply bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300;
}

.seg-icon--active-fallback {
  @apply bg-primary-600 text-white dark:bg-primary-500;
}
</style>
