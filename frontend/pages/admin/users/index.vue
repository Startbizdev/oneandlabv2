<template>
  <div class="space-y-6">
    <TitleDashboard title="Gestion des utilisateurs" description="Gérez les utilisateurs : nom, prénom, email, rôle et types de soins.">
      <template #actions>
        <UButton color="primary" icon="i-lucide-plus" @click="openUserFormModal('create')">
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
              <p class="font-semibold text-foreground truncate">
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
            <UButton size="xs" variant="ghost" icon="i-lucide-eye" @click="viewUser((row.original ?? row).id)">
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

    <!-- Sheet unique : voir / créer / modifier (détails + modération + incidents dans le sheet) -->
    <ClientOnly>
      <Teleport to="body">
        <!-- Sheet unique : Voir / Créer / Modifier (détails, modération, incidents dans le sheet) -->
        <USlideover
          v-model:open="showUserFormModal"
          :title="sheetTitle"
          :description="sheetDescription"
          :ui="{ width: 'max-w-2xl', body: 'flex flex-col overflow-hidden', footer: 'justify-end gap-2' }"
        >
          <template #body>
            <!-- Mode Voir : tout en lecture (identité, adresse, infos, types de soins, dates, modération, incidents) -->
            <div v-if="userFormMode === 'view' && selectedUser" class="flex flex-col flex-1 min-h-0 overflow-y-auto p-1 space-y-6">
              <section class="space-y-2">
                <h3 class="text-sm font-semibold text-muted border-b border-default pb-1.5">Identité</h3>
                <div class="grid gap-2 text-sm">
                  <div><span class="text-muted">Email</span><span class="ml-2 font-medium">{{ selectedUser.email || '—' }}</span></div>
                  <template v-if="selectedUser.role === 'lab' || selectedUser.role === 'subaccount'">
                    <div><span class="text-muted">Nom d'entité</span><span class="ml-2 font-medium">{{ selectedUser.company_name || '—' }}</span></div>
                  </template>
                  <template v-else>
                    <div><span class="text-muted">Prénom</span><span class="ml-2 font-medium">{{ selectedUser.first_name || '—' }}</span></div>
                    <div><span class="text-muted">Nom</span><span class="ml-2 font-medium">{{ selectedUser.last_name || '—' }}</span></div>
                  </template>
                  <div><span class="text-muted">Téléphone</span><span class="ml-2 font-medium">{{ selectedUser.phone || '—' }}</span></div>
                  <div><span class="text-muted">Rôle</span><span class="ml-2"><UBadge :color="getRoleColor(selectedUser.role)" variant="soft" size="xs">{{ getRoleLabel(selectedUser.role) }}</UBadge></span></div>
                </div>
              </section>
              <section v-if="selectedUser.address" class="space-y-2">
                <h3 class="text-sm font-semibold text-muted border-b border-default pb-1.5">Adresse</h3>
                <p class="text-sm">{{ getAddressLabel(selectedUser.address) }}</p>
              </section>
              <section v-if="selectedUser.gender || selectedUser.birth_date || selectedUser.rpps || selectedUser.adeli || selectedUser.siret" class="space-y-2">
                <h3 class="text-sm font-semibold text-muted border-b border-default pb-1.5">Informations complémentaires</h3>
                <div class="grid gap-2 text-sm">
                  <div v-if="selectedUser.gender"><span class="text-muted">Genre</span><span class="ml-2 font-medium">{{ selectedUser.gender }}</span></div>
                  <div v-if="selectedUser.birth_date"><span class="text-muted">Date de naissance</span><span class="ml-2 font-medium">{{ formatDateShort(selectedUser.birth_date) }}</span></div>
                  <div v-if="selectedUser.rpps"><span class="text-muted">RPPS</span><span class="ml-2 font-medium">{{ selectedUser.rpps }}</span></div>
                  <div v-if="selectedUser.adeli"><span class="text-muted">Adeli</span><span class="ml-2 font-medium">{{ selectedUser.adeli }}</span></div>
                  <div v-if="selectedUser.siret"><span class="text-muted">SIRET</span><span class="ml-2 font-medium">{{ selectedUser.siret }}</span></div>
                </div>
              </section>
              <section class="space-y-2">
                <h3 class="text-sm font-semibold text-muted border-b border-default pb-1.5">Types de soins</h3>
                <div v-if="hasCareTypes(selectedUser.role)" class="flex flex-wrap gap-1.5">
                  <UBadge v-if="showPriseDeSang(selectedUser.role)" color="error" variant="soft" size="sm" leading-icon="i-lucide-syringe">Prise de sang</UBadge>
                  <UBadge v-if="showSoinsInfirmiers(selectedUser.role)" color="info" variant="soft" size="sm" leading-icon="i-lucide-stethoscope">Soins infirmiers</UBadge>
                </div>
                <span v-else class="text-sm text-muted">Non applicable</span>
              </section>
              <section class="space-y-2">
                <h3 class="text-sm font-semibold text-muted border-b border-default pb-1.5">Dates</h3>
                <div class="grid gap-2 text-sm">
                  <div><span class="text-muted">Inscrit le</span><span class="ml-2 font-medium">{{ formatDate(selectedUser.created_at) }}</span></div>
                  <div v-if="selectedUser.updated_at"><span class="text-muted">Dernière modification</span><span class="ml-2 font-medium">{{ formatDate(selectedUser.updated_at) }}</span></div>
                </div>
              </section>
              <section class="space-y-2">
                <h3 class="text-sm font-semibold text-muted border-b border-default pb-1.5">Modération</h3>
                <div class="grid gap-2 text-sm">
                  <div class="flex items-center gap-2">
                    <span class="text-muted">Statut</span>
                    <UBadge v-if="selectedUser.banned_until && new Date(selectedUser.banned_until) > new Date('9999-12-30')" color="error" variant="soft" size="sm">Banni</UBadge>
                    <UBadge v-else-if="isSuspended(selectedUser)" color="warning" variant="soft" size="sm">Suspendu</UBadge>
                    <UBadge v-else color="success" variant="soft" size="sm">Actif</UBadge>
                  </div>
                  <div><span class="text-muted">Incidents</span><span class="ml-2 font-medium">{{ selectedUser.incident_count ?? 0 }}</span></div>
                  <div v-if="selectedUser.last_incident_at"><span class="text-muted">Dernier incident</span><span class="ml-2 font-medium">{{ formatDate(selectedUser.last_incident_at) }}</span></div>
                  <div v-if="selectedUser.banned_until"><span class="text-muted">Banni jusqu'au</span><span class="ml-2 font-medium">{{ formatDate(selectedUser.banned_until) }}</span></div>
                </div>
              </section>
              <section class="space-y-2">
                <h3 class="text-sm font-semibold text-muted border-b border-default pb-1.5">Historique des incidents</h3>
                <div v-if="incidents.length === 0" class="text-sm text-muted py-2">Aucun incident enregistré.</div>
                <div v-else class="space-y-2">
                  <div
                    v-for="incident in incidents"
                    :key="incident.id"
                    class="p-3 rounded-lg border border-default bg-muted/20 text-sm"
                  >
                    <div class="font-medium">{{ getIncidentLabel(incident.action) }}</div>
                    <div class="text-muted mt-1">{{ formatDate(incident.created_at) }}</div>
                    <div v-if="incident.details?.reason" class="mt-1">Raison : {{ incident.details.reason }}</div>
                    <div v-if="incident.details?.days" class="mt-1">Durée : {{ incident.details.days }} jours</div>
                  </div>
                </div>
              </section>
            </div>

            <!-- Mode Créer / Modifier : formulaire -->
            <form v-else id="admin-user-form" class="flex flex-col flex-1 min-h-0 overflow-y-auto" @submit.prevent="submitUserForm">
              <div class="space-y-6 p-1">
                <!-- Rôle (en premier pour afficher les champs adaptés) -->
                <UFormField label="Rôle" required>
                  <USelect
                    v-model="userForm.role"
                    :items="createRoleOptions"
                    value-key="value"
                    placeholder="Choisir un rôle"
                    size="md"
                    class="w-full"
                    :disabled="userFormMode === 'edit'"
                  />
                </UFormField>

                <!-- Identité : lab/subaccount = Nom d'entité ; autres = Prénom + Nom -->
                <template v-if="isEntityRole(userForm.role)">
                  <UFormField label="Nom d'entité (raison sociale)" required>
                    <UInput v-model="userForm.company_name" placeholder="Labo Marseille Nord" size="md" class="w-full" />
                  </UFormField>
                </template>
                <template v-else>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <UFormField label="Prénom" required>
                      <UInput v-model="userForm.first_name" placeholder="Prénom" size="md" class="w-full" autocomplete="given-name" />
                    </UFormField>
                    <UFormField label="Nom" required>
                      <UInput v-model="userForm.last_name" placeholder="Nom" size="md" class="w-full" autocomplete="family-name" />
                    </UFormField>
                  </div>
                </template>

                <UFormField label="Email" required>
                  <UInput v-model="userForm.email" type="email" placeholder="email@exemple.fr" size="md" class="w-full" :disabled="userFormMode === 'edit'" />
                </UFormField>
                <UFormField label="Téléphone">
                  <UInput v-model="userForm.phone" type="tel" placeholder="06 12 34 56 78" size="md" class="w-full" />
                </UFormField>

                <!-- Adresse (BAN) : tous sauf admin — le composant affiche déjà le label "Adresse" -->
                <div v-if="!isAdminRole(userForm.role)" class="space-y-1">
                  <AddressSelector
                    v-model="userForm.address"
                    placeholder="Rechercher une adresse (BAN)..."
                  />
                </div>

                <!-- Lab (subaccount / préleveur) : recherche temps réel -->
                <template v-if="isLabLinkedRole(userForm.role)">
                  <UFormField label="Laboratoire rattaché">
                    <UInput
                      v-model="labSearchQuery"
                      placeholder="Rechercher un laboratoire..."
                      size="md"
                      class="w-full"
                      autocomplete="off"
                    />
                    <div v-if="labSearchQuery.length >= 1" class="mt-2 border border-default rounded-lg max-h-48 overflow-y-auto">
                      <button
                        v-for="lab in filteredLabs"
                        :key="lab.id"
                        type="button"
                        class="w-full px-4 py-2 text-left hover:bg-muted/50 flex items-center justify-between"
                        @click="selectLab(lab)"
                      >
                        <span>{{ lab.company_name || lab.email || lab.id }}</span>
                        <span v-if="userForm.lab_id === lab.id" class="text-primary">✓</span>
                      </button>
                      <p v-if="filteredLabs.length === 0" class="px-4 py-2 text-sm text-muted">Aucun laboratoire trouvé</p>
                    </div>
                    <p v-if="userForm.lab_id && selectedLabLabel" class="mt-1 text-sm text-muted">{{ selectedLabLabel }}</p>
                  </UFormField>
                </template>

                <!-- Infirmier : RPPS, Adeli -->
                <template v-if="userForm.role === 'nurse'">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <UFormField label="RPPS">
                      <UInput v-model="userForm.rpps" placeholder="10001234567" size="md" class="w-full" />
                    </UFormField>
                    <UFormField label="Adeli">
                      <UInput v-model="userForm.adeli" placeholder="139012345" size="md" class="w-full" />
                    </UFormField>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <UFormField label="Genre">
                      <USelect v-model="userForm.gender" :items="[{ label: 'Homme', value: 'M' }, { label: 'Femme', value: 'F' }]" value-key="value" placeholder="—" size="md" class="w-full" />
                    </UFormField>
                    <UFormField label="Date de naissance">
                      <UInput v-model="userForm.birth_date" type="date" size="md" class="w-full" />
                    </UFormField>
                  </div>
                  <!-- Types de soins (infirmier) : recherche + toggles -->
                  <UFormField label="Types de soins proposés">
                    <UInput v-model="careTypesSearch" placeholder="Rechercher un type de soin..." size="md" class="w-full mb-2" />
                    <div class="border border-default rounded-lg divide-y divide-default max-h-48 overflow-y-auto">
                      <label
                        v-for="cat in filteredCareCategories"
                        :key="cat.id"
                        class="flex items-center justify-between gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer"
                      >
                        <span class="text-sm">{{ cat.name }}</span>
                        <USwitch v-model="carePreferencesMap[cat.id]" />
                      </label>
                    </div>
                  </UFormField>
                </template>

                <!-- Lab : SIRET + Types de soins -->
                <template v-if="userForm.role === 'lab'">
                  <UFormField label="SIRET">
                    <UInput v-model="userForm.siret" placeholder="12345678901234" size="md" class="w-full" />
                  </UFormField>
                  <UFormField label="Types de soins proposés">
                    <UInput v-model="careTypesSearch" placeholder="Rechercher un type de soin..." size="md" class="w-full mb-2" />
                    <div class="border border-default rounded-lg divide-y divide-default max-h-48 overflow-y-auto">
                      <label
                        v-for="cat in filteredCareCategories"
                        :key="cat.id"
                        class="flex items-center justify-between gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer"
                      >
                        <span class="text-sm">{{ cat.name }}</span>
                        <USwitch v-model="carePreferencesMap[cat.id]" />
                      </label>
                    </div>
                  </UFormField>
                </template>

                <!-- Patient / Pro : genre, date naissance, adresse déjà au-dessus -->
                <template v-if="userForm.role === 'patient' || userForm.role === 'pro'">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <UFormField label="Genre">
                      <USelect v-model="userForm.gender" :items="[{ label: 'Homme', value: 'M' }, { label: 'Femme', value: 'F' }]" value-key="value" placeholder="—" size="md" class="w-full" />
                    </UFormField>
                    <UFormField label="Date de naissance">
                      <UInput v-model="userForm.birth_date" type="date" size="md" class="w-full" />
                    </UFormField>
                  </div>
                </template>
              </div>
            </form>
          </template>
          <template #footer="{ close }">
            <template v-if="userFormMode === 'view'">
              <UButton variant="ghost" @click="close()">Fermer</UButton>
              <UButton color="primary" icon="i-lucide-pencil" @click="switchViewToEdit">
                Modifier
              </UButton>
            </template>
            <template v-else>
              <UButton variant="ghost" @click="close()">Annuler</UButton>
              <UButton
                type="submit"
                form="admin-user-form"
                color="primary"
                :loading="savingUserForm"
                :disabled="!canSubmitUserForm"
              >
                {{ userFormMode === 'create' ? 'Créer' : 'Enregistrer' }}
              </UButton>
            </template>
          </template>
        </USlideover>
      </Teleport>
    </ClientOnly>
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

