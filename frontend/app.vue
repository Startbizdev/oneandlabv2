<template>
  <UApp :toaster="appConfig?.toaster">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const appConfig = useAppConfig();
const { initAuth } = useAuth();

onMounted(async () => {
  await initAuth();
});
</script>

