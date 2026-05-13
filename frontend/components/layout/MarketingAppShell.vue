<template>
  <div class="flex min-h-screen flex-col bg-white text-[#0A0A0F] dark:bg-gray-950 dark:text-white">
    <LandingMaquetteHeader />
    <main class="flex-1">
      <slot />
    </main>
    <LandingMaquetteFooter />
  </div>
</template>
