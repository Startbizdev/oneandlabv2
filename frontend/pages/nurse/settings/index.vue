<template>
  <div>
    <div class="space-y-6">
      <!-- Informations personnelles -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">Informations personnelles</h2>
        </template>
        
        <UForm :state="settingsForm" @submit="saveSettings" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Email">
              <UInput v-model="settingsForm.email" type="email" placeholder="Entrez votre adresse email" size="xl" class="w-full bg-gray-50" readonly>
                <template #trailing>
                  <UIcon name="i-lucide-lock" class="w-5 h-5 text-gray-400" />
                </template>
              </UInput>
            </UFormField>
            
            <UFormField label="Téléphone">
              <UInput v-model="settingsForm.phone" placeholder="Entrez votre numéro de téléphone" size="xl" class="w-full" />
            </UFormField>
            
            <UFormField label="Prénom">
              <UInput v-model="settingsForm.first_name" placeholder="Entrez votre prénom" size="xl" class="w-full" />
            </UFormField>
            
            <UFormField label="Nom">
              <UInput v-model="settingsForm.last_name" placeholder="Entrez votre nom" size="xl" class="w-full" />
            </UFormField>
            
            <UFormField label="RPPS">
                <UInput v-model="settingsForm.rpps" placeholder="Entrez votre numéro RPPS" size="xl" class="w-full" />
              </UFormField>
              
              <div>
                <AddressSelector
                  v-model="settingsForm.address"
                  label="Adresse de l'infirmier"
                  placeholder="Commencez à taper votre adresse..."
                />
              </div>
            </div>
          
          <div class="flex justify-end">
            <UButton type="submit" :loading="saving">
              Enregistrer
            </UButton>
          </div>
        </UForm>
      </UCard>
      
      <!-- Zone de couverture -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">Zone de couverture</h2>
          <p class="text-sm text-gray-500 mt-1">Définissez le rayon de votre zone d'intervention depuis votre adresse</p>
        </template>
        
        <div class="space-y-6">
          <div v-if="!settingsForm.address" class="text-sm text-amber-600 bg-amber-50 p-4 rounded-lg">
            <div class="flex items-start gap-3">
              <UIcon name="i-lucide-alert-circle" class="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p class="font-medium mb-1">Adresse requise</p>
                <p>Veuillez d'abord définir votre adresse dans les informations personnelles pour configurer votre zone de couverture.</p>
              </div>
            </div>
          </div>
          
          <div v-else class="space-y-4">
            <div>
              <UFormField label="Rayon de couverture">
                <div class="space-y-3">
                  <USlider 
                    v-model="coverageRadius" 
                    :min="5" 
                    :max="100" 
                    :step="5"
                    :format="(value) => `${value} km`"
                  />
                  <div class="flex items-center justify-between text-sm text-gray-600">
                    <span>5 km</span>
                    <span class="font-semibold text-primary-600 text-lg">{{ coverageRadius }} km</span>
                    <span>100 km</span>
                  </div>
                </div>
              </UFormField>
            </div>
            
            <div class="flex justify-end gap-2">
              <UButton @click="saveCoverage" :loading="savingCoverage">
                Enregistrer le rayon
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
      
    <!-- Préférences catégories de soins -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-bold">Types de soins acceptés</h2>
        <p class="text-sm text-gray-500 mt-1">Activez ou désactivez les types de soins que vous acceptez</p>
      </template>

      <div v-if="loadingCategories" class="text-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary-500" />
        <p class="text-sm text-gray-500 mt-3">Chargement des catégories...</p>
      </div>

      <UEmpty
        v-else-if="categoryPreferences.length === 0"
        icon="i-lucide-alert-circle"
        title="Aucune catégorie disponible"
        description="Aucune catégorie de soins n'est actuellement disponible. Contactez l'administrateur pour ajouter des catégories."
        variant="naked"
      />

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        <div
          v-for="pref in categoryPreferences"
          :key="pref.category_id"
          :class="[
            'group relative flex flex-col p-3 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden',
            pref.is_enabled 
              ? 'bg-white border-gray-200 shadow-sm' 
              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
          ]"
          @click="updateCategoryPreference(pref.category_id, !pref.is_enabled)"
        >

          <!-- Nom de la catégorie -->
          <h3 class="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug mb-2 min-w-0">
            {{ pref.name }}
          </h3>

          <!-- Description -->
          <p v-if="pref.description" class="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-3 flex-grow min-h-0">
            {{ pref.description }}
          </p>

          <!-- Footer avec statut et switch -->
          <div class="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-gray-100">
            <div class="flex items-center gap-1.5">
              <div :class="[
                'w-2 h-2 rounded-full',
                pref.is_enabled ? 'bg-green-500' : 'bg-gray-300'
              ]"></div>
              <span :class="[
                'text-xs font-medium',
                pref.is_enabled ? 'text-green-600' : 'text-gray-500'
              ]">
                {{ pref.is_enabled ? 'Actif' : 'Inactif' }}
              </span>
            </div>
            <USwitch
              v-model="pref.is_enabled"
              @update:model-value="updateCategoryPreference(pref.category_id, $event)"
              @click.stop
              :loading="updatingCategories.has(pref.category_id)"
              :disabled="updatingCategories.has(pref.category_id)"
              size="sm"
              class="flex-shrink-0"
            />
          </div>
        </div>
      </div>
    </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

import { apiFetch } from '~/utils/api';

