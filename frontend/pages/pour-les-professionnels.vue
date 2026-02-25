<template>
  <div>
    <LandingHero
      badge="Pour les professionnels de santé"
      badge-icon="i-lucide-stethoscope"
      title="Orientez vos patients vers des soins à domicile"
      subtitle="Médecins, kinés, professionnels : collaborez avec OneAndLab"
      description="Référencez vos patients sur la plateforme pour une prise de sang ou des soins infirmiers à domicile. Ils réserveront en quelques clics. Vous gardez la main sur le suivi et la coordination."
      :ctas="heroCtas"
      :background-image="heroBackgroundImage"
      overlay-class="bg-black/55"
    />

    <LandingTrust
      :items="trustItems"
      background-class="bg-gray-50/50"
    />

    <LandingRoleBenefits
      title="Les avantages pour les professionnels"
      subtitle="Un outil pour orienter vos patients vers des soins à domicile."
      :items="benefits"
      background-class="bg-white"
    />

    <HowItWorks
      title="Comment utiliser OneAndLab ?"
      subtitle="En 3 étapes, orientez vos patients vers des soins à domicile."
      :steps="howItWorksSteps"
      background-class="bg-gray-50"
    />

    <Reviews
      title="Ce que disent les professionnels de santé"
      subtitle="Médecins et professionnels qui orientent leurs patients vers OneAndLab."
      :reviews="landingReviews"
      :max-reviews="6"
      background-class="bg-white"
    />

    <LandingFaq
      title="Questions fréquentes"
      subtitle="Tout ce qu’il faut savoir en tant que professionnel de santé."
      :items="faqItems"
      background-class="bg-white"
    />

    <LandingCtaBlock
      title="Orientez vos patients vers des soins à domicile"
      subtitle="Médecins, kinés, professionnels : inscrivez-vous gratuitement. Créez des rendez-vous pour vos patients et suivez les soins à domicile en un clic."
      :buttons="ctaButtons"
      background-class="bg-primary-50/30"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useLandingSeo({
  title: 'Pour les professionnels de santé | OneAndLab',
  description: 'Médecins, kinésithérapeutes, professionnels de santé : prescrivez des soins à domicile pour vos patients. Inscription professionnel OneAndLab.',
  keywords: 'médecin prescription domicile, kiné à domicile, professionnel de santé, soins à domicile, OneAndLab, prescription prise de sang',
  path: '/pour-les-professionnels',
})

// Image hero (undraw pro – bleu OneAndLab)
const heroBackgroundImage = '/undraw/pro.svg'

const heroCtas = [
  { label: 'Rejoindre en tant que professionnel', to: '/pro/register', color: 'primary', variant: 'solid', size: 'xl', icon: 'i-lucide-stethoscope' },
]

const trustItems = [
  { icon: 'i-lucide-users', title: 'Orientation patients', description: 'Référencez en un clic' },
  { icon: 'i-lucide-calendar', title: 'Création de RDV', description: 'Pour vos patients' },
  { icon: 'i-lucide-file-text', title: 'Suivi des soins', description: 'Historique et documents' },
  { icon: 'i-lucide-shield', title: 'Données sécurisées', description: 'Conformité santé' },
]

const benefits = [
  { icon: 'i-lucide-users', title: 'Orienter vos patients', description: 'Référencez vos patients sur OneAndLab pour une prise de sang ou des soins infirmiers à domicile. Ils réserveront en quelques clics.' },
  { icon: 'i-lucide-calendar', title: 'Création de rendez-vous', description: 'Créez des demandes de rendez-vous pour vos patients. Choisissez le type de soin et les préférences de créneau.' },
  { icon: 'i-lucide-file-text', title: 'Suivi des soins', description: 'Consultez l’historique des rendez-vous de vos patients et les documents associés si besoin.' },
  { icon: 'i-lucide-badge-check', title: 'Profil professionnel', description: 'Page avec votre présentation et numéro Adeli. Les patients et partenaires vous identifient facilement.' },
  { icon: 'i-lucide-shield', title: 'Sécurité et conformité', description: 'Données de santé traitées de manière sécurisée. Conformité avec les exigences du secteur santé.' },
  { icon: 'i-lucide-handshake', title: 'Réseau de partenaires', description: 'Travaillez avec des infirmiers et laboratoires partenaires OneAndLab pour des soins à domicile de qualité.' },
]

