<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
    <AppPageHeader :edge-bleed="false" 
      title="Zones de couverture"
      description="Consultez les secteurs d’intervention et ajustez leur périmètre sur la carte."
    >
      <template #actions>
        <UButton color="primary" icon="i-lucide-plus" :on-click="openCreateModal">
          Créer une zone
        </UButton>
      </template>
    </AppPageHeader>
  </template>

    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
      <USelect
        v-model="roleFilter"
        :items="roleOptions"
        placeholder="Filtrer par rôle"
        aria-label="Filtrer par rôle"
        class="w-full sm:w-48"
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        placeholder="Filtrer par statut"
        aria-label="Filtrer par statut"
        class="w-full sm:w-48"
      />
    </div>

    <UAlert v-if="zonesError" color="error" title="Secteurs indisponibles" :description="zonesError" :actions="[{ label: 'Réessayer', onClick: fetchZones }]" />
    <div v-else class="space-y-3">
      <div v-if="loading" class="space-y-3 sm:hidden" aria-label="Chargement des secteurs">
        <USkeleton v-for="i in 3" :key="i" class="h-40 rounded-xl" />
      </div>
      <div v-else class="space-y-3 sm:hidden">
        <article v-for="zone in filteredZones" :key="zone.id" class="rounded-xl border border-default/50 bg-default p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="break-words font-semibold">{{ getOwnerName(zone) }}</h2>
              <p class="mt-1 text-sm text-muted">{{ getRoleLabel(zone.role) }}</p>
            </div>
            <UBadge :color="zone.is_active ? 'success' : 'neutral'" variant="soft" class="shrink-0">{{ zone.is_active ? 'Actif' : 'Inactif' }}</UBadge>
          </div>
          <p class="mt-3 break-words text-sm text-muted">{{ zone.owner_address_label || 'Adresse non renseignée' }}</p>
          <p class="mt-1 text-sm">Portée maximale : <strong class="font-medium">{{ zone.radius_km }} km</strong></p>
          <div class="mt-4 flex flex-wrap gap-2">
            <UButton variant="soft" icon="i-lucide-map" :disabled="!zone.center_lat" @click="openMapEditorFromRow(zone)">Secteur</UButton>
            <UButton variant="outline" @click="editZone(zone)">Modifier</UButton>
            <UButton variant="ghost" :color="zone.is_active ? 'error' : 'primary'" :loading="togglingId === zone.id" :disabled="!!togglingId" @click="toggleZone(zone)">{{ zone.is_active ? 'Désactiver' : 'Activer' }}</UButton>
          </div>
        </article>
        <UEmpty v-if="!filteredZones.length" title="Aucun secteur trouvé" description="Ajustez les filtres ou créez un secteur." :actions="[{ label: 'Créer une zone', onClick: openCreateModal }]" />
      </div>
      <UTable class="hidden overflow-hidden rounded-xl border border-default/50 bg-default sm:block" :data="filteredZones" :columns="columns" :loading="loading">
        <template #owner-cell="{ row }">
          <span class="font-medium">{{ getOwnerName(row.original ?? row) }}</span>
        </template>
        <template #role-cell="{ row }">
          <UBadge :color="resolveUiColor(getRoleColor((row.original ?? row).role))" variant="soft" size="xs">
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
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              size="xs"
              variant="soft"
              color="primary"
              leading-icon="i-lucide-map"
              :disabled="!(row.original ?? row).center_lat"
              :on-click="() => openMapEditorFromRow(row.original ?? row)"
            >
              Secteur
            </UButton>
            <UButton size="xs" variant="outline" leading-icon="i-lucide-pencil" :on-click="() => editZone(row.original ?? row)">
              Modifier
            </UButton>
            <UButton
              size="xs"
              :color="(row.original ?? row).is_active ? 'error' : 'success'"
              variant="outline"
              :loading="togglingId === (row.original ?? row).id"
              :disabled="!!togglingId"
              :on-click="() => toggleZone(row.original ?? row)"
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
              description="Aucune zone de couverture. Créez une zone pour un infirmier (adresse + polygone)."
              :actions="[{ label: 'Créer une zone', variant: 'solid', onClick: openCreateModal }]"
              variant="naked"
            />
          </div>
        </template>
      </UTable>
    </div>

    <ClientOnly>
      <Teleport to="body">
        <UModal v-model:open="showCreateModal" :dismissible="!saving" :ui="{ content: 'max-w-lg w-full' }">
          <template #content="{ close }">
            <UCard class="w-full">
              <template #header>
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-xl font-normal text-foreground">
                    {{ editingZone ? 'Modifier la zone' : 'Créer une zone' }}
                  </h2>
                  <p class="text-sm text-muted mt-1">
                    {{ editingZone ? 'Ajustez le secteur d’intervention et son statut.' : 'Choisissez un infirmier et définissez la zone depuis son adresse.' }}
                  </p>
                </div>
                <UButton variant="ghost" color="neutral" icon="i-lucide-x" size="sm" aria-label="Fermer" :disabled="saving" :on-click="close" />
              </div>
            </template>
            <UForm :state="zoneForm" @submit="saveZone" class="space-y-4">
              <UAlert v-if="!editingZone && nursesError" color="error" title="Infirmiers indisponibles" :description="nursesError" :actions="[{ label: 'Réessayer', onClick: loadNurses }]" />
              <UAlert v-if="profileError" color="error" title="Adresse indisponible" :description="profileError" :actions="[{ label: 'Réessayer', onClick: () => onNurseSelect(selectedNurse) }]" />
              <UAlert v-if="saveError" color="error" title="Enregistrement impossible" :description="saveError" />
              <UFormField v-if="!editingZone" label="Infirmier" name="owner_id" required class="w-full">
                <USelectMenu
                  :model-value="selectedNurse ?? undefined"
                  :items="nurseSelectItems"
                  label-key="label"
                  :search-input="{ placeholder: 'Rechercher par nom ou email...' }"
                  :filter-fields="['label', 'email']"
                  placeholder="Choisir un infirmier"
                  aria-label="Choisir un infirmier"
                  :loading="loadingNurses"
                  :disabled="loadingNurses || !!nursesError || saving"
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
                  <template #empty>
                    <div class="py-6 px-4">
                      <UEmpty
                        icon="i-lucide-stethoscope"
                        title="Aucun infirmier trouvé"
                        description="Aucun infirmier ne correspond à votre recherche. Vérifiez les inscriptions."
                        variant="naked"
                        size="md"
                      />
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
                <p v-if="!editingZone && selectedNurse && !profileLoading && !profileError && !zoneForm.address_label" class="text-xs text-amber-600">
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

              <UFormField
                v-if="zoneForm.center_lat && zoneForm.center_lng"
                label="Zone d'intervention"
                class="w-full"
              >
                <div class="space-y-3 rounded-xl border border-default/50 bg-muted/10 p-3">
                  <ProfileCoverageSquareMap
                    :lat="zoneForm.center_lat"
                    :lng="zoneForm.center_lng"
                    :half-side-km="zoneForm.radius_km"
                    :max-half-side-km="100"
                    :vertices="formVertices"
                    read-only
                    :show-footer="false"
                    map-min-height="min-h-[200px]"
                    class="rounded-lg overflow-hidden border border-default/40"
                  />
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p class="text-sm text-muted">
                      {{ zoneForm.radius_km }} km du centre au sommet le plus loin
                    </p>
                    <UButton
                      size="sm"
                      color="primary"
                      variant="soft"
                      icon="i-lucide-maximize-2"
                      @click="openMapEditorFromForm"
                    >
                      Modifier le secteur
                    </UButton>
                  </div>
                </div>
              </UFormField>

              <UFormField label="Portée max (km)" name="radius_km" required class="w-full">
                <p class="text-sm text-muted py-2">
                  {{ zoneForm.radius_km }} km — secteur ajustable sur la carte.
                  L'infirmier peut affiner sur la carte de son profil.
                </p>
                <UInput v-model.number="zoneForm.radius_km" type="number" :min="1" :max="100" :step="1" size="md" class="w-full max-w-xs" />
              </UFormField>

              <UFormField label="Statut" name="is_active" class="w-full">
                <div class="flex items-center gap-3">
                  <USwitch v-model="zoneForm.is_active" />
                  <span class="text-sm text-muted">{{ zoneForm.is_active ? 'Actif' : 'Inactif' }}</span>
                </div>
              </UFormField>

              <div class="flex justify-end gap-2 pt-4 border-t border-default">
                <UButton variant="ghost" color="neutral" :disabled="saving" :on-click="close">
                  Annuler
                </UButton>
                <UButton type="submit" color="primary" :loading="saving" :disabled="!canSave || saving">
                  {{ editingZone ? 'Enregistrer' : 'Créer la zone' }}
                </UButton>
              </div>
            </UForm>
          </UCard>
          </template>
        </UModal>
      </Teleport>
    </ClientOnly>

    <CoverageZoneEditorModal
      v-model:open="mapEditorOpen"
      :lat="mapEditorLat"
      :lng="mapEditorLng"
      :half-side-km="mapEditorHalfSide"
      :max-half-side-km="100"
      :vertices="mapEditorVertices"
      :title="mapEditorTitle"
      subtitle="Déplacez les points pour dessiner la zone d'intervention"
      :saving="mapSaving"
      :close-on-save="false"
      @save="onMapEditorSave"
    />
  </AppPageShell>
