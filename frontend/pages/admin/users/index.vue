<template>
  <div class="space-y-6">
    <TitleDashboard title="Gestion des utilisateurs" description="Gérez les utilisateurs : nom, prénom, email, rôle et types de soins.">
      <template #actions>
        <UButton color="primary" icon="i-lucide-plus" to="/profile?newUser=1">
          Créer un utilisateur
        </UButton>
      </template>
    </TitleDashboard>

    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher par nom, prénom, email..."
        class="flex-1"
      />
      <USelect
        v-model="roleFilter"
        :items="roleOptions"
        value-key="value"
        placeholder="Filtrer par rôle"
        class="w-full sm:w-48"
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        value-key="value"
        placeholder="Filtrer par statut"
        class="w-full sm:w-48"
      />
    </div>

    <div class="rounded-xl border border-default/50 bg-default shadow-sm overflow-hidden">
      <UTable :data="filteredUsers" :columns="columns" :loading="loading">
        <template #user-cell="{ row }">
          <div class="flex items-center gap-3 py-1">
            <UAvatar
              :alt="getUserDisplayName(row.original ?? row)"
              size="sm"
              class="flex-shrink-0"
            />
            <div class="min-w-0">
              <p class="font-normal text-foreground truncate">
                {{ getUserDisplayName(row.original ?? row) || '—' }}
              </p>
              <p class="text-sm text-muted truncate">
                {{ (row.original ?? row).email || '—' }}
              </p>
            </div>
          </div>
        </template>
        <template #role-cell="{ row }">
          <UBadge :color="getRoleColor((row.original ?? row).role)" variant="soft" size="sm" class="font-medium">
            {{ getRoleLabel((row.original ?? row).role) }}
          </UBadge>
        </template>
        <template #care_types-cell="{ row }">
          <div v-if="hasCareTypes((row.original ?? row).role)" class="flex flex-wrap items-center gap-1.5">
            <template v-if="showPriseDeSang((row.original ?? row).role)">
              <UBadge color="error" variant="soft" size="xs" leading-icon="i-lucide-syringe">
                Prise de sang
              </UBadge>
            </template>
            <template v-if="showSoinsInfirmiers((row.original ?? row).role)">
              <UBadge color="info" variant="soft" size="xs" leading-icon="i-lucide-stethoscope">
                Soins infirmiers
              </UBadge>
            </template>
          </div>
          <UBadge v-else color="neutral" variant="soft" size="xs" class="text-muted">
            Non applicable
          </UBadge>
        </template>
        <template #status-cell="{ row }">
          <UBadge
            v-if="(row.original ?? row).banned_until && new Date((row.original ?? row).banned_until) > new Date('9999-12-30')"
            color="error"
            variant="soft"
            size="sm"
          >
            Banni
          </UBadge>
          <UBadge
            v-else-if="isSuspended(row.original ?? row)"
            color="warning"
            variant="soft"
            size="sm"
          >
            Suspendu
          </UBadge>
          <UBadge v-else color="success" variant="soft" size="sm">
            Actif
          </UBadge>
        </template>
        <template #created_at-cell="{ row }">
          <span class="text-sm text-muted">{{ formatDateShort((row.original ?? row).created_at) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <UButton
              size="xs"
              variant="ghost"
              icon="i-lucide-eye"
              :to="`/profile?userId=${(row.original ?? row).id}`"
            >
              Voir
            </UButton>
            <UDropdownMenu :items="getActionItems(row.original ?? row)">
              <UButton size="xs" variant="ghost" trailing-icon="i-lucide-chevron-down">
                Plus
              </UButton>
            </UDropdownMenu>
          </div>
        </template>
        <template #empty>
          <div class="py-12">
            <UEmpty
              icon="i-lucide-users"
              title="Aucun utilisateur"
              description="Aucun utilisateur ne correspond à vos critères. Modifiez les filtres."
              :actions="[{ label: 'Réinitialiser les filtres', variant: 'outline', onClick: () => { roleFilter = 'all'; statusFilter = 'all'; searchQuery = ''; } }]"
              variant="naked"
            />
          </div>
        </template>
      </UTable>
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
const toast = useAppToast();

const users = ref<any[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const roleFilter = ref('all');
const statusFilter = ref('all');

const roleOptions = [
  { label: 'Tous les rôles', value: 'all' },
  { label: 'Super Admin', value: 'super_admin' },
  { label: 'Laboratoire', value: 'lab' },
  { label: 'Sous-compte', value: 'subaccount' },
  { label: 'Infirmier', value: 'nurse' },
  { label: 'Préleveur', value: 'preleveur' },
  { label: 'Professionnel', value: 'pro' },
  { label: 'Patient', value: 'patient' },
];

const statusOptions = [
  { label: 'Tous les statuts', value: 'all' },
  { label: 'Actifs', value: 'active' },
  { label: 'Suspendus', value: 'suspended' },
  { label: 'Bannis', value: 'banned' },
];

/** Lab, sous-compte, préleveur = Prise de sang uniquement. Infirmier = Soins infirmiers uniquement. */
const ROLES_PRISE_DE_SANG = ['lab', 'subaccount', 'preleveur'];
const ROLES_SOINS_INFIRMIERS = ['nurse'];

function showPriseDeSang(role: string): boolean {
  return ROLES_PRISE_DE_SANG.includes(role);
}
function showSoinsInfirmiers(role: string): boolean {
  return ROLES_SOINS_INFIRMIERS.includes(role);
}
function hasCareTypes(role: string): boolean {
  return showPriseDeSang(role) || showSoinsInfirmiers(role);
}

const columns = [
  { id: 'user', accessorKey: 'user', header: 'Utilisateur' },
  { id: 'role', accessorKey: 'role', header: 'Rôle' },
  { id: 'care_types', accessorKey: 'care_types', header: 'Types de soins' },
  { id: 'status', accessorKey: 'status', header: 'Statut' },
  { id: 'created_at', accessorKey: 'created_at', header: 'Inscrit le' },
  { id: 'actions', accessorKey: 'actions', header: '' },
];

// Normaliser la valeur du filtre (USelect peut retourner l'objet ou la valeur)
const roleVal = computed(() => {
  const v = roleFilter.value;
  return (typeof v === 'object' && v?.value != null) ? v.value : v;
});
const statusVal = computed(() => {
  const v = statusFilter.value;
  return (typeof v === 'object' && v?.value != null) ? v.value : v;
});

const filteredUsers = computed(() => {
  let filtered = [...(users.value || [])];
  if (roleVal.value && roleVal.value !== 'all') filtered = filtered.filter(u => u.role === roleVal.value);
  if (statusVal.value && statusVal.value !== 'all') {
    if (statusVal.value === 'banned') {
      filtered = filtered.filter(u => u.banned_until && new Date(u.banned_until) > new Date());
    } else if (statusVal.value === 'suspended') {
      filtered = filtered.filter(u => isSuspended(u));
    } else if (statusVal.value === 'active') {
      filtered = filtered.filter(u => !u.banned_until && !isSuspended(u));
    }
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(u =>
      u.email?.toLowerCase().includes(query) ||
      u.first_name?.toLowerCase().includes(query) ||
      u.last_name?.toLowerCase().includes(query) ||
      (u.company_name && u.company_name.toLowerCase().includes(query))
    );
  }
  return filtered;
});

onMounted(async () => {
  await fetchUsers();
});

const fetchUsers = async () => {
  loading.value = true;
  try {
    const response = await apiFetch('/users?limit=200', { method: 'GET' });
    if (response?.success && Array.isArray(response.data)) {
      users.value = response.data;
    } else {
      users.value = [];
    }
  } catch (error: any) {
    console.error('Erreur lors du chargement des utilisateurs:', error);
    toast.add({ title: 'Erreur de chargement', description: error?.message, color: 'red' });
    users.value = [];
  } finally {
    loading.value = false;
  }
};

const isSuspended = (user: any) => {
  if (!user.banned_until) return false;
  const bannedUntil = new Date(user.banned_until);
  const now = new Date();
  return bannedUntil > now && bannedUntil < new Date('9999-12-31');
};

const getRoleColor = (role: string): string => {
  const colors: Record<string, string> = {
    super_admin: 'primary',
    lab: 'info',
    subaccount: 'info',
    nurse: 'success',
    preleveur: 'success',
    pro: 'neutral',
    patient: 'neutral',
  };
  return colors[role] || 'neutral';
};

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    lab: 'Laboratoire',
    subaccount: 'Sous-compte',
    nurse: 'Infirmier',
    preleveur: 'Préleveur',
    pro: 'Professionnel',
    patient: 'Patient',
  };
  return labels[role] || role;
};

/** Nom affiché : pour lab/subaccount = company_name ; sinon prénom + nom, ou email */
function getUserDisplayName(user: any): string {
  if (!user) return '';
  if (user.role === 'lab' || user.role === 'subaccount') {
    const entity = (user.company_name ?? '').trim();
    return entity || (user.email ?? '').trim() || '';
  }
  const first = (user.first_name ?? '').trim();
  const last = (user.last_name ?? '').trim();
  const name = [first, last].filter(Boolean).join(' ').trim();
  return name || (user.email ?? '').trim() || '';
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('fr-FR');
};

const formatDateShort = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Libellé d'adresse (objet { label } ou chaîne) */
function getAddressLabel(address: any): string {
  if (!address) return '—';
  if (typeof address === 'string') return address;
  return address?.label || address?.address || '—';
}

const getActionItems = (user: any) => {
  const profileUrl = `/profile?userId=${user.id}`;
  const main: any[] = [
    { label: 'Voir le détail', icon: 'i-lucide-eye', onSelect: () => navigateTo(profileUrl) },
    { label: 'Historique des incidents', icon: 'i-lucide-shield-alert', onSelect: () => navigateTo(profileUrl) },
  ];
  const sanctions: any[] = [];
  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    sanctions.push({ label: 'Débannir', icon: 'i-lucide-shield-check', onSelect: () => unbanUser(user.id) });
  } else {
    sanctions.push({ label: 'Suspendre 7 jours', icon: 'i-lucide-clock', onSelect: () => suspendUser(user.id, 7) });
    sanctions.push({ label: 'Bannir définitivement', icon: 'i-lucide-shield-off', onSelect: () => banUser(user.id) });
  }
  const danger: any[] = [
    { label: 'Supprimer l\'utilisateur', icon: 'i-lucide-trash-2', onSelect: () => deleteUser(user.id), color: 'error' as const },
  ];
  return [main, sanctions, danger];
};

