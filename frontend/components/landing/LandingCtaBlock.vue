<template>
  <section
    class="py-16 sm:py-20 md:py-24"
    :class="backgroundClass"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
      <h2 class="text-2xl sm:text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-4">
        {{ title }}
      </h2>
      <p v-if="subtitle" class="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto font-normal">
        {{ subtitle }}
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <UButton
          v-for="(btn, i) in buttons"
          :key="i"
          :to="btn.to"
          :color="btn.color || 'primary'"
          :size="btn.size || 'lg'"
          :icon="btn.icon"
          :class="[
            'font-medium justify-center text-center',
            btn.size === 'xl' ? 'min-w-[260px] px-8 py-4 text-base sm:text-lg' : ''
          ]"
        >
          {{ btn.label }}
        </UButton>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  buttons: Array<{
    label: string
    to: string
    color?: string
    size?: string
    icon?: string
  }>
  backgroundClass?: string
}>()
</script>
