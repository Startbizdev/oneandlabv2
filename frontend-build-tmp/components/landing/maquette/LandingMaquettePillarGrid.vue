<template>
  <section class="py-[72px] lg:py-[100px]" :class="sectionClass">
    <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
      <div class="mb-12 max-w-[720px]">
        <span
          v-if="eyebrow"
          class="mb-3 inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500"
        >
          {{ eyebrow }}
        </span>
        <h2
          class="text-[clamp(1.75rem,2.5vw,2.5rem)] font-extrabold leading-[1.12] tracking-[-0.035em] text-[#0A0A0F] dark:text-white"
        >
          {{ title }}
        </h2>
        <p v-if="subtitle" class="mt-3 text-[1.0625rem] leading-relaxed text-[#3D3D52] dark:text-gray-300">
          {{ subtitle }}
        </p>
      </div>
      <div
        class="grid gap-5"
        :class="{
          'sm:grid-cols-2 lg:grid-cols-4': columns === 4,
          'sm:grid-cols-2 lg:grid-cols-3': columns === 3,
          'sm:grid-cols-2': columns === 2,
        }"
      >
        <article
          v-for="(item, i) in items"
          :key="i"
          class="rounded-[22px] border border-[#E8E8F0] bg-white p-7 transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(15,23,42,0.07)] dark:border-gray-800 dark:bg-gray-900"
        >
          <div
            class="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E8E8F0] bg-[#F7F7FB] text-primary-500 dark:border-gray-700 dark:bg-gray-800"
          >
            <UIcon :name="item.icon" class="h-5 w-5" />
          </div>
          <h3 class="mb-2 text-base font-bold tracking-[-0.02em] text-[#0A0A0F] dark:text-white">
            {{ item.title }}
          </h3>
          <p class="text-sm leading-relaxed text-[#3D3D52] dark:text-gray-400">
            {{ item.description }}
          </p>
        </article>
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
    items: { icon: string; title: string; description: string }[];
    columns?: 2 | 3 | 4;
    sectionClass?: string;
  }>(),
  {
    columns: 3,
    sectionClass: 'bg-white dark:bg-gray-950',
  },
);
</script>
