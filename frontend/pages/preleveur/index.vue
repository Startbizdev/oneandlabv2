<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Mes rendez-vous"
        description="Toutes vos prises de sang — rendez-vous du laboratoire qui vous concernent."
      />
    </template>

    <AppointmentListPage
      base-path="/preleveur"
      hide-header
      title="Mes rendez-vous"
      subtitle="Liste complète de vos missions (toutes dates confondues)."
      :use-date-filter="false"
      :card-href="(a) => (pendingIncoming(a) ? null : `/preleveur/appointments/${a.id}`)"
      @card-click="(a) => openAppointmentModal(a.id)"
    />

    <DashboardAppointmentListAccessModals list-path="/preleveur" />
  </AppPageShell>
</template>

<script setup lang="ts">
import { isPendingIncomingOffer } from '~/utils/appointment-offer';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'preleveur',
});

const { user } = useAuth();
const { openAppointmentModalById: openAppointmentModal } = useAppointmentModal();

function pendingIncoming(appointment: { status?: string; created_by?: string | null }) {
  return isPendingIncomingOffer(appointment, user.value?.id);
}

useHead({
  title: 'Mes rendez-vous – Préleveur',
});
</script>
