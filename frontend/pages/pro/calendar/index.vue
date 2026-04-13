<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Calendrier"
      description="Vue d'ensemble de vos rendez-vous."
    >
      <template #actions>
        <UButton
          to="/pro/appointments/new"
          color="primary"
          icon="i-lucide-plus"
        >
          Nouveau rendez-vous
        </UButton>
      </template>
    </TitleDashboard>
    <CalendarPage
      base-path="/pro"
      hide-header-actions
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

useHead({
  title: 'Calendrier – Professionnel',
});

const { loading, fetchAppointments } = useAppointments();
</script>
