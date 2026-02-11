<template>
  <!-- État de chargement -->
  <div v-if="loading" class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
    <div class="text-center space-y-4">
      <div class="relative">
        <UIcon name="i-lucide-loader-2" class="w-12 h-12 animate-spin text-primary-500 mx-auto" />
        <div class="absolute inset-0 w-12 h-12 border-4 border-primary-100 dark:border-primary-900 rounded-full animate-pulse mx-auto"></div>
      </div>
      <p class="text-sm font-medium text-gray-600 dark:text-gray-400 animate-pulse">
        Chargement du profil...
      </p>
    </div>
  </div>
  
  <!-- État d'erreur -->
  <div v-else-if="error" class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
    <UCard class="max-w-md w-full shadow-xl border-0 ring-1 ring-gray-200 dark:ring-gray-800">
      <div class="text-center py-8 px-6">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 mb-6">
          <UIcon name="i-lucide-alert-circle" class="w-8 h-8 text-red-500 dark:text-red-400" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Profil introuvable
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          {{ error }}
        </p>
        <UButton 
          to="/" 
          color="primary" 
          size="lg"
          class="w-full sm:w-auto"
          trailing-icon="i-lucide-arrow-right"
        >
          Retour à l'accueil
        </UButton>
      </div>
    </UCard>
  </div>

  <!-- Contenu principal -->
  <div v-else-if="profile" class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
    <!-- En-tête -->
    <PublicProfileHeader 
      :profile="{
        ...profile,
        reviews: profile.reviews
      }" 
    />

    <!-- Contenu principal avec espacement optimisé -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <!-- Colonne principale -->
        <div class="lg:col-span-2 space-y-6 lg:space-y-8">
          <!-- Biographie -->
          <UCard 
            v-if="profile.biography" 
            class="shadow-sm hover:shadow-md transition-shadow duration-300 border-0 ring-1 ring-gray-200 dark:ring-gray-800"
            :ui="{ body: { padding: 'p-6 lg:p-8' } }"
          >
            <PublicProfileBio :biography="profile.biography" />
          </UCard>

          <!-- Soins proposés -->
          <UCard 
            v-if="profile.specializations && profile.specializations.length > 0"
            class="shadow-sm hover:shadow-md transition-shadow duration-300 border-0 ring-1 ring-gray-200 dark:ring-gray-800"
            :ui="{ body: { padding: 'p-6 lg:p-8' } }"
          >
            <PublicProfileServices :specializations="profile.specializations" />
          </UCard>

          <!-- Avis -->
          <UCard 
            class="shadow-sm hover:shadow-md transition-shadow duration-300 border-0 ring-1 ring-gray-200 dark:ring-gray-800"
            :ui="{ body: { padding: 'p-6 lg:p-8' } }"
          >
            <PublicProfileReviews :reviews="profile.reviews" />
          </UCard>

          <!-- FAQ -->
          <UCard 
            v-if="faqToDisplay && faqToDisplay.length > 0"
            class="shadow-sm hover:shadow-md transition-shadow duration-300 border-0 ring-1 ring-gray-200 dark:ring-gray-800"
            :ui="{ body: { padding: 'p-6 lg:p-8' } }"
          >
            <PublicProfileFAQ :faq="faqToDisplay" />
          </UCard>
        </div>

        <!-- Sidebar avec sticky positioning -->
        <div class="lg:col-span-1">
          <div class="sticky top-20 sm:top-24 space-y-6 z-40">
            <!-- CTA Principal -->
            <UCard 
              class="shadow-md hover:shadow-lg border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900 transition-all duration-300 group"
              :ui="{ body: { padding: 'p-0' } }"
            >
              <div class="p-6 sm:p-7 lg:p-8 text-center">
                <!-- Espacement vertical précis -->
                <div class="space-y-6">
                  <!-- Icône calendrier avec espacement soigné -->
                  <div class="flex justify-center">
                    <div class="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 transition-colors duration-300">
                      <UIcon name="i-lucide-calendar-plus" class="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                  </div>

                  <!-- Titre avec typographie soignée -->
                  <div class="space-y-2.5">
                    <h3 class="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
                      Prendre rendez-vous
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                      Réservez votre consultation rapidement et en toute sécurité
                    </p>
                  </div>

                  <!-- Bouton CTA -->
                  <div>
                    <UButton 
                      to="/rendez-vous/nouveau" 
                      color="primary"
                      size="lg"
                      block
                    >
                      <UIcon name="i-lucide-calendar-plus" class="h-4 w-4 mr-2" />
                      Prendre rendez-vous
                    </UButton>
                  </div>

                  <!-- Badge sécurité avec espacement précis -->
                  <div class="flex items-center justify-center gap-1.5 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <UIcon name="i-lucide-shield-check" class="w-3.5 h-3.5 text-primary-500 dark:text-primary-400 flex-shrink-0" />
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Réservation sécurisée</span>
                  </div>
                </div>
              </div>
            </UCard>

            <!-- Statistiques avis -->
            <UCard 
              v-if="profile.reviews?.stats && profile.reviews.stats.total_reviews > 0"
              class="shadow-sm border-0 ring-1 ring-gray-200 dark:ring-gray-800"
              :ui="{ body: { padding: 'p-6' } }"
            >
              <div class="space-y-4">
                <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <UIcon name="i-lucide-star" class="w-5 h-5 text-yellow-500" />
                  Note moyenne
                </h3>
                <div class="flex items-baseline gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                  <div class="text-4xl font-bold text-gray-900 dark:text-white">
                    {{ profile.reviews.stats.average_rating.toFixed(1) }}
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center gap-1 mb-2">
                      <UIcon 
                        v-for="i in 5" 
                        :key="i"
                        :name="i <= Math.round(profile.reviews.stats.average_rating) ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                        :class="[
                          'w-5 h-5 transition-colors',
                          i <= Math.round(profile.reviews.stats.average_rating) 
                            ? 'text-yellow-400' 
                            : 'text-gray-300 dark:text-gray-700'
                        ]"
                      />
                    </div>
                    <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Basé sur {{ profile.reviews.stats.total_reviews }} 
                      {{ profile.reviews.stats.total_reviews > 1 ? 'avis' : 'avis' }}
                    </p>
                  </div>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

