<template>
  <div>
    <TitleDashboard title="Paramètres" icon="i-lucide-settings" />
    
    <div class="space-y-6">
      <!-- Informations du compte -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">Informations du compte</h2>
        </template>
        
        <UForm :state="settingsForm" @submit="saveSettings" class="space-y-4">
          <UFormGroup label="Email" name="email">
            <UInput v-model="settingsForm.email" type="email" disabled />
          </UFormGroup>
          
          <UFormGroup label="Prénom" name="first_name">
            <UInput v-model="settingsForm.first_name" />
          </UFormGroup>
          
          <UFormGroup label="Nom" name="last_name">
            <UInput v-model="settingsForm.last_name" />
          </UFormGroup>
          
          <UFormGroup label="Téléphone" name="phone">
            <UInput v-model="settingsForm.phone" />
          </UFormGroup>
          
          <UFormGroup label="Adresse" name="address">
            <AddressSelector
              v-model="settingsForm.address"
              placeholder="Commencez à taper votre adresse..."
            />
          </UFormGroup>
          
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
                <p>Veuillez d'abord définir votre adresse dans les informations du compte pour configurer votre zone de couverture.</p>
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
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'subaccount',
});

import { apiFetch } from '~/utils/api';

const { user } = useAuth();
const toast = useToast();

const settingsForm = ref({
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  address: null as any,
});

const coverageZone = ref<any>(null);
const saving = ref(false);
const savingCoverage = ref(false);
const coverageRadius = ref(20); // Rayon par défaut de 20 km

onMounted(async () => {
  await loadSettings();
  await loadCoverage();
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
        address: response.data.address || null,
      };
    }
  }
};

const loadCoverage = async () => {
  try {
    const response = await apiFetch(`/coverage-zones?owner_id=${user.value?.id}&role=subaccount`, {
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
        role: 'subaccount',
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
</script>

