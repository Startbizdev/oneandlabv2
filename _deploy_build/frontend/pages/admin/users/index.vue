<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
    <AppPageHeader :edge-bleed="false" title="Gestion des utilisateurs" description="Gérez les utilisateurs : nom, prénom, email, rôle et types de soins.">
      <template #actions>
        <UButton color="primary" icon="i-lucide-plus" to="/admin/users/new">
          Créer un utilisateur
        </UButton>
      </template>
    </AppPageHeader>
  </template>

    <div
      class="flex flex-col gap-2.5 rounded-xl border border-default/90 bg-default p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:flex-row sm:flex-wrap sm:items-center"
    >
      <UInput
        v-model="searchQuery"
        placeholder="Nom, email, société…"
        icon="i-lucide-search"
        size="sm"
        clearable
        class="min-w-0 flex-1"
        :ui="{ rounded: 'rounded-lg' }"
      />
      <div class="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
        <USelect
          v-model="roleFilter"
          :items="roleOptions"
          value-key="value"
          placeholder="Rôle"
          size="sm"
          class="min-w-[10rem] flex-1 sm:flex-none sm:min-w-[11rem]"
        />
        <USelect
          v-model="statusFilter"
          :items="statusOptions"
          value-key="value"
          placeholder="Statut"
          size="sm"
          class="min-w-[10rem] flex-1 sm:flex-none sm:min-w-[11rem]"
        />
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-default/90 bg-default shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div v-if="loading" class="divide-y divide-default">
        <div
          v-for="i in 8"
          :key="i"
          class="flex animate-pulse flex-col gap-3 p-4 sm:flex-row sm:items-center"
        >
          <div class="flex flex-1 gap-3">
            <div class="h-9 w-9 shrink-0 rounded-full bg-muted/60" />
            <div class="min-w-0 flex-1 space-y-2">
              <div class="h-4 w-44 max-w-full rounded bg-muted/50" />
              <div class="h-3 w-56 max-w-full rounded bg-muted/40" />
              <div class="flex gap-2">
                <div class="h-5 w-16 rounded-full bg-muted/50" />
                <div class="h-5 w-20 rounded-full bg-muted/40" />
              </div>
            </div>
          </div>
          <div
            class="flex w-full shrink-0 flex-row items-center justify-start gap-2 sm:w-auto sm:justify-end"
          >
            <div class="h-7 w-[4.25rem] shrink-0 rounded-full bg-muted/50 sm:w-20" />
            <div class="h-7 w-[4.75rem] shrink-0 rounded-full bg-muted/40" />
          </div>
        </div>
      </div>

      <div
        v-else-if="filteredUsers.length === 0"
        class="px-4 py-12 sm:py-14"
      >
        <UEmpty
          icon="i-lucide-users"
          title="Aucun utilisateur"
          description="Aucun utilisateur ne correspond à vos critères. Modifiez les filtres ou la recherche."
          variant="naked"
          :actions="[
            {
              label: 'Réinitialiser les filtres',
              variant: 'outline',
              onClick: resetUserListFilters,
            },
          ]"
        />
      </div>

      <div v-else class="divide-y divide-default">
        <article
          v-for="u in filteredUsers"
          :key="u.id"
          class="transition-colors hover:bg-muted/25"
        >
          <div
            class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-3.5"
          >
            <div class="flex min-w-0 flex-1 gap-3">
              <UAvatar
                :src="u.profile_image_url ?? undefined"
                :alt="getUserDisplayName(u)"
                size="sm"
                class="shrink-0"
              />
              <div class="min-w-0 flex-1 space-y-2">
                <div>
                  <p class="truncate text-sm font-semibold text-foreground">
                    {{ getUserDisplayName(u) || '—' }}
                  </p>
                  <p class="truncate text-xs text-muted">
                    {{ u.email_display || u.email || '—' }}
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <UBadge :color="getRoleColor(u.role)" variant="soft" size="xs" class="font-medium shrink-0">
                    {{ getRoleLabel(u.role) }}
                  </UBadge>
                  <template v-if="hasCareTypes(u.role)">
                    <UBadge v-if="showPriseDeSang(u.role)" color="error" variant="outline" size="xs" leading-icon="i-lucide-syringe">
                      Prélèvement
                    </UBadge>
                    <UBadge v-if="showSoinsInfirmiers(u.role)" color="info" variant="outline" size="xs" leading-icon="i-lucide-stethoscope">
                      Soins infirmiers
                    </UBadge>
                  </template>
                  <UBadge v-else color="neutral" variant="outline" size="xs" class="text-muted">
                    Non applicable
                  </UBadge>
                  <UBadge
                    v-if="u.banned_until && new Date(u.banned_until) > new Date('9999-12-30')"
                    color="error"
                    variant="outline"
                    size="xs"
                  >
                    Banni
                  </UBadge>
                  <UBadge v-else-if="isSuspended(u)" color="warning" variant="outline" size="xs">
                    Suspendu
                  </UBadge>
                  <UBadge v-else color="success" variant="outline" size="xs">
                    Actif
                  </UBadge>
                </div>
                <p class="text-[11px] tabular-nums text-muted">
                  Inscrit le {{ u.created_at ? formatDateShort(u.created_at) : '—' }}
                </p>
              </div>
            </div>

            <div
              class="flex w-full shrink-0 flex-row flex-wrap items-center justify-start gap-2 sm:w-auto sm:flex-nowrap sm:justify-end"
            >
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                leading-icon="i-lucide-eye"
                class="inline-flex shrink-0 rounded-full px-3 py-1.5 font-medium shadow-none whitespace-nowrap"
                :to="`/profile?userId=${u.id}`"
              >
                Voir
              </UButton>
              <UDropdownMenu :items="getActionItems(u)">
                <UButton
                  size="xs"
                  variant="outline"
                  color="neutral"
                  trailing-icon="i-lucide-chevron-down"
                  class="inline-flex shrink-0 rounded-full px-3 py-1.5 font-medium shadow-none whitespace-nowrap"
                >
                  Plus
                </UButton>
              </UDropdownMenu>
            </div>
          </div>
        </article>
      </div>

      <div
        v-if="totalPages > 1"
        class="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-default/50"
      >
        <p class="text-sm text-muted">
          Affichage de <span class="font-medium">{{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalItems) }}</span>
          sur <span class="font-medium">{{ totalItems }}</span>
        </p>
        <UPagination
          v-model:page="currentPage"
          :total="totalItems"
          :items-per-page="pageSize"
          :sibling-count="2"
          show-edges
          :ui="{ wrapper: 'gap-1', rounded: 'rounded-lg' }"
        />
      </div>
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
import { labelFromAppointmentAddressField } from '~/utils/address-display';
const toast = useAppToast();

