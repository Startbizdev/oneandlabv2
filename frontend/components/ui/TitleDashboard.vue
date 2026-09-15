<template>
  <div
    class="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800"
    :class="[
      edgeBleed ? '-mx-4 -mt-4 md:-mx-6 md:-mt-6' : '',
      compact ? 'mb-4' : 'mb-6',
    ]"
  >
    <div
      class="px-4 md:px-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-6"
      :class="compact ? 'py-3' : 'py-4 md:py-5'"
    >
      <!-- Titre + description -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-3 min-w-0 flex-wrap">
          <h1
            class="font-semibold leading-tight tracking-tight text-gray-900 dark:text-white break-words text-balance"
            :class="compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'"
          >
            {{ title }}
          </h1>
          <UBadge
            v-if="badge !== undefined && badge !== null && badge !== ''"
          :color="resolveUiColor(badgeColor, 'primary')"
            variant="subtle"
            size="sm"
            class="flex-shrink-0"
          >
            {{ badge }}
          </UBadge>
        </div>
        <p
          v-if="description || $slots.description"
          class="max-w-[64ch] text-pretty text-sm leading-relaxed text-gray-500 dark:text-gray-400"
          :class="compact ? 'mt-0.5' : 'mt-1'"
        >
          <slot name="description">{{ description }}</slot>
        </p>
      </div>

      <!-- Actions -->
      <div v-if="$slots.actions || actions?.length" class="flex min-w-0 flex-wrap items-center gap-2 lg:max-w-[45%] [&_button]:min-h-11 [&_a]:min-h-11 [&_button]:whitespace-normal [&_a]:whitespace-normal">
        <slot name="actions">
          <template v-if="actions">
            <UButton
              v-for="(action, index) in actions"
              :key="index"
              v-bind="action"
              :color="resolveUiColor(action.color, 'primary')"
              :variant="resolveUiButtonVariant(action.variant ?? 'solid')"
              @click="action.click?.()"
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
import { resolveUiColor, resolveUiButtonVariant } from '~/utils/ui-appearance';
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
