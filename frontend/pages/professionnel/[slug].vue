<template>
  <PublicProfileLayout
    :loading="loading"
    :error="error"
    :profile="profile"
    :faq-items="faqToDisplay"
    :address="profile?.address ?? profile?.city_plain ?? null"
    type="pro"
    @review-submitted="fetchProfile"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});


const { profile, loading, error, fetchProfile, locationLabel: metaLocation } = await usePublicProfile('pro');

const defaultProFaq = [
  {
    question: 'Comment prendre rendez-vous avec ce professionnel ?',
    answer: 'Depuis sa fiche Cary, vous pouvez lancer une demande de rendez-vous en quelques clics. Le professionnel valide ensuite le créneau avec vous.',
  },
  {
    question: 'Quels types de rendez-vous sont possibles ?',
    answer: 'Selon la profession (médecin, sage-femme, pharmacien, etc.), le professionnel peut vous orienter ou organiser des examens et soins via Cary.',
  },
];

const faqToDisplay = computed(() => defaultProFaq);


useHead({
  title: computed(() => {
    if (!profile.value) return 'Professionnel de santé | Cary';
    const name = profile.value.name || '';
    const emploi = profile.value.emploi || 'Professionnel de santé';
    const loc = metaLocation.value;
    if (loc) return `${name} - ${emploi} à ${loc} | Cary`;
    return `${name} - ${emploi} | Cary`;
  }),
  meta: [
    {
      name: 'description',
      content: computed(() => {
        if (!profile.value) return 'Professionnel de santé sur Cary';
        const bio = profile.value.biography ? profile.value.biography.substring(0, 140) : '';
        if (bio) return bio;
        const name = profile.value.name || '';
        const emploi = profile.value.emploi || 'professionnel de santé';
        const loc = metaLocation.value;
        return loc
          ? `${name}, ${emploi} à ${loc}. Prenez rendez-vous sur Cary.`
          : `${name}, ${emploi}. Prenez rendez-vous sur Cary.`;
      }),
    },
  ],
});

</script>
