<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 mb-6">
      <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30">
        <UIcon name="i-lucide-message-square" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
      </div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Avis clients</h2>
    </div>
    
    <!-- Statistiques -->
    <div v-if="reviews.stats && reviews.stats.total_reviews > 0" class="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800/50">
      <div class="flex items-center gap-6 flex-wrap">
        <div class="flex items-baseline gap-3">
          <div class="text-5xl font-bold text-gray-900 dark:text-white">
            {{ reviews.stats.average_rating.toFixed(1) }}
          </div>
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-0.5">
              <UIcon 
                v-for="i in 5" 
                :key="i"
                :name="i <= Math.round(reviews.stats.average_rating) ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                :class="[
                  'w-6 h-6 transition-colors',
                  i <= Math.round(reviews.stats.average_rating) 
                    ? 'text-yellow-400' 
                    : 'text-gray-300 dark:text-gray-700'
                ]"
              />
            </div>
            <div class="text-sm font-medium text-gray-600 dark:text-gray-400">
              {{ reviews.stats.total_reviews }} {{ reviews.stats.total_reviews > 1 ? 'avis' : 'avis' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Liste des avis -->
    <div v-if="reviews.items && reviews.items.length > 0" class="space-y-4">
      <UCard 
        v-for="review in reviews.items" 
        :key="review.id"
        class="hover:shadow-md transition-all duration-300 border-0 ring-1 ring-gray-200 dark:ring-gray-800"
        :ui="{ body: { padding: 'p-5 lg:p-6' } }"
      >
        <div class="space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="flex items-center gap-1 flex-shrink-0">
                <UIcon 
                  v-for="i in 5" 
                  :key="i"
                  :name="i <= review.rating ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                  :class="[
                    'w-4 h-4 transition-colors',
                    i <= review.rating 
                      ? 'text-yellow-400' 
                      : 'text-gray-300 dark:text-gray-700'
                  ]"
                />
              </div>
              <span class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {{ review.patient_name }}
              </span>
            </div>
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
              {{ formatDate(review.created_at) }}
            </span>
          </div>
          
          <p v-if="review.comment" class="text-gray-700 dark:text-gray-300 leading-relaxed">
            {{ review.comment }}
          </p>
          
          <div v-if="review.response" class="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border-l-4 border-primary-500 dark:border-primary-400">
            <div class="flex items-start gap-2 mb-2">
              <UIcon name="i-lucide-message-circle-reply" class="w-4 h-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
              <div class="text-sm font-semibold text-primary-900 dark:text-primary-100">
                Réponse du professionnel
              </div>
            </div>
            <p class="text-sm text-primary-800 dark:text-primary-200 leading-relaxed ml-6">{{ review.response }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <div v-else class="text-center py-12">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
        <UIcon name="i-lucide-message-square" class="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <p class="text-gray-500 dark:text-gray-400 font-medium">Aucun avis pour le moment</p>
      <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Soyez le premier à laisser un avis !</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  reviews: {
    stats?: {
      total_reviews: number;
      average_rating: number;
    };
    items: Array<{
      id: string;
      rating: number;
      comment?: string;
      response?: string;
      created_at: string;
      patient_name: string;
    }>;
  };
}

const props = defineProps<Props>();

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
</script>


