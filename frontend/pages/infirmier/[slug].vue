<template>
  <PublicProfileLayout
    :loading="loading"
    :error="error"
    :profile="profile"
    :faq-items="faqToDisplay"
    :address="profile?.address ?? profile?.city_plain ?? null"
    :map-center="profile?.map_center ?? null"
    :radius-km="profile?.radius_km ?? null"
    type="nurse"
    @review-submitted="fetchProfile"
  />
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

// FAQ par défaut pour les infirmiers (généraliste, SEO, sans horaires ni infos non disponibles)
const defaultNurseFaq = [
  {
    question: 'Infirmier à domicile : comment ça se passe ?',
    answer: 'L\'infirmier libéral se déplace à votre domicile pour réaliser les soins prescrits par votre médecin : pansements, injections, prise de sang, perfusions, surveillance. Vous restez chez vous, dans un cadre familier.',
  },
  {
    question: 'Quels soins infirmiers à domicile sont possibles ?',
    answer: 'Soins courants à domicile : pansements et plaies, injections et perfusions, prise de sang, surveillance des constantes, pose de cathéters, éducation thérapeutique. La prescription médicale définit les actes réalisés.',
  },
  {
    question: 'Faut-il une ordonnance pour un infirmier à domicile ?',
    answer: 'Oui, les soins infirmiers à domicile sont réalisés sur prescription médicale. Votre médecin prescrit les actes nécessaires ; l\'infirmier libéral intervient selon cette ordonnance.',
  },
  {
    question: 'Comment prendre rendez-vous avec un infirmier à domicile ?',
    answer: 'Vous pouvez réserver directement sur OneAndLab en choisissant le créneau qui vous convient. L\'infirmier intervient dans sa zone d\'intervention.',
  },
  {
    question: 'Prise de sang à domicile : c’est remboursé ?',
    answer: 'Les actes infirmiers à domicile prescrits par un médecin sont pris en charge par l\'Assurance maladie. Le remboursement dépend de votre convention avec l\'infirmier et de votre couverture complémentaire.',
  },
];

// FAQ générée pour les infirmiers (plus de FAQ personnalisée en BDD)
const faqToDisplay = computed(() => defaultNurseFaq);

// Lieu pour meta (ville + code postal)
const metaLocation = computed(() => {
  const p = profile.value;
  if (!p) return '';
  return (p.address || p.city_plain || '').toString().trim() || '';
});

// Meta tags dynamiques (SEO : Nom prénom - Infirmier libéral à Ville CODE POSTAL)
useHead({
  title: computed(() => {
    if (!profile.value) return 'Profil infirmier | OneAndLab';
    const name = profile.value.name || '';
    const loc = metaLocation.value;
    if (loc) return `${name} - Infirmier libéral à ${loc} | OneAndLab`;
    return `${name} - Infirmier libéral | OneAndLab`;
  }),
  meta: [
    {
      name: 'description',
      content: computed(() => {
        if (!profile.value) return 'Profil infirmier sur OneAndLab';
        const name = profile.value.name || '';
        const loc = metaLocation.value;
        const bio = profile.value.biography ? profile.value.biography.substring(0, 140) : '';
        if (bio) return bio;
        if (loc) return `Infirmier${profile.value.gender === 'female' ? 'e' : ''} libéral à domicile ${name} à ${loc}. Soins infirmiers, prise de sang, pansements. OneAndLab.`;
        return `Infirmier${profile.value.gender === 'female' ? 'e' : ''} libéral à domicile ${name}. Soins infirmiers, prise de sang. OneAndLab.`;
      }),
    },
    {
      name: 'keywords',
      content: computed(() => {
        if (!profile.value) return 'infirmier, domicile, soins';
        const name = profile.value.name || '';
        const loc = metaLocation.value;
        const parts = [name, 'infirmier libéral', 'domicile', 'soins infirmiers', 'prise de sang'];
        if (loc) parts.push(loc);
        return parts.join(', ');
      }),
    },
    {
      property: 'og:title',
      content: computed(() => {
        if (!profile.value) return 'Profil infirmier';
        const name = profile.value.name || '';
        const loc = metaLocation.value;
        return loc ? `${name} - Infirmier libéral à ${loc}` : `${name} - Infirmier libéral`;
      }),
    },
    {
      property: 'og:description',
      content: computed(() => {
        if (!profile.value) return 'Profil infirmier sur OneAndLab';
        return profile.value.biography?.substring(0, 200) || `Infirmier${profile.value.gender === 'female' ? 'e' : ''} libéral à domicile ${profile.value.name}`;
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
    const base = config.public.apiBase || '/api';
    const apiBase = import.meta.server && (base.startsWith('/') || !base.startsWith('http'))
      ? 'http://127.0.0.1:8888/api'
      : base;
    const url = `${apiBase}/public/nurse/${slug}`;

    const response = await $fetch<{ success: boolean; data?: any; error?: string }>(url, {
      method: 'GET',
    });

    if (response.success && response.data) {
      const data = response.data;
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
    error.value = err.data?.error || err.message || 'Erreur lors du chargement du profil';
  } finally {
    loading.value = false;
  }
};

await fetchProfile();
</script>
