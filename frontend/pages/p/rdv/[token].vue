<template>
  <div class="container mx-auto px-4 py-6 sm:py-8 max-w-lg">
      <div v-if="loading" class="flex flex-col items-center justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-7 h-7 animate-spin text-primary-500 mb-1.5" />
        <p class="text-xs text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>

      <UEmpty
        v-else-if="error"
        icon="i-lucide-alert-circle"
        :title="error"
        description="Ce lien est invalide ou a expiré."
        variant="outline"
      />

      <template v-else-if="data">
        <div class="text-center mb-3 shrink-0">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 mb-2">
            <UIcon name="i-lucide-heart-pulse" class="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 class="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white leading-tight">
            Rendez-vous soins infirmiers disponible
          </h1>
          <p class="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Connectez-vous pour voir le détail et l’accepter.
          </p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden max-h-[calc(100vh-8rem)] flex flex-col">
        <div v-if="data.addressFull" class="px-4 pt-4 pb-2 shrink-0">
          <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 min-w-0">
            <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-primary-500 flex-shrink-0" />
            <div class="min-w-0">
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-tight">Adresse</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{{ data.addressFull }}</p>
            </div>
          </div>
        </div>
        <div class="px-4 pb-3 grid grid-cols-2 gap-2 shrink-0" :class="{ 'pt-4': !data.addressFull }">
          <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 min-w-0">
            <UIcon name="i-lucide-calendar" class="w-5 h-5 text-primary-500 flex-shrink-0" />
            <div class="min-w-0">
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-tight">Date</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ data.dateShort }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 min-w-0">
            <UIcon name="i-lucide-clock" class="w-5 h-5 text-primary-500 flex-shrink-0" />
            <div class="min-w-0">
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-tight">Créneau</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ data.slotLabel }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 min-w-0">
            <UIcon name="i-lucide-stethoscope" class="w-5 h-5 text-primary-500 flex-shrink-0" />
            <div class="min-w-0">
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-tight">Type</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ data.categoryName }}</p>
            </div>
          </div>
          <div v-if="data.durationLabel" class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 min-w-0">
            <UIcon name="i-lucide-calendar-range" class="w-5 h-5 text-primary-500 flex-shrink-0" />
            <div class="min-w-0">
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-tight">Durée</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ data.durationLabel }}</p>
            </div>
          </div>
          <div v-if="data.patientAge != null" class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 min-w-0">
            <UIcon name="i-lucide-user" class="w-5 h-5 text-primary-500 flex-shrink-0" />
            <div class="min-w-0">
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-tight">Âge patient</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ data.patientAge }} ans</p>
            </div>
          </div>
        </div>
        <div class="p-4 pt-3 pb-4 space-y-4 shrink-0">
          <p class="text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400">
            Infirmier(ère) ? Connectez-vous ou inscrivez-vous.
          </p>
          <div class="flex flex-col gap-3 w-full">
            <NuxtLink
              :to="loginUrl"
              class="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition-colors"
            >
              <UIcon name="i-lucide-log-in" class="w-4 h-4 shrink-0" />
              Me connecter
            </NuxtLink>
            <NuxtLink
              to="/nurse/register"
              class="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <UIcon name="i-lucide-user-plus" class="w-4 h-4 shrink-0" />
              M'inscrire
            </NuxtLink>
          </div>
        </div>
        </div>
      </template>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

definePageMeta({
  layout: 'patient',
});

const route = useRoute();
const { user, isAuthenticated } = useAuth();
const token = computed(() => (route.params.token as string) ?? '');

const loading = ref(true);
const error = ref<string | null>(null);
const data = ref<{
  appointmentId: string;
  categoryName: string;
  dateShort: string;
  addressFull: string | null;
  slotLabel: string;
  durationLabel: string | null;
  patientAge: number | null;
  type: string;
  status: string;
} | null>(null);

const loginUrl = computed(() => {
  const returnTo = `/p/rdv/${token.value}`;
  return { path: '/login', query: { returnTo } };
});

// Meta FOMO pour la carte de partage (WhatsApp, etc.)
const metaTitle = computed(() => {
  if (!data.value) return 'Prise en charge à domicile – OneAndLab';
  const cat = data.value.categoryName;
  const date = data.value.dateShort;
  return `🩺 ${cat} le ${date} – À pourvoir maintenant | OneAndLab`;
});
const metaDescription = computed(() => {
  if (!data.value) return "Une prise en charge à domicile est disponible. Connectez-vous pour voir le détail et l'accepter.";
  const cat = data.value.categoryName;
  const date = data.value.dateShort;
  return `Prise en charge ${cat} disponible le ${date}. Une place à pourvoir – connectez-vous pour l'accepter avant qu'un autre ne la prenne.`;
});

useHead(() => {
  return {
    title: metaTitle.value,
    meta: [
      { name: 'description', content: metaDescription.value },
      { property: 'og:title', content: metaTitle.value },
      { property: 'og:description', content: metaDescription.value },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: metaTitle.value },
      { name: 'twitter:description', content: metaDescription.value },
    ],
  };
});

async function fetchSharedAppointment() {
  if (!token.value) {
    error.value = 'Lien invalide';
    loading.value = false;
    return;
  }
  try {
    const res = await apiFetch(`/public/shared-appointment/${token.value}`, { method: 'GET' });
    if (res?.success && res?.data) {
      data.value = res.data;
    } else {
      error.value = (res as any)?.error ?? 'Lien introuvable ou expiré';
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Impossible de charger les informations';
  } finally {
    loading.value = false;
  }
}

watch(
  [isAuthenticated, user, data],
  () => {
    if (isAuthenticated.value && user.value?.role === 'nurse' && data.value?.appointmentId) {
      navigateTo(`/nurse/appointments/${data.value.appointmentId}`);
    }
  },
  { immediate: true }
);

onMounted(() => {
  fetchSharedAppointment();
});

watch(token, () => {
  if (token.value) {
    loading.value = true;
    error.value = null;
    data.value = null;
    fetchSharedAppointment();
  }
}, { immediate: false });
</script>