const users = ref<any[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const roleFilter = ref('all');
const statusFilter = ref('all');

const showUserFormModal = ref(false);
const userFormMode = ref<'create' | 'edit' | 'view'>('create');
const editingUserId = ref<string | null>(null);
const selectedUser = ref<any>(null);
const selectedUserId = ref<string | null>(null);
const incidents = ref<any[]>([]);
const savingUserForm = ref(false);

const userForm = ref<{
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  address: { label: string; lat?: number; lng?: number; street?: string; city?: string; postcode?: string } | null;
  gender: string;
  birth_date: string;
  rpps: string;
  adeli: string;
  company_name: string;
  siret: string;
  lab_id: string;
}>({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'patient',
  address: null,
  gender: '',
  birth_date: '',
  rpps: '',
  adeli: '',
  company_name: '',
  siret: '',
  lab_id: '',
});

const labs = ref<any[]>([]);
const labSearchQuery = ref('');
const careCategories = ref<any[]>([]);
const carePreferencesMap = ref<Record<string, boolean>>({});
const careTypesSearch = ref('');

const isEntityRole = (role: string) => role === 'lab' || role === 'subaccount';
const isAdminRole = (role: string) => role === 'super_admin';
const isLabLinkedRole = (role: string) => role === 'subaccount' || role === 'preleveur';

const filteredLabs = computed(() => {
  const q = labSearchQuery.value.toLowerCase().trim();
  if (!q) return labs.value.slice(0, 20);
  return labs.value.filter(
    (l) =>
      (l.company_name && l.company_name.toLowerCase().includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q))
  ).slice(0, 20);
});

