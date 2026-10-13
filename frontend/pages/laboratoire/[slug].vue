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


const { profile, loading, error, fetchProfile, locationLabel: metaLocation } = await usePublicProfile('lab');

// FAQ par défaut pour les laboratoires (généraliste, SEO, sans horaires ni infos non disponibles)
const defaultLabFaq = [
  {
    question: 'Prélèvement à domicile : comment ça marche ?',
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
    answer: 'Sur Cary, choisissez le laboratoire proposant les prélèvements à domicile dans votre secteur et réservez un créneau. Le laboratoire confirme l’intervention dans sa zone.',
  },
  {
    question: 'Prélèvement à domicile : remboursement ?',
    answer: 'La prise en charge dépend des analyses prescrites, de votre situation et des conditions de déplacement à domicile. Le laboratoire peut vous préciser les modalités avant le prélèvement.',
  },
];

// FAQ générée pour les laboratoires (plus de FAQ personnalisée en BDD)
const faqToDisplay = computed(() => defaultLabFaq);

// Lieu pour meta (ville + code postal)

// Meta tags dynamiques (SEO : Nom laboratoire - Prélèvement à domicile - Ville CODE)
useHead({
  title: computed(() => {
    if (!profile.value) return 'Profil laboratoire | Cary';
    const name = profile.value.name || 'Laboratoire';
    const loc = metaLocation.value;
    if (loc) return `${name} - Prélèvement à domicile - ${loc} | Cary`;
    return `${name} - Prélèvement à domicile | Cary`;
  }),
  meta: [
    {
      name: 'description',
      content: computed(() => {
        if (!profile.value) return 'Profil laboratoire sur Cary';
        const name = profile.value.name || 'Laboratoire';
        const loc = metaLocation.value;
        const bio = profile.value.biography ? profile.value.biography.substring(0, 140) : '';
        if (bio) return bio;
        if (loc) return `${name} - Prélèvement à domicile à ${loc}. Prélèvements, analyses. Cary.`;
        return `${name} - Prélèvement à domicile. Prélèvements, analyses. Cary.`;
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
        return loc ? `${name} - Prélèvement à domicile - ${loc}` : `${name} - Prélèvement à domicile`;
      }),
    },
    {
      property: 'og:description',
      content: computed(() => {
        if (!profile.value) return 'Profil laboratoire sur Cary';
        return profile.value.biography?.substring(0, 200) || `Laboratoire ${profile.value.name} - Prélèvement à domicile`;
      }),
    },
    {
      property: 'og:image',
      content: computed(() => profile.value?.profile_image_url || '/images/logo-cary.png'),
    },
    {
      property: 'og:type',
      content: 'profile',
    },
  ],
});

// Fetch du profil en SSR
</script>