const howItWorksSteps = [
  { title: 'Inscrivez-vous', description: 'Renseignez vos coordonnées professionnelles et votre numéro Adeli. Votre demande est transmise à notre équipe pour validation.', icon: 'i-lucide-file-edit' },
  { title: 'Accédez à votre espace', description: 'Une fois votre compte activé, vous pouvez créer des rendez-vous pour vos patients et consulter le suivi des soins à domicile.', icon: 'i-lucide-layout-dashboard' },
  { title: 'Orientez vos patients', description: 'Indiquez à vos patients qu’ils peuvent réserver sur OneAndLab (prise de sang ou soins infirmiers). Ils remplissent le formulaire et un professionnel les contacte.', icon: 'i-lucide-user-check' },
]

const landingReviews = [
  { id: '1', patientName: 'Dr. Pierre M., médecin généraliste', rating: 5, comment: 'J\'oriente mes patients âgés ou à mobilité réduite vers OneAndLab pour les prises de sang. Ils sont ravis, plus besoin de les accompagner au labo. Gain de temps pour tout le monde.', response: 'Merci Docteur pour votre confiance. — OneAndLab', date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
  { id: '2', patientName: 'Marie L., kinésithérapeute', rating: 5, comment: 'Plusieurs de mes patients ont des soins infirmiers à domicile. Je leur recommande OneAndLab pour la prise de sang et les pansements. Coordination simple, suivi visible.', response: 'Merci Marie. — Équipe OneAndLab', date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
  { id: '3', patientName: 'Dr. Sophie R., médecin', rating: 5, comment: 'Inscription rapide, interface claire. Je crée parfois le RDV moi-même pour des patients qui ne sont pas à l\'aise avec internet. Très pratique.', response: 'Content que ça vous convienne. — OneAndLab', date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) },
  { id: '4', patientName: 'Thomas B., infirmier coordinateur', rating: 5, comment: 'On utilise OneAndLab pour orienter nos patients vers des soins à domicile quand on ne peut pas nous-mêmes. Réseau fiable, retours patients positifs.', response: 'Merci Thomas. — Équipe', date: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000) },
  { id: '5', patientName: 'Dr. Isabelle F., généraliste', rating: 5, comment: 'Mes patients en ALD ou avec difficultés de déplacement utilisent OneAndLab depuis que je leur ai présenté. Moins d\'absentéisme aux bilans.', response: 'Merci pour ce retour. — OneAndLab', date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
  { id: '6', patientName: 'Nathalie D., médecin', rating: 5, comment: 'Simple, sécurisé, conforme. Je recommande à mes confrères qui cherchent une solution pour les soins à domicile de leurs patients.', response: 'Merci Nathalie. — OneAndLab', date: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000) },
]

const faqItems = [
  { question: 'Qu’est-ce qu’OneAndLab pour un professionnel ?', answer: 'OneAndLab est une plateforme de mise en relation entre patients et professionnels (infirmiers, laboratoires) pour des soins à domicile. En tant que médecin, kiné ou autre professionnel, vous pouvez y référer vos patients pour une prise de sang ou des soins infirmiers à domicile, et suivre les rendez-vous si besoin.' },
  { question: 'Dois-je payer pour inscrire mes patients ?', answer: 'Les conditions d’utilisation pour les professionnels de santé vous sont communiquées lors de l’inscription. L’objectif est de faciliter l’orientation de vos patients sans surcoût ni complexité pour vous.' },
  { question: 'Comment créer un rendez-vous pour un patient ?', answer: 'Depuis votre espace professionnel, vous pouvez créer une demande de rendez-vous en indiquant les coordonnées du patient, le type de soin et les préférences de créneau. Le patient peut aussi réserver lui-même en mentionnant votre nom si besoin.' },
  { question: 'Les données de mes patients sont-elles protégées ?', answer: 'Oui. Les données de santé sont traitées de manière sécurisée et conforme au RGPD et aux bonnes pratiques du secteur. Seules les informations nécessaires à la prise de rendez-vous et au suivi sont utilisées.' },
  { question: 'Qui réalise les soins à domicile ?', answer: 'Les soins sont réalisés par des infirmiers et laboratoires partenaires OneAndLab, vérifiés et à jour de leurs qualifications. Vous gardez un rôle de prescription et d’orientation ; la réalisation technique est assurée par ces professionnels.' },
]

const ctaButtons = [
  { label: 'Rejoindre en tant que professionnel', to: '/pro/register', color: 'primary', size: 'xl', icon: 'i-lucide-stethoscope' },
]
</script>