</template>

<script setup lang="ts">
import { resolveUiColor } from "~/utils/ui-appearance";
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

import { apiFetch } from '~/utils/api';
import { fetchAllUsers } from '~/utils/fetch-all-users';
import { toPolygonPayload, type CoverageEditorSavePayload, type CoverageVertex } from '@oneandlab/shared-utils';
import { coverageFormVertices } from '~/utils/coverage-form-geometry';
const toast = useAppToast();

const zones = ref<any[]>([]);
const nurses = ref<any[]>([]);
const loading = ref(true);
const loadingNurses = ref(false);
const saving = ref(false);
const mapSaving = ref(false);
const togglingId = ref<string | null>(null);
const zonesError = ref('');
const nursesError = ref('');
const profileError = ref('');
const saveError = ref('');
const profileLoading = ref(false);
let profileRequest = 0;
const roleFilter = ref('all');
const statusFilter = ref('all');
const showCreateModal = ref(false);
const editingZone = ref<any>(null);
const mapEditorOpen = ref(false);
const mapEditorLat = ref<number | null>(null);
const mapEditorLng = ref<number | null>(null);
const mapEditorHalfSide = ref(20);
const mapEditorVertices = ref<CoverageVertex[] | null>(null);
const verticesCenter = ref<CoverageVertex | null>(null);
const mapEditorZoneId = ref<string | null>(null);
const mapEditorOwnerLabel = ref('');
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
  { id: 'radius_km', accessorKey: 'radius_km', header: 'Portée (km)' },
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
  const roleVal = roleFilter.value;
  const statusVal = statusFilter.value;
  if (roleVal && roleVal !== 'all') filtered = filtered.filter(z => z.role === roleVal);
  if (statusVal && statusVal !== 'all') {
    filtered = filtered.filter(z => statusVal === 'active' ? z.is_active : !z.is_active);
  }
  return filtered;
});

