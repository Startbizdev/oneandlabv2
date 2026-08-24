<template>
  <div>
    <LandingMaquetteHero
      eyebrow="Pour les infirmiers et infirmières libéraux"
      :title-lines="['Remplissez vos tournées,', 'sans courir après']"
      highlight="les appels"
      description="Les demandes arrivent dans votre rayon. Vous acceptez ou vous refusez. Planning, adresses et documents au même endroit."
      image-src="https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Infirmière souriante en blouse"
      image-object-class="object-[center_20%]"
      :primary-cta="{ label: 'Recevoir des demandes', to: '/nurse/register', icon: 'i-lucide-user-plus' }"
      :secondary-cta="{ label: 'Voir les tarifs', to: '/pour-les-infirmiers/tarifs' }"
      :stats="nurseStats"
      :quote="nurseQuote"
    />
  <LandingMaquetteMarketingBackdrop>

    <LandingMaquettePillarGrid
      eyebrow="Vos tournées"
      title="Pensé pour vos tournées, pas contre elles"
      subtitle="Moins de paperasse. Vous gardez la main sur vos créneaux et votre rayon."
      :columns="4"
      section-class="bg-white dark:bg-gray-950"
      :items="trustItems"
    />

    <LandingMaquettePillarGrid
      eyebrow="Avantages"
      title="Ce que les infirmiers utilisent vraiment"
      :columns="3"
      section-class="bg-[#F7F7FB] dark:bg-gray-900/80"
      :items="benefits"
    />

    <LandingMaquetteStepsCards
      eyebrow="Pour commencer"
      :heading-lines="['Trois étapes', 'pour recevoir vos premières demandes']"
      intro="Vous déposez votre dossier. Nous le vérifions. Ensuite, les demandes arrivent."
      section-class="bg-white dark:bg-gray-950"
      :cards="stepCards"
    />

    <section class="border-y border-[#E8E8F0]/80 bg-white py-[72px] dark:border-gray-800 dark:bg-gray-950 lg:py-[100px]">
      <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
        <Reviews
          title="Ils sont sur Cary"
          subtitle="Des retours d’infirmiers libéraux qui reçoivent des demandes dans leur rayon."
          :reviews="landingReviews"
          :max-reviews="6"
          background-class="!bg-transparent"
        />
      </div>
    </section>

    <LandingMaquetteFaq
      anchor-id="faq"
      section-class="bg-[#F7F7FB] dark:bg-gray-900/70"
      :items="faqItems"
    />

    <LandingMaquetteInlineCta
      eyebrow="Rejoindre Cary"
      title="Recevez des demandes sur votre secteur"
      subtitle="Inscription en ligne. Une équipe à l’écoute. Tarifs transparents."
      :buttons="ctaButtons"
      outer-class="bg-[#F7F7FB] dark:bg-gray-900/70"
    />
  </LandingMaquetteMarketingBackdrop>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

useLandingSeo({
  title: 'Infirmiers libéraux : recevez des demandes à domicile | Cary',
  description:
    'Les demandes arrivent dans votre rayon. Vous acceptez ou refusez. Planning, adresses et documents au même endroit.',
  keywords: 'infirmier domicile, IDEL Cary, plateforme infirmiers, soins infirmiers à domicile',
  path: '/pour-les-infirmiers',
});

const nurseStats = [
  { num: '40+', rest: ' infirmiers déjà sur Cary' },
  { num: 'Votre rayon', rest: ' : seulement les demandes qui collent' },
  { num: 'Libre', rest: ' d’accepter ou de refuser' },
];

const nurseQuote = {
  text:
    "Plateforme fluide, je capte des soins dans ma zone sans paperasse supplémentaire. Le profil rassure les nouveaux patients.",
  author: 'Sophie M., IDEL à Lyon',
};

const trustItems = [
  {
    icon: 'i-lucide-users',
    title: 'Des patients sur votre chemin',
    description: 'Uniquement les demandes qui collent à vos déplacements.',
  },
  {
    icon: 'i-lucide-calendar',
    title: 'Un planning lisible',
    description: 'Vous indiquez vos disponibilités et ajustez votre charge.',
  },
  {
    icon: 'i-lucide-badge-check',
    title: 'Une fiche qui rassure',
    description: 'Compétences et rayon, visibles par les patients.',
  },
  {
    icon: 'i-lucide-headphones',
    title: 'Une équipe au bout du fil',
    description: 'Pour le démarrage et le quotidien.',
  },
];

