<script setup lang="ts">
defineProps<{ faq?: Array<{ question: string; answer: string }> }>();
</script>

<template>
  <section v-if="faq?.length" aria-label="Questions fréquentes" class="divide-y divide-gray-200 dark:divide-gray-800">
    <details v-for="(item, index) in faq" :key="index" class="group py-1">
      <summary class="cursor-pointer py-4 pr-3 text-sm font-medium leading-relaxed text-gray-950 outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary-600 dark:text-white sm:text-base">{{ item.question }}</summary>
      <p class="pb-5 pr-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{{ item.answer }}</p>
    </details>
  </section>
</template>
