<template>
  <div>
    <LandingMaquetteHero
      compact
      audience="patients"
      eyebrow="Soins infirmiers"
      :title-lines="['Les soins', 'viennent']"
      highlight="à domicile"
      description="Pansements, injections et actes prescrits. Choisissez vos disponibilités, un infirmier près de chez vous confirme la visite."
      image-src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Soins infirmiers réalisés à domicile"
      image-object-class="object-[center_30%]"
      hide-quote
      hide-stats
      :primary-cta="{ label: 'Réserver un soin', to: appointmentNewUrl, icon: 'i-lucide-calendar-plus' }"
      :secondary-cta="{ label: 'Voir les infirmiers', to: '/infirmiers' }"
    />

    <LandingMaquetteMarketingBackdrop>
      <LandingMaquetteFaq
        v-if="faqItems.length"
        anchor-id="faq"
        section-class="bg-[#F7F7FB] dark:bg-gray-900/70"
        :items="faqItems"
      />

      <LandingMaquetteInlineCta
        eyebrow="On s’occupe de l’organisation"
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
const editorial = getSeoStaticPage('/soins-infirmiers-a-domicile')

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
    title: 'Soins infirmiers à domicile : réserver une visite | Cary',
    description:
      'Réservez des soins infirmiers à domicile. Créneau choisi, confirmation SMS et email, infirmier près de chez vous.',
    path: '/soins-infirmiers-a-domicile',
    breadcrumbs: [{ name: 'Accueil', path: '/' }],
  })
}

const faqItems = editorial?.faq ?? []

const ctaButtons = computed(() => [
  {
    label: 'Réserver un soin',
    to: appointmentNewUrl.value,
    icon: 'i-lucide-calendar-plus',
    variant: 'solid' as const,
  },
  {
    label: 'Explorer les infirmiers',
    to: '/infirmiers',
    variant: 'outline' as const,
  },
])
</script>
