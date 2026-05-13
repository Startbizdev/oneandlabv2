<template>
  <div>
    <LandingMaquetteHero
      eyebrow="Pour les patients"
      :title-lines="['Soins à domicile,', 'à votre']"
      highlight="rythme"
      description="Réservez une prise de sang ou des soins infirmiers à domicile. Professionnels qualifiés, créneaux qui vous conviennent, confirmation par SMS et email. Simple et rassurant."
      image-src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Soins et accompagnement d'un patient à domicile"
      image-object-class="object-[center_30%]"
      :primary-cta="{ label: 'Prendre rendez-vous', to: appointmentNewUrl, icon: 'i-lucide-calendar-plus' }"
      :secondary-cta="{ label: 'Explorer les infirmiers', to: '/infirmiers' }"
      :stats="patientStats"
      :quote="patientQuote"
    />
  <LandingMaquetteMarketingBackdrop>

    <LandingMaquettePillarGrid
      eyebrow="Pourquoi OneAndLab"
      title="Tout est pensé pour vous"
      subtitle="Une expérience fluide, du choix du créneau à l'arrivée du professionnel."
      :columns="4"
      section-class="bg-white dark:bg-gray-950"
      :items="trustItems"
    />

    <LandingMaquettePillarGrid
      eyebrow="Avantages"
      title="Une plateforme au service des patients"
      subtitle="Réserver, suivre vos soins et accéder à vos documents depuis un même espace."
      :columns="3"
      section-class="bg-[#F7F7FB] dark:bg-gray-900/80"
      :items="benefits"
    />

    <LandingMaquetteStepsCards
      section-id="etapes-patient"
      eyebrow="Comment ça marche"
      :heading-lines="['Trois étapes,', 'zéro prise de tête']"
      intro="Choisissez votre soin, validez le créneau : un professionnel confirme et se déplace chez vous avec le matériel adapté."
      section-class="bg-white dark:bg-gray-950"
      :cards="stepCards"
    />

    <section class="border-y border-[#E8E8F0]/80 bg-white py-[72px] dark:border-gray-800 dark:bg-gray-950 lg:py-[100px]">
      <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
        <Reviews
          title="Ce que disent les patients"
          subtitle="Des milliers de réservations à domicile · la parole à ceux qui ont testé OneAndLab."
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
      eyebrow="Prêt à réserver ?"
      title="Prenez rendez-vous à domicile en quelques minutes"
      subtitle="Aucun compte obligatoire pour une première réservation. Confirmation immédiate par email et SMS."
      :buttons="ctaButtons"
      outer-class="bg-[#F7F7FB] dark:bg-gray-900/70"
    />
  </LandingMaquetteMarketingBackdrop>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

useLandingSeo({
  title: 'Pour les patients | Soins à domicile | OneAndLab',
  description:
    'Réservez une prise de sang ou des soins infirmiers à domicile. Professionnels qualifiés, créneaux adaptés. Plateforme OneAndLab pour les patients.',
  keywords:
    'prise de sang à domicile, soins infirmiers à domicile, rendez-vous patient, OneAndLab, soins à domicile',
  path: '/pour-les-patients',
});

const { appointmentNewUrl } = useAppointmentNewUrl();

const patientStats = [
  { num: '+2000', rest: ' patients accompagnés' },
  { num: '<2 h', rest: ' délai moyen de prise en charge' },
  { num: '98 %', rest: ' de patients satisfaits' },
];

const patientQuote = {
  text:
    "J'ai réservé une prise de sang pour ma mère qui ne peut plus se déplacer. L'infirmière était à l'heure et très douce.",
  author: 'Marie D., patiente',
};

const trustItems = [
  {
    icon: 'i-lucide-clock',
    title: 'Réservation rapide',
    description: 'Formulaire guidé · moins de 3 minutes depuis votre téléphone.',
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Professionnels vérifiés',
    description: 'Infirmiers et laboratoires partenaires suivis dans leurs qualifications.',
  },
  {
    icon: 'i-lucide-home',
    title: 'À domicile partout',
    description: 'Le professionnel se déplace chez vous, au créneau convenu.',
  },
  {
    icon: 'i-lucide-bell',
    title: 'Emails & SMS',
    description: 'Confirmation, rappels et suivi clair à chaque étape.',
  },
];

