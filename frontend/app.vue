<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { initAuth } = useAuth();

onMounted(async () => {
  await initAuth();
});
</script>

