<template>
  <AppPageShell max-width="5xl" class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Paramètres — commandes pharmacie"
        description="Activez le module et définissez quels métiers peuvent commander ou recevoir des ordonnances."
      >
        <template #actions>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-arrow-left"
            to="/admin/commandes-pharmacie"
          >
            Retour
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <form v-else class="space-y-6" @submit.prevent="save">
      <UCard class="ring-1 ring-default/60">
        <template #header>
          <h2 class="text-base font-medium">Module</h2>
        </template>
        <div class="space-y-4">
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm">Module activé</span>
            <USwitch v-model="form.module_enabled" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm">Commandes autorisées pour les infirmiers</span>
            <USwitch v-model="form.ordering_enabled_for_nurse" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm">Autoriser les métiers « Autre » (saisie libre)</span>
            <USwitch v-model="form.ordering_allow_custom_emploi" />
          </label>
        </div>
      </UCard>

      <UCard class="ring-1 ring-default/60">
        <template #header>
          <div>
            <h2 class="text-base font-medium">Métiers commandeurs (pro)</h2>
            <p class="mt-1 text-xs text-muted">Cochez les professions autorisées à transmettre une ordonnance.</p>
          </div>
        </template>
        <div class="grid gap-2 sm:grid-cols-2">
          <label
            v-for="emploi in emploiPresets"
            :key="`order-${emploi}`"
            class="flex items-center gap-3 rounded-lg border border-default/60 px-3 py-2.5 text-sm"
          >
            <UCheckbox
              :model-value="form.ordering_enabled_emplois.includes(emploi)"
              @update:model-value="(checked) => toggleEmploi('ordering_enabled_emplois', emploi, checked)"
            />
            <span>{{ emploi }}</span>
          </label>
        </div>
      </UCard>

      <UCard class="ring-1 ring-default/60">
        <template #header>
          <div>
            <h2 class="text-base font-medium">Métiers récepteurs (pharmacie)</h2>
            <p class="mt-1 text-xs text-muted">Professions pouvant recevoir des commandes dans leur espace pro.</p>
          </div>
        </template>
        <div class="grid gap-2 sm:grid-cols-2">
          <label
            v-for="emploi in emploiPresets"
            :key="`recv-${emploi}`"
            class="flex items-center gap-3 rounded-lg border border-default/60 px-3 py-2.5 text-sm"
          >
            <UCheckbox
              :model-value="form.pharmacy_receiver_emplois.includes(emploi)"
              @update:model-value="(checked) => toggleEmploi('pharmacy_receiver_emplois', emploi, checked)"
            />
            <span>{{ emploi }}</span>
          </label>
        </div>
      </UCard>

      <div class="flex justify-end">
        <UButton type="submit" color="primary" :loading="saving" icon="i-lucide-save">
          Enregistrer
        </UButton>
      </div>
    </form>
  </AppPageShell>
</template>

<script setup lang="ts">
import type { PharmacyModuleConfig } from '@oneandlab/shared-types';
import { PRO_SANTE_EMPLOI_PRESETS } from '@oneandlab/shared-types';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

useHead({ title: 'Paramètres commandes pharmacie – Administration' });

const toast = useAppToast();
const { fetchAdminConfig, saveAdminConfig } = usePharmacyModule();

const emploiPresets = [...PRO_SANTE_EMPLOI_PRESETS];
const loading = ref(true);
const saving = ref(false);

const form = reactive<PharmacyModuleConfig>({
  module_enabled: true,
  ordering_enabled_for_nurse: true,
  ordering_enabled_emplois: [],
  ordering_allow_custom_emploi: false,
  pharmacy_receiver_emplois: [],
});

function toggleEmploi(field: 'ordering_enabled_emplois' | 'pharmacy_receiver_emplois', emploi: string, checked: boolean | 'indeterminate') {
  const list = form[field];
  const on = checked === true;
  if (on && !list.includes(emploi)) {
    form[field] = [...list, emploi];
  } else if (!on) {
    form[field] = list.filter((e) => e !== emploi);
  }
}

async function load() {
  loading.value = true;
  try {
    const config = await fetchAdminConfig();
    Object.assign(form, config);
  } catch (e: unknown) {
    toast.add({
      title: 'Erreur',
      description: e instanceof Error ? e.message : 'Chargement impossible',
      color: 'error',
    });
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await saveAdminConfig({ ...form });
    toast.add({ title: 'Paramètres enregistrés', color: 'success' });
  } catch (e: unknown) {
    toast.add({
      title: 'Erreur',
      description: e instanceof Error ? e.message : 'Enregistrement impossible',
      color: 'error',
    });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>
