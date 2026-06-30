<template>
  <USlideover
    v-model:open="open"
    title=""
    :close="false"
    :ui="slideoverUi"
  >
    <template #content="{ close }">
      <div class="relative flex h-full flex-col overflow-hidden bg-app-canvas/95 backdrop-blur-xl dark:bg-gray-950/95">
        <div class="absolute right-4 top-4 z-50">
          <UButton
            color="neutral"
            variant="subtle"
            size="sm"
            icon="i-lucide-x"
            class="rounded-full shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50"
            aria-label="Fermer"
            @click="close"
          />
        </div>

        <div v-if="!origin || origin.kind !== 'pro'" class="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <UIcon name="i-lucide-user-x" class="mx-auto mb-3 size-10 text-muted" />
          <p class="text-sm text-muted">Profil non disponible.</p>
        </div>

        <div
          v-else
          class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-8 pt-14 sm:px-6"
        >
          <div class="flex flex-col items-center text-center">
            <div
              class="size-24 shrink-0 overflow-hidden rounded-full border-2 border-gray-200/90 bg-gray-100 shadow-md ring-4 ring-white dark:border-gray-700 dark:bg-gray-900 dark:ring-gray-950 sm:size-28"
            >
              <img
                v-if="profileImageUrl(origin.profile_image_url)"
                :src="profileImageUrl(origin.profile_image_url)"
                :alt="displayName"
                class="size-full object-cover"
              >
              <div v-else class="flex size-full items-center justify-center">
                <UIcon name="i-lucide-stethoscope" class="size-10 text-muted sm:size-11" />
              </div>
            </div>
            <p class="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Professionnel de santé
            </p>
            <h2 class="mt-1 text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {{ displayName }}
            </h2>
          </div>

          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <UBadge v-if="origin.emploi" color="neutral" variant="subtle" size="md" class="max-w-full font-normal">
              <span class="text-muted">Profession</span>
              <span class="text-gray-900 dark:text-gray-100"> · {{ origin.emploi }}</span>
            </UBadge>
            <UBadge color="neutral" variant="subtle" size="md" class="font-mono tabular-nums font-normal">
              <span class="text-muted">N° Adeli</span>
              <span class="text-gray-900 dark:text-gray-100"> · {{ origin.adeli || '—' }}</span>
            </UBadge>
          </div>

          <div
            v-if="origin.phone"
            class="mt-6 flex flex-wrap justify-center gap-2 border-y border-gray-200/80 py-4 dark:border-gray-800"
          >
            <UButton
              v-if="telHref"
              size="sm"
              variant="outline"
              color="neutral"
              leading-icon="i-lucide-phone"
              :href="telHref"
            >
              Appeler
            </UButton>
            <UButton
              v-if="smsHref"
              size="sm"
              variant="outline"
              color="neutral"
              leading-icon="i-lucide-message-square"
              :href="smsHref"
            >
              SMS
            </UButton>
          </div>

          <div v-if="origin.biography" class="mt-6">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Présentation
            </p>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
              {{ origin.biography }}
            </p>
          </div>
          <div v-else class="mt-6 rounded-xl border border-dashed border-gray-200/90 bg-gray-50/80 px-4 py-3 text-center dark:border-gray-800 dark:bg-gray-900/40">
            <p class="text-xs text-muted">
              Aucune présentation renseignée sur le profil.
            </p>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type ProCreatorOrigin = {
  kind: 'pro';
  id?: string;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
  emploi?: string | null;
  adeli?: string | null;
  biography?: string | null;
  phone?: string | null;
  public_slug?: string | null;
};

const props = defineProps<{
  origin: ProCreatorOrigin | null | undefined;
}>();

const open = defineModel<boolean>('open', { default: false });

const { profileImageUrl } = useProfileImageUrl();

const slideoverUi = {
  content:
    'flex flex-col !divide-y-0 max-h-[100dvh] min-h-0 p-0 focus:outline-none w-full max-w-md sm:max-w-lg shadow-2xl',
  body: 'p-0',
  header: 'p-0',
};

const displayName = computed(() => {
  const o = props.origin;
  if (!o || o.kind !== 'pro') return '';
  const parts = [o.first_name, o.last_name].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return String(o.display_name || '').trim() || 'Professionnel de santé';
});

const telHref = computed(() => {
  const phone = props.origin?.phone;
  if (!phone) return '';
  const cleaned = String(phone).replace(/\s/g, '');
  return cleaned ? `tel:${cleaned}` : '';
});

const smsHref = computed(() => {
  const phone = props.origin?.phone;
  if (!phone) return '';
  const cleaned = String(phone).replace(/\s/g, '');
  return cleaned ? `sms:${cleaned}` : '';
});
</script>
