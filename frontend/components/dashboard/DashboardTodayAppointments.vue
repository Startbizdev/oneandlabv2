<template>
  <div class="rounded-xl border border-default/50 bg-default overflow-hidden shadow-sm">
    <div class="px-6 py-4 border-b border-default/50 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-default">Rendez-vous d'aujourd'hui</h2>
      <UButton
        v-if="basePath"
        variant="ghost"
        size="sm"
        :to="`${basePath}/appointments`"
        trailing-icon="i-lucide-arrow-right"
      >
        Voir tout
      </UButton>
    </div>
    <div class="p-4 sm:p-6">
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
      </div>
      <template v-else-if="appointments.length === 0">
        <div class="text-center py-10">
          <UIcon name="i-lucide-calendar" class="w-12 h-12 text-muted mx-auto mb-3" />
          <p class="font-medium text-default">Aucun rendez-vous aujourd'hui</p>
          <p class="text-sm text-muted mt-1">Les rendez-vous du jour apparaîtront ici.</p>
        </div>
      </template>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <DashboardAppointmentCard
          v-for="apt in appointments"
          :key="apt.id"
          :appointment="apt"
          :base-path="basePath"
          :format-date-label="formatDateLabel"
          :mask-sensitive="false"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface AppointmentRow {
  id: string;
  type: string;
  scheduled_at?: string;
  address?: string | { label?: string };
  status: string;
  form_data?: any;
  category_name?: string;
}

interface Props {
  appointments: AppointmentRow[];
  loading?: boolean;
  basePath: string;
  formatDateLabel: (apt: AppointmentRow) => string;
}

defineProps<Props>();
</script>
