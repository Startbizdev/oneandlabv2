<template>
  <header class="relative border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
    <img v-if="profile.cover_image_url && !coverImageError" :src="profile.cover_image_url" alt="" class="h-36 w-full object-cover sm:h-48" @error="handleCoverImageError" />
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div class="flex items-start justify-between gap-4">
        <div class="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div class="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 sm:h-24 sm:w-24">
            <img v-if="profile.profile_image_url && !profileImageError" :src="profile.profile_image_url" :alt="`Photo de ${profile.name}`" class="h-full w-full object-cover" @error="handleProfileImageError" />
            <div v-else class="flex h-full w-full items-center justify-center text-primary-700 dark:text-primary-400"><UIcon :name="profile.role === 'nurse' ? 'i-lucide-stethoscope' : profile.role === 'pro' ? 'i-lucide-user-round' : 'i-lucide-flask-conical'" class="h-9 w-9" aria-hidden="true" /></div>
          </div>
          <div class="min-w-0 flex-1 space-y-2">
            <h1 class="break-words text-2xl font-semibold leading-tight text-gray-950 dark:text-white sm:text-3xl">{{ profile.name }}</h1>
            <div v-if="profile.reviews?.stats && profile.reviews.stats.total_reviews > 0" class="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <UIcon name="i-lucide-star" class="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span>{{ Number(profile.reviews.stats.average_rating).toFixed(1) }} / 5 · {{ profile.reviews.stats.total_reviews }} avis</span>
            </div>
            <p v-else class="text-sm text-gray-500">Aucun avis pour le moment</p>
            <p class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><span class="h-2 w-2 shrink-0 rounded-full" :class="isAccepting ? 'bg-primary-500' : 'bg-gray-400'" aria-hidden="true" />{{ isAccepting ? 'Accepte les rendez-vous' : 'Indisponible pour le moment' }}</p>
          </div>
        </div>
        <PublicProfileShare v-if="shareUrl" :share-url="shareUrl" :profile-name="shareProfileName ?? profile.name" :profile-type="shareProfileType ?? (profile.role === 'nurse' ? 'nurse' : profile.role === 'pro' ? 'pro' : 'lab')" :address="shareAddress" compact />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
interface Props {
  profile: {
    name: string;
    profile_image_url?: string | null;
    cover_image_url?: string | null;
    role: 'nurse' | 'subaccount' | 'pro';
    gender?: string;
    reviews?: {
      stats?: {
        total_reviews: number;
        average_rating: number;
      };
    };
  };
  /** Disponibilité : affiché en badge sous les avis (sans répéter le nom) */
  isAccepting?: boolean;
  /** Optionnel : affiche le bouton Partager en haut à droite */
  shareUrl?: string;
  shareProfileName?: string;
  shareProfileType?: 'nurse' | 'lab' | 'pro';
  shareAddress?: string | null;
}

const props = withDefaults(defineProps<Props>(), { isAccepting: true });

const coverImageError = ref(false);
const profileImageError = ref(false);

// Gérer les erreurs de chargement d'images
const handleCoverImageError = () => {
  coverImageError.value = true;
};

const handleProfileImageError = () => {
  profileImageError.value = true;
};

// Réinitialiser les erreurs si l'URL change
watch(() => props.profile.cover_image_url, () => {
  coverImageError.value = false;
});

watch(() => props.profile.profile_image_url, () => {
  profileImageError.value = false;
});
</script>
