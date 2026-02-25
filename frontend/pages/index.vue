<template>
  <div>
    <!-- Hero Section (style Stripe / Linear / Notion / n8n) -->
    <LandingHero
      badge="Soins à domicile"
      badge-icon="i-lucide-heart-pulse"
      title="Soins médicaux à domicile"
      :description="heroLead"
      :ctas="heroCTAs"
      :background-image="heroBackgroundImage"
      show-login-link
    />
    
    <!-- Comment ça marche -->
    <HowItWorks
      title="Comment ça marche ?"
      subtitle="En 3 étapes simples, obtenez vos soins médicaux à domicile"
      :steps="howItWorksSteps"
      background-class="bg-white"
    />
    
    <!-- CTA Professionnels -->
    <ProfessionalCTA
      title="Rejoignez notre réseau de professionnels"
      subtitle="Découvrez les avantages de notre plateforme pour développer votre activité médicale"
      nurse-signup-link="/nurse/register"
      nurse-learn-more-link="/nurse"
      lab-signup-link="/lab/register"
      lab-learn-more-link="/lab"
      pro-signup-link="/pro/register"
      pro-learn-more-link="/pro"
      background-class="bg-white"
    />

    <!-- Avis -->
    <Reviews
      title="Ils nous font confiance"
      subtitle="Découvrez les avis de nos patients sur nos professionnels de santé"
      :reviews="sampleReviews"
      :max-reviews="6"
      background-class="bg-gray-50"
    />

    <!-- FAQ -->
    <LandingFaq
      title="Questions fréquentes"
      subtitle="Tout ce que vous devez savoir sur OneAndLab : prise de rendez-vous à domicile et inscription des professionnels."
      :items="faqItems"
      background-class="bg-gray-50"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

// Image hero (undraw accueil – bleu OneAndLab)
const heroBackgroundImage = '/undraw/accueil.svg'

// Paragraphe hero : synthèse SEO (prise de sang, soins infirmiers, à domicile, professionnels)
const heroLead = 'Prise de sang et soins infirmiers à domicile par des professionnels qualifiés, disponibles rapidement pour votre confort et votre santé.'

// CTA principal Hero : un seul gros bouton vers la prise de RDV
const heroCTAs = [
  {
    label: 'Prendre rendez-vous à domicile',
    to: '/rendez-vous/nouveau',
    color: 'primary' as const,
    size: 'xl' as const,
    variant: 'solid' as const,
    icon: 'i-lucide-calendar-plus',
  },
];

// Étapes "Comment ça marche"
const howItWorksSteps = [
  {
    title: "Réservez en ligne",
    description: "Remplissez notre formulaire simple en quelques minutes. Choisissez le type de soin, la date et l'heure qui vous conviennent.",
    icon: 'i-lucide-calendar-check',
  },
  {
    title: "Confirmation rapide",
    description: "Un professionnel de santé qualifié accepte votre demande et vous confirme le rendez-vous. Vous recevez une notification par SMS et email.",
    icon: 'i-lucide-check-circle-2',
  },
  {
    title: "Soins à domicile",
    description: "Le professionnel se déplace directement chez vous à l'heure convenue. Vos soins sont effectués dans le confort de votre domicile.",
    icon: 'i-lucide-home',
  },
];

