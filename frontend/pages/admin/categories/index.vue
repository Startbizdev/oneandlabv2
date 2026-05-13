<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
    <AppPageHeader :edge-bleed="false" 
      title="Catégories de soins"
      description="Gérez les types de soins : nom, type (prise de sang ou soins infirmiers), activation et suppression."
    >
      <template #actions>
        <UButton color="primary" icon="i-lucide-plus" size="md" :on-click="openCreateModal">
          Nouvelle catégorie
        </UButton>
      </template>
    </AppPageHeader>
  </template>

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
          :on-click="() => typeFilter = opt.value"
        >
          {{ opt.label }}
        </UButton>
      </div>
    </div>

    <!-- Liste compacte -->
    <div v-if="loading" class="rounded-lg border border-default divide-y divide-default overflow-hidden">
      <div v-for="i in 8" :key="i" class="flex items-center gap-3 px-3 py-2.5 sm:px-4 animate-pulse">
        <div class="h-9 w-9 shrink-0 rounded-md bg-muted/50" />
        <div class="min-w-0 flex-1 space-y-1.5">
          <div class="h-4 w-40 max-w-full rounded bg-muted/50" />
          <div class="h-3 w-24 rounded bg-muted/40" />
        </div>
      </div>
    </div>

    <UEmpty
      v-else-if="filteredCategories.length === 0"
      icon="i-lucide-tags"
      title="Aucune catégorie"
      description="Aucune catégorie ne correspond au filtre. Créez une nouvelle catégorie de soin."
      :actions="[{ label: 'Créer une catégorie', variant: 'solid', onClick: openCreateModal }]"
      class="rounded-xl border border-default bg-default/30 py-12"
    />

    <div v-else class="rounded-lg border border-default bg-default divide-y divide-default overflow-hidden">
      <div
        v-for="cat in filteredCategories"
        :key="cat.id"
        class="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4 sm:py-2 min-h-[2.75rem] transition-colors hover:bg-muted/20"
        :class="!cat.is_active ? 'opacity-70' : ''"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-default bg-muted/30 dark:bg-muted/20"
          >
            <CareCategoryVisual
              :image-src="categoryListImageSrc(cat)"
              :icon-name="getIconName(cat.icon)"
              icon-class="h-4 w-4 text-muted"
              img-class="h-7 w-7 object-contain"
            />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span class="truncate text-sm font-medium text-foreground">{{ cat.name }}</span>
              <UBadge
                :color="cat.type === 'blood_test' ? 'error' : 'info'"
                :leading-icon="cat.type === 'blood_test' ? 'i-lucide-syringe' : 'i-lucide-stethoscope'"
                variant="subtle"
                size="xs"
                class="shrink-0"
              >
                {{ getTypeLabel(cat.type) }}
              </UBadge>
            </div>
            <p v-if="cat.description" class="truncate text-xs text-muted mt-0.5">
              {{ cat.description }}
            </p>
          </div>
        </div>

        <div class="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-end sm:pl-2">
          <div class="flex items-center gap-1.5">
            <span class="text-[11px] text-muted whitespace-nowrap">Actif</span>
            <USwitch
              :model-value="!!cat.is_active"
              :disabled="togglingId === cat.id"
              size="xs"
              @update:model-value="toggleCategory(cat)"
            />
          </div>
          <div class="flex items-center gap-0.5">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              square
              icon="i-lucide-pencil"
              aria-label="Modifier"
              :disabled="saving"
              :on-click="() => editCategory(cat)"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              square
              icon="i-lucide-trash-2"
              aria-label="Supprimer"
              :loading="deletingId === cat.id"
              :disabled="togglingId === cat.id"
              :on-click="() => confirmDelete(cat)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Créer / Modifier : sections linéaires, scroll interne -->
    <ClientOnly>
      <Teleport to="body">
        <UModal v-model:open="showCreateModal" :ui="{ content: 'max-w-md w-full max-h-[min(92dvh,44rem)] flex flex-col overflow-hidden sm:rounded-xl' }">
          <template #content="{ close }">
            <UCard
              :ui="{
                root: 'flex flex-col max-h-[min(92dvh,44rem)] overflow-hidden divide-y divide-default shadow-none ring-0',
                header: 'p-4 sm:p-4 shrink-0',
                body: 'p-0 flex-1 flex flex-col min-h-0 overflow-hidden',
              }"
            >
              <template #header>
                <div class="flex items-start gap-3">
                  <div class="min-w-0 flex-1 space-y-0.5">
                    <h2 class="text-base font-semibold tracking-tight text-foreground leading-snug">
                      {{ editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie' }}
                    </h2>
                    <p class="text-xs text-muted leading-relaxed">
                      {{ editingCategory ? 'Nom, type, apparence (icône / image), options du formulaire RDV.' : 'Remplissez chaque bloc — le type définit où le soin apparaît.' }}
                    </p>
                  </div>
                  <UButton variant="ghost" color="neutral" icon="i-lucide-x" size="xs" square class="shrink-0" aria-label="Fermer" :on-click="close" />
                </div>
              </template>
              <UForm :state="categoryForm" class="flex flex-1 flex-col min-h-0" @submit="saveCategory">
                <div class="flex-1 overflow-y-auto overflow-x-hidden">
                  <!-- ① Texte catalogue -->
                  <div class="px-4 py-3 space-y-3 sm:px-4 border-b border-default">
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Nom & description</p>
                    <UFormField label="Nom du soin" name="name" required class="w-full">
                      <UInput
                        v-model="categoryForm.name"
                        placeholder="Ex. Bilan sanguin, pansement…"
                        size="sm"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField
                      label="Description"
                      name="description"
                      description="Facultatif, affichée si renseignée."
                      class="w-full"
                      :ui="{ description: 'text-[11px] text-muted leading-snug' }"
                    >
                      <UTextarea
                        v-model="categoryForm.description"
                        placeholder="Une phrase qui aide le patient à choisir"
                        :rows="2"
                        autoresize
                        :maxrows="4"
                        class="w-full"
                        size="sm"
                      />
                    </UFormField>
                  </div>

                  <!-- ② Type -->
                  <div class="px-4 py-3 space-y-2.5 sm:px-4 border-b border-default">
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Type</p>
                    <UFormField label="Nature du rendez-vous" name="type" required class="w-full" :ui="{ label: 'text-xs font-medium text-muted' }">
                      <div class="flex flex-wrap gap-1.5">
                        <UButton
                          v-for="t in typeOptionsForm"
                          :key="t.value"
                          type="button"
                          :variant="categoryForm.type === t.value ? 'solid' : 'outline'"
                          :color="categoryForm.type === t.value ? 'primary' : 'neutral'"
                          size="sm"
                          class="rounded-lg px-3"
                          :on-click="() => (categoryForm.type = t.value)"
                        >
                          {{ t.label }}
                        </UButton>
                      </div>
                    </UFormField>
                  </div>

                  <!-- ③ Apparence -->
                  <div class="px-4 py-3 space-y-3 sm:px-4 border-b border-default">
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Apparence</p>
                    <UFormField
                      name="icon"
                      label="Icône (sans image)"
                      description="Utilisée partout tant qu’aucune image maison."
                      class="w-full"
                      :ui="{ label: 'text-xs font-medium text-muted', description: 'text-[11px] text-muted leading-snug' }"
                    >
                      <USelectMenu
                        v-model="categoryForm.icon"
                        :items="iconSelectItems"
                        value-key="value"
                        :search-input="{ placeholder: 'Rechercher une icône…' }"
                        :filter-fields="['label']"
                        placeholder="Icône Lucide ou Medical…"
                        size="sm"
                        class="w-full"
                      >
                        <template #leading>
                          <UIcon
                            :name="categoryForm.icon ? getIconName(categoryForm.icon) : 'i-lucide-sparkles'"
                            :class="categoryForm.icon ? 'w-4 h-4 text-primary-500' : 'w-4 h-4 text-muted'"
                          />
                        </template>
                        <template #item="{ item }">
                          <div class="flex items-center gap-2.5 py-1">
                            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                              <UIcon :name="getIconName(item.value)" class="w-4 h-4 text-muted" />
                            </div>
                            <span class="text-sm font-medium">{{ item.label }}</span>
                          </div>
                        </template>
                      </USelectMenu>
                    </UFormField>

                    <UFormField
                      label="Image personnalisée"
                      name="category_image"
                      description="JPEG, PNG, WebP ou GIF · max 2 Mo — prime sur l’icône."
                      class="w-full"
                      :ui="{
                        label: 'text-xs font-medium text-muted',
                        description: 'text-[11px] text-muted leading-snug',
                      }"
                    >
                      <div class="flex items-start gap-3">
                        <input
                          ref="categoryImageInputRef"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          class="hidden"
                          @change="onCategoryImageFileChange"
                        />
                        <div
                          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-default bg-muted/30 dark:bg-muted/20"
                        >
                          <CareCategoryVisual
                            :image-src="modalCategoryImageSrc"
                            :icon-name="getIconName(categoryForm.icon)"
                            icon-class="h-6 w-6 text-muted"
                            img-class="h-9 w-9 object-contain"
                          />
                        </div>
                        <div class="flex min-w-0 flex-1 flex-wrap gap-2">
                          <UButton
                            type="button"
                            size="sm"
                            variant="outline"
                            color="neutral"
                            icon="i-lucide-image-plus"
                            :on-click="() => categoryImageInputRef?.click()"
                          >
                            Choisir
                          </UButton>
                          <UButton
                            v-if="pendingImageFile || editingCategory?.image_url"
                            type="button"
                            size="sm"
                            variant="ghost"
                            color="error"
                            icon="i-lucide-trash-2"
                            :disabled="uploadingImage"
                            :on-click="removeCategoryImageAction"
                          >
                            Retirer
                          </UButton>
                        </div>
                      </div>
                    </UFormField>
                  </div>

                  <!-- ④ Statut -->
                  <div class="px-4 py-3 sm:px-4 border-b border-default">
                    <div class="flex items-center justify-between gap-4">
                      <div class="min-w-0 space-y-0.5">
                        <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Statut</p>
                        <p class="text-xs text-muted">Visible dans les listes si actif.</p>
                      </div>
                      <div class="flex shrink-0 items-center gap-2">
                        <USwitch v-model="categoryForm.is_active" size="sm" />
                        <span class="text-xs font-medium text-foreground">{{ categoryForm.is_active ? 'Actif' : 'Inactif' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- ⑤ Options formulaire RDV -->
                  <div class="px-4 py-3 space-y-2.5 sm:px-4">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 space-y-1">
                        <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Champs lors du RDV</p>
                        <p class="text-xs text-muted leading-relaxed">
                          Options affichées sous ce soin (ex. type de plaie).
                        </p>
                      </div>
                      <UButton
                        type="button"
                        variant="outline"
                        size="xs"
                        icon="i-lucide-plus"
                        class="shrink-0"
                        :on-click="addCategoryOption"
                      >
                        Ajouter
                      </UButton>
                    </div>

                    <ul v-if="categoryForm.options.length" class="space-y-0 divide-y divide-default rounded-lg border border-default overflow-hidden" role="list">
                      <li
                        v-for="(opt, idx) in categoryForm.options"
                        :key="idx"
                        class="bg-muted/20 dark:bg-muted/10 px-3 py-2.5 space-y-2"
                      >
                        <div class="flex flex-wrap items-center gap-x-2 gap-y-2">
                          <span class="text-[11px] font-mono tabular-nums text-muted w-6 shrink-0">{{ idx + 1 }}.</span>
                          <UInput
                            v-model="opt.option_key"
                            placeholder="clé_technique"
                            size="sm"
                            class="w-[9.25rem] min-w-[7rem]"
                          />
                          <UInput
                            v-model="opt.label"
                            placeholder="Libellé affiché"
                            size="sm"
                            class="min-w-[10rem] flex-1"
                          />
                          <UButton
                            type="button"
                            variant="ghost"
                            color="error"
                            size="xs"
                            square
                            icon="i-lucide-trash-2"
                            aria-label="Supprimer l’option"
                            class="ml-auto sm:ml-0"
                            :on-click="() => removeCategoryOption(idx)"
                          />
                        </div>
                        <div class="flex flex-wrap items-start gap-2 pl-0 sm:pl-8">
                          <USelect
                            v-model="opt.field_type"
                            :items="[
                              { label: 'Liste', value: 'select' },
                              { label: 'Texte', value: 'text' },
                              { label: 'Nombre', value: 'number' },
                            ]"
                            value-key="value"
                            size="sm"
                            class="w-[7.75rem]"
                          />
                          <div class="flex items-center gap-1.5">
                            <USwitch v-model="opt.is_required" size="xs" />
                            <span class="text-[11px] text-muted whitespace-nowrap">Obligatoire</span>
                          </div>
                        </div>
                        <UTextarea
                          v-if="opt.field_type === 'select'"
                          v-model="opt.optionsText"
                          placeholder="Une valeur par ligne"
                          :rows="2"
                          size="sm"
                          class="w-full sm:max-w-none"
                        />
                      </li>
                    </ul>
                    <p v-else class="rounded-lg border border-dashed border-default px-3 py-3 text-center text-xs text-muted">
                      Aucune option — le patient verra uniquement le libellé du soin.
                    </p>
                  </div>
                </div>

                <div class="flex shrink-0 items-center justify-end gap-2 bg-default px-4 py-3 sm:px-4">
                  <UButton variant="ghost" color="neutral" size="sm" :on-click="close">
                    Annuler
                  </UButton>
                  <UButton type="submit" color="primary" size="sm" :loading="saving || uploadingImage">
                    {{ editingCategory ? 'Enregistrer' : 'Créer' }}
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
              <UButton variant="ghost" color="neutral" :on-click="() => showDeleteModal = false">
                Annuler
              </UButton>
              <UButton color="error" :loading="deletingId !== null" :on-click="doDelete">
                Supprimer
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

import { apiFetch } from '~/utils/api';
import { resolveCareCategoryImageSrc } from '~/utils/care-icons';
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

const categoryImageInputRef = ref<HTMLInputElement | null>(null);
const pendingImageFile = ref<File | null>(null);
const pendingImageObjectUrl = ref<string | null>(null);
const uploadingImage = ref(false);

const config = useRuntimeConfig();

const typeOptionsFilter = [
  { label: 'Toutes', value: 'all' },
  { label: 'Prélèvement', value: 'blood_test' },
  { label: 'Soins infirmiers', value: 'nursing' },
];

const typeOptionsForm = [
  { label: 'Prélèvement', value: 'blood_test' },
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

const categoryForm = ref<{
  name: string;
  description: string;
  type: string;
  icon: string;
  is_active: boolean;
  options: Array<{ option_key: string; label: string; field_type: string; options?: { value: string; label: string }[]; optionsText?: string; is_required: boolean }>;
}>({
  name: '',
  description: '',
  type: 'blood_test',
  icon: '',
  is_active: true,
  options: [],
});

function addCategoryOption() {
  categoryForm.value.options.push({
    option_key: '',
    label: '',
    field_type: 'select',
    options: [],
    optionsText: '',
    is_required: false,
  });
}

function removeCategoryOption(idx: number) {
  categoryForm.value.options.splice(idx, 1);
}

function optionsTextToArray(text: string): { value: string; label: string }[] {
  if (!text || typeof text !== 'string') return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        return { value: line.slice(0, colonIdx).trim().replace(/\s+/g, '_').toLowerCase(), label: line.slice(colonIdx + 1).trim() };
      }
      const slug = line.replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '');
      return { value: slug || line, label: line };
    });
}

