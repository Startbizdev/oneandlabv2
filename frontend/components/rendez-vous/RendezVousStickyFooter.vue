<template>
  <div
    :class="[
      'fixed bottom-0 right-0 z-[60] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6',
      dashboardLayout
        ? 'left-0 md:left-[var(--workspace-nav-width)]'
        : 'left-0',
    ]"
  >
    <div
      :class="[
        'mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_8px_40px_rgba(17,46,43,0.12)] dark:border-gray-700 dark:bg-gray-950 sm:gap-6 sm:p-4',
        !dashboardLayout && 'md:max-w-3xl',
        dashboardLayout ? 'md:px-0' : '',
      ]"
    >
      <!-- Le retour reste lisible et accessible au toucher sur toutes les tailles. -->
      <button
        v-if="showBack"
        type="button"
        class="flex min-h-12 shrink-0 items-center justify-center gap-1 rounded-xl px-2 text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800 sm:px-4"
        :disabled="backDisabled"
        aria-label="Retour"
        @click="emit('back')"
      >
        <UIcon name="i-lucide-chevron-left" class="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
        <span class="text-sm font-medium">Retour</span>
      </button>

      <div v-else class="flex min-w-0 flex-1 items-center pr-0.5 sm:pr-1">
        <slot name="leading" />
      </div>

      <UButton
        :type="primarySubmit ? 'submit' : 'button'"
        size="md"
        class="min-h-12 min-w-0 flex-1 justify-center whitespace-normal rounded-xl px-4 py-3 text-center text-sm font-semibold leading-snug sm:max-w-xs sm:min-w-44 sm:flex-none"
        :disabled="primaryDisabled"
        :loading="primaryLoading"
        @click="onPrimaryClick"
      >
        {{ primaryLabel }}
        <UIcon v-if="!primaryLoading" name="i-lucide-arrow-right" class="size-4 shrink-0" aria-hidden="true" />
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
     * Même largeur que la navigation dashboard : la barre ne recouvre pas la sidebar (md+).
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
