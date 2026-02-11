<template>
  <div v-if="loading" class="min-h-screen flex items-center justify-center">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
  </div>
  
  <div v-else-if="error" class="min-h-screen flex items-center justify-center">
    <UCard class="max-w-md">
      <div class="text-center">
        <UIcon name="i-lucide-alert-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Profil introuvable</h1>
        <p class="text-gray-600 dark:text-gray-400 mb-4">{{ error }}</p>
        <UButton to="/" color="primary">Retour à l'accueil</UButton>
      </div>
    </UCard>
  </div>

  <div v-else-if="profile" class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- En-tête -->
    <PublicProfileHeader :profile="profile" />

    <!-- Contenu principal -->
    <div class="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Colonne principale -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Biographie -->
          <PublicProfileBio :biography="profile.biography" />

          <!-- Services -->
          <div v-if="profile.services && profile.services.length > 0" class="space-y-4">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Services proposés</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <UBadge
                v-for="service in profile.services"
                :key="service.id"
                color="primary"
                variant="subtle"
                size="lg"
                class="justify-start"
              >
                <UIcon name="i-lucide-check-circle" class="w-4 h-4 mr-2" />
                {{ service.name }}
              </UBadge>
            </div>
          </div>

          <!-- Avis -->
          <PublicProfileReviews :reviews="profile.reviews" />
        </div>

        <!-- Sidebar -->
        <div class="lg:col-span-1">
          <UCard class="sticky top-4">
            <div class="space-y-6">
              <!-- CTA -->
              <div>
                <UButton 
                  to="/rendez-vous/nouveau" 
                  color="primary" 
                  size="lg" 
                  block
                  class="mb-4"
                >
                  Prendre rendez-vous
                </UButton>
              </div>

              <!-- Statistiques avis -->
              <div v-if="profile.reviews?.stats && profile.reviews.stats.total_reviews > 0" class="border-t border-gray-200 dark:border-gray-800 pt-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Note moyenne
                </h3>
                <div class="flex items-center gap-3 mb-4">
                  <div class="text-3xl font-bold text-gray-900 dark:text-white">
                    {{ profile.reviews.stats.average_rating.toFixed(1) }}
                  </div>
                  <div class="flex">
                    <UIcon 
                      v-for="i in 5" 
                      :key="i"
                      :name="i <= Math.round(profile.reviews.stats.average_rating) ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                      class="text-yellow-400 w-5 h-5"
                    />
                  </div>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Basé sur {{ profile.reviews.stats.total_reviews }} avis
                </p>
              </div>

              <!-- FAQ -->
              <PublicProfileFAQ :faq="faqToDisplay" />
            </div>
          </UCard>
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

// FAQ par défaut pour les laboratoires
const defaultLabFaq = [
  {
    question: 'Quels sont vos horaires d\'ouverture ?',
    answer: 'Nous sommes ouverts du lundi au vendredi de 7h à 19h, et le samedi de 8h à 12h.',
  },
  {
    question: 'Proposez-vous des prélèvements à domicile ?',
    answer: 'Oui, nous effectuons des prélèvements à domicile sur rendez-vous dans notre zone de couverture.',
  },
  {
    question: 'Faut-il être à jeun pour une prise de sang ?',
    answer: 'Cela dépend des analyses prescrites. Votre médecin vous indiquera si le jeûne est nécessaire.',
  },
  {
    question: 'Comment prendre rendez-vous ?',
    answer: 'Vous pouvez prendre rendez-vous directement sur notre plateforme en ligne ou nous contacter par téléphone.',
  },
  {
    question: 'Quels types d\'analyses proposez-vous ?',
    answer: 'Nous réalisons tous types d\'analyses médicales : biologie courante, biochimie, hématologie, sérologie, et bien plus.',
  },
];

// FAQ à afficher (personnalisée ou par défaut)
const faqToDisplay = computed(() => {
  if (profile.value?.faq && Array.isArray(profile.value.faq) && profile.value.faq.length > 0) {
    return profile.value.faq;
  }
  return defaultLabFaq;
});

// Meta tags dynamiques
useHead({
  title: computed(() => profile.value ? `${profile.value.name} - Laboratoire de prélèvements | OneAndLab` : 'Profil laboratoire | OneAndLab'),
  meta: [
    {
      name: 'description',
      content: computed(() => {
        if (!profile.value) return 'Profil laboratoire sur OneAndLab';
        const bio = profile.value.biography ? profile.value.biography.substring(0, 160) : '';
        return bio || `Laboratoire de prélèvements ${profile.value.name} sur OneAndLab`;
      }),
    },
    {
      property: 'og:title',
      content: computed(() => profile.value ? `${profile.value.name} - Laboratoire de prélèvements` : 'Profil laboratoire'),
    },
    {
      property: 'og:description',
      content: computed(() => {
        if (!profile.value) return 'Profil laboratoire sur OneAndLab';
        return profile.value.biography?.substring(0, 200) || `Laboratoire de prélèvements ${profile.value.name}`;
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
    
    const response = await $fetch(`${apiBase}/public/lab/${slug}`, {
      method: 'GET',
    });

    if (response.success && response.data) {
      const data = response.data;
      profile.value = {
        ...data,
        role: 'subaccount',
        name: data.first_name || data.last_name || 'Laboratoire',
        faq: data.faq ? (typeof data.faq === 'string' ? JSON.parse(data.faq) : data.faq) : [],
      };
    } else {
      error.value = response.error || 'Profil introuvable';
    }
  } catch (err: any) {
    console.error('Erreur lors du chargement du profil:', err);
    error.value = err.data?.error || 'Erreur lors du chargement du profil';
  } finally {
    loading.value = false;
  }
};

// Charger les données au montage (SSR)
await fetchProfile();
</script>
