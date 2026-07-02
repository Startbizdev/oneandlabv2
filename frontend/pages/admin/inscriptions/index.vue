<template>
  <AppPageShell max-width="7xl" class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Inscriptions"
        description="Demandes d'inscription laboratoires, professionnels et infirmiers. Acceptez ou refusez les demandes."
      />
    </template>

    <div
      class="flex flex-col gap-2.5 rounded-xl border border-gray-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher par email, nom, SIRET, RPPS, Adeli, adresse…"
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
          placeholder="Filtrer par statut"
          size="sm"
          class="min-w-[9.5rem] flex-1 sm:flex-none sm:min-w-[10.5rem]"
        />
        <USelect
          v-model="roleFilter"
          :items="roleOptions"
          value-key="value"
          placeholder="Filtrer par profil"
          size="sm"
          class="min-w-[9.5rem] flex-1 sm:flex-none sm:min-w-[10.5rem]"
        />
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="i in 6"
        :key="i"
        class="h-72 animate-pulse rounded-xl border border-gray-200/90 bg-white dark:border-gray-800 dark:bg-gray-950"
      />
    </div>

    <div
      v-else-if="filteredRequests.length === 0"
      class="rounded-xl border border-gray-200/90 bg-white px-6 py-14 dark:border-gray-800 dark:bg-gray-950"
    >
      <UEmpty
        icon="i-lucide-inbox"
        title="Aucune demande"
        description="Aucune demande d'inscription ne correspond à vos critères."
        variant="naked"
        :actions="[{ label: 'Réinitialiser les filtres', variant: 'outline', onClick: resetFilters }]"
      />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="req in paginatedRequests"
          :key="req.id"
          class="flex flex-col rounded-xl border border-gray-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950"
        >
          <div class="flex flex-1 flex-col gap-4 p-5">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="getRoleColor(req.role)" variant="soft" size="sm">
                {{ getRoleLabel(req.role) }}
              </UBadge>
              <UBadge :color="getStatusColor(req.status)" variant="subtle" size="sm">
                {{ getStatusLabel(req.status) }}
              </UBadge>
            </div>

            <div>
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">
                {{ fullName(req) }}
              </h2>
              <p class="mt-1 text-xs text-muted">
                Reçue le {{ formatDate(req.created_at) }}
              </p>
            </div>

            <dl class="space-y-2.5 text-sm">
              <div class="flex gap-2">
                <dt class="w-24 shrink-0 text-muted">Email</dt>
                <dd class="min-w-0 break-all text-gray-800 dark:text-gray-200">{{ req.email || '—' }}</dd>
              </div>
              <div v-if="req.phone" class="flex gap-2">
                <dt class="w-24 shrink-0 text-muted">Téléphone</dt>
                <dd class="text-gray-800 dark:text-gray-200">{{ req.phone }}</dd>
              </div>
              <div v-if="req.role === 'lab' && req.siret" class="flex gap-2">
                <dt class="w-24 shrink-0 text-muted">SIRET</dt>
                <dd class="font-mono text-gray-800 dark:text-gray-200">{{ req.siret }}</dd>
              </div>
              <div v-if="req.role === 'lab' && req.company_name" class="flex gap-2">
                <dt class="w-24 shrink-0 text-muted">Entreprise</dt>
                <dd class="min-w-0 text-gray-800 dark:text-gray-200">{{ req.company_name }}</dd>
              </div>
              <div v-if="req.role === 'pro' && req.rpps" class="flex gap-2">
                <dt class="w-24 shrink-0 text-muted">RPPS</dt>
                <dd class="font-mono text-gray-800 dark:text-gray-200">{{ req.rpps }}</dd>
              </div>
              <div v-if="req.role === 'pro' && req.emploi" class="flex gap-2">
                <dt class="w-24 shrink-0 text-muted">Profession</dt>
                <dd class="text-gray-800 dark:text-gray-200">{{ req.emploi }}</dd>
              </div>
              <div v-if="req.role === 'nurse' && req.rpps" class="flex gap-2">
                <dt class="w-24 shrink-0 text-muted">RPPS</dt>
                <dd class="font-mono text-gray-800 dark:text-gray-200">{{ req.rpps }}</dd>
              </div>
              <div v-if="req.role === 'nurse' && req.adeli" class="flex gap-2">
                <dt class="w-24 shrink-0 text-muted">Adeli</dt>
                <dd class="font-mono text-gray-800 dark:text-gray-200">{{ req.adeli }}</dd>
              </div>
              <div v-if="req.role === 'nurse' && req.gender" class="flex gap-2">
                <dt class="w-24 shrink-0 text-muted">Genre</dt>
                <dd class="text-gray-800 dark:text-gray-200">{{ genderLabel(req.gender) }}</dd>
              </div>
              <div v-if="formatRegistrationAddress(req.address) !== '—'" class="flex gap-2">
                <dt class="w-24 shrink-0 text-muted">Adresse</dt>
                <dd class="min-w-0 leading-snug text-gray-800 dark:text-gray-200">
                  {{ formatRegistrationAddress(req.address) }}
                </dd>
              </div>
            </dl>
          </div>

          <div
            v-if="req.status === 'pending'"
            class="flex gap-2 border-t border-gray-100 p-4 dark:border-gray-800"
          >
            <UButton
              class="flex-1 justify-center"
              color="success"
              variant="solid"
              size="sm"
              icon="i-lucide-check"
              :loading="acceptingId === req.id"
              :disabled="rejectingId === req.id"
              @click="acceptRequest(req.id)"
            >
              Accepter
            </UButton>
            <UButton
              class="flex-1 justify-center"
              variant="outline"
              color="error"
              size="sm"
              icon="i-lucide-x"
              :loading="rejectingId === req.id"
              :disabled="acceptingId === req.id"
              @click="rejectRequest(req.id)"
            >
              Refuser
            </UButton>
          </div>
        </article>
      </div>

      <div
        v-if="filteredTotal > 0"
        class="flex flex-col items-center justify-between gap-3 rounded-xl border border-gray-200/90 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950 sm:flex-row"
      >
        <p class="text-sm text-muted">
          <span class="font-medium text-gray-700 dark:text-gray-300">{{ rangeStart }}-{{ rangeEnd }}</span>
          sur
          <span class="font-medium text-gray-700 dark:text-gray-300">{{ filteredTotal }}</span>
          demandes
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
    </template>
  </AppPageShell>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';
