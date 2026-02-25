<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Rendez-vous"
      description="Liste de vos rendez-vous. Créez un rendez-vous pour un patient."
    >
      <template #actions>
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-refresh-cw"
          :loading="listRef?.loading"
          aria-label="Actualiser"
          @click="listRef?.fetchAppointments?.()"
        />
        <UButton
          to="/pro/appointments/new"
          color="primary"
          icon="i-lucide-plus"
        >
          Nouveau rendez-vous
        </UButton>
      </template>
    </TitleDashboard>

    <AppointmentListPage
      ref="listRef"
      base-path="/pro"
      :use-date-filter="false"
      hide-header
    >
      <template #cardActions="{ appointment, basePath }">
        <UButton
          variant="soft"
          color="primary"
          size="xs"
          leading-icon="i-lucide-eye"
          :to="`${basePath}/appointments/${appointment.id}`"
          aria-label="Voir le détail"
        >
          Détails
        </UButton>
      </template>
    </AppointmentListPage>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

const listRef = ref<{ fetchAppointments: () => void; loading?: boolean } | null>(null);
</script>
