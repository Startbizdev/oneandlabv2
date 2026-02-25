<template>
  <div>
    <!-- Hero bleu clair SEO -->
    <section class="relative py-12 sm:py-16 md:py-20 overflow-hidden bg-primary-50 dark:bg-primary-950/40 border-b border-primary-100 dark:border-primary-900/50">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center">
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-gray-900 dark:text-white mb-4">
          Infirmier libéral à domicile en France
        </h1>
        <p class="text-lg sm:text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto mb-8">
          Trouvez un infirmier libéral à domicile pour vos soins et prises de sang. Réservez en ligne en quelques clics.
        </p>
        <UButton
          to="/rendez-vous/nouveau"
          color="primary"
          size="xl"
          variant="solid"
          icon="i-lucide-calendar-plus"
          class="min-w-[260px] sm:min-w-[280px] px-8 py-4 text-base sm:text-lg font-medium"
        >
          Prendre rendez-vous à domicile
        </UButton>
        <ul class="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-badge-check" class="w-4 h-4 text-primary-500" />
            Gratuit
          </li>
          <li class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-primary-500" />
            Sans engagement
          </li>
          <li class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-clock" class="w-4 h-4 text-primary-500" />
            Réservation en 1 min
          </li>
        </ul>
      </div>
    </section>

    <section class="relative py-12 sm:py-16 md:py-20 overflow-hidden bg-gray-50 dark:bg-gray-950">
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

        <template v-else>
          <div v-if="nurses.length === 0" class="text-center py-16">
            <UIcon name="i-lucide-heart-pulse" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 class="text-xl font-medium text-gray-900 dark:text-white mb-2">Aucun infirmier pour le moment</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">Les infirmiers partenaires apparaîtront ici.</p>
            <UButton to="/rendez-vous/nouveau" color="primary" size="lg">Prendre rendez-vous</UButton>
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

const config = useRuntimeConfig()
const base = config.public.apiBase || '/api'
const apiBase = import.meta.server && (base.startsWith('/') || !base.startsWith('http'))
  ? 'http://127.0.0.1:8888/api'
  : base

const page = ref(1)
const { data: nursesData, pending: loading, refresh } = await useAsyncData(
  () => `nurses-list-${page.value}`,
  () => $fetch<{ success: boolean; data: any[]; pagination: any }>(
    `${apiBase}/public/nurses?page=${page.value}&limit=24`,
    { method: 'GET' }
  ),
  { watch: [page] }
)
const nurses = computed(() => nursesData.value?.success ? (nursesData.value.data ?? []) : [])
const pagination = computed(() => nursesData.value?.pagination ?? { page: 1, limit: 24, total: 0, pages: 0 })

const seoTitle = 'Infirmier libéral à domicile en France | Soins et prises de sang | OneAndLab'
const seoDescription = 'Trouvez un infirmier libéral à domicile pour vos soins et prises de sang. Réservez en ligne. Gratuit, sans engagement, réservation en 1 min.'

useHead({
  title: seoTitle,
  meta: [
    { name: 'description', content: seoDescription },
    { property: 'og:title', content: seoTitle },
    { property: 'og:description', content: seoDescription },
    { property: 'og:type', content: 'website' },
  ],
  link: [{ rel: 'canonical', href: `${config.public.siteUrl || ''}/infirmiers` }],
})

function loadPage(p: number) {
  page.value = p
}
</script>
