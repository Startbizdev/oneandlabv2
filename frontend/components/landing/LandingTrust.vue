<template>
  <section class="py-12 sm:py-14 border-t border-b border-gray-100 bg-gray-50/50" :class="backgroundClass">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        <div
          v-for="(item, index) in items"
          :key="index"
          class="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left"
        >
          <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
            <UIcon :name="item.icon" class="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white text-sm sm:text-base">{{ item.title }}</p>
            <p v-if="item.description" class="text-xs sm:text-sm text-gray-600 mt-0.5">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  items: Array<{
    icon: string
    title: string
    description?: string
  }>
  backgroundClass?: string
}>()
</script>
