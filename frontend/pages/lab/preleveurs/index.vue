<template>
  <div class="space-y-6">
    <TitleDashboard title="Préleveurs" icon="i-lucide-user-check">
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-refresh-cw"
            :loading="loading"
            aria-label="Actualiser"
            @click="fetchPreleveurs"
          />
          <UButton color="primary" icon="i-lucide-plus" @click="openCreateModal">
            Ajouter un préleveur
          </UButton>
        </div>
      </template>
    </TitleDashboard>

    <p class="text-sm text-muted">
      Gérez les préleveurs qui effectuent les prélèvements à domicile.
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
      <UTable :data="filteredPreleveurs" :columns="columns">
      <template #empty>
        <div class="py-12">
          <UEmpty
            icon="i-lucide-user-check"
            title="Aucun préleveur"
            :description="searchQuery ? 'Aucun résultat pour votre recherche' : 'Ajoutez des préleveurs pour effectuer les prélèvements à domicile'"
            :actions="!searchQuery ? [{ label: 'Ajouter un préleveur', icon: 'i-lucide-plus', onClick: openCreateModal }] : []"
            variant="naked"
          />
        </div>
      </template>
      <template #preleveur-data="{ row }">
        <div class="flex items-center gap-3 py-1">
          <UAvatar
            :alt="`${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email"
            size="sm"
            class="flex-shrink-0"
          />
          <div class="min-w-0">
            <p class="font-semibold text-foreground truncate">
              {{ (row.first_name || '') + ' ' + (row.last_name || '') || '—' }}
            </p>
            <p class="text-sm text-muted truncate">{{ row.email || '—' }}</p>
          </div>
        </div>
      </template>
      <template #stats-data="{ row }">
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5">
            <UIcon name="i-lucide-calendar" class="w-4 h-4 text-blue-500" />
            <UBadge color="blue" variant="subtle" size="sm">
              {{ row.stats?.totalAppointments ?? 0 }} RDV
            </UBadge>
          </div>
          <div class="flex items-center gap-1.5">
            <UIcon name="i-lucide-check-circle" class="w-4 h-4 text-green-500" />
            <UBadge color="green" variant="subtle" size="sm">
              {{ row.stats?.completedAppointments ?? 0 }} terminés
            </UBadge>
          </div>
        </div>
      </template>
      <template #created_at-data="{ row }">
        <span class="text-sm text-muted">{{ formatDateShort(row.created_at) }}</span>
      </template>
      <template #actions-data="{ row }">
        <div class="flex items-center gap-1.5">
          <UButton size="xs" variant="ghost" icon="i-lucide-calendar" :to="`/lab/appointments`">
            RDV
          </UButton>
          <UButton size="xs" variant="ghost" icon="i-lucide-pencil" @click="editPreleveur(row)">
            Modifier
          </UButton>
          <UButton size="xs" variant="ghost" color="red" icon="i-lucide-trash-2" @click="confirmDelete(row)">
            Supprimer
          </UButton>
        </div>
      </template>
    </UTable>
    </div>
    
    <!-- Slideover création/édition (guide Nuxt UI) -->
    <USlideover
      v-model:open="showModal"
      :title="editingPreleveur ? 'Modifier le préleveur' : 'Ajouter un préleveur'"
      description="Les données sont chiffrées et conformes HDS (Hébergeur de Données de Santé)."
      :ui="{ body: 'flex flex-col', footer: 'justify-end gap-2' }"
    >
      <template #body>
        <UForm :state="form" @submit="savePreleveur" class="flex flex-col flex-1 min-h-0">
          <div class="space-y-4 flex-1 overflow-y-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Nom" name="last_name" required>
                <UInput v-model="form.last_name" placeholder="Martin" :disabled="!!editingPreleveur" />
              </UFormField>
              <UFormField label="Prénom" name="first_name" required>
                <UInput v-model="form.first_name" placeholder="Jean" :disabled="!!editingPreleveur" />
              </UFormField>
            </div>
            <UFormField label="Email" name="email" required>
              <UInput v-model="form.email" type="email" placeholder="jean.martin@exemple.fr" :disabled="!!editingPreleveur" />
              <template v-if="editingPreleveur" #hint>L'email ne peut pas être modifié pour des raisons de sécurité.</template>
            </UFormField>
            <UFormField label="Téléphone" name="phone" required>
              <UInput v-model="form.phone" type="tel" placeholder="06 12 34 56 78" />
            </UFormField>
            <UCheckbox
              v-if="!editingPreleveur"
              v-model="form.consent"
              label="J'atteste que ce préleveur a donné son consentement au traitement de ses données dans le cadre RGPD/HDS"
              required
            />
          </div>
        </UForm>
      </template>
      <template #footer="{ close }">
        <UButton variant="ghost" @click="close()">Annuler</UButton>
        <UButton :loading="saving" @click="savePreleveur">{{ editingPreleveur ? 'Enregistrer' : 'Créer' }}</UButton>
      </template>
    </USlideover>
    
    <!-- Modal confirmation suppression (slots natifs) -->
    <UModal
      v-model:open="showDeleteModal"
      title="Confirmer la suppression"
      :description="`Êtes-vous sûr de vouloir supprimer le préleveur ${preleveurToDelete?.email || ''} ? Cette action est irréversible.`"
      :ui="{ content: 'max-w-md', footer: 'justify-end gap-2' }"
    >
      <template #footer="{ close }">
        <UButton variant="ghost" @click="close()">Annuler</UButton>
        <UButton color="red" :loading="deleting" @click="deletePreleveur">Supprimer</UButton>
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
  title: 'Préleveurs – Laboratoire',
});

