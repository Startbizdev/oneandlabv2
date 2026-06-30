<template>
  <div
    :class="[
      'flex flex-col items-center justify-center',
      compact ? 'py-8' : 'py-12',
    ]"
  >
    <UIcon
      name="i-lucide-loader-2"
      :class="[
        'animate-spin text-primary mb-2',
        compact ? 'w-6 h-6' : 'w-8 h-8',
      ]"
    />
    <p
      :class="[
        'text-gray-500 dark:text-gray-400',
        compact ? 'text-sm' : 'text-base',
      ]"
    >
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message?: string
  compact?: boolean
}

withDefaults(defineProps<Props>(), {
  message: 'Chargement...',
  compact: false,
})
</script>
