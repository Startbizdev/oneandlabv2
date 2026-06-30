<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Mes missions assignées"
        description="Prises de sang — rendez-vous qui vous sont assignés."
      />
    </template>
    <AppointmentListPage
      base-path="/preleveur"
      hide-header
      title="Mes missions assignées"
      subtitle="Prises de sang — rendez-vous qui vous sont assignés."
      :use-date-filter="false"
    />

    <DashboardAppointmentListAccessModals list-path="/preleveur/appointments" />
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'preleveur',
});

useHead({
  title: 'Mes missions – Préleveur',
});
</script>
