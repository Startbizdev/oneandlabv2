<template>
  <PublicProfileLayout
    :loading="loading"
    :error="error"
    :profile="profile"
    :faq-items="faqToDisplay"
    :address="profile?.address ?? profile?.city_plain ?? null"
    type="pro"
    @review-submitted="fetchProfile"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

const route = useRoute();
const config = useRuntimeConfig();

const profile = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const defaultProFaq = [
  {
    question: 'Comment prendre rendez-vous avec ce professionnel ?',
    answer: 'Depuis sa fiche Cary, vous pouvez lancer une demande de rendez-vous en quelques clics. Le professionnel valide ensuite le créneau avec vous.',
  },
  {
    question: 'Quels types de rendez-vous sont possibles ?',
    answer: 'Selon la profession (médecin, sage-femme, pharmacien, etc.), le professionnel peut vous orienter ou organiser des examens et soins via Cary.',
  },
];

const faqToDisplay = computed(() => defaultProFaq);

const metaLocation = computed(() => {
  const p = profile.value;
  if (!p) return '';
  return (p.address || p.city_plain || '').toString().trim() || '';
});

useHead({
  title: computed(() => {
    if (!profile.value) return 'Professionnel de santé | Cary';
    const name = profile.value.name || '';
    const emploi = profile.value.emploi || 'Professionnel de santé';
    const loc = metaLocation.value;
    if (loc) return `${name} - ${emploi} à ${loc} | Cary`;
    return `${name} - ${emploi} | Cary`;
  }),
  meta: [
    {
      name: 'description',
      content: computed(() => {
        if (!profile.value) return 'Professionnel de santé sur Cary';
        const bio = profile.value.biography ? profile.value.biography.substring(0, 140) : '';
        if (bio) return bio;
        const name = profile.value.name || '';
        const emploi = profile.value.emploi || 'professionnel de santé';
        const loc = metaLocation.value;
        return loc
          ? `${name}, ${emploi} à ${loc}. Prenez rendez-vous sur Cary.`
          : `${name}, ${emploi}. Prenez rendez-vous sur Cary.`;
      }),
    },
  ],
});

const fetchProfile = async () => {
  loading.value = true;
  error.value = null;

  try {
    const slug = route.params.slug as string;
    const base = config.public.apiBase || '/api';
    const apiBase = import.meta.server && (base.startsWith('/') || !base.startsWith('http'))
      ? 'http://127.0.0.1:8888/api'
      : base;
    const url = `${apiBase}/public/pro/${slug}`;

    const response = await $fetch<{ success: boolean; data?: any; redirect?: boolean; new_slug?: string; error?: string }>(url, {
      method: 'GET',
    });

    if (response.redirect && response.new_slug) {
      await navigateTo(`/professionnel/${response.new_slug}`, { redirectCode: 301 });
      return;
    }

    if (response.success && response.data) {
      profile.value = response.data;
    } else {
      error.value = response.error || 'Profil introuvable';
    }
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || 'Impossible de charger ce profil';
  } finally {
    loading.value = false;
  }
};

await fetchProfile();
</script>
