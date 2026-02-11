<template>
  <div>
    <UButton to="/pro/patients" variant="ghost" class="mb-4">
      <UIcon name="i-lucide-arrow-left" class="mr-2" />
      Retour à la liste
    </UButton>
    
    <h1 class="text-3xl font-bold mb-6">Ajouter un patient</h1>
    
    <UCard>
      <UForm :state="patientForm" @submit="createPatient" class="space-y-4">
        <UFormGroup label="Prénom" name="first_name" required>
          <UInput v-model="patientForm.first_name" />
        </UFormGroup>
        
        <UFormGroup label="Nom" name="last_name" required>
          <UInput v-model="patientForm.last_name" />
        </UFormGroup>
        
        <UFormGroup label="Email" name="email" required>
          <UInput v-model="patientForm.email" type="email" />
        </UFormGroup>
        
        <UFormGroup label="Téléphone" name="phone">
          <UInput v-model="patientForm.phone" />
        </UFormGroup>
        
        <UFormGroup label="Date de naissance" name="birth_date">
          <UInput v-model="patientForm.birth_date" type="date" />
        </UFormGroup>
        
        <UFormGroup label="Adresse" name="address">
          <UInput v-model="patientForm.address" />
        </UFormGroup>
        
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="navigateTo('/pro/patients')">
            Annuler
          </UButton>
          <UButton type="submit" :loading="saving">
            Créer le patient
          </UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

import { apiFetch } from '~/utils/api';

const patientForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  address: '',
});

const saving = ref(false);
const toast = useToast();

const createPatient = async () => {
  saving.value = true;
  try {
    const response = await apiFetch('/patients', {
      method: 'POST',
      body: patientForm.value,
    });
    
    if (response.success) {
      toast.add({
        title: 'Patient créé',
        description: 'Le patient a été ajouté avec succès',
        color: 'green',
      });
      navigateTo('/pro/patients');
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Impossible de créer le patient',
      color: 'red',
    });
  } finally {
    saving.value = false;
  }
};
</script>

