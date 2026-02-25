<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Catégories de soins"
      description="Gérez les types de soins : nom, type (prise de sang ou soins infirmiers), activation et suppression."
    >
      <template #actions>
        <UButton color="primary" icon="i-lucide-plus" size="md" @click="openCreateModal">
          Nouvelle catégorie
        </UButton>
      </template>
    </TitleDashboard>

    <!-- Filtre par type -->
    <div class="flex flex-wrap items-center gap-3">
      <span class="text-sm font-medium text-muted">Filtrer :</span>
      <div class="inline-flex rounded-xl border border-default bg-default/50 p-1 shadow-sm">
        <UButton
          v-for="opt in typeOptionsFilter"
          :key="opt.value"
          :variant="typeFilter === opt.value ? 'solid' : 'ghost'"
          :color="typeFilter === opt.value ? 'primary' : 'neutral'"
          size="sm"
          class="rounded-lg"
          @click="typeFilter = opt.value"
        >
          {{ opt.label }}
        </UButton>
      </div>
    </div>

    <!-- Grille de cartes -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="i in 6" :key="i" class="animate-pulse">
        <div class="h-24 rounded-lg bg-default" />
        <div class="mt-3 h-4 w-3/4 rounded bg-default" />
        <div class="mt-2 h-3 w-1/2 rounded bg-default" />
      </UCard>
    </div>

    <UEmpty
      v-else-if="filteredCategories.length === 0"
      icon="i-lucide-tags"
      title="Aucune catégorie"
      description="Aucune catégorie ne correspond au filtre. Créez une nouvelle catégorie de soin."
      :actions="[{ label: 'Créer une catégorie', variant: 'solid', onClick: openCreateModal }]"
      class="rounded-2xl border border-default bg-default/30 py-16"
    />

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard
        v-for="cat in filteredCategories"
        :key="cat.id"
        class="overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800"
        :ui="{
          root: cat.is_active ? '' : 'opacity-75',
          body: 'flex flex-col flex-1 min-h-0',
          footer: 'border-t border-default pt-4 mt-auto',
        }"
      >
        <template #header>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 bg-muted/60 dark:bg-muted/40 border border-default transition-colors"
              >
                <UIcon
                  :name="getIconName(cat.icon)"
                  class="w-6 h-6 text-muted"
                />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="font-normal text-foreground truncate">
                  {{ cat.name }}
                </h3>
                <UBadge
                  :color="cat.type === 'blood_test' ? 'error' : 'info'"
                  :leading-icon="cat.type === 'blood_test' ? 'i-lucide-syringe' : 'i-lucide-stethoscope'"
                  variant="soft"
                  size="xs"
                  class="mt-1.5"
                >
                  {{ getTypeLabel(cat.type) }}
                </UBadge>
              </div>
            </div>
          </div>
        </template>

        <p v-if="cat.description" class="text-sm text-muted line-clamp-2 mb-4">
          {{ cat.description }}
        </p>
        <p v-else class="text-sm text-muted italic mb-4">
          Aucune description
        </p>

        <template #footer>
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-muted">Actif</span>
              <USwitch
                :model-value="!!cat.is_active"
                :disabled="togglingId === cat.id"
                @update:model-value="toggleCategory(cat)"
              />
            </div>
            <div class="flex items-center gap-2">
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-lucide-pencil"
                aria-label="Modifier"
                :disabled="saving"
                @click="editCategory(cat)"
              />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="i-lucide-trash-2"
                aria-label="Supprimer"
                :loading="deletingId === cat.id"
                :disabled="togglingId === cat.id"
                @click="confirmDelete(cat)"
              />
            </div>
          </div>
        </template>
      </UCard>
    </div>

    <!-- Modal Créer / Modifier -->
    <ClientOnly>
      <Teleport to="body">
        <UModal v-model:open="showCreateModal" :ui="{ content: 'max-w-lg w-full' }">
          <template #content="{ close }">
            <UCard>
              <template #header>
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h2 class="text-xl font-normal text-foreground">
                      {{ editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie de soin' }}
                    </h2>
                    <p class="text-sm text-muted mt-1">
                      {{ editingCategory ? 'Modifiez le nom, le type et l’icône du soin.' : 'Définissez le nom du soin, le type et l’icône affichée.' }}
                    </p>
                  </div>
                  <UButton variant="ghost" color="neutral" icon="i-lucide-x" size="sm" aria-label="Fermer" @click="close()" />
                </div>
              </template>
              <UForm :state="categoryForm" @submit="saveCategory" class="space-y-4">
                <UFormField label="Nom du soin" name="name" required class="w-full">
                  <UInput
                    v-model="categoryForm.name"
                    placeholder="Ex. Bilan sanguin, Pansement..."
                    size="md"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Description (optionnel)" name="description" class="w-full">
                  <UTextarea
                    v-model="categoryForm.description"
                    placeholder="Courte description du soin"
                    :rows="2"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Type de soin" name="type" required class="w-full">
                  <div class="flex gap-2 flex-wrap w-full">
                    <UButton
                      v-for="t in typeOptionsForm"
                      :key="t.value"
                      :variant="categoryForm.type === t.value ? 'solid' : 'outline'"
                      :color="categoryForm.type === t.value ? 'primary' : 'neutral'"
                      size="md"
                      @click="categoryForm.type = t.value"
                    >
                      {{ t.label }}
                    </UButton>
                  </div>
                </UFormField>
                <UFormField label="Icône du soin" name="icon" class="w-full">
                  <USelectMenu
                    v-model="categoryForm.icon"
                    :items="iconSelectItems"
                    value-key="value"
                    :search-input="{ placeholder: 'Rechercher une icône médicale...' }"
                    :filter-fields="['label']"
                    placeholder="Choisir une icône (Lucide ou Medical)"
                    size="md"
                    class="w-full"
                  >
                    <template #leading>
                      <UIcon
                        :name="categoryForm.icon ? getIconName(categoryForm.icon) : 'i-lucide-search'"
                        :class="categoryForm.icon ? 'w-4 h-4 text-primary-500' : 'w-4 h-4 text-muted'"
                      />
                    </template>
                    <template #item="{ item }">
                      <div class="flex items-center gap-3 py-1.5">
                        <div class="flex items-center justify-center w-8 h-8 rounded bg-default">
                          <UIcon :name="getIconName(item.value)" class="w-4 h-4 text-muted" />
                        </div>
                        <span class="font-medium">{{ item.label }}</span>
                      </div>
                    </template>
                  </USelectMenu>
                  <template #hint>
                    <span class="text-xs text-muted">Icône affichée dans la liste et sur les rendez-vous.</span>
                  </template>
                </UFormField>
                <UFormField label="Statut" name="is_active" class="w-full">
                  <div class="flex items-center gap-3">
                    <USwitch v-model="categoryForm.is_active" />
                    <span class="text-sm text-muted">{{ categoryForm.is_active ? 'Visible (actif)' : 'Masquée (inactif)' }}</span>
                  </div>
                </UFormField>
                <div class="flex justify-end gap-2 pt-4 border-t border-default">
                  <UButton variant="ghost" color="neutral" @click="close()">
                    Annuler
                  </UButton>
                  <UButton type="submit" color="primary" :loading="saving">
                    {{ editingCategory ? 'Enregistrer' : 'Créer la catégorie' }}
                  </UButton>
                </div>
              </UForm>
            </UCard>
          </template>
        </UModal>
      </Teleport>
    </ClientOnly>

    <!-- Modal confirmation suppression -->
    <UModal v-model:open="showDeleteModal" :ui="{ content: 'max-w-sm w-full' }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-error-100 dark:bg-error-900/40">
                <UIcon name="i-lucide-trash-2" class="w-5 h-5 text-error-600 dark:text-error-400" />
              </div>
              <div>
                <h3 class="font-normal text-foreground">Supprimer la catégorie</h3>
                <p class="text-sm text-muted mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
          </template>
          <p class="text-sm text-muted">
            Êtes-vous sûr de vouloir supprimer <strong>{{ categoryToDelete?.name }}</strong> ?
          </p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">
                Annuler
              </UButton>
              <UButton color="error" :loading="deletingId !== null" @click="doDelete">
                Supprimer
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
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

const categories = ref<any[]>([]);
const loading = ref(true);
const saving = ref(false);
const togglingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const typeFilter = ref('all');
const showCreateModal = ref(false);
const showDeleteModal = ref(false);
const editingCategory = ref<any>(null);
const categoryToDelete = ref<any>(null);

const typeOptionsFilter = [
  { label: 'Toutes', value: 'all' },
  { label: 'Prise de sang', value: 'blood_test' },
  { label: 'Soins infirmiers', value: 'nursing' },
];

const typeOptionsForm = [
  { label: 'Prise de sang', value: 'blood_test' },
  { label: 'Soins infirmiers', value: 'nursing' },
];

// Icônes Lucide limitées au médical / soins
const LUCIDE_MEDICAL_ICON_NAMES = [
  'activity', 'ambulance', 'bandage', 'beaker', 'heart', 'heart-pulse', 'stethoscope', 'syringe', 'pill', 'thermometer',
  'bone', 'brain', 'eye', 'ear', 'hand-heart', 'baby', 'user-round', 'droplet', 'flask-conical', 'test-tubes',
  'microscope', 'scan', 'scan-heart', 'pulse', 'apple', 'carrot', 'clipboard-list', 'file-text', 'file',
  'hospital', 'cross', 'first-aid', 'badge-check', 'tag', 'tags',
];

// Set "Medical Icons" (Iconify) — icônes médicales
const MEDICAL_ICON_NAMES = [
  'first-aid', 'ambulance', 'hospital', 'emergency', 'pharmacy', 'laboratory', 'surgery', 'dental', 'dermatology',
  'cardiology', 'neurology', 'oncology', 'pediatrics', 'pathology', 'radiology', 'anesthesia', 'physical-therapy',
  'mental-health', 'nutrition', 'immunizations', 'infectious-diseases', 'internal-medicine', 'ophthalmology',
  'ear-nose-throat', 'kidney', 'mammography', 'ultrasound', 'medical-records', 'health-education', 'health-services',
  'inpatient', 'outpatient', 'intensive-care', 'labor-delivery', 'nursery', 'womens-health', 'genetics',
  'diabetes-education', 'hearing-assistance', 'medical-library', 'billing', 'registration', 'waiting-area',
  'care-staff-area', 'administration', 'accessibility', 'alternative-complementary', 'cath-lab', 'family-practice',
  'imaging-alternative-ct', 'imaging-alternative-mri', 'imaging-alternative-pet', 'respiratory', 'mri-pet',
];

// Set "Health Icons" (Iconify) — 2000+ icônes santé / soins
const HEALTH_ICON_NAMES = [
  'syringe', 'stethoscope', 'thermometer', 'test-tubes', 'microscope', 'medicine-mortar', 'medicine-bottle',
  'hospital', 'doctor', 'nurse', 'health-worker', 'blood-drop', 'heart-organ', 'xray', 'wheelchair', 'crutches',
  'bandage-adhesive', 'medicines', 'pill-1', 'nutrition', 'exercise', 'walking', 'running', 'weight',
  'intravenous-bag', 'pulse-oximeter', 'defibrillator', 'blood-pressure-monitor', 'ultrasound-scanner',
  'tooth', 'ear', 'eye', 'lungs', 'kidneys', 'stomach', 'bladder', 'skeleton', 'joints',
  'pediatrics', 'cardiology', 'oncology', 'radiology', 'general-surgery', 'gynecology', 'urology',
  'outpatient', 'inpatient', 'intensive-care-unit', 'emergency-post', 'ambulatory-clinic',
  'syringe-vaccine', 'ppe-face-mask', 'ppe-sanitizer',
];

// Set "Covid Icons" (Iconify) — vaccins, symptômes, protection
const COVID_ICON_NAMES = [
  'vaccine-protection-syringe', 'vaccine-protection-face-mask-1', 'vaccine-protection-wash-hands',
  'vaccine-protection-shield', 'vaccine-protection-infrared-thermometer-gun', 'vaccine-protection-medicine-pill',
  'symptoms-fever', 'symptoms-cold-fever', 'symptoms-virus-headache-1', 'personal-hygiene-hand-sanitizer-spray',
  'quarantine-place-hospital', 'virus-lab-research-syringe', 'virus-lab-research-test-tube',
];

/** Retourne le nom d’icône pour UIcon (rétrocompat: anciennes valeurs sans préfixe = Lucide) */
function getIconName(icon: string | null | undefined): string {
  if (!icon) return 'i-lucide-tag';
  if (icon.startsWith('medical-icon:')) return 'i-medical-icon-' + icon.slice('medical-icon:'.length);
  if (icon.startsWith('healthicons:')) return 'i-healthicons-' + icon.slice('healthicons:'.length);
  if (icon.startsWith('covid:')) return 'i-covid-' + icon.slice('covid:'.length);
  return 'i-lucide-' + icon;
}

function iconLabel(prefix: string, name: string): string {
  return prefix + ' · ' + name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const iconSelectItems = computed(() => {
  const lucide = LUCIDE_MEDICAL_ICON_NAMES.map((name) => ({
    value: name,
    label: iconLabel('Lucide', name),
  }));
  const medical = MEDICAL_ICON_NAMES.map((name) => ({
    value: 'medical-icon:' + name,
    label: iconLabel('Medical', name),
  }));
  const health = HEALTH_ICON_NAMES.map((name) => ({
    value: 'healthicons:' + name,
    label: iconLabel('Health', name),
  }));
  const covid = COVID_ICON_NAMES.map((name) => ({
    value: 'covid:' + name,
    label: iconLabel('Covid', name),
  }));
  return [...lucide, ...medical, ...health, ...covid];
});

const categoryForm = ref({
  name: '',
  description: '',
  type: 'blood_test',
  icon: '',
  is_active: true,
});

const filteredCategories = computed(() => {
  if (typeFilter.value === 'all') return categories.value;
  return categories.value.filter((c) => c.type === typeFilter.value);
});

function getTypeLabel(type: string) {
  return type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers';
}

const openCreateModal = () => {
  editingCategory.value = null;
  categoryForm.value = {
    name: '',
    description: '',
    type: 'blood_test',
    icon: '',
    is_active: true,
  };
  showCreateModal.value = true;
};

async function fetchCategories() {
  loading.value = true;
  try {
    const response = await apiFetch('/categories?include_inactive=true', { method: 'GET' });
    if (response.success && response.data) {
      categories.value = response.data;
    }
  } catch (error) {
    console.error('Erreur lors du chargement des catégories:', error);
    toast.add({ title: 'Erreur de chargement', color: 'red' });
  } finally {
    loading.value = false;
  }
}

function editCategory(category: any) {
  editingCategory.value = category;
  categoryForm.value = {
    name: category.name,
    description: category.description || '',
    type: category.type,
    icon: category.icon || '',
    is_active: category.is_active,
  };
  showCreateModal.value = true;
}

async function toggleCategory(category: any) {
  togglingId.value = category.id;
  try {
    const response = await apiFetch(`/categories/${category.id}`, {
      method: 'PUT',
      body: { is_active: !category.is_active },
    });
    if (response.success) {
      toast.add({ title: category.is_active ? 'Catégorie désactivée' : 'Catégorie activée', color: 'green' });
      await fetchCategories();
    } else {
      toast.add({ title: 'Erreur', description: response.error, color: 'red' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  } finally {
    togglingId.value = null;
  }
}

function confirmDelete(category: any) {
  categoryToDelete.value = category;
  showDeleteModal.value = true;
}

async function doDelete() {
  if (!categoryToDelete.value) return;
  deletingId.value = categoryToDelete.value.id;
  try {
    const response = await apiFetch(`/categories/${categoryToDelete.value.id}`, { method: 'DELETE' });
    if (response.success) {
      toast.add({ title: 'Catégorie supprimée', color: 'green' });
      showDeleteModal.value = false;
      categoryToDelete.value = null;
      await fetchCategories();
    } else {
      toast.add({ title: 'Erreur', description: response.error, color: 'red' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  } finally {
    deletingId.value = null;
  }
}

async function saveCategory() {
  if (!categoryForm.value.name?.trim()) {
    toast.add({ title: 'Nom requis', description: 'Saisissez le nom du soin.', color: 'red' });
    return;
  }
  saving.value = true;
  try {
    const body = {
      name: categoryForm.value.name.trim(),
      description: categoryForm.value.description?.trim() || '',
      type: categoryForm.value.type,
      icon: categoryForm.value.icon || null,
      is_active: !!categoryForm.value.is_active,
    };
    if (editingCategory.value) {
      const response = await apiFetch(`/categories/${editingCategory.value.id}`, { method: 'PUT', body });
      if (response.success) {
        toast.add({ title: 'Catégorie modifiée', color: 'green' });
        showCreateModal.value = false;
        editingCategory.value = null;
        await fetchCategories();
      } else {
        toast.add({ title: 'Erreur', description: response.error, color: 'red' });
      }
    } else {
      const response = await apiFetch('/categories', { method: 'POST', body });
      if (response.success) {
        toast.add({ title: 'Catégorie créée', color: 'green' });
        showCreateModal.value = false;
        await fetchCategories();
      } else {
        toast.add({ title: 'Erreur', description: response.error, color: 'red' });
      }
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  fetchCategories();
});
</script>
