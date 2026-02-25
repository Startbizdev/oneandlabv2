<template>
  <div v-if="appointments.length > 0" class="rounded-xl border border-default/50 bg-default overflow-hidden shadow-sm">
    <div class="px-6 py-4 border-b border-default/50">
      <h2 class="text-lg font-semibold text-default flex items-center gap-2">
        <UIcon name="i-lucide-clock" class="w-5 h-5 text-amber-500" />
        Rendez-vous en attente d'acceptation
      </h2>
    </div>
    <div class="p-6 space-y-4">
      <div
        v-for="appointment in appointments"
        :key="appointment.id"
        class="rounded-lg border border-default/50 p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
        @click="$emit('open', appointment)"
      >
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex-1 space-y-2 min-w-0">
            <UBadge
              :color="appointment.type === 'blood_test' ? 'blue' : 'green'"
              variant="subtle"
              size="sm"
            >
              {{ appointment.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
            </UBadge>
            <div class="flex items-center gap-2 text-sm text-muted">
              <UIcon name="i-lucide-calendar" class="w-4 h-4 flex-shrink-0" />
              <span>{{ formatDate(appointment.scheduled_at) }}</span>
            </div>
            <div class="flex items-start gap-2 text-sm text-muted">
              <UIcon name="i-lucide-map-pin" class="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span class="truncate">{{ getAddressLabel(appointment) }}</span>
            </div>
          </div>
          <UButton
            color="primary"
            size="sm"
            icon="i-lucide-check"
            class="flex-shrink-0"
            @click.stop="$emit('open', appointment)"
          >
            Voir détails
          </UButton>
        </div>
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
}

interface Props {
  appointments: AppointmentRow[];
  formatDate: (date: string) => string;
  getAddressLabel: (row: AppointmentRow) => string;
}

defineProps<Props>();

defineEmits<{
  open: [appointment: AppointmentRow];
}>();
</script>
