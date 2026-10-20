<template>
  <UApp :toaster="appConfig?.toaster" :locale="nuxtUiFr">
    <AppDownloadBanner />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { fr as nuxtUiFr } from '@nuxt/ui/locale';
import { smartAppBannerContent } from '~/utils/app-banner';

const appConfig = useAppConfig();
const { initAuth } = useAuth();
const route = useRoute();
const config = useRuntimeConfig();

// Smart App Banner native de Safari iOS : l'argument est l'URL courante (lien universel).
useHead({
  meta: [
    {
      key: 'apple-itunes-app',
      name: 'apple-itunes-app',
      content: computed(() => smartAppBannerContent(String(config.public.siteUrl || 'https://cary.bio'), route.fullPath)),
    },
  ],
});

onMounted(async () => {
  await initAuth();
});
</script>
