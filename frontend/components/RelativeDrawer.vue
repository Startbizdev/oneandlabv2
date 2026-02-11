<template>
  <UDrawer 
    v-model:open="isOpen"
    :title="relative ? 'Modifier le proche' : 'Ajouter un proche'"
    direction="right"
    :ui="{ 
      container: 'max-w-md',
      content: 'w-full sm:max-w-md'
    }"
  >
    <UButton class="hidden" />
    
    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
        <span class="ml-3 text-gray-600 dark:text-gray-400">Chargement des données...</span>
      </div>
      
      <UForm
        v-else
        :state="form"
        @submit="handleSave"
        class="space-y-4"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Prénom" name="first_name" required>
            <UInput
              v-model="form.first_name"
              placeholder="Prénom du proche"
              size="xl"
              class="w-full"
              required
            />
          </UFormField>

          <UFormField label="Nom" name="last_name" required>
            <UInput
              v-model="form.last_name"
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
              v-model="form.relationship_type"
              :items="relationshipOptions"
              placeholder="Sélectionner le lien"
              size="xl"
              class="w-full"
              required
            />
          </UFormField>

          <UFormField label="Genre" name="gender">
            <USelect
              v-model="form.gender"
              :items="genderOptions"
              placeholder="Optionnel"
              size="xl"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Date de naissance" name="birth_date">
          <BirthdayPicker
            v-model="form.birth_date"
            placeholder="Sélectionner la date de naissance"
          />
        </UFormField>

        <div class="border-t pt-4 mt-4">
          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Informations de contact (optionnelles)</h4>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Si non renseignées, vos informations seront utilisées pour les rendez-vous.
          </p>

          <AddressSelector
            v-model="form.address"
            label="Adresse"
            name="address"
            placeholder="Commencez à taper votre adresse..."
          />

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <UFormField label="Email" name="email">
              <UInput
                v-model="form.email"
                type="email"
                placeholder="email@exemple.com"
                size="xl"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Téléphone" name="phone">
              <UInput
                v-model="form.phone"
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
          @click="handleClose"
          :disabled="saving"
          class="justify-center"
        >
          Annuler
        </UButton>
        <UButton
          color="primary"
          size="xl"
          @click="handleSave"
          :loading="saving"
          class="justify-center"
        >
          {{ relative ? 'Enregistrer' : 'Ajouter' }}
        </UButton>
      </div>
    </template>
  </UDrawer>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

const props = defineProps<{
  open: boolean;
  relative?: any;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'saved': [];
}>();

const toast = useToast();

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
});

const loading = ref(false);
const saving = ref(false);

const form = ref({
  first_name: '',
  last_name: '',
  relationship_type: '',
  gender: '',
  birth_date: '',
  email: '',
  phone: '',
  address: null as any,
});

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

// Charger les données quand on ouvre avec un relative
watch([() => props.relative, () => props.open], async ([newRelative, newOpen]) => {
  if (newOpen) {
    if (newRelative) {
      loading.value = true;
      try {
        const response = await apiFetch(`/patient-relatives/${newRelative.id}`, {
          method: 'GET',
        });
        
        if (response.success && response.data) {
          const data = response.data;
          form.value = {
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            relationship_type: data.relationship_type || '',
            gender: data.gender || '',
            birth_date: data.birth_date || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || null,
          };
        }
      } catch (error) {
        toast.add({
          title: 'Erreur',
          description: 'Impossible de charger les données',
          color: 'error',
        });
      } finally {
        loading.value = false;
      }
    } else {
      // Reset form pour ajout
      form.value = {
        first_name: '',
        last_name: '',
        relationship_type: '',
        gender: '',
        birth_date: '',
        email: '',
        phone: '',
        address: null,
      };
    }
  }
}, { immediate: true });

const handleClose = () => {
  isOpen.value = false;
};

const handleSave = async () => {
  if (!form.value.first_name || !form.value.last_name || !form.value.relationship_type) {
    toast.add({
      title: 'Erreur',
      description: 'Veuillez remplir tous les champs obligatoires',
      color: 'error',
    });
    return;
  }
  
  saving.value = true;
  
  try {
    const url = props.relative 
      ? `/patient-relatives/${props.relative.id}`
      : '/patient-relatives';
    
    const method = props.relative ? 'PUT' : 'POST';
    
    const response = await apiFetch(url, {
      method,
      body: JSON.stringify(form.value),
    });
    
    if (response.success) {
      toast.add({
        title: 'Succès',
        description: props.relative ? 'Proche modifié avec succès' : 'Proche ajouté avec succès',
        color: 'success',
      });
      
      emit('saved');
      isOpen.value = false;
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Une erreur est survenue',
        color: 'error',
      });
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue',
      color: 'error',
    });
  } finally {
    saving.value = false;
  }
};
</script>
