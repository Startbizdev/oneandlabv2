<template>
  <div>
    <!-- Hero Section -->
    <Hero
      title="Soins médicaux à domicile"
      subtitle="Prise de sang et soins infirmiers directement chez vous"
      description="Professionnels qualifiés, disponibles rapidement, pour votre confort et votre santé."
      :image-src="'/undraw/accueil.svg'"
      image-alt="Soins médicaux à domicile"
      :ctas="heroCTAs"
      cta-label="J'ai besoin d'un(e)"
    />
    
    <!-- Comment ça marche -->
    <HowItWorks
      title="Comment ça marche ?"
      subtitle="En 3 étapes simples, obtenez vos soins médicaux à domicile"
      :steps="howItWorksSteps"
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

// CTAs pour le Hero
const heroCTAs = [
  {
    label: "Prise de sang",
    to: '/rendez-vous/nouveau?type=blood_test',
    color: 'primary' as const,
    size: 'lg' as const,
    variant: 'outline' as const,
    icon: 'i-lucide-droplet',
  },
  {
    label: "Soins infirmiers",
    to: '/rendez-vous/nouveau?type=nursing',
    color: 'primary' as const,
    size: 'lg' as const,
    variant: 'outline' as const,
    icon: 'i-lucide-heart-pulse',
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

