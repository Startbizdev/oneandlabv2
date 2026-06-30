<template>
  <UApp :toaster="appConfig?.toaster" :locale="nuxtUiFr">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { fr as nuxtUiFr } from '@nuxt/ui/locale';

const appConfig = useAppConfig();
const { initAuth } = useAuth();

onMounted(async () => {
  await initAuth();
});
</script>

