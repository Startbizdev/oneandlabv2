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
    <div class="p-6">
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
      <UTable
        v-else
        :data="appointments"
        :columns="columns"
      >
        <template #type-data="{ row }">
          <UBadge :color="row.type === 'blood_test' ? 'blue' : 'green'" variant="subtle" size="sm">
            {{ row.type === 'blood_test' ? 'Prise de sang' : 'Soins' }}
          </UBadge>
        </template>
        <template #scheduled_at-data="{ row }">
          {{ formatTime(row.scheduled_at) }}
        </template>
        <template #address-data="{ row }">
          <span class="text-sm text-muted truncate max-w-[200px] block" :title="getAddressLabel(row)">
            {{ getAddressLabel(row) }}
          </span>
        </template>
        <template #status-data="{ row }">
          <UBadge :color="getStatusColor(row.status)" variant="subtle" size="sm">
            {{ getStatusLabel(row.status) }}
          </UBadge>
        </template>
        <template #actions-data="{ row }">
          <UButton size="sm" variant="ghost" :to="`${basePath}/appointments/${row.id}`">
            Voir
          </UButton>
        </template>
      </UTable>
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
  loading?: boolean;
  basePath: string;
  formatTime: (date: string) => string;
  getAddressLabel: (row: AppointmentRow) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

defineProps<Props>();

const columns = [
  { id: 'type', accessorKey: 'type', header: 'Type' },
  { id: 'scheduled_at', accessorKey: 'scheduled_at', header: 'Heure' },
  { id: 'address', accessorKey: 'address', header: 'Adresse' },
  { id: 'status', accessorKey: 'status', header: 'Statut' },
  { id: 'actions', accessorKey: 'actions', header: '' },
];
</script>
