<template>
  <section id="plateforme" class="border-y border-gray-200 bg-gray-50 py-16 lg:py-24 dark:border-gray-800 dark:bg-gray-900/40">
    <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
      <div class="max-w-2xl">
        <p class="text-sm font-semibold text-primary-800 dark:text-primary-300">Un espace pour chacun</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl dark:text-white">Des soins mieux organisés, ensemble.</h2>
      </div>
      <div class="mt-10 grid gap-4 md:grid-cols-2">
        <article v-for="space in spaces" :key="space.title" class="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-950">
          <UIcon :name="space.icon" class="size-7 text-primary-800 dark:text-primary-300" aria-hidden="true" />
          <h3 class="mt-5 text-xl font-semibold text-gray-950 dark:text-white">{{ space.title }}</h3>
          <p class="mt-3 flex-1 text-base leading-relaxed text-gray-600 dark:text-gray-400">{{ space.description }}</p>
          <NuxtLink :to="space.to" class="mt-5 inline-flex min-h-11 items-center gap-2 self-start rounded-lg text-sm font-semibold text-primary-800 hover:underline dark:text-primary-300">{{ space.cta }}<UIcon name="i-lucide-arrow-right" class="size-4" aria-hidden="true" /></NuxtLink>
        </article>
      </div>
      <NuxtLink to="/infirmiers" class="mt-7 inline-flex min-h-11 items-center text-sm font-medium text-gray-600 underline underline-offset-4 dark:text-gray-300">Consulter l’annuaire des infirmiers</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
const { appointmentNewUrl } = useAppointmentNewUrl();
const spaces = computed(() => [
  { title: 'Patients et proches', icon: 'i-lucide-heart-pulse', description: 'Réservez vos soins à domicile et retrouvez les rendez-vous de votre famille dans un même espace.', cta: 'Prendre rendez-vous', to: appointmentNewUrl.value },
  { title: 'Infirmiers libéraux', icon: 'i-lucide-stethoscope', description: 'Choisissez votre secteur, recevez des demandes et organisez vos passages. Vous gardez la main sur votre activité.', cta: 'Créer mon compte gratuit', to: '/nurse/register' },
  { title: 'Laboratoires', icon: 'i-lucide-flask-conical', description: 'Centralisez les demandes de prélèvement, répartissez les rendez-vous et coordonnez vos équipes.', cta: 'Inscrire mon laboratoire', to: '/lab/register' },
  { title: 'Professionnels de santé', icon: 'i-lucide-users', description: 'Organisez les soins de vos patients et suivez les demandes transmises aux professionnels du secteur.', cta: 'Découvrir l’espace professionnel', to: '/pour-les-professionnels' },
]);
</script>
