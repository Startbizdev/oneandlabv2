<template>
  <section class="px-4 py-5 sm:px-6">
    <h3
      v-if="title"
      class="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400"
    >
      {{ title }}
    </h3>
    <slot />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>
