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


const { profile, loading, error, fetchProfile, locationLabel: metaLocation } = await usePublicProfile('nurse');

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
    answer: 'Vous pouvez réserver directement sur Cary en choisissant le créneau qui vous convient. L\'infirmier intervient dans sa zone d\'intervention.',
  },
  {
    question: 'Prélèvement à domicile : c’est remboursé ?',
    answer: 'La prise en charge dépend des actes prescrits, de votre situation et des conditions de déplacement à domicile. Vérifiez les modalités avec le professionnel et votre organisme de couverture avant le rendez-vous.',
  },
];

// FAQ générée pour les infirmiers (plus de FAQ personnalisée en BDD)
const faqToDisplay = computed(() => defaultNurseFaq);

// Lieu pour meta (ville + code postal)

// Meta tags dynamiques (SEO : Nom prénom - Infirmier libéral à Ville CODE POSTAL)
useHead({
  title: computed(() => {
    if (!profile.value) return 'Profil infirmier | Cary';
    const name = profile.value.name || '';
    const loc = metaLocation.value;
    if (loc) return `${name} - Infirmier libéral à ${loc} | Cary`;
    return `${name} - Infirmier libéral | Cary`;
  }),
  meta: [
    {
      name: 'description',
      content: computed(() => {
        if (!profile.value) return 'Profil infirmier sur Cary';
        const name = profile.value.name || '';
        const loc = metaLocation.value;
        const bio = profile.value.biography ? profile.value.biography.substring(0, 140) : '';
        if (bio) return bio;
        if (loc) return `Infirmier${profile.value.gender === 'female' ? 'e' : ''} libéral à domicile ${name} à ${loc}. Soins infirmiers, prise de sang, pansements. Cary.`;
        return `Infirmier${profile.value.gender === 'female' ? 'e' : ''} libéral à domicile ${name}. Soins infirmiers, prise de sang. Cary.`;
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
        if (!profile.value) return 'Profil infirmier sur Cary';
        return profile.value.biography?.substring(0, 200) || `Infirmier${profile.value.gender === 'female' ? 'e' : ''} libéral à domicile ${profile.value.name}`;
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
