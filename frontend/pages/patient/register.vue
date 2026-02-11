<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50/80 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950/20 py-12 px-4 sm:px-6">
    <div class="container mx-auto max-w-xl">
      <UCard class="overflow-hidden shadow-xl border-0" :ui="{ body: 'p-6 sm:p-8' }">
        <template #header>
          <div class="text-center pb-2">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-primary-500">
              <UIcon name="i-lucide-user" class="w-7 h-7 text-white" />
            </div>
            <h1 class="text-2xl sm:text-3xl font-bold text-foreground">
              {{ step === 'form' ? 'Inscription patient' : 'Vérification' }}
            </h1>
            <p class="text-muted mt-2 text-sm sm:text-base">
              {{ step === 'form' ? 'Renseignez vos informations pour créer votre compte' : 'Entrez le code reçu par email' }}
            </p>
          </div>
        </template>

        <!-- Étape 1 : Formulaire -->
        <form v-if="step === 'form'" class="space-y-5" @submit.prevent="onSubmitForm">
          <UFormField label="Email" name="email" required>
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
            <UFormField label="Prénom" name="first_name" required>
              <UInput v-model="form.first_name" placeholder="Prénom" size="lg" class="w-full" required autocomplete="given-name" />
            </UFormField>
            <UFormField label="Nom" name="last_name" required>
              <UInput v-model="form.last_name" placeholder="Nom" size="lg" class="w-full" required autocomplete="family-name" />
            </UFormField>
          </div>
          <UFormField label="Téléphone" name="phone">
            <UInput v-model="form.phone" type="tel" placeholder="06 12 34 56 78" size="lg" class="w-full" autocomplete="tel" />
          </UFormField>
          <UFormField label="Date de naissance" name="birth_date" required>
            <BirthdayPicker v-model="form.birth_date" />
          </UFormField>
          <UFormField label="Genre" name="gender" required>
            <USelect
              v-model="form.gender"
              :items="genderOptions"
              value-key="value"
              placeholder="Sélectionner"
              size="lg"
              class="w-full"
            />
          </UFormField>
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
            color="primary"
          >
            Créer mon compte
          </UButton>
        </form>

        <!-- Étape 2 : OTP -->
        <form v-else class="space-y-5" @submit.prevent="onVerifyOTP">
          <div class="bg-primary-50/50 border border-primary-100 rounded-xl p-4 text-center">
            <p class="text-sm text-primary-700">Un code à 6 chiffres a été envoyé à</p>
            <p class="font-semibold text-primary-900 mt-1">{{ form.email }}</p>
          </div>
          <UFormField name="otp">
            <div class="flex justify-center">
              <UPinInput v-model="otpDigits" :length="6" :disabled="otpLoading" otp size="xl" />
            </div>
          </UFormField>
          <UButton
            type="submit"
            block
            size="lg"
            :loading="otpLoading"
            :disabled="otpString.length !== 6"
            class="w-full font-medium"
            color="primary"
          >
            <UIcon name="i-lucide-shield-check" class="w-5 h-5 mr-2" />
            Valider le code
          </UButton>
          <div class="flex items-center justify-between pt-1">
            <button
              type="button"
              :disabled="countdown > 0 || resending"
              class="text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400"
              @click="resendOTP"
            >
              {{ resending ? 'Envoi...' : countdown > 0 ? `Renvoyer (${formatCountdown})` : 'Renvoyer le code' }}
            </button>
          </div>
        </form>

        <template #footer>
          <p class="text-center text-sm text-muted">
            Déjà un compte ?
            <NuxtLink to="/login" class="font-medium text-primary hover:underline">Se connecter</NuxtLink>
          </p>
        </template>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

import { apiFetch } from '~/utils/api';

