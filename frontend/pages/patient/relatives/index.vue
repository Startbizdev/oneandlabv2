<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Mes proches"
      description="Gérez les proches pour lesquels vous prenez des rendez-vous"
    >
      <template #actions>
        <UButton
          color="primary"
          icon="i-lucide-plus"
          size="sm"
          @click="showCreateModal = true"
        >
          Ajouter un proche
        </UButton>
      </template>
    </TitleDashboard>

    <div class="container mx-auto px-4 max-w-7xl">
    <!-- Liste des proches -->
    <div v-if="loading" class="text-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
      <p class="text-gray-500">Chargement des proches...</p>
    </div>

    <div v-else-if="relatives.length === 0" class="text-center py-12">
      <UIcon name="i-lucide-users" class="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">Aucun proche enregistré</h3>
      <p class="text-gray-500 mb-6">Ajoutez vos proches pour pouvoir prendre des rendez-vous pour eux.</p>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        size="xl"
        @click="showCreateModal = true"
      >
        Ajouter mon premier proche
      </UButton>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard
        v-for="relative in relatives"
        :key="relative.id"
        class="hover:shadow-md transition-all duration-200 group"
        :ui="{ 
          body: { padding: 'p-4' },
          ring: 'ring-1 ring-gray-200 dark:ring-gray-800',
          shadow: 'shadow-sm'
        }"
      >
        <div class="space-y-4">
          <!-- Header avec avatar et badge -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 flex-1 min-w-0">
              <div class="flex-shrink-0">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 flex items-center justify-center text-white font-normal text-lg shadow-sm">
                  {{ getInitials(relative.first_name, relative.last_name) }}
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-normal text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {{ relative.first_name }} {{ relative.last_name }}
                </h3>
                <UBadge
                  :color="getRelationshipColor(relative.relationship_type)"
                  variant="subtle"
                  size="sm"
                  class="mt-1.5"
                >
                  <UIcon :name="getRelationshipIcon(relative.relationship_type)" class="w-3 h-3 mr-1" />
                  {{ getRelationshipLabel(relative.relationship_type) }}
                </UBadge>
              </div>
            </div>
            <div class="relative">
              <button
                @click.stop="toggleMenu(relative.id)"
                class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <UIcon name="i-lucide-more-vertical" class="w-4 h-4 text-gray-500" />
              </button>
              
              <!-- Menu dropdown -->
              <div
                v-if="openMenuId === relative.id"
                @click.stop
                class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
              >
                <button
                  @click="editRelative(relative); closeMenu()"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg transition-colors"
                >
                  <UIcon name="i-lucide-edit" class="w-4 h-4" />
                  Modifier
                </button>
                <button
                  @click="deleteRelative(relative); closeMenu()"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 last:rounded-b-lg transition-colors"
                >
                  <UIcon name="i-lucide-trash-2" class="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>

          <!-- Informations -->
          <div class="space-y-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div v-if="relative.birth_date" class="flex items-center gap-2.5 text-sm">
              <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-calendar" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Date de naissance</p>
                <p class="font-medium text-gray-900 dark:text-gray-100">{{ formatDate(relative.birth_date) }}</p>
              </div>
            </div>
            
            <div v-if="relative.email" class="flex items-center gap-2.5 text-sm">
              <div class="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-mail" class="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p class="font-medium text-gray-900 dark:text-gray-100 truncate">{{ relative.email }}</p>
              </div>
            </div>
            
            <div v-if="relative.phone" class="flex items-center gap-2.5 text-sm">
              <div class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-phone" class="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Téléphone</p>
                <p class="font-medium text-gray-900 dark:text-gray-100">{{ relative.phone }}</p>
              </div>
            </div>
            
            <div v-if="!relative.email && !relative.phone && !relative.birth_date" class="text-sm text-gray-500 dark:text-gray-400 italic">
              Informations limitées
            </div>
          </div>

          <!-- Actions -->
          <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
            <UButton
              color="primary"
              variant="outline"
              size="sm"
              icon="i-lucide-calendar-plus"
              @click="createAppointmentFor(relative)"
              class="w-full"
              block
            >
              Prendre un rendez-vous
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Drawer de création/édition -->
    <UDrawer 
      v-model:open="showCreateModal"
      :title="editingRelative ? 'Modifier le proche' : 'Ajouter un proche'"
      direction="right"
      :ui="{ 
        container: 'max-w-md',
        content: 'w-full sm:max-w-md'
      }"
    >
      <!-- Trigger caché (le drawer est contrôlé par v-model:open) -->
      <UButton class="hidden" />
      
      <template #body>
        <div v-if="loadingRelative" class="flex items-center justify-center py-12">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
          <span class="ml-3 text-gray-600 dark:text-gray-400">Chargement des données...</span>
        </div>
        
        <UForm
          v-else
          :state="relativeForm"
          @submit="saveRelative"
          class="space-y-4"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Prénom" name="first_name" required>
              <UInput
                v-model="relativeForm.first_name"
                placeholder="Prénom du proche"
                size="xl"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField label="Nom" name="last_name" required>
              <UInput
                v-model="relativeForm.last_name"
                placeholder="Nom du proche"
                size="xl"
                class="w-full"
                required
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Lien de parenté" name="relationship_type" required>
              <USelect
                v-model="relativeForm.relationship_type"
                :items="relationshipOptions"
                placeholder="Sélectionner le lien"
                size="xl"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField label="Genre" name="gender">
              <USelect
                v-model="relativeForm.gender"
                :items="genderOptions"
                placeholder="Optionnel"
                size="xl"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="Date de naissance" name="birth_date">
            <BirthdayPicker
              v-model="relativeForm.birth_date"
              placeholder="Sélectionner la date de naissance"
            />
          </UFormField>

          <div class="border-t pt-4 mt-4">
            <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Informations de contact (optionnelles)</h4>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Si non renseignées, vos informations seront utilisées pour les rendez-vous.
            </p>

            <AddressSelector
              v-model="relativeForm.address"
              label="Adresse"
              name="address"
              placeholder="Commencez à taper votre adresse..."
            />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <UFormField label="Email" name="email">
                <UInput
                  v-model="relativeForm.email"
                  type="email"
                  placeholder="email@exemple.com"
                  size="xl"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Téléphone" name="phone">
                <UInput
                  v-model="relativeForm.phone"
                  type="tel"
                  placeholder="+33 6 XX XX XX XX"
                  size="xl"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </UForm>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            variant="outline"
            color="neutral"
            size="xl"
            @click="closeModal"
            :disabled="saving"
            class="justify-center"
          >
            Annuler
          </UButton>
          <UButton
            color="primary"
            size="xl"
            :loading="saving"
            icon="i-lucide-save"
            @click="saveRelative"
            class="justify-center"
          >
            {{ editingRelative ? 'Enregistrer' : 'Ajouter' }}
          </UButton>
        </div>
      </template>
    </UDrawer>

    <!-- Modal de confirmation de suppression -->
    <AlertModal
      v-model="showDeleteModal"
      title="Confirmer la suppression"
      :message="`Êtes-vous sûr de vouloir supprimer ${deletingRelative?.first_name} ${deletingRelative?.last_name} ? Cette action est irréversible.`"
      confirm-label="Supprimer"
      cancel-label="Annuler"
      confirm-color="error"
      icon-type="error"
      :loading="deleting"
      @confirm="confirmDelete"
    />
    </div>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

