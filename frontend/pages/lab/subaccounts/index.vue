<template>
  <div class="space-y-6">
    <TitleDashboard title="Sous-comptes" icon="i-lucide-user-cog">
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-refresh-cw"
            :loading="loading"
            aria-label="Actualiser"
            @click="fetchSubaccounts"
          />
          <UButton color="primary" icon="i-lucide-plus" @click="openCreateModal">
            Créer un sous-compte
          </UButton>
        </div>
      </template>
    </TitleDashboard>

    <p class="text-sm text-muted">
      Gérez les sous-comptes qui gèrent les rendez-vous pour votre laboratoire.
    </p>

    <!-- Barre de filtres -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher par email, nom, prénom..."
        icon="i-lucide-search"
        class="flex-1 min-w-0 sm:max-w-xs"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary mb-4" />
      <p class="text-muted">Chargement…</p>
    </div>

    <!-- Tableau -->
    <div v-else class="rounded-xl border border-default/50 bg-default overflow-hidden shadow-sm">
      <UTable :data="filteredSubaccounts" :columns="columns">
      <template #empty>
        <div class="py-12">
          <UEmpty
            icon="i-lucide-users"
            title="Aucun sous-compte"
            :description="searchQuery ? 'Aucun résultat pour votre recherche' : 'Créez votre premier sous-compte pour gérer les rendez-vous'"
            :actions="!searchQuery ? [{ label: 'Créer un sous-compte', icon: 'i-lucide-plus', onClick: openCreateModal }] : []"
            variant="naked"
          />
        </div>
      </template>
      <template #email-data="{ row }">
        <span class="font-medium">{{ row.email || '-' }}</span>
      </template>
      
      <template #created_at-data="{ row }">
        {{ formatDate(row.created_at) }}
      </template>
      
      <template #actions-data="{ row }">
        <div class="flex gap-2">
          <UButton size="sm" variant="ghost" icon="i-lucide-pencil" @click="editSubaccount(row)">
            Modifier
          </UButton>
          <UButton
            size="sm"
            variant="ghost"
            color="red"
            icon="i-lucide-trash-2"
            @click="confirmDelete(row)"
          >
            Supprimer
          </UButton>
        </div>
      </template>
    </UTable>
    </div>
    
    <!-- Slideover création/édition (guide Nuxt UI: formulaire dans Slideover) -->
    <USlideover
      v-model:open="showModal"
      :title="editingSubaccount ? 'Modifier le sous-compte' : 'Créer un sous-compte'"
      description="Les données sont chiffrées et conformes HDS (Hébergeur de Données de Santé)."
      :ui="{ body: 'flex flex-col', footer: 'justify-end gap-2' }"
    >
      <template #body>
        <UForm :state="form" @submit="saveSubaccount" class="flex flex-col flex-1 min-h-0">
          <div class="space-y-4 flex-1 overflow-y-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Nom" name="last_name" required>
                <UInput
                  v-model="form.last_name"
                  placeholder="Dupont"
                  :disabled="!!editingSubaccount"
                />
              </UFormField>
              <UFormField label="Prénom" name="first_name" required>
                <UInput
                  v-model="form.first_name"
                  placeholder="Marie"
                  :disabled="!!editingSubaccount"
                />
              </UFormField>
            </div>
            
            <UFormField label="Email" name="email" required>
              <UInput
                v-model="form.email"
                type="email"
                placeholder="marie.dupont@exemple.fr"
                :disabled="!!editingSubaccount"
              />
              <template v-if="editingSubaccount" #hint>
                L'email ne peut pas être modifié pour des raisons de sécurité.
              </template>
            </UFormField>
            
            <UFormField label="Téléphone" name="phone">
              <UInput
                v-model="form.phone"
                type="tel"
                placeholder="06 12 34 56 78"
              />
            </UFormField>
            
            <UCheckbox
              v-if="!editingSubaccount"
              v-model="form.consent"
              label="J'atteste que ce sous-compte a donné son consentement au traitement de ses données dans le cadre RGPD/HDS"
              required
            />
          </div>
        </UForm>
      </template>
      <template #footer="{ close }">
        <UButton variant="ghost" @click="close()">Annuler</UButton>
        <UButton :loading="saving" @click="saveSubaccount">
          {{ editingSubaccount ? 'Enregistrer' : 'Créer' }}
        </UButton>
      </template>
    </USlideover>
    
    <!-- Modal confirmation suppression (slots natifs UModal, portal) -->
    <UModal
      v-model:open="showDeleteModal"
      title="Confirmer la suppression"
      :description="`Êtes-vous sûr de vouloir supprimer le sous-compte ${subaccountToDelete?.email || ''} ? Cette action est irréversible.`"
      :ui="{ content: 'max-w-md', footer: 'justify-end gap-2' }"
    >
      <template #footer="{ close }">
        <UButton variant="ghost" @click="close()">Annuler</UButton>
        <UButton color="red" :loading="deleting" @click="deleteSubaccount">Supprimer</UButton>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'lab',
});

