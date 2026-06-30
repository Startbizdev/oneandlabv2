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
              :loading="downloadingKey === `${row.original.profile_id}-poster`"
              @click="downloadPng(row.original.profile_id, false)"
            />
            <UButton
              size="xs"
              variant="ghost"
              icon="i-lucide-qr-code"
              :loading="downloadingKey === `${row.original.profile_id}-raw`"
              @click="downloadPng(row.original.profile_id, true)"
            />
          </div>
        </template>
      </UTable>
    </template>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { apiFetch, apiFetchBlob } from '~/utils/api';

definePageMeta({ layout: 'dashboard', middleware: 'auth' });

type AdminQrRow = {
  profile_id: string;
  token: string;
  user_role: string;
  display_name?: string;
  analytics?: { scans: number; conversions: number };
};

const loading = ref(true);
const downloadingKey = ref<string | null>(null);
const items = ref<AdminQrRow[]>([]);
const roleFilter = ref<string | null>(null);
const search = ref('');
const toast = useAppToast();

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
