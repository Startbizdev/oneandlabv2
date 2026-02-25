<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3 mb-6 flex-wrap">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30">
          <UIcon name="i-lucide-message-square" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 class="text-xl font-normal text-gray-900 dark:text-white">Avis clients</h2>
      </div>
      <UButton
        v-if="revieweeId && revieweeType"
        variant="outline"
        color="primary"
        size="sm"
        class="shrink-0"
        icon="i-lucide-pencil"
        @click="openReviewModal"
      >
        Mettre un avis
      </UButton>
    </div>
    
    <!-- Statistiques -->
    <div v-if="reviews.stats && reviews.stats.total_reviews > 0" class="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800/50">
      <div class="flex items-center gap-6 flex-wrap">
        <div class="flex items-baseline gap-3">
          <div class="text-5xl font-normal text-gray-900 dark:text-white">
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
              <span class="text-sm font-normal text-gray-900 dark:text-white truncate">
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
              <div class="text-sm font-normal text-primary-900 dark:text-primary-100">
                Réponse du professionnel
              </div>
            </div>
            <p class="text-sm text-primary-800 dark:text-primary-200 leading-relaxed ml-6">{{ review.response }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Placeholder : aucun avis + bouton Mettre un avis -->
    <div v-else class="text-center py-12">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
        <UIcon name="i-lucide-message-square" class="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <p class="text-gray-500 dark:text-gray-400 font-medium">Aucun avis pour le moment</p>
      <p class="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-6">Soyez le premier à laisser un avis !</p>
      <UButton
        v-if="revieweeId && revieweeType"
        color="primary"
        size="md"
        icon="i-lucide-pencil"
        @click="openReviewModal"
      >
        Mettre un avis
      </UButton>
    </div>

    <!-- Modal formulaire avis -->
    <USlideover v-model:open="reviewModalOpen" title="Laisser un avis" :ui="{ width: 'max-w-md' }">
      <template #body>
        <div class="p-6 space-y-6">
          <!-- Non connecté -->
          <div v-if="!isAuthenticated" class="text-center py-4">
            <p class="text-gray-600 dark:text-gray-400 mb-4">Connectez-vous pour laisser un avis après votre rendez-vous.</p>
            <UButton to="/login" color="primary" block>Se connecter</UButton>
          </div>

          <!-- Connecté mais pas patient : placeholder + CTA -->
          <div v-else-if="user?.role !== 'patient'" class="py-6">
            <UEmpty
              icon="i-lucide-star"
              title="Avis réservés aux patients"
              description="Seuls les patients peuvent laisser un avis sur un professionnel, après un rendez-vous. Prenez rendez-vous à domicile pour ensuite partager votre expérience."
              variant="naked"
              size="md"
              :actions="[
                {
                  label: 'Prendre rendez-vous à domicile',
                  icon: 'i-lucide-calendar-plus',
                  to: '/rendez-vous/nouveau',
                  color: 'primary',
                  block: true,
                },
              ]"
            />
          </div>

          <!-- Patient : chargement des RDV éligibles -->
          <div v-else-if="eligibleLoading" class="flex justify-center py-8">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
          </div>

          <!-- Patient : aucun RDV éligible -->
          <div v-else-if="eligibleAppointments.length === 0" class="text-center py-4">
            <p class="text-gray-600 dark:text-gray-400">Vous pourrez laisser un avis après un rendez-vous terminé avec ce professionnel.</p>
            <UButton to="/rendez-vous/nouveau" color="primary" variant="soft" class="mt-4" block>Prendre rendez-vous</UButton>
          </div>

          <!-- Patient : formulaire avis -->
          <form v-else class="space-y-5" @submit.prevent="submitReview">
            <UFormField label="Note" required>
              <div class="flex items-center gap-2">
                <button
                  v-for="i in 5"
                  :key="i"
                  type="button"
                  class="p-1 rounded transition-colors"
                  :class="form.rating >= i ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'"
                  @click="form.rating = i"
                >
                  <UIcon :name="form.rating >= i ? 'i-heroicons-star-solid' : 'i-heroicons-star'" class="w-8 h-8" />
                </button>
              </div>
            </UFormField>
            <UFormField v-if="eligibleAppointments.length > 1" label="Rendez-vous concerné">
              <USelect
                v-model="form.appointment_id"
                :items="eligibleAppointmentOptions"
                value-key="value"
                placeholder="Choisir un rendez-vous"
              />
            </UFormField>
            <UFormField label="Commentaire (optionnel)">
              <UTextarea
                v-model="form.comment"
                placeholder="Décrivez votre expérience..."
                :rows="4"
              />
            </UFormField>
            <div class="flex gap-3 pt-2">
              <UButton type="button" variant="outline" color="neutral" block @click="reviewModalOpen = false">
                Annuler
              </UButton>
              <UButton type="submit" color="primary" block :loading="submitting">
                Envoyer l'avis
              </UButton>
            </div>
          </form>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

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
  revieweeId?: string;
  revieweeType?: 'nurse' | 'subaccount';
}

