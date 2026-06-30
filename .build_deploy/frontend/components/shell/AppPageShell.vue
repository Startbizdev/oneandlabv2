<template>
  <div v-if="hasPageHeader" :class="outerClass">
    <div :class="headerBleedClass">
      <slot name="pageHeader" />
    </div>
    <div :class="bodyClass">
      <slot />
    </div>
  </div>
  <div v-else :class="singleClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    /** Largeur max du contenu (§11.2) — s’applique au corps, pas au bandeau `#pageHeader` */
    maxWidth?: '5xl' | '6xl' | '7xl' | 'full';
    /** Désactiver le padding horizontal du corps si le layout parent le fournit déjà */
    padded?: boolean;
    /**
     * Marges du bandeau pour annuler le padding du layout parent.
     * `dashboard` : zone `p-4 md:p-6` du layout tableau de bord.
     * `patient` : `main` patient `py-6 px-4 sm:px-6 lg:px-8`.
     */
    headerBleed?: 'dashboard' | 'patient';
  }>(),
  {
    maxWidth: '7xl',
    padded: true,
    headerBleed: 'dashboard',
  }
);

const attrs = useAttrs();
const slots = useSlots();

const hasPageHeader = computed(() => Boolean(slots.pageHeader?.()));

const maxWidthClass = computed(() => {
  const map = {
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  } as const;
  return map[props.maxWidth];
});

const horizontalPad = computed(() => (props.padded ? 'px-4 sm:px-6' : ''));

const headerBleedClass = computed(() =>
  props.headerBleed === 'patient'
    ? '-mx-4 -mt-6 sm:-mx-6 lg:-mx-8'
    : '-mx-4 -mt-4 md:-mx-6 md:-mt-6'
);

const bodyClass = computed(() =>
  [
    'w-full mx-auto min-w-0 flex flex-col',
    hasPageHeader.value ? 'gap-6' : '',
    maxWidthClass.value,
    horizontalPad.value,
  ]
    .filter(Boolean)
    .join(' ')
);

const attrClass = computed(() => (typeof attrs.class === 'string' ? attrs.class : ''));

const outerClass = computed(() => ['w-full min-w-0', attrClass.value].filter(Boolean).join(' '));

const singleClass = computed(() =>
  ['w-full mx-auto min-w-0', maxWidthClass.value, horizontalPad.value, attrClass.value]
    .filter(Boolean)
    .join(' ')
);
</script>
