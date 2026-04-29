<template>
  <div>
    <TitleDashboard title="Mes avis" icon="i-lucide-star" description="Note et avis reçus des patients" />
    
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
        <ReviewReceivedCard
          v-for="review in reviews"
          :key="review.id"
          :review="review"
          appointment-detail-base="/subaccount/appointments"
          :highlighted="isReviewHighlighted(review)"
          @reply="openResponseModal"
        />
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
            <UButton variant="outline" color="neutral" :on-click="() => showResponseModal = false">Annuler</UButton>
            <UButton color="primary" :loading="submitting" :on-click="submitResponse">Envoyer</UButton>
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
  role: 'subaccount',
});

import { apiFetch } from '~/utils/api';
import { nextTick } from 'vue';

const route = useRoute();
const { user } = useAuth();
const reviews = ref<any[]>([]);
const stats = ref<{ total_reviews: number; average_rating: number } | null>(null);
const loading = ref(true);
const showResponseModal = ref(false);
const selectedReview = ref<any>(null);
const responseText = ref('');
const submitting = ref(false);
const toast = useAppToast();

function isReviewHighlighted(review: { id: string; appointment_id?: string | null }) {
  const qReview = route.query.review ? String(route.query.review) : '';
  const qApt = route.query.appointment ? String(route.query.appointment) : '';
  if (qReview && review.id === qReview) return true;
  if (qApt && review.appointment_id === qApt) return true;
  return false;
}

function scrollToHighlightedReview() {
  const qReview = route.query.review ? String(route.query.review) : '';
  const qApt = route.query.appointment ? String(route.query.appointment) : '';
  const id = qReview || (qApt ? reviews.value.find((r: any) => r.appointment_id === qApt)?.id : '');
  if (!id) return;
  document.getElementById(`review-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

onMounted(async () => {
  await Promise.all([fetchStats(), fetchReviews()]);
  await nextTick();
  scrollToHighlightedReview();
});

const revieweeIdForApi = computed(() => {
  const u = user.value;
  if (!u?.id) return '';
  if (u.role === 'subaccount' && u.lab_id) return String(u.lab_id);
  return String(u.id);
});

const fetchStats = async () => {
  const rid = revieweeIdForApi.value;
  if (!rid) return;
  try {
    const res = await apiFetch(`/reviews/stats?reviewee_id=${encodeURIComponent(rid)}`, { method: 'GET' });
    if (res?.success && res.data) stats.value = res.data;
  } catch (e) {
    console.error('Erreur stats avis:', e);
  }
};

const fetchReviews = async () => {
  loading.value = true;
  try {
    const rid = revieweeIdForApi.value;
    if (!rid) {
      reviews.value = [];
      return;
    }
    const response = await apiFetch(`/reviews?reviewee_id=${encodeURIComponent(rid)}&limit=100`, { method: 'GET' });
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
    const res = await apiFetch(`/reviews/${selectedReview.value.id}/response`, {
      method: 'POST',
      body: { response: responseText.value },
    }) as { success?: boolean; error?: string };
    if (!res?.success) {
      toast.add({ title: 'Erreur', description: res?.error || 'Envoi impossible', color: 'red' });
      return;
    }
    toast.add({ title: 'Réponse envoyée', color: 'green' });
    showResponseModal.value = false;
    await fetchReviews();
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  } finally {
    submitting.value = false;
  }
};

</script>