import { apiFetch } from '~/utils/api';

const toast = useToast();

const preleveurs = ref<any[]>([]);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const searchQuery = ref('');
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingPreleveur = ref<any>(null);
const preleveurToDelete = ref<any>(null);

const form = ref({
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  consent: false,
});

const columns = [
  { id: 'preleveur', accessorKey: 'preleveur', header: 'Préleveur' },
  { id: 'stats', accessorKey: 'stats', header: 'Statistiques' },
  { id: 'created_at', accessorKey: 'created_at', header: 'Ajouté le' },
  { id: 'actions', accessorKey: 'actions', header: '' },
];

const filteredPreleveurs = computed(() => {
  if (!searchQuery.value.trim()) return preleveurs.value;
  const q = searchQuery.value.toLowerCase();
  return preleveurs.value.filter(
    (p) =>
      p.email?.toLowerCase().includes(q) ||
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q)
  );
});

const formatDateShort = (date: string) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

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
  editingPreleveur.value = null;
};

const openCreateModal = () => {
  resetForm();
  showModal.value = true;
};

const editPreleveur = (preleveur: any) => {
  editingPreleveur.value = preleveur;
  form.value = {
    email: preleveur.email || '',
    first_name: preleveur.first_name || '',
    last_name: preleveur.last_name || '',
    phone: preleveur.phone || '',
    consent: true,
  };
  showModal.value = true;
};

const savePreleveur = async () => {
  if (!form.value.email || !form.value.first_name || !form.value.last_name) {
    toast.add({ title: 'Champs requis manquants', color: 'red' });
    return;
  }
  if (!editingPreleveur.value && !form.value.consent) {
    toast.add({ title: 'Veuillez confirmer le consentement RGPD/HDS', color: 'red' });
    return;
  }

  saving.value = true;
  try {
    if (editingPreleveur.value) {
      await apiFetch(`/users/${editingPreleveur.value.id}`, {
        method: 'PUT',
        body: {
          first_name: form.value.first_name,
          last_name: form.value.last_name,
          phone: form.value.phone || null,
        },
      });
      toast.add({ title: 'Préleveur modifié', color: 'green' });
    } else {
      await apiFetch('/lab/preleveurs', {
        method: 'POST',
        body: {
          email: form.value.email,
          first_name: form.value.first_name,
          last_name: form.value.last_name,
          phone: form.value.phone || null,
        },
      });
      toast.add({ title: 'Préleveur créé', color: 'green' });
    }
    showModal.value = false;
    resetForm();
    await fetchPreleveurs();
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

const confirmDelete = (preleveur: any) => {
  preleveurToDelete.value = preleveur;
  showDeleteModal.value = true;
};

const deletePreleveur = async () => {
  if (!preleveurToDelete.value) return;
  deleting.value = true;
  try {
    await apiFetch(`/users/${preleveurToDelete.value.id}`, {
      method: 'DELETE',
    });
    toast.add({ title: 'Préleveur supprimé', color: 'green' });
    showDeleteModal.value = false;
    preleveurToDelete.value = null;
    await fetchPreleveurs();
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

const fetchPreleveurs = async () => {
  loading.value = true;
  try {
    const response = await apiFetch('/lab/preleveurs', { method: 'GET' });
    if (response.success && response.data) {
      preleveurs.value = response.data;
    } else {
      preleveurs.value = [];
    }
  } catch (error) {
    console.error('Erreur chargement préleveurs:', error);
    preleveurs.value = [];
    toast.add({ title: 'Erreur de chargement', color: 'red' });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchPreleveurs();
});
</script>
