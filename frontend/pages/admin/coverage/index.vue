<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Zones de couverture"
      description="Gérez les zones d'intervention des infirmiers : adresse de départ et rayon."
    >
      <template #actions>
        <UButton color="primary" icon="i-lucide-plus" @click="openCreateModal">
          Créer une zone
        </UButton>
      </template>
    </TitleDashboard>

    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
      <USelect
        v-model="roleFilter"
        :items="roleOptions"
        placeholder="Filtrer par rôle"
        class="w-full sm:w-48"
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        placeholder="Filtrer par statut"
        class="w-full sm:w-48"
      />
    </div>

    <div class="rounded-xl border border-default/50 bg-default shadow-sm overflow-hidden">
      <UTable :data="filteredZones" :columns="columns" :loading="loading">
        <template #owner-cell="{ row }">
          <span class="font-medium">{{ getOwnerName(row.original ?? row) }}</span>
        </template>
        <template #role-cell="{ row }">
          <UBadge :color="getRoleColor((row.original ?? row).role)" variant="soft" size="xs">
            {{ getRoleLabel((row.original ?? row).role) }}
          </UBadge>
        </template>
        <template #address-cell="{ row }">
          <span class="text-sm text-muted">{{ (row.original ?? row).owner_address_label || '—' }}</span>
        </template>
        <template #radius_km-cell="{ row }">
          <span class="font-medium">{{ (row.original ?? row).radius_km }} km</span>
        </template>
        <template #is_active-cell="{ row }">
          <UBadge :color="(row.original ?? row).is_active ? 'success' : 'neutral'" variant="soft" size="xs">
            {{ (row.original ?? row).is_active ? 'Actif' : 'Inactif' }}
          </UBadge>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" variant="outline" leading-icon="i-lucide-pencil" @click="editZone(row.original ?? row)">
              Modifier
            </UButton>
            <UButton
              size="xs"
              :color="(row.original ?? row).is_active ? 'error' : 'success'"
              variant="outline"
              @click="toggleZone(row.original ?? row)"
            >
              {{ (row.original ?? row).is_active ? 'Désactiver' : 'Activer' }}
            </UButton>
          </div>
        </template>
        <template #empty>
          <div class="py-12">
            <UEmpty
              icon="i-lucide-map"
              title="Aucune zone"
              description="Aucune zone de couverture. Créez une zone pour un infirmier (adresse + rayon)."
              :actions="[{ label: 'Créer une zone', variant: 'solid', onClick: openCreateModal }]"
              variant="naked"
            />
          </div>
        </template>
      </UTable>
    </div>

    <ClientOnly>
      <Teleport to="body">
        <UModal v-model:open="showCreateModal" :ui="{ content: 'max-w-lg w-full' }">
          <template #content="{ close }">
            <UCard class="w-full">
              <template #header>
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-xl font-normal text-foreground">
                    {{ editingZone ? 'Modifier la zone' : 'Créer une zone' }}
                  </h2>
                  <p class="text-sm text-muted mt-1">
                    {{ editingZone ? 'Modifiez le rayon et le statut.' : 'Choisissez un infirmier et définissez le rayon depuis son adresse.' }}
                  </p>
                </div>
                <UButton variant="ghost" color="neutral" icon="i-lucide-x" size="sm" aria-label="Fermer" @click="close()" />
              </div>
            </template>
            <UForm :state="zoneForm" @submit="saveZone" class="space-y-4">
              <UFormField v-if="!editingZone" label="Infirmier" name="owner_id" required class="w-full">
                <USelectMenu
                  v-model="selectedNurse"
                  :items="nurseSelectItems"
                  value-key="id"
                  :search-input="{ placeholder: 'Rechercher par nom ou email...' }"
                  :filter-fields="['label', 'email']"
                  placeholder="Choisir un infirmier"
                  size="md"
                  class="w-full"
                  @update:model-value="onNurseSelect"
                >
                  <template #leading>
                    <UIcon :name="selectedNurse ? 'i-lucide-user' : 'i-lucide-search'" :class="selectedNurse ? 'w-4 h-4 text-primary-500' : 'w-4 h-4 text-muted'" />
                  </template>
                  <template #item="{ item }">
                    <div class="flex flex-col py-1.5">
                      <span class="font-medium">{{ item.label }}</span>
                      <span class="text-xs text-muted">{{ item.email }}</span>
                    </div>
                  </template>
                </USelectMenu>
              </UFormField>

              <template v-if="editingZone">
                <UFormField :label="getRoleLabel(editingZone.role)" class="w-full">
                  <p class="text-sm font-medium text-foreground py-2">{{ getOwnerName(editingZone) }}</p>
                </UFormField>
              </template>

              <UFormField label="Adresse de départ" class="w-full">
                <p class="text-sm text-muted py-2">{{ zoneForm.address_label || '—' }}</p>
                <p v-if="!editingZone && selectedNurse && !zoneForm.address_label" class="text-xs text-amber-600">
                  L'infirmier n'a pas encore renseigné son adresse dans son profil. Il doit le faire depuis Paramètres.
                </p>
              </UFormField>

              <UFormField v-if="!editingZone" label="Coordonnées (centre)" name="center" class="w-full">
                <div class="grid grid-cols-2 gap-2">
                  <UInput v-model.number="zoneForm.center_lat" type="number" step="0.0001" placeholder="Latitude" size="md" class="w-full" />
                  <UInput v-model.number="zoneForm.center_lng" type="number" step="0.0001" placeholder="Longitude" size="md" class="w-full" />
                </div>
              </UFormField>

              <UFormField v-if="editingZone" label="Coordonnées (centre)" class="w-full">
                <div class="grid grid-cols-2 gap-2">
                  <UInput v-model.number="zoneForm.center_lat" type="number" step="0.0001" placeholder="Latitude" size="md" class="w-full" />
                  <UInput v-model.number="zoneForm.center_lng" type="number" step="0.0001" placeholder="Longitude" size="md" class="w-full" />
                </div>
              </UFormField>

              <UFormField label="Rayon (km)" name="radius_km" required class="w-full">
                <div class="flex items-center gap-3">
                  <USlider
                    v-model="zoneForm.radius_km"
                    :min="5"
                    :max="100"
                    :step="5"
                    class="flex-1"
                  />
                  <span class="font-normal text-primary-600 w-14">{{ zoneForm.radius_km }} km</span>
                </div>
              </UFormField>

              <UFormField label="Statut" name="is_active" class="w-full">
                <div class="flex items-center gap-3">
                  <USwitch v-model="zoneForm.is_active" />
                  <span class="text-sm text-muted">{{ zoneForm.is_active ? 'Actif' : 'Inactif' }}</span>
                </div>
              </UFormField>

              <div class="flex justify-end gap-2 pt-4 border-t border-default">
                <UButton variant="ghost" color="neutral" @click="close()">
                  Annuler
                </UButton>
                <UButton type="submit" color="primary" :loading="saving" :disabled="!canSave">
                  {{ editingZone ? 'Enregistrer' : 'Créer la zone' }}
                </UButton>
              </div>
            </UForm>
          </UCard>
          </template>
        </UModal>
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
const toast = useAppToast();

