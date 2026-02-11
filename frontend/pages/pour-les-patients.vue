<template>
  <div>
    <LandingHero
      badge="Pour les patients"
      badge-icon="i-lucide-user"
      title="Soins à domicile, à votre rythme"
      subtitle="Prise de sang et soins infirmiers directement chez vous"
      description="Réservez en quelques clics. Un professionnel qualifié se déplace à votre domicile, au créneau qui vous convient. Simple, rapide, rassurant."
      image-src="/undraw/accueil.svg"
      image-alt="Soins à domicile"
      :ctas="heroCtas"
      background-class="bg-white"
    />

    <LandingTrust
      :items="trustItems"
      background-class="bg-gray-50/50"
    />

    <LandingRoleBenefits
      title="Pourquoi choisir OneAndLab ?"
      subtitle="Une plateforme pensée pour simplifier vos soins à domicile."
      :items="benefits"
      background-class="bg-white"
    />

    <HowItWorks
      title="Comment ça marche ?"
      subtitle="En 3 étapes, obtenez votre rendez-vous à domicile."
      :steps="howItWorksSteps"
      background-class="bg-gray-50"
    />

    <LandingFaq
      title="Questions fréquentes"
      subtitle="Tout ce que vous devez savoir avant de réserver."
      :items="faqItems"
      background-class="bg-white"
    />

    <LandingCtaBlock
      title="Prêt à réserver ?"
      subtitle="Prenez rendez-vous en ligne en quelques minutes. Aucun compte obligatoire pour une première réservation."
      :buttons="ctaButtons"
      background-class="bg-primary-50/30"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useLandingSeo({
  title: 'Pour les patients | Soins à domicile | OneAndLab',
  description: 'Réservez une prise de sang ou des soins infirmiers à domicile. Professionnels qualifiés, créneaux adaptés. Plateforme OneAndLab pour les patients.',
  keywords: 'prise de sang à domicile, soins infirmiers à domicile, rendez-vous patient, OneAndLab, soins à domicile',
  path: '/pour-les-patients',
})

const heroCtas = [
  { label: 'Prise de sang', to: '/rendez-vous/nouveau?type=blood_test', color: 'primary', size: 'xl', variant: 'solid', icon: 'i-lucide-droplet' },
  { label: 'Soins infirmiers', to: '/rendez-vous/nouveau?type=nursing', color: 'primary', size: 'xl', variant: 'outline', icon: 'i-lucide-heart-pulse' },
]

const trustItems = [
  { icon: 'i-lucide-clock', title: 'Réservation en 2 min', description: 'Formulaire simple et rapide' },
  { icon: 'i-lucide-shield-check', title: 'Professionnels vérifiés', description: 'Qualifications à jour' },
  { icon: 'i-lucide-home', title: 'À domicile partout', description: 'Le pro se déplace chez vous' },
  { icon: 'i-lucide-bell', title: 'Confirmation par email et SMS', description: 'Vous êtes tenu informé' },
]

const benefits = [
  { icon: 'i-lucide-calendar-check', title: 'Réservation simple', description: 'Choisissez le type de soin, la date et l\'heure. Confirmation rapide par email et SMS.' },
  { icon: 'i-lucide-home', title: 'À domicile', description: 'Le professionnel se déplace chez vous. Plus besoin de vous déplacer en cabinet ou laboratoire.' },
  { icon: 'i-lucide-shield-check', title: 'Professionnels qualifiés', description: 'Infirmiers et laboratoires partenaires vérifiés et à jour de leurs qualifications.' },
  { icon: 'i-lucide-file-text', title: 'Suivi et documents', description: 'Accédez à votre espace patient : historique des rendez-vous, documents et ordonnances.' },
  { icon: 'i-lucide-star', title: 'Avis et transparence', description: 'Consultez les avis des patients et les profils des professionnels avant de réserver.' },
  { icon: 'i-lucide-clock', title: 'Créneaux adaptés', description: 'Des plages horaires proposées selon vos préférences et la disponibilité des professionnels.' },
]

const howItWorksSteps = [
  { title: 'Choisissez et réservez', description: 'Sélectionnez le type de soin (prise de sang ou soins infirmiers), votre adresse, la date et un créneau. Validez en quelques clics.', icon: 'i-lucide-calendar-check' },
  { title: 'Confirmation rapide', description: 'Un professionnel qualifié accepte votre demande. Vous recevez une confirmation par email et SMS avec les détails du rendez-vous.', icon: 'i-lucide-bell' },
  { title: 'Rendez-vous à domicile', description: 'Le professionnel se déplace chez vous au créneau convenu. Présentez votre ordonnance si besoin. C\'est aussi simple que ça.', icon: 'i-lucide-home' },
]

const faqItems = [
  { question: 'Dois-je créer un compte pour réserver ?', answer: 'Vous pouvez prendre rendez-vous sans compte. Pour suivre vos rendez-vous et accéder à vos documents, nous vous conseillons de créer un compte patient (gratuit) après votre première réservation.' },
  { question: 'Quels types de soins sont proposés ?', answer: 'OneAndLab propose la prise de sang à domicile et les soins infirmiers à domicile (pansements, injections, prélèvements, etc.). Selon votre zone, des infirmiers et laboratoires partenaires sont disponibles.' },
  { question: 'Comment est choisi le professionnel ?', answer: 'Selon votre adresse et le créneau demandé, la plateforme propose des professionnels disponibles dans votre secteur. Vous pouvez consulter leur profil et les avis des patients avant confirmation.' },
  { question: 'Puis-je annuler ou modifier mon rendez-vous ?', answer: 'Oui. Depuis votre espace patient ou par email/SMS, vous pouvez modifier ou annuler votre rendez-vous dans le respect des délais indiqués (généralement 24 h à l\'avance).' },
  { question: 'Les soins sont-ils remboursés ?', answer: 'Les actes réalisés à domicile par des professionnels conventionnés sont pris en charge par l\'Assurance maladie comme en cabinet. Pensez à transmettre votre carte Vitale et votre ordonnance.' },
]

const ctaButtons = [
  { label: 'Prendre rendez-vous', to: '/rendez-vous/nouveau', color: 'primary', icon: 'i-lucide-calendar-plus' },
  { label: 'Créer un compte', to: '/login', color: 'neutral', icon: 'i-lucide-user' },
]
</script>