const benefits = [
  {
    icon: 'i-lucide-calendar-check',
    title: 'Planning souple',
    description:
      'Choisissez le type de soin, votre adresse et un créneau. Un professionnel disponible vous confirme rapidement.',
  },
  {
    icon: 'i-lucide-home',
    title: 'Sans vous déplacer',
    description:
      'Pansements, injections, prélevements… les soins se font dans le confort de votre foyer.',
  },
  {
    icon: 'i-lucide-file-text',
    title: 'Suivi dans votre espace',
    description:
      'Historique des rendez-vous, documents utiles et échanges après votre inscription patient.',
  },
  {
    icon: 'i-lucide-star',
    title: 'Avis et transparence',
    description:
      'Profils détaillés et retours patients pour vous aider à faire un choix éclairé.',
  },
  {
    icon: 'i-lucide-clock',
    title: 'Réactivité',
    description: 'Une demande formulée dans la journée peut souvent être honorée très vite.',
  },
  {
    icon: 'i-lucide-heart-pulse',
    title: 'Parcours soignant',
    description: 'Une chaîne courte : vous, la plateforme, le professionnel qui intervient chez vous.',
  },
];

const stepCards = [
  {
    highlight: true as const,
    icon: 'i-lucide-calendar-plus',
    title: 'Réservez en ligne',
    body: 'Choisissez votre soin, votre adresse et un créneau. La réservation est fluide, même depuis mobile.',
  },
  {
    icon: 'i-lucide-check-circle-2',
    title: 'Confirmation rapide',
    body: 'Un professionnel disponible dans votre secteur accepte la demande. Vous êtes prévenu par SMS et email.',
  },
  {
    icon: 'i-lucide-house',
    title: 'Intervention à domicile',
    body: "Le passage a lieu au créneau convenu avec le matériel adapté · qualité attendue dans le respect de l'ordonnance.",
  },
];

const landingReviews = [
  {
    id: '1',
    patientName: 'Marie D.',
    rating: 5,
    comment:
      "J'ai réservé une prise de sang pour ma mère qui ne peut plus se déplacer. L'infirmière était à l'heure et très douce.",
    response: 'Merci Marie pour votre confiance. — Sarah M., IDEL',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    patientName: 'Jean P.',
    rating: 5,
    comment: 'Prélèvement à domicile en 48 h. Gestes propres et rapides. À recommander.',
    response: 'Merci Jean. — BioSanté',
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    patientName: 'Sophie L.',
    rating: 5,
    comment: "Soins réguliers pour mon père. L'équipe est réactive et l'outil est limpide.",
    response: 'Merci Sophie. — Marc D., infirmier',
    date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    patientName: 'Pierre M.',
    rating: 5,
    comment: "Première prise de sang à domicile : simple, aucun déplacement jusqu'au laboratoire.",
    response: 'Ravi que le service vous ait convenu. — MédiLab',
    date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
  },
  {
    id: '5',
    patientName: 'Claire B.',
    rating: 5,
    comment: 'RDV le jour même pour un pansement. Ponctuelle et très pro.',
    response: 'Merci Claire. — Julie B., IDEL',
    date: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
  },
  {
    id: '6',
    patientName: 'Thomas R.',
    rating: 5,
    comment: 'Rappel SMS utile · le passage s’est fait pile à la minute annoncée.',
    response: 'Merci Thomas. — OneAndLab',
    date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
  },
];

const faqItems = [
  {
    question: 'Dois-je créer un compte pour réserver ?',
    answer:
      'Vous pouvez réserver sans compte. Pour retrouver vos rendez-vous et vos documents plus tard, nous vous recommandons de créer gratuitement votre espace patient.',
  },
  {
    question: 'Quels soins puis-je demander ?',
    answer:
      'Prélèvements à domicile et soins infirmiers réalisés par des professionnels conventionnés, selon la zone et les spécialisations disponibles près de chez vous.',
  },
  {
    question: 'Comment est désigné le professionnel ?',
    answer:
      'Selon votre adresse et vos créneaux, la proposition est faîte automatiquement auprès des profils disponibles : vous voyez titre, présentation et avis lorsque c’est activé.',
  },
  {
    question: 'Puis-je annuler ou décaler ?',
    answer:
      "Oui depuis votre confirmation ou votre espace, dans les délais indiqués (souvent 24 h avant l'intervention).",
  },
  {
    question: 'Les soins sont-ils remboursés ?',
    answer:
      "Sur prescription et avec un professionnel conventionné comme en ville, vos actes rentrent dans les prises en charge habituelles (carte Vitale, télétransmission).",
  },
];

const ctaButtons = computed(() => [
  {
    label: 'Prendre rendez-vous',
    to: appointmentNewUrl.value,
    icon: 'i-lucide-calendar-plus',
    variant: 'solid' as const,
  },
  {
    label: 'Explorer les laboratoires',
    to: '/laboratoires',
    variant: 'outline' as const,
  },
]);
</script>
