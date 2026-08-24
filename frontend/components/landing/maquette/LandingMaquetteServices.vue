<template>
  <section id="process" class="py-[72px] lg:py-[100px]">
    <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
      <div class="mb-14 grid gap-4 lg:mb-14 lg:grid-cols-2 lg:items-end lg:gap-[60px]">
        <div>
          <span
            class="mb-4 inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500"
          >
            Comment ça marche
          </span>
          <h2
            class="text-[clamp(1.875rem,2.5vw,2.625rem)] font-extrabold leading-[1.1] tracking-[-0.035em] text-[#0A0A0F] dark:text-white"
          >
            Trois minutes,<br />
            et c’est réglé
          </h2>
        </div>
        <p
          class="pb-1 text-[1.0625rem] leading-[1.78] text-[#3D3D52] lg:pb-px dark:text-gray-300"
        >
          Vous choisissez le soin et l’horaire. Nous trouvons le professionnel. Il vient chez
          vous.
        </p>
      </div>
      <div class="grid gap-5 md:grid-cols-3">
        <article
          v-for="(card, i) in cards"
          :key="i"
          class="group flex flex-col overflow-hidden rounded-[22px] border transition-all duration-200"
          :class="
            card.highlight
              ? 'border-primary-500 bg-primary-500 text-white shadow-none hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(28,199,181,0.25)]'
              : 'border-[#E8E8F0] bg-white hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] dark:border-gray-800 dark:bg-gray-900'
          "
        >
          <div
            v-if="card.illustration && !card.highlight"
            class="relative aspect-[4/3] w-full overflow-hidden"
          >
            <LandingIllustration :variant="card.illustration" />
            <div
              class="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary-500/20 via-transparent to-transparent"
              aria-hidden="true"
            />
          </div>

          <div class="flex flex-1 flex-col p-9 sm:px-10 sm:py-11">
            <div
              class="mb-7 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border transition-colors"
              :class="
                card.highlight
                  ? 'border-white/20 bg-white/15 text-white'
                  : 'border-[#E8E8F0] bg-[#F7F7FB] text-primary-500 group-hover:border-primary-500/20 group-hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:group-hover:bg-primary-500/10'
              "
            >
              <UIcon :name="card.icon" class="h-6 w-6" />
            </div>
            <h3
              class="mb-3 text-[1.125rem] font-bold leading-[1.3] tracking-[-0.02em]"
              :class="card.highlight ? 'text-white' : 'text-[#0A0A0F] dark:text-white'"
            >
              {{ card.title }}
            </h3>
            <p
              class="text-[0.9375rem] leading-[1.72]"
              :class="
                card.highlight ? 'text-white/75' : 'text-[#3D3D52] dark:text-gray-400'
              "
            >
              {{ card.body }}
            </p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const cards = [
  {
    highlight: true,
    icon: 'i-lucide-calendar-plus',
    title: 'Vous réservez',
    body: 'Soin, adresse, créneau. Trois minutes, depuis votre téléphone.',
  },
  {
    highlight: false,
    icon: 'i-lucide-check-circle-2',
    title: 'On vous confirme',
    body: 'Un professionnel près de chez vous accepte. Vous recevez un SMS et un email.',
    illustration: 'confirmation' as const,
  },
  {
    highlight: false,
    icon: 'i-lucide-house',
    title: 'Il vient chez vous',
    body: 'À l’heure convenue, avec le matériel. Vous n’avez pas à vous déplacer.',
    illustration: 'home-care' as const,
  },
] as const;
</script>
