<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Dispatch"
        description="Vue 360° du dispatch : créateurs, offres, redispatch, partages lien et acceptations."
      >
        <template #actions>
          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-refresh-cw"
            :loading="loading"
            aria-label="Actualiser"
            @click="reload"
          />
        </template>
      </AppPageHeader>
    </template>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :title="error"
    />

    <!-- KPIs -->
    <div v-if="dashboardData?.kpis" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-default/50 bg-default p-4 shadow-sm">
        <p class="text-xs text-muted">En attente dispatch</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ dashboardData.kpis.pending_dispatch }}</p>
      </div>
      <div class="rounded-xl border border-default/50 bg-default p-4 shadow-sm">
        <p class="text-xs text-muted">Redispatch 24h</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ dashboardData.kpis.redispatch_24h }}</p>
      </div>
      <div class="rounded-xl border border-default/50 bg-default p-4 shadow-sm">
        <p class="text-xs text-muted">Invites / partages 7j</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ dashboardData.kpis.external_invites_7d }}</p>
      </div>
      <div class="rounded-xl border border-default/50 bg-default p-4 shadow-sm">
        <p class="text-xs text-muted">Délai médian acceptation</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">
          {{ dashboardData.kpis.median_accept_minutes != null ? `${dashboardData.kpis.median_accept_minutes} min` : '—' }}
        </p>
      </div>
    </div>

    <!-- Filtres -->
    <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <USelect
        v-model="filters.type"
        :items="typeOptions"
        value-key="value"
        placeholder="Type"
        class="w-full sm:w-40"
      />
      <USelect
        v-model="filters.status"
        :items="statusOptions"
        value-key="value"
        placeholder="Statut"
        class="w-full sm:w-40"
      />
      <USelect
        v-model="filters.dispatch_mode"
        :items="dispatchModeOptions"
        value-key="value"
        placeholder="Mode dispatch"
        class="w-full sm:w-44"
      />
      <UInput v-model="filters.date_from" type="date" class="w-full sm:w-36" placeholder="Date début" />
      <UInput v-model="filters.date_to" type="date" class="w-full sm:w-36" placeholder="Date fin" />
      <UInput
        v-model="filters.search"
        placeholder="ID patient, créateur…"
        class="min-w-32 flex-1"
        icon="i-lucide-search"
      />
      <UButton variant="outline" size="sm" @click="clearFilters">Effacer</UButton>
    </div>

    <!-- Tableau -->
    <div class="overflow-hidden rounded-xl border border-default/50 bg-default shadow-sm">
      <UTable :data="tableRows" :columns="columns" :loading="loading" class="text-sm">
        <template #patient-data="{ row }">
          <div class="min-w-[140px]">
            <p class="font-medium truncate">{{ row.patient_display_name || '—' }}</p>
            <p class="text-xs text-muted">{{ formatDateOnly(row.scheduled_at) }}<span v-if="row.creneau"> · {{ row.creneau }}</span></p>
          </div>
        </template>
        <template #type-data="{ row }">
          <UBadge :color="row.type === 'blood_test' ? 'error' : 'info'" variant="soft" size="xs">
            {{ row.type === 'blood_test' ? 'Prélèvement' : 'Soins' }}
          </UBadge>
        </template>
        <template #creator-data="{ row }">
          <div class="max-w-[160px] truncate">
            <span class="text-xs text-muted">{{ roleLabel(row.created_by_role) }}</span>
            <p class="truncate">{{ row.created_by_display_name || '—' }}</p>
          </div>
        </template>
        <template #dispatch_mode-data="{ row }">
          <UBadge variant="subtle" size="xs">{{ dispatchModeLabel(row.dispatch_mode) }}</UBadge>
          <UBadge v-if="row.has_redispatch" color="warning" variant="soft" size="xs" class="ml-1">Redispatch</UBadge>
        </template>
        <template #offers-data="{ row }">
          <span class="tabular-nums">{{ row.pending_offers_count }}</span>
          <span v-if="row.last_event_at" class="block text-xs text-muted">{{ formatDateShort(row.last_event_at) }}</span>
        </template>
        <template #assigned-data="{ row }">
          <p class="max-w-[140px] truncate text-xs">
            {{ assignedSummary(row) }}
          </p>
        </template>
        <template #status-data="{ row }">
          <UBadge :color="statusColor(row.status)" variant="soft" size="xs">{{ statusLabel(row.status) }}</UBadge>
        </template>
        <template #actions-data="{ row }">
          <UButton size="xs" variant="outline" @click="openDetail(row.id)">Voir 360°</UButton>
        </template>
      </UTable>
    </div>

    <div v-if="pagination.total_pages > 1" class="flex items-center justify-between gap-4">
      <p class="text-sm text-muted">
        Page {{ pagination.page }} / {{ pagination.total_pages }} ({{ pagination.total }} RDV)
      </p>
      <div class="flex gap-2">
        <UButton size="sm" variant="outline" :disabled="pagination.page <= 1" @click="goPage(pagination.page - 1)">
          Précédent
        </UButton>
        <UButton
          size="sm"
          variant="outline"
          :disabled="pagination.page >= pagination.total_pages"
          @click="goPage(pagination.page + 1)"
        >
          Suivant
        </UButton>
      </div>
    </div>

    <!-- Détail 360° -->
    <USlideover
      v-model:open="detailOpen"
      :title="detailTitle"
      description="Historique complet du dispatch pour ce rendez-vous."
      :ui="{ width: 'max-w-2xl', body: 'space-y-4 overflow-y-auto' }"
      @update:open="onDetailOpenChange"
    >
      <template #body>
        <div v-if="detailLoading" class="py-12 text-center text-muted">Chargement…</div>
        <UAlert
          v-else-if="detailError"
          color="error"
          variant="subtle"
          :title="detailError"
        />
        <template v-else-if="detailData">
          <UAlert
            v-if="detailData.history_incomplete"
            color="warning"
            variant="subtle"
            icon="i-lucide-info"
            :title="detailData.history_incomplete_message || 'Historique partiel'"
          />
          <div class="flex flex-wrap gap-2">
            <UButton
              color="primary"
              size="sm"
              icon="i-lucide-external-link"
              :to="`/admin/appointments/${detailData.identity.appointment_id}`"
            >
              Ouvrir le RDV
            </UButton>
            <UButton
              v-if="detailData.identity.creator?.id"
              variant="outline"
              size="sm"
              :to="`/admin/users?user_id=${detailData.identity.creator.id}`"
            >
              Voir le créateur
            </UButton>
          </div>
          <AdminDispatchActorsCard :identity="detailData.identity" />
          <AdminDispatchOffersPanel
            :active-offers="detailData.active_offers"
            :dispatch-waves="detailData.dispatch_waves"
            :share-tokens="detailData.share_tokens"
          />
          <AdminDispatchTimeline :items="detailData.timeline" />
        </template>
      </template>
    </USlideover>
  </AppPageShell>
