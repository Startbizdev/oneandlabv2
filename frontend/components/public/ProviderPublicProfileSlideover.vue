<template>
  <USlideover
    v-model:open="open"
    :title="slideoverTitle"
    :close="false"
    :ui="slideoverUi"
  >
    <template #content="{ close }">
      <div class="relative flex h-full flex-col overflow-hidden bg-app-canvas/90 backdrop-blur-xl dark:bg-gray-950/90">
        
        <div class="absolute right-4 top-4 z-50">
          <UButton
            color="neutral"
            variant="subtle"
            size="sm"
            :icon="closeIcon"
            class="rounded-full shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50"
            aria-label="Fermer le profil"
            @click="close"
          />
        </div>

        <div v-if="loading" class="flex flex-1 flex-col gap-6 p-6">
          <USkeleton class="h-32 w-full rounded-2xl" />
          <div class="space-y-3">
            <USkeleton class="h-6 w-3/4" />
            <USkeleton class="h-4 w-1/2" />
          </div>
          <USkeleton class="flex-1 rounded-2xl" />
        </div>

        <div 
          v-else-if="error || !effectiveSlug" 
          class="flex flex-1 flex-col items-center justify-center p-8 text-center"
        >
          <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
            <UIcon name="i-lucide-user-x" class="h-8 w-8 text-red-500" />
          </div>
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">
            {{ error ? 'Une erreur est survenue' : 'Profil introuvable' }}
          </h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ error || "Nous n'avons pas pu charger les informations de ce praticien." }}
          </p>
          <UButton
            v-if="error"
            variant="ghost"
            label="Réessayer"
            class="mt-4"
            @click="fetchProfile"
          />
        </div>

        <div 
          v-else 
          class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain scrollbar-thin"
        >
          <ProviderPublicProfilePanel
            :loading="loading"
            :error="error"
            :profile="profile"
            :type="providerType"
            :address="profile?.address ?? profile?.city_plain ?? null"
            :map-center="profile?.map_center ?? null"
            :radius-km="profile?.radius_km ?? null"
            :share-url="shareUrlOverride"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
/**
 * Interface & Types
 */
interface ProviderProfile {
  name: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  city_plain?: string;
  map_center?: any;
  radius_km?: number;
  faq?: any;
  role?: string;
}

const props = defineProps<{
  providerType: 'nurse' | 'lab';
  slug: string | null;
}>();

/**
 * States & Config
 */
const open = defineModel<boolean>('open', { default: false });
const config = useRuntimeConfig();
const appConfig = useAppConfig();

const profile = ref<ProviderProfile | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const closeIcon = computed(() => (appConfig.ui?.icons?.close as string) || 'i-lucide-x');

/**
 * UI Configuration (UX Focus)
 */
const slideoverUi = {
  content: 'flex flex-col !divide-y-0 max-h-[100dvh] min-h-0 p-0 focus:outline-none w-full max-w-md sm:max-w-lg shadow-2xl',
  body: 'p-0',
  header: 'p-0',
};

/**
 * Computed Logic
 */
const effectiveSlug = computed(() => props.slug?.trim() || '');

const slideoverTitle = computed(() => {
  if (loading.value) return 'Chargement...';
  if (profile.value?.name) return profile.value.name;
  return props.providerType === 'nurse' ? 'Infirmier' : 'Laboratoire';
});

const shareUrlOverride = computed(() => {
  const slug = effectiveSlug.value;
  if (!slug) return undefined;
  
  const baseUrl = config.public.siteUrl?.replace(/\/$/, '') || '';
  const segment = props.providerType === 'nurse' ? 'infirmier' : 'laboratoire';
  
  return `${baseUrl}/${segment}/${encodeURIComponent(slug)}`;
});

/**
 * Data Fetching & Utilities
 */
const parseFaq = (raw: unknown): any[] => {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return Array.isArray(raw) ? raw : [];
};

const getApiUrl = (type: 'nurse' | 'lab', slug: string) => {
  const base = config.public.apiBase || '/api';
  const apiBase = (import.meta.server && !base.startsWith('http')) 
    ? 'http://127.0.0.1:8888/api' 
    : base;
  
  const path = type === 'nurse' ? 'public/nurse' : 'public/lab';
  return `${apiBase}/${path}/${encodeURIComponent(slug)}`;
};

async function fetchProfile() {
  const slug = effectiveSlug.value;
  if (!slug) return;

  loading.value = true;
  error.value = null;

  try {
    const response = await $fetch<any>(getApiUrl(props.providerType, slug));

    // Gestion spécifique de la redirection Lab
    let finalData = response;
    if (props.providerType === 'lab' && response.redirect && response.new_slug) {
      finalData = await $fetch<any>(getApiUrl('lab', response.new_slug));
    }

    if (finalData.success && finalData.data) {
      const d = finalData.data;
      profile.value = {
        ...d,
        role: props.providerType === 'nurse' ? 'nurse' : 'subaccount',
        name: d.name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || slideoverTitle.value,
        faq: parseFaq(d.faq)
      };
    } else {
      error.value = finalData.error || 'Profil introuvable';
    }
  } catch (err: any) {
    console.error('[ProfileFetchError]', err);
    error.value = err.data?.message || "Impossible de récupérer les données.";
  } finally {
    loading.value = false;
  }
}

/**
 * Watchers
 */
watch(
  () => [open.value, props.slug] as const,
  ([isOpen, newSlug]) => {
    if (!isOpen) {
      profile.value = null;
      return;
    }
    if (newSlug) fetchProfile();
  },
  { immediate: true }
);
</script>

<style scoped>
/* Optimisation du défilement pour iOS */
.overscroll-contain {
  overscroll-behavior: contain;
}

/* Scrollbar discrète et élégante */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 9999px;
}
html.dark .scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: #1f2937;
}
</style>