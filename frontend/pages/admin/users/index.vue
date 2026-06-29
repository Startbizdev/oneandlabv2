<template>
  <AppPageShell class="space-y-4 sm:space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Gestion des utilisateurs"
        description="Gérez les utilisateurs : nom, prénom, email, rôle et types de soins."
      >
        <template #actions>
          <UButton
            color="primary"
            icon="i-lucide-plus"
            to="/admin/users/new"
            class="min-h-10 w-full justify-center sm:w-auto sm:min-h-9"
          >
            <span class="sm:hidden">Créer</span>
            <span class="hidden sm:inline">Créer un utilisateur</span>
          </UButton>
        </template>
      </AppPageHeader>
    </template>

  <div
    class="sticky top-0 z-20 -mx-1 px-1 pb-2 pt-0.5 backdrop-blur-md supports-[backdrop-filter]:bg-app-canvas/85 sm:static sm:z-auto sm:mx-0 sm:px-0 sm:pb-0 sm:pt-0 sm:backdrop-blur-none"
  >
    <div
      class="flex flex-col gap-2.5 rounded-xl border border-gray-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:flex-wrap sm:items-center"
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
      <div class="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
        <USelect
          v-model="roleFilter"
          :items="roleOptions"
          value-key="value"
          placeholder="Rôle"
          size="sm"
          class="min-w-0 sm:min-w-[11rem]"
        />
        <USelect
          v-model="statusFilter"
          :items="statusOptions"
          value-key="value"
          placeholder="Statut"
          size="sm"
          class="min-w-0 sm:min-w-[11rem]"
        />
      </div>
    </div>
  </div>

  <div
    class="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950"
  >
    <div v-if="loading" class="divide-y divide-gray-100 dark:divide-gray-800">
      <div
        v-for="i in 8"
        :key="i"
        class="flex animate-pulse flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:p-4"
      >
        <div class="flex flex-1 gap-3">
          <div class="h-10 w-10 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div class="min-w-0 flex-1 space-y-2">
            <div class="h-4 w-44 max-w-full rounded bg-gray-100 dark:bg-gray-800" />
            <div class="h-3 w-56 max-w-full rounded bg-gray-100 dark:bg-gray-800" />
            <div class="flex gap-2">
              <div class="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
              <div class="h-5 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        </div>
        <div class="flex w-full gap-2 sm:w-auto">
          <div class="h-10 flex-1 rounded-lg bg-gray-100 dark:bg-gray-800 sm:h-9 sm:w-20 sm:flex-none sm:rounded-full" />
          <div class="h-10 flex-1 rounded-lg bg-gray-100 dark:bg-gray-800 sm:h-9 sm:w-24 sm:flex-none sm:rounded-full" />
        </div>
      </div>
    </div>

    <div v-else-if="filteredUsers.length === 0" class="px-4 py-12 sm:py-14">
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

    <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
      <AdminUserListRow
        v-for="u in filteredUsers"
        :key="u.id"
        :user="u"
        :display-name="getUserDisplayName(u)"
        :role-label="getRoleLabel(u.role)"
        :role-color="getRoleColor(u.role)"
        :created-label="u.created_at ? formatDateShort(u.created_at) : '—'"
        :has-care-types="hasCareTypes(u.role)"
        :show-prise-de-sang="showPriseDeSang(u.role)"
        :show-soins-infirmiers="showSoinsInfirmiers(u.role)"
        :is-banned="Boolean(u.banned_until && new Date(u.banned_until) > new Date('9999-12-30'))"
        :is-suspended="isSuspended(u)"
        :highlighted="highlightedUserId === String(u.id)"
        :action-items="getActionItems(u)"
        @view="openUserProfile"
        @row-activate="openUserProfile"
      />
    </div>

    <div
      v-if="totalPages > 1"
      class="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-3 py-3 dark:border-gray-800 sm:flex-row sm:gap-4 sm:px-4 sm:py-3"
    >
      <p class="text-center text-xs text-gray-500 dark:text-gray-400 sm:text-left sm:text-sm">
        <span class="font-medium text-gray-700 dark:text-gray-300">
          {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalItems) }}
        </span>
        sur
        <span class="font-medium text-gray-700 dark:text-gray-300">{{ totalItems }}</span>
      </p>
      <UPagination
        v-model:page="currentPage"
        :total="totalItems"
        :items-per-page="pageSize"
        :sibling-count="paginationSiblings"
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
import { useListViewRestore } from '~/composables/useListViewRestore';

