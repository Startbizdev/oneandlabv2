<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Mes avis"
      description="Les avis que vous avez laissés après vos rendez-vous"
    />

    <div class="container mx-auto px-4 max-w-7xl">
    <div v-if="loading" class="text-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
      <p class="text-gray-500">Chargement des avis...</p>
    </div>

    <div v-else-if="reviews.length === 0" class="text-center py-12">
      <UIcon name="i-lucide-star" class="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">Aucun avis</h3>
      <p class="text-gray-500 mb-6">Vous n'avez pas encore laissé d'avis. Après un rendez-vous, vous pourrez partager votre expérience.</p>
      <UButton
        color="primary"
        icon="i-lucide-calendar"
        size="xl"
        to="/patient"
      >
        Voir mes rendez-vous
      </UButton>
    </div>

    <div v-else class="space-y-4">
      <UCard 
        v-for="review in reviews" 
        :key="review.id"
        class="hover:shadow-md transition-shadow"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2 flex-wrap">
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

            <div class="text-sm text-gray-600 space-y-1 mb-2">
              <p v-if="review.appointment_type || review.category_name">
                <span class="font-medium text-gray-800">{{ appointmentTypeLabel(review.appointment_type) }}</span>
                <span v-if="review.category_name"> · {{ review.category_name }}</span>
              </p>
              <p v-if="review.appointment_scheduled_at" class="text-xs text-gray-500">
                Rendez-vous du {{ formatAppointmentDate(review.appointment_scheduled_at) }}
              </p>
              <NuxtLink
                v-if="review.appointment_id"
                :to="`/patient/appointments/${review.appointment_id}`"
                class="text-xs text-primary-600 hover:underline inline-flex items-center gap-1"
              >
                <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
                Voir le rendez-vous
              </NuxtLink>
            </div>
            
            <p v-if="review.comment" class="text-gray-700 mb-2">
              {{ review.comment }}
            </p>
            
            <div v-if="review.response" class="mt-3 p-3 bg-gray-50 rounded">
              <div class="text-sm font-normal mb-1">Réponse du professionnel :</div>
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

function appointmentTypeLabel(type: string | null | undefined) {
  if (type === 'blood_test') return 'Prise de sang';
  if (type === 'nursing' || type === 'nurse') return 'Soins infirmiers';
  return type ? String(type) : 'Rendez-vous';
}

function formatAppointmentDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

