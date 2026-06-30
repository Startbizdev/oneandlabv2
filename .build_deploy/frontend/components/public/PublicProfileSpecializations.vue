<template>
  <div v-if="specializations && specializations.length > 0" class="space-y-6">
    <div class="flex items-center gap-3 mb-6">
      <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30">
        <UIcon name="i-lucide-award" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
      </div>
      <h2 class="text-2xl font-normal text-gray-900 dark:text-white">Spécialisations</h2>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <UBadge
        v-for="spec in specializations"
        :key="spec.id"
        color="primary"
        variant="subtle"
        size="lg"
        class="justify-start py-3 px-4 hover:shadow-md transition-all duration-200 cursor-default"
      >
        <UIcon name="i-lucide-check-circle" class="w-4 h-4 mr-2 flex-shrink-0" />
        <span class="font-medium">{{ spec.name }}</span>
      </UBadge>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  specializations?: Array<{
    id: string;
    name: string;
    description?: string;
    type: string;
  }>;
}

defineProps<Props>();
</script>


