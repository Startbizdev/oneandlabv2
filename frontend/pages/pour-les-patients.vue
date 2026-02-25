<template>
  <div>
    <LandingHero
      badge="Pour les patients"
      badge-icon="i-lucide-user"
      title="Soins à domicile, à votre rythme"
      subtitle="Prise de sang et soins infirmiers directement chez vous"
      description="Réservez en quelques clics. Un professionnel qualifié se déplace à votre domicile, au créneau qui vous convient. Simple, rapide, rassurant."
      :ctas="heroCtas"
      :background-image="heroBackgroundImage"
      overlay-class="bg-black/55"
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

    <Reviews
      title="Ce que disent les patients"
      subtitle="Des milliers de réservations à domicile. Voici ce qu'en pensent ceux qui ont déjà essayé."
      :reviews="landingReviews"
      :max-reviews="6"
      background-class="bg-white"
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

// Image hero Unsplash - patient / réservation à domicile (différente de l'accueil)
const heroBackgroundImage = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1920&q=80'

const heroCtas = [
  { label: 'Prendre rendez-vous à domicile', to: '/rendez-vous/nouveau', color: 'primary', variant: 'solid', size: 'xl', icon: 'i-lucide-calendar-plus' },
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

const landingReviews = [
  { id: '1', patientName: 'Marie D.', rating: 5, comment: 'J\'ai réservé une prise de sang pour ma mère qui ne peut plus se déplacer. L\'infirmière est venue à l\'heure, très douce et professionnelle. Plus de stress pour nous.', response: 'Merci Marie pour votre confiance. Ravi d\'avoir pu vous aider. — Sarah M., IDEL', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
  { id: '2', patientName: 'Jean P.', rating: 5, comment: 'Prise de sang à domicile en 48 h. Le préleveur du labo était à l\'heure, geste propre et rapide. Je recommande à 100 %.', response: 'Merci Jean ! À bientôt. — Labo BioSanté', date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
  { id: '3', patientName: 'Sophie L.', rating: 5, comment: 'Soins infirmiers réguliers pour mon père. L\'équipe OneAndLab nous a bien accompagnés. Réservation simple, toujours le même infirmier quand c\'est possible.', response: 'Merci pour votre fidélité Sophie. — Marc D., infirmier', date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
  { id: '4', patientName: 'Pierre M.', rating: 5, comment: 'Première fois que je fais une prise de sang à domicile. Très pratique, plus besoin de prendre le bus. Résultat en ligne comme en labo.', response: 'Content que ça vous ait convenu. — Laboratoire MédiLab', date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000) },
  { id: '5', patientName: 'Claire B.', rating: 5, comment: 'RDV le jour même pour un pansement. L\'infirmière était disponible en fin de matinée. Service au top.', response: 'Merci Claire, bon rétablissement ! — Julie B., IDEL', date: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000) },
  { id: '6', patientName: 'Thomas R.', rating: 5, comment: 'Interface claire, rappel SMS la veille. Le professionnel a sonné à l\'heure pile. Parfait pour quelqu\'un qui travaille.', response: 'Merci Thomas pour votre retour. — Équipe OneAndLab', date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
]

const faqItems = [
  { question: 'Dois-je créer un compte pour réserver ?', answer: 'Vous pouvez prendre rendez-vous sans compte. Pour suivre vos rendez-vous et accéder à vos documents, nous vous conseillons de créer un compte patient (gratuit) après votre première réservation.' },
  { question: 'Quels types de soins sont proposés ?', answer: 'OneAndLab propose la prise de sang à domicile et les soins infirmiers à domicile (pansements, injections, prélèvements, etc.). Selon votre zone, des infirmiers et laboratoires partenaires sont disponibles.' },
  { question: 'Comment est choisi le professionnel ?', answer: 'Selon votre adresse et le créneau demandé, la plateforme propose des professionnels disponibles dans votre secteur. Vous pouvez consulter leur profil et les avis des patients avant confirmation.' },
  { question: 'Puis-je annuler ou modifier mon rendez-vous ?', answer: 'Oui. Depuis votre espace patient ou par email/SMS, vous pouvez modifier ou annuler votre rendez-vous dans le respect des délais indiqués (généralement 24 h à l\'avance).' },
  { question: 'Les soins sont-ils remboursés ?', answer: 'Les actes réalisés à domicile par des professionnels conventionnés sont pris en charge par l\'Assurance maladie comme en cabinet. Pensez à transmettre votre carte Vitale et votre ordonnance.' },
]

const ctaButtons = [
  { label: 'Prendre rendez-vous à domicile', to: '/rendez-vous/nouveau', color: 'primary', size: 'xl', icon: 'i-lucide-calendar-plus' },
]
</script>
