<template>
  <div>
    <LandingMaquetteHero
      eyebrow="Pour les laboratoires"
      :title-lines="['Prélèvements', 'à domicile']"
      highlight="pilotés"
      description="Recevez les demandes de prélèvement à domicile, gérez vos préleveurs, assignez les tournées et suivez votre activité. Une solution pensée pour développer vos prélèvements à domicile tout en restant pilotable au quotidien."
      image-src="https://images.unsplash.com/photo-1579154341184-22069e4614d2?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Tubes à essai en laboratoire d'analyses médicales"
      image-object-class="object-[center_40%]"
      :primary-cta="{ label: 'Inscrire mon laboratoire', to: '/lab/register', icon: 'i-lucide-building-2' }"
      :secondary-cta="{ label: 'Voir les tarifs laboratoires', to: '/pour-les-laboratoires/tarifs' }"
      :stats="labStats"
      :quote="labQuote"
    />
  <LandingMaquetteMarketingBackdrop>

    <LandingMaquettePillarGrid
      eyebrow="En résumé"
      title="Ce que votre laboratoire gagne avec la plateforme"
      subtitle="Des flux patients structurés, une organisation terrain plus lisible pour vos équipes."
      :columns="4"
      section-class="bg-white dark:bg-gray-950"
      :items="trustItems"
    />

    <LandingMaquettePillarGrid
      eyebrow="Avantages"
      title="Une solution pour structurer vos prélèvements à domicile"
      subtitle="De la réception des demandes au suivi des rendez-vous — sans multiplier les tableurs ni les circuits informels."
      :columns="3"
      section-class="bg-[#F7F7FB] dark:bg-gray-900/80"
      :items="benefits"
    />

    <LandingMaquetteStepsCards
      eyebrow="Intégration"
      :heading-lines="['Trois étapes', 'pour rejoindre le réseau']"
      intro="En quelques étapes, votre laboratoire est paramétré : couverture, préleveurs et réception des demandes."
      section-class="bg-white dark:bg-gray-950"
      :cards="stepCards"
    />

    <section class="border-y border-[#E8E8F0]/80 bg-white py-[72px] dark:border-gray-800 dark:bg-gray-950 lg:py-[100px]">
      <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
        <Reviews
          title="Ce que disent les laboratoires partenaires"
          subtitle="Laboratoires qui proposent la prise de sang à domicile avec Cary."
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
      eyebrow="Prêt à vous lancer ?"
      title="Développez vos prélèvements à domicile"
      subtitle="Rejoignez les laboratoires qui utilisent Cary : mise en place guidée, préleveurs et tournées depuis un seul espace."
      :buttons="ctaButtons"
      outer-class="bg-[#F7F7FB] dark:bg-gray-900/70"
    />
  </LandingMaquetteMarketingBackdrop>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

useLandingSeo({
  title: 'Pour les laboratoires | Prélèvement à domicile | Cary',
  description:
    "Laboratoires d'analyses : proposez des prises de sang à domicile avec Cary. Gérez les demandes et vos préleveurs.",
  keywords:
    'laboratoire à domicile, prise de sang à domicile, préleveur, plateforme laboratoire, Cary, analyses à domicile',
  path: '/pour-les-laboratoires',
});

const labStats = [
  { num: '+50', rest: ' laboratoires partenaires' },
  { num: '+10 000', rest: ' prélèvements à domicile coordonnés' },
  { num: 'Temps réel', rest: ' suivi des tournées' },
];

const labQuote = {
  text:
    "Tableau de bord clair, suivi des tournées en temps réel. Notre volume à domicile a nettement augmenté depuis l'intégration.",
  author: 'Marie T., responsable laboratoire',
};

const trustItems = [
  { icon: 'i-lucide-droplet', title: 'Demandes de prélèvements', description: 'Dans votre secteur d’intervention.' },
  { icon: 'i-lucide-users', title: 'Préleveurs et sous-comptes', description: 'Gestion centralisée de l’équipe.' },
  { icon: 'i-lucide-bar-chart', title: 'Statistiques et suivi', description: 'Tableaux de bord pour piloter l’activité.' },
  { icon: 'i-lucide-file-check', title: 'Conformité et traçabilité', description: 'Données et parcours sécurisés.' },
];

const benefits = [
  {
    icon: 'i-lucide-droplet',
    title: 'Demandes de prélèvements',
    description:
      'Recevez les demandes de prise de sang à domicile dans votre secteur. Acceptez ou déléguez selon votre capacité.',
  },
  {
    icon: 'i-lucide-users',
    title: 'Préleveurs et sous-comptes',
    description:
      'Gérez vos préleveurs et sous-comptes, assignez les rendez-vous et suivez l’activité en temps réel.',
  },
  {
    icon: 'i-lucide-calendar',
    title: 'Planning et tournées',
    description: 'Visualisez créneaux et déplacements et optimisez les tournées à domicile.',
  },
  {
    icon: 'i-lucide-building-2',
    title: 'Fiche laboratoire',
    description:
      'Présentez votre laboratoire : coordonnées, zone de couverture, analyses proposées.',
  },
  {
    icon: 'i-lucide-bar-chart',
    title: 'Statistiques',
    description: 'Tableaux de bord pour suivre le volume de prélèvements et l’activité.',
  },
  {
    icon: 'i-lucide-file-check',
    title: 'Conformité',
    description: 'Traçabilité des rendez-vous et des professionnels, alignée avec votre organisation.',
  },
];

