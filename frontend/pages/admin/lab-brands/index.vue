<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Marques laboratoire"
        description="Gérez les réseaux proposés aux patients lors d’un prélèvement (nom, logo, site, ordre)."
      >
        <template #actions>
          <UButton color="primary" icon="i-lucide-plus" size="md" :on-click="openCreate">
            Nouvelle marque
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 6" :key="i" class="h-14 animate-pulse rounded-lg bg-muted/40" />
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

    <div v-else class="overflow-hidden rounded-xl border border-default divide-y divide-default">
      <div
        v-for="brand in brands"
        :key="brand.id"
        class="flex flex-wrap items-center gap-3 px-4 py-3"
        :class="!brand.is_active ? 'opacity-60' : ''"
      >
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-default bg-muted/20">
          <img v-if="brand.logo_url" :src="brand.logo_url" :alt="brand.name" class="h-8 w-8 object-contain" />
          <UIcon v-else name="i-lucide-building-2" class="h-5 w-5 text-muted" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium">{{ brand.name }}</span>
            <UBadge variant="subtle" size="xs">{{ brand.slug }}</UBadge>
          </div>
          <p v-if="brand.website_url" class="truncate text-xs text-muted">{{ brand.website_url }}</p>
        </div>
        <span class="text-xs text-muted">Ordre {{ brand.sort_order }}</span>
        <USwitch
          :model-value="!!brand.is_active"
          :aria-label="`Activer ${brand.name}`"
          :disabled="togglingId === brand.id"
          size="xs"
          @update:model-value="toggleActive(brand)"
        />
        <div class="flex gap-1">
          <UButton size="xs" variant="ghost" square icon="i-lucide-pencil" :aria-label="`Modifier ${brand.name}`" @click="editBrand(brand)" />
          <UButton
            size="xs"
            variant="ghost"
            color="error"
            square
            icon="i-lucide-trash-2"
            :aria-label="`Supprimer ${brand.name}`"
            :loading="deletingId === brand.id"
            @click="removeBrand(brand)"
          />
        </div>
      </div>
    </div>

    <UModal v-model:open="modalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-medium">{{ editingId ? 'Modifier la marque' : 'Nouvelle marque' }}</h3>
          </template>
          <form class="space-y-4" @submit.prevent="saveBrand">
            <UFormField label="Nom" required>
              <UInput v-model="form.name" placeholder="Nom du réseau" class="w-full" />
            </UFormField>
            <UFormField label="Identifiant dans les liens" help="Laissez vide pour le créer à partir du nom.">
              <UInput v-model="form.slug" placeholder="nom-du-reseau" class="w-full" />
            </UFormField>
            <UFormField label="URL logo">
              <UInput v-model="form.logo_url" placeholder="https://..." class="w-full" />
            </UFormField>
            <UFormField label="Site web">
              <UInput v-model="form.website_url" placeholder="https://..." class="w-full" />
            </UFormField>
            <UFormField label="Ordre d’affichage">
              <UInput v-model.number="form.sort_order" type="number" min="0" class="w-full" />
            </UFormField>
            <div class="flex items-center gap-2">
              <USwitch v-model="form.is_active" aria-label="Marque active" />
              <span class="text-sm">Active</span>
            </div>
            <UAlert v-if="formError" color="error" variant="soft" :title="formError" />
            <div class="flex justify-end gap-2">
              <UButton variant="outline" color="neutral" @click="($event) => { modalOpen = false }">Annuler</UButton>
              <UButton type="submit" color="primary" :loading="saving">Enregistrer</UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </AppPageShell>
</template>

<script setup lang="ts">
import type { LabBrandAdmin } from '@oneandlab/shared-types';
import { apiFetch } from '~/utils/api';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

const toast = useAppToast();
const brands = ref<LabBrandAdmin[]>([]);
const loading = ref(true);
const loadError = ref(false);
const saving = ref(false);
const deletingId = ref('');
const togglingId = ref('');
const modalOpen = ref(false);
const editingId = ref('');
const formError = ref('');

