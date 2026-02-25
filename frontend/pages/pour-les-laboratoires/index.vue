<template>
  <div>
    <LandingHero
      badge="Pour les laboratoires"
      badge-icon="i-lucide-building-2"
      title="Prises de sang à domicile avec OneAndLab"
      subtitle="Connectez votre laboratoire à un réseau de patients"
      description="Recevez des demandes de prélèvement à domicile. Gérez vos préleveurs, assignez les tournées et suivez votre activité. Une solution clé en main pour développer vos prélèvements à domicile."
      :ctas="heroCtas"
      :background-image="heroBackgroundImage"
      overlay-class="bg-black/55"
    />

    <LandingTrust
      :items="trustItems"
      background-class="bg-gray-50/50"
    />

    <LandingRoleBenefits
      title="Les avantages pour les laboratoires"
      subtitle="Une solution pour développer l'activité de prélèvement à domicile."
      :items="benefits"
      background-class="bg-white"
    />

    <HowItWorks
      title="Comment intégrer OneAndLab ?"
      subtitle="En 3 étapes, votre laboratoire rejoint la plateforme."
      :steps="howItWorksSteps"
      background-class="bg-gray-50"
    />

    <Reviews
      title="Ce que disent les laboratoires partenaires"
      subtitle="Des laboratoires qui proposent la prise de sang à domicile avec OneAndLab."
      :reviews="landingReviews"
      :max-reviews="6"
      background-class="bg-white"
    />

    <LandingFaq
      title="Questions fréquentes"
      subtitle="Tout ce qu'il faut savoir pour les laboratoires."
      :items="faqItems"
      background-class="bg-white"
    />

    <LandingCtaBlock
      title="Développez vos prélèvements à domicile"
      subtitle="Rejoignez les laboratoires qui proposent la prise de sang à domicile avec OneAndLab. Mise en place rapide, préleveurs et tournées gérés depuis un seul espace."
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

// Image hero (undraw labo – bleu OneAndLab)
const heroBackgroundImage = '/undraw/labo.svg'

const heroCtas = [
  { label: 'Inscrire mon laboratoire', to: '/lab/register', color: 'primary', variant: 'solid', size: 'xl', icon: 'i-lucide-building-2' },
]

const trustItems = [
  { icon: 'i-lucide-droplet', title: 'Demandes de prélèvements', description: 'Dans votre secteur' },
  { icon: 'i-lucide-users', title: 'Préleveurs et sous-comptes', description: 'Gestion centralisée' },
  { icon: 'i-lucide-bar-chart', title: 'Statistiques et suivi', description: 'Tableaux de bord' },
  { icon: 'i-lucide-file-check', title: 'Conformité et traçabilité', description: 'Sécurité des données' },
]

const benefits = [
  { icon: 'i-lucide-droplet', title: 'Demandes de prélèvements', description: 'Recevez les demandes de prise de sang à domicile dans votre secteur. Acceptez ou déléguez selon votre capacité.' },
  { icon: 'i-lucide-users', title: 'Préleveurs et sous-comptes', description: 'Gérez vos préleveurs et sous-comptes. Assignez les rendez-vous et suivez l\'activité.' },
  { icon: 'i-lucide-calendar', title: 'Planning et tournées', description: 'Visualisez les rendez-vous, créneaux et déplacements. Optimisez les tournées à domicile.' },
  { icon: 'i-lucide-building-2', title: 'Fiche laboratoire', description: 'Présentez votre laboratoire : coordonnées, zone de couverture, types d\'analyses proposées.' },
  { icon: 'i-lucide-bar-chart', title: 'Statistiques', description: 'Tableaux de bord et statistiques pour suivre le volume de prélèvements et l\'activité.' },
  { icon: 'i-lucide-file-check', title: 'Conformité', description: 'Traçabilité des rendez-vous et des professionnels. Intégration dans votre organisation existante.' },
]