const selectedLabLabel = computed(() => {
  if (!userForm.value.lab_id) return '';
  const lab = labs.value.find((l) => l.id === userForm.value.lab_id);
  return lab ? (lab.company_name || lab.email || lab.id) : '';
});

const filteredCareCategories = computed(() => {
  const q = careTypesSearch.value.toLowerCase().trim();
  if (!q) return careCategories.value;
  return careCategories.value.filter(
    (c) => (c.name && c.name.toLowerCase().includes(q)) || (c.description && c.description.toLowerCase().includes(q))
  );
});

const canSubmitUserForm = computed(() => {
  const r = typeof userForm.value.role === 'object' && userForm.value.role?.value != null ? userForm.value.role.value : userForm.value.role;
  if (!userForm.value.email?.trim() || !r) return false;
  if (isEntityRole(r)) return !!userForm.value.company_name?.trim();
  return !!userForm.value.first_name?.trim() && !!userForm.value.last_name?.trim();
});

const sheetTitle = computed(() => {
  if (userFormMode.value === 'view') return 'Détails utilisateur';
  if (userFormMode.value === 'create') return 'Créer un utilisateur';
  return 'Modifier l\'utilisateur';
});

const sheetDescription = computed(() => {
  if (userFormMode.value === 'view') return 'Toutes les informations du compte, modération et incidents.';
  return 'Toutes les informations du compte selon le rôle.';
});

