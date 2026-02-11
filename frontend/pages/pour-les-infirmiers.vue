<template>
  <div>
    <LandingHero
      badge="Pour les infirmiers"
      badge-icon="i-lucide-heart-pulse"
      title="Développez votre activité à domicile"
      subtitle="Rejoignez un réseau de patients qui recherchent des soins infirmiers à domicile"
      description="Recevez des demandes de rendez-vous dans votre secteur. Gérez votre planning, valorisez votre profil et construisez votre réputation. Inscription simple, sans engagement."
      image-src="/undraw/accueil.svg"
      image-alt="Infirmiers à domicile"
      :ctas="heroCtas"
      background-class="bg-white"
    />

    <LandingTrust
      :items="trustItems"
      background-class="bg-gray-50/50"
    />

    <LandingRoleBenefits
      title="Les avantages pour les infirmiers"
      subtitle="Une plateforme dédiée aux professionnels infirmiers libéraux."
      :items="benefits"
      background-class="bg-white"
    />

    <HowItWorks
      title="Comment rejoindre le réseau ?"
      subtitle="En 3 étapes, intégrez OneAndLab et recevez vos premières demandes."
      :steps="howItWorksSteps"
      background-class="bg-gray-50"
    />

    <LandingFaq
      title="Questions fréquentes"
      subtitle="Tout ce qu’il faut savoir pour rejoindre OneAndLab en tant qu’infirmier."
      :items="faqItems"
      background-class="bg-white"
    />

    <LandingCtaBlock
      title="Rejoignez le réseau OneAndLab"
      subtitle="Inscrivez-vous en quelques minutes. Après validation de votre dossier, vous recevrez des demandes de rendez-vous dans votre zone."
      :buttons="ctaButtons"
      background-class="bg-primary-50/30"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useLandingSeo({
  title: 'Pour les infirmiers | Soins à domicile | OneAndLab',
  description: 'Rejoignez OneAndLab en tant qu\'infirmier ou infirmière. Recevez des demandes de soins à domicile, gérez votre planning. Inscription simple et rapide.',
  keywords: 'infirmier à domicile, infirmière libérale, plateforme infirmiers, soins à domicile, OneAndLab, IDEL',
  path: '/pour-les-infirmiers',
})

const heroCtas = [
  { label: "S'inscrire", to: '/nurse/register', color: 'primary', variant: 'solid', icon: 'i-lucide-user-plus' },
]

const trustItems = [
  { icon: 'i-lucide-users', title: 'Patients qualifiés', description: 'Demandes dans votre secteur' },
  { icon: 'i-lucide-calendar', title: 'Planning maîtrisé', description: 'Gérez vos créneaux' },
  { icon: 'i-lucide-badge-check', title: 'Profil professionnel', description: 'Visible par les patients' },
  { icon: 'i-lucide-headphones', title: 'Support dédié', description: 'Équipe à votre écoute' },
]

const benefits = [
  { icon: 'i-lucide-users', title: 'Patients qualifiés', description: 'Des patients qui recherchent des soins à domicile. Vous recevez des demandes adaptées à votre zone et compétences.' },
  { icon: 'i-lucide-calendar', title: 'Planning centralisé', description: 'Gérez vos rendez-vous, disponibilités et plages de soins depuis votre espace infirmier.' },
  { icon: 'i-lucide-map-pin', title: 'Secteur et déplacements', description: 'Définissez vos zones d\'intervention. Les patients vous trouvent selon leur adresse.' },
  { icon: 'i-lucide-badge-check', title: 'Profil professionnel', description: 'Page publique avec votre présentation, spécialisations et avis des patients.' },
  { icon: 'i-lucide-star', title: 'Avis et réputation', description: 'Les patients laissent des avis. Valorisez votre expérience et construisez votre notoriété.' },
  { icon: 'i-lucide-headphones', title: 'Support dédié', description: 'Une équipe pour vous accompagner sur l\'utilisation de la plateforme et les demandes patients.' },
]

const howItWorksSteps = [
  { title: 'Inscrivez-vous', description: 'Remplissez le formulaire d\'inscription avec vos coordonnées et votre numéro RPPS. Envoyez votre demande en quelques minutes.', icon: 'i-lucide-file-edit' },
  { title: 'Validation du dossier', description: 'Notre équipe vérifie votre profil et vos qualifications. Vous recevez une confirmation par email dès que votre compte est activé.', icon: 'i-lucide-shield-check' },
  { title: 'Recevez des demandes', description: 'Les patients de votre secteur voient votre profil et peuvent vous solliciter. Acceptez les rendez-vous qui vous conviennent et gérez votre planning.', icon: 'i-lucide-bell' },
]

const faqItems = [
  { question: 'Quels documents faut-il pour s\'inscrire ?', answer: 'Vous aurez besoin de votre numéro RPPS, de vos coordonnées professionnelles et d\'une pièce d\'identité. Un justificatif d\'exercice peut être demandé pour valider votre dossier.' },
  { question: 'Comment sont rémunérés les rendez-vous ?', answer: 'Les modalités de facturation et de rémunération vous sont présentées après validation de votre inscription. OneAndLab assure la mise en relation et le suivi des rendez-vous.' },
  { question: 'Puis-je refuser une demande de rendez-vous ?', answer: 'Oui. Vous restez libre d\'accepter ou de refuser les demandes selon votre disponibilité et votre secteur. Aucune obligation de prise en charge.' },
  { question: 'Comment définir ma zone d\'intervention ?', answer: 'Lors de l\'inscription et dans votre espace professionnel, vous pouvez indiquer les secteurs ou communes où vous intervenez. Les demandes vous sont proposées en fonction de cette zone.' },
  { question: 'Y a-t-il un engagement ou des frais ?', answer: 'Les conditions d\'inscription et d\'utilisation vous sont communiquées lors de votre demande. Pas d’engagement caché : nous privilégions la transparence.' },
]

const ctaButtons = [
  { label: "S'inscrire comme infirmier", to: '/nurse/register', color: 'primary', icon: 'i-lucide-user-plus' },
  { label: 'Nous contacter', to: '/contact', color: 'neutral', icon: 'i-lucide-mail' },
]
</script>
