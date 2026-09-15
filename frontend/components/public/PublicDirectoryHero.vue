<template>
  <section class="directory-hero">
    <div class="directory-hero__content">
      <p class="directory-hero__eyebrow">L’annuaire Cary <span>À domicile</span></p>
      <h1>{{ kind === 'nurses' ? 'Un infirmier.' : 'Un laboratoire.' }}<em>Près de chez vous.</em></h1>
      <p class="directory-hero__description">{{ kind === 'nurses' ? 'Découvrez les professionnels et trouvez un contact pour vos soins à domicile.' : 'Découvrez les laboratoires pour organiser votre prise de sang à domicile.' }}</p>
      <form class="directory-search" role="search" @submit.prevent="emit('search', search.trim())">
        <UIcon name="i-lucide-map-pin" class="size-5 shrink-0 text-primary-700" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <label for="directory-city">Dans quelle ville ?</label>
          <input id="directory-city" v-model="search" type="search" placeholder="Ex. Paris, Lyon, Marseille" autocomplete="address-level2" />
        </div>
        <button type="submit" aria-label="Rechercher les professionnels"><UIcon name="i-lucide-arrow-right" class="size-5" /><span class="hidden sm:inline">Rechercher</span></button>
      </form>
      <div class="directory-hero__links">
        <button v-if="city" type="button" @click="search = ''; emit('search', '')">Effacer le filtre « {{ city }} »</button>
        <NuxtLink :to="appointmentUrl">Vous préférez réserver directement ? <span>Prendre rendez-vous →</span></NuxtLink>
      </div>
    </div>
    <div class="directory-hero__visual" aria-hidden="true">
      <div class="directory-orbit directory-orbit--outer" /><div class="directory-orbit directory-orbit--inner" />
      <span class="directory-marker"><UIcon :name="kind === 'nurses' ? 'i-lucide-stethoscope' : 'i-lucide-droplet'" /></span>
      <span class="directory-dot directory-dot--one" /><span class="directory-dot directory-dot--two" />
      <p>Le bon contact.<br /><strong>Au plus près de vous.</strong></p>
    </div>
  </section>
</template>
<script setup lang="ts">
defineProps<{ kind: 'nurses' | 'labs'; city: string; appointmentUrl: string }>();
const emit = defineEmits<{ search: [city: string] }>();
const search = ref('');
</script>
<style scoped>
.directory-hero { display: grid; grid-template-columns: minmax(0,1.4fr) minmax(0,1fr); align-items: center; gap: 60px; padding: 64px max(24px,calc((100vw - 1120px)/2)); background: #f7faf6; color: #123d36; }
.directory-hero__eyebrow { display: flex; align-items: center; gap: 14px; font-size: 12px; font-weight: 600; margin-bottom: 24px; }
.directory-hero__eyebrow span { padding: 5px 10px; border-radius: 20px; border: 1px solid #ccdcd1; }
.directory-hero h1 { font-size: clamp(36px,4.4vw,64px); line-height: 1.07; letter-spacing: -.05em; font-weight: 600; text-wrap: balance; }
.directory-hero h1 em { display: block; font-style: normal; color: #168577; }
.directory-hero__description { max-width: 48ch; margin: 24px 0; color: #526461; font-size: 15px; line-height: 1.65; }
.directory-search { display: flex; align-items: center; gap: 14px; padding: 10px 10px 10px 20px; background: white; border: 1px solid #cbdad3; border-radius: 18px; box-shadow: 0 8px 30px #123d3607; }
.directory-search:focus-within { border-color: #168577; outline: 2px solid #16857733; }
.directory-search label { display: block; font-size: 11px; font-weight: 600; }
.directory-search input { width: 100%; min-height: 32px; font-size: 14px; outline: none; color: #123d36; background: transparent; }
.directory-search button { display: flex; gap: 8px; align-items: center; justify-content: center; min-height: 48px; min-width: 48px; padding: 12px; border-radius: 12px; background: #1cc7b5; color: #082f2b; font-size: 13px; font-weight: 600; }
.directory-hero__links { display: grid; gap: 8px; margin-top: 16px; font-size: 12px; color: #526461; }
.directory-hero__links a, .directory-hero__links button { min-height: 44px; display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px; text-align: left; }
.directory-hero__links span { color: #12675e; font-weight: 600; }
.directory-hero button:focus-visible, .directory-hero a:focus-visible { outline: 2px solid #168577; outline-offset: 4px; }
.directory-hero__visual { position: relative; aspect-ratio: 1; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 42px; background: #e5f2e9; border-radius: 50% 50% 24px 24px; overflow: hidden; }
.directory-orbit { position: absolute; top: 42%; left: 50%; border: 1px solid #b8d4c7; border-radius: 50%; transform: translate(-50%,-50%); }
.directory-orbit--outer { width: 80%; height: 80%; }.directory-orbit--inner { width: 52%; height: 52%; }
.directory-marker { position: absolute; top: 28%; display: grid; place-items: center; width: 84px; height: 84px; background: #123d36; color: #70e0c4; border-radius: 24px 24px 24px 4px; transform: rotate(-45deg); box-shadow: -10px 14px 30px #123d3615; }
.directory-marker > span { width: 36px; height: 36px; transform: rotate(45deg); }
.directory-dot { position: absolute; width: 13px; height: 13px; border: 3px solid #f7faf6; border-radius: 50%; background: #168577; }.directory-dot--one { top: 26%; left: 13%; }.directory-dot--two { top: 53%; right: 17%; }
.directory-hero__visual p { position: relative; padding: 12px 18px; text-align: center; font-size: 18px; line-height: 1.35; background: #e5f2e9; }.directory-hero__visual strong { font-weight: 600; }
:global(.dark) .directory-hero { background: #101d1b; color: #eff9f5; }:global(.dark) .directory-hero__description, :global(.dark) .directory-hero__links { color: #b0c5be; }:global(.dark) .directory-hero h1 em, :global(.dark) .directory-hero__links span { color: #70e0c4; }
@media(max-width: 767px) { .directory-hero { grid-template-columns: 1fr; gap: 0; padding: 36px 20px 24px; }.directory-hero__visual { display: none; }.directory-hero__eyebrow { margin-bottom: 20px; }.directory-search { padding-left: 12px; gap: 10px; } }
</style>