const benefits = [
  {
    icon: 'i-lucide-map-pin',
    title: 'Vous fixez votre rayon',
    description: 'Et vous le changez quand votre charge change.',
  },
  {
    icon: 'i-lucide-star',
    title: 'Les avis travaillent pour vous',
    description: 'Les patients voient vos retours avant de réserver.',
  },
  {
    icon: 'i-lucide-bell',
    title: 'Vous êtes prévenu tout de suite',
    description: 'Nouvelle demande, confirmation, changement.',
  },
  {
    icon: 'i-lucide-layout-dashboard',
    title: 'Votre journée en un coup d’œil',
    description: 'Rendez-vous, demandes, suite de la tournée.',
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Dossiers protégés',
    description: 'Échanges traités comme des données de santé.',
  },
  {
    icon: 'i-lucide-line-chart',
    title: 'Vous voyez venir',
    description: 'Historique et charge, pour anticiper la semaine.',
  },
];

const stepCards = [
  {
    highlight: true,
    icon: 'i-lucide-file-edit',
    title: 'Vous vous inscrivez',
    body: 'Compte et dossier professionnel, en ligne.',
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Nous vérifions',
    body: 'Notre équipe active votre fiche une fois les informations confirmées.',
  },
  {
    icon: 'i-lucide-bell',
    title: 'Vous recevez des demandes',
    body: 'Vous acceptez selon vos disponibilités.',
  },
];

const landingReviews = [
  {
    id: '1',
    patientName: 'Sophie M., IDEL Lyon',
    rating: 5,
    comment: 'Interface claire pour voir mes créneaux et mes demandes sans perdre de temps.',
    response: 'Merci Sophie — Cary',
    date: new Date(Date.now() - 5 * 86400000),
  },
  {
    id: '2',
    patientName: 'Marc D., IDEL',
    rating: 5,
    comment: 'Les patients arrivent avec le contexte nécessaire : ça facilite la préparation avant le déplacement.',
    response: 'Merci Marc.',
    date: new Date(Date.now() - 12 * 86400000),
  },
  {
    id: '3',
    patientName: 'Julie B., IDEL',
    rating: 5,
    comment: 'Le profil public aide à expliquer mes spécialités sans multiplier les appels.',
    response: 'Merci Julie.',
    date: new Date(Date.now() - 19 * 86400000),
  },
  {
    id: '4',
    patientName: 'Thomas L., IDEL rural',
    rating: 5,
    comment: 'Utile pour densifier mon planning sur des secteurs où je me déplace déjà.',
    response: 'Merci Thomas.',
    date: new Date(Date.now() - 25 * 86400000),
  },
  {
    id: '5',
    patientName: 'Nathalie R., IDEL',
    rating: 5,
    comment: "J'apprécie de pouvoir ajuster mon rayon quand ma charge change.",
    response: 'Merci Nathalie.',
    date: new Date(Date.now() - 32 * 86400000),
  },
  {
    id: '6',
    patientName: 'Philippe F., IDEL',
    rating: 5,
    comment: 'Bon complément pour développer mon activité libérale tout en maîtrisant mon agenda.',
    response: 'Merci Philippe.',
    date: new Date(Date.now() - 40 * 86400000),
  },
];

const faqItems = [
  {
    question: 'Cary remplace-t-il mon activité ?',
    answer:
      'Non. C’est un canal de plus. Vous restez libéral, responsable de vos actes.',
  },
  {
    question: 'Comment m’inscrire ?',
    answer:
      'En ligne : identité professionnelle, zone, pièces demandées au fil du formulaire.',
  },
  {
    question: 'Comment je choisis ma zone ?',
    answer:
      'Vous réglez un rayon adapté à vos tournées. Vous pouvez le changer.',
  },
  {
    question: 'Combien ça coûte ?',
    answer:
      'Une offre gratuite limitée, et une offre Pro. Détail sur la page tarifs. Sans engagement.',
  },
  {
    question: 'Puis-je refuser ?',
    answer: 'Oui. Vous restez libre d’accepter ou non.',
  },
];

const ctaButtons = [
  { label: 'Recevoir des demandes', to: '/nurse/register', icon: 'i-lucide-user-plus', variant: 'solid' as const },
  { label: 'Voir les tarifs', to: '/pour-les-infirmiers/tarifs', variant: 'outline' as const },
];
</script>
