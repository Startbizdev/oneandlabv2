<template>
  <PublicProfileLayout
    :loading="loading"
    :error="error"
    :profile="profile"
    :faq-items="faqToDisplay"
    :address="profile?.address ?? profile?.city_plain ?? null"
    :map-center="profile?.map_center ?? null"
    type="lab"
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

// FAQ par défaut pour les laboratoires (généraliste, SEO, sans horaires ni infos non disponibles)
const defaultLabFaq = [
  {
    question: 'Prise de sang à domicile : comment ça marche ?',
    answer: 'Le laboratoire envoie un professionnel à votre domicile pour effectuer le prélèvement. Vous présentez votre ordonnance et votre carte Vitale. Les tubes sont acheminés au laboratoire pour analyse ; les résultats sont transmis à votre médecin et à vous selon les modalités du labo.',
  },
  {
    question: 'Pourquoi faire une prise de sang à domicile ?',
    answer: 'La prise de sang à domicile évite les déplacements, utile en cas de mobilité réduite, d\'emploi du temps chargé ou de préférence personnelle. Les analyses réalisées sont les mêmes qu’en laboratoire de ville.',
  },
  {
    question: 'Faut-il une ordonnance pour une prise de sang à domicile ?',
    answer: 'Oui. La prescription médicale indique les analyses à réaliser. Le prélèvement à domicile est effectué sur rendez-vous dans la zone de couverture du laboratoire.',
  },
  {
    question: 'Comment prendre rendez-vous pour une prise de sang à domicile ?',
    answer: 'Sur OneAndLab, choisissez le laboratoire proposant les prélèvements à domicile dans votre secteur et réservez un créneau. Le laboratoire confirme l’intervention dans sa zone.',
  },
  {
    question: 'Prise de sang à domicile : remboursement ?',
    answer: 'Les analyses prescrites par un médecin sont prises en charge par l\'Assurance maladie. Le déplacement à domicile peut être facturé selon les conditions du laboratoire et votre mutuelle.',
  },
];

// FAQ générée pour les laboratoires (plus de FAQ personnalisée en BDD)
const faqToDisplay = computed(() => defaultLabFaq);

// Lieu pour meta (ville + code postal)
const metaLocation = computed(() => {
  const p = profile.value;
  if (!p) return '';
  return (p.address || p.city_plain || '').toString().trim() || '';
});

// Meta tags dynamiques (SEO : Nom laboratoire - Prise de sang à domicile - Ville CODE)
useHead({
  title: computed(() => {
    if (!profile.value) return 'Profil laboratoire | OneAndLab';
    const name = profile.value.name || 'Laboratoire';
    const loc = metaLocation.value;
    if (loc) return `${name} - Prise de sang à domicile - ${loc} | OneAndLab`;
    return `${name} - Prise de sang à domicile | OneAndLab`;
  }),
  meta: [
    {
      name: 'description',
      content: computed(() => {
        if (!profile.value) return 'Profil laboratoire sur OneAndLab';
        const name = profile.value.name || 'Laboratoire';
        const loc = metaLocation.value;
        const bio = profile.value.biography ? profile.value.biography.substring(0, 140) : '';
        if (bio) return bio;
        if (loc) return `${name} - Prise de sang à domicile à ${loc}. Prélèvements, analyses. OneAndLab.`;
        return `${name} - Prise de sang à domicile. Prélèvements, analyses. OneAndLab.`;
      }),
    },
    {
      name: 'keywords',
      content: computed(() => {
        if (!profile.value) return 'laboratoire, prise de sang, domicile';
        const name = profile.value.name || '';
        const loc = metaLocation.value;
        const parts = [name, 'prise de sang', 'domicile', 'prélèvement', 'laboratoire'];
        if (loc) parts.push(loc);
        return parts.join(', ');
      }),
    },
    {
      property: 'og:title',
      content: computed(() => {
        if (!profile.value) return 'Profil laboratoire';
        const name = profile.value.name || 'Laboratoire';
        const loc = metaLocation.value;
        return loc ? `${name} - Prise de sang à domicile - ${loc}` : `${name} - Prise de sang à domicile`;
      }),
    },
    {
      property: 'og:description',
      content: computed(() => {
        if (!profile.value) return 'Profil laboratoire sur OneAndLab';
        return profile.value.biography?.substring(0, 200) || `Laboratoire ${profile.value.name} - Prise de sang à domicile`;
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
    const url = `${apiBase}/public/lab/${slug}`;

    const response = await $fetch<{ success: boolean; data?: any; error?: string; redirect?: boolean; new_slug?: string }>(url, {
      method: 'GET',
    });

    if (response.success && response.redirect && response.new_slug) {
      await navigateTo(`/Laboratoire/${response.new_slug}`, { redirectCode: 301 });
      return;
    }
    if (response.success && response.data) {
      const data = response.data;
      profile.value = {
        ...data,
        role: 'subaccount',
        name: data.name || (data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : 'Laboratoire'),
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
