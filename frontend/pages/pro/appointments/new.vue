<template>
  <div>
    <UButton to="/pro" variant="ghost" class="mb-4">
      <UIcon name="i-lucide-arrow-left" class="mr-2" />
      Retour
    </UButton>
    
    <h1 class="text-3xl font-bold mb-6">Créer un rendez-vous pour un patient</h1>
    
    <UCard>
      <UForm :state="form" @submit="handleSubmit" class="space-y-6">
        <UFormGroup label="Type de rendez-vous" name="type" required>
          <USelect v-model="form.type" :options="typeOptions" />
        </UFormGroup>
        
        <UFormGroup label="Patient" name="patient_id" required>
          <USelect v-model="form.patient_id" :options="patientOptions" placeholder="Sélectionner un patient" />
        </UFormGroup>
        
        <UFormGroup label="Catégorie" name="category_id" required>
          <USelect v-model="form.category_id" :options="categoryOptions" />
        </UFormGroup>
        
        <UFormGroup label="Date et heure" name="scheduled_at" required>
          <UInput v-model="form.scheduled_at" type="datetime-local" />
        </UFormGroup>
        
        <UFormGroup label="Adresse" name="address" required>
          <UInput
            v-model="addressQuery"
            placeholder="Commencez à taper votre adresse..."
            @input="searchAddress"
          />
          <ul v-if="addressSuggestions.length" class="mt-2 border rounded bg-white shadow-lg">
            <li
              v-for="suggestion in addressSuggestions"
              :key="suggestion.label"
              @click="selectAddress(suggestion)"
              class="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {{ suggestion.label }}
            </li>
          </ul>
        </UFormGroup>
        
        <UFormGroup label="Notes" name="notes">
          <UTextarea v-model="form.notes" rows="4" />
        </UFormGroup>
        
        <div class="flex space-x-4">
          <UButton type="submit" :loading="submitting">
            Créer le rendez-vous
          </UButton>
          <UButton type="button" variant="ghost" @click="navigateTo('/pro')">
            Annuler
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

const { createAppointment } = useAppointments();

const form = reactive({
  type: 'blood_test',
  patient_id: '',
  category_id: '',
  scheduled_at: '',
  address: null as any,
  notes: '',
});

const addressQuery = ref('');
const addressSuggestions = ref<any[]>([]);
const submitting = ref(false);

const typeOptions = [
  { label: 'Prise de sang', value: 'blood_test' },
  { label: 'Soins infirmiers', value: 'nursing' },
];

const patientOptions = ref([]);
const categoryOptions = ref([]);

const searchAddress = async () => {
  const query = addressQuery.value?.trim() || '';
  if (query.length < 3) {
    addressSuggestions.value = [];
    return;
  }
  
  try {
    const response = await apiFetch(`/ban/search?q=${encodeURIComponent(query)}&limit=10`, {
      method: 'GET',
    });
    if (response.success && response.data) {
      addressSuggestions.value = response.data;
    } else {
      addressSuggestions.value = [];
    }
  } catch (error) {
    // Ignorer les erreurs silencieusement pour ne pas polluer la console
    addressSuggestions.value = [];
  }
};

const selectAddress = (suggestion: any) => {
  form.address = {
    label: suggestion.label,
    lat: suggestion.lat,
    lng: suggestion.lng,
  };
  addressQuery.value = suggestion.label;
  addressSuggestions.value = [];
};

const handleSubmit = async () => {
  submitting.value = true;
  
  const result = await createAppointment({
    ...form,
    form_type: form.type,
    form_data: {
      notes: form.notes,
    },
  });
  
  if (result.success) {
    navigateTo('/pro');
  }
  
  submitting.value = false;
};

onMounted(async () => {
  const { user } = useAuth();
  const route = useRoute();
  
  // Charger les catégories
  const categoriesResponse = await apiFetch(`/categories?type=${form.type}`, {
    method: 'GET',
  });
  if (categoriesResponse.success && categoriesResponse.data) {
    categoryOptions.value = categoriesResponse.data.map((c: any) => ({
      label: c.name,
      value: c.id,
    }));
  }
  
  // Charger les patients
  const patientsResponse = await apiFetch(`/patients?created_by=${user.value?.id}`, {
    method: 'GET',
  });
  if (patientsResponse.success && patientsResponse.data) {
    patientOptions.value = patientsResponse.data.map((p: any) => ({
      label: `${p.first_name} ${p.last_name} (${p.email})`,
      value: p.id,
    }));
  }
  
  // Pré-sélectionner si patient_id dans URL
  if (route.query.patient_id) {
    form.patient_id = route.query.patient_id as string;
  }
});
</script>

