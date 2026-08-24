<template>
  <section id="pour-les-patients" class="bg-[#F7F7FB] py-[72px] dark:bg-gray-900/50 lg:py-[100px]" aria-labelledby="patient-focus-heading">
    <div
      class="mx-auto grid max-w-[1200px] items-center gap-8 px-6 sm:gap-10 lg:grid-cols-2 lg:gap-x-[clamp(32px,5vw,64px)] lg:px-12"
    >
      <figure
        class="m-0 max-h-[min(520px,70vh)] overflow-hidden rounded-[22px] bg-[#E8E8F0] shadow-[0_12px_48px_rgba(15,23,42,0.1)] aspect-[4/5] max-lg:aspect-[16/10] max-lg:max-h-[min(420px,55vh)]"
      >
        <img
          src="/images/landing/landing-cary-cta-home-care.png"
          width="1600"
          height="900"
          class="h-full w-full object-cover object-[center_35%]"
          alt="Soins infirmiers à domicile : infirmière Cary avec une patiente chez elle"
          loading="lazy"
          decoding="async"
        />
      </figure>
      <div>
        <span
          class="mb-3.5 inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500"
        >
          Soins à domicile
        </span>
        <h2
          id="patient-focus-heading"
          class="mb-[18px] text-[clamp(1.75rem,2.5vw,2.5rem)] font-extrabold leading-[1.15] tracking-[-0.03em] text-[#0A0A0F] dark:text-white"
        >
          Moins de trajet. Plus de calme.
        </h2>
        <p class="mb-[22px] text-[1.0625rem] leading-[1.75] text-[#3D3D52] dark:text-gray-300">
          Vous réservez un infirmier ou une prise de sang chez vous, sans courir après les
          cabinets.
        </p>
        <ul class="m-0 flex list-none flex-col gap-3 p-0">
          <li
            v-for="(line, i) in lines"
            :key="i"
            class="relative pl-[22px] text-[0.9375rem] leading-[1.55] text-[#3D3D52] before:absolute before:left-0 before:top-[0.55em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary-500/85 dark:text-gray-300"
          >
            {{ line }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const lines = [
  'Un créneau que vous choisissez',
  'Des professionnels vérifiés',
  'Un SMS pour confirmer et rappeler',
] as const;
</script>
