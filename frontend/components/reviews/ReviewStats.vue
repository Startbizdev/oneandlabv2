<template>
  <UCard>
    <template #header>
      <h2 class="text-xl font-bold">Statistiques</h2>
    </template>
    
    <div v-if="loading" class="text-center py-8">
      <span class="loading loading-spinner"></span>
    </div>
    
    <div v-else-if="stats" class="space-y-4">
      <div class="text-center">
        <div class="text-4xl font-bold text-blue-500">{{ stats.average_rating }}</div>
        <div class="text-sm text-gray-600">Note moyenne</div>
        <div class="text-sm text-gray-500 mt-1">{{ stats.total_reviews }} avis</div>
      </div>
      
      <div class="space-y-2">
        <div v-for="(count, rating) in stats.rating_distribution" :key="rating" class="flex items-center">
          <div class="w-8 flex items-center gap-1">
            <span>{{ rating }}</span>
            <UIcon name="i-lucide-star" class="w-4 h-4" />
          </div>
          <div class="flex-1 mx-2 bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-500 h-2 rounded-full"
              :style="{ width: `${(count / stats.total_reviews) * 100}%` }"
            ></div>
          </div>
          <span class="text-sm text-gray-600 w-12 text-right">{{ count }}</span>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  revieweeId: string;
}>();

import { apiFetch } from '~/utils/api';

const stats = ref<any>(null);
const loading = ref(true);

onMounted(async () => {
  const response = await apiFetch(`/reviews/stats?reviewee_id=${props.revieweeId}`, {
    method: 'GET',
  });
  if (response.success && response.data) {
    stats.value = response.data;
  }
  loading.value = false;
});
</script>