// Avis de démonstration
const sampleReviews = [
  {
    id: '1',
    patientName: 'Marie D.',
    rating: 5,
    comment: 'Service exceptionnel ! L\'infirmière était ponctuelle, professionnelle et très à l\'écoute. Je recommande vivement.',
    response: 'Merci beaucoup Marie pour votre confiance ! C\'est un plaisir de vous accompagner dans vos soins. N\'hésitez pas si vous avez besoin de quoi que ce soit. - Sarah Martin, Infirmière libérale',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Il y a 2 jours
  },
  {
    id: '2',
    patientName: 'Jean P.',
    rating: 5,
    comment: 'Prise de sang à domicile très pratique. Le préleveur était doux et efficace. Plus besoin de se déplacer !',
    response: 'Merci pour votre retour Jean ! Nous sommes ravis que l\'intervention se soit bien passée. Notre équipe de préleveurs est formée pour garantir votre confort. À bientôt ! - Laboratoire BioSanté Paris',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Il y a 5 jours
  },
  {
    id: '3',
    patientName: 'Sophie L.',
    rating: 5,
    comment: 'Parfait pour mes soins réguliers. L\'application est simple à utiliser et les professionnels sont toujours disponibles rapidement.',
    response: 'Merci Sophie pour votre fidélité ! C\'est un plaisir de vous accompagner dans vos soins réguliers. Nous restons à votre disposition pour toute question. - Marc Dubois, Infirmier libéral',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Il y a 1 semaine
  },
  {
    id: '4',
    patientName: 'Pierre M.',
    rating: 5,
    comment: 'Excellent service pour ma mère qui ne peut plus se déplacer. Les infirmiers sont très professionnels et empathiques.',
    response: 'Merci Pierre pour ce retour touchant. Prendre soin de votre maman est une priorité pour nous. Nous sommes heureux de pouvoir vous faciliter la vie. N\'hésitez pas si vous avez besoin de quoi que ce soit. - Julie Bernard, Infirmière libérale',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Il y a 10 jours
  },
  {
    id: '5',
    patientName: 'Claire B.',
    rating: 5,
    comment: 'Rapide, efficace et professionnel. J\'ai pu obtenir un rendez-vous le jour même pour une prise de sang urgente.',
    response: 'Merci Claire ! Nous comprenons l\'importance de pouvoir répondre rapidement aux urgences médicales. Notre équipe est disponible pour vous accompagner à tout moment. - Laboratoire MédiLab',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Il y a 2 semaines
  },
  {
    id: '6',
    patientName: 'Thomas R.',
    rating: 5,
    comment: 'Service de qualité avec des professionnels compétents. La plateforme est intuitive et le suivi des rendez-vous est parfait.',
    response: 'Merci Thomas pour votre confiance ! Nous travaillons chaque jour à améliorer notre service pour vous offrir la meilleure expérience possible. À très bientôt ! - Laboratoire Santé Plus',
    date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // Il y a 20 jours
  },
];

// FAQ accueil (patients + professionnels)
const faqItems = [
  {
    question: 'Comment prendre rendez-vous à domicile ?',
    answer: 'Rendez-vous sur la page "Prendre rendez-vous", choisissez le type de soin (prise de sang ou soins infirmiers), votre adresse, la date et un créneau. Un professionnel qualifié accepte votre demande et vous confirme le rendez-vous par email et SMS.',
  },
  {
    question: 'Dois-je créer un compte pour réserver ?',
    answer: 'Vous pouvez réserver sans compte. Pour suivre vos rendez-vous et accéder à vos documents, nous vous conseillons de créer un compte patient (gratuit) après votre première réservation.',
  },
  {
    question: 'Comment rejoindre le réseau en tant qu\'infirmier ou laboratoire ?',
    answer: 'Cliquez sur "Rejoindre le réseau" ou "Inscrire mon laboratoire" selon votre profil. Remplissez le formulaire d\'inscription. Après validation de votre dossier, vous recevrez des demandes de rendez-vous dans votre secteur et pourrez gérer votre planning depuis votre espace.',
  },
  {
    question: 'Les soins à domicile sont-ils remboursés ?',
    answer: 'Les actes réalisés à domicile par des professionnels conventionnés sont pris en charge par l\'Assurance maladie comme en cabinet. Pensez à transmettre votre carte Vitale et votre ordonnance au professionnel.',
  },
  {
    question: 'La plateforme est-elle conforme aux données de santé ?',
    answer: 'Oui. OneAndLab est conçu pour être conforme à l\'hébergement des données de santé (HDS) et au RGPD. Les données sont chiffrées et sécurisées pour les patients comme pour les professionnels.',
  },
];

// Gérer le scroll smooth vers les ancres
onMounted(() => {
  const route = useRoute();
  if (route.hash) {
    nextTick(() => {
      const element = document.querySelector(route.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
});

// Écouter les changements de hash
watch(() => useRoute().hash, (hash) => {
  if (hash) {
    nextTick(() => {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
});
</script>

