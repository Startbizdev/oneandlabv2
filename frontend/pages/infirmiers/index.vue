<template>
  <div>
    <PublicDirectoryHero kind="nurses" :city="searchCity" :appointment-url="appointmentNewUrl" @search="searchCity = $event" />

    <section class="relative py-12 sm:py-16 md:py-20 overflow-hidden bg-app-canvas dark:bg-gray-950">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden animate-pulse">
            <div class="h-40 bg-gray-200 dark:bg-gray-700" />
            <div class="p-4 space-y-2">
              <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div class="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          </div>
        </div>

        <div v-else-if="loadError" class="space-y-4">
          <UAlert color="error" title="Annuaire indisponible" description="La liste ne peut pas être chargée pour le moment." />
          <UButton color="neutral" variant="outline" @click="retry">Réessayer</UButton>
        </div>
        <template v-else>
          <div v-if="nurses.length === 0" class="text-center py-16">
            <UIcon name="i-lucide-heart-pulse" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 class="text-xl font-medium text-gray-900 dark:text-white mb-2">Pas encore d’infirmier visible</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">Les fiches apparaîtront ici. Vous pouvez déjà réserver une visite : nous trouvons un professionnel dans votre zone.</p>
            <UButton :to="appointmentNewUrl" color="primary" size="lg">Réserver une visite</UButton>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <PublicProfileCard
              v-for="nurse in nurses"
              :key="nurse.id"
              type="nurse"
              :slug="nurse.slug"
              :name="nurse.name"
              :profile-image-url="nurse.profile_image_url"
              :city="nurse.city"
              :presentation="nurse.presentation"
              :reviews-count="nurse.reviews_count ?? 0"
              :average-rating="nurse.average_rating ?? 0"
            />
          </div>

          <div v-if="pagination.pages > 1" class="mt-10 flex justify-center gap-2">
            <UButton
              v-if="pagination.page > 1"
              variant="outline"
              size="sm"
              @click="loadPage(pagination.page - 1)"
            >
              Précédent
            </UButton>
            <span class="flex items-center px-4 text-sm text-gray-600 dark:text-gray-400">
              Page {{ pagination.page }} / {{ pagination.pages }}
            </span>
            <UButton
              v-if="pagination.page < pagination.pages"
              variant="outline"
              size="sm"
              @click="loadPage(pagination.page + 1)"
            >
              Suivant
            </UButton>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { appointmentNewUrl } = useAppointmentNewUrl()
const config = useRuntimeConfig()
const searchCity = ref('')
const { profiles: nurses, loading, loadError, retry, pageNumber: page, totalPages } = await usePublicDirectory('nurses', searchCity)
const pagination = computed(() => ({ page: page.value, pages: totalPages.value }))

const seoTitle = 'Infirmier à domicile en France | Soins et prises de sang | Cary'
const seoDescription = 'Trouvez un infirmier à domicile pour un soin ou une prise de sang. Réservez en ligne, sans engagement.'

useHead({
  title: seoTitle,
  meta: [
    { name: 'description', content: seoDescription },
    { property: 'og:title', content: seoTitle },
    { property: 'og:description', content: seoDescription },
    { property: 'og:type', content: 'website' },
  ],
  link: [{ rel: 'canonical', href: `${String(config.public.siteUrl || 'https://cary.bio').replace(/\/$/, '')}/infirmiers` }],
})

function loadPage(p: number) {
  page.value = p
}
</script>
