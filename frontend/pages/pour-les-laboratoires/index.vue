<template>
  <div>
    <LandingMaquetteHero
      eyebrow="Pour les laboratoires"
      :title-lines="['Plus de prises de sang', 'à domicile, sans le']"
      highlight="tableau Excel"
      description="Les demandes arrivent. Vous les donnez à vos préleveurs. Chacun voit sa tournée. Vous voyez le volume, en direct."
      image-src="https://images.unsplash.com/photo-1579154341184-22069e4614d2?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Tubes à essai en laboratoire d'analyses médicales"
      image-object-class="object-[center_40%]"
      :primary-cta="{ label: 'Inscrire mon laboratoire', to: '/lab/register', icon: 'i-lucide-building-2' }"
      :secondary-cta="{ label: 'Voir les tarifs', to: '/pour-les-laboratoires/tarifs' }"
      :stats="labStats"
      :quote="labQuote"
    />
  <LandingMaquetteMarketingBackdrop>

    <LandingMaquettePillarGrid
      eyebrow="En résumé"
      title="Ce que votre laboratoire gagne"
      subtitle="Des demandes claires. Une équipe qui sait qui va où."
      :columns="4"
      section-class="bg-white dark:bg-gray-950"
      :items="trustItems"
    />

    <LandingMaquettePillarGrid
      eyebrow="Avantages"
      title="De la demande à la tournée, sans circuits informels"
      subtitle="De la réception des demandes au suivi des rendez-vous — sans multiplier les tableurs."
      :columns="3"
      section-class="bg-[#F7F7FB] dark:bg-gray-900/80"
      :items="benefits"
    />

    <LandingMaquetteStepsCards
      eyebrow="Intégration"
      :heading-lines="['Trois étapes', 'pour recevoir vos premières demandes']"
      intro="Dossier, préleveurs, puis les demandes dans votre zone."
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
      title="Lancez vraiment le domicile"
      subtitle="Mise en place guidée. Préleveurs et tournées au même endroit."
      :buttons="ctaButtons"
      outer-class="bg-[#F7F7FB] dark:bg-gray-900/70"
    />
  </LandingMaquetteMarketingBackdrop>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

useLandingSeo({
  title: 'Laboratoires : prises de sang à domicile, tournées et préleveurs | Cary',
  description:
    'Les demandes arrivent. Vous les donnez à vos préleveurs. Chacun voit sa tournée. Vous voyez le volume, en direct.',
  keywords:
    'laboratoire à domicile, prise de sang à domicile, préleveur, plateforme laboratoire, Cary, analyses à domicile',
  path: '/pour-les-laboratoires',
});

const labStats = [
  { num: '8+', rest: ' laboratoires partenaires' },
  { num: 'En direct', rest: ' suivi des tournées' },
  { num: '1 an', rest: ' déjà sur le terrain' },
];

const labQuote = {
  text:
    "Tableau de bord clair, suivi des tournées en temps réel. Notre volume à domicile a nettement augmenté depuis l'intégration.",
  author: 'Marie T., responsable laboratoire',
};

const trustItems = [
  { icon: 'i-lucide-droplet', title: 'Des demandes dans votre secteur', description: 'Les prises de sang qui correspondent à votre zone.' },
  { icon: 'i-lucide-users', title: 'Votre équipe, au même endroit', description: 'Préleveurs et accès séparés.' },
  { icon: 'i-lucide-bar-chart', title: 'Vous voyez l’activité', description: 'Volume, journées, charge.' },
  { icon: 'i-lucide-file-check', title: 'Traçabilité', description: 'Qui est passé, quand, sur quel rendez-vous.' },
];

const benefits = [
  {
    icon: 'i-lucide-droplet',
    title: 'Demandes de prélèvements',
    description:
      'Recevez les demandes de prise de sang à domicile dans votre secteur. Vous acceptez ou vous déléguez selon votre capacité.',
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
    title: 'Vous inscrivez le laboratoire',
    body:
      'SIRET, raison sociale, zone. Vous envoyez le dossier.',
  },
  {
    icon: 'i-lucide-settings',
    title: 'Nous validons, vous paramétrez',
    body:
      'Accès laboratoire, préleveurs, créneaux.',
  },
  {
    icon: 'i-lucide-calendar-check',
    title: 'Vous recevez et vous assignez',
    body:
      'Notification, préleveur, suivi du rendez-vous.',
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
    question: 'Quels documents ?',
    answer:
      'SIRET, raison sociale, coordonnées. Un justificatif d’activité peut être demandé.',
  },
  {
    question: 'Comment gérer les préleveurs ?',
    answer:
      'Vous créez leurs accès, vous assignez les rendez-vous, chacun voit son planning.',
  },
  {
    question: 'Comment arrivent les demandes ?',
    answer:
      'Elles vont aux laboratoires dont la zone couvre l’adresse du patient. Vous acceptez selon votre capacité.',
  },
  {
    question: 'Y a-t-il un engagement ?',
    answer:
      'Les tarifs sont sur la page dédiée. Vous pouvez annuler à tout moment.',
  },
  {
    question: 'Les données sont-elles protégées ?',
    answer:
      'Oui. Données de santé, RGPD, traçabilité.',
  },
];

const ctaButtons = [
  { label: 'Inscrire mon laboratoire', to: '/lab/register', icon: 'i-lucide-building-2', variant: 'solid' as const },
  { label: 'Contact', to: '/contact', variant: 'outline' as const },
];
</script>
