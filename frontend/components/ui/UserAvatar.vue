<template>
  <div
    :class="[
      'flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center font-normal text-white bg-gradient-to-br from-primary-500 to-primary-600',
      bare ? 'ring-1 ring-gray-200/90 shadow-none dark:ring-gray-600/70' : 'ring-2 ring-white shadow-sm dark:ring-gray-900',
      sizeClass,
    ]"
  >
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      class="w-full h-full object-cover"
    />
    <span v-else class="select-none">{{ initial }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** URL de l'image (avatar) */
  src?: string | null
  /** Initiale affichée si pas d'image (ex: "J") */
  initial?: string
  /** Texte alternatif pour l'image */
  alt?: string
  /** Taille : sm (8), md (9), lg (10) en h/w Tailwind */
  size?: 'sm' | 'md' | 'lg'
  /** Anneau léger (header toolbar / Linear–Notion), sans halo épais */
  bare?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
  initial: 'U',
  alt: 'Avatar',
  size: 'md',
  bare: false,
})

const sizeClass = computed(() => {
  const map = { sm: 'h-8 w-8 text-sm', md: 'h-9 w-9 text-sm', lg: 'h-10 w-10 text-base' }
  return map[props.size]
})
</script>
