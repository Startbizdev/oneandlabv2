<template>
  <section class="py-16 sm:py-20" :class="backgroundClass">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
      <div class="text-center mb-10 sm:mb-12">
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="text-lg text-gray-600">
          {{ subtitle }}
        </p>
      </div>
      <UAccordion
        :items="faqItems"
        :ui="{
          root: 'space-y-3',
          item: {
            base: 'border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow',
            padding: 'p-0',
          },
          trigger: {
            base: 'flex items-center justify-between w-full text-left px-5 py-4 hover:bg-gray-50/80 transition-colors font-semibold text-gray-900',
            padding: 'p-0',
          },
          content: {
            base: 'text-gray-600 leading-relaxed px-5 pb-4',
            padding: 'pt-0',
          },
        }"
      >
        <template #default="{ item }">
          <span class="text-base">{{ item.label }}</span>
        </template>
        <template #content="{ item }">
          <p class="text-sm sm:text-base">{{ item.content }}</p>
        </template>
      </UAccordion>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  subtitle?: string
  items: Array<{ question: string; answer: string }>
  backgroundClass?: string
}>()

const faqItems = computed(() =>
  props.items.map((item, i) => ({
    value: String(i),
    label: item.question,
    content: item.answer,
  }))
)
</script>