const canSave = computed(() => {
  if (profileLoading.value || profileError.value) return false;
  if (!zoneForm.value.owner_id) return false;
  if (!zoneForm.value.center_lat || !zoneForm.value.center_lng) return false;
  if (!Number.isFinite(zoneForm.value.center_lat) || Math.abs(zoneForm.value.center_lat) > 90) return false;
  if (!Number.isFinite(zoneForm.value.center_lng) || Math.abs(zoneForm.value.center_lng) > 180) return false;
  if (!Number.isFinite(zoneForm.value.radius_km) || zoneForm.value.radius_km < 1 || zoneForm.value.radius_km > 100) return false;
  return true;
});

const mapEditorTitle = computed(() =>
  mapEditorOwnerLabel.value
    ? `Secteur — ${mapEditorOwnerLabel.value}`
    : 'Modifier le secteur',
);

const formVertices = computed(() => canSave.value ? coverageFormVertices(
  { lat: zoneForm.value.center_lat, lng: zoneForm.value.center_lng },
  zoneForm.value.radius_km, mapEditorVertices.value, verticesCenter.value,
) : null);

function openMapEditorFromForm() {
  if (!zoneForm.value.center_lat || !zoneForm.value.center_lng) return;
  mapEditorLat.value = zoneForm.value.center_lat;
  mapEditorLng.value = zoneForm.value.center_lng;
  mapEditorHalfSide.value = zoneForm.value.radius_km;
  const preview = formVertices.value;
  mapEditorVertices.value = preview;
  verticesCenter.value = { lat: zoneForm.value.center_lat, lng: zoneForm.value.center_lng };
  mapEditorZoneId.value = null;
  mapEditorOwnerLabel.value = editingZone.value
    ? getOwnerName(editingZone.value)
    : selectedNurse.value?.label ?? '';
  mapEditorOpen.value = true;
}

