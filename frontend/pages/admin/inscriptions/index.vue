<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Inscriptions"
      description="Demandes d'inscription laboratoires, professionnels et infirmiers. Acceptez ou refusez les demandes."
    >
      <template #actions>
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          aria-label="Actualiser"
          @click="fetchRequests"
        >
          Actualiser
        </UButton>
      </template>
    </TitleDashboard>

    <div class="flex flex-col sm:flex-row gap-4">
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher (email, nom, SIRET, Adeli, RPPS...)"
        class="flex-1"
        icon="i-lucide-search"
        clearable
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        value-key="value"
        placeholder="Statut"
        class="w-full sm:w-44"
      />
      <USelect
        v-model="roleFilter"
        :items="roleOptions"
        value-key="value"
        placeholder="Profil"
        class="w-full sm:w-44"
      />
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary" />
    </div>

    <UEmpty
      v-else-if="filteredRequests.length === 0"
      icon="i-lucide-inbox"
      title="Aucune demande"
      description="Aucune demande d'inscription ne correspond à vos critères."
    />

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard
        v-for="req in filteredRequests"
        :key="req.id"
        class="flex flex-col h-full overflow-hidden hover:shadow-lg transition-shadow"
        :ui="{ body: 'flex-1 flex flex-col min-h-0', footer: 'border-t border-default p-3' }"
      >
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <UBadge :color="getRoleColor(req.role)" variant="soft" size="sm">
              {{ getRoleLabel(req.role) }}
            </UBadge>
            <UBadge :color="getStatusColor(req.status)" variant="subtle" size="sm">
              {{ getStatusLabel(req.status) }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-3 text-sm">
          <div class="font-semibold text-foreground truncate">
            {{ req.first_name }} {{ req.last_name }}
          </div>
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-mail" class="w-4 h-4 shrink-0" />
            <span class="truncate">{{ req.email }}</span>
          </div>
          <div v-if="req.phone" class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-phone" class="w-4 h-4 shrink-0" />
            <span>{{ req.phone }}</span>
          </div>
          <template v-if="req.role === 'lab'">
            <div v-if="req.siret" class="flex items-center gap-2 text-muted">
              <UIcon name="i-lucide-building-2" class="w-4 h-4 shrink-0" />
              <span class="font-mono">{{ req.siret }}</span>
            </div>
            <div v-if="req.company_name" class="text-muted truncate">
              {{ req.company_name }}
            </div>
          </template>
          <template v-if="req.role === 'pro'">
            <div v-if="req.adeli" class="flex items-center gap-2 text-muted">
              <UIcon name="i-lucide-badge-check" class="w-4 h-4 shrink-0" />
              <span class="font-mono">Adeli {{ req.adeli }}</span>
            </div>
          </template>
          <template v-if="req.role === 'nurse'">
            <div v-if="req.rpps" class="flex items-center gap-2 text-muted">
              <UIcon name="i-lucide-heart-pulse" class="w-4 h-4 shrink-0" />
              <span class="font-mono">RPPS {{ req.rpps }}</span>
            </div>
          </template>
          <div v-if="req.address" class="text-muted truncate">
            {{ req.address }}
          </div>
          <div class="text-xs text-muted pt-1">
            {{ formatDate(req.created_at) }}
          </div>
        </div>

        <template v-if="req.status === 'pending'" #footer>
          <div class="flex gap-2">
            <UButton
              block
              color="success"
              size="sm"
              icon="i-lucide-check"
              :loading="acceptingId === req.id"
              :disabled="rejectingId === req.id"
              @click="acceptRequest(req.id)"
            >
              Accepter
            </UButton>
            <UButton
              block
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
        </template>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

import { apiFetch } from '~/utils/api';
const toast = useToast();

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
