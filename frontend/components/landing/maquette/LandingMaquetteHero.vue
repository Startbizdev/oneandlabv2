<template>
  <section
    class="landing-hero-maquette relative overflow-hidden bg-gradient-to-br from-[#F0FAF9] via-white to-[#E8FBF9] dark:from-gray-950 dark:via-gray-950 dark:to-gray-900"
  >
    <div class="landing-hero-maquette-grid pointer-events-none absolute inset-0 z-0" aria-hidden="true" />

    <div
      class="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-15%,rgb(28_199_181/0.12),transparent_55%)] dark:bg-[radial-gradient(ellipse_90%_50%_at_50%_-15%,rgb(28_199_181/0.18),transparent_55%)]"
      aria-hidden="true"
    />

    <div
      class="relative z-[1] mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-12 px-6 pb-20 pt-10 sm:pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20 lg:px-12 lg:pb-28 lg:pt-14"
    >
      <div class="flex flex-col">
        <span
          v-if="eyebrow"
          class="mb-4 inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500"
        >
          {{ eyebrow }}
        </span>

        <h1
          class="mb-6 max-w-[18ch] text-balance text-[clamp(2.5rem,4vw,4rem)] font-extrabold leading-[1.07] tracking-[-0.04em] text-[#0A0A0F] dark:text-white"
        >
          {{ resolvedTitleText }}<template v-if="highlight">{{ ' ' }}<em class="font-light italic text-primary-500">{{ highlight }}</em></template>
        </h1>

        <p
          class="mb-9 max-w-[480px] text-[1.0625rem] leading-[1.78] text-[#3D3D52] dark:text-gray-300"
        >
          {{ description }}
        </p>

        <div class="mb-10 flex flex-wrap items-center gap-3">
          <NuxtLink
            :to="primaryCta.to"
            class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-transparent bg-primary-500 px-5 py-2.5 text-base font-medium text-white shadow-[0_1px_2px_0_rgb(15_23_42_/_0.06)] transition-all hover:bg-primary-600 hover:shadow-[0_2px_6px_-1px_rgb(15_23_42_/_0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500/45"
          >
            <UIcon v-if="primaryCta.icon" :name="primaryCta.icon" class="h-5 w-5" />
            {{ primaryCta.label }}
          </NuxtLink>
          <NuxtLink
            v-if="secondaryCta"
            :to="secondaryCta.to"
            class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#E8E8F0] bg-white px-5 py-2.5 text-base font-medium text-[#0A0A0F] shadow-[0_1px_2px_0_rgb(15_23_42_/_0.04)] transition-colors hover:bg-[#F7F7FB] dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
          >
            <UIcon v-if="secondaryCta.icon" :name="secondaryCta.icon" class="h-5 w-5" />
            {{ secondaryCta.label }}
          </NuxtLink>
        </div>

        <ul
          v-if="!hideStats && resolvedStats.length > 0"
          class="flex flex-col gap-3.5"
          aria-label="Chiffres clés"
        >
          <li
            v-for="(s, i) in resolvedStats"
            :key="i"
            class="flex min-w-0 items-center gap-3 text-left"
          >
            <UIcon name="i-lucide-check" class="h-5 w-5 shrink-0 text-emerald-600" />
            <p
              class="m-0 text-[clamp(0.9375rem,calc(0.35vw+0.88rem),1.0625rem)] font-medium leading-[1.45] tracking-[-0.01em] text-[#3D3D52] dark:text-gray-300"
            >
              <span class="font-extrabold tracking-[-0.03em] text-[#0A0A0F] dark:text-white">
                {{ s.num }}
              </span>
              {{ s.rest }}
            </p>
          </li>
        </ul>
      </div>

      <div class="flex flex-col items-center lg:items-stretch">
        <div class="landing-hero-maquette-figure relative mx-auto w-full max-w-[460px] lg:max-w-none">
          <img
            :src="imageSrc"
            width="800"
            height="1200"
            class="block aspect-[3/4] h-auto w-full object-cover"
            :class="imageObjectClass"
            :alt="imageAlt"
            fetchpriority="high"
          />

          <figure
            v-if="!hideQuote && resolvedQuote"
            class="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-[rgb(8_12_24/0.92)] via-[rgb(8_12_24/0.55)] to-transparent px-6 pb-7 pt-12 sm:px-8"
            :aria-label="resolvedQuote.ariaLabel ?? 'Témoignage'"
          >
            <blockquote class="m-0 max-w-[42ch]">
              <p
                class="mb-2 text-[clamp(0.875rem,1.25vw,0.975rem)] font-medium italic leading-[1.55] text-white"
              >
                « {{ resolvedQuote.text }} »
              </p>
              <figcaption class="text-[0.8125rem] font-medium text-white/80">
                — {{ resolvedQuote.author }}
              </figcaption>
            </blockquote>
          </figure>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface HeroCta {
  label: string;
  to: string;
  icon?: string;
}

interface HeroStat {
  num: string;
  rest: string;
}

interface HeroQuote {
  text: string;
  author: string;
  ariaLabel?: string;
}

const props = withDefaults(
  defineProps<{
    eyebrow?: string;
    titleLines?: string[];
    highlight?: string;
    description?: string;
    primaryCta?: HeroCta;
    secondaryCta?: HeroCta;
    stats?: HeroStat[];
    imageSrc?: string;
    imageAlt?: string;
    imageObjectClass?: string;
    quote?: HeroQuote;
    hideQuote?: boolean;
    /** Masque la liste de stats (utile pages type tarifs). */
    hideStats?: boolean;
  }>(),
  {
    titleLines: () => [],
    highlight: '',
    description: '',
    stats: () => [],
    imageObjectClass: 'object-[center_15%]',
    hideQuote: false,
    hideStats: false,
  },
);

const { appointmentNewUrl } = useAppointmentNewUrl();

const defaultPrimaryCta = computed<HeroCta>(() => ({
  label: 'Réserver une visite',
  to: appointmentNewUrl.value,
}));

const defaultTitleLines = ['Un professionnel', 'de santé chez vous,'];
const defaultHighlight = 'en moins de 2h';
const defaultDescription =
  'Prise de sang, pansement, injection : vous réservez en quelques minutes. Un professionnel vérifié vient chez vous. Sur ordonnance, c’est pris en charge comme en ville.';
const defaultImageSrc = '/images/landing/hero-cary-home-nurse.png';
const defaultImageAlt = 'Infirmier diplômé Cary préparant une visite à domicile';
const defaultStats: HeroStat[] = [
  { num: '+300', rest: ' visites à domicile' },
  { num: '40+', rest: ' infirmiers partenaires' },
  { num: 'Souvent', rest: ' possible le jour même' },
];
const defaultQuote: HeroQuote = {
  text:
    "Un professionnel à l'écoute et d'un grand sérieux. Je me suis senti en totale confiance pour mes soins à domicile.",
  author: 'Marc D., patient',
};

const resolvedTitleLines = computed(() =>
  props.titleLines && props.titleLines.length > 0 ? props.titleLines : defaultTitleLines,
);

const resolvedTitleText = computed(() => resolvedTitleLines.value.join(' '));

const resolvedStats = computed(() => {
  if (props.hideStats) return [];
  return props.stats && props.stats.length > 0 ? props.stats : defaultStats;
});

const primaryCta = computed<HeroCta>(() => props.primaryCta ?? defaultPrimaryCta.value);
const description = computed(() => props.description || defaultDescription);
const highlight = computed(() =>
  props.highlight !== undefined && props.highlight !== '' ? props.highlight : defaultHighlight,
);
const imageSrc = computed(() => props.imageSrc || defaultImageSrc);
const imageAlt = computed(() => props.imageAlt || defaultImageAlt);
const resolvedQuote = computed(() => props.quote ?? defaultQuote);
</script>

<style scoped>
.landing-hero-maquette-grid {
  opacity: 0.5;
  background-image:
    linear-gradient(rgb(47 128 237 / 0.065) 1px, transparent 1px),
    linear-gradient(90deg, rgb(47 128 237 / 0.065) 1px, transparent 1px);
  background-size: 32px 32px;
  background-position: 0 0;
}

:global(.dark) .landing-hero-maquette-grid {
  opacity: 0.22;
  background-image:
    linear-gradient(rgb(148 163 184 / 0.14) 1px, transparent 1px),
    linear-gradient(90deg, rgb(148 163 184 / 0.14) 1px, transparent 1px);
}

.landing-hero-maquette-figure {
  -webkit-mask-image: radial-gradient(
    ellipse 95% 90% at 50% 55%,
    #000 55%,
    rgba(0, 0, 0, 0.4) 85%,
    transparent 100%
  );
  mask-image: radial-gradient(
    ellipse 95% 90% at 50% 55%,
    #000 55%,
    rgba(0, 0, 0, 0.4) 85%,
    transparent 100%
  );
}
</style>
