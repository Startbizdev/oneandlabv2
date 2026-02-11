<template>
  <div class="space-y-6">
    <TitleDashboard title="Gestion des avis" description="Modérez les avis laissés par les patients sur les professionnels." />

    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher par patient, professionnel, commentaire..."
        class="flex-1"
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        placeholder="Visibilité"
        class="w-full sm:w-48"
      />
      <USelect
        v-model="ratingFilter"
        :items="ratingOptions"
        placeholder="Note"
        class="w-full sm:w-40"
      />
    </div>

    <div class="rounded-xl border border-default/50 bg-default shadow-sm overflow-hidden">
      <UTable :data="filteredReviews" :columns="columns" :loading="loading">
        <template #rating-data="{ row }">
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-0.5">
              <UIcon
                v-for="i in 5"
                :key="i"
                :name="i <= row.rating ? 'i-lucide-star' : 'i-lucide-star'"
                :class="i <= row.rating ? 'text-amber-500 fill-amber-500' : 'text-muted'"
                class="w-4 h-4"
              />
            </div>
            <UBadge :color="getRatingBadgeColor(row.rating)" variant="subtle" size="xs">
              {{ getRatingLabel(row.rating) }}
            </UBadge>
          </div>
        </template>
        <template #comment-data="{ row }">
          <p class="text-sm text-muted max-w-[280px] truncate" :title="row.comment">
            {{ row.comment || '—' }}
          </p>
        </template>
        <template #is_visible-data="{ row }">
          <UBadge :color="row.is_visible ? 'green' : 'gray'" variant="subtle" size="sm">
            {{ row.is_visible ? 'Visible' : 'Masqué' }}
          </UBadge>
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="sm" variant="outline" @click="viewReview(row)">
              Détails
            </UButton>
            <UButton
              size="sm"
              :color="row.is_visible ? 'orange' : 'green'"
              variant="outline"
              @click="toggleVisibility(row)"
            >
              {{ row.is_visible ? 'Masquer' : 'Afficher' }}
            </UButton>
          </div>
        </template>
        <template #empty>
          <div class="py-12">
            <UEmpty
              icon="i-lucide-star"
              title="Aucun avis"
              description="Aucun avis ne correspond à vos critères. Modifiez les filtres."
              :actions="[{ label: 'Réinitialiser les filtres', variant: 'outline', onClick: () => { statusFilter = 'all'; ratingFilter = 'all'; searchQuery = ''; } }]"
              variant="naked"
            />
          </div>
        </template>
      </UTable>
    </div>

    <ClientOnly>
      <Teleport to="body">
        <UModal v-model:open="showDetailsModal">
          <UCard v-if="selectedReview">
            <template #header>
              <h2 class="text-xl font-bold">Détails de l'avis</h2>
            </template>
            <div class="space-y-4">
              <div>
                <p class="text-sm text-muted">Patient</p>
                <p class="font-semibold">{{ selectedReview.reviewer_name }}</p>
              </div>
              <div>
                <p class="text-sm text-muted">Professionnel</p>
                <p class="font-semibold">{{ selectedReview.reviewee_name }}</p>
              </div>
              <div>
                <p class="text-sm text-muted">Note</p>
                <div class="flex items-center gap-0.5">
                  <UIcon
                    v-for="i in 5"
                    :key="i"
                    :name="i <= selectedReview.rating ? 'i-lucide-star' : 'i-lucide-star'"
                    :class="i <= selectedReview.rating ? 'text-amber-500 fill-amber-500' : 'text-muted'"
                    class="w-5 h-5"
                  />
                </div>
              </div>
              <div>
                <p class="text-sm text-muted">Commentaire</p>
                <p class="mt-1">{{ selectedReview.comment || '—' }}</p>
              </div>
              <div v-if="selectedReview.response">
                <p class="text-sm text-muted">Réponse du professionnel</p>
                <p class="mt-1 p-3 bg-muted/50 rounded">{{ selectedReview.response }}</p>
              </div>
              <div>
                <p class="text-sm text-muted">Date</p>
                <p>{{ formatDate(selectedReview.created_at) }}</p>
              </div>
              <div class="flex gap-2 pt-4">
                <UButton
                  :color="selectedReview.is_visible ? 'orange' : 'green'"
                  @click="toggleVisibility(selectedReview); showDetailsModal = false"
                >
                  {{ selectedReview.is_visible ? 'Masquer' : 'Afficher' }}
                </UButton>
                <UButton variant="ghost" @click="showDetailsModal = false">Fermer</UButton>
              </div>
            </div>
          </UCard>
        </UModal>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

