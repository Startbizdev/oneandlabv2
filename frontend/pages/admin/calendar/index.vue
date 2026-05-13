<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
    <AppPageHeader :edge-bleed="false" title="Calendrier" description="Vue d'ensemble de tous les rendez-vous de la plateforme.">
      <template #actions>
        <UButton
          to="/admin/appointments/new"
          color="primary"
          size="sm"
          icon="i-lucide-plus"
        >
          Nouveau rendez-vous
        </UButton>
      </template>
    </AppPageHeader>
  </template>

    <CalendarPage
      base-path="/admin"
      :show-search="true"
      :show-type-filter="true"
      hide-header-actions
    />
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

useHead({
  title: 'Calendrier – Administration',
});

const { loading, fetchAppointments } = useAppointments();
</script>
