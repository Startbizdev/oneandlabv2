<template>
  <div v-if="displayAppointments.length > 0" class="rounded-xl border border-default/50 bg-default overflow-hidden shadow-sm">
    <div class="px-6 py-4 border-b border-default/50 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-default flex items-center gap-2">
        <UIcon name="i-lucide-clock" class="w-5 h-5 text-amber-500" />
        Rendez-vous en attente d'acceptation
      </h2>
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
    <div class="p-3 sm:p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <DashboardAppointmentCard
          v-for="apt in displayAppointments"
          :key="apt.id"
          :appointment="apt"
          :base-path="basePath"
          :categories="categories"
          :format-date-label="formatDateLabel"
          :mask-sensitive="true"
          :on-action="(a) => $emit('open', a)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { mergeBatchRowsForDashboardList } from '~/utils/appointment-batch';
import type { CareCategoryRowMinimal } from '~/utils/care-icons';

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
  basePath: string;
  formatDateLabel: (apt: AppointmentRow) => string;
  categories?: CareCategoryRowMinimal[];
}

const props = defineProps<Props>();

const displayAppointments = computed(() => mergeBatchRowsForDashboardList(props.appointments as any[]));

defineEmits<{
  open: [appointment: AppointmentRow];
}>();
</script>