useHead({
  title: 'Sous-comptes – Laboratoire',
});

import { apiFetch } from '~/utils/api';

const toast = useToast();

const subaccounts = ref<any[]>([]);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const searchQuery = ref('');
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingSubaccount = ref<any>(null);
const subaccountToDelete = ref<any>(null);

const form = ref({
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  consent: false,
});

const columns = [
  { id: 'email', accessorKey: 'email', header: 'Email' },
  { id: 'first_name', accessorKey: 'first_name', header: 'Prénom' },
  { id: 'last_name', accessorKey: 'last_name', header: 'Nom' },
  { id: 'created_at', accessorKey: 'created_at', header: 'Créé le' },
  { id: 'actions', accessorKey: 'actions', header: '' },
];

const filteredSubaccounts = computed(() => {
  if (!searchQuery.value.trim()) return subaccounts.value;
  const q = searchQuery.value.toLowerCase();
  return subaccounts.value.filter(
    (s) =>
      s.email?.toLowerCase().includes(q) ||
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q)
  );
});

const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const resetForm = () => {
  form.value = {
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    consent: false,
  };
  editingSubaccount.value = null;
};

const openCreateModal = () => {
  resetForm();
  showModal.value = true;
};

const editSubaccount = (subaccount: any) => {
  editingSubaccount.value = subaccount;
  form.value = {
    email: subaccount.email || '',
    first_name: subaccount.first_name || '',
    last_name: subaccount.last_name || '',
    phone: subaccount.phone || '',
    consent: true,
  };
  showModal.value = true;
};

const saveSubaccount = async () => {
  if (!form.value.email || !form.value.first_name || !form.value.last_name) {
    toast.add({ title: 'Champs requis manquants', color: 'red' });
    return;
  }
  if (!editingSubaccount.value && !form.value.consent) {
    toast.add({ title: 'Veuillez confirmer le consentement RGPD/HDS', color: 'red' });
    return;
  }

  saving.value = true;
  try {
    if (editingSubaccount.value) {
      await apiFetch(`/users/${editingSubaccount.value.id}`, {
        method: 'PUT',
        body: {
          first_name: form.value.first_name,
          last_name: form.value.last_name,
          phone: form.value.phone || null,
        },
      });
      toast.add({ title: 'Sous-compte modifié', color: 'green' });
    } else {
      await apiFetch('/lab/subaccounts', {
        method: 'POST',
        body: {
          email: form.value.email,
          first_name: form.value.first_name,
          last_name: form.value.last_name,
          phone: form.value.phone || null,
        },
      });
      toast.add({ title: 'Sous-compte créé', color: 'green' });
    }
    showModal.value = false;
    resetForm();
    await fetchSubaccounts();
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error?.data?.error || error?.message || 'Une erreur est survenue',
      color: 'red',
    });
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (subaccount: any) => {
  subaccountToDelete.value = subaccount;
  showDeleteModal.value = true;
};

const deleteSubaccount = async () => {
  if (!subaccountToDelete.value) return;
  deleting.value = true;
  try {
    await apiFetch(`/users/${subaccountToDelete.value.id}`, {
      method: 'DELETE',
    });
    toast.add({ title: 'Sous-compte supprimé', color: 'green' });
    showDeleteModal.value = false;
    subaccountToDelete.value = null;
    await fetchSubaccounts();
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error?.data?.error || error?.message,
      color: 'red',
    });
  } finally {
    deleting.value = false;
  }
};

const fetchSubaccounts = async () => {
  loading.value = true;
  try {
    const response = await apiFetch('/lab/subaccounts', { method: 'GET' });
    if (response.success && response.data) {
      subaccounts.value = response.data;
    } else {
      subaccounts.value = [];
    }
  } catch (error) {
    console.error('Erreur chargement sous-comptes:', error);
    subaccounts.value = [];
    toast.add({ title: 'Erreur de chargement', color: 'red' });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchSubaccounts();
});
</script>
