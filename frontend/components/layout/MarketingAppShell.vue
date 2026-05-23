<template>
  <div
    class="marketing-app-shell flex min-h-screen flex-col bg-white text-[#0A0A0F] dark:bg-gray-950 dark:text-white"
  >
    <LandingMaquetteHeader />
    <!-- Espaceur : le header est fixed ; sans lui le hero passe sous le bandeau -->
    <div class="marketing-header-spacer" aria-hidden="true" />
    <main class="flex-1">
      <slot />
    </main>
    <LandingMaquetteFooter />
  </div>
</template>