const stepCards = [
  {
    highlight: true,
    icon: 'i-lucide-file-edit',
    title: 'Inscrivez votre laboratoire',
    body:
      'Renseignez les informations du laboratoire (SIRET, raison sociale, zone de couverture) et envoyez votre demande d’inscription.',
  },
  {
    icon: 'i-lucide-settings',
    title: 'Validation et paramétrage',
    body:
      'Notre équipe valide votre dossier et vous donne accès à l’espace laboratoire. Ajoutez vos préleveurs et vos créneaux.',
  },
  {
    icon: 'i-lucide-calendar-check',
    title: 'Recevez et assignez les demandes',
    body:
      'Les demandes de prélèvement à domicile vous sont notifiées. Assignez vos préleveurs et suivez les rendez-vous.',
  },
];

const landingReviews = [
  {
    id: '1',
    patientName: 'Dr. Laurent G., Labo BioSanté',
    rating: 5,
    comment:
      'On a intégré Cary pour les prélèvements à domicile. Les demandes arrivent bien géolocalisées, on assigne à nos préleveurs en un clic. Gain de temps énorme.',
    response: 'Merci pour votre retour. — Équipe Cary',
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    patientName: 'Marie T., responsable labo',
    rating: 5,
    comment:
      'Tableau de bord clair, suivi des tournées en temps réel. Les patients sont prévenus par SMS, moins de no-show. On a augmenté notre volume à domicile.',
    response: 'Content que la plateforme vous aide. — Cary',
    date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    patientName: 'Jean-Marc P., Labo MédiLab',
    rating: 5,
    comment:
      'Inscription et mise en route en une semaine. Nos préleveurs ont leur propre accès, ils voient leurs RDV du jour. Conforme à notre façon de travailler.',
    response: 'Merci Jean-Marc. — Équipe',
    date: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    patientName: 'Sandrine L., directrice labo',
    rating: 5,
    comment:
      'Les statistiques nous aident à anticiper les pics. On a pu recruter un préleveur à mi-temps grâce à la croissance du volume domicile.',
    response: 'Ravi que les stats vous servent. — Cary',
    date: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
  },
  {
    id: '5',
    patientName: 'Olivier D., Labo Analyses Plus',
    rating: 5,
    comment:
      'Traçabilité nickel : qui a fait quoi, quand. Les patients laissent des avis, ça rassure. On est satisfaits du partenariat.',
    response: 'Merci Olivier. — Cary',
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: '6',
    patientName: 'Catherine V., labo partenaire',
    rating: 5,
    comment:
      "Support réactif, évolutions régulières. On recommande Cary à d'autres laboratoires qui hésitent à se lancer en domicile.",
    response: 'Merci Catherine pour la recommandation. — Équipe',
    date: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000),
  },
];

const faqItems = [
  {
    question: 'Quels documents pour inscrire mon laboratoire ?',
    answer:
      "Vous aurez besoin du SIRET, de la raison sociale et des coordonnées du laboratoire. Un justificatif d'activité peut être demandé pour valider l'inscription.",
  },
  {
    question: 'Comment gérer les préleveurs ?',
    answer:
      "Depuis votre espace laboratoire, créez les comptes préleveurs (ou sous-comptes), assignez les rendez-vous et suivez l'activité. Chaque préleveur accède à son planning.",
  },
  {
    question: 'Comment sont réparties les demandes ?',
    answer:
      "Les demandes de prise de sang à domicile sont adressées aux laboratoires dont la zone de couverture correspond à l'adresse du patient. Vous acceptez ou déléguez selon votre capacité.",
  },
  {
    question: "Y a-t-il des frais ou un engagement ?",
    answer:
      "Les conditions tarifaires et d'engagement vous sont communiquées lors de l'inscription. Nous privilégions la transparence.",
  },
  {
    question: 'Les données patients sont-elles sécurisées ?',
    answer:
      'Oui. Les données de santé sont traitées de façon sécurisée et conforme au RGPD et aux usages du secteur. Traçabilité et confidentialité sont assurées.',
  },
];

const ctaButtons = [
  { label: 'Inscrire mon laboratoire', to: '/lab/register', icon: 'i-lucide-building-2', variant: 'solid' as const },
  { label: 'Contact', to: '/contact', variant: 'outline' as const },
];
</script>