function openMapEditorFromRow(zone: any) {
  if (!zone?.center_lat || !zone?.center_lng) return;
  mapEditorLat.value = Number(zone.center_lat);
  mapEditorLng.value = Number(zone.center_lng);
  mapEditorHalfSide.value = Number(zone.radius_km) || 20;
  mapEditorVertices.value = zone.bounds_json?.vertices ?? null;
  mapEditorZoneId.value = zone.id ?? null;
  mapEditorOwnerLabel.value = getOwnerName(zone);
  mapEditorOpen.value = true;
}

async function onMapEditorSave(payload: CoverageEditorSavePayload) {
  mapEditorHalfSide.value = payload.halfSideKm;
  mapEditorVertices.value = payload.vertices;
  if (mapEditorLat.value != null && mapEditorLng.value != null) {
    verticesCenter.value = { lat: mapEditorLat.value, lng: mapEditorLng.value };
  }
  zoneForm.value.radius_km = payload.halfSideKm;
  if (!mapEditorLat.value || !mapEditorLng.value) return;
  if (!mapEditorZoneId.value) { mapEditorOpen.value = false; return; }
  if (mapSaving.value) return;
  mapSaving.value = true;
  try {
    const response = await apiFetch(`/coverage-zones/${mapEditorZoneId.value}`, {
      method: 'PUT',
      body: {
        center_lat: mapEditorLat.value,
        center_lng: mapEditorLng.value,
        radius_km: payload.halfSideKm,
        zone_type: 'polygon',
        bounds_json: payload.bounds,
      },
    });
    if (!response.success) throw new Error('Le secteur n’a pas été enregistré. Réessayez.');
    mapEditorOpen.value = false;
    toast.add({ title: 'Secteur enregistré', color: 'success' });
    await fetchZones();
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: (error as Error).message, color: 'error' });
  } finally { mapSaving.value = false; }
}

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
  if (loadingNurses.value) return;
  loadingNurses.value = true;
  nursesError.value = '';
  try { nurses.value = await fetchAllUsers({ role: 'nurse' }); }
  catch { nursesError.value = 'La liste complète des infirmiers n’a pas pu être chargée.'; }
  finally { loadingNurses.value = false; }
}

async function onNurseSelect(item: { id: string; label: string; email: string } | null) {
  const request = ++profileRequest;
  selectedNurse.value = item ?? null;
  selectedNurseProfile.value = null;
  profileError.value = '';
  profileLoading.value = false;
  mapEditorVertices.value = null;
  verticesCenter.value = null;
  zoneForm.value.owner_id = item?.id ?? '';
  zoneForm.value.address_label = '';
  zoneForm.value.center_lat = 0;
  zoneForm.value.center_lng = 0;
  if (!item?.id) return;
  profileLoading.value = true;
  try {
    const res = await apiFetch(`/users/${encodeURIComponent(item.id)}`, { method: 'GET' });
    if (request !== profileRequest) return;
    if (!res.success || !res.data || res.data.id !== item.id) throw new Error('Profil indisponible');
    selectedNurseProfile.value = res.data;
    let addr = res.data.address;
    if (typeof addr === 'string') {
      try { addr = JSON.parse(addr); } catch { /* Legacy plain-text address. */ }
    }
    if (addr && typeof addr === 'object' && addr.lat != null && addr.lng != null) {
      zoneForm.value.center_lat = Number(addr.lat);
      zoneForm.value.center_lng = Number(addr.lng);
      zoneForm.value.address_label = addr.label || '';
    } else if (typeof addr === 'string') zoneForm.value.address_label = addr;
  } catch {
    if (request === profileRequest) profileError.value = 'Impossible de charger l’adresse de cet infirmier.';
  } finally {
    if (request === profileRequest) profileLoading.value = false;
  }
}

