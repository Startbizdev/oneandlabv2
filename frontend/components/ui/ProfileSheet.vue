<template>
  <USlideover
    v-model:open="open"
    :title="title"
    :ui="sheetUi"
  >
    <template #body>
      <slot />
    </template>
  </USlideover>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();

const open = defineModel<boolean>('open', { default: false });

const sheetUi = {
  content: 'w-full sm:max-w-lg',
  header: 'min-h-14 px-4 py-3 sm:px-6',
  title: 'text-sm font-semibold text-gray-900 dark:text-white',
  body: 'p-0 sm:p-0',
};
</script>