function selectLab(lab: any) {
  userForm.value.lab_id = lab.id;
}

function fillUserFormFromUser(user: any) {
  const addr = user?.address;
  const addressObj = typeof addr === 'object' && addr && 'label' in addr ? addr : (typeof addr === 'string' && addr ? { label: addr } : null);
  userForm.value = {
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    role: (typeof user?.role === 'object' && user?.role?.value != null) ? user.role.value : (user?.role ?? 'patient'),
    address: addressObj,
    gender: user?.gender ?? '',
    birth_date: user?.birth_date ? user.birth_date.slice(0, 10) : '',
    rpps: user?.rpps ?? '',
    adeli: user?.adeli ?? '',
    company_name: user?.company_name ?? '',
    siret: user?.siret ?? '',
    lab_id: user?.lab_id ?? '',
  };
}

function switchViewToEdit() {
  if (!selectedUser.value) return;
  userFormMode.value = 'edit';
  editingUserId.value = selectedUser.value.id;
  fillUserFormFromUser(selectedUser.value);
  labSearchQuery.value = '';
  careTypesSearch.value = '';
  if (selectedUser.value.role === 'nurse') {
    apiFetch(`/users/${selectedUser.value.id}/nurse-category-preferences`, { method: 'GET' }).then((res) => {
      if (res?.success && Array.isArray(res.data)) {
        const map: Record<string, boolean> = {};
        res.data.forEach((p: any) => { map[p.category_id] = !!p.is_enabled; });
        carePreferencesMap.value = map;
      }
    });
  } else if (selectedUser.value.role === 'lab') {
    apiFetch(`/users/${selectedUser.value.id}/lab-category-preferences`, { method: 'GET' }).then((res) => {
      if (res?.success && Array.isArray(res.data)) {
        const map: Record<string, boolean> = {};
        res.data.forEach((p: any) => { map[p.category_id] = !!p.is_enabled; });
        carePreferencesMap.value = map;
      }
    });
  }
  if (isLabLinkedRole(selectedUser.value.role) && labs.value.length === 0) {
    apiFetch('/users?role=lab&limit=200', { method: 'GET' }).then((res) => {
      if (res?.success && Array.isArray(res.data)) labs.value = res.data;
    });
  }
  if (careCategories.value.length === 0) {
    apiFetch('/categories?include_inactive=true', { method: 'GET' }).then((res) => {
      if (res?.success && Array.isArray(res.data)) careCategories.value = res.data;
    });
  }
}

