<template>
  <section 
    class="relative py-12 sm:py-16 md:py-20 lg:py-24"
    :class="backgroundClass"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <!-- En-tête -->
      <div class="text-center mb-8 sm:mb-10 md:mb-12">
        <h2 
          v-if="title"
          class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-5"
        >
          {{ title }}
        </h2>
        <p 
          v-if="subtitle"
          class="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto"
        >
          {{ subtitle }}
        </p>
      </div>

      <!-- Avis -->
      <div 
        v-if="reviews && reviews.length > 0"
        class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10"
      >
        <div
          v-for="(review, index) in displayedReviews"
          :key="review.id || index"
          class="relative bg-white rounded-xl border border-gray-200 p-6 sm:p-7 md:p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
        >
          <!-- En-tête de l'avis -->
          <div class="mb-4 sm:mb-5">
            <!-- Étoiles -->
            <div class="flex items-center gap-0.5 sm:gap-1 mb-3 sm:mb-4">
              <svg
                v-for="star in 5"
                :key="star"
                :class="[
                  'w-4 h-4 sm:w-5 sm:h-5 transition-all duration-200 flex-shrink-0',
                  star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
                ]"
                :fill="star <= review.rating ? 'currentColor' : 'none'"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                />
              </svg>
            </div>
            
            <!-- Nom et date -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p 
                  v-if="review.patientName"
                  class="text-sm sm:text-base font-bold text-gray-900 truncate"
                >
                  {{ review.patientName }}
                </p>
                <p 
                  v-if="review.date"
                  class="text-xs sm:text-sm text-gray-500 mt-1"
                >
                  {{ formatDate(review.date) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Commentaire -->
          <div class="mb-4 sm:mb-5">
            <p 
              v-if="review.comment"
              class="text-sm sm:text-base text-gray-700 leading-relaxed line-clamp-4"
            >
              {{ review.comment }}
            </p>
            <p 
              v-else
              class="text-sm sm:text-base text-gray-500 italic"
            >
              Aucun commentaire
            </p>
          </div>

          <!-- Réponse du professionnel -->
          <div 
            v-if="review.response"
            class="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-gray-100"
          >
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-message-square" class="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs sm:text-sm font-semibold text-primary-600 mb-1.5">
                  Réponse du professionnel
                </p>
                <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {{ review.response }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Message si pas d'avis -->
      <div 
        v-else
        class="text-center py-12 sm:py-16 md:py-20"
      >
        <div class="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4 sm:mb-5">
          <UIcon name="i-lucide-message-square" class="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
        </div>
        <p class="text-base sm:text-lg md:text-xl text-gray-600 font-medium">
          Aucun avis pour le moment
        </p>
        <p class="text-sm sm:text-base text-gray-500 mt-2">
          Soyez le premier à laisser un avis !
        </p>
      </div>

      <!-- Slot pour contenu personnalisé -->
      <div v-if="$slots.default" class="mt-10 sm:mt-12 md:mt-16">
        <slot />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface Review {
  id?: string;
  patientName?: string;
  rating: number;
  comment?: string;
  response?: string;
  date?: string | Date;
}

interface Props {
  title?: string;
  subtitle?: string;
  reviews?: Review[];
  maxReviews?: number;
  backgroundClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Ils nous font confiance',
  subtitle: 'Découvrez les avis de nos patients sur nos professionnels de santé',
  reviews: () => [],
  maxReviews: 6,
  backgroundClass: 'bg-gray-50',
});

const displayedReviews = computed(() => {
  if (!props.reviews || props.reviews.length === 0) return [];
  return props.reviews.slice(0, props.maxReviews);
});

const formatDate = (date: string | Date | undefined): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - dateObj.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Il y a ${weeks} ${weeks === 1 ? 'semaine' : 'semaines'}`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `Il y a ${months} ${months === 1 ? 'mois' : 'mois'}`;
  }
  
  return dateObj.toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};
</script>

<style scoped>
.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

