<template>
  <div>
    <LandingMaquetteHero
      eyebrow="Pour les professionnels de santé"
      :title-lines="['Orientez vos patients', 'vers le']"
      highlight="domicile"
      description="Référencez vos patients sur Cary pour une prise de sang ou des soins infirmiers à domicile : ils réservent en quelques clics avec leur ordonnance et vous conservez une vision utile pour le suivi."
      image-src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Médecin avec stéthoscope, en blouse blanche"
      image-object-class="object-[center_20%]"
      :primary-cta="{ label: 'Rejoindre en tant que professionnel', to: '/pro/register', icon: 'i-lucide-stethoscope' }"
      :secondary-cta="{ label: 'Parcours patients', to: '/pour-les-patients' }"
      :stats="proStats"
      :quote="proQuote"
    />
  <LandingMaquetteMarketingBackdrop>

    <LandingMaquettePillarGrid
      eyebrow="Synthèse"
      title="Un relais simple entre votre prescription et la chaîne terrain"
      subtitle="Une expérience sobre pour vous concentrer sur le fond médical, pas sur l’outil."
      :columns="4"
      section-class="bg-white dark:bg-gray-950"
      :items="trustItems"
    />

    <LandingMaquettePillarGrid
      eyebrow="Avantages"
      title="Une plateforme pensée avec les cabinets et réseaux de santé"
      subtitle="Référencer vos patients sans multiplier les emails ni les relances téléphoniques inutiles."
      :columns="3"
      section-class="bg-[#F7F7FB] dark:bg-gray-900/80"
      :items="benefits"
    />

    <LandingMaquetteStepsCards
      eyebrow="Feuille de route express"
      :heading-lines="['Trois étapes', 'pour vos patients qui restent au domicile']"
      intro="Une fois votre dossier validé depuis votre inscription professionnelle, vos patients retrouvent un tunnel patient identique quel que soit le médical prescripteur."
      section-class="bg-white dark:bg-gray-950"
      :cards="stepCards"
    />

    <section class="border-y border-[#E8E8F0]/80 bg-white py-[72px] dark:border-gray-800 dark:bg-gray-950 lg:py-[100px]">
      <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
        <Reviews
          title="Professionnels parlent du parcours avec Cary"
          subtitle="Une sélection parmi médecins, kinés et autres professionnels utilisant ou recommandant le flux domiciliaire aux patients qui ne peuvent plus voyager jusqu’à la biologie ou l’IDEL au cabinet fixe."
          :reviews="landingReviews"
          :max-reviews="6"
          background-class="!bg-transparent"
        />
      </div>
    </section>

    <LandingMaquetteFaq anchor-id="faq" section-class="bg-[#F7F7FB] dark:bg-gray-900/70" :items="faqItems" />

    <LandingMaquetteInlineCta
      eyebrow="Prêt à ouvrir un compte professionnel santé Cary"
      title="Orientez désormais les patients depuis une interface commune infirmiers + laboratoires"
      subtitle="Inscription décrite étape par étape : notre équipe vous aide si votre situation professionnelle sort des dossiers habituels (conventionnement, doubles activités, etc.)."
      :buttons="ctaButtons"
      outer-class="bg-[#F7F7FB] dark:bg-gray-900/70"
    />
  </LandingMaquetteMarketingBackdrop>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

useLandingSeo({
  title: 'Pour les professionnels de santé | Cary',
  description:
    'Médecins, kinésithérapeutes et professionnels de santé : prescrivez le domicile via Cary.',
  keywords:
    'médecin prescription domicile, kiné à domicile, professionnel santé Cary, prescription prélèvement',
  path: '/pour-les-professionnels',
});

const proStats = [
  { num: 'Adeli vérifié', rest: ' à l’inscription' },
  { num: 'Espace dédié', rest: ' aux orientations patients' },
  { num: 'RGPD', rest: ' données santé maîtrisées' },
];

const proQuote = {
  text:
    "J'oriente mes patients âgés ou à mobilité réduite vers Cary pour les prises de sang. Ils sont ravis, plus besoin de les accompagner au labo.",
  author: 'Dr. Pierre M., médecin généraliste',
};

const trustItems = [
  { icon: 'i-lucide-users', title: 'Orientation patient', description: 'Un lien clair à communiquer après la consultation.' },
  { icon: 'i-lucide-calendar', title: 'Création de rendez-vous', description: 'Vous pouvez initier la demande depuis votre espace pro.' },
  { icon: 'i-lucide-file-text', title: 'Suivi des soins', description: 'Vision utile sur les rendez-vous et documents partagés lorsque le patient est lié à votre compte.' },
  { icon: 'i-lucide-shield', title: 'Traitement des données', description: 'Chaîne orientée conformité RGPD et exigences du secteur santé.' },
];

