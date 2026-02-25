<template>
  <NuxtLink
    :to="profileUrl"
    class="group flex flex-col h-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-200 text-center"
  >
    <!-- Contenu centré en long (vertical) -->
    <div class="flex flex-col items-center flex-1 p-5 sm:p-6">
      <!-- Logo centré -->
      <div class="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 ring-2 ring-gray-100 dark:ring-gray-800">
        <img
          v-if="profileImageUrl"
          :src="profileImageUrl"
          :alt="name"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div
          v-else
          class="w-full h-full flex items-center justify-center text-primary-500 dark:text-primary-400"
        >
          <UIcon :name="type === 'nurse' ? 'i-lucide-heart-pulse' : 'i-lucide-building-2'" class="w-10 h-10 sm:w-12 sm:h-12" />
        </div>
      </div>
      <!-- Nom -->
      <h2 class="mt-4 text-lg font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1 w-full">
        {{ name }}
      </h2>
      <!-- Note + nombre d'avis (étoiles vides si aucun avis) -->
      <div class="mt-1.5 flex items-center justify-center gap-1.5 text-sm">
        <div class="flex items-center gap-0.5">
          <UIcon
            v-for="i in 5"
            :key="i"
            :name="i <= starCount ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
            :class="[
              'w-4 h-4',
              i <= starCount ? 'text-yellow-500 dark:text-yellow-400' : 'text-gray-300 dark:text-gray-600',
            ]"
          />
        </div>
        <span class="text-gray-500 dark:text-gray-400">
          {{ reviewsCount > 0 ? `${reviewsCount} avis` : 'Aucun avis' }}
        </span>
      </div>
      <!-- Ville -->
      <p v-if="city" class="mt-1.5 flex items-center justify-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 flex-shrink-0" />
        <span class="truncate max-w-full">{{ city }}</span>
      </p>
      <!-- Présentation tronquée centrée -->
      <p v-if="presentation" class="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed w-full">
        {{ presentation }}
      </p>
    </div>
    <!-- Bouton lg pleine largeur -->
    <div class="p-4 sm:p-5 pt-0 w-full">
      <span
        class="flex items-center justify-center w-full rounded-lg py-3 px-4 text-base font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 group-hover:bg-primary-200 dark:group-hover:bg-primary-800/50 transition-colors"
      >
        <UIcon name="i-lucide-calendar-plus" class="w-5 h-5 mr-2" />
        Prendre rendez-vous
      </span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  slug: string
  type: 'nurse' | 'lab'
  name: string
  profileImageUrl?: string | null
  city?: string | null
  presentation?: string | null
  /** Nombre d'avis */
  reviewsCount?: number
  /** Note moyenne (0-5), pour les étoiles */
  averageRating?: number
}>()

const profileUrl = computed(() =>
  props.type === 'nurse' ? `/infirmier/${props.slug}` : `/Laboratoire/${props.slug}`
)

const starCount = computed(() =>
  props.reviewsCount && props.reviewsCount > 0 ? Math.round(Math.min(5, Math.max(0, props.averageRating ?? 0))) : 0
)
</script>
