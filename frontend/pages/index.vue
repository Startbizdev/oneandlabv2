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

useLandingSeo({
  title: 'Prise de sang et soins infirmiers à domicile | Cary',
  description: 'Réservez une prise de sang ou des soins infirmiers à domicile. Choisissez vos disponibilités, suivez la confirmation et retrouvez vos documents avec Cary.',
  path: '/',
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
      'La prise en charge dépend de votre prescription, des soins et de votre situation. Le déplacement à domicile a ses propres conditions. Demandez au professionnel de vous préciser les frais éventuels avant la visite.',
    sourceUrl: 'https://www.ameli.fr/infirmier/exercice-liberal/facturation-remuneration/tarifs-conventionnels/actes-domicile',
    sourceLabel: 'Conditions de déplacement à domicile sur ameli.fr',
  },
  {
    question: 'Je suis infirmier ou laboratoire, comment rejoindre ?',
    answer:
      'Vous déposez votre dossier en ligne. Notre équipe vérifie vos informations en quelques jours. Ensuite, vous recevez des demandes dans votre zone.',
  },
  {
    question: 'Mes données sont-elles protégées ?',
    answer:
      'Votre espace rassemble vos rendez-vous et vos documents. Les accès dépendent du rôle et de la prise en charge. Consultez notre politique de confidentialité pour connaître les traitements de données et exercer vos droits.',
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
