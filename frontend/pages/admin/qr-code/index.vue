<template>
  <DashboardLayout
    title="QR code"
    description="Tous les QR codes professionnels — téléchargement et analytics"
    :loading="loading"
  >
    <template #main>
      <div class="mb-4 flex flex-wrap gap-3">
        <USelect
          v-model="roleFilter"
          :items="roleOptions"
          placeholder="Tous les rôles"
          class="w-48"
        />
        <UInput v-model="search" placeholder="Rechercher…" icon="i-lucide-search" class="max-w-xs" />
      </div>

      <UTable :data="items" :columns="columns">
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UButton
              size="xs"
              variant="ghost"
              icon="i-lucide-download"
              :to="pngUrl(row.original.profile_id, false)"
              target="_blank"
            />
            <UButton
              size="xs"
              variant="ghost"
              icon="i-lucide-qr-code"
              :to="pngUrl(row.original.profile_id, true)"
              target="_blank"
            />
          </div>
        </template>
      </UTable>
    </template>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

definePageMeta({ layout: 'dashboard', middleware: 'auth' });

type AdminQrRow = {
  profile_id: string;
  token: string;
  user_role: string;
  display_name?: string;
  analytics?: { scans: number; conversions: number };
};

const loading = ref(true);
const items = ref<AdminQrRow[]>([]);
const roleFilter = ref<string | null>(null);
const search = ref('');
const config = useRuntimeConfig();

const roleOptions = [
  { label: 'Tous', value: null },
  { label: 'Infirmier', value: 'nurse' },
  { label: 'Labo', value: 'lab' },
  { label: 'Sous-compte', value: 'subaccount' },
  { label: 'Pro', value: 'pro' },
];

const columns = [
  { accessorKey: 'display_name', header: 'Nom' },
  { accessorKey: 'user_role', header: 'Rôle' },
  { accessorKey: 'token', header: 'Token' },
  {
    id: 'scans',
    header: 'Flashes',
    cell: ({ row }: { row: { original: AdminQrRow } }) => row.original.analytics?.scans ?? 0,
  },
  {
    id: 'conversions',
    header: 'RDV',
    cell: ({ row }: { row: { original: AdminQrRow } }) => row.original.analytics?.conversions ?? 0,
  },
  { id: 'actions', header: '' },
];

function pngUrl(profileId: string, raw: boolean) {
  const base = (config.public as { apiBase?: string }).apiBase || '/api';
  const q = raw ? '?raw=1' : '';
  return `${base}/admin/qr/${profileId}/png${q}`;
}

async function load() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (roleFilter.value) params.set('role', roleFilter.value);
    if (search.value.trim()) params.set('q', search.value.trim());
    const qs = params.toString();
    const res = await apiFetch<{ success: boolean; data: { items: AdminQrRow[] } }>(
      `/admin/qr${qs ? `?${qs}` : ''}`,
      { method: 'GET' },
    );
    items.value = res.data?.items ?? [];
  } finally {
    loading.value = false;
  }
}

watch([roleFilter, search], () => {
  void load();
});

onMounted(() => {
  void load();
});
</script>
