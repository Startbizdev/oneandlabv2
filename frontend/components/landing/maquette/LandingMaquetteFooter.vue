<template>
  <footer class="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
    <div class="mx-auto max-w-[1200px] px-6 py-12 lg:px-12 lg:py-16">
      <div class="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <div class="max-w-xs">
          <NuxtLink to="/" aria-label="Cary, accueil"><img src="/images/logo-cary.png" alt="Cary" width="120" height="44" class="h-10 w-auto object-contain" loading="lazy" /></NuxtLink>
          <p class="mt-5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">Les soins à domicile, organisés autour des patients et des professionnels qui les accompagnent.</p>
        </div>
        <nav class="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Liens du pied de page">
          <div v-for="block in footerBlocks" :key="block.title">
            <h2 class="mb-3 text-sm font-semibold text-gray-950 dark:text-white">{{ block.title }}</h2>
            <ul>
              <li v-for="link in block.links" :key="link.to + link.label">
                <NuxtLink :to="link.to" class="inline-flex min-h-11 items-center py-2 text-sm leading-snug hover:text-primary-800 hover:underline dark:hover:text-primary-300">{{ link.label }}</NuxtLink>
              </li>
            </ul>
          </div>
        </nav>
      </div>
      <div class="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-gray-200 pt-6 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <span>© {{ year }} Cary</span>
        <div class="flex flex-wrap gap-x-5 gap-y-2">
          <NuxtLink to="/politique-confidentialite" class="inline-flex min-h-11 items-center hover:underline">Confidentialité</NuxtLink>
          <NuxtLink to="/cgv" class="inline-flex min-h-11 items-center hover:underline">Conditions d’utilisation</NuxtLink>
          <NuxtLink to="/mentions-legales" class="inline-flex min-h-11 items-center hover:underline">Mentions légales</NuxtLink>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const { appointmentNewUrl } = useAppointmentNewUrl();
const year = new Date().getFullYear();

const footerBlocks = computed(() => {
  const rdv = appointmentNewUrl.value;
  const nursingQ = rdv === '/rendez-vous/nouveau' ? '?type=nursing' : '';
  const bloodQ = rdv === '/rendez-vous/nouveau' ? '?type=blood_test' : '';
  return [
    {
    title: 'Services',
    links: [
      { label: 'Soins infirmiers', to: `${rdv}${nursingQ}`, external: false },
      { label: 'Prise de sang à domicile', to: `${rdv}${bloodQ}`, external: false },
      { label: 'Pour les patients', to: '/pour-les-patients', external: false },
      { label: 'Comment réserver', to: `${rdv}`, external: false },
    ],
  },
  {
    title: 'Professionnels',
    links: [
      { label: 'Infirmiers', to: '/pour-les-infirmiers', external: false },
      { label: 'Laboratoires', to: '/pour-les-laboratoires', external: false },
      { label: 'Créer mon compte infirmier', to: '/nurse/register', external: false },
      { label: 'Espace médecin', to: '/pour-les-professionnels', external: false },
    ],
  },
  {
    title: 'Aide',
    links: [
      { label: 'Contact', to: '/contact', external: false },
      { label: 'Questions fréquentes', to: '/#faq', external: false },

    ],
  },
  ];
});
</script>