const suspendUser = async (id: string, days: number) => {
  if (!confirm(`Suspendre cet utilisateur pendant ${days} jours ?`)) return;
  try {
    const response = await apiFetch(`/users/${id}/sanctions`, {
      method: 'PUT',
      body: { action: 'suspend', days, reason: 'Suspension administrative' },
    });
    if (response.success) {
      toast.add({ title: 'Utilisateur suspendu', color: 'green' });
      await fetchUsers();
    } else {
      toast.add({ title: 'Erreur', description: response.error, color: 'red' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  }
};

const banUser = async (id: string) => {
  if (!confirm('Bannir définitivement cet utilisateur ?')) return;
  try {
    const response = await apiFetch(`/users/${id}/sanctions`, {
      method: 'PUT',
      body: { action: 'ban', reason: 'Bannissement définitif' },
    });
    if (response.success) {
      toast.add({ title: 'Utilisateur banni', color: 'green' });
      await fetchUsers();
    } else {
      toast.add({ title: 'Erreur', description: response.error, color: 'red' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  }
};

const unbanUser = async (id: string) => {
  if (!confirm('Débannir cet utilisateur ?')) return;
  try {
    const response = await apiFetch(`/users/${id}/sanctions`, {
      method: 'PUT',
      body: { action: 'unban' },
    });
    if (response.success) {
      toast.add({ title: 'Utilisateur débanni', color: 'green' });
      await fetchUsers();
    } else {
      toast.add({ title: 'Erreur', description: response.error, color: 'red' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  }
};

const deleteUser = async (id: string) => {
  if (!confirm('Supprimer définitivement cet utilisateur ? Cette action est irréversible.')) return;
  try {
    const response = await apiFetch(`/users/${id}`, { method: 'DELETE' });
    if (response?.success) {
      toast.add({ title: 'Utilisateur supprimé', color: 'success' });
      await fetchUsers();
    } else {
      toast.add({ title: 'Erreur', description: (response as any)?.error ?? 'Impossible de supprimer.', color: 'error' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: (error as Error)?.message ?? 'Erreur réseau', color: 'error' });
  }
};

const getIncidentLabel = (action: string) => {
  const labels: Record<string, string> = {
    incident: 'Incident enregistré',
    suspend_user: 'Utilisateur suspendu',
    ban_user: 'Utilisateur banni',
    unban_user: 'Utilisateur débanni',
  };
  return labels[action] || action;
};
</script>
