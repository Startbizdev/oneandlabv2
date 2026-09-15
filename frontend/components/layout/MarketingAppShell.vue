<template>
  <div
    class="marketing-app-shell flex min-h-screen flex-col bg-white text-[#0A0A0F] dark:bg-gray-950 dark:text-white"
  >
    <a href="#marketing-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-gray-950">Aller au contenu</a>
    <LandingMaquetteHeader />
    <!-- Espaceur : le header est fixed ; sans lui le hero passe sous le bandeau -->
    <div class="marketing-header-spacer" aria-hidden="true" />
    <main id="marketing-content" tabindex="-1" class="min-w-0 flex-1">
      <slot />
    </main>
    <LandingMaquetteFooter />
  </div>
</template>
