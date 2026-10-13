<template>
  <div>
    <!-- Hero bleu clair SEO : Laboratoires à [Ville] -->
    <section class="relative py-12 sm:py-16 md:py-20 overflow-hidden bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center">
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-gray-900 dark:text-white mb-4">
          Prise de sang à domicile à {{ cityLabel }}
        </h1>
        <p class="text-lg sm:text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto mb-8">
          Un préleveur vient chez vous, à {{ cityLabel }}. Vous réservez en ligne.
        </p>
        <UButton
          :to="appointmentNewUrl"
          color="primary"
          size="xl"
          variant="solid"
          icon="i-lucide-calendar-plus"
          class="w-full sm:w-auto px-8 py-4 text-base sm:text-lg font-medium"
        >
          Réserver une visite
        </UButton>
        <ul class="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-badge-check" class="w-4 h-4 text-primary-500" />
            Demande en ligne
          </li>
          <li class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-primary-500" />
            Sans engagement
          </li>
          <li class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-clock" class="w-4 h-4 text-primary-500" />
            Parcours guidé
          </li>
        </ul>
      </div>
    </section>

    <section class="relative py-12 sm:py-16 md:py-20 overflow-hidden bg-app-canvas dark:bg-gray-950">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden animate-pulse">
            <div class="h-40 bg-gray-200 dark:bg-gray-700" />
            <div class="p-4 space-y-2">
              <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          </div>
        </div>

        <UAlert v-else-if="loadError" title="Impossible de charger les professionnels" description="Réessayez dans un instant pour consulter les profils disponibles." color="error" variant="soft">
          <template #actions><UButton color="neutral" variant="outline" @click="retry">Réessayer</UButton></template>
        </UAlert>
        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <PublicProfileCard
              v-for="lab in labs"
              :key="lab.id"
              type="lab"
              :slug="lab.slug"
              :name="lab.name"
              :profile-image-url="lab.profile_image_url"
              :city="lab.city"
              :presentation="lab.presentation"
              :reviews-count="lab.reviews_count ?? 0"
              :average-rating="lab.average_rating ?? 0"
            />
          </div>
          <nav v-if="totalPages > 1" aria-label="Pages de professionnels" class="mt-6 flex flex-wrap items-center justify-between gap-3">
            <UButton color="neutral" variant="outline" :disabled="pageNumber <= 1" @click="() => { pageNumber-- }">Précédent</UButton>
            <span class="text-sm text-gray-500">Page {{ pageNumber }} sur {{ totalPages }}</span>
            <UButton color="neutral" variant="outline" :disabled="pageNumber >= totalPages" @click="() => { pageNumber++ }">Suivant</UButton>
          </nav>
        </template>
      </div>
    </section>
    <SeoEditorial v-if="editorial" :article="editorial" />
  </div>
</template>

<script setup lang="ts">
import { getLabCityArticle } from '~/seo/cities/labs'

definePageMeta({ layout: 'default' })

const { appointmentNewUrl } = useAppointmentNewUrl()

const route = useRoute()

const ville = computed(() => (route.params.ville as string) || '')
const cityLabel = computed(() => {
  const v = ville.value
  if (!v) return ''
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
})

const { profiles: labs, loading, loadError, retry, pageNumber, totalPages } = await usePublicDirectory('labs', ville)

if (!loadError.value && labs.value.length === 0) {
  throw createError({ statusCode: 404, statusMessage: 'Aucun professionnel pour cette ville' })
}

const editorial = getLabCityArticle(ville.value)
if (editorial) {
  useSeoEditorialPage(editorial, { medicalBusiness: true })
} else {
  useLandingSeo({
    title: `Laboratoire de prélèvements à domicile à ${cityLabel.value} | Cary`,
    description: `Trouvez un laboratoire à ${cityLabel.value} pour vos prélèvements à domicile. Consultez les professionnels et demandez un rendez-vous en ligne.`,
    path: `/laboratoire/ville/${ville.value}`,
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Laboratoires', path: '/laboratoires' },
    ],
    areaServed: cityLabel.value,
    medicalBusiness: true,
    robots: 'noindex, follow',
  })
}

</script>