/** Rôles proposés à la création (alignés API : sans admin) */
const createRoleOptions = [
  { label: 'Patient', value: 'patient' },
  { label: 'Professionnel', value: 'pro' },
  { label: 'Infirmier', value: 'nurse' },
  { label: 'Laboratoire', value: 'lab' },
  { label: 'Sous-compte', value: 'subaccount' },
  { label: 'Préleveur', value: 'preleveur' },
  { label: 'Super Admin', value: 'super_admin' },
];

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

async function openUserFormModal(mode: 'create' | 'edit', user?: any) {
  userFormMode.value = mode;
  editingUserId.value = mode === 'edit' && user?.id ? user.id : null;
  labSearchQuery.value = '';
  careTypesSearch.value = '';
  carePreferencesMap.value = {};

  if (mode === 'edit' && user?.id) {
    try {
      const res = await apiFetch(`/users/${user.id}`, { method: 'GET' });
      if (res?.success && res?.data) user = res.data;
    } catch (_e) {}
    const addr = user?.address;
    const addressObj = typeof addr === 'object' && addr && 'label' in addr ? addr : (typeof addr === 'string' && addr ? { label: addr } : null);
    userForm.value = {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      role: (typeof user?.role === 'object' && user?.role?.value != null) ? user.role.value : (user?.role ?? 'patient'),
      address: addressObj,
      gender: user?.gender ?? '',
      birth_date: user?.birth_date ? user.birth_date.slice(0, 10) : '',
      rpps: user?.rpps ?? '',
      adeli: user?.adeli ?? '',
      company_name: user?.company_name ?? '',
      siret: user?.siret ?? '',
      lab_id: user?.lab_id ?? '',
    };
    if (user?.role === 'nurse') {
      const catsRes = await apiFetch(`/users/${user.id}/nurse-category-preferences`, { method: 'GET' });
      if (catsRes?.success && Array.isArray(catsRes.data)) {
        const map: Record<string, boolean> = {};
        catsRes.data.forEach((p: any) => { map[p.category_id] = !!p.is_enabled; });
        carePreferencesMap.value = map;
      }
      const listRes = await apiFetch('/categories?include_inactive=true', { method: 'GET' });
      if (listRes?.success && Array.isArray(listRes.data)) careCategories.value = listRes.data;
    } else if (user?.role === 'lab') {
      const catsRes = await apiFetch(`/users/${user.id}/lab-category-preferences`, { method: 'GET' });
      if (catsRes?.success && Array.isArray(catsRes.data)) {
        const map: Record<string, boolean> = {};
        catsRes.data.forEach((p: any) => { map[p.category_id] = !!p.is_enabled; });
        carePreferencesMap.value = map;
      }
      const listRes = await apiFetch('/categories?include_inactive=true', { method: 'GET' });
      if (listRes?.success && Array.isArray(listRes.data)) careCategories.value = listRes.data;
    }
  } else {
    userForm.value = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: 'patient',
      address: null,
      gender: '',
      birth_date: '',
      rpps: '',
      adeli: '',
      company_name: '',
      siret: '',
      lab_id: '',
    };
    const listRes = await apiFetch('/categories?include_inactive=true', { method: 'GET' });
    if (listRes?.success && Array.isArray(listRes.data)) {
      careCategories.value = listRes.data;
      careCategories.value.forEach((c: any) => { carePreferencesMap.value[c.id] = true; });
    }
  }

  const r = typeof userForm.value.role === 'object' && userForm.value.role?.value != null ? userForm.value.role.value : userForm.value.role;
  if (isLabLinkedRole(r)) {
    const labsRes = await apiFetch('/users?role=lab&limit=200', { method: 'GET' });
    if (labsRes?.success && Array.isArray(labsRes.data)) labs.value = labsRes.data;
  }

  showUserFormModal.value = true;
}

