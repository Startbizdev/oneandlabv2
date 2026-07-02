<template>
  <AppPageShell max-width="7xl" class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="QR code"
        description="Tous les QR codes professionnels — statistiques, consultation et téléchargement."
      />
    </template>

    <div
      class="flex flex-col gap-2.5 rounded-xl border border-gray-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher par nom ou token…"
        icon="i-lucide-search"
        size="sm"
        clearable
        class="min-w-0 flex-1"
        :ui="{ rounded: 'rounded-lg' }"
      />
      <USelect
        v-model="roleFilter"
        :items="roleOptions"
        value-key="value"
        placeholder="Filtrer par rôle"
        size="sm"
        class="w-full sm:min-w-[11rem] sm:w-auto"
      />
    </div>

    <div
      class="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950"
    >
      <UTable :data="paginatedItems" :columns="columns" :loading="loading">
        <template #display_name-cell="{ row }">
          <span class="text-sm font-medium text-gray-900 dark:text-white">
            {{ rowLabel(row, 'display_name') || '—' }}
          </span>
        </template>
        <template #user_role-cell="{ row }">
          <UBadge variant="subtle" size="sm">{{ roleLabel(rowLabel(row, 'user_role')) }}</UBadge>
        </template>
        <template #token-cell="{ row }">
          <span class="font-mono text-xs text-gray-500 dark:text-gray-400" :title="rowLabel(row, 'token')">
            {{ truncateToken(rowLabel(row, 'token')) }}
          </span>
        </template>
        <template #scans-cell="{ row }">
          <span class="text-sm tabular-nums font-medium">{{ qrStats(row).scans }}</span>
        </template>
        <template #conversions-cell="{ row }">
          <span class="text-sm tabular-nums font-medium">{{ qrStats(row).conversions }}</span>
        </template>
        <template #visits-cell="{ row }">
          <span class="text-sm tabular-nums text-muted">{{ qrStats(row).visits }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex flex-wrap items-center justify-end gap-1.5">
            <UButton
              v-if="rowLabel(row, 'scan_url')"
              size="xs"
              variant="outline"
              icon="i-lucide-external-link"
              :to="rowLabel(row, 'scan_url')"
              target="_blank"
            >
              Voir
            </UButton>
            <UButton
              size="xs"
              variant="soft"
              icon="i-lucide-download"
              :loading="downloadingKey === `${rowData(row).profile_id}-poster`"
              @click="downloadPng(rowData(row).profile_id, false)"
            >
              Affiche
            </UButton>
            <UButton
              size="xs"
              variant="ghost"
              icon="i-lucide-qr-code"
              :loading="downloadingKey === `${rowData(row).profile_id}-raw`"
              @click="downloadPng(rowData(row).profile_id, true)"
            >
              QR brut
            </UButton>
          </div>
        </template>
        <template #empty>
          <div class="py-12">
            <UEmpty
              icon="i-lucide-qr-code"
              title="Aucun QR code"
              description="Aucun professionnel ne correspond à vos critères."
              variant="naked"
              :actions="[{ label: 'Réinitialiser les filtres', variant: 'outline', onClick: resetFilters }]"
            />
          </div>
        </template>
      </UTable>

      <div
        v-if="filteredTotal > 0"
        class="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-3 py-3 dark:border-gray-800 sm:flex-row sm:px-4"
      >
        <p class="text-center text-xs text-gray-500 dark:text-gray-400 sm:text-left sm:text-sm">
          <span class="font-medium text-gray-700 dark:text-gray-300">{{ rangeStart }}-{{ rangeEnd }}</span>
          sur
          <span class="font-medium text-gray-700 dark:text-gray-300">{{ filteredTotal }}</span>
        </p>
        <UPagination
          v-if="totalPages > 1"
          v-model:page="currentPage"
          :total="filteredTotal"
          :items-per-page="pageSize"
          :sibling-count="1"
          show-edges
          :ui="{ wrapper: 'gap-1', rounded: 'rounded-lg' }"
        />
      </div>
    </div>
  </AppPageShell>
</template>

<script setup lang="ts">
import { apiFetch, apiFetchBlob } from '~/utils/api';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

type AdminQrRow = {
  profile_id: string;
  token: string;
  user_role: string;
  display_name?: string;
  scan_url?: string;
  analytics?: { scans?: number; visits?: number; conversions?: number };
};

const loading = ref(true);
const downloadingKey = ref<string | null>(null);
const items = ref<AdminQrRow[]>([]);
const roleFilter = ref('all');
const searchQuery = ref('');
const debouncedSearch = ref('');
const currentPage = ref(1);
const pageSize = 20;
const toast = useAppToast();

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, (q) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    debouncedSearch.value = q;
  }, 220);
}, { immediate: true });

