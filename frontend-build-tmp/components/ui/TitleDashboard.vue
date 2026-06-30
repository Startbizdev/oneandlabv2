<template>
  <div
    class="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800"
    :class="[
      edgeBleed ? '-mx-4 -mt-4 md:-mx-6 md:-mt-6' : '',
      compact ? 'mb-4' : 'mb-6',
    ]"
  >
    <div
      class="px-4 md:px-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4"
      :class="compact ? 'py-3' : 'py-4'"
    >
      <!-- Titre + description -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-3 min-w-0 flex-wrap">
          <h1
            class="font-normal text-gray-900 truncate"
            :class="compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'"
          >
            {{ title }}
          </h1>
          <UBadge
            v-if="badge"
            :color="badgeColor"
            variant="subtle"
            size="sm"
            class="flex-shrink-0"
          >
            {{ badge }}
          </UBadge>
        </div>
        <p
          v-if="description || $slots.description"
          class="text-gray-500 dark:text-gray-400"
          :class="compact ? 'text-xs mt-0.5' : 'text-sm mt-1'"
        >
          <slot name="description">{{ description }}</slot>
        </p>
      </div>

      <!-- Actions -->
      <div v-if="$slots.actions || actions" class="flex items-center gap-2 flex-shrink-0">
        <slot name="actions">
          <template v-if="actions">
            <UButton
              v-for="(action, index) in actions"
              :key="index"
              v-bind="action"
              :class="action.class"
            >
              {{ action.label }}
            </UButton>
          </template>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Action {
  label: string;
  icon?: string;
  color?: string;
  variant?: string;
  loading?: boolean;
  disabled?: boolean;
  class?: string;
  click?: () => void;
  to?: string;
}

interface Props {
  title: string;
  /** Description affichée sous le titre pour gagner de la place */
  description?: string;
  badge?: string | number;
  badgeColor?: string;
  actions?: Action[];
  /** Moins de padding / titre plus petit (listes denses) */
  compact?: boolean;
  /**
   * `true` : marges négatives pour sortir du conteneur (ex. dans le layout sans `#pageHeader`).
   * `false` : bandeau pleine largeur du parent (ex. dans `AppPageShell` `#pageHeader`).
   */
  edgeBleed?: boolean;
}

withDefaults(defineProps<Props>(), {
  badgeColor: 'primary',
  compact: false,
  edgeBleed: true,
});
</script>

