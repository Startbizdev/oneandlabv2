<template>
  <div role="group" :aria-label="ariaLabel" class="mb-5 flex max-w-full gap-2 overflow-x-auto pb-2 sm:flex-wrap">
    <button v-for="tab in tabs" :key="tab.value" type="button"
      :aria-pressed="modelValue === tab.value"
      class="min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
      :class="modelValue === tab.value
        ? 'border-primary-700 bg-primary-50 text-primary-950 dark:border-primary-400 dark:bg-primary-950 dark:text-primary-100'
        : 'border-gray-200 bg-white text-gray-600 hover:border-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'"
      @click="modelValue = modelValue === tab.value ? deselectTo : tab.value"
    >{{ tab.label }}</button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  tabs: readonly { value: string; label: string }[];
  ariaLabel?: string;
  deselectTo?: string;
}>(), { ariaLabel: 'Filtrer par catégorie de soins', deselectTo: 'all' });
const modelValue = defineModel<string>({ required: true });
</script>
