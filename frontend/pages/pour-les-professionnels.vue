<template>
  <div>
    <LandingMaquetteHero
      eyebrow="Pour les médecins et les soignants"
      :title-lines="['Vos patients restent', 'chez eux. Vous']"
      highlight="gardez le fil"
      description="Après la consultation, ils réservent une prise de sang ou un soin à domicile. Vous voyez où ça en est, sans relancer le secrétariat."
      image-src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Médecin avec stéthoscope, en blouse blanche"
      image-object-class="object-[center_20%]"
      :primary-cta="{ label: 'Créer mon compte professionnel', to: '/pro/register', icon: 'i-lucide-stethoscope' }"
      :secondary-cta="{ label: 'Voir le parcours patient', to: '/pour-les-patients' }"
      :stats="proStats"
      :quote="proQuote"
    />
  <LandingMaquetteMarketingBackdrop>

    <LandingMaquettePillarGrid
      eyebrow="Synthèse"
      title="Moins de trajet pour eux. Moins de relances pour vous."
      subtitle="Vous restez sur le soin. Cary s’occupe du déplacement à domicile."
      :columns="4"
      section-class="bg-white dark:bg-gray-950"
      :items="trustItems"
    />

    <LandingMaquettePillarGrid
      eyebrow="Avantages"
      title="Utile au cabinet, sans nouvel usine à gaz"
      subtitle="Plus besoin d’enchaîner les appels pour trouver un infirmier ou un labo à domicile."
      :columns="3"
      section-class="bg-[#F7F7FB] dark:bg-gray-900/80"
      :items="benefits"
    />

    <LandingMaquetteStepsCards
      eyebrow="Pour commencer"
      :heading-lines="['Trois étapes', 'pour vos patients qui ne peuvent plus se déplacer']"
      intro="Une fois votre dossier validé, vos patients réservent comme n’importe quel patient Cary."
      section-class="bg-white dark:bg-gray-950"
      :cards="stepCards"
    />

    <section class="border-y border-[#E8E8F0]/80 bg-white py-[72px] dark:border-gray-800 dark:bg-gray-950 lg:py-[100px]">
      <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
        <Reviews
          title="Ils orientent leurs patients vers Cary"
          subtitle="Médecins et soignants qui envoient leurs patients réserver un soin à domicile."
          :reviews="landingReviews"
          :max-reviews="6"
          background-class="!bg-transparent"
        />
      </div>
    </section>

    <LandingMaquetteFaq anchor-id="faq" section-class="bg-[#F7F7FB] dark:bg-gray-900/70" :items="faqItems" />

    <LandingMaquetteInlineCta
      eyebrow="Prêt à y aller ?"
      title="Un seul endroit pour orienter vers l’infirmier ou le laboratoire"
      subtitle="Inscription guidée. Notre équipe vous aide si votre situation sort de l’ordinaire."
      :buttons="ctaButtons"
      outer-class="bg-[#F7F7FB] dark:bg-gray-900/70"
    />
  </LandingMaquetteMarketingBackdrop>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

useLandingSeo({
  title: 'Médecins et soignants : orientez vos patients vers le domicile | Cary',
  description:
    'Après la consultation, vos patients réservent une prise de sang ou un soin à domicile. Vous voyez où ça en est.',
  keywords:
    'médecin prescription domicile, kiné à domicile, professionnel santé Cary, prescription prélèvement',
  path: '/pour-les-professionnels',
});

const proStats = [
  { num: 'Adeli', rest: ' vérifié à l’inscription' },
  { num: 'Un espace', rest: ' pour suivre vos orientations' },
  { num: 'RGPD', rest: ' données de santé protégées' },
];

const proQuote = {
  text:
    "J'oriente mes patients âgés ou à mobilité réduite vers Cary pour les prises de sang. Ils sont ravis, plus besoin de les accompagner au labo.",
  author: 'Dr. Pierre M., médecin généraliste',
};

const trustItems = [
  { icon: 'i-lucide-users', title: 'Un lien à leur donner', description: 'Après la consultation, ils réservent tout seuls.' },
  { icon: 'i-lucide-calendar', title: 'Vous pouvez aussi créer le rendez-vous', description: 'Depuis votre espace, si vous préférez le lancer vous-même.' },
  { icon: 'i-lucide-file-text', title: 'Vous voyez l’avancement', description: 'Quand le patient est lié à votre compte.' },
  { icon: 'i-lucide-shield', title: 'Données protégées', description: 'RGPD et hébergement adapté à la santé.' },
];

const benefits = [
  {
    icon: 'i-lucide-users',
    title: 'Orienter vos patients',
    description:
      'Ils réservent une prise de sang ou un soin infirmier à domicile, tout seuls, après votre indication.',
  },
  {
    icon: 'i-lucide-calendar',
    title: 'Créer le rendez-vous vous-même',
    description:
      'Depuis votre espace : type de soin et créneaux, si vous préférez lancer la demande.',
  },
  {
    icon: 'i-lucide-file-text',
    title: 'Suivre l’avancement',
    description:
      'Consultez l’historique lorsque le patient est rattaché à votre compte.',
  },
  {
    icon: 'i-lucide-badge-check',
    title: 'Votre fiche professionnelle',
    description:
      'Adeli, spécialités : les patients voient qui les a orientés.',
  },
  {
    icon: 'i-lucide-shield',
    title: 'Données protégées',
    description:
      'Données de santé chiffrées, hébergement adapté aux usages médicaux français.',
  },
  {
    icon: 'i-lucide-handshake',
    title: 'Infirmiers et laboratoires partenaires',
    description:
      'Des professionnels qui se déplacent chez le patient pour les actes courants.',
  },
];

const stepCards = [
  {
    highlight: true,
    icon: 'i-lucide-file-edit',
    title: 'Vous vous inscrivez',
    body: 'Informations professionnelles et numéro Adeli. Nous validons le dossier.',
  },
  {
    icon: 'i-lucide-layout-dashboard',
    title: 'Vous ouvrez votre espace',
    body: 'Créer une demande, suivre vos patients orientés.',
  },
  {
    icon: 'i-lucide-user-check',
    title: 'Vous leur indiquez Cary',
    body: 'Prise de sang ou soin infirmier à domicile, selon l’ordonnance.',
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
    question: 'À quoi sert Cary pour un médecin ou un kiné ?',
    answer:
      'Cary met vos patients en relation avec des infirmiers et des laboratoires pour des soins à domicile. Vous orientez ou vous créez la demande. Ce sont eux qui réalisent le geste.',
  },
  {
    question: 'Est-ce payant pour moi ?',
    answer:
      'Les conditions vous sont indiquées à l’inscription. L’idée : orienter sans complexité inutile.',
  },
  {
    question: 'Comment je crée un rendez-vous ?',
    answer:
      'Depuis votre espace : type de soin et créneaux. Le patient peut aussi réserver seul après votre indication.',
  },
  {
    question: 'Les données sont-elles protégées ?',
    answer:
      'Oui. RGPD, limitées à ce qui sert la réservation ou le suivi convenu avec le patient.',
  },
  {
    question: 'Qui fait le soin ?',
    answer:
      'Les infirmiers et laboratoires partenaires. Vous restez le prescripteur.',
  },
];

const ctaButtons = [
  { label: 'Créer mon compte professionnel', to: '/pro/register', icon: 'i-lucide-stethoscope', variant: 'solid' as const },
  { label: 'Parler à l’équipe', to: '/contact', variant: 'outline' as const },
];
</script>
