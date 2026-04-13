<template>
  <div class="min-h-[calc(100vh-4rem)] bg-gray-50 pb-32">
    <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header class="mb-6 text-left">
        <h1 class="text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          Récapitulatif de votre demande
        </h1>
        <p v-if="providerName" class="mt-1 text-sm font-medium text-primary-600 dark:text-primary-400">
          Avec {{ providerName }}
        </p>
        <p v-else class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Vérifiez les informations avant de valider votre demande.
        </p>
      </header>

      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="error"
        class="mb-6 animate-in fade-in slide-in-from-top-2 duration-300"
      />

      <!-- Informations personnelles -->
      <UCard class="mb-4 rounded-2xl border border-gray-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
            >
              <UIcon name="i-lucide-user" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">Informations personnelles</h2>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Identité et contact du patient</p>
            </div>
          </div>
        </template>
        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <div class="flex flex-col gap-0.5 py-3 first:pt-0 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2.5">
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-36 sm:shrink-0">Nom</span>
            <span class="min-w-0 break-words text-sm font-medium text-gray-900 dark:text-white">{{ formData.last_name || '—' }}</span>
          </div>
          <div class="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2.5">
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-36 sm:shrink-0">Prénom</span>
            <span class="min-w-0 break-words text-sm font-medium text-gray-900 dark:text-white">{{ formData.first_name || '—' }}</span>
          </div>
          <div class="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2.5">
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-36 sm:shrink-0">Email</span>
            <span class="min-w-0 break-words text-sm font-medium text-gray-900 dark:text-white">{{ formData.email || '—' }}</span>
          </div>
          <div class="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2.5">
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-36 sm:shrink-0">Téléphone</span>
            <span class="min-w-0 break-words text-sm font-medium text-gray-900 dark:text-white">{{ formData.phone || '—' }}</span>
          </div>
          <div v-if="formData.birth_date" class="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2.5">
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-36 sm:shrink-0">Naissance</span>
            <span class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{ formatDate(formData.birth_date) }}</span>
          </div>
          <div v-if="formData.gender" class="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2.5">
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-36 sm:shrink-0">Genre</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">{{ formatGender(formData.gender) }}</span>
          </div>
          <div v-if="hasPersonalDocuments" class="py-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Documents personnels</p>
            <div class="flex flex-wrap gap-2">
              <template v-for="(fileData, key) in personalDocsMap" :key="String(key)">
                <span
                  v-if="fileData"
                  class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                >
                  {{ formatDocumentName(String(key)) }}
                </span>
              </template>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Un bloc par soin -->
      <UCard
        v-for="(svc, idx) in selectedServices"
        :key="svc.id"
        class="mb-4 rounded-2xl border border-gray-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
      >
        <template #header>
          <div class="flex items-center gap-3">
            <div
              :class="[
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                svc.type === 'blood_test'
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                  : 'bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400',
              ]"
            >
              <UIcon :name="svc.icon || (svc.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-heart-pulse')" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">{{ svc.name }}</h2>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {{ selectedServices.length > 1 ? `Rendez-vous #${idx + 1}` : 'Rendez-vous' }}
                <span class="mx-1">·</span>
                {{ svc.type === 'blood_test' ? 'Laboratoire' : 'Soins infirmiers' }}
              </p>
            </div>
          </div>
        </template>
        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <div
            v-if="serviceData(svc.id).scheduled_at"
            class="flex flex-col gap-0.5 py-3 first:pt-0 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2.5"
          >
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-40 sm:shrink-0">Date souhaitée</span>
            <span class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{ formatDate(serviceData(svc.id).scheduled_at) }}</span>
          </div>
          <template v-if="svc.type === 'blood_test'">
            <div
              v-if="serviceData(svc.id).blood_test_type"
              class="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2.5"
            >
              <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-40 sm:shrink-0">Type de prélèvement</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{
                serviceData(svc.id).blood_test_type === 'single' ? 'Une seule prise' : 'Plusieurs prélèvements'
              }}</span>
            </div>
            <div
              v-if="serviceData(svc.id).blood_test_type === 'multiple' && serviceData(svc.id).duration_days"
              class="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2.5"
            >
              <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-40 sm:shrink-0">Durée</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{
                formatDurationForService(svc.type, serviceData(svc.id))
              }}</span>
            </div>
          </template>
          <template v-else>
            <div
              v-if="serviceData(svc.id).duration_days"
              class="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2.5"
            >
              <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-40 sm:shrink-0">Prise en charge</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{
                formatDurationForService(svc.type, serviceData(svc.id))
              }}</span>
            </div>
            <div
              v-if="serviceData(svc.id).frequency && serviceData(svc.id).duration_days !== '1'"
              class="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2.5"
            >
              <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-40 sm:shrink-0">Fréquence</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ formatFrequency(serviceData(svc.id).frequency) }}</span>
            </div>
          </template>
          <template v-for="(val, key) in serviceData(svc.id).care_options || {}" :key="`care-${svc.id}-${String(key)}`">
            <div
              v-if="val != null && val !== ''"
              class="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2.5"
            >
              <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-40 sm:shrink-0">{{
                careOptionLabel(svc.id, String(key))
              }}</span>
              <span class="min-w-0 break-words text-sm font-medium text-gray-900 dark:text-white">{{
                careOptionDisplayValue(svc.id, String(key), val)
              }}</span>
            </div>
          </template>
          <div
            v-if="serviceData(svc.id).availability"
            class="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2.5"
          >
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:w-40 sm:shrink-0">Disponibilités</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">{{ formatAvailability(serviceData(svc.id).availability) }}</span>
          </div>
          <div v-if="serviceData(svc.id).notes" class="py-4">
            <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Message</p>
            <p class="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">{{ serviceData(svc.id).notes }}</p>
          </div>
          <div v-if="hasServiceDocumentsForRecap(svc.id)" class="py-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Documents du soin</p>
            <div class="flex flex-wrap gap-2">
              <template v-for="(file, key) in serviceData(svc.id).files || {}" :key="`f-${String(key)}`">
                <span
                  v-if="file && ['ordonnance', 'autres_assurances'].includes(String(key))"
                  class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                >
                  {{ formatDocumentName(String(key)) }}
                </span>
              </template>
              <template v-for="(fileData, key) in serviceData(svc.id).form_data_files || {}" :key="`fd-${String(key)}`">
                <span
                  v-if="
                    fileData &&
                    ['ordonnance', 'autres_assurances'].includes(String(key)) &&
                    !(serviceData(svc.id).files || {})[String(key)]
                  "
                  class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                >
                  {{ formatDocumentName(String(key)) }}
                </span>
              </template>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Adresse -->
      <UCard v-if="formData.address" class="mb-4 rounded-2xl border border-gray-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
            >
              <UIcon name="i-lucide-map-pin" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">Adresse d’intervention</h2>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Lieu du rendez-vous</p>
            </div>
          </div>
        </template>
        <p class="text-sm font-medium leading-relaxed text-gray-900 dark:text-white">
          {{ typeof formData.address === 'object' && formData.address?.label ? formData.address.label : formData.address }}
        </p>
        <p v-if="formData.address_complement" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {{ formData.address_complement }}
        </p>
      </UCard>

      <!-- Consentement (ancre scroll si validation sans cocher la case) -->
      <UCard
        id="rendez-vous-rgpd-consent"
        class="mb-2 rounded-2xl border border-gray-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)] scroll-mt-28"
      >
        <UCheckbox
          v-model="consentModel"
          :disabled="actionsDisabled"
          class="text-sm leading-snug"
          label="J’accepte les conditions RGPD/HDS et consens au traitement de mes données de santé"
        />
      </UCard>
    </div>

    <RendezVousStickyFooter
      primary-label="Valider"
      :primary-submit="false"
      :primary-disabled="actionsDisabled || submitLoading"
      :primary-loading="submitLoading"
      :back-disabled="actionsDisabled"
      @back="emit('prev')"
      @primary="onPrimaryFooterClick"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue';
