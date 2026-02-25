<template>
  <div>
    <TitleDashboard title="Réputation" icon="i-lucide-star" description="Note et avis reçus des patients" />
    
    <div v-if="loading" class="py-8 text-center">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary-500" />
    </div>
    
    <template v-else>
      <div
        v-if="stats && stats.total_reviews > 0"
        class="mb-8 p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 ring-1 ring-gray-200 dark:ring-gray-800"
      >
        <div class="flex items-center gap-6 flex-wrap">
          <div class="flex items-baseline gap-3">
            <span class="text-5xl font-normal text-gray-900 dark:text-white">{{ stats.average_rating.toFixed(1) }}</span>
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-0.5">
                <UIcon
                  v-for="i in 5"
                  :key="i"
                  :name="i <= Math.round(stats.average_rating) ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                  :class="['w-6 h-6', i <= Math.round(stats.average_rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600']"
                />
              </div>
              <span class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ stats.total_reviews }} {{ stats.total_reviews > 1 ? 'avis' : 'avis' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <UEmpty
        v-if="reviews.length === 0"
        icon="i-lucide-star"
        title="Aucun avis"
        description="Vous n'avez pas encore reçu d'avis de patients."
      />
      
      <div v-else class="grid gap-4">
        <UCard
          v-for="review in reviews"
          :key="review.id"
          class="shadow-sm border-0 ring-1 ring-gray-200 dark:ring-gray-800 hover:shadow-md transition-shadow duration-200"
          :ui="{ body: { padding: 'p-5 sm:p-6' } }"
        >
          <div class="space-y-4">
            <div class="flex justify-between items-start gap-4">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <div class="flex gap-0.5">
                    <UIcon
                      v-for="i in 5"
                      :key="i"
                      :name="i <= review.rating ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                      class="text-yellow-400 w-5 h-5 flex-shrink-0"
                    />
                  </div>
                  <span class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ review.rating }}/5</span>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Par {{ review.reviewer_name || 'Patient' }}</p>
                <p v-if="review.comment" class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{{ review.comment }}</p>
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">{{ formatDate(review.created_at) }}</span>
            </div>
            <div v-if="review.response" class="pt-3 border-t border-gray-200 dark:border-gray-700">
              <p class="text-xs font-medium uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-1">Votre réponse</p>
              <p class="text-sm text-gray-700 dark:text-gray-300 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500 dark:border-primary-400">{{ review.response }}</p>
            </div>
            <div v-else class="pt-3 border-t border-gray-200 dark:border-gray-700">
              <UButton size="sm" variant="outline" color="primary" icon="i-lucide-message-square" @click="openResponseModal(review)">Répondre</UButton>
            </div>
          </div>
        </UCard>
      </div>
    </template>
    
    <UModal v-model:open="showResponseModal" :ui="{ content: 'max-w-lg' }">
      <UCard v-if="selectedReview" class="border-0">
        <template #header>
          <h2 class="text-xl font-normal text-gray-900 dark:text-white">Répondre à l'avis</h2>
        </template>
        <div class="space-y-4">
          <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div class="flex gap-0.5 mb-2">
              <UIcon v-for="i in 5" :key="i" :name="i <= selectedReview.rating ? 'i-heroicons-star-solid' : 'i-heroicons-star'" class="text-yellow-400 w-4 h-4" />
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300">{{ selectedReview.comment || 'Pas de commentaire' }}</p>
          </div>
          <UFormField label="Votre réponse">
            <UTextarea v-model="responseText" rows="4" placeholder="Rédigez votre réponse au patient..." />
          </UFormField>
          <div class="flex justify-end gap-2 pt-2">
            <UButton variant="outline" color="neutral" @click="showResponseModal = false">Annuler</UButton>
            <UButton color="primary" :loading="submitting" @click="submitResponse">Envoyer</UButton>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'lab',
});

import { apiFetch } from '~/utils/api';

const { user } = useAuth();
const reviews = ref<any[]>([]);
const stats = ref<{ total_reviews: number; average_rating: number } | null>(null);
const loading = ref(true);
const showResponseModal = ref(false);
const selectedReview = ref<any>(null);
const responseText = ref('');
const submitting = ref(false);
const toast = useAppToast();

onMounted(async () => {
  await Promise.all([fetchStats(), fetchReviews()]);
});

const fetchStats = async () => {
  if (!user.value?.id) return;
  try {
    const res = await apiFetch(`/reviews/stats?reviewee_id=${user.value.id}`, { method: 'GET' });
    if (res?.success && res.data) stats.value = res.data;
  } catch (e) {
    console.error('Erreur stats avis:', e);
  }
};

const fetchReviews = async () => {
  loading.value = true;
  try {
    const response = await apiFetch(`/reviews?reviewee_id=${user.value?.id}&limit=100`, { method: 'GET' });
    if (response.success && response.data) reviews.value = response.data;
  } catch (error) {
    console.error('Erreur chargement avis:', error);
    toast.add({ title: 'Erreur', description: 'Impossible de charger les avis', color: 'red' });
  } finally {
    loading.value = false;
  }
};

const openResponseModal = (review: any) => {
  selectedReview.value = review;
  responseText.value = '';
  showResponseModal.value = true;
};

const submitResponse = async () => {
  if (!responseText.value.trim()) {
    toast.add({ title: 'Erreur', description: 'Réponse vide', color: 'red' });
    return;
  }
  
  submitting.value = true;
  try {
    await apiFetch(`/reviews/${selectedReview.value.id}/response`, {
      method: 'POST',
      body: { response: responseText.value },
    });
    
    toast.add({ title: 'Réponse envoyée', color: 'green' });
    showResponseModal.value = false;
    await fetchReviews();
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  } finally {
    submitting.value = false;
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