import { labelFromAppointmentAddressField } from '~/utils/address-display';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

type RegistrationRow = {
  id: string;
  role: string;
  status: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  siret?: string;
  company_name?: string;
  rpps?: string;
  adeli?: string;
  emploi?: string;
  gender?: string;
  address?: unknown;
  created_at?: string;
};

const toast = useAppToast();
const requests = ref<RegistrationRow[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const debouncedSearch = ref('');
const statusFilter = ref('all');
const roleFilter = ref('all');
const acceptingId = ref<string | null>(null);
const rejectingId = ref<string | null>(null);
const currentPage = ref(1);
const pageSize = 9;

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, (q) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    debouncedSearch.value = q;
  }, 220);
}, { immediate: true });

const statusOptions = [
  { label: 'Tous les statuts', value: 'all' },
  { label: 'En attente', value: 'pending' },
  { label: 'Acceptées', value: 'accepted' },
  { label: 'Refusées', value: 'rejected' },
];

const roleOptions = [
  { label: 'Tous les profils', value: 'all' },
  { label: 'Laboratoire', value: 'lab' },
  { label: 'Professionnel', value: 'pro' },
  { label: 'Infirmier', value: 'nurse' },
];

const filteredRequests = computed(() => {
  let list = [...requests.value];
  if (debouncedSearch.value.trim()) {
    const q = debouncedSearch.value.toLowerCase().trim();
    list = list.filter((r) => {
      const addressLabel = formatRegistrationAddress(r.address).toLowerCase();
      return (
        (r.email || '').toLowerCase().includes(q)
        || (r.first_name || '').toLowerCase().includes(q)
        || (r.last_name || '').toLowerCase().includes(q)
        || (r.siret || '').includes(q)
        || (r.adeli || '').includes(q)
        || (r.rpps || '').includes(q)
        || (r.company_name || '').toLowerCase().includes(q)
        || (r.phone || '').includes(q)
        || addressLabel.includes(q)
      );
    });
  }
  return list;
});