function optionsArrayToText(opts: { value: string; label: string }[] | null | undefined): string {
  if (!opts || !Array.isArray(opts)) return '';
  return opts.map((o) => (o.value === o.label ? o.label : `${o.value}:${o.label}`)).join('\n');
}

const filteredCategories = computed(() => {
  if (typeFilter.value === 'all') return categories.value;
  return categories.value.filter((c) => c.type === typeFilter.value);
});

function revokePendingImagePreview() {
  if (pendingImageObjectUrl.value) {
    URL.revokeObjectURL(pendingImageObjectUrl.value);
    pendingImageObjectUrl.value = null;
  }
}

onUnmounted(() => {
  revokePendingImagePreview();
});

function categoryListImageSrc(cat: any): string | null {
  return resolveCareCategoryImageSrc(cat?.image_url ?? null, config.public.apiBase);
}

const modalCategoryImageSrc = computed(() => {
  if (pendingImageObjectUrl.value) return pendingImageObjectUrl.value;
  return resolveCareCategoryImageSrc(editingCategory.value?.image_url ?? null, config.public.apiBase);
});

function onCategoryImageFileChange(e: Event) {
  const el = e.target as HTMLInputElement;
  const file = el.files?.[0];
  el.value = '';
  if (!file) return;
  revokePendingImagePreview();
  pendingImageFile.value = file;
  pendingImageObjectUrl.value = URL.createObjectURL(file);
}

