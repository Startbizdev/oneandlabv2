<template>
  <section id="process" class="py-16 lg:py-24">
    <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
      <p class="text-sm font-semibold text-primary-800 dark:text-primary-300">Comment ça marche</p>
      <h2 class="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl dark:text-white">Du besoin de soin au rendez-vous confirmé.</h2>
      <ol class="mt-10 grid gap-6 md:grid-cols-3">
        <li v-for="(card, index) in cards" :key="card.title" class="border-t border-gray-200 pt-6 dark:border-gray-800">
          <span class="text-sm font-semibold tabular-nums text-primary-800 dark:text-primary-300">0{{ index + 1 }}</span>
          <h3 class="mt-4 text-xl font-semibold text-gray-950 dark:text-white">{{ card.title }}</h3>
          <p class="mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-400">{{ card.body }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
const cards = [
  { title: 'Décrivez votre besoin', body: 'Choisissez un ou plusieurs soins, la personne concernée, votre adresse et vos disponibilités.' },
  { title: 'Suivez la confirmation', body: 'Votre demande est transmise selon votre secteur. Vous êtes informé lorsqu’un professionnel confirme le rendez-vous.' },
  { title: 'Préparez la visite', body: 'Retrouvez le créneau, les documents et les informations utiles dans votre espace. Le soin a lieu à l’adresse prévue.' },
];
</script>