const benefits = [
  {
    icon: 'i-lucide-users',
    title: 'Orienter vos patients',
    description:
      'Référencez le parcours pour une prise de sang ou des soins infirmiers à domicile : le patient complète en autonomie après votre orientation.',
  },
  {
    icon: 'i-lucide-calendar',
    title: 'Création de rendez-vous',
    description:
      'Depuis votre espace, vous pouvez initier une demande en indiquant le type de soin et les préférences de créneau pour le patient.',
  },
  {
    icon: 'i-lucide-file-text',
    title: 'Suivi des soins',
    description:
      "Consultez l'historique lorsque le patient est rattaché à votre compte · utile pour vos bilans de suivi lorsque la structure l'autorise réglementairement.",
  },
  {
    icon: 'i-lucide-badge-check',
    title: 'Profil professionnel',
    description:
      'Adeli, spécialités : les patients identifient votre rôle prescripteur lorsqu’ils suivent votre lien Cary.',
  },
  {
    icon: 'i-lucide-shield',
    title: 'Confidentialité renforcée',
    description:
      'Données de santé chiffrées en transit et au repos sur infrastructure adaptée aux usages médicaux français.',
  },
  {
    icon: 'i-lucide-handshake',
    title: 'Réseau partenaires',
    description:
      'Accès à une base d’infirmiers et de laboratoires partenaires intervenant chez le patient sur des actes courants.',
  },
];

const stepCards = [
  {
    highlight: true,
    icon: 'i-lucide-file-edit',
    title: 'Inscrivez-vous',
    body: 'Renseignez vos informations professionnelles et votre numéro Adeli pour que notre équipe valide votre dossier.',
  },
  {
    icon: 'i-lucide-layout-dashboard',
    title: 'Accédez à votre espace',
    body: 'Après validation : création de demandes et vision utile pour vos patients orientés via Cary.',
  },
  {
    icon: 'i-lucide-user-check',
    title: 'Orientez vos patients',
    body: 'Indiquez à vos patients qu’ils peuvent réserver sur Cary : prise de sang ou soins infirmiers à domicile selon prescription.',
  },
];

const landingReviews = [
  {
    id: '1',
    patientName: 'Dr. Pierre M., médecin généraliste',
    rating: 5,
    comment:
      "J'oriente mes patients âgés ou à mobilité réduite vers Cary pour les prises de sang. Ils sont ravis, plus besoin de les accompagner au labo.",
    response: 'Merci Docteur pour votre confiance. — Cary',
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    patientName: 'Marie L., kinésithérapeute',
    rating: 5,
    comment:
      'Plusieurs de mes patients ont des soins infirmiers à domicile : je leur recommande Cary pour la coordination simple.',
    response: 'Merci Marie. — Équipe Cary',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    patientName: 'Dr. Sophie R., médecin',
    rating: 5,
    comment:
      'Inscription rapide, interface claire. Pour certains patients, je prépare moi-même le rendez-vous depuis mon espace et ils reçoivent la confirmation automatiquement.',
    response: 'Content que cette utilisation puisse fonctionner ainsi. — Cary',
    date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    patientName: 'Thomas B., infirmier coordinateur',
    rating: 5,
    comment:
      'Nous orientons vers Cary pour des soins à domicile quand notre équipe ne peut intervenir nous-même sur la zone géographique',
    response: 'Merci Thomas.',
    date: new Date(Date.now() - 27 * 86400000),
  },
  {
    id: '5',
    patientName: 'Dr. Isabelle F., généraliste',
    rating: 5,
    comment: 'Réduction forte des trajets perdus lorsque plusieurs examens peuvent passer par un unique passage infirmier',
    response: 'Merci Docteur',
    date: new Date(Date.now() - 35 * 86400000),
  },
  {
    id: '6',
    patientName: 'Nathalie D., médecin',
    rating: 5,
    comment: 'Simple, orienté confidentialité, je la recommande à mes confrères ayant des patients en mobilité très réduite',
    response: 'Merci Nathalie',
    date: new Date(Date.now() - 42 * 86400000),
  },
];

const faqItems = [
  {
    question: 'Qu’est-ce qu’Cary pour un professionnel ?',
    answer:
      'Une plateforme qui met en relation patients et professionnels terrain (infirmiers, laboratoires) pour des soins à domicile. Vous orientez ou initiez la demande ; la réalisation technique est assurée par ces professionnels.',
  },
  {
    question: 'Dois-je payer pour inscrire mes patients ?',
    answer:
      'Les conditions pour les professionnels vous sont communiquées lors de l’inscription : l’objectif est de faciliter l’orientation sans complexité inutile.',
  },
  {
    question: 'Comment créer un rendez-vous pour un patient ?',
    answer:
      'Depuis votre espace pro, vous pouvez créer une demande en indiquant type de soin et préférences de créneaux. Le patient peut aussi réserver seul après votre indication.',
  },
  {
    question: 'Les données de mes patients sont-elles protégées ?',
    answer:
      'Oui · traitées selon RGPD et bonnes pratiques du secteur santé français : données limitées aux besoins de la réservation ou du suivi convenu avec le patient.',
  },
  {
    question: 'Qui réalise les soins à domicile ?',
    answer:
      'Ce sont nos partenaires infirmiers ou laboratoires : vous restez médecin prescripteur lorsque votre acte officiel précède leur intervention.',
  },
];

const ctaButtons = [
  { label: 'Rejoindre en tant que professionnel', to: '/pro/register', icon: 'i-lucide-stethoscope', variant: 'solid' as const },
  { label: 'Contact équipe onboarding', to: '/contact', variant: 'outline' as const },
];
</script>
