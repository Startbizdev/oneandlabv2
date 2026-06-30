<template>
  <AppPageShell>
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="QR code"
        description="Votre affiche personnalisée pour inviter les patients à prendre rendez-vous"
      />
    </template>
    <QrCodeDashboard />
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' });
</script>
