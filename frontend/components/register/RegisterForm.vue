<template>
  <div class="w-full max-w-xl mx-auto">
    <UCard class="overflow-hidden shadow-xl border-0" :ui="{ body: 'p-6 sm:p-8' }">
      <template #header>
        <div class="text-center pb-2">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" :class="headerIconBg">
            <UIcon :name="headerIcon" class="w-7 h-7 text-white" />
          </div>
          <h1 class="text-2xl sm:text-3xl font-normal text-foreground">
            {{ title }}
          </h1>
          <p class="text-muted mt-2 text-sm sm:text-base">
            {{ subtitle }}
          </p>
        </div>
      </template>

      <form class="space-y-5" @submit.prevent="onSubmit">
        <UFormField label="Email" name="email" required class="w-full">
          <UInput
            v-model="form.email"
            type="email"
            placeholder="contact@exemple.fr"
            size="lg"
            class="w-full"
            required
            autocomplete="email"
          />
        </UFormField>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Prénom" name="first_name" required class="w-full">
            <UInput
              v-model="form.first_name"
              placeholder="Prénom"
              size="lg"
              class="w-full"
              required
              autocomplete="given-name"
            />
          </UFormField>
          <UFormField label="Nom" name="last_name" required class="w-full">
            <UInput
              v-model="form.last_name"
              placeholder="Nom"
              size="lg"
              class="w-full"
              required
              autocomplete="family-name"
            />
          </UFormField>
        </div>
        <UFormField label="Téléphone" name="phone" class="w-full">
          <UInput
            v-model="form.phone"
            type="tel"
            placeholder="06 12 34 56 78"
            size="lg"
            class="w-full"
            autocomplete="tel"
          />
        </UFormField>

        <!-- Lab: SIRET + Raison sociale -->
        <template v-if="role === 'lab'">
          <UFormField label="SIRET" name="siret" required class="w-full">
            <UInput
              v-model="form.siret"
              placeholder="123 456 789 00012"
              size="lg"
              class="w-full font-mono"
              maxlength="14"
              :ui="{ base: 'tracking-wider' }"
            />
            <template #hint>
              <span class="text-xs text-muted">14 chiffres — numéro d’identification de votre laboratoire</span>
            </template>
          </UFormField>
          <UFormField label="Raison sociale ou nom du laboratoire" name="company_name" class="w-full">
            <UInput
              v-model="form.company_name"
              placeholder="Laboratoire Dupont"
              size="lg"
              class="w-full"
            />
          </UFormField>
        </template>

        <!-- Pro: Emploi (profession de santé) + Numéro Adeli -->
        <template v-if="role === 'pro'">
          <UFormField label="Profession (emploi)" name="emploi" required class="w-full">
            <USelectMenu
              v-model="form.emploi"
              :items="proEmploiItems"
              value-key="value"
              placeholder="Rechercher votre profession..."
              size="lg"
              class="w-full"
              :ui="{ rounded: 'rounded-xl' }"
              searchable
              by="value"
            >
              <template #label>
                <span v-if="form.emploi">{{ form.emploi }}</span>
                <span v-else class="text-gray-400">Rechercher votre profession...</span>
              </template>
            </USelectMenu>
          </UFormField>
          <UFormField label="Numéro Adeli" name="adeli" required class="w-full">
            <UInput
              v-model="form.adeli"
              placeholder="123456789"
              size="lg"
              class="w-full font-mono"
              maxlength="9"
            />
            <template #hint>
              <span class="text-xs text-muted">9 chiffres — numéro d’enregistrement auprès de l’ARS</span>
            </template>
          </UFormField>
        </template>

        <!-- Nurse: RPPS -->
        <template v-if="role === 'nurse'">
          <UFormField label="Numéro RPPS" name="rpps" required class="w-full">
            <UInput
              v-model="form.rpps"
              placeholder="12345678901"
              size="lg"
              class="w-full font-mono"
              maxlength="11"
            />
            <template #hint>
              <span class="text-xs text-muted">11 chiffres — Répertoire partagé des professionnels de santé</span>
            </template>
          </UFormField>
        </template>

        <AddressSelector
          v-model="form.addressSelection"
          label="Adresse"
          placeholder="Recherchez votre adresse..."
          :required="false"
          class="w-full"
          @update:model-value="onAddressSelect"
        />

        <UButton
          type="submit"
          block
          size="lg"
          :loading="loading"
          :disabled="!canSubmit"
          class="mt-6 w-full py-3 text-base font-medium"
          :color="submitColor"
        >
          {{ submitLabel }}
        </UButton>
      </form>

      <template #footer>
        <p class="text-center text-sm text-muted">
          Déjà un compte ?
          <NuxtLink :to="'/login'" class="font-medium text-primary hover:underline">
            Se connecter
          </NuxtLink>
        </p>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { PRO_SANTE_EMPLOIS } from '~/constants/proEmploi';

const proEmploiItems = [...PRO_SANTE_EMPLOIS];

const props = withDefaults(
  defineProps<{
    role: 'lab' | 'pro' | 'nurse';
    title: string;
    subtitle: string;
    headerIcon: string;
    headerIconBg: string;
    submitLabel: string;
    submitColor?: string;
    /** Email pré-rempli depuis la page login (query ?email=...) */
    initialEmail?: string;
  }>(),
  { initialEmail: '' }
);

const emit = defineEmits<{
  submit: [payload: Record<string, string>];
}>();

interface AddressSelection {
  label: string;
  street?: string;
  city?: string;
  postcode?: string;
  lat?: number;
  lng?: number;
}

const form = reactive({
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  address: '',
  addressSelection: null as AddressSelection | null,
  siret: '',
  adeli: '',
  rpps: '',
  company_name: '',
  emploi: '' as string,
});

// Pré-remplir l'email depuis l'URL (ex. /nurse/register?email=xxx après choix sur login)
watch(() => props.initialEmail, (v) => {
  if (v?.trim()) form.email = v.trim();
}, { immediate: true });

function onAddressSelect(value: AddressSelection | null) {
  form.addressSelection = value;
  form.address = value ? value.label : '';
}

const loading = ref(false);

const canSubmit = computed(() => {
  if (!form.email?.trim() || !form.first_name?.trim() || !form.last_name?.trim()) return false;
  if (props.role === 'lab' && !form.siret?.replace(/\s/g, '')) return false;
  if (props.role === 'pro' && (!form.adeli?.replace(/\s/g, '') || !form.emploi?.trim())) return false;
  if (props.role === 'nurse' && !form.rpps?.replace(/\s/g, '')) return false;
  return true;
});

function onSubmit() {
  const payload: Record<string, string> = {
    role: props.role,
    email: form.email.trim(),
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    phone: form.phone?.trim() || '',
    address: (form.address || '').trim(),
  };
  if (props.role === 'lab') {
    payload.siret = (form.siret || '').replace(/\s/g, '');
    payload.company_name = form.company_name?.trim() || '';
  }
  if (props.role === 'pro') {
    payload.adeli = (form.adeli || '').replace(/\s/g, '');
    if (form.emploi?.trim()) payload.emploi = form.emploi.trim();
  }
  if (props.role === 'nurse') payload.rpps = (form.rpps || '').replace(/\s/g, '');
  emit('submit', payload);
}

defineExpose({ setLoading: (v: boolean) => { loading.value = v; } });
</script>