definePageMeta({
  layout: 'patient',
  middleware: ['auth', 'role'],
  role: 'patient',
});

const { user } = useAuth();
const toast = useAppToast();

// État
const relatives = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const loadingRelative = ref(false);
const showCreateModal = ref(false);
const showDeleteModal = ref(false);
const editingRelative = ref<any>(null);
const deletingRelative = ref<any>(null);
const openMenuId = ref<string | null>(null);

// Formulaire
const relativeForm = ref({
  first_name: '',
  last_name: '',
  relationship_type: '',
  gender: '',
  birth_date: '',
  email: '',
  phone: '',
  address: null as any,
});

// Options pour les selects
const relationshipOptions = [
  { label: 'Enfant', value: 'child' },
  { label: 'Parent', value: 'parent' },
  { label: 'Conjoint(e)', value: 'spouse' },
  { label: 'Frère/Sœur', value: 'sibling' },
  { label: 'Grand-parent', value: 'grandparent' },
  { label: 'Petit-enfant', value: 'grandchild' },
  { label: 'Autre', value: 'other' },
];

const genderOptions = [
  { label: 'Homme', value: 'male' },
  { label: 'Femme', value: 'female' },
  { label: 'Autre', value: 'other' },
];

// Chargement initial
onMounted(() => {
  fetchRelatives();
});

// Fonctions
const fetchRelatives = async () => {
  loading.value = true;
  try {
    const response = await apiFetch('/patient-relatives', {
      method: 'GET',
    });
    if (response.success && response.data) {
      relatives.value = response.data;
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Impossible de charger les proches',
      color: 'red',
    });
  } finally {
    loading.value = false;
  }
};

