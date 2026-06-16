<template>
  <AppPageShell>
    <template #pageHeader>
      <AppPageHeader :edge-bleed="false" title="QR code" description="Affiche et statistiques de votre QR code Cary" />
    </template>
    <QrCodeDashboard />
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' });
</script>