</template>

<script setup lang="ts">
import type { AdminDispatchListRow } from '@oneandlab/shared-types';
import type { AdminDispatchFilters } from '~/composables/useAdminDispatch';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

const {
  dashboardData,
  detailData,
  loading,
  detailLoading,
  error,
  detailError,
  fetchDashboard,
  fetchDetail,
  clearDetail,
} = useAdminDispatch();

const detailOpen = ref(false);
const selectedId = ref<string | null>(null);
const currentPage = ref(1);

const filters = reactive<AdminDispatchFilters>({
  type: '',
  status: '',
  dispatch_mode: '',
  date_from: '',
  date_to: '',
  search: '',
});

const typeOptions = [
  { label: 'Tous les types', value: '' },
  { label: 'Soins infirmiers', value: 'nursing' },
  { label: 'Prélèvement', value: 'blood_test' },
];

const statusOptions = [
  { label: 'Tous les statuts', value: '' },
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmé', value: 'confirmed' },
  { label: 'Planifié', value: 'planned' },
  { label: 'En cours', value: 'inProgress' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Annulé', value: 'canceled' },
];

const dispatchModeOptions = [
  { label: 'Tous les modes', value: '' },
  { label: 'Zone', value: 'zone' },
  { label: 'Invite SMS', value: 'external_invite' },
  { label: 'Direct', value: 'direct_assign' },
  { label: 'Manuel', value: 'manual' },
];

const columns = [
  { id: 'patient', accessorKey: 'patient_display_name', header: 'Patient / créneau' },
  { id: 'type', accessorKey: 'type', header: 'Type' },
  { id: 'creator', accessorKey: 'created_by_display_name', header: 'Créé par' },
  { id: 'dispatch_mode', accessorKey: 'dispatch_mode', header: 'Dispatch' },
  { id: 'offers', accessorKey: 'pending_offers_count', header: 'Offres' },
  { id: 'assigned', accessorKey: 'assigned_nurse_display_name', header: 'Assigné' },
  { id: 'status', accessorKey: 'status', header: 'Statut' },
  { id: 'actions', accessorKey: 'id', header: '' },
];

const tableRows = computed(() => dashboardData.value?.rows ?? []);
const pagination = computed(() => dashboardData.value?.pagination ?? { page: 1, limit: 25, total: 0, total_pages: 0 });

const detailTitle = computed(() => {
  if (!detailData.value) return 'Détail dispatch';
  const name = detailData.value.identity.patient?.display_name;
  return name ? `Dispatch — ${name}` : 'Détail dispatch';
});

function buildFetchFilters(): AdminDispatchFilters {
  const out: AdminDispatchFilters = { page: currentPage.value, limit: 25 };
  if (filters.type) out.type = filters.type;
  if (filters.status) out.status = filters.status;
  if (filters.dispatch_mode) out.dispatch_mode = filters.dispatch_mode;
  if (filters.date_from) out.date_from = filters.date_from;
  if (filters.date_to) out.date_to = filters.date_to;
  if (filters.search?.trim()) out.search = filters.search.trim();
  return out;
}

async function reload() {
  await fetchDashboard(buildFetchFilters());
}

function clearFilters() {
  filters.type = '';
  filters.status = '';
  filters.dispatch_mode = '';
  filters.date_from = '';
  filters.date_to = '';
  filters.search = '';
  currentPage.value = 1;
  reload();
}

function goPage(p: number) {
  currentPage.value = p;
  reload();
}

async function openDetail(id: string) {
  selectedId.value = id;
  detailOpen.value = true;
  await fetchDetail(id);
}

function onDetailOpenChange(open: boolean) {
  if (!open) {
    selectedId.value = null;
    clearDetail();
  }
}

function formatDateOnly(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateShort(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function roleLabel(role: string | null | undefined): string {
  const map: Record<string, string> = {
    pro: 'Pro',
    nurse: 'Infirmier',
    lab: 'Labo',
    subaccount: 'Sous-lab',
    preleveur: 'Préleveur',
    patient: 'Patient',
    super_admin: 'Admin',
  };
  return role ? (map[role] ?? role) : '—';
}

function dispatchModeLabel(mode: string | null | undefined): string {
  if (!mode) return '—';
  const map: Record<string, string> = {
    zone: 'Zone',
    external_invite: 'Invite SMS',
    direct_assign: 'Direct',
    manual: 'Manuel',
  };
  return map[mode] ?? mode;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    planned: 'Planifié',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return map[status] ?? status;
}

function statusColor(status: string): 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral' {
  const map: Record<string, 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'success',
    planned: 'info',
    inProgress: 'primary',
    completed: 'neutral',
    canceled: 'error',
  };
  return map[status] ?? 'neutral';
}

function assignedSummary(row: AdminDispatchListRow): string {
  if (row.assigned_nurse_display_name) return `Inf. ${row.assigned_nurse_display_name}`;
  if (row.assigned_to_display_name) return `Prél. ${row.assigned_to_display_name}`;
  if (row.assigned_lab_display_name) return `Lab ${row.assigned_lab_display_name}`;
  return '—';
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => [filters.type, filters.status, filters.dispatch_mode, filters.date_from, filters.date_to, filters.search],
  () => {
    currentPage.value = 1;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => reload(), 300);
  },
);

onMounted(() => reload());
</script>
