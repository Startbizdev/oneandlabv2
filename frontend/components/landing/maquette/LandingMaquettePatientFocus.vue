<template>
  <section id="pour-les-patients" class="py-16 lg:py-24" aria-labelledby="patient-focus-heading">
    <div class="mx-auto grid max-w-[1200px] gap-10 px-6 lg:grid-cols-2 lg:items-start lg:px-12">
      <div>
        <p class="text-sm font-semibold text-primary-800 dark:text-primary-300">Avant le rendez-vous</p>
        <h2 id="patient-focus-heading" class="mt-3 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl dark:text-white">Les bonnes informations, dès le départ.</h2>
        <p class="mt-5 text-base leading-relaxed text-gray-600 dark:text-gray-400">Une demande complète aide le professionnel à préparer votre visite. Vous retrouvez ensuite les informations dans votre espace.</p>
      </div>
      <ol class="divide-y divide-gray-200 rounded-2xl border border-gray-200 px-6 dark:divide-gray-800 dark:border-gray-800">
        <li v-for="item in items" :key="item.title" class="flex items-start gap-4 py-5">
          <UIcon :name="item.icon" class="mt-1 size-5 shrink-0 text-primary-800 dark:text-primary-300" aria-hidden="true" />
          <div><h3 class="text-base font-semibold text-gray-950 dark:text-white">{{ item.title }}</h3><p class="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{{ item.description }}</p></div>
        </li>
      </ol>
    </div>
  </section>
</template>
<script setup lang="ts">
const items = [
  { icon: 'i-lucide-map-pin', title: 'Une adresse précise', description: 'Ajoutez l’étage, le bâtiment et les indications d’accès utiles.' },
  { icon: 'i-lucide-file-text', title: 'Vos documents utiles', description: 'Joignez votre ordonnance et les documents demandés dans le parcours.' },
  { icon: 'i-lucide-calendar-check', title: 'La confirmation du professionnel', description: 'Vérifiez le statut de votre demande et les disponibilités retenues.' },
];
</script>