import { apiFetch } from '~/utils/api';
const toast = useToast();

const reviews = ref<any[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const statusFilter = ref('all');
const ratingFilter = ref('all');
const showDetailsModal = ref(false);
const selectedReview = ref<any>(null);

const statusOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'Visibles', value: 'visible' },
  { label: 'Masqués', value: 'hidden' },
];

const ratingOptions = [
  { label: 'Toutes notes', value: 'all' },
  { label: '5 étoiles', value: '5' },
  { label: '4 étoiles', value: '4' },
  { label: '3 étoiles', value: '3' },
  { label: '2 étoiles', value: '2' },
  { label: '1 étoile', value: '1' },
];

const columns = [
  { id: 'reviewer_name', accessorKey: 'reviewer_name', header: 'Patient' },
  { id: 'reviewee_name', accessorKey: 'reviewee_name', header: 'Professionnel' },
  { id: 'rating', accessorKey: 'rating', header: 'Note' },
  { id: 'comment', accessorKey: 'comment', header: 'Commentaire' },
  { id: 'is_visible', accessorKey: 'is_visible', header: 'Statut' },
  { id: 'created_at', accessorKey: 'created_at', header: 'Date' },
  { id: 'actions', accessorKey: 'actions', header: 'Actions' },
];

const filteredReviews = computed(() => {
  let filtered = reviews.value;
  if (statusFilter.value === 'visible') filtered = filtered.filter(r => r.is_visible);
  else if (statusFilter.value === 'hidden') filtered = filtered.filter(r => !r.is_visible);
  if (ratingFilter.value !== 'all') {
    filtered = filtered.filter(r => r.rating === parseInt(ratingFilter.value));
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(r =>
      r.reviewer_name?.toLowerCase().includes(query) ||
      r.reviewee_name?.toLowerCase().includes(query) ||
      r.comment?.toLowerCase().includes(query)
    );
  }
  return filtered;
});

onMounted(async () => {
  await fetchReviews();
});

const fetchReviews = async () => {
  loading.value = true;
  try {
    const response = await apiFetch('/reviews', { method: 'GET' });
    if (response.success && response.data) {
      reviews.value = response.data;
    }
  } catch (error) {
    console.error('Erreur chargement avis:', error);
    toast.add({ title: 'Erreur de chargement', color: 'red' });
  } finally {
    loading.value = false;
  }
};

const viewReview = (review: any) => {
  selectedReview.value = review;
  showDetailsModal.value = true;
};

const toggleVisibility = async (review: any) => {
  try {
    await apiFetch(`/reviews/${review.id}/moderate`, {
      method: 'PUT',
      body: { is_visible: !review.is_visible },
    });
    toast.add({
      title: review.is_visible ? 'Avis masqué' : 'Avis affiché',
      color: 'green',
    });
    await fetchReviews();
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  }
};

const getRatingBadgeColor = (rating: number) => {
  if (rating >= 5) return 'green';
  if (rating >= 4) return 'blue';
  if (rating >= 3) return 'yellow';
  if (rating >= 2) return 'orange';
  return 'red';
};

const getRatingLabel = (rating: number) => {
  if (rating >= 5) return 'Excellent';
  if (rating >= 4) return 'Très bien';
  if (rating >= 3) return 'Bien';
  if (rating >= 2) return 'Moyen';
  return 'Faible';
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('fr-FR');
};
</script>
