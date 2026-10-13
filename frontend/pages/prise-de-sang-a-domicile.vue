<template>
  <div>
    <LandingMaquetteHero
      compact
      audience="patients"
      eyebrow="Prélèvement sanguin"
      :title-lines="['La prise de sang', 'vient']"
      highlight="chez vous"
      description="Ordonnance, créneau choisi, confirmation par SMS et email. Un professionnel près de votre adresse se déplace pour le prélèvement."
      image-src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Prélèvement sanguin réalisé à domicile"
      image-object-class="object-[center_30%]"
      hide-quote
      hide-stats
      :primary-cta="{ label: 'Réserver une prise de sang', to: appointmentNewUrl, icon: 'i-lucide-calendar-plus' }"
      :secondary-cta="{ label: 'Voir les laboratoires', to: '/laboratoires' }"
    />

    <LandingMaquetteMarketingBackdrop>
      <LandingMaquetteFaq
        v-if="faqItems.length"
        anchor-id="faq"
        section-class="bg-[#F7F7FB] dark:bg-gray-900/70"
        :items="faqItems"
      />

      <LandingMaquetteInlineCta
        eyebrow="Prêt pour le prélèvement"
        title="Réservez votre visite"
        subtitle="Pas de compte obligatoire. Confirmation par email et SMS."
        :buttons="ctaButtons"
        outer-class="bg-white dark:bg-gray-950"
      />

      <SeoEditorial v-if="editorial" :article="editorial" />
    </LandingMaquetteMarketingBackdrop>
  </div>
</template>

<script setup lang="ts">
import { getSeoStaticPage } from '~/seo/pages'

definePageMeta({ layout: 'default' })

const { appointmentNewUrl } = useAppointmentNewUrl()
const editorial = getSeoStaticPage('/prise-de-sang-a-domicile')

if (editorial) {
  useLandingSeo({
    title: editorial.title,
    description: editorial.description,
    keywords: editorial.keywords,
    path: editorial.path,
    breadcrumbs: editorial.breadcrumbs,
  })
} else {
  useLandingSeo({
    title: 'Prise de sang à domicile : réserver un prélèvement | Cary',
    description:
      'Faites prélever votre sang chez vous. Ordonnance, créneau choisi, confirmation par SMS et email avec Cary.',
    path: '/prise-de-sang-a-domicile',
    breadcrumbs: [{ name: 'Accueil', path: '/' }],
  })
}

const faqItems = editorial?.faq ?? []

const ctaButtons = computed(() => [
  {
    label: 'Réserver une prise de sang',
    to: appointmentNewUrl.value,
    icon: 'i-lucide-calendar-plus',
    variant: 'solid' as const,
  },
  {
    label: 'Explorer les laboratoires',
    to: '/laboratoires',
    variant: 'outline' as const,
  },
])
</script>