const howItWorksSteps = [
  { title: 'Inscrivez votre laboratoire', description: 'Renseignez les informations de votre laboratoire (SIRET, raison sociale, zone de couverture). Envoyez votre demande d\'inscription.', icon: 'i-lucide-file-edit' },
  { title: 'Validation et paramétrage', description: 'Notre équipe valide votre dossier et vous donne accès à l\'espace laboratoire. Vous pouvez ajouter vos préleveurs et vos créneaux.', icon: 'i-lucide-settings' },
  { title: 'Recevez et assignez les demandes', description: 'Les demandes de prélèvement à domicile vous sont notifiées. Vous les assignez à vos préleveurs et suivez les rendez-vous en temps réel.', icon: 'i-lucide-calendar-check' },
]

const landingReviews = [
  { id: '1', patientName: 'Dr. Laurent G., Labo BioSanté', rating: 5, comment: 'On a intégré OneAndLab pour les prélèvements à domicile. Les demandes arrivent bien géolocalisées, on assigne à nos préleveurs en un clic. Gain de temps énorme.', response: 'Merci pour votre retour. — Équipe OneAndLab', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
  { id: '2', patientName: 'Marie T., responsable labo', rating: 5, comment: 'Tableau de bord clair, suivi des tournées en temps réel. Les patients sont prévenus par SMS, moins de no-show. On a augmenté notre volume à domicile.', response: 'Content que la plateforme vous aide. — OneAndLab', date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000) },
  { id: '3', patientName: 'Jean-Marc P., Labo MédiLab', rating: 5, comment: 'Inscription et mise en route en une semaine. Nos préleveurs ont leur propre accès, ils voient leurs RDV du jour. Conforme à notre façon de travailler.', response: 'Merci Jean-Marc. — Équipe', date: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000) },
  { id: '4', patientName: 'Sandrine L., directrice labo', rating: 5, comment: 'Les statistiques nous aident à anticiper les pics. On a pu recruter un préleveur à mi-temps grâce à la croissance du volume domicile.', response: 'Ravi que les stats vous servent. — OneAndLab', date: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000) },
  { id: '5', patientName: 'Olivier D., Labo Analyses Plus', rating: 5, comment: 'Traçabilité nickel : qui a fait quoi, quand. Les patients laissent des avis, ça rassure. On est satisfaits du partenariat.', response: 'Merci Olivier. — OneAndLab', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  { id: '6', patientName: 'Catherine V., labo partenaire', rating: 5, comment: 'Support réactif, évolutions régulières. On recommande OneAndLab à d\'autres laboratoires qui hésitent à se lancer en domicile.', response: 'Merci Catherine pour la recommandation. — Équipe', date: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000) },
]

const faqItems = [
  { question: 'Quels documents pour inscrire mon laboratoire ?', answer: 'Vous aurez besoin du SIRET, de la raison sociale et des coordonnées du laboratoire. Un justificatif d\'activité peut être demandé pour valider l\'inscription.' },
  { question: 'Comment gérer les préleveurs ?', answer: 'Depuis votre espace laboratoire, vous pouvez créer des comptes préleveurs (ou sous-comptes), leur assigner des rendez-vous et suivre leur activité. Chaque préleveur accède à son propre planning.' },
  { question: 'Comment sont réparties les demandes ?', answer: 'Les demandes de prise de sang à domicile sont adressées aux laboratoires dont la zone de couverture correspond à l\'adresse du patient. Vous acceptez ou déléguez selon votre capacité.' },
  { question: 'Y a-t-il des frais ou un engagement ?', answer: 'Les conditions tarifaires et d\'engagement vous sont communiquées lors de l\'inscription. Nous privilégions la transparence et l\'alignement avec votre modèle d\'activité.' },
  { question: 'Les données patients sont-elles sécurisées ?', answer: 'Oui. Les données de santé sont traitées de manière sécurisée et conforme aux exigences du secteur (RGPD, bonnes pratiques). Traçabilité et confidentialité sont assurées.' },
]

const ctaButtons = [
  { label: 'Inscrire mon laboratoire', to: '/lab/register', color: 'primary', size: 'xl', icon: 'i-lucide-building-2' },
]
</script>
