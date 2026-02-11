<template>
  <div>
    <TitleDashboard title="Mes avis" icon="i-lucide-star" />
    
    <div v-if="loading" class="py-8 text-center">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto" />
    </div>
    
    <UEmpty
      v-else-if="reviews.length === 0"
      icon="i-lucide-star"
      title="Aucun avis"
      description="Vous n'avez pas encore reçu d'avis de patients."
    />
    
    <div v-else class="grid gap-4">
      <UCard v-for="review in reviews" :key="review.id">
        <div class="space-y-4">
          <div class="flex justify-between items-start">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <div class="flex">
                  <UIcon 
                    v-for="i in 5" 
                    :key="i"
                    :name="i <= review.rating ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                    class="text-yellow-400 w-5 h-5"
                  />
                </div>
                <span class="text-sm text-gray-600">
                  {{ review.rating }}/5
                </span>
              </div>
              
              <p class="text-sm text-gray-500 mb-1">
                Par {{ review.reviewer_name || 'Patient' }}
              </p>
              
              <p v-if="review.comment" class="text-gray-700">
                {{ review.comment }}
              </p>
            </div>
            
            <span class="text-xs text-gray-500">
              {{ formatDate(review.created_at) }}
            </span>
          </div>
          
          <div v-if="review.response" class="p-3 bg-blue-50 rounded">
            <p class="text-sm font-semibold text-blue-900 mb-1">Votre réponse:</p>
            <p class="text-sm text-blue-800">{{ review.response }}</p>
          </div>
          
          <div v-else>
            <UButton 
              size="sm" 
              @click="openResponseModal(review)"
              icon="i-lucide-message-square"
            >
              Répondre
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
    
    <!-- Modal réponse -->
    <UModal v-model="showResponseModal">
      <UCard v-if="selectedReview">
        <template #header>
          <h2 class="text-xl font-bold">Répondre à l'avis</h2>
        </template>
        
        <div class="space-y-4">
          <div class="p-3 bg-gray-50 rounded">
            <div class="flex mb-2">
              <UIcon 
                v-for="i in 5" 
                :key="i"
                :name="i <= selectedReview.rating ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                class="text-yellow-400 w-4 h-4"
              />
            </div>
            <p class="text-sm text-gray-700">{{ selectedReview.comment || 'Pas de commentaire' }}</p>
          </div>
          
          <UFormGroup label="Votre réponse">
            <UTextarea 
              v-model="responseText" 
              rows="4" 
              placeholder="Rédigez votre réponse au patient..."
            />
          </UFormGroup>
          
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showResponseModal = false">Annuler</UButton>
            <UButton @click="submitResponse" :loading="submitting">Envoyer</UButton>
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
const loading = ref(true);
const showResponseModal = ref(false);
const selectedReview = ref<any>(null);
const responseText = ref('');
const submitting = ref(false);
const toast = useToast();

onMounted(async () => {
  await fetchReviews();
});

const fetchReviews = async () => {
  loading.value = true;
  try {
    const response = await apiFetch(`/reviews?reviewee_id=${user.value?.id}`, {
      method: 'GET',
    });
    if (response.success && response.data) {
      reviews.value = response.data;
    }
  } catch (error) {
    console.error('Erreur chargement avis:', error);
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
