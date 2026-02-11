<template>
  <section
    class="relative overflow-hidden flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 sm:py-16 md:py-20"
    :class="backgroundClass"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl relative z-10 w-full">
      <div class="text-center mx-auto max-w-3xl">
        <!-- Badge optionnel -->
        <p v-if="badge" class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-primary-700 bg-primary-100 mb-4 sm:mb-5">
          <UIcon v-if="badgeIcon" :name="badgeIcon" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {{ badge }}
        </p>

        <!-- Titre principal -->
        <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-tight mb-3 sm:mb-4">
          {{ title }}
        </h1>

        <!-- Sous-titre (lead) -->
        <p v-if="subtitle" class="text-base sm:text-lg md:text-xl text-gray-700 font-medium max-w-2xl mx-auto mb-3 sm:mb-4">
          {{ subtitle }}
        </p>

        <!-- Description -->
        <p v-if="description" class="text-sm sm:text-base text-gray-600 max-w-xl mx-auto leading-relaxed font-normal mb-6 sm:mb-8">
          {{ description }}
        </p>

        <!-- CTAs centrés, taille lg -->
        <div v-if="ctas && ctas.length > 0" class="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <UButton
            v-for="(cta, index) in ctas"
            :key="index"
            :to="cta.to"
            :color="cta.color || 'primary'"
            size="lg"
            :variant="cta.variant || 'solid'"
            :icon="cta.icon"
            class="w-full sm:w-auto min-w-[180px] font-semibold justify-center text-center"
          >
            {{ cta.label }}
          </UButton>
        </div>

        <!-- Lien "J'ai déjà un compte" -->
        <p v-if="showLoginLink" class="mt-5 sm:mt-6 text-sm text-gray-500">
          J'ai déjà un compte —
          <NuxtLink to="/login" class="font-medium text-primary-600 hover:text-primary-700 underline underline-offset-2">
            Me connecter
          </NuxtLink>
        </p>

        <!-- Image optionnelle en dessous -->
        <div v-if="imageSrc" class="mt-10 sm:mt-12 max-w-xs sm:max-w-sm md:max-w-md mx-auto">
          <img
            :src="imageSrc"
            :alt="imageAlt || title"
            class="w-full h-auto object-contain drop-shadow-lg rounded-2xl"
            loading="eager"
          />
        </div>
      </div>
    </div>

    <!-- Dégradé discret -->
    <div class="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
      <div class="absolute inset-0 bg-gradient-to-b from-primary-50/30 via-transparent to-transparent" />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    badge?: string
    badgeIcon?: string
    title: string
    subtitle?: string
    description?: string
    imageSrc?: string
    imageAlt?: string
    ctas?: Array<{
      label: string
      to: string
      color?: string
      size?: string
      variant?: string
      icon?: string
    }>
    backgroundClass?: string
    showLoginLink?: boolean
  }>(),
  { showLoginLink: true }
)
</script>
