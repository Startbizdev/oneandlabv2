<script setup lang="ts">
import { apiFetch } from '~/utils/api';
import type { ReceivedReview } from '~/types/reviews';

defineProps<{ appointmentDetailBase: string }>();
const { user } = useAuth();
const route = useRoute();
const toast = useAppToast();
const reviews = ref<ReceivedReview[]>([]);
const stats = ref<{ total_reviews: number; average_rating: number } | null>(null);
const loading = ref(true);
const loadError = ref(false);
const pageNumber = ref(1);
const totalPages = ref(1);
const selectedReview = ref<ReceivedReview | null>(null);
const responseText = ref('');
const responseError = ref('');
const submitting = ref(false);
const replyOpen = ref(false);

function isHighlighted(review: ReceivedReview) {
  return review.id === route.query.review || (!!review.appointment_id && review.appointment_id === route.query.appointment);
}

async function loadReviews(targetPage = pageNumber.value) {
  loading.value = true;
  loadError.value = false;
  try {
    if (!user.value?.id) throw new Error('Connexion requise');
    const result = await apiFetch<{ success: boolean; data?: ReceivedReview[]; pagination?: { pages: number } }>(`/reviews?reviewee_id=${encodeURIComponent(user.value.id)}&limit=100&page=${targetPage}`);
    if (!result.success || !Array.isArray(result.data)) throw new Error('Chargement impossible');
    reviews.value = result.data;
    pageNumber.value = targetPage;
    totalPages.value = Math.max(1, Number(result.pagination?.pages) || 1);
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
  await nextTick();
  const highlighted = reviews.value.find(isHighlighted);
  if (highlighted) document.getElementById(`review-card-${highlighted.id}`)?.scrollIntoView({ block: 'center' });
}

async function loadStats() {
  if (!user.value?.id) return;
  try {
    const result = await apiFetch<{ success: boolean; data?: { total_reviews: number; average_rating: number } }>(`/reviews/stats?reviewee_id=${encodeURIComponent(user.value.id)}`);
    if (result.success && result.data && Number.isFinite(Number(result.data.average_rating))) {
      stats.value = { total_reviews: Number(result.data.total_reviews), average_rating: Number(result.data.average_rating) };
    }
  } catch { /* The list remains usable when the optional aggregate is unavailable. */ }
}

function openReply(review: ReceivedReview) {
  selectedReview.value = review;
  responseText.value = '';
  responseError.value = '';
  replyOpen.value = true;
}

async function submitReply() {
  if (submitting.value || !selectedReview.value) return;
  const response = responseText.value.trim();
  if (!response) { responseError.value = 'Écrivez votre réponse avant de l’envoyer.'; return; }
  submitting.value = true;
  responseError.value = '';
  try {
    const result = await apiFetch<{ success: boolean; error?: string }>(`/reviews/${encodeURIComponent(selectedReview.value.id)}/response`, { method: 'POST', body: { response } });
    if (!result.success) throw new Error(result.error || 'Envoi impossible. Réessayez.');
    selectedReview.value.response = response;
    replyOpen.value = false;
    toast.add({ title: 'Réponse envoyée', color: 'success' });
  } catch (error) {
    responseError.value = error instanceof Error ? error.message : 'Envoi impossible. Votre texte est conservé.';
  } finally {
    submitting.value = false;
  }
}

onMounted(() => { void Promise.all([loadReviews(), loadStats()]); });
</script>

<template>
  <AppPageShell class="space-y-5">
    <template #pageHeader><AppPageHeader :edge-bleed="false" title="Avis des patients" description="Consultez les retours des patients et apportez-leur une réponse." /></template>
    <section v-if="stats && stats.total_reviews > 0" aria-label="Note moyenne" class="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
      <p class="text-3xl font-semibold tabular-nums text-gray-950 dark:text-white">{{ stats.average_rating.toFixed(1) }}<span class="text-base font-normal text-gray-500"> / 5</span></p>
      <p class="text-sm text-gray-600 dark:text-gray-300">{{ stats.total_reviews }} avis reçus</p>
    </section>
    <p v-if="loading" role="status" class="py-12 text-center text-sm text-gray-500">Chargement des avis…</p>
    <UAlert v-else-if="loadError" title="Impossible de charger les avis" color="error" variant="soft"><template #actions><UButton color="neutral" variant="outline" @click="() => loadReviews()">Réessayer</UButton></template></UAlert>
    <template v-else>
      <UEmpty v-if="!reviews.length" icon="i-lucide-star" title="Aucun avis pour le moment" description="Les retours de vos patients apparaîtront ici après leur rendez-vous." />
      <div v-else class="grid gap-4"><ReviewReceivedCard v-for="review in reviews" :key="review.id" :review="review" :appointment-detail-base="appointmentDetailBase" :highlighted="isHighlighted(review)" @reply="openReply" /></div>
      <nav v-if="totalPages > 1" aria-label="Pages d’avis" class="flex flex-wrap items-center justify-between gap-3">
        <UButton color="neutral" variant="outline" :disabled="pageNumber <= 1" @click="loadReviews(pageNumber - 1)">Précédent</UButton>
        <span class="text-sm text-gray-500">Page {{ pageNumber }} sur {{ totalPages }}</span>
        <UButton color="neutral" variant="outline" :disabled="pageNumber >= totalPages" @click="loadReviews(pageNumber + 1)">Suivant</UButton>
      </nav>
    </template>
    <UModal v-model:open="replyOpen" title="Répondre à l’avis" description="Votre réponse sera visible avec l’avis du patient." :dismissible="!submitting" :close="!submitting">
      <template #body>
        <form id="review-reply" class="space-y-4" @submit.prevent="submitReply">
          <blockquote class="rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 dark:bg-gray-900 dark:text-gray-300">{{ selectedReview?.comment || 'Le patient n’a pas laissé de commentaire.' }}</blockquote>
          <UFormField label="Votre réponse" :error="responseError || undefined"><UTextarea v-model="responseText" :rows="5" class="w-full" :disabled="submitting" placeholder="Rédigez votre réponse…" /></UFormField>
          <p v-if="responseError" role="alert" class="sr-only">{{ responseError }}</p>
        </form>
      </template>
      <template #footer><div class="flex w-full justify-end gap-2"><UButton color="neutral" variant="outline" :disabled="submitting" @click="() => { replyOpen = false }">Annuler</UButton><UButton type="submit" form="review-reply" :loading="submitting">Envoyer la réponse</UButton></div></template>
    </UModal>
  </AppPageShell>
</template>
