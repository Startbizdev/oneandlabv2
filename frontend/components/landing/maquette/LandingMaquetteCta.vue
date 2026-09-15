<template>
  <section class="bg-primary-500 px-6 py-16 lg:py-20">
    <div class="mx-auto flex max-w-[1104px] flex-col items-start justify-between gap-8 md:flex-row md:items-center">
      <div class="max-w-xl">
        <h2 class="text-3xl font-semibold tracking-tight text-primary-950 sm:text-4xl">Votre prochain soin commence ici.</h2>
        <p class="mt-4 text-base leading-relaxed text-primary-950">Choisissez vos soins et vos disponibilités. Vous pourrez vérifier votre demande avant de l’envoyer.</p>
      </div>
      <NuxtLink :to="appointmentNewUrl" class="inline-flex min-h-12 shrink-0 items-center gap-3 rounded-xl bg-primary-950 px-6 py-3 text-base font-semibold text-white hover:bg-primary-900">Prendre rendez-vous<UIcon name="i-lucide-arrow-right" class="size-5" aria-hidden="true" /></NuxtLink>
    </div>
  </section>
</template>
<script setup lang="ts">
const { appointmentNewUrl } = useAppointmentNewUrl();
</script>
