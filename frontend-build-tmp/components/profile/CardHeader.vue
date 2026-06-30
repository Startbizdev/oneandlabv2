<template>
  <div class="flex items-start gap-3">
    <div
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"
    >
      <UIcon :name="icon" class="h-5 w-5 text-primary" />
    </div>
    <div>
      <h2 class="text-lg font-normal text-gray-900 dark:text-white">
        {{ title }}
      </h2>
      <p v-if="description" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
        {{ description }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon: string
  title: string
  description?: string
}

defineProps<Props>()
</script>
