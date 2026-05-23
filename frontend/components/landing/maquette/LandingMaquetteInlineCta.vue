<template>
  <section class="px-6 pb-[72px] lg:pb-[100px] lg:px-12" :class="outerClass">
    <div class="mx-auto max-w-[1200px]">
      <div
        class="relative overflow-hidden rounded-[22px] border border-[#E8E8F0] bg-gradient-to-br from-[#F0FAF9] via-white to-primary-50/25 px-8 py-10 shadow-[0_8px_32px_-8px_rgb(28_199_181/0.12)] dark:border-gray-800 dark:from-gray-900 dark:via-gray-950 dark:to-primary-950/20 md:px-12 md:py-12"
      >
        <div
          class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl dark:bg-primary-500/20"
          aria-hidden="true"
        />
        <div class="relative z-[1] flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div class="max-w-xl">
            <span
              v-if="eyebrow"
              class="mb-3 inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500"
            >
              {{ eyebrow }}
            </span>
            <h2
              class="text-[clamp(1.625rem,2.8vw,2.25rem)] font-extrabold leading-[1.12] tracking-[-0.035em] text-[#0A0A0F] dark:text-white"
            >
              {{ title }}
            </h2>
            <p v-if="subtitle" class="mt-3 text-[1.0625rem] leading-[1.75] text-[#3D3D52] dark:text-gray-300">
              {{ subtitle }}
            </p>
          </div>
          <div class="flex flex-shrink-0 flex-wrap gap-3">
            <NuxtLink
              v-for="(btn, i) in buttons"
              :key="i"
              :to="btn.to"
              class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-transparent px-5 py-2.5 text-sm font-medium transition-colors sm:text-base"
              :class="
                btn.variant === 'outline'
                  ? 'border-[#E8E8F0] bg-white text-[#0A0A0F] hover:bg-[#F7F7FB] dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800'
                  : 'bg-primary-500 text-white shadow-[0_1px_2px_0_rgb(15_23_42_/_0.06)] hover:bg-primary-600'
              "
            >
              <UIcon v-if="btn.icon" :name="btn.icon" class="h-5 w-5" />
              {{ btn.label }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string;
    title: string;
    subtitle?: string;
    buttons: Array<{
      label: string;
      to: string;
      icon?: string;
      variant?: 'solid' | 'outline';
    }>;
    outerClass?: string;
  }>(),
  {
    outerClass: 'bg-white dark:bg-gray-950',
  },
);
</script>