const { user } = useAuth();
const toast = useToast();

const settingsForm = ref({
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  rpps: '',
  address: null as any,
});

const coverageZone = ref<any>(null);
const categoryPreferences = ref<any[]>([]);
const saving = ref(false);
const savingCoverage = ref(false);
const loadingCategories = ref(false);
const updatingCategories = ref(new Set<string>());
const coverageRadius = ref(20); // Rayon par défaut de 20 km

onMounted(async () => {
  await loadSettings();
  await loadCoverage();
  await loadCategoryPreferences();
});

const loadSettings = async () => {
  if (user.value) {
    const response = await apiFetch(`/users/${user.value.id}`, {
      method: 'GET',
    });
    if (response.success && response.data) {
      settingsForm.value = {
        email: response.data.email || '',
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        phone: response.data.phone || '',
        rpps: response.data.rpps || '',
        address: response.data.address || null,
      };
    }
  }
};

const loadCoverage = async () => {
  try {
    const response = await apiFetch(`/coverage-zones?owner_id=${user.value?.id}&role=nurse`, {
      method: 'GET',
    });
    if (response.success && response.data && response.data.length > 0) {
      coverageZone.value = response.data[0];
      if (coverageZone.value.radius_km) {
        coverageRadius.value = coverageZone.value.radius_km;
      }
    }
  } catch (error) {
    // Erreur silencieuse - les valeurs par défaut sont déjà définies
  }
};

const saveSettings = async () => {
  saving.value = true;
  try {
    if (user.value) {
      const response = await apiFetch(`/users/${user.value.id}`, {
        method: 'PUT',
        body: {
        first_name: settingsForm.value.first_name,
        last_name: settingsForm.value.last_name,
        phone: settingsForm.value.phone,
        rpps: settingsForm.value.rpps,
        address: settingsForm.value.address,
        },
      });
      if (response.success) {
        toast.add({
          title: 'Paramètres sauvegardés',
          description: 'Vos informations ont été mises à jour avec succès.',
          color: 'green',
        });
        await loadSettings();
      } else {
        toast.add({
          title: 'Erreur',
          description: response.error || 'Impossible de sauvegarder les paramètres',
          color: 'red',
        });
      }
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

const saveCoverage = async () => {
  if (!settingsForm.value.address || !settingsForm.value.address.lat || !settingsForm.value.address.lng) {
    toast.add({
      title: 'Erreur',
      description: 'Veuillez d\'abord définir votre adresse',
      color: 'red',
    });
    return;
  }

  savingCoverage.value = true;
  try {
    const response = await apiFetch('/coverage-zones', {
      method: coverageZone.value ? 'PUT' : 'POST',
      body: {
        center_lat: settingsForm.value.address.lat,
        center_lng: settingsForm.value.address.lng,
        radius_km: coverageRadius.value,
        role: 'nurse',
      },
    });
    
    if (response.success) {
      toast.add({
        title: coverageZone.value ? 'Rayon de couverture mis à jour' : 'Rayon de couverture créé',
        description: `Votre zone de couverture de ${coverageRadius.value} km a été enregistrée avec succès.`,
        color: 'green',
      });
      await loadCoverage();
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Impossible d\'enregistrer le rayon',
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
    savingCoverage.value = false;
  }
};

const loadCategoryPreferences = async () => {
  loadingCategories.value = true;
  try {
    const response = await apiFetch('/nurse-category-preferences', {
      method: 'GET',
    });
    if (response.success && response.data) {
      // Convertir is_enabled de number (1/0) en boolean
      categoryPreferences.value = response.data.map((pref: any) => ({
        ...pref,
        is_enabled: Boolean(pref.is_enabled),
      }));
    }
  } catch (error) {
    // Erreur silencieuse - les valeurs par défaut sont déjà définies
  } finally {
    loadingCategories.value = false;
  }
};

const updateCategoryPreference = async (categoryId: string, isEnabled: boolean) => {
  // Trouver la préférence dans la liste
  const preference = categoryPreferences.value.find(p => p.category_id === categoryId);
  if (!preference) {
    toast.add({
      title: 'Erreur',
      description: 'Catégorie non trouvée',
      color: 'red',
    });
    return;
  }

  // Sauvegarder l'ancienne valeur pour rollback en cas d'erreur
  const oldValue = preference.is_enabled;
  
  // Mettre à jour immédiatement l'état local pour une meilleure réactivité
  preference.is_enabled = isEnabled;
  updatingCategories.value.add(categoryId);

  try {
    const response = await apiFetch('/nurse-category-preferences', {
      method: 'PUT',
      body: {
        category_id: categoryId,
        is_enabled: isEnabled
      },
    });
    
    if (response.success) {
      toast.add({
        title: 'Préférence mise à jour',
        description: `Le type de soin "${preference.name}" a été ${isEnabled ? 'activé' : 'désactivé'}.`,
        color: 'green',
      });
    } else {
      // Rollback en cas d'erreur
      preference.is_enabled = oldValue;
      toast.add({
        title: 'Erreur',
        description: response.error || 'Impossible de mettre à jour la préférence',
        color: 'red',
      });
    }
  } catch (error: any) {
    // Rollback en cas d'erreur
    preference.is_enabled = oldValue;
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue lors de la mise à jour',
      color: 'red',
    });
  } finally {
    updatingCategories.value.delete(categoryId);
  }
};
</script>

