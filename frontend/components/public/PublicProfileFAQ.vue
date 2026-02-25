<template>
  <div v-if="faq && faq.length > 0" class="space-y-5">
    <div class="flex items-center gap-3 mb-6">
      <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30">
        <UIcon name="i-lucide-help-circle" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
      </div>
      <h2 class="text-xl font-normal text-gray-900 dark:text-white">Questions fréquentes</h2>
    </div>
    <div class="space-y-3">
      <UAccordion 
        :items="faqItems"
        :ui="{
          wrapper: 'space-y-3',
          item: {
            base: 'border-0 ring-1 ring-gray-200 dark:ring-gray-800 rounded-lg hover:ring-primary-300 dark:hover:ring-primary-700 transition-all duration-200',
            padding: 'p-0',
          },
          trigger: {
            base: 'flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors duration-200',
            padding: 'px-4 py-3',
          },
          content: {
            base: 'px-4 pb-4 text-gray-600 dark:text-gray-400 leading-relaxed',
            padding: 'pt-0',
          },
        }"
      >
        <template #default="{ item }">
          <span class="font-normal text-gray-900 dark:text-white text-sm lg:text-base">
            {{ item.label }}
          </span>
        </template>
        <template #item="{ item }">
          <div class="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed text-sm lg:text-base">
            {{ item.content }}
          </div>
        </template>
      </UAccordion>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  faq?: Array<{
    question: string;
    answer: string;
  }>;
}

const props = defineProps<Props>();

const faqItems = computed(() => {
  if (!props.faq || !Array.isArray(props.faq)) {
    return [];
  }
  return props.faq.map(item => ({
    label: item.question,
    content: item.answer,
  }));
});
</script>


