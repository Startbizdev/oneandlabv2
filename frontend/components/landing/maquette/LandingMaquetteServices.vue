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
            Simple, rapide<br />
            et sans effort
          </h2>
        </div>
        <p
          class="pb-1 text-[1.0625rem] leading-[1.78] text-[#3D3D52] lg:pb-px dark:text-gray-300"
        >
          De la réservation à l'intervention, tout se passe en quelques minutes. Aucun papier,
          aucune démarche. Vous choisissez, nous nous occupons du reste.
        </p>
      </div>
      <div class="grid gap-5 md:grid-cols-3">
        <article
          v-for="(card, i) in cards"
          :key="i"
          class="group rounded-[22px] border p-9 transition-all duration-200 sm:px-10 sm:py-11"
          :class="
            card.highlight
              ? 'border-primary-500 bg-primary-500 text-white shadow-none hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)]'
              : 'border-[#E8E8F0] bg-white hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] dark:border-gray-800 dark:bg-gray-900'
          "
        >
          <div
            class="mb-7 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border transition-colors"
            :class="
              card.highlight
                ? 'border-white/20 bg-white/15 text-white'
                : 'border-[#E8E8F0] bg-[#F7F7FB] text-primary-500 group-hover:border-primary-500/20 group-hover:bg-[#EBF3FD] dark:border-gray-700 dark:bg-gray-800'
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
    title: 'Réservez en ligne',
    body: "Choisissez le type de soin, votre adresse et un créneau. La réservation prend moins de trois minutes depuis votre téléphone.",
  },
  {
    highlight: false,
    icon: 'i-lucide-check-circle-2',
    title: 'Confirmation immédiate',
    body: 'Un professionnel qualifié disponible dans votre secteur accepte la demande. Vous recevez une confirmation par SMS et par email.',
  },
  {
    highlight: false,
    icon: 'i-lucide-house',
    title: 'Soins à domicile',
    body: "Le professionnel intervient chez vous à l'heure convenue avec le matériel adapté. Qualité hospitalière dans votre foyer.",
  },
] as const;
</script>
