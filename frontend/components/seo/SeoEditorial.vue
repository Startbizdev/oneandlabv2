<template>
  <section
    v-if="article"
    class="seo-editorial border-t border-[#E8E8F0] bg-white py-16 sm:py-20 dark:border-gray-800 dark:bg-gray-950"
    aria-label="Informations complémentaires"
  >
    <div class="mx-auto w-full max-w-none px-6 sm:px-10 lg:px-16 xl:px-24">
      <article class="mx-auto max-w-[72rem]">
        <header v-if="showIntro" class="mb-12 max-w-3xl">
          <p class="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500">
            À propos
          </p>
          <h2 class="font-heading text-[clamp(1.75rem,2.5vw,2.25rem)] font-extrabold leading-[1.15] tracking-[-0.03em] text-[#0A0A0F] dark:text-white">
            {{ introTitle }}
          </h2>
        </header>
        <div class="space-y-12">
          <div v-for="(section, index) in article.sections" :key="index" class="max-w-4xl">
            <h2
              class="mb-4 font-heading text-[clamp(1.35rem,2vw,1.75rem)] font-bold leading-snug tracking-[-0.02em] text-[#0A0A0F] dark:text-white"
            >
              {{ section.title }}
            </h2>
            <p
              v-for="(paragraph, pIndex) in section.paragraphs"
              :key="pIndex"
              class="mb-4 text-base leading-[1.8] text-[#3D3D52] last:mb-0 dark:text-gray-300"
            >
              {{ paragraph }}
            </p>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { SeoEditorialArticle } from '~/seo/types'

const props = withDefaults(
  defineProps<{
    article: SeoEditorialArticle | null
    showIntro?: boolean
    introTitle?: string
  }>(),
  {
    showIntro: false,
    introTitle: 'Tout savoir avant de réserver',
  },
)
</script>
