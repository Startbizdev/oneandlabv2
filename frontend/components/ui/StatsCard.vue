<template>
  <UCard>
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-gray-600 dark:text-gray-400">{{ title }}</p>
        <p class="text-3xl font-normal mt-2">{{ value }}</p>
        <p v-if="subtitle" class="text-sm text-gray-500 mt-1">{{ subtitle }}</p>
      </div>
      <div v-if="icon" class="text-4xl opacity-20">
        <UIcon :name="icon" />
      </div>
    </div>
    <div v-if="trend" class="mt-4 flex items-center text-sm" :class="trendColor">
      <UIcon :name="trend > 0 ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'" />
      <span class="ml-1">{{ Math.abs(trend) }}%</span>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: number;
}

const props = defineProps<Props>();

const trendColor = computed(() => {
  if (!props.trend) return '';
  return props.trend > 0 ? 'text-green-600' : 'text-red-600';
});
</script>




