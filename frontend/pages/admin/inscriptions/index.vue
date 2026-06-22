<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
    <AppPageHeader
      :edge-bleed="false"
      title="Inscriptions"
      description="Demandes d'inscription laboratoires, professionnels et infirmiers. Acceptez ou refusez les demandes."
    />
    </template>

    <!-- Filtres : bandeau compact comme les autres écrans admin -->
    <div
      class="flex flex-col gap-2.5 rounded-xl border border-gray-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher (email, nom, SIRET, RPPS, Adeli…)"
        class="min-w-0 flex-1"
        icon="i-lucide-search"
        size="sm"
        clearable
        :ui="{ rounded: 'rounded-lg' }"
      />
      <div class="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
        <USelect
          v-model="statusFilter"
          :items="statusOptions"
          value-key="value"
          placeholder="Statut"
          size="sm"
          class="min-w-[9.5rem] flex-1 sm:flex-none sm:min-w-[10.5rem]"
        />
        <USelect
          v-model="roleFilter"
          :items="roleOptions"
          value-key="value"
          placeholder="Profil"
          size="sm"
          class="min-w-[9.5rem] flex-1 sm:flex-none sm:min-w-[10.5rem]"
        />
      </div>
    </div>

    <!-- Chargement : lignes squelette alignées sur la liste -->
    <div
      v-if="loading"
      class="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950"
    >
      <div
        v-for="i in 5"
        :key="i"
        class="flex flex-col gap-4 border-b border-gray-100 p-4 last:border-b-0 dark:border-gray-800 sm:flex-row sm:justify-between animate-pulse"
      >
        <div class="min-w-0 flex-1 space-y-3">
          <div class="flex gap-2">
            <div class="h-6 w-24 rounded-full bg-gray-100 dark:bg-gray-800" />
            <div class="h-6 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
          <div class="h-5 max-w-[14rem] rounded bg-gray-100 dark:bg-gray-800" />
          <div class="space-y-2">
            <div class="h-4 max-w-xl rounded bg-gray-100 dark:bg-gray-800" />
            <div class="h-4 w-3/5 max-w-xs rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
        <div class="flex w-full shrink-0 gap-2 sm:w-40">
          <div class="h-9 flex-1 rounded-lg bg-gray-100 dark:bg-gray-800" />
          <div class="h-9 flex-1 rounded-lg bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    </div>

    <!-- Vide : bloc unique lisible -->
    <div
      v-else-if="filteredRequests.length === 0"
      class="flex flex-col items-center justify-center gap-4 rounded-xl border border-gray-200/90 bg-gray-50/50 px-6 py-14 text-center dark:border-gray-800 dark:bg-gray-950/60"
    >
      <div
        class="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200/80 bg-white dark:border-gray-700 dark:bg-gray-900"
      >
        <UIcon name="i-lucide-inbox" class="h-7 w-7 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      </div>
      <div class="max-w-sm space-y-1">
        <p class="text-base font-semibold text-gray-900 dark:text-white">Aucune demande</p>
        <p class="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Aucune demande d’inscription ne correspond à vos critères. Modifiez les filtres ou la recherche.
        </p>
      </div>
    </div>

    <!-- Liste linéaire : une ligne = une demande, actions à droite (ou sous le contenu sur mobile) -->
    <div
      v-else
      class="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950"
    >
      <article
        v-for="req in filteredRequests"
        :key="req.id"
        class="flex flex-col gap-4 border-b border-gray-100 p-4 transition-colors last:border-b-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-900/40 sm:flex-row sm:items-stretch sm:gap-6 sm:p-5"
      >
        <div class="min-w-0 flex-1 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge :color="getRoleColor(req.role)" variant="soft" size="sm" class="font-medium">
              {{ getRoleLabel(req.role) }}
            </UBadge>
            <UBadge :color="getStatusColor(req.status)" variant="subtle" size="sm">
              {{ getStatusLabel(req.status) }}
            </UBadge>
          </div>

          <h2 class="truncate text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">
            {{ [req.first_name, req.last_name].filter(Boolean).join(' ') || '—' }}
          </h2>

          <ul class="min-w-0 space-y-1.5 text-[13px] text-gray-600 dark:text-gray-400" role="list">
            <li class="flex min-w-0 items-start gap-2">
              <UIcon name="i-lucide-mail" class="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
              <span class="min-w-0 break-all">{{ req.email }}</span>
            </li>
            <li v-if="req.phone" class="flex items-start gap-2">
              <UIcon name="i-lucide-phone" class="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
              <span>{{ req.phone }}</span>
            </li>
            <template v-if="req.role === 'lab'">
              <li v-if="req.siret" class="flex items-start gap-2 font-mono text-[13px]">
                <UIcon name="i-lucide-building-2" class="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                <span>SIRET {{ req.siret }}</span>
              </li>
              <li v-if="req.company_name" class="flex min-w-0 items-start gap-2">
                <UIcon name="i-lucide-briefcase" class="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                <span class="min-w-0 truncate">{{ req.company_name }}</span>
              </li>
            </template>
            <li v-if="req.role === 'pro' && req.rpps" class="flex items-start gap-2 font-mono text-[13px]">
              <UIcon name="i-lucide-badge-check" class="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
              <span>RPPS {{ req.rpps }}</span>
            </li>
            <li
              v-if="req.role === 'nurse' && (req.rpps || req.adeli)"
              class="flex items-start gap-2 font-mono text-[13px]"
            >
              <UIcon name="i-lucide-heart-pulse" class="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
              <span>{{ req.rpps ? `RPPS ${req.rpps}` : `Adeli ${req.adeli}` }}</span>
            </li>
            <li v-if="req.address" class="flex min-w-0 items-start gap-2">
              <UIcon name="i-lucide-map-pin" class="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
              <span class="min-w-0 leading-snug">{{ req.address }}</span>
            </li>
          </ul>

          <p class="text-xs text-gray-400 dark:text-gray-500">
            <UIcon name="i-lucide-clock" class="mr-1 inline-block h-3 w-3 -translate-y-px align-middle opacity-70" aria-hidden="true" />
            Reçu le {{ formatDate(req.created_at) }}
          </p>
        </div>

        <div
          v-if="req.status === 'pending'"
          class="flex w-full shrink-0 flex-row gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:w-[11.5rem] sm:flex-col sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0"
        >
          <UButton
            class="min-h-9 flex-1 justify-center sm:w-full"
            color="success"
            variant="solid"
            size="sm"
            icon="i-lucide-check"
            :loading="acceptingId === req.id"
            :disabled="rejectingId === req.id"
            :on-click="() => acceptRequest(req.id)"
          >
            Accepter
          </UButton>
          <UButton
            class="min-h-9 flex-1 justify-center sm:w-full"
            variant="outline"
            color="error"
            size="sm"
            icon="i-lucide-x"
            :loading="rejectingId === req.id"
            :disabled="acceptingId === req.id"
            :on-click="() => rejectRequest(req.id)"
          >
            Refuser
          </UButton>
        </div>
      </article>
    </div>
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