const form = reactive({
  name: '',
  slug: '',
  logo_url: '',
  website_url: '',
  sort_order: 0,
  is_active: true,
});

async function loadBrands() {
  loading.value = true;
  loadError.value = false;
  try {
    const res = (await apiFetch('/admin/lab-brands', { method: 'GET' })) as {
      success?: boolean;
      data?: LabBrandAdmin[];
      error?: string;
    };
    if (res?.success && Array.isArray(res.data)) {
      brands.value = res.data.map(brand => ({ ...brand, is_active: Number(brand.is_active) === 1 }));
    } else {
      throw new Error('Chargement impossible');
    }
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.name = '';
  form.slug = '';
  form.logo_url = '';
  form.website_url = '';
  form.sort_order = brands.value.length + 1;
  form.is_active = true;
  formError.value = '';
}

function openCreate() {
  editingId.value = '';
  resetForm();
  modalOpen.value = true;
}

function editBrand(brand: LabBrandAdmin) {
  editingId.value = brand.id;
  form.name = brand.name;
  form.slug = brand.slug;
  form.logo_url = brand.logo_url ?? '';
  form.website_url = brand.website_url ?? '';
  form.sort_order = brand.sort_order;
  form.is_active = !!brand.is_active;
  formError.value = '';
  modalOpen.value = true;
}

async function saveBrand() {
  if (saving.value) return;
  if (!form.name.trim()) {
    formError.value = 'Le nom est requis.';
    return;
  }
  saving.value = true;
  formError.value = '';
  const body = {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    logo_url: form.logo_url.trim() || null,
    website_url: form.website_url.trim() || null,
    sort_order: Number(form.sort_order) || 0,
    is_active: form.is_active ? 1 : 0,
  };
  try {
    const res = editingId.value
      ? await apiFetch(`/admin/lab-brands/${editingId.value}`, { method: 'PUT', body })
      : await apiFetch('/admin/lab-brands', { method: 'POST', body });
    if ((res as { success?: boolean }).success) {
      modalOpen.value = false;
      await loadBrands();
      toast.add({ title: 'Enregistré', color: 'success' });
    } else {
      formError.value = (res as { error?: string }).error || 'Erreur';
    }
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Erreur';
  } finally {
    saving.value = false;
  }
}

async function toggleActive(brand: LabBrandAdmin) {
  if (togglingId.value) return;
  togglingId.value = brand.id;
  try {
    const response = await apiFetch(`/admin/lab-brands/${brand.id}`, {
      method: 'PUT',
      body: { ...brand, is_active: brand.is_active ? 0 : 1 },
    });
    if (!response?.success) throw new Error('La visibilité de la marque n’a pas été modifiée. Réessayez.');
    await loadBrands();
  } catch (error) {
    toast.add({ title: 'Modification non enregistrée', description: error instanceof Error ? error.message : 'Réessayez.', color: 'error' });
  } finally {
    togglingId.value = '';
  }
}

async function removeBrand(brand: LabBrandAdmin) {
  if (deletingId.value) return;
  if (!confirm(`Supprimer la marque « ${brand.name} » ?`)) return;
  deletingId.value = brand.id;
  try {
    const res = (await apiFetch(`/admin/lab-brands/${brand.id}`, { method: 'DELETE' })) as {
      success?: boolean;
      error?: string;
    };
    if (res?.success) {
      await loadBrands();
      toast.add({ title: 'Marque supprimée', color: 'success' });
    } else {
      toast.add({ title: 'Erreur', description: res?.error || 'Suppression impossible', color: 'error' });
    }
  } catch {
    toast.add({ title: 'Suppression impossible', description: 'La marque est conservée. Réessayez.', color: 'error' });
  } finally {
    deletingId.value = '';
  }
}

onMounted(loadBrands);
</script>
