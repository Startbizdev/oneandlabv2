<template>
  <div class="-mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-6 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
    <div class="px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
      <!-- Titre + description -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-3 min-w-0 flex-wrap">
          <h1 class="text-lg sm:text-xl font-normal text-gray-900 truncate">
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
        <p v-if="description || $slots.description" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
}

withDefaults(defineProps<Props>(), {
  badgeColor: 'primary',
});
</script>

