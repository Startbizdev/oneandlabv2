<template>
  <div class="min-h-[calc(100vh-4rem)] bg-app-canvas pb-32 dark:bg-gray-950">
    <div class="mx-auto w-full max-w-3xl px-4 pt-3 pb-5 sm:px-6 sm:pt-4 sm:pb-6">
      <header class="mb-6 text-left">
        <h1 class="text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl">
          Choix du laboratoire
        </h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Choisissez comment organiser le prélèvement à domicile.
        </p>
      </header>

      <div class="space-y-3">
        <button
          type="button"
          :aria-pressed="mode === 'platform_match'"
          class="flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors"
          :class="
            mode === 'platform_match'
              ? 'border-primary-400 bg-primary-50/70 dark:border-primary-500/40 dark:bg-primary-950/30'
              : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700'
          "
          @click="mode = 'platform_match'"
        >
          <UIcon name="i-lucide-handshake" class="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Trouver un laboratoire avec Cary</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              La demande est proposée aux laboratoires Cary disponibles près du lieu de prélèvement.
            </p>
          </div>
        </button>

        <button
          type="button"
          :aria-pressed="mode === 'brand_choice'"
          class="flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors"
          :class="
            mode === 'brand_choice'
              ? 'border-primary-400 bg-primary-50/70 dark:border-primary-500/40 dark:bg-primary-950/30'
              : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700'
          "
          @click="mode = 'brand_choice'"
        >
          <UIcon name="i-lucide-building-2" class="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Choisir un réseau de laboratoires</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Sélectionnez un réseau (Biogroup, Cerballiance, etc.). Notre équipe vous contactera pour organiser le prélèvement.
            </p>
          </div>
        </button>
      </div>

      <div v-if="mode === 'brand_choice'" class="mt-6">
        <p class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Laboratoires disponibles
        </p>

        <div v-if="loading" class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          <div v-for="i in 8" :key="i" class="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-900" />
        </div>

        <UAlert
          v-else-if="loadError"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          :title="loadError"
          class="mb-4"
        ><template #actions><UButton color="neutral" variant="outline" @click="loadBrands">Réessayer</UButton></template></UAlert>

        <p v-else-if="!brands.length" class="rounded-xl border border-gray-200 p-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">Aucun réseau n’est disponible pour le moment. Vous pouvez demander une mise en relation avec Cary.</p>

        <div v-else class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          <button
            v-for="brand in brands"
            :key="brand.id"
            type="button"
            :aria-pressed="selectedBrandId === brand.id"
            class="flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors"
            :class="
              selectedBrandId === brand.id
                ? 'border-primary-400 bg-primary-50/70 ring-1 ring-primary-400/40 dark:border-primary-500/40 dark:bg-primary-950/30'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950'
            "
            @click="selectedBrandId = brand.id"
          >
            <img
              v-if="brand.logo_url"
              :src="brand.logo_url"
              :alt="brand.name"
              class="h-10 w-full max-w-[4.5rem] rounded-lg object-contain"
              loading="lazy"
              referrerpolicy="no-referrer"
            />
            <div
              v-else
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              {{ brand.name.slice(0, 2).toUpperCase() }}
            </div>
            <span class="line-clamp-2 text-xs font-medium leading-snug text-gray-800 dark:text-gray-200">
              {{ brand.name }}
            </span>
          </button>
        </div>
      </div>

      <UAlert
        v-if="validationError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="validationError"
        class="mt-4"
      />
    </div>

    <RendezVousStickyFooter
      show-back
      primary-label="Continuer"
      @back="emit('prev')"
      @primary="onContinue"
    />
  </div>
</template>

<script setup lang="ts">
import type { LabBrandPublic, LabPreferenceMode } from '@oneandlab/shared-types';
import { validateLabPreferenceBeforeSubmit } from '@oneandlab/shared-utils';
import { apiFetch } from '~/utils/api';

const props = defineProps<{
  modelValueMode: LabPreferenceMode | '';
  modelValueBrandId: string | null;
  selectedServices: Array<{ type: string }>;
  validationError?: string;
}>();

const emit = defineEmits<{
  'update:modelValueMode': [LabPreferenceMode];
  'update:modelValueBrandId': [string | null];
  prev: [];
  continue: [];
}>();

const mode = computed({
  get: () => props.modelValueMode || 'platform_match',
  set: (v: LabPreferenceMode) => emit('update:modelValueMode', v),
});

const selectedBrandId = computed({
  get: () => props.modelValueBrandId,
  set: (v: string | null) => emit('update:modelValueBrandId', v),
});

const localValidationError = ref('');
const validationError = computed(() => props.validationError || localValidationError.value);

const brands = ref<LabBrandPublic[]>([]);
const loading = ref(true);
const loadError = ref('');

async function loadBrands() {
  loading.value = true;
  loadError.value = '';
  try {
    const res = (await apiFetch('/public/lab-brands', { method: 'GET' })) as {
      success?: boolean;
      data?: LabBrandPublic[];
      error?: string;
    };
    if (res?.success && Array.isArray(res.data)) {
      brands.value = res.data;
    } else {
      loadError.value = res?.error || 'Impossible de charger les laboratoires.';
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Impossible de charger les laboratoires.';
  } finally {
    loading.value = false;
  }
}
onMounted(loadBrands);

function onContinue() {
  const err = validateLabPreferenceBeforeSubmit(
    props.selectedServices,
    mode.value,
    selectedBrandId.value,
  );
  if (err) {
    localValidationError.value = err;
    return;
  }
  localValidationError.value = '';
  emit('continue');
}
</script>
