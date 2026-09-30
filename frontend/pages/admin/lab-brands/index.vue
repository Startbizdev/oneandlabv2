<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Marques laboratoire"
        description="Réseaux proposés aux patients lors d’une prise de sang, et comptes labo qui reçoivent leurs RDV."
      >
        <template #actions>
          <UButton color="primary" icon="i-lucide-plus" size="md" :on-click="openCreate">
            Nouvelle marque
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <div v-if="loading" class="space-y-2" aria-label="Chargement des marques">
      <USkeleton v-for="i in 6" :key="i" class="h-16 rounded-lg" />
    </div>

    <div v-else-if="loadError" role="alert" class="rounded-xl border border-default bg-default p-5 space-y-3">
      <h2 class="font-semibold">Marques indisponibles</h2>
      <p class="text-sm text-muted">Impossible de charger les marques de laboratoire.</p>
      <UButton variant="outline" color="neutral" @click="loadBrands">Réessayer</UButton>
    </div>

    <UEmpty
      v-else-if="brands.length === 0"
      icon="i-lucide-building-2"
      title="Aucune marque"
      description="Ajoutez une marque de laboratoire pour le choix patient."
      :actions="[{ label: 'Ajouter une marque', variant: 'solid', onClick: openCreate }]"
    />

    <template v-else>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Rechercher une marque"
          aria-label="Rechercher une marque"
          class="w-full sm:w-72"
        />
        <p class="text-sm text-muted">
          {{ visibleCount }} visible{{ visibleCount > 1 ? 's' : '' }} sur {{ brands.length }}
          <template v-if="search.trim()"> · réordonnancement disponible sans recherche</template>
        </p>
      </div>

      <UAlert
        v-if="labsError"
        color="warning"
        variant="soft"
        title="État des comptes labo indisponible"
        description="Les rattachements sont conservés, mais leur capacité à recevoir des RDV ne peut pas être affichée."
        :actions="[{ label: 'Réessayer', onClick: loadLabs }]"
      />

      <UEmpty v-if="filteredBrands.length === 0" icon="i-lucide-search" title="Aucune marque trouvée" description="Modifiez la recherche." />

      <div v-else class="space-y-3 sm:hidden">
        <article
          v-for="brand in filteredBrands"
          :key="brand.id"
          class="rounded-xl border border-default bg-default p-4 space-y-3"
          :class="!brand.is_active ? 'opacity-70' : ''"
        >
          <div class="flex items-start gap-3">
            <AdminLabBrandLogo :brand="brand" />
            <div class="min-w-0 flex-1">
              <h2 class="break-words font-semibold">{{ brand.name }}</h2>
              <p v-if="brand.website_url" class="break-all text-xs text-muted">{{ brand.website_url }}</p>
            </div>
            <USwitch
              :model-value="!!brand.is_active"
              :aria-label="`${brand.name} visible pour les patients`"
              :disabled="togglingId === brand.id"
              @update:model-value="toggleActive(brand)"
            />
          </div>
          <div :data-testid="`brand-labs-${brand.slug}`">
            <p v-if="labsLoading" class="text-xs text-muted">Vérification des comptes labo…</p>
            <AdminLabBrandLabStatus v-else :lab-ids="brand.lab_ids ?? []" :labs-by-id="labsById" />
          </div>
          <p class="text-xs text-muted">{{ appointmentLabel(brand) }}</p>
          <div class="flex flex-wrap gap-2">
            <UButton size="sm" variant="outline" icon="i-lucide-pencil" :aria-label="`Modifier ${brand.name}`" @click="openEdit(brand)">Modifier</UButton>
            <UButton size="sm" variant="ghost" color="neutral" icon="i-lucide-arrow-up" :aria-label="`Monter ${brand.name}`" :disabled="!canMove(brand, -1)" @click="move(brand, -1)" />
            <UButton size="sm" variant="ghost" color="neutral" icon="i-lucide-arrow-down" :aria-label="`Descendre ${brand.name}`" :disabled="!canMove(brand, 1)" @click="move(brand, 1)" />
            <UButton size="sm" variant="ghost" color="error" icon="i-lucide-trash-2" :aria-label="`Supprimer ${brand.name}`" @click="openDelete(brand)" />
          </div>
        </article>
      </div>

      <UTable
        v-if="filteredBrands.length > 0"
        class="hidden overflow-hidden rounded-xl border border-default bg-default sm:block"
        :data="filteredBrands"
        :columns="columns"
      >
        <template #order-cell="{ row }">
          <div class="flex items-center gap-0.5">
            <UButton size="xs" variant="ghost" color="neutral" square icon="i-lucide-arrow-up" :aria-label="`Monter ${row.original.name}`" :disabled="!canMove(row.original, -1)" @click="move(row.original, -1)" />
            <UButton size="xs" variant="ghost" color="neutral" square icon="i-lucide-arrow-down" :aria-label="`Descendre ${row.original.name}`" :disabled="!canMove(row.original, 1)" @click="move(row.original, 1)" />
          </div>
        </template>
        <template #brand-cell="{ row }">
          <div class="flex min-w-0 items-center gap-3" :class="!row.original.is_active ? 'opacity-70' : ''">
            <AdminLabBrandLogo :brand="row.original" />
            <div class="min-w-0">
              <p class="font-medium">{{ row.original.name }}</p>
              <p v-if="row.original.website_url" class="max-w-56 truncate text-xs text-muted">{{ row.original.website_url }}</p>
            </div>
          </div>
        </template>
        <template #labs-cell="{ row }">
          <div class="max-w-md whitespace-normal" :data-testid="`brand-labs-${row.original.slug}`">
            <p v-if="labsLoading" class="text-xs text-muted">Vérification des comptes labo…</p>
            <AdminLabBrandLabStatus v-else :lab-ids="row.original.lab_ids ?? []" :labs-by-id="labsById" />
          </div>
        </template>
        <template #appointments-cell="{ row }">
          <span class="text-sm text-muted">{{ row.original.appointment_count ?? 0 }}</span>
        </template>
        <template #visible-cell="{ row }">
          <USwitch
            :model-value="!!row.original.is_active"
            :aria-label="`${row.original.name} visible pour les patients`"
            :disabled="togglingId === row.original.id"
            @update:model-value="toggleActive(row.original)"
          />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UButton size="xs" variant="ghost" square icon="i-lucide-pencil" :aria-label="`Modifier ${row.original.name}`" @click="openEdit(row.original)" />
            <UButton size="xs" variant="ghost" color="error" square icon="i-lucide-trash-2" :aria-label="`Supprimer ${row.original.name}`" @click="openDelete(row.original)" />
          </div>
        </template>
      </UTable>
    </template>

    <AdminLabBrandFormModal
      v-model:open="formOpen"
      :brand="editingBrand"
      :labs="labOptions"
      :labs-loading="labsLoading"
      :labs-error="labsError"
      :next-sort-order="brands.length + 1"
      @saved="onSaved"
      @retry-labs="loadLabs"
    />
    <AdminLabBrandDeleteModal v-model:open="deleteOpen" :brand="deletingBrand" @deleted="onDeleted" @hide="hideInsteadOfDelete" />
  </AppPageShell>
