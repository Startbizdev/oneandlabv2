<template>
  <section class="public-hero" :class="{ 'public-hero--compact': compact }">
    <div class="public-hero__intro">
      <p class="public-hero__eyebrow"><span aria-hidden="true" />{{ eyebrow || journey.label }}</p>
      <h1>{{ resolvedTitleText }}<em v-if="highlight">{{ highlight }}</em></h1>
      <p class="public-hero__description">{{ description }}</p>
      <div class="public-hero__actions">
        <NuxtLink :to="primaryCta.to" class="public-hero__primary">
          {{ primaryCta.label }}<UIcon name="i-lucide-arrow-up-right" class="size-5 shrink-0" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink v-if="secondaryCta" :to="secondaryCta.to" class="public-hero__secondary">
          {{ secondaryCta.label }}<UIcon name="i-lucide-arrow-right" class="size-4 shrink-0" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>

    <div v-if="!compact" class="public-hero__stage">
      <div class="public-hero__journey">
        <span class="public-hero__wordmark" aria-hidden="true">Cary</span>
        <h2>{{ journey.title }}</h2>
        <ol>
          <li v-for="(step, index) in journey.steps" :key="step"><span>{{ String(index + 1).padStart(2, '0') }}</span>{{ step }}</li>
        </ol>
      </div>
      <div class="public-hero__photo">
        <img :src="imageSrc" :alt="imageAlt" :class="imageObjectClass" width="1200" height="800" fetchpriority="high" />
        <figure v-if="!hideQuote && resolvedQuote" class="public-hero__quote">
          <blockquote>« {{ resolvedQuote.text }} »</blockquote>
          <figcaption>{{ resolvedQuote.author }}</figcaption>
        </figure>
      </div>
    </div>

    <ul v-if="resolvedStats.length" class="public-hero__benefits" aria-label="Les avantages Cary">
      <li v-for="(stat, index) in resolvedStats" :key="index"><strong>{{ stat.num }}</strong><span>{{ stat.rest.trim() }}</span></li>
    </ul>
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
    audience?: 'home' | 'patients' | 'nurses' | 'labs' | 'professionals' | 'contact';
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
    compact?: boolean;
  }>(),
  {
    audience: 'home',
    titleLines: () => [],
    highlight: '',
    description: '',
    stats: () => [],
    imageObjectClass: 'object-[center_15%]',
    hideQuote: true,
    hideStats: false,
  },
);

const { appointmentNewUrl } = useAppointmentNewUrl();

const defaultPrimaryCta = computed<HeroCta>(() => ({
  label: 'Prendre rendez-vous',
  to: appointmentNewUrl.value,
}));

const defaultTitleLines = ['Les soins viennent'];
const defaultHighlight = 'à vous.';
const defaultDescription =
  'Prise de sang, pansement, injection : demandez vos soins à domicile et suivez votre rendez-vous dans un seul espace.';
const defaultImageSrc = '/images/landing/hero-cary-home-nurse.png';
const defaultImageAlt = 'Infirmier diplômé Cary préparant une visite à domicile';
const defaultStats: HeroStat[] = [
  { num: 'Plusieurs soins', rest: ' en une demande' },
  { num: 'Des professionnels', rest: ' dans votre secteur' },
  { num: 'Vos documents', rest: ' au même endroit' },
];

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
const resolvedQuote = computed(() => props.quote);
const journeys = {
  home: { label: 'Votre santé, à domicile', title: 'Un seul endroit. Du soin au suivi.', steps: ['Choisissez vos soins', 'Proposez vos disponibilités', 'Retrouvez votre suivi'] },
  patients: { label: 'Pour vous et vos proches', title: 'Le soin commence chez vous.', steps: ['Une demande pour vos soins', 'Des disponibilités à proposer', 'Vos documents à retrouver'] },
  nurses: { label: 'Votre activité, votre rythme', title: 'Une tournée qui vous ressemble.', steps: ['Définissez votre secteur', 'Choisissez vos demandes', 'Organisez vos visites'] },
  labs: { label: 'Du laboratoire au domicile', title: 'Toute votre équipe au même endroit.', steps: ['Centralisez les demandes', 'Affectez vos préleveurs', 'Suivez les rendez-vous'] },
  professionals: { label: 'La continuité des soins', title: 'Gardez le lien après la consultation.', steps: ['Orientez vos patients', 'Organisez leurs soins', 'Suivez les patients liés'] },
  contact: { label: 'Parlons de votre besoin', title: 'Un contact, le bon interlocuteur.', steps: ['Choisissez votre sujet', 'Décrivez votre demande', 'Retrouvez notre réponse par email'] },
};
const journey = computed(() => journeys[props.audience]);
</script>