import { apiFetch } from '~/utils/api';
const toast = useAppToast();

const requests = ref<any[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const statusFilter = ref('all');
const roleFilter = ref('all');
const acceptingId = ref<string | null>(null);
const rejectingId = ref<string | null>(null);

const statusOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'En attente', value: 'pending' },
  { label: 'Acceptées', value: 'accepted' },
  { label: 'Refusées', value: 'rejected' },
];

const roleOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'Laboratoire', value: 'lab' },
  { label: 'Professionnel', value: 'pro' },
  { label: 'Infirmier', value: 'nurse' },
];

const filteredRequests = computed(() => {
  let list = [...requests.value];
  if (statusFilter.value && statusFilter.value !== 'all') {
    list = list.filter(r => r.status === statusFilter.value);
  }
  if (roleFilter.value && roleFilter.value !== 'all') {
    list = list.filter(r => r.role === roleFilter.value);
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(r =>
      (r.email || '').toLowerCase().includes(q) ||
      (r.first_name || '').toLowerCase().includes(q) ||
      (r.last_name || '').toLowerCase().includes(q) ||
      (r.siret || '').includes(q) ||
      (r.adeli || '').includes(q) ||
      (r.rpps || '').includes(q) ||
      (r.company_name || '').toLowerCase().includes(q)
    );
  }
  return list;
});

function getRoleLabel(role: string) {
  const l: Record<string, string> = { lab: 'Laboratoire', pro: 'Professionnel', nurse: 'Infirmier' };
  return l[role] || role;
}

function getRoleColor(role: string) {
  const c: Record<string, string> = { lab: 'primary', pro: 'warning', nurse: 'success' };
  return c[role] || 'neutral';
}

function getStatusLabel(status: string) {
  const l: Record<string, string> = { pending: 'En attente', accepted: 'Acceptée', rejected: 'Refusée' };
  return l[status] || status;
}

function getStatusColor(status: string) {
  const c: Record<string, string> = { pending: 'warning', accepted: 'success', rejected: 'error' };
  return c[status] || 'neutral';
}

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function fetchRequests() {
  loading.value = true;
  try {
    const response = await apiFetch('/registration-requests', { method: 'GET' });
    if (response?.success && Array.isArray(response.data)) {
      requests.value = response.data;
    } else {
      requests.value = [];
    }
  } catch (e) {
    toast.add({ title: 'Erreur', description: (e as Error)?.message ?? 'Chargement impossible', color: 'error' });
    requests.value = [];
  } finally {
    loading.value = false;
  }
}

async function acceptRequest(id: string) {
  acceptingId.value = id;
  try {
    const response = await apiFetch(`/registration-requests/${id}/accept`, { method: 'PUT' });
    if (response?.success) {
      toast.add({ title: 'Demande acceptée', color: 'success' });
      await fetchRequests();
    } else {
      toast.add({ title: 'Erreur', description: (response as any)?.error ?? 'Échec', color: 'error' });
    }
  } catch (e) {
    toast.add({ title: 'Erreur', description: (e as Error)?.message ?? 'Échec', color: 'error' });
  } finally {
    acceptingId.value = null;
  }
}

async function rejectRequest(id: string) {
  if (!confirm('Refuser cette demande d\'inscription ?')) return;
  rejectingId.value = id;
  try {
    const response = await apiFetch(`/registration-requests/${id}/reject`, { method: 'PUT' });
    if (response?.success) {
      toast.add({ title: 'Demande refusée', color: 'success' });
      await fetchRequests();
    } else {
      toast.add({ title: 'Erreur', description: (response as any)?.error ?? 'Échec', color: 'error' });
    }
  } catch (e) {
    toast.add({ title: 'Erreur', description: (e as Error)?.message ?? 'Échec', color: 'error' });
  } finally {
    rejectingId.value = null;
  }
}

onMounted(() => {
  fetchRequests();
});
</script>