watch(showUserFormModal, (open) => {
  if (!open) {
    editingUserId.value = null;
    userFormMode.value = 'create';
    selectedUser.value = null;
    selectedUserId.value = null;
  }
});

watch(() => userForm.value.role, (role) => {
  const r = typeof role === 'object' && role?.value != null ? role.value : role;
  if (isLabLinkedRole(r) && labs.value.length === 0) {
    apiFetch('/users?role=lab&limit=200', { method: 'GET' }).then((res) => {
      if (res?.success && Array.isArray(res.data)) labs.value = res.data;
    });
  }
  if (r === 'lab' && careCategories.value.length > 0 && Object.keys(carePreferencesMap.value).length === 0) {
    careCategories.value.forEach((c: any) => { carePreferencesMap.value[c.id] = true; });
  }
});

function buildUserFormRoleValue() {
  const role = userForm.value.role;
  return (typeof role === 'object' && role?.value != null) ? role.value : role;
}

const submitUserForm = async () => {
  const r = buildUserFormRoleValue();
  if (!userForm.value.email?.trim() || !r) {
    toast.add({ title: 'Champs requis', description: 'Email et rôle sont obligatoires.', color: 'error' });
    return;
  }
  if (isEntityRole(r) && !userForm.value.company_name?.trim()) {
    toast.add({ title: 'Champs requis', description: 'Nom d\'entité requis pour lab/sous-compte.', color: 'error' });
    return;
  }
  if (!isEntityRole(r) && (!userForm.value.first_name?.trim() || !userForm.value.last_name?.trim())) {
    toast.add({ title: 'Champs requis', description: 'Prénom et nom sont obligatoires.', color: 'error' });
    return;
  }

  savingUserForm.value = true;
  try {
    const addressBody = userForm.value.address && typeof userForm.value.address === 'object' && userForm.value.address.label?.trim()
      ? { label: userForm.value.address.label.trim(), lat: userForm.value.address.lat, lng: userForm.value.address.lng }
      : null;

    if (userFormMode.value === 'create') {
      const body: any = {
        email: userForm.value.email.trim(),
        first_name: isEntityRole(r) ? '' : (userForm.value.first_name ?? '').trim(),
        last_name: isEntityRole(r) ? (userForm.value.company_name ?? '').trim() : (userForm.value.last_name ?? '').trim(),
        role: r,
        phone: userForm.value.phone?.trim() || undefined,
      };
      if (isEntityRole(r)) body.company_name = userForm.value.company_name?.trim();
      if (isLabLinkedRole(r) && userForm.value.lab_id) body.lab_id = userForm.value.lab_id;
      const response = await apiFetch('/users', { method: 'POST', body });
      if (response?.success) {
        const newId = (response as any)?.data?.id;
        if (newId) {
          const updateBody: any = {};
          if (addressBody) updateBody.address = addressBody;
          if (userForm.value.gender?.trim()) updateBody.gender = userForm.value.gender.trim();
          if (userForm.value.birth_date?.trim()) updateBody.birth_date = userForm.value.birth_date.trim();
          if (userForm.value.rpps?.trim()) updateBody.rpps = userForm.value.rpps.trim();
          if (userForm.value.adeli?.trim()) updateBody.adeli = userForm.value.adeli.trim();
          if (userForm.value.siret?.trim()) updateBody.siret = userForm.value.siret.trim();
          if (userForm.value.company_name?.trim() && isEntityRole(r)) updateBody.company_name = userForm.value.company_name.trim();
          if (Object.keys(updateBody).length > 0) {
            await apiFetch(`/users/${newId}`, { method: 'PUT', body: updateBody });
          }
        }
        if (r === 'lab' && newId && Object.keys(carePreferencesMap.value).length > 0) {
          const prefs = Object.entries(carePreferencesMap.value).map(([category_id, is_enabled]) => ({ category_id, is_enabled }));
          await apiFetch(`/users/${newId}/lab-category-preferences`, { method: 'PUT', body: { preferences: prefs } });
        }
        if (r === 'nurse' && newId && Object.keys(carePreferencesMap.value).length > 0) {
          const prefs = Object.entries(carePreferencesMap.value).map(([category_id, is_enabled]) => ({ category_id, is_enabled }));
          await apiFetch(`/users/${newId}/nurse-category-preferences`, { method: 'PUT', body: { preferences: prefs } });
        }
        toast.add({ title: 'Utilisateur créé', color: 'success' });
        showUserFormModal.value = false;
        await fetchUsers();
      } else {
        toast.add({ title: 'Erreur', description: (response as any)?.error || 'Impossible de créer l\'utilisateur.', color: 'error' });
      }
    } else {
      const id = editingUserId.value;
      if (!id) return;
      const body: any = {
        first_name: (userForm.value.first_name ?? '').trim(),
        last_name: (userForm.value.last_name ?? '').trim(),
        phone: userForm.value.phone?.trim() || null,
        address: addressBody,
        gender: userForm.value.gender?.trim() || null,
        birth_date: userForm.value.birth_date?.trim() || null,
        rpps: userForm.value.rpps?.trim() || null,
        adeli: userForm.value.adeli?.trim() || null,
        company_name: userForm.value.company_name?.trim() || null,
        siret: userForm.value.siret?.trim() || null,
        lab_id: userForm.value.lab_id || null,
      };
      const response = await apiFetch(`/users/${id}`, { method: 'PUT', body });
      if (response?.success) {
        if (r === 'nurse' && Object.keys(carePreferencesMap.value).length > 0) {
          const prefs = Object.entries(carePreferencesMap.value).map(([category_id, is_enabled]) => ({ category_id, is_enabled }));
          await apiFetch(`/users/${id}/nurse-category-preferences`, { method: 'PUT', body: { preferences: prefs } });
        }
        if (r === 'lab' && Object.keys(carePreferencesMap.value).length > 0) {
          const prefs = Object.entries(carePreferencesMap.value).map(([category_id, is_enabled]) => ({ category_id, is_enabled }));
          await apiFetch(`/users/${id}/lab-category-preferences`, { method: 'PUT', body: { preferences: prefs } });
        }
        toast.add({ title: 'Profil mis à jour', color: 'success' });
        showUserFormModal.value = false;
        await fetchUsers();
        if (selectedUser.value?.id === id) {
          const u = users.value.find(us => us.id === id);
          if (u) selectedUser.value = u;
        }
      } else {
        toast.add({ title: 'Erreur', description: (response as any)?.error ?? 'Échec de la mise à jour', color: 'error' });
      }
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error?.message || 'Une erreur est survenue.', color: 'error' });
  } finally {
    savingUserForm.value = false;
  }
};

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