<style scoped>
.public-hero { --hero-ink: #112e2b; --hero-muted: #526461; padding: 60px 24px 0; background: #fafbf8; color: var(--hero-ink); }
.public-hero__intro { max-width: 1000px; margin: 0 auto; text-align: center; }
.public-hero__eyebrow { display: inline-flex; align-items: center; gap: 9px; margin: 0 0 24px; font-size: 12px; font-weight: 600; letter-spacing: .04em; }
.public-hero__eyebrow > span { width: 7px; height: 7px; border-radius: 50%; background: #1cc7b5; }
.public-hero h1 { margin: 0; font-size: clamp(40px, 5.4vw, 76px); font-weight: 600; line-height: 1.04; letter-spacing: -.055em; text-wrap: balance; overflow-wrap: anywhere; }
.public-hero h1 em { display: block; font-style: normal; color: #168577; }
.public-hero__description { max-width: 54ch; margin: 24px auto 0; font-size: 16px; line-height: 1.65; color: var(--hero-muted); text-wrap: pretty; }
.public-hero__actions { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 12px 24px; margin: 28px 0 40px; }
.public-hero__primary, .public-hero__secondary { display: inline-flex; min-height: 52px; align-items: center; justify-content: center; gap: 16px; padding: 14px 22px; border-radius: 14px; font-size: 14px; font-weight: 600; transition: background-color 150ms; }
.public-hero__primary { background: #1cc7b5; color: #082f2b; }
.public-hero__primary:hover { background: #19b8a7; }
.public-hero__secondary { padding-inline: 6px; }
.public-hero__secondary:hover { background: #eaf2ed; }
.public-hero a:focus-visible { outline: 2px solid #168577; outline-offset: 5px; }
.public-hero__stage { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); max-width: 1120px; min-height: 320px; margin: 0 auto; border-radius: 24px; overflow: hidden; background: #123d36; }
.public-hero__journey { display: flex; flex-direction: column; align-items: flex-start; padding: 30px 36px; color: #f5fbf8; }
.public-hero__wordmark { font-size: 23px; letter-spacing: -.05em; font-weight: 600; color: #70e0c4; }
.public-hero__wordmark > span { margin-left: 3px; font-size: 11px; vertical-align: top; }
.public-hero__journey h2 { max-width: 18ch; margin: 22px 0 24px; font-size: clamp(23px, 2.3vw, 30px); font-weight: 500; letter-spacing: -.035em; line-height: 1.16; text-wrap: balance; }
.public-hero__journey ol { display: grid; gap: 12px; margin: auto 0 0; padding: 0; list-style: none; }
.public-hero__journey li { display: flex; align-items: baseline; gap: 14px; font-size: 13px; line-height: 1.4; }
.public-hero__journey li > span { font-size: 11px; font-variant-numeric: tabular-nums; color: #70e0c4; }
.public-hero__photo { position: relative; min-width: 0; min-height: 320px; }
.public-hero__photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.public-hero__quote { position: absolute; inset: auto 20px 20px; padding: 20px; border-radius: 12px; background: #112e2bef; color: white; font-size: 14px; }
.public-hero__quote figcaption { margin-top: 8px; font-size: 12px; }
.public-hero__benefits { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 1120px; margin: 0 auto; padding: 28px 0; list-style: none; }
.public-hero__benefits li { display: flex; flex-direction: column; gap: 4px; padding: 0 24px; text-align: center; font-size: 12px; line-height: 1.5; color: var(--hero-muted); }
.public-hero__benefits li + li { border-left: 1px solid #dbe4de; }
.public-hero__benefits strong { color: var(--hero-ink); font-size: 14px; font-weight: 600; }
.public-hero--compact { padding-bottom: 20px; border-bottom: 1px solid #dbe4de; }
:global(.dark) .public-hero { --hero-ink: #eff9f5; --hero-muted: #b0c5be; background: #101d1b; }
:global(.dark) .public-hero h1 em { color: #70e0c4; }
:global(.dark) .public-hero__secondary:hover { background: #203e35; }
@media (max-width: 640px) {
  .public-hero { padding: 32px 20px 0; }
  .public-hero__eyebrow { margin-bottom: 18px; font-size: 11px; }
  .public-hero h1 { font-size: clamp(36px, 9.5vw, 54px); }
  .public-hero__description { margin-top: 20px; font-size: 14px; }
  .public-hero__actions { margin: 24px 0 28px; gap: 6px; flex-direction: column; align-items: stretch; }
  .public-hero__stage { grid-template-columns: 1fr; border-radius: 20px; }
  .public-hero__journey { padding: 24px; }
  .public-hero__wordmark { display: none; }
  .public-hero__journey h2 { max-width: 22ch; margin: 0 0 20px; }
  .public-hero__journey ol { gap: 10px; }
  .public-hero__photo { min-height: 180px; }
  .public-hero__benefits { gap: 18px; grid-template-columns: 1fr; padding: 24px 0; }
  .public-hero__benefits li { flex-direction: row; justify-content: center; flex-wrap: wrap; gap: 4px; padding: 0; }
  .public-hero__benefits li + li { border-left: 0; }
  .public-hero__benefits strong { font-size: 12px; }
  .public-hero--compact { padding-bottom: 8px; }
}
</style>
