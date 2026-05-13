<template>
  <section class="px-6 pb-12 pt-[clamp(96px,calc(72px+4dvh),140px)] lg:px-12">
    <div class="mx-auto max-w-[1200px]">
      <div
        class="overflow-hidden rounded-[22px] border border-[#E8E8F0] bg-white/80 shadow-[0_4px_24px_-6px_rgb(15_23_42/0.08)] backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/55"
      >
        <div
          class="grid gap-10 p-8 md:gap-12 md:p-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:p-12"
        >
          <div>
            <span
              v-if="eyebrow"
              class="mb-4 inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500"
            >
              {{ eyebrow }}
            </span>
            <h1
              class="text-[clamp(2rem,3.5vw,3.25rem)] font-extrabold leading-[1.08] tracking-[-0.04em] text-[#0A0A0F] dark:text-white"
            >
              <span v-for="(line, i) in resolvedTitleLines" :key="i">
                {{ line }}<br v-if="i < resolvedTitleLines.length - 1" />
              </span>
            </h1>
            <p
              v-if="highlight"
              class="mt-3 text-lg font-medium italic text-primary-500 dark:text-primary-400"
            >
              {{ highlight }}
            </p>
            <p
              class="mt-5 max-w-[540px] text-[1.0625rem] leading-[1.78] text-[#3D3D52] dark:text-gray-300"
            >
              {{ description }}
            </p>
            <div v-if="primaryCta || secondaryCta" class="mt-8 flex flex-wrap items-center gap-3">
              <NuxtLink
                v-if="primaryCta"
                :to="primaryCta.to"
                class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-transparent bg-primary-500 px-5 py-2.5 text-base font-medium text-white shadow-[0_1px_2px_0_rgb(15_23_42_/_0.06)] transition-all hover:bg-primary-600"
              >
                <UIcon v-if="primaryCta.icon" :name="primaryCta.icon" class="h-5 w-5" />
                {{ primaryCta.label }}
              </NuxtLink>
              <NuxtLink
                v-if="secondaryCta"
                :to="secondaryCta.to"
                class="inline-flex min-h-10 items-center justify-center rounded-md border border-[#E8E8F0] bg-white px-5 py-2.5 text-sm font-medium text-[#0A0A0F] shadow-sm transition-colors hover:bg-[#F7F7FB] dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
              >
                {{ secondaryCta.label }}
              </NuxtLink>
            </div>
          </div>

          <div
            v-if="imageSrc"
            class="relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#F7F7FB] to-[#EEF3FC] dark:from-gray-800/80 dark:to-gray-900 lg:min-h-[280px]"
            :class="visual === 'photo' ? 'p-0' : 'p-8'"
          >
            <img
              v-if="visual === 'photo'"
              :src="imageSrc"
              :alt="imageAlt || ''"
              class="h-full min-h-[220px] w-full object-cover object-center lg:min-h-[300px]"
              loading="eager"
            />
            <img
              v-else
              :src="imageSrc"
              :alt="imageAlt || ''"
              class="max-h-[260px] w-full max-w-md object-contain object-center"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    eyebrow?: string;
    title?: string;
    titleLines?: string[];
    highlight?: string;
    description: string;
    imageSrc?: string;
    imageAlt?: string;
    visual?: 'illustration' | 'photo';
    primaryCta?: { label: string; to: string; icon?: string };
    secondaryCta?: { label: string; to: string };
  }>(),
  {
    title: '',
    titleLines: () => [],
    visual: 'illustration',
  },
);

const resolvedTitleLines = computed(() =>
  props.titleLines?.length ? props.titleLines : props.title ? [props.title] : [],
);
</script>