const openCreateModal = () => {
  ++profileRequest;
  profileLoading.value = false;
  profileError.value = '';
  saveError.value = '';
  mapEditorVertices.value = null;
  verticesCenter.value = null;
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
  zonesError.value = '';
  try {
    const response = await apiFetch('/coverage-zones?list=all', { method: 'GET' });
    if (response.success && Array.isArray(response.data)) {
      zones.value = response.data.map((zone: any) => ({ ...zone, is_active: zone.is_active === true || zone.is_active === 1 || zone.is_active === '1' }));
    } else {
      throw new Error('Secteurs indisponibles');
    }
  } catch (error) {
    zonesError.value = 'Impossible de charger les secteurs. Réessayez.';
    zones.value = [];
  } finally {
    loading.value = false;
  }
};

const editZone = (zone: any) => {
  ++profileRequest;
  profileLoading.value = false;
  profileError.value = '';
  saveError.value = '';
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
  mapEditorVertices.value = zone.bounds_json?.vertices ?? null;
  verticesCenter.value = { lat: Number(zone.center_lat), lng: Number(zone.center_lng) };
  showCreateModal.value = true;
};

const toggleZone = async (zone: any) => {
  if (togglingId.value) return;
  togglingId.value = zone.id;
  try {
    const response = await apiFetch(`/coverage-zones/${zone.id}`, {
      method: 'PUT',
      body: { is_active: !zone.is_active },
    });
    if (!response.success) throw new Error('Le statut n’a pas été enregistré. Réessayez.');
    toast.add({ title: 'Zone mise à jour', color: 'success' });
    await fetchZones();
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'error' });
  } finally { togglingId.value = null; }
};

const saveZone = async () => {
  if (saving.value || !canSave.value) return;
  saveError.value = '';
  saving.value = true;
  try {
    const vertices = coverageFormVertices(
      { lat: zoneForm.value.center_lat, lng: zoneForm.value.center_lng },
      zoneForm.value.radius_km,
      mapEditorVertices.value,
      verticesCenter.value,
    );
    const bounds = toPolygonPayload(vertices);
    const body = {
      owner_id: zoneForm.value.owner_id,
      role: zoneForm.value.role,
      center_lat: zoneForm.value.center_lat,
      center_lng: zoneForm.value.center_lng,
      radius_km: zoneForm.value.radius_km,
      zone_type: 'polygon',
      bounds_json: bounds,
      is_active: zoneForm.value.is_active,
    };
    if (editingZone.value) {
      const response = await apiFetch(`/coverage-zones/${editingZone.value.id}`, {
        method: 'PUT',
        body: {
          center_lat: body.center_lat,
          center_lng: body.center_lng,
          radius_km: body.radius_km,
          zone_type: 'polygon',
          bounds_json: bounds,
          is_active: body.is_active,
        },
      });
      if (!response.success) throw new Error('La zone n’a pas été enregistrée. Réessayez.');
      toast.add({ title: 'Zone modifiée', color: 'success' });
    } else {
      const response = await apiFetch('/coverage-zones', {
        method: 'POST',
        body,
      });
      if (!response.success) throw new Error('La zone n’a pas été créée. Réessayez.');
      toast.add({ title: 'Zone créée', color: 'success' });
    }
    showCreateModal.value = false;
    editingZone.value = null;
    selectedNurse.value = null;
    await fetchZones();
  } catch (error: any) {
    saveError.value = error.message || 'Réessayez sans fermer le formulaire.';
  } finally {
    saving.value = false;
  }
};

onBeforeUnmount(() => { ++profileRequest; });

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