interface AddressSelection {
  label: string;
  street?: string;
  city?: string;
  postcode?: string;
  lat?: number;
  lng?: number;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { verifyOTP } = useAuth();

const step = ref<'form' | 'otp'>('form');
const loading = ref(false);
const otpLoading = ref(false);
const resending = ref(false);
const userId = ref('');
const sessionId = ref('');
const otpDigits = ref<string[]>([]);
const countdown = ref(0);
let countdownInterval: ReturnType<typeof setInterval> | null = null;

const genderOptions = [
  { label: 'Homme', value: 'male' },
  { label: 'Femme', value: 'female' },
  { label: 'Autre', value: 'other' },
];

const form = reactive({
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  birth_date: null as string | null,
  gender: '' as string,
  addressSelection: null as AddressSelection | null,
});

const otpString = computed(() => (otpDigits.value || []).join(''));
const formatCountdown = computed(() => {
  const m = Math.floor(countdown.value / 60);
  const s = countdown.value % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
});
const canSubmit = computed(() => {
  return (
    form.email?.trim() &&
    form.first_name?.trim() &&
    form.last_name?.trim() &&
    form.birth_date &&
    form.gender
  );
});

watch(
  () => route.query.email as string | undefined,
  (v) => {
    if (v?.trim()) form.email = v.trim();
  },
  { immediate: true }
);

function onAddressSelect(value: AddressSelection | null) {
  form.addressSelection = value;
}

function startCountdown(seconds = 300) {
  if (countdownInterval) clearInterval(countdownInterval);
  countdown.value = seconds;
  countdownInterval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }, 1000);
}

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval);
});

async function onSubmitForm() {
  if (!canSubmit.value) return;
  loading.value = true;
  try {
    const body: Record<string, unknown> = {
      email: form.email.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone?.trim() || '',
      birth_date: form.birth_date || '',
      gender: form.gender,
    };
    if (form.addressSelection && typeof form.addressSelection === 'object') {
      body.address = form.addressSelection;
    }
    const result = await apiFetch('/auth/guest-to-user', {
      method: 'POST',
      body,
    });
    if (result?.success && result?.user_id) {
      userId.value = result.user_id;
      sessionId.value = (result as any).session_id || '';
      otpDigits.value = [];
      step.value = 'otp';
      startCountdown();
      toast.add({ title: 'Compte créé', description: 'Un code a été envoyé à votre email', color: 'green' });
    } else {
      toast.add({
        title: 'Erreur',
        description: (result as any)?.error ?? 'Impossible de créer le compte',
        color: 'red',
      });
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Une erreur est survenue', color: 'red' });
  } finally {
    loading.value = false;
  }
}

async function onVerifyOTP() {
  const cleaned = otpString.value.replace(/[^0-9]/g, '').trim();
  if (cleaned.length !== 6) {
    toast.add({ title: 'Code incomplet', description: 'Entrez les 6 chiffres', color: 'red' });
    return;
  }
  otpLoading.value = true;
  try {
    const result = await verifyOTP(userId.value, cleaned, sessionId.value);
    if (result?.success) {
      toast.add({ title: 'Connexion réussie', description: 'Redirection...', color: 'green' });
      await navigateTo('/patient');
    } else {
      toast.add({ title: 'Code invalide', description: result?.error ?? 'Code incorrect', color: 'red' });
      otpDigits.value = [];
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Vérification échouée', color: 'red' });
    otpDigits.value = [];
  } finally {
    otpLoading.value = false;
  }
}

async function resendOTP() {
  if (countdown.value > 0 || resending.value) return;
  resending.value = true;
  try {
    const result = await apiFetch('/auth/guest-to-user', {
      method: 'POST',
      body: { email: form.email },
    });
    if (result?.success && (result as any).session_id) {
      sessionId.value = (result as any).session_id;
      startCountdown();
      toast.add({ title: 'Code renvoyé', description: 'Vérifiez votre email', color: 'green' });
    } else {
      toast.add({ title: 'Erreur', description: (result as any)?.error ?? 'Envoi impossible', color: 'red' });
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Envoi impossible', color: 'red' });
  } finally {
    resending.value = false;
  }
}
</script>
