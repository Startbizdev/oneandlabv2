<template>
  <div>
    <div v-if="showFilters" class="mb-4 flex gap-4">
      <UInput 
        v-model="localSearchQuery" 
        :placeholder="searchPlaceholder" 
        icon="i-lucide-search"
        class="flex-1"
        @update:model-value="$emit('update:searchQuery', localSearchQuery)"
      />
      <USelect 
        v-model="localStatusFilter" 
        :items="statusOptions" 
        placeholder="Statut"
        class="w-48"
        @update:model-value="$emit('update:statusFilter', localStatusFilter)"
      />
      <USelect 
        v-if="showTypeFilter"
        v-model="localTypeFilter" 
        :items="typeOptions" 
        placeholder="Type"
        class="w-48"
        @update:model-value="$emit('update:typeFilter', localTypeFilter)"
      />
    </div>
    
    <UTable 
      :data="rows" 
      :columns="columns" 
      :loading="loading"
      @select="handleSelect"
    >
      <template #empty>
        <div class="py-12">
          <UEmpty
            :icon="emptyIcon"
            :title="emptyTitle"
            :description="emptyDescription"
            :actions="emptyActions"
            variant="naked"
          />
        </div>
      </template>
      <template #patient-data="{ row }">
        <div class="min-w-0">
          <p class="font-medium text-foreground truncate">
            {{ getPatientName(row) }}
          </p>
          <p v-if="getPatientEmail(row)" class="text-xs text-muted truncate">
            {{ getPatientEmail(row) }}
          </p>
        </div>
      </template>
      <template #address-data="{ row }">
        <div class="flex items-start gap-2 max-w-[180px]">
          <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-muted flex-shrink-0 mt-0.5" />
          <p class="text-sm text-muted truncate" :title="getAddressLabel(row)">
            {{ getAddressLabel(row) }}
          </p>
        </div>
      </template>
      <template #scheduled_at-data="{ row }">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-calendar" class="w-4 h-4 text-muted flex-shrink-0" />
          <div>
            <p class="font-medium text-sm">{{ formatDateShort(row.scheduled_at) }}</p>
            <p class="text-xs text-muted">{{ formatTime(row.scheduled_at) }}</p>
          </div>
        </div>
      </template>
      <template #status-data="{ row }">
        <UBadge :color="getStatusColor(row.status)" variant="subtle" size="sm">
          {{ getStatusLabel(row.status) }}
        </UBadge>
      </template>
      <template #type-data="{ row }">
        <div class="flex items-center gap-2">
          <UIcon :name="row.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-heart-pulse'" :class="row.type === 'blood_test' ? 'text-blue-500' : 'text-green-500'" class="w-4 h-4" />
          <UBadge :color="row.type === 'blood_test' ? 'blue' : 'green'" variant="subtle" size="sm">
            {{ row.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
          </UBadge>
        </div>
      </template>
      <template #actions-data="{ row }">
        <div class="flex items-center justify-end gap-1.5">
          <UButton
            v-if="showViewButton"
            size="xs"
            variant="ghost"
            icon="i-lucide-eye"
            :to="getViewUrl(row.id)"
          >
            Voir
          </UButton>
          <UDropdownMenu
            v-if="showActions"
            :items="getActionItems(row)"
          >
            <UButton size="xs" variant="ghost" trailing-icon="i-lucide-chevron-down">
              Actions
            </UButton>
          </UDropdownMenu>
        </div>
      </template>
    </UTable>
    
    <div v-if="showPagination && totalPages > 1" class="mt-4 flex justify-center">
      <UPagination 
        v-model="currentPage" 
        :total="totalPages" 
        :page-size="pageSize"
        @update:model-value="$emit('update:page', currentPage)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  rows: any[];
  columns: any[];
  loading?: boolean;
  showFilters?: boolean;
  showTypeFilter?: boolean;
  showViewButton?: boolean;
  showActions?: boolean;
  showPagination?: boolean;
  searchQuery?: string;
  statusFilter?: string;
  typeFilter?: string;
  viewUrlPrefix?: string;
  totalPages?: number;
  pageSize?: number;
  searchPlaceholder?: string;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActions?: Array<{ label: string; icon?: string; variant?: string; to?: string; onClick?: () => void }>;
  showAssignAction?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showFilters: true,
  showTypeFilter: true,
  showViewButton: true,
  showActions: true,
  showPagination: false,
  totalPages: 1,
  pageSize: 20,
  searchPlaceholder: 'Rechercher par adresse, patient...',
  emptyIcon: 'i-lucide-calendar-x',
  emptyTitle: 'Aucun rendez-vous',
  emptyDescription: "Aucun rendez-vous n'est disponible. Les nouveaux rendez-vous apparaîtront ici.",
  emptyActions: () => [],
});

const emit = defineEmits<{
  'update:searchQuery': [value: string];
  'update:statusFilter': [value: string];
  'update:typeFilter': [value: string];
  'update:page': [value: number];
  'select': [row: any];
  'action': [action: string, row: any];
}>();

const localSearchQuery = ref(props.searchQuery || '');
const localStatusFilter = ref(props.statusFilter || 'all');
const localTypeFilter = ref(props.typeFilter || 'all');
const currentPage = ref(1);

const statusOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmés', value: 'confirmed' },
  { label: 'En cours', value: 'inProgress' },
  { label: 'Terminés', value: 'completed' },
  { label: 'Annulés', value: 'canceled' },
  { label: 'Expirés', value: 'expired' },
  { label: 'Refusés', value: 'refused' },
];

const typeOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'Prise de sang', value: 'blood_test' },
  { label: 'Soins infirmiers', value: 'nursing' },
];

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('fr-FR');
};

const formatDateShort = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
};

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const getPatientName = (row: any) => {
  const fd = row.form_data || {};
  const first = fd.first_name || row.relative_first_name || '';
  const last = fd.last_name || row.relative_last_name || '';
  return `${first} ${last}`.trim() || '—';
};

const getPatientEmail = (row: any) => {
  return row.form_data?.email || row.relative_email || '';
};

const getAddressLabel = (row: any) => {
  const addr = row.address;
  return typeof addr === 'string' ? addr : addr?.label || '—';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'yellow',
    confirmed: 'blue',
    inProgress: 'purple',
    completed: 'green',
    canceled: 'red',
    expired: 'gray',
    refused: 'orange',
  };
  return colors[status] || 'gray';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return labels[status] || status;
};

const getViewUrl = (id: string) => {
  if (props.viewUrlPrefix) {
    return `${props.viewUrlPrefix}/${id}`;
  }
  return `/appointments/${id}`;
};

const handleSelect = (row: any) => {
  emit('select', row);
};

const getActionItems = (row: any) => {
  const items = [];
  
  if (row.status === 'pending') {
    if (props.showAssignAction) {
      items.push({
        label: 'Assigner un préleveur',
        click: () => emit('action', 'assign', row),
      });
    }
    items.push({
      label: 'Confirmer',
      click: () => emit('action', 'confirm', row),
    });
    items.push({
      label: 'Refuser',
      click: () => emit('action', 'refuse', row),
    });
  }
  
  if (row.status === 'confirmed') {
    items.push({
      label: 'Commencer',
      click: () => emit('action', 'start', row),
    });
  }
  
  if (row.status === 'inProgress') {
    items.push({
      label: 'Terminer',
      click: () => emit('action', 'complete', row),
    });
  }
  
  if (row.status !== 'canceled') {
    items.push({
      label: 'Annuler',
      click: () => emit('action', 'cancel', row),
    });
  }
  
  return [items];
};
</script>