</template>

<script setup lang="ts">
import type { LabBrandAdmin, LabBrandLabReachability } from '@oneandlab/shared-types';
import { apiFetch } from '~/utils/api';
import { fetchAllUsers, sortUsersByLabel, userDisplayLabel } from '~/utils/fetch-all-users';
import { filterBrandsByName, moveId, type LabAccountOption } from '~/utils/lab-brand-admin';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

const toast = useAppToast();
const brands = ref<LabBrandAdmin[]>([]);
const loading = ref(true);
const loadError = ref(false);
const search = ref('');
const togglingId = ref('');
const reordering = ref(false);
const formOpen = ref(false);
const editingBrand = ref<LabBrandAdmin | null>(null);
const deleteOpen = ref(false);
const deletingBrand = ref<LabBrandAdmin | null>(null);

const labOptions = ref<LabAccountOption[]>([]);
const labsLoading = ref(false);
const labsError = ref(false);
const labsById = computed(() => new Map(labOptions.value.map(lab => [lab.id, lab])));

const columns = [
  { id: 'order', header: 'Ordre' },
  { id: 'brand', header: 'Marque' },
  { id: 'labs', header: 'Comptes labo' },
  { id: 'appointments', header: 'RDV' },
  { id: 'visible', header: 'Visible' },
  { id: 'actions', header: '' },
];

const filteredBrands = computed(() => filterBrandsByName(brands.value, search.value));
const visibleCount = computed(() => brands.value.filter(brand => brand.is_active).length);

function normalizeBrands(rows: LabBrandAdmin[]): LabBrandAdmin[] {
  return rows.map(brand => ({ ...brand, is_active: Number(brand.is_active) === 1 }));
}