const saveRelative = async () => {
  // Validation basique
  if (!relativeForm.value.first_name || !relativeForm.value.last_name || !relativeForm.value.relationship_type) {
    toast.add({
      title: 'Erreur de validation',
      description: 'Veuillez remplir tous les champs obligatoires',
      color: 'red',
    });
    return;
  }

  saving.value = true;
  try {
    let response;
    if (editingRelative.value) {
      // Mise à jour
      response = await apiFetch(`/patient-relatives/${editingRelative.value.id}`, {
        method: 'PUT',
        body: relativeForm.value,
      });
    } else {
      // Création
      response = await apiFetch('/patient-relatives', {
        method: 'POST',
        body: relativeForm.value,
      });
    }

    if (response.success) {
      toast.add({
        title: 'Succès',
        description: editingRelative.value ? 'Proche modifié avec succès' : 'Proche ajouté avec succès',
        color: 'green',
      });
      await fetchRelatives();
      closeModal();
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Une erreur est survenue',
        color: 'red',
      });
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue',
      color: 'red',
    });
  } finally {
    saving.value = false;
  }
};

const editRelative = async (relative: any) => {
  editingRelative.value = relative;
  
  // Ouvrir le drawer immédiatement
  showCreateModal.value = true;
  loadingRelative.value = true;
  
  // Charger les données complètes depuis l'API
  try {
    const response = await apiFetch(`/patient-relatives/${relative.id}`, {
      method: 'GET',
    });
    
    if (response.success && response.data) {
      const relativeData = response.data;
      relativeForm.value = {
        first_name: relativeData.first_name || '',
        last_name: relativeData.last_name || '',
        relationship_type: relativeData.relationship_type || '',
        gender: relativeData.gender || '',
        birth_date: relativeData.birth_date || '',
        email: relativeData.email || '',
        phone: relativeData.phone || '',
        address: relativeData.address || null,
      };
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Impossible de charger les données du proche',
        color: 'red',
      });
      // Fermer le drawer en cas d'erreur
      showCreateModal.value = false;
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Impossible de charger les données du proche',
      color: 'red',
    });
    // Fermer le drawer en cas d'erreur
    showCreateModal.value = false;
  } finally {
    loadingRelative.value = false;
  }
};

const deleteRelative = (relative: any) => {
  deletingRelative.value = relative;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (!deletingRelative.value) return;

  deleting.value = true;
  try {
    const response = await apiFetch(`/patient-relatives/${deletingRelative.value.id}`, {
      method: 'DELETE',
    });
    if (response.success) {
      toast.add({
        title: 'Succès',
        description: 'Proche supprimé avec succès',
        color: 'green',
      });
      await fetchRelatives();
      showDeleteModal.value = false;
      deletingRelative.value = null;
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Impossible de supprimer le proche',
        color: 'red',
      });
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue',
      color: 'red',
    });
  } finally {
    deleting.value = false;
  }
};

const closeModal = () => {
  showCreateModal.value = false;
  editingRelative.value = null;
  loadingRelative.value = false;
  relativeForm.value = {
    first_name: '',
    last_name: '',
    relationship_type: '',
    gender: '',
    birth_date: '',
    email: '',
    phone: '',
    address: null,
  };
};

// Gestion du menu dropdown
const toggleMenu = (relativeId: string) => {
  openMenuId.value = openMenuId.value === relativeId ? null : relativeId;
};

const closeMenu = () => {
  openMenuId.value = null;
};

// Fermer le menu si on clique ailleurs
if (typeof window !== 'undefined') {
  onMounted(() => {
    document.addEventListener('click', closeMenu);
  });
  
  onUnmounted(() => {
    document.removeEventListener('click', closeMenu);
  });
}

const createAppointmentFor = (relative: any) => {
  // Rediriger vers le formulaire de RDV avec le proche sélectionné
  navigateTo(`/rendez-vous/nouveau?relative_id=${relative.id}`);
};

const getRelationshipColor = (type: string) => {
  const colors: Record<string, string> = {
    child: 'blue',
    parent: 'green',
    spouse: 'purple',
    sibling: 'orange',
    grandparent: 'teal',
    grandchild: 'pink',
    other: 'gray',
  };
  return colors[type] || 'gray';
};

const getRelationshipLabel = (type: string) => {
  const labels: Record<string, string> = {
    child: 'Enfant',
    parent: 'Parent',
    spouse: 'Conjoint(e)',
    sibling: 'Frère/Sœur',
    grandparent: 'Grand-parent',
    grandchild: 'Petit-enfant',
    other: 'Autre',
  };
  return labels[type] || type;
};

const getRelationshipIcon = (type: string) => {
  const icons: Record<string, string> = {
    child: 'i-lucide-baby',
    parent: 'i-lucide-users',
    spouse: 'i-lucide-heart',
    sibling: 'i-lucide-user-check',
    grandparent: 'i-lucide-user-circle',
    grandchild: 'i-lucide-smile',
    other: 'i-lucide-user',
  };
  return icons[type] || 'i-lucide-user';
};

const getInitials = (firstName: string, lastName: string) => {
  const first = firstName?.charAt(0).toUpperCase() || '';
  const last = lastName?.charAt(0).toUpperCase() || '';
  return `${first}${last}` || '?';
};

const formatDate = (date: string) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};
</script>
