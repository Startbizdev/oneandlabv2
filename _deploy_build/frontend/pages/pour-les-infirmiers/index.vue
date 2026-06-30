<template>
  <div>
    <LandingMaquetteHero
      eyebrow="Pour les infirmiers libéraux"
      :title-lines="['Développez votre', 'activité']"
      highlight="à domicile"
      description="Recevez des demandes de soins à domicile via Cary : planning clair, périmètre géographique maîtrisable, profil visible par les patients et gestion des rendez-vous depuis un seul espace."
      image-src="https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Infirmière souriante en blouse"
      image-object-class="object-[center_20%]"
      :primary-cta="{ label: 'Rejoindre le réseau', to: '/nurse/register', icon: 'i-lucide-user-plus' }"
      :secondary-cta="{ label: 'Voir les tarifs infirmiers', to: '/pour-les-infirmiers/tarifs' }"
      :stats="nurseStats"
      :quote="nurseQuote"
    />
  <LandingMaquetteMarketingBackdrop>

    <LandingMaquettePillarGrid
      eyebrow="Une console qui respecte vos tournées"
      title="Une organisation pensée pour vos tournées"
      subtitle="Réduisez les frictions administratives tout en gardant la maîtrise sur vos créneaux et votre rayon."
      :columns="4"
      section-class="bg-white dark:bg-gray-950"
      :items="trustItems"
    />

    <LandingMaquettePillarGrid
      eyebrow="Avantages"
      title="Une plateforme pensée avec les infirmiers libéraux"
      :columns="3"
      section-class="bg-[#F7F7FB] dark:bg-gray-900/80"
      :items="benefits"
    />

    <LandingMaquetteStepsCards
      eyebrow="Pour commencer"
      :heading-lines="['Trois étapes', 'pour être visible sur Cary']"
      intro="Complétez votre dossier : après validation, votre profil peut recevoir des demandes alignées sur votre zone et vos disponibilités."
      section-class="bg-white dark:bg-gray-950"
      :cards="stepCards"
    />

    <section class="border-y border-[#E8E8F0]/80 bg-white py-[72px] dark:border-gray-800 dark:bg-gray-950 lg:py-[100px]">
      <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
        <Reviews
          title="Infirmiers du réseau · retours terrain"
          subtitle="Vies cliniques variées : zones rurales, métropoles, double activité libérale et salariée."
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
      eyebrow="Rejoindre le réseau"
      title="Recevez des demandes de soins à domicile sur votre secteur"
      subtitle="Inscription en ligne · équipe à votre écoute · tarifs consultables sur la page dédiée."
      :buttons="ctaButtons"
      outer-class="bg-[#F7F7FB] dark:bg-gray-900/70"
    />
  </LandingMaquetteMarketingBackdrop>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

useLandingSeo({
  title: 'Pour les infirmiers | Soins à domicile | Cary',
  description:
    'Rejoignez Cary : demandes de soins à domicile, planning, profil public et avis patients.',
  keywords: 'infirmier domicile, IDEL Cary, plateforme infirmiers, soins infirmiers à domicile',
  path: '/pour-les-infirmiers',
});

const nurseStats = [
  { num: '+500', rest: ' infirmiers actifs' },
  { num: '+2000', rest: ' demandes patients servies' },
  { num: '4.9/5', rest: ' note moyenne sur les avis' },
];

const nurseQuote = {
  text:
    "Plateforme fluide, je capte des soins dans ma zone sans paperasse supplémentaire. Le profil rassure les nouveaux patients.",
  author: 'Sophie M., IDEL à Lyon',
};

const trustItems = [
  {
    icon: 'i-lucide-users',
    title: 'Patients dans votre zone',
    description: 'Demandes géolocalisées pour vous concentrer sur les trajets pertinents.',
  },
  {
    icon: 'i-lucide-calendar',
    title: 'Planning lisible',
    description: 'Indiquez vos disponibilités et ajustez votre charge au fil des semaines.',
  },
  {
    icon: 'i-lucide-badge-check',
    title: 'Profil professionnel',
    description: 'Mettez en avant vos compétences et votre rayon pour rassurer les patients.',
  },
  {
    icon: 'i-lucide-headphones',
    title: 'Support dédié',
    description: 'Une équipe pour vous accompagner lors de l’installation et au quotidien.',
  },
];

const benefits = [
  {
    icon: 'i-lucide-map-pin',
    title: 'Rayon paramétrable',
    description: 'Vous définissez la zone dans laquelle vous souhaitez intervenir.',
  },
  {
    icon: 'i-lucide-star',
    title: 'Avis patients',
    description: 'Renforcez votre visibilité grâce aux retours patients et à votre réactivité.',
  },
  {
    icon: 'i-lucide-bell',
    title: 'Notifications',
    description: 'Restez informé des nouvelles demandes et des confirmations de rendez-vous.',
  },
  {
    icon: 'i-lucide-layout-dashboard',
    title: 'Tableau de bord',
    description: 'Suivez vos rendez-vous et les indicateurs utiles à votre activité.',
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Données sécurisées',
    description: 'Échanges et dossiers traités dans le respect des usages du secteur santé.',
  },
  {
    icon: 'i-lucide-line-chart',
    title: 'Pilotage',
    description: 'Anticipez vos créneaux et votre charge selon l’historique sur la plateforme.',
  },
];

const stepCards = [
  {
    highlight: true,
    icon: 'i-lucide-file-edit',
    title: 'Inscription et dossier',
    body: 'Créez votre compte et complétez votre dossier professionnel pour rejoindre le réseau.',
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Validation',
    body: 'Notre équipe vérifie vos informations avant activation de votre profil.',
  },
  {
    icon: 'i-lucide-bell',
    title: 'Réception des demandes',
    body: 'Une fois validé, vous pouvez recevoir et accepter des rendez-vous selon vos disponibilités.',
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
    question: 'Cary peut-il remplacer mon cabinet ou mon activité habituelle ?',
    answer:
      'Non. Il s’agit d’un canal supplémentaire pour recevoir des demandes de soins à domicile : vous restez libéral et responsable de vos actes comme d’habitude.',
  },
  {
    question: 'Comment m’inscrire et quelles informations fournir ?',
    answer:
      'L’inscription se fait en ligne. Vous renseignez votre identité professionnelle, votre zone d’intervention et les éléments permettant de vérifier votre statut. La liste exacte des pièces est indiquée lors du parcours d’inscription.',
  },
  {
    question: 'Comment définir ma zone géographique ?',
    answer:
      'Vous paramétrez un rayon ou une zone de couverture adaptée à vos déplacements. Vous pouvez l’ajuster selon votre charge et vos contraintes terrain.',
  },
  {
    question: 'Quels sont les coûts pour les infirmiers ?',
    answer:
      'Une offre gratuite limitée et une offre Pro sont proposées · détail et conditions sur la page tarifs infirmiers.',
  },
  {
    question: 'Puis-je refuser une demande ?',
    answer:
      'Oui : vous restez libre d’accepter ou de refuser selon vos disponibilités et votre exercice professionnel.',
  },
];

const ctaButtons = [
  { label: 'Rejoindre le réseau', to: '/nurse/register', icon: 'i-lucide-user-plus', variant: 'solid' as const },
  { label: 'Consulter les tarifs', to: '/pour-les-infirmiers/tarifs', variant: 'outline' as const },
];
</script>
