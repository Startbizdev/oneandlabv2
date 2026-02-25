<template>
  <div>
    <!-- Hero bleu clair SEO : Laboratoires à [Ville] -->
    <section class="relative py-12 sm:py-16 md:py-20 overflow-hidden bg-primary-50 dark:bg-primary-950/40 border-b border-primary-100 dark:border-primary-900/50">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center">
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-gray-900 dark:text-white mb-4">
          Laboratoire de prélèvements à domicile à {{ cityLabel }}
        </h1>
        <p class="text-lg sm:text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto mb-8">
          Trouvez un laboratoire pour vos prélèvements à domicile à {{ cityLabel }}. Réservez en ligne.
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
            </div>
          </div>
        </div>

        <template v-else>
          <div v-if="labs.length === 0" class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center">
            <UIcon name="i-lucide-building-2" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 class="text-xl font-medium text-gray-900 dark:text-white mb-2">Aucun laboratoire pour cette ville</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">Les laboratoires à {{ cityLabel }} apparaîtront ici lorsqu'ils seront inscrits.</p>
            <UButton to="/laboratoires" variant="outline" size="lg">Voir tous les laboratoires</UButton>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase || '/api'

const ville = computed(() => (route.params.ville as string) || '')
const cityLabel = computed(() => {
  const v = ville.value
  if (!v) return ''
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
})

const loading = ref(true)
const labs = ref<{ id: string; slug: string; name: string; profile_image_url?: string; city?: string; presentation?: string }[]>([])

const seoTitle = computed(() => `Laboratoire de prélèvements à domicile à ${cityLabel.value} | OneAndLab`)
const seoDescription = computed(() => `Trouvez un laboratoire à ${cityLabel.value} pour vos prélèvements à domicile. Réservez en ligne. Gratuit, sans engagement.`)

useHead({
  title: seoTitle,
  meta: [
    { name: 'description', content: seoDescription },
    { property: 'og:title', content: seoTitle },
    { property: 'og:description', content: seoDescription },
    { property: 'og:type', content: 'website' },
  ],
  link: [{ rel: 'canonical', href: computed(() => `${config.public.siteUrl || ''}/laboratoires/ville/${ville.value}`) }],
})

async function fetchLabs() {
  loading.value = true
  try {
    const cityParam = ville.value ? `&city=${encodeURIComponent(ville.value)}` : ''
    const res = await $fetch<{ success: boolean; data: any[] }>(`${apiBase}/public/labs?limit=24${cityParam}`, { method: 'GET' })
    labs.value = res?.success ? (res.data ?? []) : []
  } catch {
    labs.value = []
  } finally {
    loading.value = false
  }
}

watch(ville, () => fetchLabs(), { immediate: true })
</script>