const toast = useAppToast();
const route = useRoute();
const router = useRouter();
const { prepareDetailNavigation, consumeRestore, restoreScrollTop } = useListViewRestore('admin-users');

const users = ref<any[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const debouncedSearch = ref('');
const roleFilter = ref('all');
const statusFilter = ref('all');
const currentPage = ref(1);
const pageSize = 20;
const totalItems = ref(0);
const highlightedUserId = ref<string | null>(null);

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, (q) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    debouncedSearch.value = q;
  }, 220);
}, { immediate: true });

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
  const query = debouncedSearch.value.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter((u) =>
      u.email?.toLowerCase().includes(query)
      || u.email_display?.toLowerCase().includes(query)
      || u.first_name?.toLowerCase().includes(query)
      || u.last_name?.toLowerCase().includes(query)
      || (u.company_name && u.company_name.toLowerCase().includes(query))
    );
  }
  return filtered;
});

const totalPages = computed(() => Math.ceil(Math.max(0, totalItems.value) / pageSize));

const paginationSiblings = computed(() => {
  if (!import.meta.client) return 1;
  return window.matchMedia('(max-width: 640px)').matches ? 0 : 2;
});

function listStateSnapshot() {
  return {
    searchQuery: searchQuery.value,
    roleFilter: roleFilter.value,
    statusFilter: statusFilter.value,
    currentPage: currentPage.value,
  };
}

function applyListState(state: Record<string, unknown>) {
  if (typeof state.searchQuery === 'string') searchQuery.value = state.searchQuery;
  if (state.roleFilter != null) roleFilter.value = state.roleFilter as string;
  if (state.statusFilter != null) statusFilter.value = state.statusFilter as string;
  if (typeof state.currentPage === 'number' && state.currentPage >= 1) {
    currentPage.value = state.currentPage;
  }
}

function openUserProfile(userId: string) {
  prepareDetailNavigation(listStateSnapshot(), userId);
  void navigateTo(`/profile?userId=${userId}`);
}

async function scrollToHighlightedUser(viewedId?: string) {
  if (!viewedId) return;
  highlightedUserId.value = viewedId;
  await nextTick();
  requestAnimationFrame(() => {
    const el = document.getElementById(`admin-user-row-${viewedId}`);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
  });
  setTimeout(() => {
    if (highlightedUserId.value === viewedId) highlightedUserId.value = null;
  }, 2800);
}

onMounted(async () => {
  const fromProfile =
    import.meta.client
    && (route.query.restore === '1' || document.referrer.includes('/profile'));
  const restored = fromProfile ? consumeRestore() : null;
  if (route.query.restore === '1') {
    await router.replace({ path: '/admin/users' });
  }
  if (restored?.state) applyListState(restored.state);
  await fetchUsers();
  if (restored) {
    if (restored.viewedId) {
      await scrollToHighlightedUser(restored.viewedId);
    } else {
      await restoreScrollTop(restored.scrollTop);
    }
  }
});

onUnmounted(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
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

const formatDateShort = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getActionItems = (user: any) => {
  const main: any[] = [
    { label: 'Voir le détail', icon: 'i-lucide-eye', onSelect: () => openUserProfile(String(user.id)) },
    { label: 'Historique des incidents', icon: 'i-lucide-shield-alert', onSelect: () => openUserProfile(String(user.id)) },
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
</script>