const zones = ref<any[]>([]);
const nurses = ref<any[]>([]);
const loading = ref(true);
const loadingNurses = ref(false);
const saving = ref(false);
const roleFilter = ref('all');
const statusFilter = ref('all');
const showCreateModal = ref(false);
const editingZone = ref<any>(null);
const selectedNurse = ref<{ id: string; label: string; email: string } | null>(null);
const selectedNurseProfile = ref<any>(null);

const roleOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'Infirmier', value: 'nurse' },
  { label: 'Laboratoire', value: 'lab' },
  { label: 'Sous-compte', value: 'subaccount' },
];

const statusOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'Actifs', value: 'active' },
  { label: 'Inactifs', value: 'inactive' },
];

const zoneForm = ref({
  owner_id: '',
  role: 'nurse',
  center_lat: 0,
  center_lng: 0,
  radius_km: 20,
  is_active: true,
  address_label: '',
});

const columns = [
  { id: 'owner', accessorKey: 'owner', header: 'Utilisateur' },
  { id: 'role', accessorKey: 'role', header: 'Rôle' },
  { id: 'address', accessorKey: 'owner_address_label', header: 'Adresse de départ' },
  { id: 'radius_km', accessorKey: 'radius_km', header: 'Rayon' },
  { id: 'is_active', accessorKey: 'is_active', header: 'Statut' },
  { id: 'actions', accessorKey: 'actions', header: 'Actions' },
];

const nurseSelectItems = computed(() => {
  return nurses.value.map((u: any) => ({
    id: u.id,
    label: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.id,
    email: u.email || '',
  }));
});

const filteredZones = computed(() => {
  let filtered = zones.value;
  const roleVal = typeof roleFilter.value === 'object' && roleFilter.value?.value != null ? (roleFilter.value as any).value : roleFilter.value;
  const statusVal = typeof statusFilter.value === 'object' && statusFilter.value?.value != null ? (statusFilter.value as any).value : statusFilter.value;
  if (roleVal && roleVal !== 'all') filtered = filtered.filter(z => z.role === roleVal);
  if (statusVal && statusVal !== 'all') {
    filtered = filtered.filter(z => statusVal === 'active' ? z.is_active : !z.is_active);
  }
  return filtered;
});

const canSave = computed(() => {
  if (editingZone.value) return true;
  if (!zoneForm.value.owner_id) return false;
  if (!zoneForm.value.center_lat || !zoneForm.value.center_lng) return false;
  if (!zoneForm.value.radius_km || zoneForm.value.radius_km < 5) return false;
  return true;
});

