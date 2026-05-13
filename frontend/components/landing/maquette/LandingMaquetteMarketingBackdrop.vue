<template>
  <div
    class="relative bg-gradient-to-br from-[#F6F8FC] via-white to-[#EDF3FC] dark:from-gray-950 dark:via-gray-950 dark:to-gray-900"
  >
    <div class="landing-mkt-grid-bg pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
    <div
      class="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_95%_60%_at_50%_-20%,rgb(47_128_237/0.1),transparent_50%)] dark:bg-[radial-gradient(ellipse_95%_60%_at_50%_-20%,rgb(47_128_237/0.15),transparent_50%)]"
      aria-hidden="true"
    />
    <div class="relative z-[1]">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.landing-mkt-grid-bg {
  opacity: 0.42;
  background-image:
    linear-gradient(rgb(47 128 237 / 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgb(47 128 237 / 0.055) 1px, transparent 1px);
  background-size: 28px 28px;
  background-position: 0 0;
}

:global(.dark) .landing-mkt-grid-bg {
  opacity: 0.2;
  background-image:
    linear-gradient(rgb(148 163 184 / 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgb(148 163 184 / 0.12) 1px, transparent 1px);
}
</style>