const roleOptions = [
  { label: 'Tous les rôles', value: 'all' },
  { label: 'Infirmier', value: 'nurse' },
  { label: 'Laboratoire', value: 'lab' },
  { label: 'Sous-compte', value: 'subaccount' },
  { label: 'Professionnel', value: 'pro' },
];

const columns = [
  { id: 'display_name', accessorKey: 'display_name', header: 'Nom' },
  { id: 'user_role', accessorKey: 'user_role', header: 'Rôle' },
  { id: 'token', accessorKey: 'token', header: 'Token' },
  { id: 'scans', accessorKey: 'scans', header: 'Flashes' },
  { id: 'visits', accessorKey: 'visits', header: 'Visites' },
  { id: 'conversions', accessorKey: 'conversions', header: 'RDV' },
  { id: 'actions', accessorKey: 'actions', header: 'Téléchargement' },
];

const filteredItems = computed(() => {
  let list = [...items.value];
  if (roleFilter.value && roleFilter.value !== 'all') {
    list = list.filter((r) => r.user_role === roleFilter.value);
  }
  if (debouncedSearch.value.trim()) {
    const q = debouncedSearch.value.toLowerCase().trim();
    list = list.filter((r) =>
      (r.display_name || '').toLowerCase().includes(q)
      || (r.token || '').toLowerCase().includes(q),
    );
  }
  return list;
});

const filteredTotal = computed(() => filteredItems.value.length);
const totalPages = computed(() => Math.max(1, Math.ceil(filteredTotal.value / pageSize)));
const rangeStart = computed(() => (filteredTotal.value === 0 ? 0 : (currentPage.value - 1) * pageSize + 1));
const rangeEnd = computed(() => Math.min(currentPage.value * pageSize, filteredTotal.value));

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredItems.value.slice(start, start + pageSize);
});

function rowData(row: { original?: AdminQrRow } & AdminQrRow): AdminQrRow {
  return (row.original ?? row) as AdminQrRow;
}

function rowLabel(row: { original?: AdminQrRow } & AdminQrRow, key: keyof AdminQrRow): string {
  const v = rowData(row)[key];
  return v == null ? '' : String(v);
}

function qrStats(row: { original?: AdminQrRow } & AdminQrRow) {
  const a = rowData(row).analytics ?? {};
  return {
    scans: a.scans ?? 0,
    visits: a.visits ?? 0,
    conversions: a.conversions ?? 0,
  };
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    nurse: 'Infirmier',
    lab: 'Laboratoire',
    subaccount: 'Sous-compte',
    pro: 'Professionnel',
  };
  return labels[role] || role;
}

function truncateToken(token?: string) {
  const t = String(token ?? '');
  if (t.length <= 14) return t || '—';
  return `${t.slice(0, 8)}…${t.slice(-4)}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadPng(profileId: string, raw: boolean) {
  const key = `${profileId}-${raw ? 'raw' : 'poster'}`;
  if (downloadingKey.value) return;
  downloadingKey.value = key;
  try {
    const q = raw ? '?raw=1' : '';
    const { blob } = await apiFetchBlob(`/admin/qr/${encodeURIComponent(profileId)}/png${q}`);
    const name = raw ? `cary-qr-${profileId}.png` : `cary-affiche-${profileId}.png`;
    triggerBlobDownload(blob, name);
  } catch (e: unknown) {
    toast.add({
      title: 'Téléchargement impossible',
      description: e instanceof Error ? e.message : 'Accès refusé ou session expirée.',
      color: 'error',
    });
  } finally {
    downloadingKey.value = null;
  }
}

function resetFilters() {
  searchQuery.value = '';
  debouncedSearch.value = '';
  roleFilter.value = 'all';
  currentPage.value = 1;
}

async function load() {
  loading.value = true;
  try {
    const res = await apiFetch<{ success: boolean; data: { items: AdminQrRow[]; total?: number } }>(
      '/admin/qr?limit=100&offset=0',
      { method: 'GET' },
    );
    const payload = res.data;
    items.value = Array.isArray(payload)
      ? payload
      : (payload?.items ?? []);
  } catch (e: unknown) {
    items.value = [];
    toast.add({
      title: 'Chargement impossible',
      description: e instanceof Error ? e.message : 'Erreur serveur',
      color: 'error',
    });
  } finally {
    loading.value = false;
  }
}

watch([roleFilter, debouncedSearch], () => {
  currentPage.value = 1;
});

watch(filteredTotal, (total) => {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage.value > maxPage) currentPage.value = maxPage;
});

onMounted(() => {
  void load();
});
</script>