import { getNursingDurationLabel } from '~/constants/nursing-duration';
import { formatBloodTestSeriesDurationDays } from '~/utils/duration-display';

const toast = useAppToast();

const props = withDefaults(
  defineProps<{
    formData: Record<string, any>;
    selectedServices: Array<{ id: string; type: string; name: string; category_id: string | null; icon?: string }>;
    categories: Array<{
      id: string;
      name?: string;
      options?: Array<{ option_key: string; label: string; field_type?: string; options?: { value: string; label: string }[] }>;
    }>;
    providerName?: string | null;
    error?: string;
    /** Désactive Retour + Valider (ex. requête en cours) */
    actionsDisabled?: boolean;
    /** Spinner sur le bouton Valider uniquement */
    submitLoading?: boolean;
  }>(),
  {
    providerName: null,
    error: '',
    actionsDisabled: false,
    submitLoading: false,
  }
);

const emit = defineEmits<{
  prev: [];
  validate: [];
}>();

const consentModel = defineModel<boolean>('consent', { required: true });

function onPrimaryFooterClick() {
  if (props.actionsDisabled || props.submitLoading) return;
  if (!consentModel.value) {
    toast.add({
      title: 'Consentement requis',
      description: 'Veuillez cocher la case pour accepter les conditions RGPD/HDS avant de valider.',
      color: 'warning',
    });
    nextTick(() => {
      const el = document.getElementById('rendez-vous-rgpd-consent');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = el?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      input?.focus();
    });
    return;
  }
  emit('validate');
}

