<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-lg font-medium">{{ brand ? 'Modifier la marque' : 'Nouvelle marque' }}</h3>
        </template>
        <form class="space-y-5" @submit.prevent="saveBrand">
          <UFormField label="Nom" required>
            <UInput v-model="form.name" placeholder="Nom du réseau" class="w-full" />
          </UFormField>

          <UFormField label="Logo" help="PNG, JPEG ou WebP, 2 Mo maximum. Il s’affiche aux patients lors du choix du réseau.">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-default bg-muted/20">
                <img v-if="form.logo_url" :src="form.logo_url" alt="Aperçu du logo" class="h-12 w-12 object-contain" />
                <UIcon v-else name="i-lucide-image" class="h-6 w-6 text-muted" aria-hidden="true" />
              </div>
              <input ref="logoInput" type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" aria-label="Fichier du logo" @change="uploadLogo" />
              <UButton variant="outline" color="neutral" icon="i-lucide-upload" :loading="uploadingLogo" @click="logoInput?.click()">
                {{ form.logo_url ? 'Changer le logo' : 'Importer un logo' }}
              </UButton>
              <UButton v-if="form.logo_url" variant="ghost" color="neutral" @click="removeLogo">Retirer</UButton>
            </div>
            <p v-if="logoError" role="alert" class="mt-2 text-sm text-error">{{ logoError }}</p>
            <UButton variant="link" color="neutral" size="xs" class="mt-1 px-0" @click="toggleLogoUrl">
              {{ showLogoUrl ? 'Masquer l’adresse du logo' : 'Utiliser une adresse web à la place' }}
            </UButton>
            <UInput v-if="showLogoUrl" v-model="form.logo_url" type="url" placeholder="https://…" aria-label="Adresse web du logo" class="mt-1 w-full" />
          </UFormField>

          <UFormField label="Site web">
            <UInput v-model="form.website_url" type="url" placeholder="https://…" class="w-full" />
          </UFormField>

          <UFormField
            label="Comptes labo qui reçoivent les RDV"
            help="Un labo reçoit les RDV de ce réseau si l’adresse du patient est dans sa zone de prise de sang et qu’il accepte les rendez-vous."
          >
            <USelectMenu
              v-model="form.lab_ids"
              :items="labSelectItems"
              value-key="value"
              multiple
              :loading="labsLoading"
              :disabled="labsLoading || labsError"
              placeholder="Aucun compte labo"
              class="w-full"
              :filter-fields="['label', 'description']"
              :search-input="{ placeholder: 'Filtrer…' }"
              data-testid="brand-lab-select"
            />
            <div v-if="labsError" role="alert" class="mt-2 flex items-center gap-2">
              <p class="text-sm text-error">Liste des laboratoires indisponible.</p>
              <UButton size="xs" variant="outline" color="neutral" @click="emit('retry-labs')">Réessayer</UButton>
            </div>
            <div v-if="suggestions.length" class="mt-3 space-y-1.5">
              <p class="text-xs text-muted">Comptes qui semblent appartenir à ce réseau :</p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  v-for="lab in suggestions"
                  :key="lab.id"
                  size="xs"
                  variant="soft"
                  :color="labBlockReason(lab) ? 'neutral' : 'primary'"
                  icon="i-lucide-plus"
                  :aria-label="`Ajouter ${lab.label}`"
                  @click="addLab(lab.id)"
                >
                  {{ lab.label }}
                </UButton>
              </div>
            </div>
            <AdminLabBrandLabStatus v-if="!labsLoading && !labsError" class="mt-3" :lab-ids="form.lab_ids" :labs-by-id="labsById" />
          </UFormField>

          <div class="flex items-center gap-2">
            <USwitch v-model="form.is_active" aria-label="Visible pour les patients" />
            <span class="text-sm">Visible pour les patients</span>
          </div>

          <UAlert
            v-if="confirmBlocked"
            color="warning"
            variant="soft"
            title="Certains labos ne recevront aucun RDV"
            :description="`${blockedLabs.map(lab => lab.label).join(', ')} : ajoutez une zone de prise de sang active ou activez les RDV sur leur compte.`"
          />
          <UAlert v-if="formError" color="error" variant="soft" :title="formError" />
          <div class="flex justify-end gap-2">
            <UButton variant="outline" color="neutral" @click="close">Annuler</UButton>
            <UButton type="submit" color="primary" :loading="saving">
              {{ confirmBlocked ? 'Enregistrer quand même' : 'Enregistrer' }}
            </UButton>
          </div>
        </form>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { LabBrandAdmin } from '@oneandlab/shared-types';
