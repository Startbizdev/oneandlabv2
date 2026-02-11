<template>
  <div>
    <LandingHero
      badge="Pour les laboratoires"
      badge-icon="i-lucide-building-2"
      title="Prises de sang à domicile avec OneAndLab"
      subtitle="Connectez votre laboratoire à un réseau de patients"
      description="Recevez des demandes de prélèvement à domicile. Gérez vos préleveurs, assignez les tournées et suivez votre activité. Une solution clé en main pour développer vos prélèvements à domicile."
      image-src="/undraw/accueil.svg"
      image-alt="Laboratoire à domicile"
      :ctas="heroCtas"
      background-class="bg-white"
    />

    <LandingTrust
      :items="trustItems"
      background-class="bg-gray-50/50"
    />

    <LandingRoleBenefits
      title="Les avantages pour les laboratoires"
      subtitle="Une solution pour développer l’activité de prélèvement à domicile."
      :items="benefits"
      background-class="bg-white"
    />

    <HowItWorks
      title="Comment intégrer OneAndLab ?"
      subtitle="En 3 étapes, votre laboratoire rejoint la plateforme."
      :steps="howItWorksSteps"
      background-class="bg-gray-50"
    />

    <LandingFaq
      title="Questions fréquentes"
      subtitle="Tout ce qu’il faut savoir pour les laboratoires."
      :items="faqItems"
      background-class="bg-white"
    />

    <LandingCtaBlock
      title="Rejoignez OneAndLab"
      subtitle="Inscrivez votre laboratoire. Après validation, vous pourrez recevoir des demandes et gérer vos préleveurs depuis votre espace."
      :buttons="ctaButtons"
      background-class="bg-primary-50/30"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useLandingSeo({
  title: 'Pour les laboratoires | Prise de sang à domicile | OneAndLab',
  description: 'Laboratoires d\'analyses : proposez des prises de sang à domicile avec OneAndLab. Gérez les demandes et vos préleveurs. Inscription laboratoire.',
  keywords: 'laboratoire à domicile, prise de sang à domicile, préleveur, plateforme laboratoire, OneAndLab, analyses à domicile',
  path: '/pour-les-laboratoires',
})

const heroCtas = [
  { label: 'Inscrire mon laboratoire', to: '/lab/register', color: 'primary', variant: 'solid', icon: 'i-lucide-building-2' },
]

const trustItems = [
  { icon: 'i-lucide-droplet', title: 'Demandes de prélèvements', description: 'Dans votre secteur' },
  { icon: 'i-lucide-users', title: 'Préleveurs et sous-comptes', description: 'Gestion centralisée' },
  { icon: 'i-lucide-bar-chart', title: 'Statistiques et suivi', description: 'Tableaux de bord' },
  { icon: 'i-lucide-file-check', title: 'Conformité et traçabilité', description: 'Sécurité des données' },
]

const benefits = [
  { icon: 'i-lucide-droplet', title: 'Demandes de prélèvements', description: 'Recevez les demandes de prise de sang à domicile dans votre secteur. Acceptez ou déléguez selon votre capacité.' },
  { icon: 'i-lucide-users', title: 'Préleveurs et sous-comptes', description: 'Gérez vos préleveurs et sous-comptes. Assignez les rendez-vous et suivez l’activité.' },
  { icon: 'i-lucide-calendar', title: 'Planning et tournées', description: 'Visualisez les rendez-vous, créneaux et déplacements. Optimisez les tournées à domicile.' },
  { icon: 'i-lucide-building-2', title: 'Fiche laboratoire', description: 'Présentez votre laboratoire : coordonnées, zone de couverture, types d’analyses proposées.' },
  { icon: 'i-lucide-bar-chart', title: 'Statistiques', description: 'Tableaux de bord et statistiques pour suivre le volume de prélèvements et l’activité.' },
  { icon: 'i-lucide-file-check', title: 'Conformité', description: 'Traçabilité des rendez-vous et des professionnels. Intégration dans votre organisation existante.' },
]

const howItWorksSteps = [
  { title: 'Inscrivez votre laboratoire', description: 'Renseignez les informations de votre laboratoire (SIRET, raison sociale, zone de couverture). Envoyez votre demande d’inscription.', icon: 'i-lucide-file-edit' },
  { title: 'Validation et paramétrage', description: 'Notre équipe valide votre dossier et vous donne accès à l’espace laboratoire. Vous pouvez ajouter vos préleveurs et vos créneaux.', icon: 'i-lucide-settings' },
  { title: 'Recevez et assignez les demandes', description: 'Les demandes de prélèvement à domicile vous sont notifiées. Vous les assignez à vos préleveurs et suivez les rendez-vous en temps réel.', icon: 'i-lucide-calendar-check' },
]

const faqItems = [
  { question: 'Quels documents pour inscrire mon laboratoire ?', answer: 'Vous aurez besoin du SIRET, de la raison sociale et des coordonnées du laboratoire. Un justificatif d’activité peut être demandé pour valider l’inscription.' },
  { question: 'Comment gérer les préleveurs ?', answer: 'Depuis votre espace laboratoire, vous pouvez créer des comptes préleveurs (ou sous-comptes), leur assigner des rendez-vous et suivre leur activité. Chaque préleveur accède à son propre planning.' },
  { question: 'Comment sont réparties les demandes ?', answer: 'Les demandes de prise de sang à domicile sont adressées aux laboratoires dont la zone de couverture correspond à l’adresse du patient. Vous acceptez ou déléguez selon votre capacité.' },
  { question: 'Y a-t-il des frais ou un engagement ?', answer: 'Les conditions tarifaires et d’engagement vous sont communiquées lors de l’inscription. Nous privilégions la transparence et l’alignement avec votre modèle d’activité.' },
  { question: 'Les données patients sont-elles sécurisées ?', answer: 'Oui. Les données de santé sont traitées de manière sécurisée et conforme aux exigences du secteur (RGPD, bonnes pratiques). Traçabilité et confidentialité sont assurées.' },
]

const ctaButtons = [
  { label: 'Inscrire mon laboratoire', to: '/lab/register', color: 'primary', icon: 'i-lucide-building-2' },
  { label: 'Nous contacter', to: '/contact', color: 'neutral', icon: 'i-lucide-mail' },
]
</script>
