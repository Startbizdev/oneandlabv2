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
    question: 'Comment prendre rendez-vous à domicile ?',
    answer:
      "Créez un compte en deux minutes ou réservez en invité selon votre parcours, choisissez le type de soin, renseignez votre adresse et sélectionnez un créneau. Un professionnel disponible dans votre zone confirme rapidement. Vous recevez une notification par SMS et par email.",
  },
  {
    question: 'Les soins à domicile sont-ils remboursés ?',
    answer:
      "Oui. La grande majorité des soins infirmiers à domicile sont pris en charge par l'Assurance Maladie sur prescription médicale. Nos professionnels conventionnés télétransmettent vos actes comme en ville.",
  },
  {
    question: 'Comment rejoindre le réseau en tant que professionnel ?',
    answer:
      'Soumettez votre candidature via le formulaire dédié (infirmier ou laboratoire). Notre équipe vérifie vos diplômes et votre statut réglementaire sous quelques jours ouvrés. Une fois validé, vous pouvez recevoir des demandes dans votre zone géographique.',
  },
  {
    question: 'La plateforme est-elle conforme aux normes de santé ?',
    answer:
      'Absolument. OneAndLab est hébergée sur une infrastructure prévue pour les données de santé et respecte le RGPD. Vos données médicales sont chiffrées et ne sont pas commercialisées à des tiers sans votre consentement.',
  },
  {
    question: 'Puis-je annuler ou modifier un rendez-vous ?',
    answer:
      'Oui, vous pouvez annuler ou reporter selon les conditions communiquées sur votre dossier rendez-vous. En cas de doute, notre équipe support reste disponible depuis la page Contact.',
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
