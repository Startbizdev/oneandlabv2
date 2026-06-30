<template>
  <div
    :class="[
      'group relative flex min-h-0 h-full flex-col gap-0 overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-[border-color,box-shadow] dark:border-gray-800 dark:bg-gray-950',
      hoverRing ? 'hover:border-primary-500/30 hover:shadow-md' : '',
    ]"
  >
    <slot />
    <slot name="footer" />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Bordure / ombre au survol (listes cliquables) */
    hoverRing?: boolean;
  }>(),
  { hoverRing: true },
);
</script>
