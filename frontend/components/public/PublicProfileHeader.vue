<template>
  <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 relative">
    <!-- Image de couverture avec contenu intégré -->
    <div class="relative w-full h-64 sm:h-72 md:h-80 bg-gradient-to-r from-primary-500 to-primary-600 overflow-hidden">
      <!-- Image de couverture -->
      <div 
        v-if="profile.cover_image_url && !coverImageError"
        class="absolute inset-0 w-full h-full"
      >
        <img 
          :src="profile.cover_image_url"
          alt="Image de couverture"
          class="w-full h-full object-cover"
          @error="handleCoverImageError"
        />
      </div>
      <!-- Gradient de fallback -->
      <div 
        v-else
        class="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700"
      ></div>

      <!-- Overlay sombre pour améliorer la lisibilité -->
      <div class="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-black/40"></div>

      <!-- Bouton Partager (en haut à droite) -->
      <div v-if="shareUrl" class="absolute top-4 right-4 sm:top-5 sm:right-6 z-10">
        <PublicProfileShare
          :share-url="shareUrl"
          :profile-name="shareProfileName ?? profile.name"
          :profile-type="shareProfileType ?? (profile.role === 'nurse' ? 'nurse' : 'lab')"
          :address="shareAddress"
          compact
        />
      </div>

      <!-- Contenu intégré dans l'image -->
      <div class="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-6">
        <div class="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          <!-- Avatar -->
          <div class="flex-shrink-0">
            <div class="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-800 overflow-hidden shadow-xl">
              <img 
                v-if="profile.profile_image_url && !profileImageError"
                :src="profile.profile_image_url"
                :alt="`Photo de ${profile.name}`"
                class="w-full h-full object-cover"
                @error="handleProfileImageError"
              />
              <div 
                v-else
                class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600"
              >
                <UIcon 
                  :name="profile.role === 'nurse' ? 'i-lucide-stethoscope' : 'i-lucide-flask-conical'" 
                  class="w-12 h-12 sm:w-16 sm:h-16 text-white" 
                />
              </div>
            </div>
          </div>

          <!-- Informations principales : Nom → Avis → Disponibilité -->
          <div class="flex-1 min-w-0 pb-1">
            <h1 class="text-2xl sm:text-3xl md:text-4xl font-normal text-white mb-2 drop-shadow-lg">
              {{ profile.name }}
            </h1>

            <!-- Avis (sous le nom) -->
            <div 
              v-if="profile.reviews?.stats && profile.reviews.stats.total_reviews > 0"
              class="flex items-center gap-4 flex-wrap mb-2"
            >
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-0.5">
                  <UIcon 
                    v-for="i in 5" 
                    :key="i"
                    :name="i <= Math.round(profile.reviews.stats.average_rating) ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                    :class="[
                      'w-4 h-4',
                      i <= Math.round(profile.reviews.stats.average_rating) 
                        ? 'text-yellow-300' 
                        : 'text-white/40'
                    ]"
                  />
                </div>
                <span class="text-sm font-normal text-white drop-shadow-md">
                  {{ profile.reviews.stats.average_rating.toFixed(1) }}
                </span>
              </div>
              <div class="w-1 h-1 rounded-full bg-white/60" />
              <div class="flex items-center gap-1.5">
                <UIcon name="i-lucide-message-square" class="w-4 h-4 text-white/90" />
                <span class="text-sm text-white/90 drop-shadow-md">
                  {{ profile.reviews.stats.total_reviews }}
                  {{ profile.reviews.stats.total_reviews > 1 ? 'avis' : 'avis' }}
                </span>
              </div>
            </div>
            <div
              v-else
              class="flex items-center gap-1.5 text-sm text-white/80 drop-shadow-md mb-2"
            >
              <UIcon name="i-lucide-message-square" class="w-4 h-4 shrink-0" />
              <span>Aucun avis pour le moment</span>
            </div>

            <!-- Disponibilité (badge transparent, sans répéter le nom) -->
            <span
              :class="[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm',
                isAccepting
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-white/10 text-white/90 border border-white/20'
              ]"
            >
              <span
                :class="[
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  isAccepting ? 'bg-emerald-300' : 'bg-amber-400'
                ]"
              />
              {{ isAccepting ? 'Accepte les rendez-vous' : 'Indisponible' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  profile: {
    name: string;
    profile_image_url?: string | null;
    cover_image_url?: string | null;
    role: 'nurse' | 'subaccount';
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
  shareProfileType?: 'nurse' | 'lab';
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
