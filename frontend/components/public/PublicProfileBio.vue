<template>
  <div v-if="biography" class="space-y-4">
    <div class="flex items-center gap-3 mb-6">
      <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30">
        <UIcon name="i-lucide-user-circle" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
      </div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">À propos</h2>
    </div>
    <div class="prose prose-gray dark:prose-invert max-w-none prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4">
      <p class="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{{ biography }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  biography?: string | null;
}

defineProps<Props>();
</script>