const loadingUserDetail = ref(false);
const viewUser = async (id: string) => {
  loadingUserDetail.value = true;
  userFormMode.value = 'view';
  try {
    const response = await apiFetch(`/users/${id}`, { method: 'GET' });
    if (response?.success && response?.data) {
      selectedUser.value = response.data;
    } else {
      const user = users.value.find(u => u.id === id);
      if (user) selectedUser.value = user;
    }
    if (selectedUser.value) {
      selectedUserId.value = id;
      try {
        const incRes = await apiFetch(`/users/${id}/incidents`, { method: 'GET' });
        incidents.value = incRes?.success && incRes?.data?.incidents ? incRes.data.incidents : [];
      } catch (_e) {
        incidents.value = [];
      }
      showUserFormModal.value = true;
    }
  } catch (_e) {
    const user = users.value.find(u => u.id === id);
    if (user) {
      selectedUser.value = user;
      selectedUserId.value = id;
      try {
        const incRes = await apiFetch(`/users/${id}/incidents`, { method: 'GET' });
        incidents.value = incRes?.success && incRes?.data?.incidents ? incRes.data.incidents : [];
      } catch (_e2) {
        incidents.value = [];
      }
      showUserFormModal.value = true;
    }
  } finally {
    loadingUserDetail.value = false;
  }
};

