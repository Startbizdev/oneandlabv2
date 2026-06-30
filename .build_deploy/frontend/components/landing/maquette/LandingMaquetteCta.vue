<template>
  <section class="relative flex min-h-[clamp(480px,62vw,600px)] items-center overflow-hidden">
    <div class="absolute inset-0 z-0">
      <img
        src="/images/landing/landing-cary-cta-home-care.png"
        alt="Patiente accompagnée par une infirmière Cary à domicile"
        class="h-full w-full object-cover object-[center_35%]"
        loading="lazy"
        decoding="async"
      />
      <div
        class="absolute inset-0 bg-gradient-to-br from-[rgb(8_14_32/0.88)] via-[rgb(12_90_82/0.45)] to-[rgb(6_10_22/0.78)]"
        aria-hidden="true"
      />
      <div
        class="absolute inset-0 bg-gradient-to-t from-[rgb(4_8_18/0.75)] to-transparent to-55%"
        aria-hidden="true"
      />
    </div>
    <div
      class="relative z-[1] mx-auto max-w-[720px] px-6 py-[clamp(64px,10vw,100px)] text-center lg:px-12"
    >
      <span
        class="mb-[18px] inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50"
      >
        Commencer maintenant
      </span>
      <h2
        class="mb-[22px] text-[clamp(2.35rem,5vw,3.65rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-white"
      >
        Prenez soin de vous<br />
        depuis chez vous
      </h2>
      <p
        class="mx-auto mb-10 max-w-[520px] text-[clamp(1rem,1.4vw,1.125rem)] leading-[1.7] text-white/72"
      >
        Rejoignez les 15 000 patients qui ont choisi Cary. Inscription gratuite, sans
        engagement.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <NuxtLink
          :to="appointmentNewUrl"
          class="inline-flex min-h-10 items-center justify-center rounded-md border border-transparent bg-primary-500 px-5 py-2.5 text-base font-medium text-white shadow-[0_1px_2px_0_rgb(15_23_42_/_0.06)] transition-all hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
        >
          Prendre rendez-vous
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { appointmentNewUrl } = useAppointmentNewUrl();
</script>