const personalDocsMap = computed(() => {
  const personalFiles = props.formData?.personalFiles ?? {};
  const firstSvc = props.selectedServices[0];
  const fdFiles = firstSvc ? props.formData?.formDataByService?.[firstSvc.id]?.form_data_files ?? {} : {};
  const result: Record<string, any> = {};
  if (personalFiles.carte_vitale || fdFiles.carte_vitale) result.carte_vitale = personalFiles.carte_vitale || fdFiles.carte_vitale;
  if (personalFiles.carte_mutuelle || fdFiles.carte_mutuelle) result.carte_mutuelle = personalFiles.carte_mutuelle || fdFiles.carte_mutuelle;
  return result;
});

const hasPersonalDocuments = computed(() => {
  const d = personalDocsMap.value;
  return !!(d.carte_vitale || d.carte_mutuelle);
});

function serviceData(serviceId: string) {
  return props.formData?.formDataByService?.[serviceId] ?? {};
}

function hasServiceDocumentsForRecap(serviceId: string): boolean {
  const svcData = props.formData?.formDataByService?.[serviceId] ?? {};
  const files = svcData.files ?? {};
  const formDataFiles = svcData.form_data_files ?? {};
  const keys = ['ordonnance', 'autres_assurances'];
  const hasReal = keys.some((k) => files[k]);
  const hasMeta = keys.some((k) => formDataFiles[k]);
  return hasReal || hasMeta;
}

function careOptionLabel(serviceId: string, optionKey: string): string {
  const cat = props.categories.find((c) => c.id === serviceId);
  const opt = cat?.options?.find((o) => o.option_key === optionKey);
  return opt?.label ?? optionKey;
}

function careOptionDisplayValue(serviceId: string, optionKey: string, value: string | number): string {
  const cat = props.categories.find((c) => c.id === serviceId);
  const opt = cat?.options?.find((o) => o.option_key === optionKey);
  if (opt?.options && Array.isArray(opt.options)) {
    const found = opt.options.find((o) => String(o.value) === String(value));
    return found?.label ?? String(value);
  }
  return String(value);
}

function formatDate(date: string) {
  if (!date) return '—';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

function formatGender(gender: string) {
  const genders: Record<string, string> = {
    male: 'Homme',
    female: 'Femme',
    other: 'Autre',
  };
  return genders[gender] || gender;
}

/** Durée affichée selon le type de service (série lab vs prise en charge infirmier). */
function formatDurationForService(
  type: string,
  data: { duration_days?: string; custom_days?: number | null }
): string {
  const d = data.duration_days;
  if (!d) return '';
  if (type === 'blood_test') {
    return formatBloodTestSeriesDurationDays(d, data.custom_days ?? null);
  }
  return getNursingDurationLabel(d, data.custom_days ?? null);
}

function formatFrequency(frequency: string) {
  const frequencies: Record<string, string> = {
    once_daily: '1 fois par jour',
    twice_daily: '2 fois par jour',
    thrice_daily: '3 fois par jour',
    twice_weekly: '2 fois par semaine',
    thrice_weekly: '3 fois par semaine',
    to_define: 'À voir avec le professionnel',
    daily: '1 fois par jour',
    every_other_day: '1 jour sur 2',
  };
  return frequencies[frequency] || frequency;
}

function formatAvailability(availability: string) {
  try {
    const avail = JSON.parse(availability);
    if (avail.type === 'all_day') {
      return 'Disponible toute la journée';
    }
    if (avail.type === 'custom' && avail.range) {
      return `${avail.range[0]}h – ${avail.range[1]}h`;
    }
  } catch {
    return availability;
  }
  return availability;
}

function formatDocumentName(key: string) {
  const names: Record<string, string> = {
    carte_vitale: 'Carte Vitale',
    carte_mutuelle: 'Carte Mutuelle',
    ordonnance: 'Ordonnance médicale',
    autres_assurances: 'Autres assurances',
  };
  return names[key] || key;
}
</script>
