<template>
  <section
    class="relative py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden"
    :class="backgroundClass"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <!-- En-tête -->
      <div class="text-center mb-8 sm:mb-10 md:mb-12">
        <h2
          v-if="title"
          class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-gray-900 dark:text-white mb-3 sm:mb-4"
        >
          {{ title }}
        </h2>
        <p
          v-if="subtitle"
          class="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-normal"
        >
          {{ subtitle }}
        </p>
      </div>

      <!-- Carousel avis : exactement 3 cartes visibles sur lg, slide au clic, dots en dessous -->
      <div v-if="reviews && reviews.length > 0" class="relative -mx-4 px-4 sm:-mx-6 sm:px-6 lg:px-0">
        <div class="overflow-hidden">
          <div
            ref="trackRef"
            class="flex gap-4 sm:gap-5 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth pb-2"
            style="scrollbar-width: none; -ms-overflow-style: none;"
            @scroll="onScroll"
          >
            <div
              v-for="(review, index) in displayedReviews"
              :key="review.id || index"
              :data-review-card="index"
              class="flex-shrink-0 w-full sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)] snap-start"
            >
            <div
              class="h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <!-- Étoiles pleines (SVG rempli pour les notés) -->
              <div class="flex items-center gap-0.5 mb-4" role="img" :aria-label="`${review.rating} sur 5`">
                <template v-for="star in 5" :key="star">
                  <svg
                    v-if="star <= review.rating"
                    class="w-5 h-5 flex-shrink-0 text-amber-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <svg
                    v-else
                    class="w-5 h-5 flex-shrink-0 text-gray-200 dark:text-gray-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </template>
              </div>

              <!-- Commentaire -->
              <p
                v-if="review.comment"
                class="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed flex-1 line-clamp-5 font-normal"
              >
                « {{ review.comment }} »
              </p>
              <p
                v-else
                class="text-sm sm:text-base text-gray-500 dark:text-gray-400 italic flex-1 font-normal"
              >
                Aucun commentaire
              </p>

              <!-- Auteur : pseudonyme (Prénom X.) + date -->
              <div class="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 min-w-0">
                <div
                  class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 text-sm font-medium flex-shrink-0"
                >
                  {{ authorInitial(review) }}
                </div>
                <div class="min-w-0">
                  <p class="text-gray-900 dark:text-white truncate font-medium">
                    {{ authorLabel(review, index) }}
                  </p>
                  <p v-if="review.date" class="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    {{ formatDate(review.date) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        <!-- Boutons prev/next (desktop) -->
        <template v-if="displayedReviews.length > 1">
          <button
            type="button"
            :disabled="!canScrollPrev"
            class="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-11 h-11 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
            aria-label="Avis précédent"
            @click="scrollPrev"
          >
            <UIcon name="i-lucide-chevron-left" class="w-5 h-5" />
          </button>
          <button
            type="button"
            :disabled="!canScrollNext"
            class="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-11 h-11 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
            aria-label="Avis suivant"
            @click="scrollNext"
          >
            <UIcon name="i-lucide-chevron-right" class="w-5 h-5" />
          </button>
        </template>

        <!-- Points indicateurs (optionnel) -->
        <div
          v-if="displayedReviews.length > 1"
          class="flex justify-center gap-2 mt-6"
        >
          <button
            v-for="(_, i) in displayedReviews"
            :key="i"
            type="button"
            :aria-label="`Avis ${i + 1}`"
            :class="[
              'w-2 h-2 rounded-full transition-all duration-200',
              currentIndex === i
                ? 'bg-primary-500 w-6'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
            ]"
            @click="scrollTo(i)"
          />
        </div>
      </div>

      <!-- Message si pas d'avis -->
      <div
        v-else
        class="text-center py-12 sm:py-16 md:py-20"
      >
        <div class="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 sm:mb-5">
          <UIcon name="i-lucide-message-square" class="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
        </div>
        <p class="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 font-medium">
          Aucun avis pour le moment
        </p>
        <p class="text-sm sm:text-base text-gray-500 dark:text-gray-500 mt-2">
          Soyez le premier à laisser un avis !
        </p>
      </div>

      <div v-if="$slots.default" class="mt-10 sm:mt-12 md:mt-16">
        <slot />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface Review {
  id?: string
  patientName?: string
  rating: number
  comment?: string
  response?: string
  date?: string | Date
}

interface Props {
  title?: string
  subtitle?: string
  reviews?: Review[]
  maxReviews?: number
  backgroundClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Ils nous font confiance',
  subtitle: 'Découvrez les avis de nos patients sur nos professionnels de santé',
  reviews: () => [],
  maxReviews: 6,
  backgroundClass: 'bg-gray-50 dark:bg-gray-950',
})

const trackRef = ref<HTMLElement | null>(null)
const currentIndex = ref(0)
const canScrollPrev = ref(false)
const canScrollNext = ref(true)

const displayedReviews = computed(() => {
  if (!props.reviews || props.reviews.length === 0) return []
  return props.reviews.slice(0, props.maxReviews)
})

// Initiale : première lettre du prénom
function authorInitial(review: Review): string {
  const name = review.patientName || ''
  const first = name.trim().split(/\s+/)[0] || ''
  return (first.charAt(0) || 'A').toUpperCase()
}

// Pseudonyme affiché : "Prénom X." (faux nom de famille en initiale, pas de labo)
const FAKE_INITIALS = ['D.', 'P.', 'L.', 'M.', 'B.', 'R.', 'C.', 'F.']
function authorLabel(review: Review, index: number): string {
  const name = (review.patientName || 'Patient').trim()
  const first = name.split(/\s+/)[0] || 'Patient'
  const initial = FAKE_INITIALS[index % FAKE_INITIALS.length]
  return `${first} ${initial}`
}

function formatDate(date: string | Date | undefined): string {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ''
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - dateObj.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} jours`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `Il y a ${weeks} ${weeks === 1 ? 'semaine' : 'semaines'}`
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `Il y a ${months} ${months === 1 ? 'mois' : 'mois'}`
  }
  return dateObj.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function onScroll() {
  if (!trackRef.value) return
  const el = trackRef.value
  const scrollLeft = el.scrollLeft
  const maxScroll = el.scrollWidth - el.clientWidth
  canScrollPrev.value = scrollLeft > 10
  canScrollNext.value = scrollLeft < maxScroll - 10
  const cards = el.querySelectorAll('[data-review-card]')
  if (cards.length === 0) return
  let idx = 0
  let minDist = Infinity
  cards.forEach((card, i) => {
    const left = (card as HTMLElement).offsetLeft
    const dist = Math.abs(scrollLeft - left)
    if (dist < minDist) {
      minDist = dist
      idx = i
    }
  })
  currentIndex.value = idx
}

function scrollPrev() {
  const idx = Math.max(0, currentIndex.value - 1)
  scrollTo(idx)
}

function scrollNext() {
  const idx = Math.min(displayedReviews.value.length - 1, currentIndex.value + 1)
  scrollTo(idx)
}

function scrollTo(index: number) {
  if (!trackRef.value) return
  const card = trackRef.value.querySelector(`[data-review-card="${index}"]`)
  if (card) {
    (card as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }
  currentIndex.value = index
}

onMounted(() => {
  if (trackRef.value) onScroll()
})
</script>

<style scoped>
.line-clamp-5 {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
[style*='scrollbar-width: none']::-webkit-scrollbar {
  display: none;
}
</style>
