<template>
  <AppPageShell class="space-y-3">
    <template #pageHeader>
    <AppPageHeader :edge-bleed="false" title="Mes demandes" compact>
      <template #description>
        <span class="text-sm text-gray-500 dark:text-gray-400">
          Soins à accepter ou refuser — mise à jour automatique.
        </span>
      </template>
    </AppPageHeader>
  </template>

    <AppointmentListPage
      ref="listRef"
      base-path="/nurse"
      hide-header
      title="Mes demandes"
      subtitle="Soins proposés"
      nurse-locked-segment="en_attente"
      nurse-compact-cards
      :status-filter-api="'pending'"
      @card-click="(a) => openAppointmentModal(a.id)"
    />
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

const { openAppointmentModalById: openAppointmentModal } = useAppointmentModal();
const listRef = ref<{ fetchAppointments: () => void; loading?: boolean } | null>(null);
</script>
