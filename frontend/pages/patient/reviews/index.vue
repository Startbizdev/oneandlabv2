<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <h1 class="text-3xl font-bold mb-6">Mes avis</h1>
    
    <div v-if="loading" class="text-center py-8">
      <span class="loading loading-spinner"></span>
    </div>
    
    <UEmpty
      v-else-if="reviews.length === 0"
      icon="i-lucide-star"
      title="Aucun avis"
      description="Vous n'avez pas encore laissé d'avis. Après un rendez-vous, vous pourrez partager votre expérience."
      :actions="[
        {
          icon: 'i-lucide-calendar',
          label: 'Voir mes rendez-vous',
          to: '/patient',
        },
      ]"
    />

    <div v-else class="space-y-4">
      <UCard 
        v-for="review in reviews" 
        :key="review.id"
        class="hover:shadow-md transition-shadow"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <div class="flex">
                <UIcon 
                  v-for="i in 5" 
                  :key="i"
                  :name="i <= review.rating ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                  class="text-yellow-400"
                />
              </div>
              <span class="text-sm text-gray-600">
                pour {{ review.reviewee_name || 'Professionnel' }}
              </span>
            </div>
            
            <p v-if="review.comment" class="text-gray-700 mb-2">
              {{ review.comment }}
            </p>
            
            <div v-if="review.response" class="mt-3 p-3 bg-gray-50 rounded">
              <div class="text-sm font-semibold mb-1">Réponse du professionnel :</div>
              <p class="text-sm text-gray-700">{{ review.response }}</p>
            </div>
            
            <div class="text-xs text-gray-500 mt-2">
              {{ formatDate(review.created_at) }}
            </div>
          </div>
          
          <UBadge :color="review.is_visible ? 'green' : 'gray'">
            {{ review.is_visible ? 'Visible' : 'Masqué' }}
          </UBadge>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'patient',
  middleware: ['auth', 'role'],
  role: 'patient',
});

import { apiFetch } from '~/utils/api';

const { user } = useAuth();

const reviews = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
  await fetchReviews();
});

const fetchReviews = async () => {
  loading.value = true;
  try {
    const response = await apiFetch(`/reviews?patient_id=${user.value?.id}`, {
      method: 'GET',
    });
    if (response.success && response.data) {
      reviews.value = response.data;
    }
  } catch (error) {
    console.error('Erreur lors du chargement des avis:', error);
  } finally {
    loading.value = false;
  }
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
</script>