const route = useRoute();
const config = useRuntimeConfig();

const profile = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// FAQ par défaut pour les infirmiers
const defaultNurseFaq = [
  {
    question: 'Quels sont vos horaires d\'intervention ?',
    answer: 'Je suis disponible du lundi au vendredi de 8h à 18h, et le samedi de 9h à 13h.',
  },
  {
    question: 'Intervenez-vous à domicile ?',
    answer: 'Oui, je me déplace à votre domicile pour tous types de soins infirmiers.',
  },
  {
    question: 'Acceptez-vous les nouveaux patients ?',
    answer: 'Oui, j\'accepte de nouveaux patients. N\'hésitez pas à me contacter pour prendre rendez-vous.',
  },
  {
    question: 'Comment prendre rendez-vous ?',
    answer: 'Vous pouvez prendre rendez-vous directement sur cette plateforme ou me contacter par téléphone.',
  },
  {
    question: 'Quels types de soins proposez-vous ?',
    answer: 'Je propose une large gamme de soins infirmiers : pansements, injections, prises de sang, perfusions, et bien d\'autres.',
  },
];

// FAQ à afficher (personnalisée ou par défaut)
const faqToDisplay = computed(() => {
  if (profile.value?.faq && Array.isArray(profile.value.faq) && profile.value.faq.length > 0) {
    return profile.value.faq;
  }
  return defaultNurseFaq;
});

// Meta tags dynamiques
useHead({
  title: computed(() => profile.value ? `${profile.value.name} - Infirmier à domicile | OneAndLab` : 'Profil infirmier | OneAndLab'),
  meta: [
    {
      name: 'description',
      content: computed(() => {
        if (!profile.value) return 'Profil infirmier sur OneAndLab';
        const bio = profile.value.biography ? profile.value.biography.substring(0, 160) : '';
        return bio || `Infirmier${profile.value.gender === 'female' ? 'e' : ''} à domicile ${profile.value.name} sur OneAndLab`;
      }),
    },
    {
      property: 'og:title',
      content: computed(() => profile.value ? `${profile.value.name} - Infirmier à domicile` : 'Profil infirmier'),
    },
    {
      property: 'og:description',
      content: computed(() => {
        if (!profile.value) return 'Profil infirmier sur OneAndLab';
        return profile.value.biography?.substring(0, 200) || `Infirmier${profile.value.gender === 'female' ? 'e' : ''} à domicile ${profile.value.name}`;
      }),
    },
    {
      property: 'og:image',
      content: computed(() => profile.value?.profile_image_url || '/images/onelogo.png'),
    },
    {
      property: 'og:type',
      content: 'profile',
    },
  ],
});

// Fetch du profil en SSR
const fetchProfile = async () => {
  loading.value = true;
  error.value = null;

  try {
    const slug = route.params.slug as string;
    const apiBase = config.public.apiBase || 'http://localhost:8888/api';
    const url = `${apiBase}/public/nurse/${slug}`;
    
    // #region agent log - FIX: Debug frontend fetch
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'post-fix',
          hypothesisId: 'FIX',
          location: 'infirmier/[slug].vue:173',
          message: 'Fetching profile',
          data: { slug, url, isServer: process.server },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
    
    const response = await $fetch(url, {
      method: 'GET',
    });

    // #region agent log - FIX: Debug response
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'post-fix',
          hypothesisId: 'FIX',
          location: 'infirmier/[slug].vue:190',
          message: 'Profile response received',
          data: { 
            success: response?.success, 
            hasData: !!response?.data,
            error: response?.error,
            responseKeys: response ? Object.keys(response) : [],
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion

    if (response.success && response.data) {
      const data = response.data;
      
      // #region agent log - HYP C: Check profile data after fetch
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'C',
            location: 'infirmier/[slug].vue:334',
            message: 'Profile data after fetch',
            data: {
              hasSpecializations: !!data.specializations,
              specializationsType: typeof data.specializations,
              specializationsIsArray: Array.isArray(data.specializations),
              specializationsLength: data.specializations?.length || 0,
              specializations: data.specializations,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion
      
      profile.value = {
        ...data,
        role: 'nurse',
        name: `${data.first_name} ${data.last_name}`,
        faq: data.faq ? (typeof data.faq === 'string' ? JSON.parse(data.faq) : data.faq) : [],
      };
    } else {
      error.value = response.error || 'Profil introuvable';
    }
  } catch (err: any) {
    console.error('Erreur lors du chargement du profil:', err);
    
    // #region agent log - FIX: Debug error
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'post-fix',
          hypothesisId: 'FIX',
          location: 'infirmier/[slug].vue:210',
          message: 'Profile fetch error',
          data: { 
            errorMessage: err?.message,
            errorData: err?.data,
            errorStatus: err?.status,
            errorStatusText: err?.statusText,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
    
    error.value = err.data?.error || err.message || 'Erreur lors du chargement du profil';
  } finally {
    loading.value = false;
  }
};

// Charger les données au montage (SSR)
await fetchProfile();
</script>