const props = defineProps<Props>();
const emit = defineEmits<{ submitted: [] }>();

const { isAuthenticated, user } = useAuth();
const toast = useAppToast();

const reviewModalOpen = ref(false);
const eligibleLoading = ref(false);
const eligibleAppointments = ref<any[]>([]);
const submitting = ref(false);

const form = reactive({
  rating: 0,
  comment: '',
  appointment_id: '' as string,
});

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatAptLabel(apt: any) {
  const d = apt.scheduled_at ? new Date(apt.scheduled_at).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) : apt.id;
  return `RDV du ${d}`;
}

const eligibleAppointmentOptions = computed(() =>
  eligibleAppointments.value.map((a: any) => ({ value: a.id, label: formatAptLabel(a) }))
);

async function openReviewModal() {
  reviewModalOpen.value = true;
  if (!isAuthenticated.value || user.value?.role !== 'patient' || !props.revieweeId || !props.revieweeType) {
    eligibleAppointments.value = [];
    return;
  }
  eligibleLoading.value = true;
  eligibleAppointments.value = [];
  form.rating = 0;
  form.comment = '';
  form.appointment_id = '';
  try {
    const [appointmentsRes, reviewsRes] = await Promise.all([
      apiFetch('/appointments?status=completed&limit=100', { method: 'GET' }),
      apiFetch(`/reviews?reviewee_id=${props.revieweeId}&reviewee_type=${props.revieweeType}&limit=100`, { method: 'GET' }),
    ]);
    const appointments = (appointmentsRes as any)?.data ?? [];
    const myReviewedIds = new Set<string>();
    const reviewsData = (reviewsRes as any)?.data ?? [];
    const myId = user.value?.id;
    reviewsData.forEach((r: any) => {
      if (r.patient_id === myId) myReviewedIds.add(r.appointment_id);
    });
    const revieweeId = props.revieweeId;
    const revieweeType = props.revieweeType;
    const eligible = appointments.filter((a: any) => {
      if (myReviewedIds.has(a.id)) return false;
      if (revieweeType === 'nurse') return a.assigned_nurse_id === revieweeId;
      return a.assigned_lab_id === revieweeId || a.assigned_to === revieweeId;
    });
    eligibleAppointments.value = eligible;
    if (eligible.length > 0) form.appointment_id = eligible[0].id;
  } catch (e) {
    toast.add({ title: 'Erreur', description: 'Impossible de charger les rendez-vous', color: 'red' });
  } finally {
    eligibleLoading.value = false;
  }
}

async function submitReview() {
  if (form.rating < 1 || form.rating > 5 || !form.appointment_id || !props.revieweeId || !props.revieweeType) {
    toast.add({ title: 'Veuillez sélectionner une note', color: 'red' });
    return;
  }
  submitting.value = true;
  try {
    await apiFetch('/reviews', {
      method: 'POST',
      body: {
        appointment_id: form.appointment_id,
        reviewee_id: props.revieweeId,
        reviewee_type: props.revieweeType,
        rating: form.rating,
        comment: form.comment.trim() || undefined,
      },
    });
    toast.add({ title: 'Avis enregistré', color: 'green' });
    reviewModalOpen.value = false;
    emit('submitted');
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err?.data?.error || err?.message || 'Impossible d\'enregistrer l\'avis',
      color: 'red',
    });
  } finally {
    submitting.value = false;
  }
}
</script>