import { apiFetch } from '~/utils/api';
import { brandLabStatus, labBlockReason, suggestLabsForBrand, type LabAccountOption } from '~/utils/lab-brand-admin';

const props = defineProps<{
  brand: LabBrandAdmin | null;
  labs: readonly LabAccountOption[];
  labsLoading: boolean;
  labsError: boolean;
  nextSortOrder: number;
}>();

const emit = defineEmits<{ saved: []; 'retry-labs': [] }>();
const open = defineModel<boolean>('open', { required: true });

const form = reactive({ name: '', logo_url: '', website_url: '', is_active: true, lab_ids: [] as string[] });
const saving = ref(false);
const formError = ref('');
const uploadingLogo = ref(false);
const logoError = ref('');
const showLogoUrl = ref(false);
const confirmBlocked = ref(false);
const logoInput = ref<HTMLInputElement | null>(null);

const labsById = computed(() => new Map(props.labs.map(lab => [lab.id, lab])));
const labsLoaded = computed(() => !props.labsLoading && !props.labsError);

const labSelectItems = computed(() => {
  const items = props.labs.map(lab => ({
    value: lab.id,
    label: lab.label,
    description: [lab.email, labBlockReason(lab)].filter(Boolean).join(' · ') || undefined,
  }));
  for (const id of form.lab_ids) {
    if (!labsById.value.has(id)) items.unshift({ value: id, label: 'Compte labo inactif ou introuvable', description: undefined });
  }
  return items;
});

const suggestions = computed(() => (labsLoaded.value ? suggestLabsForBrand(form.name, props.labs, form.lab_ids).slice(0, 6) : []));
const blockedLabs = computed(() => brandLabStatus(form.lab_ids, labsById.value).blocked);

watch(() => [...form.lab_ids], () => {
  confirmBlocked.value = false;
});

watch(open, isOpen => {
  if (!isOpen) return;
  form.name = props.brand?.name ?? '';
  form.logo_url = props.brand?.logo_url ?? '';
  form.website_url = props.brand?.website_url ?? '';
  form.is_active = props.brand ? !!props.brand.is_active : true;
  form.lab_ids = [...(props.brand?.lab_ids ?? [])];
  formError.value = '';
  logoError.value = '';
  showLogoUrl.value = false;
  confirmBlocked.value = false;
}, { immediate: true });

function close() {
  open.value = false;
}

function removeLogo() {
  form.logo_url = '';
}

function toggleLogoUrl() {
  showLogoUrl.value = !showLogoUrl.value;
}

function addLab(labId: string) {
  form.lab_ids = [...form.lab_ids, labId];
}

async function uploadLogo(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  uploadingLogo.value = true;
  logoError.value = '';
  try {
    const body = new FormData();
    body.append('file', file);
    const res = (await apiFetch('/admin/lab-brands/upload-logo', { method: 'POST', body })) as {
      success?: boolean;
      data?: { logo_url?: string };
      error?: string;
    };
    if (!res?.success || !res.data?.logo_url) throw new Error(res?.error || 'Le logo n’a pas pu être enregistré. Réessayez.');
    form.logo_url = res.data.logo_url;
  } catch (error) {
    logoError.value = error instanceof Error ? error.message : 'Le logo n’a pas pu être enregistré. Réessayez.';
  } finally {
    uploadingLogo.value = false;
  }
}

async function saveBrand() {
  if (saving.value) return;
  if (!form.name.trim()) {
    formError.value = 'Le nom est requis.';
    return;
  }
  if (labsLoaded.value && blockedLabs.value.length > 0 && !confirmBlocked.value) {
    confirmBlocked.value = true;
    return;
  }
  saving.value = true;
  formError.value = '';
  const body = {
    name: form.name.trim(),
    logo_url: form.logo_url.trim() || null,
    website_url: form.website_url.trim() || null,
    is_active: form.is_active ? 1 : 0,
    ...(props.brand ? {} : { sort_order: props.nextSortOrder }),
    // Sans liste de labos chargée, ne pas envoyer lab_ids : le serveur conserve les rattachements existants.
    ...(labsLoaded.value ? { lab_ids: [...form.lab_ids] } : {}),
  };
  try {
    const res = (props.brand
      ? await apiFetch(`/admin/lab-brands/${props.brand.id}`, { method: 'PUT', body })
      : await apiFetch('/admin/lab-brands', { method: 'POST', body })) as { success?: boolean; error?: string };
    if (!res?.success) throw new Error(res?.error || 'Enregistrement impossible. Réessayez.');
    open.value = false;
    emit('saved');
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Enregistrement impossible. Réessayez.';
  } finally {
    saving.value = false;
  }
}
</script>