const users = ref<any[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const roleFilter = ref('all');
const statusFilter = ref('all');
const currentPage = ref(1);
const pageSize = 20;
const totalItems = ref(0);

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

function resetUserListFilters() {
  roleFilter.value = 'all';
  statusFilter.value = 'all';
  searchQuery.value = '';
}

/** Lab, sous-compte, préleveur = Prélèvement uniquement. Infirmier = Soins infirmiers uniquement. */
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

/** USelect peut retourner l'objet ou la valeur */
const roleVal = computed(() => {
  const v = roleFilter.value;
  return (typeof v === 'object' && v?.value != null) ? v.value : v;
});
const statusVal = computed(() => {
  const v = statusFilter.value;
  return (typeof v === 'object' && v?.value != null) ? v.value : v;
});

/** Filtre client-side uniquement par recherche (rôle et statut sont envoyés à l'API) */
const filteredUsers = computed(() => {
  let filtered = [...(users.value || [])];
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(u =>
      u.email?.toLowerCase().includes(query) ||
      u.email_display?.toLowerCase().includes(query) ||
      u.first_name?.toLowerCase().includes(query) ||
      u.last_name?.toLowerCase().includes(query) ||
      (u.company_name && u.company_name.toLowerCase().includes(query))
    );
  }
  return filtered;
});

const totalPages = computed(() => Math.ceil(Math.max(0, totalItems.value) / pageSize));

onMounted(async () => {
  await fetchUsers();
});

watch([roleFilter, statusFilter], () => {
  currentPage.value = 1;
  fetchUsers();
});
watch(currentPage, () => {
  fetchUsers();
});

const fetchUsers = async () => {
  loading.value = true;
  try {
    const params: Record<string, string> = {
      page: String(currentPage.value),
      limit: String(pageSize),
    };
    if (roleVal.value && roleVal.value !== 'all') params.role = roleVal.value;
    if (statusVal.value && statusVal.value !== 'all') params.status = statusVal.value;
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/users?${queryString}`, { method: 'GET' });
    if (response?.success && Array.isArray(response.data)) {
      users.value = response.data;
      const pag = response.pagination;
      totalItems.value = pag?.total ?? response.data.length;
    } else {
      users.value = [];
      totalItems.value = 0;
    }
  } catch (error: any) {
    console.error('Erreur lors du chargement des utilisateurs:', error);
    toast.add({ title: 'Erreur de chargement', description: error?.message, color: 'red' });
    users.value = [];
    totalItems.value = 0;
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

/** Libellé d'adresse utilisateur (objet, chaîne ou JSON stringifié) */
function getAddressLabel(address: any): string {
  const line = labelFromAppointmentAddressField(address);
  return line || '—';
}

const getActionItems = (user: any) => {
  const profileUrl = `/profile?userId=${user.id}`;
  const main: any[] = [
    { label: 'Voir le détail', icon: 'i-lucide-eye', onSelect: () => navigateTo(profileUrl) },
    { label: 'Historique des incidents', icon: 'i-lucide-shield-alert', onSelect: () => navigateTo(profileUrl) },
    { label: 'Envoyer reset mot de passe', icon: 'i-lucide-mail', onSelect: () => sendPasswordResetEmail(user.id) },
    { label: 'Mot de passe temporaire', icon: 'i-lucide-key-round', onSelect: () => setTemporaryPassword(user.id) },
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

const sendPasswordResetEmail = async (id: string) => {
  if (!confirm('Envoyer un email de réinitialisation du mot de passe ?')) return;
  try {
    const response = await apiFetch(`/users/${id}/password/reset-email`, { method: 'POST' });
    if (response.success) {
      toast.add({ title: 'Email envoyé', color: 'green' });
    } else {
      toast.add({ title: 'Erreur', description: response.error, color: 'red' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  }
};

const setTemporaryPassword = async (id: string) => {
  const custom = prompt('Mot de passe temporaire (laisser vide pour générer automatiquement) :');
  if (custom === null) return;
  try {
    const response = await apiFetch(`/users/${id}/password/temporary`, {
      method: 'POST',
      body: custom.trim() ? { password: custom.trim() } : {},
    });
    if (response.success && response.data?.temporary_password) {
      toast.add({
        title: 'Mot de passe temporaire',
        description: `Copiez-le maintenant : ${response.data.temporary_password}`,
        color: 'green',
      });
    } else if (response.success) {
      toast.add({ title: 'Mot de passe temporaire défini', color: 'green' });
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