function getOwnerName(row: any): string {
  if (row.owner_entity_name) return row.owner_entity_name;
  if (row.role === 'nurse') {
    const first = row.owner_first_name ?? '';
    const last = row.owner_last_name ?? '';
    return [first, last].filter(Boolean).join(' ').trim() || row.owner_id || '—';
  }
  return row.owner_last_name?.trim() || getRoleLabel(row.role) || row.owner_id || '—';
}

async function loadNurses() {
  loadingNurses.value = true;
  try {
    const res = await apiFetch('/users?role=nurse&limit=200', { method: 'GET' });
    if (res.success && res.data) {
      nurses.value = res.data;
    }
  } catch (e) {
    console.error(e);
  } finally {
    loadingNurses.value = false;
  }
}

async function onNurseSelect(item: { id: string; label: string; email: string } | null) {
  selectedNurse.value = item ?? null;
  selectedNurseProfile.value = null;
  zoneForm.value.owner_id = item?.id ?? '';
  zoneForm.value.address_label = '';
  zoneForm.value.center_lat = 0;
  zoneForm.value.center_lng = 0;
  if (!item?.id) return;
  try {
    const res = await apiFetch(`/users/${item.id}`, { method: 'GET' });
    if (res.success && res.data) {
      selectedNurseProfile.value = res.data;
      const addr = res.data.address;
      if (addr && typeof addr === 'object' && addr.lat != null && addr.lng != null) {
        zoneForm.value.center_lat = Number(addr.lat);
        zoneForm.value.center_lng = Number(addr.lng);
        zoneForm.value.address_label = addr.label || '';
      } else if (addr && typeof addr === 'string') {
        zoneForm.value.address_label = addr;
      }
    }
  } catch (e) {
    console.error(e);
  }
}

const openCreateModal = () => {
  editingZone.value = null;
  selectedNurse.value = null;
  selectedNurseProfile.value = null;
  zoneForm.value = {
    owner_id: '',
    role: 'nurse',
    center_lat: 0,
    center_lng: 0,
    radius_km: 20,
    is_active: true,
    address_label: '',
  };
  showCreateModal.value = true;
  if (nurses.value.length === 0) loadNurses();
};

onMounted(async () => {
  await fetchZones();
  loadNurses();
});

const fetchZones = async () => {
  loading.value = true;
  try {
    const response = await apiFetch('/coverage-zones?list=all', { method: 'GET' });
    if (response.success && Array.isArray(response.data)) {
      zones.value = response.data;
    } else {
      zones.value = [];
    }
  } catch (error) {
    console.error('Erreur lors du chargement des zones:', error);
    toast.add({ title: 'Erreur de chargement', color: 'error' });
    zones.value = [];
  } finally {
    loading.value = false;
  }
};

const editZone = (zone: any) => {
  editingZone.value = zone;
  selectedNurse.value = null;
  selectedNurseProfile.value = null;
  zoneForm.value = {
    owner_id: zone.owner_id,
    role: zone.role,
    center_lat: Number(zone.center_lat),
    center_lng: Number(zone.center_lng),
    radius_km: Number(zone.radius_km),
    is_active: !!zone.is_active,
    address_label: zone.owner_address_label || '',
  };
  showCreateModal.value = true;
};

const toggleZone = async (zone: any) => {
  try {
    await apiFetch(`/coverage-zones/${zone.id}`, {
      method: 'PUT',
      body: { is_active: !zone.is_active },
    });
    toast.add({ title: 'Zone mise à jour', color: 'success' });
    await fetchZones();
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'error' });
  }
};

const saveZone = async () => {
  saving.value = true;
  try {
    const body = {
      owner_id: zoneForm.value.owner_id,
      role: zoneForm.value.role,
      center_lat: zoneForm.value.center_lat,
      center_lng: zoneForm.value.center_lng,
      radius_km: zoneForm.value.radius_km,
      is_active: zoneForm.value.is_active,
    };
    if (editingZone.value) {
      await apiFetch(`/coverage-zones/${editingZone.value.id}`, {
        method: 'PUT',
        body: {
          center_lat: body.center_lat,
          center_lng: body.center_lng,
          radius_km: body.radius_km,
          is_active: body.is_active,
        },
      });
      toast.add({ title: 'Zone modifiée', color: 'success' });
    } else {
      await apiFetch('/coverage-zones', {
        method: 'POST',
        body,
      });
      toast.add({ title: 'Zone créée', color: 'success' });
    }
    showCreateModal.value = false;
    editingZone.value = null;
    selectedNurse.value = null;
    await fetchZones();
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: (error as Error).message, color: 'error' });
  } finally {
    saving.value = false;
  }
};

const getRoleColor = (role: string) => {
  const colors: Record<string, string> = {
    lab: 'primary',
    subaccount: 'info',
    nurse: 'success',
  };
  return colors[role] || 'neutral';
};

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    lab: 'Laboratoire',
    subaccount: 'Sous-compte',
    nurse: 'Infirmier',
  };
  return labels[role] || role;
};
</script>