const filteredTotal = computed(() => filteredRequests.value.length);
const totalPages = computed(() => Math.max(1, Math.ceil(filteredTotal.value / pageSize)));
const rangeStart = computed(() => (filteredTotal.value === 0 ? 0 : (currentPage.value - 1) * pageSize + 1));
const rangeEnd = computed(() => Math.min(currentPage.value * pageSize, filteredTotal.value));

const paginatedRequests = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredRequests.value.slice(start, start + pageSize);
});

function fullName(req: RegistrationRow) {
  return [req.first_name, req.last_name].filter(Boolean).join(' ') || '—';
}

function formatRegistrationAddress(raw: unknown) {
  const label = labelFromAppointmentAddressField(raw);
  if (label && !label.trim().startsWith('{')) return label;
  const s = typeof raw === 'string' ? raw : '';
  const match = s.match(/"label"\s*:\s*"([^"]+)"/);
  if (match?.[1]) return match[1];
  return label || '—';
}

function genderLabel(gender: string) {
  const labels: Record<string, string> = {
    male: 'Homme',
    female: 'Femme',
    other: 'Autre',
  };
  return labels[gender] || gender;
}

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

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resetFilters() {
  searchQuery.value = '';
  debouncedSearch.value = '';
  statusFilter.value = 'all';
  roleFilter.value = 'all';
  currentPage.value = 1;
  void fetchRequests();
}

async function fetchRequests() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (statusFilter.value && statusFilter.value !== 'all') params.set('status', statusFilter.value);
    if (roleFilter.value && roleFilter.value !== 'all') params.set('role', roleFilter.value);
    const qs = params.toString();
    const response = await apiFetch<{ success: boolean; data: RegistrationRow[] }>(
      `/registration-requests${qs ? `?${qs}` : ''}`,
      { method: 'GET' },
    );
    requests.value = response?.success && Array.isArray(response.data) ? response.data : [];
  } catch (e) {
    toast.add({
      title: 'Erreur',
      description: e instanceof Error ? e.message : 'Chargement impossible',
      color: 'error',
    });
    requests.value = [];
  } finally {
    loading.value = false;
  }
}

async function acceptRequest(id: string) {
  acceptingId.value = id;
  try {
    const response = await apiFetch<{ success: boolean; error?: string }>(
      `/registration-requests/${id}/accept`,
      { method: 'PUT' },
    );
    if (response?.success) {
      toast.add({ title: 'Demande acceptée', color: 'success' });
      await fetchRequests();
    } else {
      toast.add({ title: 'Erreur', description: response?.error ?? 'Échec', color: 'error' });
    }
  } catch (e) {
    toast.add({
      title: 'Erreur',
      description: e instanceof Error ? e.message : 'Échec',
      color: 'error',
    });
  } finally {
    acceptingId.value = null;
  }
}

async function rejectRequest(id: string) {
  if (!confirm('Refuser cette demande d\'inscription ?')) return;
  rejectingId.value = id;
  try {
    const response = await apiFetch<{ success: boolean; error?: string }>(
      `/registration-requests/${id}/reject`,
      { method: 'PUT' },
    );
    if (response?.success) {
      toast.add({ title: 'Demande refusée', color: 'success' });
      await fetchRequests();
    } else {
      toast.add({ title: 'Erreur', description: response?.error ?? 'Échec', color: 'error' });
    }
  } catch (e) {
    toast.add({
      title: 'Erreur',
      description: e instanceof Error ? e.message : 'Échec',
      color: 'error',
    });
  } finally {
    rejectingId.value = null;
  }
}

watch([statusFilter, roleFilter], () => {
  currentPage.value = 1;
  void fetchRequests();
});

watch(debouncedSearch, () => {
  currentPage.value = 1;
});

watch(filteredTotal, (total) => {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage.value > maxPage) currentPage.value = maxPage;
});

onMounted(() => {
  void fetchRequests();
});
</script>