const viewIncidents = (id: string) => {
  viewUser(id);
};

const getActionItems = (user: any) => {
  const main: any[] = [
    { label: 'Voir le détail', icon: 'i-lucide-eye', onSelect: () => viewUser(user.id) },
    { label: 'Historique des incidents', icon: 'i-lucide-shield-alert', onSelect: () => viewIncidents(user.id) },
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
      if (selectedUser.value?.id === id) {
        const res = await apiFetch(`/users/${id}`, { method: 'GET' });
        if (res?.success && res?.data) selectedUser.value = res.data;
        const incRes = await apiFetch(`/users/${id}/incidents`, { method: 'GET' });
        if (incRes?.success && incRes?.data?.incidents) incidents.value = incRes.data.incidents;
      }
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
      if (selectedUser.value?.id === id) {
        const res = await apiFetch(`/users/${id}`, { method: 'GET' });
        if (res?.success && res?.data) selectedUser.value = res.data;
        const incRes = await apiFetch(`/users/${id}/incidents`, { method: 'GET' });
        if (incRes?.success && incRes?.data?.incidents) incidents.value = incRes.data.incidents;
      }
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
      if (selectedUser.value?.id === id) {
        const res = await apiFetch(`/users/${id}`, { method: 'GET' });
        if (res?.success && res?.data) selectedUser.value = res.data;
        const incRes = await apiFetch(`/users/${id}/incidents`, { method: 'GET' });
        if (incRes?.success && incRes?.data?.incidents) incidents.value = incRes.data.incidents;
      }
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
      if (selectedUser.value?.id === id) {
        selectedUser.value = null;
      }
      if (selectedUserId.value === id) selectedUserId.value = null;
      showUserFormModal.value = false;
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