function clearSelectedCategoryImageFile() {
  pendingImageFile.value = null;
  revokePendingImagePreview();
}

async function removeStoredCategoryImage() {
  if (!editingCategory.value?.id) return;
  try {
    const response = await apiFetch(`/categories/${editingCategory.value.id}`, {
      method: 'PUT',
      body: { image_url: '' },
    });
    if (response.success) {
      toast.add({ title: 'Image supprimée', color: 'green' });
      editingCategory.value = { ...editingCategory.value, image_url: null };
      await fetchCategories();
    } else {
      toast.add({ title: 'Erreur', description: response.error, color: 'red' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  }
}

async function removeCategoryImageAction() {
  if (pendingImageFile.value) {
    clearSelectedCategoryImageFile();
    return;
  }
  await removeStoredCategoryImage();
}

async function uploadPendingCategoryImage(categoryId: string) {
  const file = pendingImageFile.value;
  if (!file || !categoryId) return;
  uploadingImage.value = true;
  try {
    const fd = new FormData();
    fd.append('category_id', categoryId);
    fd.append('file', file);
    const response = await apiFetch('/categories/upload-image', { method: 'POST', body: fd });
    if (!response.success) {
      throw new Error(response.error || 'Échec upload');
    }
    clearSelectedCategoryImageFile();
  } finally {
    uploadingImage.value = false;
  }
}

function getTypeLabel(type: string) {
  return type === 'blood_test' ? 'Prélèvement' : 'Soins infirmiers';
}

const openCreateModal = () => {
  editingCategory.value = null;
  clearSelectedCategoryImageFile();
  categoryForm.value = {
    name: '',
    description: '',
    type: 'blood_test',
    icon: '',
    is_active: true,
    options: [],
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
  clearSelectedCategoryImageFile();
  const opts = (category.options || []).map((o: any) => ({
    option_key: o.option_key || '',
    label: o.label || '',
    field_type: o.field_type || 'select',
    options: o.options || [],
    optionsText: optionsArrayToText(o.options),
    is_required: !!o.is_required,
  }));
  categoryForm.value = {
    name: category.name,
    description: category.description || '',
    type: category.type,
    icon: category.icon || '',
    is_active: category.is_active,
    options: opts.length ? opts : [],
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
    const optionsPayload = (categoryForm.value.options || [])
      .filter((o) => o.option_key?.trim() && o.label?.trim())
      .map((o, idx) => ({
        option_key: o.option_key.trim(),
        label: o.label.trim(),
        field_type: o.field_type || 'select',
        options: o.field_type === 'select' ? optionsTextToArray(o.optionsText || '') : undefined,
        is_required: !!o.is_required,
        sort_order: idx,
      }));

    const body = {
      name: categoryForm.value.name.trim(),
      description: categoryForm.value.description?.trim() || '',
      type: categoryForm.value.type,
      icon: categoryForm.value.icon || null,
      is_active: !!categoryForm.value.is_active,
      options: optionsPayload,
    };
    if (editingCategory.value) {
      const catId = editingCategory.value.id as string;
      const response = await apiFetch(`/categories/${catId}`, { method: 'PUT', body });
      if (response.success) {
        let imageWarn = '';
        if (pendingImageFile.value) {
          try {
            await uploadPendingCategoryImage(catId);
          } catch (e: any) {
            imageWarn = e.message || 'erreur';
          }
        }
        if (imageWarn) {
          toast.add({
            title: 'Catégorie modifiée',
            description: 'Image non enregistrée : ' + imageWarn,
            color: 'amber',
          });
        } else {
          toast.add({ title: 'Catégorie modifiée', color: 'green' });
        }
        showCreateModal.value = false;
        editingCategory.value = null;
        await fetchCategories();
      } else {
        toast.add({ title: 'Erreur', description: response.error, color: 'red' });
      }
    } else {
      const response = await apiFetch('/categories', { method: 'POST', body });
      if (response.success) {
        const newId = response.data?.id as string | undefined;
        let imageWarn = '';
        if (newId && pendingImageFile.value) {
          try {
            await uploadPendingCategoryImage(newId);
          } catch (e: any) {
            imageWarn = e.message || 'erreur';
          }
        }
        if (imageWarn) {
          toast.add({
            title: 'Catégorie créée',
            description: 'Image non enregistrée : ' + imageWarn,
            color: 'amber',
          });
        } else {
          toast.add({ title: 'Catégorie créée', color: 'green' });
        }
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
