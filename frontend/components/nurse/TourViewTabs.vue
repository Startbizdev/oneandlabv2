<template>
  <div class="mb-2 flex gap-2">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="flex-1 rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-colors"
      :class="
        active === tab.id
          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
      "
      role="tab"
      :aria-selected="active === tab.id"
      @click="$emit('update:active', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { PassageTourViewTab } from '@oneandlab/shared-types';

defineProps<{
  active: PassageTourViewTab;
}>();

defineEmits<{
  'update:active': [tab: PassageTourViewTab];
}>();

const tabs: { id: PassageTourViewTab; label: string }[] = [
  { id: 'manual', label: 'Passage' },
  { id: 'intelligent', label: 'Passage intelligent' },
];
</script>
