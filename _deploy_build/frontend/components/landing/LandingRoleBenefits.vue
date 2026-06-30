<template>
  <section
    class="py-12 sm:py-16 md:py-20"
    :class="backgroundClass"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
      <div class="text-center mb-10 sm:mb-12">
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="text-lg text-gray-600 max-w-2xl mx-auto">
          {{ subtitle }}
        </p>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <div
          v-for="(item, index) in items"
          :key="index"
          class="flex flex-col p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
        >
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            :class="item.iconBg || 'bg-primary-100'"
          >
            <UIcon :name="item.icon" class="w-6 h-6 text-primary-600" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {{ item.title }}
          </h3>
          <p class="text-gray-600 text-sm sm:text-base leading-relaxed flex-1">
            {{ item.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  items: Array<{
    icon: string
    title: string
    description: string
    iconBg?: string
  }>
  backgroundClass?: string
}>()
</script>