function appointmentLabel(brand: LabBrandAdmin): string {
  const count = brand.appointment_count ?? 0;
  if (count === 0) return 'Aucun RDV n’a encore choisi ce réseau';
  return count === 1 ? '1 RDV a choisi ce réseau' : `${count} RDV ont choisi ce réseau`;
}

async function loadLabs() {
  labsLoading.value = true;
  labsError.value = false;
  try {
    const [rows, reachRes] = await Promise.all([
      fetchAllUsers({ role: 'lab', status: 'active' }),
      apiFetch('/admin/lab-brands/labs', { method: 'GET' }) as Promise<{ success?: boolean; data?: LabBrandLabReachability[] }>,
    ]);
    if (!reachRes?.success || !Array.isArray(reachRes.data)) throw new Error('État des comptes labo indisponible');
    const reachById = new Map(reachRes.data.map(item => [String(item.id), item]));
    labOptions.value = sortUsersByLabel(rows).map(lab => {
      const reach = reachById.get(String(lab.id));
      return {
        id: String(lab.id),
        label: userDisplayLabel(lab),
        email: lab.email ? String(lab.email) : undefined,
        hasActiveZone: !!reach?.has_active_zone,
        acceptsAppointments: !!reach?.is_accepting_appointments,
      };
    });
  } catch (error) {
    console.error('Chargement des laboratoires (marques):', error);
    labsError.value = true;
  } finally {
    labsLoading.value = false;
  }
}

async function loadBrands() {
  loading.value = true;
  loadError.value = false;
  try {
    const res = (await apiFetch('/admin/lab-brands', { method: 'GET' })) as { success?: boolean; data?: LabBrandAdmin[] };
    if (!res?.success || !Array.isArray(res.data)) throw new Error('Chargement impossible');
    brands.value = normalizeBrands(res.data);
  } catch (error) {
    console.error('Chargement des marques:', error);
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingBrand.value = null;
  formOpen.value = true;
}

function openEdit(brand: LabBrandAdmin) {
  editingBrand.value = brand;
  formOpen.value = true;
}

function openDelete(brand: LabBrandAdmin) {
  deletingBrand.value = brand;
  deleteOpen.value = true;
}

async function onSaved() {
  await loadBrands();
  toast.add({ title: 'Marque enregistrée', color: 'success' });
}

async function onDeleted() {
  await loadBrands();
  toast.add({ title: 'Marque supprimée', color: 'success' });
}

async function hideInsteadOfDelete(brand: LabBrandAdmin) {
  deleteOpen.value = false;
  if (brand.is_active) await toggleActive(brand);
}

async function toggleActive(brand: LabBrandAdmin) {
  if (togglingId.value) return;
  togglingId.value = brand.id;
  const nextActive = !brand.is_active;
  try {
    const response = (await apiFetch(`/admin/lab-brands/${brand.id}`, {
      method: 'PUT',
      body: { is_active: nextActive ? 1 : 0 },
    })) as { success?: boolean; error?: string };
    if (!response?.success) throw new Error(response?.error || 'La visibilité de la marque n’a pas été modifiée. Réessayez.');
    await loadBrands();
    toast.add({ title: nextActive ? `${brand.name} est visible pour les patients` : `${brand.name} est masquée aux patients`, color: 'success' });
  } catch (error) {
    toast.add({ title: 'Modification non enregistrée', description: error instanceof Error ? error.message : 'Réessayez.', color: 'error' });
  } finally {
    togglingId.value = '';
  }
}

function canMove(brand: LabBrandAdmin, delta: -1 | 1): boolean {
  if (search.value.trim() || reordering.value) return false;
  const index = brands.value.findIndex(item => item.id === brand.id);
  return index + delta >= 0 && index + delta < brands.value.length;
}

async function move(brand: LabBrandAdmin, delta: -1 | 1) {
  if (!canMove(brand, delta)) return;
  reordering.value = true;
  try {
    const ids = moveId(brands.value.map(item => item.id), brand.id, delta);
    const res = (await apiFetch('/admin/lab-brands/reorder', { method: 'POST', body: { ids } })) as {
      success?: boolean;
      data?: LabBrandAdmin[];
      error?: string;
    };
    if (!res?.success || !Array.isArray(res.data)) throw new Error(res?.error || 'L’ordre n’a pas été modifié. Réessayez.');
    brands.value = normalizeBrands(res.data);
  } catch (error) {
    toast.add({ title: 'Ordre non enregistré', description: error instanceof Error ? error.message : 'Réessayez.', color: 'error' });
  } finally {
    reordering.value = false;
  }
}

onMounted(() => {
  void loadBrands();
  void loadLabs();
});
</script>
