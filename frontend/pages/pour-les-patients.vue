<template>
  <div>
    <LandingMaquetteHero
      eyebrow="Pour vous, à la maison"
      :title-lines="['Un soin chez vous,', 'à l’heure qui']"
      highlight="vous arrange"
      description="Prise de sang ou soin infirmier : vous réservez, un professionnel vérifié vient chez vous. Confirmation par SMS et email."
      image-src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Soins et accompagnement d'un patient à domicile"
      image-object-class="object-[center_30%]"
      :primary-cta="{ label: 'Réserver une visite', to: appointmentNewUrl, icon: 'i-lucide-calendar-plus' }"
      :secondary-cta="{ label: 'Voir les infirmiers près de chez moi', to: '/infirmiers' }"
      :stats="patientStats"
      :quote="patientQuote"
    />
  <LandingMaquetteMarketingBackdrop>

    <LandingMaquettePillarGrid
      eyebrow="Pourquoi Cary"
      title="Conçu pour que ce soit simple"
      subtitle="Du créneau à la sonnette : vous savez où vous en êtes."
      :columns="4"
      section-class="bg-white dark:bg-gray-950"
      :items="trustItems"
    />

    <LandingMaquettePillarGrid
      eyebrow="Avantages"
      title="Ce que vous gagnez vraiment"
      subtitle="Réserver, suivre vos soins et accéder à vos documents depuis un même espace."
      :columns="3"
      section-class="bg-[#F7F7FB] dark:bg-gray-900/80"
      :items="benefits"
    />

    <LandingMaquetteStepsCards
      section-id="etapes-patient"
      eyebrow="Comment ça marche"
      :heading-lines="['Trois étapes,', 'et c’est chez vous']"
      intro="Vous choisissez. On confirme. Le professionnel arrive avec le matériel."
      section-class="bg-white dark:bg-gray-950"
      :cards="stepCards"
    />

    <section class="border-y border-[#E8E8F0]/80 bg-white py-[72px] dark:border-gray-800 dark:bg-gray-950 lg:py-[100px]">
      <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
        <Reviews
          title="Ils sont passés par Cary"
          subtitle="Des retours de patients qui ont réservé une visite à domicile."
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
      eyebrow="On s’occupe du reste"
      title="Réservez votre visite"
      subtitle="Pas de compte obligatoire. Confirmation par email et SMS."
      :buttons="ctaButtons"
      outer-class="bg-[#F7F7FB] dark:bg-gray-900/70"
    />
  </LandingMaquetteMarketingBackdrop>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

useLandingSeo({
  title: 'Soins à domicile pour les patients | Cary',
  description:
    'Réservez une prise de sang ou un soin infirmier chez vous. Professionnels vérifiés, confirmation par SMS et email.',
  keywords:
    'prise de sang à domicile, soins infirmiers à domicile, rendez-vous patient, Cary, soins à domicile',
  path: '/pour-les-patients',
});

const { appointmentNewUrl } = useAppointmentNewUrl();

const patientStats = [
  { num: '+300', rest: ' visites à domicile' },
  { num: 'Souvent', rest: ' le jour même' },
  { num: 'Une équipe', rest: ' qui vous rappelle si besoin' },
];

const patientQuote = {
  text:
    "J'ai réservé une prise de sang pour ma mère qui ne peut plus se déplacer. L'infirmière était à l'heure et très douce.",
  author: 'Marie D., patiente',
};

const trustItems = [
  {
    icon: 'i-lucide-clock',
    title: 'Trois minutes',
    description: 'Un formulaire guidé, depuis votre téléphone.',
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Des professionnels vérifiés',
    description: 'Infirmiers et laboratoires dont nous avons contrôlé le dossier.',
  },
  {
    icon: 'i-lucide-home',
    title: 'Chez vous',
    description: 'Le professionnel se déplace au créneau convenu.',
  },
  {
    icon: 'i-lucide-bell',
    title: 'On vous prévient',
    description: 'Confirmation, rappel, et nouvelles à chaque étape.',
  },
];

const benefits = [
  {
    icon: 'i-lucide-calendar-check',
    title: 'Vous choisissez l’horaire',
    description: 'Soin, adresse, créneau. On vous confirme vite.',
  },
  {
    icon: 'i-lucide-home',
    title: 'Sans vous déplacer',
    description: 'Pansements, injections, prélèvements : dans votre salon.',
  },
  {
    icon: 'i-lucide-file-text',
    title: 'Tout reste au même endroit',
    description:
      'Historique, documents, échanges, une fois votre compte créé.',
  },
  {
    icon: 'i-lucide-star',
    title: 'Vous voyez à qui vous avez affaire',
    description: 'Présentation et avis, quand ils sont disponibles.',
  },
  {
    icon: 'i-lucide-clock',
    title: 'Souvent le jour même',
    description: 'Si un professionnel est libre près de chez vous.',
  },
  {
    icon: 'i-lucide-heart-pulse',
    title: 'Peu d’intermédiaires',
    description: 'Vous, Cary, le professionnel qui sonne chez vous.',
  },
];

const stepCards = [
  {
    highlight: true as const,
    icon: 'i-lucide-calendar-plus',
    title: 'Vous réservez',
    body: 'Choisissez votre soin, votre adresse et un créneau. Trois minutes, même depuis mobile.',
  },
  {
    icon: 'i-lucide-check-circle-2',
    title: 'On vous confirme',
    body: 'Un professionnel près de chez vous accepte. Vous êtes prévenu par SMS et email.',
  },
  {
    icon: 'i-lucide-house',
    title: 'Il vient chez vous',
    body: 'À l’heure convenue, avec le matériel. Vous n’avez pas à vous déplacer.',
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
    response: 'Merci Thomas. — Cary',
    date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
  },
];

const faqItems = [
  {
    question: 'Faut-il un compte ?',
    answer:
      'Non pour la première visite. Un compte gratuit vous permet ensuite de retrouver vos rendez-vous et documents.',
  },
  {
    question: 'Quels soins ?',
    answer:
      'Prises de sang et soins infirmiers, selon les professionnels disponibles près de chez vous.',
  },
  {
    question: 'Qui vient chez moi ?',
    answer:
      'Nous proposons la demande aux professionnels disponibles près de votre adresse. Vous voyez leur présentation et leurs avis.',
  },
  {
    question: 'Puis-je annuler ou décaler ?',
    answer:
      'Oui, depuis votre confirmation, souvent jusqu’à 24 heures avant. Le délai exact est indiqué sur le rendez-vous.',
  },
  {
    question: 'Est-ce remboursé ?',
    answer:
      'Sur ordonnance et avec un professionnel conventionné : comme en ville, carte Vitale et télétransmission.',
  },
];

const ctaButtons = computed(() => [
  {
    label: 'Réserver une visite',
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
