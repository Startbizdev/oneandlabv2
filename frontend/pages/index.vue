<template>
  <div>
    <LandingMaquetteHero />
    <LandingMaquetteServices />
    <LandingMaquetteBento />
    <LandingMaquettePatientFocus />
    <LandingMaquetteFaq :items="faqItems" />
    <LandingMaquetteCta />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

const faqItems = [
  {
    question: 'Comment réserver ?',
    answer:
      'Vous choisissez le soin, votre adresse et un créneau. Un professionnel près de chez vous confirme. Vous recevez un SMS et un email. Un compte n’est pas obligatoire pour la première visite.',
  },
  {
    question: 'Est-ce remboursé ?',
    answer:
      'Oui, dans la grande majorité des cas, sur ordonnance et avec un professionnel conventionné. Comme en ville : carte Vitale, télétransmission.',
  },
  {
    question: 'Je suis infirmier ou laboratoire, comment rejoindre ?',
    answer:
      'Vous déposez votre dossier en ligne. Notre équipe vérifie vos informations en quelques jours. Ensuite, vous recevez des demandes dans votre zone.',
  },
  {
    question: 'Mes données sont-elles protégées ?',
    answer:
      'Oui. Cary est hébergée pour les données de santé et respecte le RGPD. Vos informations ne sont pas vendues.',
  },
  {
    question: 'Puis-je annuler ou décaler ?',
    answer:
      'Oui, depuis votre confirmation ou votre espace, dans les délais indiqués sur le rendez-vous. En cas de doute, écrivez-nous.',
  },
];

const route = useRoute();

onMounted(() => {
  if (route.hash === '#faq') {
    nextTick(() =>
      document.getElementById('faq')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      }),
    );
  }
});

watch(
  () => route.hash,
  (hash) => {
    if (hash === '#faq') {
      nextTick(() =>
        document.getElementById('faq')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      );
    }
  },
);
</script>
