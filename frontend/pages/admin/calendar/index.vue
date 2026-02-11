<template>
  <div class="space-y-6">
    <TitleDashboard title="Calendrier" description="Vue d'ensemble de tous les rendez-vous de la plateforme.">
      <template #actions>
        <UButton
          variant="outline"
          color="neutral"
          size="sm"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          aria-label="Actualiser"
          @click="fetchAppointments()"
        >
          Actualiser
        </UButton>
        <UButton
          to="/admin/appointments/new"
          color="primary"
          size="sm"
          icon="i-lucide-plus"
        >
          Nouveau rendez-vous
        </UButton>
      </template>
    </TitleDashboard>

    <CalendarPage
      base-path="/admin"
      :show-search="true"
      :show-type-filter="true"
      hide-header-actions
    />
  </div>
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
