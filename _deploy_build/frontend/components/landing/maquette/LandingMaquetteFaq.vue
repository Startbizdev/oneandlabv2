<template>
  <section
    :id="anchorId"
    class="scroll-mt-[72px] py-[72px] lg:py-[100px]"
    :class="sectionClass"
  >
    <div class="mx-auto grid max-w-[1200px] items-start gap-12 px-6 lg:grid-cols-[1fr_1.8fr] lg:gap-x-[100px] lg:px-12">
      <div>
        <span
          class="mb-3.5 inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500"
        >
          Questions fréquentes
        </span>
        <h2
          class="mb-4 text-[clamp(1.75rem,2.5vw,2.5rem)] font-extrabold leading-[1.15] tracking-[-0.03em] text-[#0A0A0F] dark:text-white"
        >
          Tout ce que vous devez savoir
        </h2>
        <p class="text-base leading-[1.75] text-[#3D3D52] dark:text-gray-300">
          Une question absente de cette liste ? Notre équipe répond en moins d'une heure, tous les
          jours.
        </p>
        <NuxtLink
          to="/contact"
          class="mt-8 inline-flex min-h-9 items-center gap-2 rounded-md border border-[#E8E8F0] bg-white px-4 py-2 text-sm font-medium text-[#0A0A0F] shadow-[0_1px_2px_0_rgb(15_23_42_/_0.06)] transition-all hover:border-[#9090A8] hover:bg-[#F7F7FB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500/45 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
        >
          Contacter le support
          <UIcon name="i-lucide-arrow-right" class="h-4 w-4" />
        </NuxtLink>
      </div>
      <div class="overflow-hidden rounded-[22px] border border-[#E8E8F0] dark:border-gray-800">
        <div
          v-for="(item, index) in items"
          :key="index"
          class="border-b border-[#E8E8F0] last:border-b-0 dark:border-gray-800"
        >
          <button
            type="button"
            class="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-[0.9375rem] font-semibold transition-colors sm:px-7"
            :class="
              openIndex === index
                ? 'text-primary-500'
                : 'text-[#0A0A0F] hover:bg-[#F7F7FB] dark:text-white dark:hover:bg-gray-800/80'
            "
            :aria-expanded="openIndex === index"
            @click="toggle(index)"
          >
            {{ item.question }}
            <UIcon
              name="i-lucide-plus"
              class="h-[18px] w-[18px] shrink-0 transition-transform duration-300"
              :class="
                openIndex === index
                  ? 'rotate-45 text-primary-500'
                  : 'text-[#9090A8] dark:text-gray-500'
              "
            />
          </button>
          <div
            class="grid transition-[grid-template-rows] duration-300 ease-out"
            :class="openIndex === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
          >
            <div class="overflow-hidden">
              <p
                class="px-6 pb-5 text-[0.9375rem] leading-[1.78] text-[#3D3D52] sm:px-7 dark:text-gray-400"
              >
                {{ item.answer }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    items: Array<{ question: string; answer: string }>;
    anchorId?: string;
    sectionClass?: string;
  }>(),
  {
    anchorId: 'faq',
    sectionClass: '',
  },
);

const openIndex = ref(0);

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? -1 : i;
}

watch(
  () => props.items,
  () => {
    openIndex.value = 0;
  },
  { deep: true },
);
</script>
