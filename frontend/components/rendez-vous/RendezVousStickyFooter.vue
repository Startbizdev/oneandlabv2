<template>
  <div
    :class="[
      'fixed bottom-0 right-0 z-[60] border-t border-gray-200/60 bg-white/95 px-4 py-3.5 shadow-[0_-8px_32px_rgba(15,23,42,0.07)] backdrop-blur-md supports-[backdrop-filter]:bg-white/92 dark:border-gray-800/80 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/90 sm:px-6',
      dashboardLayout
        ? 'left-0 md:left-64'
        : 'left-0',
    ]"
  >
    <div
      class="mx-auto flex max-w-5xl items-center justify-between gap-3 sm:gap-4"
      :class="dashboardLayout ? 'md:px-0' : ''"
    >
      <!-- Retour : mobile = icône seule dans un rond carré comme un bouton principal ; desktop = icône + libellé -->
      <button
        v-if="showBack"
        type="button"
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-gray-200/90 bg-white text-gray-800 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500 dark:hover:bg-gray-800 sm:h-11 sm:min-w-[7.5rem] sm:gap-2 sm:px-4 sm:shadow-sm"
        :disabled="backDisabled"
        aria-label="Retour"
        @click="emit('back')"
      >
        <UIcon name="i-lucide-chevron-left" class="h-5 w-5 sm:shrink-0" />
        <span class="hidden text-sm font-semibold sm:inline">Retour</span>
      </button>

      <div v-else class="min-w-0 flex-1 pr-1">
        <slot name="leading" />
      </div>

      <UButton
        :type="primarySubmit ? 'submit' : 'button'"
        size="lg"
        class="min-h-12 shrink-0 justify-center gap-2 rounded-2xl font-semibold shadow-sm sm:min-w-[200px]"
        :disabled="primaryDisabled"
        :loading="primaryLoading"
        @click="onPrimaryClick"
      >
        {{ primaryLabel }}
        <UIcon name="i-lucide-chevron-right" class="h-4 w-4 opacity-90" />
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    showBack?: boolean;
    primaryLabel: string;
    /** true = bouton submit (à placer dans un UForm) */
    primarySubmit?: boolean;
    primaryDisabled?: boolean;
    primaryLoading?: boolean;
    backDisabled?: boolean;
    /**
     * Layout dashboard avec sidebar fixe (w-64) : la barre ne recouvre pas la colonne navigation (md+).
     * Sur mobile, la barre reste pleine largeur (menu en overlay).
     */
    dashboardLayout?: boolean;
  }>(),
  {
    showBack: true,
    primarySubmit: false,
    primaryDisabled: false,
    primaryLoading: false,
    backDisabled: false,
    dashboardLayout: false,
  }
);

const emit = defineEmits<{
  back: [];
  primary: [];
}>();

function onPrimaryClick() {
  if (props.primarySubmit) return;
  emit('primary');
}
</script>
