<template>
  <section
    class="relative overflow-hidden border-b border-gray-100 bg-white"
    :class="backgroundClass"
  >
    <!-- Fond : pattern SVG discret + gradients -->
    <div class="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
      <!-- Pattern points subtil -->
      <svg class="absolute inset-0 h-full w-full opacity-[0.4]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="rgb(6, 82, 221)" fill-opacity="0.12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>
      <div class="absolute inset-0 bg-[linear-gradient(to_bottom_right,var(--color-primary-50)_0%,transparent_50%)] opacity-60" />
      <div class="absolute top-0 right-0 w-1/2 h-3/4 bg-gradient-to-bl from-gray-50/80 to-transparent" />
    </div>

    <div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
      <div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <!-- Colonne gauche : copy (SEO, clarté) — en premier sur mobile -->
        <div class="order-1 lg:order-1 text-left">
          <!-- Badge pill type Notion/Linear -->
          <div
            v-if="badge"
            class="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm mb-6"
          >
            <UIcon v-if="badgeIcon" :name="badgeIcon" class="h-3.5 w-3.5 text-primary-500" />
            {{ badge }}
          </div>

          <!-- Titre : typo Stripe/Linear, tracking-tight -->
          <h1
            class="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl lg:leading-[1.1]"
          >
            {{ title }}
          </h1>

          <!-- Sous-titre (lead) -->
          <p
            v-if="subtitle"
            class="mt-4 text-lg text-gray-600 sm:text-xl max-w-xl"
          >
            {{ subtitle }}
          </p>

          <!-- Description -->
          <p
            v-if="description"
            class="mt-3 text-base text-gray-500 max-w-xl leading-relaxed"
          >
            {{ description }}
          </p>

          <!-- CTAs : un primaire, style n8n/Stripe -->
          <div v-if="ctas && ctas.length > 0" class="mt-8 flex flex-wrap items-center gap-3">
            <UButton
              v-for="(cta, index) in ctas"
              :key="index"
              :to="cta.to"
              :color="cta.color || 'primary'"
              :size="cta.size === 'xl' ? 'xl' : 'lg'"
              :variant="cta.variant || 'solid'"
              :icon="cta.icon"
              class="font-medium"
            >
              {{ cta.label }}
            </UButton>
          </div>

          <!-- Lien connexion : discret -->
          <p v-if="showLoginLink" class="mt-6 text-sm text-gray-500">
            Déjà un compte —
            <NuxtLink
              to="/login"
              class="font-medium text-primary-600 hover:text-primary-700"
            >
              Se connecter
            </NuxtLink>
          </p>
        </div>

        <!-- Colonne droite : image (même image qu’avant, présentation type marketing) -->
        <div class="order-2 lg:order-2">
          <img
            v-if="heroImageUrl"
            :src="heroImageUrl"
            :alt="imageAlt || title"
            class="w-full h-auto max-h-[420px] object-contain object-right"
            loading="eager"
          />
          <img
            v-else-if="imageSrc"
            :src="imageSrc"
            :alt="imageAlt || title"
            class="w-full h-auto max-h-[420px] object-contain object-right"
            loading="eager"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    badge?: string
    badgeIcon?: string
    title: string
    subtitle?: string
    description?: string
    imageSrc?: string
    imageAlt?: string
    /** Image hero (ex. fond Unsplash) : affichée en visuel à droite, pas en plein écran */
    backgroundImage?: string
    overlayClass?: string
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

const heroImageUrl = computed(() => props.backgroundImage || props.imageSrc || '')
</script>
