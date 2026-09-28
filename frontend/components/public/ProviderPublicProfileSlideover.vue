<template>
  <ProfileSheet v-model:open="open" :title="sheetTitle">
    <div v-if="loading" class="space-y-5 px-4 py-5 sm:px-6" aria-busy="true">
      <div class="flex items-start gap-4">
        <USkeleton class="size-16 shrink-0 rounded-full" />
        <div class="flex-1 space-y-2 pt-1">
          <USkeleton class="h-5 w-2/3" />
          <USkeleton class="h-4 w-1/3" />
        </div>
      </div>
      <USkeleton class="h-10 w-full" />
      <USkeleton class="h-24 w-full" />
    </div>

    <div
      v-else-if="error || notFound || !effectiveSlug"
      class="flex flex-col items-center px-6 py-16 text-center"
    >
      <UIcon name="i-lucide-user-x" class="size-10 text-muted" />
      <p class="mt-3 text-sm font-medium text-gray-900 dark:text-white">
        {{ error ? 'Impossible de charger ce profil' : 'Profil introuvable' }}
      </p>
      <p v-if="error" class="mt-1 text-sm text-muted">
        {{ error }}
      </p>
      <UButton
        v-if="error"
        variant="outline"
        color="neutral"
        size="sm"
        icon="i-lucide-refresh-cw"
        class="mt-4"
        @click="fetchProfile"
      >
        Réessayer
      </UButton>
    </div>

    <template v-else-if="profile">
      <ProviderPublicProfilePanel
        v-if="profile.type === 'nurse'"
        type="nurse"
        :profile="profile.data"
        :share-url="shareUrl"
      />
      <ProviderPublicProfilePanel
        v-else
        type="lab"
        :profile="profile.data"
        :share-url="shareUrl"
      />
    </template>
  </ProfileSheet>
</template>

<script setup lang="ts">
import type { PublicLabProfile, PublicNurseProfile } from '@oneandlab/shared-types';

type ProviderType = 'nurse' | 'lab';

type PublicProfileResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  redirect?: boolean;
  new_slug?: string;
};

type LoadedProfile =
  | { type: 'nurse'; data: PublicNurseProfile }
  | { type: 'lab'; data: PublicLabProfile };

const props = defineProps<{
  providerType: ProviderType;
  slug: string | null;
}>();

const open = defineModel<boolean>('open', { default: false });
const config = useRuntimeConfig();

const profile = ref<LoadedProfile | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const notFound = ref(false);

const effectiveSlug = computed(() => props.slug?.trim() || '');

const sheetTitle = computed(() =>
  props.providerType === 'nurse' ? 'Profil infirmier' : 'Profil laboratoire',
);

const shareUrl = computed(() => {
  const slug = profile.value?.data.slug || effectiveSlug.value;
  if (!slug) return undefined;
  const baseUrl = config.public.siteUrl?.replace(/\/$/, '') || '';
  const segment = props.providerType === 'nurse' ? 'infirmier' : 'laboratoire';
  return `${baseUrl}/${segment}/${encodeURIComponent(slug)}`;
});

function profileUrl(type: ProviderType, slug: string): string {
  const base = config.public.apiBase || '/api';
  const apiBase = import.meta.server && !base.startsWith('http')
    ? String(config.apiInternalBase).replace(/\/$/, '')
    : base;
  return `${apiBase}/public/${type}/${encodeURIComponent(slug)}`;
}

function withDisplayName<T extends PublicNurseProfile | PublicLabProfile>(data: T): T {
  const name = data.name?.trim() || [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
  return { ...data, name: name || (props.providerType === 'nurse' ? 'Infirmier(e)' : 'Laboratoire') };
}

/** `null` = profil absent ou non public (404) ; toute autre réponse non OK est une erreur. */
async function requestProfile<T>(type: ProviderType, slug: string): Promise<PublicProfileResponse<T> | null> {
  const response = await $fetch.raw<PublicProfileResponse<T>>(profileUrl(type, slug), {
    timeout: 10000,
    ignoreResponseError: true,
  });
  if (response.status === 404) return null;
  if (!response.ok || !response._data) throw new Error(`HTTP ${response.status}`);
  return response._data;
}

async function fetchNurse(slug: string): Promise<LoadedProfile | null> {
  const response = await requestProfile<PublicNurseProfile>('nurse', slug);
  if (!response?.success || !response.data) return null;
  return { type: 'nurse', data: withDisplayName(response.data) };
}

async function fetchLab(slug: string): Promise<LoadedProfile | null> {
  let response = await requestProfile<PublicLabProfile>('lab', slug);
  if (response?.redirect && response.new_slug) {
    response = await requestProfile<PublicLabProfile>('lab', response.new_slug);
  }
  if (!response?.success || !response.data) return null;
  return { type: 'lab', data: withDisplayName(response.data) };
}

async function fetchProfile() {
  const slug = effectiveSlug.value;
  if (!slug) return;

  loading.value = true;
  error.value = null;
  notFound.value = false;
  try {
    const result = props.providerType === 'nurse' ? await fetchNurse(slug) : await fetchLab(slug);
    profile.value = result;
    notFound.value = result === null;
  } catch (err: unknown) {
    console.error('[ProviderPublicProfileSlideover] fetch failed', err);
    profile.value = null;
    error.value = 'Vérifiez votre connexion puis réessayez.';
  } finally {
    loading.value = false;
  }
}

watch(
  () => [open.value, props.slug] as const,
  ([isOpen, slug]) => {
    if (!isOpen) {
      profile.value = null;
      error.value = null;
      notFound.value = false;
      return;
    }
    if (slug) void fetchProfile();
  },
  { immediate: true },
);
</script>
