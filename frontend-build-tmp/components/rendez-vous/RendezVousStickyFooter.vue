<template>
  <div
    :class="[
      'fixed bottom-0 right-0 z-[60] border-t border-gray-200/60 bg-white/95 px-3 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_-6px_24px_-6px_rgba(15,23,42,0.07)] backdrop-blur-md supports-[backdrop-filter]:bg-white/92 dark:border-gray-800/80 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/90 sm:px-5 sm:pt-2 sm:pb-[max(0.5rem,env(safe-area-inset-bottom))]',
      dashboardLayout
        ? 'left-0 md:left-[7.25rem]'
        : 'left-0',
    ]"
  >
    <div
      :class="[
        'mx-auto flex w-full max-w-5xl items-center justify-between gap-2 sm:gap-3',
        !dashboardLayout && 'md:max-w-3xl',
        dashboardLayout ? 'md:px-0' : '',
      ]"
    >
      <!-- Retour : mobile = icône seule dans un rond carré comme un bouton principal ; desktop = icône + libellé -->
      <button
        v-if="showBack"
        type="button"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200/90 bg-white text-gray-800 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500 dark:hover:bg-gray-800 sm:h-10 sm:min-w-[7rem] sm:rounded-xl sm:gap-1.5 sm:border-2 sm:px-3 sm:shadow-sm"
        :disabled="backDisabled"
        aria-label="Retour"
        @click="emit('back')"
      >
        <UIcon name="i-lucide-chevron-left" class="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
        <span class="hidden text-sm font-semibold sm:inline">Retour</span>
      </button>

      <div v-else class="flex min-w-0 flex-1 items-center pr-0.5 sm:pr-1">
        <slot name="leading" />
      </div>

      <UButton
        :type="primarySubmit ? 'submit' : 'button'"
        size="md"
        class="min-h-9 shrink-0 justify-center rounded-lg px-3.5 py-2 text-sm font-semibold leading-tight shadow-sm sm:min-h-10 sm:min-w-[min(176px,52vw)] sm:rounded-xl sm:px-4 sm:text-sm sm:leading-normal"
        :disabled="primaryDisabled"
        :loading="primaryLoading"
        @click="onPrimaryClick"
      >
        {{ primaryLabel }}
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
     * Layout dashboard avec sidebar fixe (~7.25rem) : la barre ne recouvre pas la colonne navigation (md+).
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
