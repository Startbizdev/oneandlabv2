<template>
  <ProfileSheet v-model:open="open" title="Profil professionnel">
    <div v-if="!origin || origin.kind !== 'pro'" class="flex flex-col items-center px-6 py-16 text-center">
      <UIcon name="i-lucide-user-x" class="size-10 text-muted" />
      <p class="mt-3 text-sm font-medium text-gray-900 dark:text-white">
        Profil non disponible
      </p>
    </div>

    <div v-else class="divide-y divide-default">
      <div class="space-y-4 px-4 py-5 sm:px-6">
        <ProfileSheetIdentity
          :name="displayName"
          :role-label="origin.emploi || 'Professionnel de santé'"
          :image-url="profileImageUrl(origin.profile_image_url)"
          fallback-icon="i-lucide-stethoscope"
        />
        <div v-if="phoneHref" class="grid grid-cols-2 gap-2">
          <UButton
            :href="`tel:${phoneHref}`"
            color="neutral"
            variant="outline"
            icon="i-lucide-phone"
            block
          >
            Appeler
          </UButton>
          <UButton
            :href="`sms:${phoneHref}`"
            color="neutral"
            variant="outline"
            icon="i-lucide-message-square"
            block
          >
            SMS
          </UButton>
        </div>
      </div>

      <ProfileSheetSection title="Informations professionnelles">
        <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
          <dt class="text-muted">Profession</dt>
          <dd class="text-gray-900 break-words dark:text-white">{{ origin.emploi || 'Non renseignée' }}</dd>
          <dt class="text-muted">N° ADELI</dt>
          <dd class="font-mono tabular-nums text-gray-900 dark:text-white">{{ origin.adeli || '—' }}</dd>
          <template v-if="origin.phone">
            <dt class="text-muted">Téléphone</dt>
            <dd class="tabular-nums text-gray-900 dark:text-white">{{ origin.phone }}</dd>
          </template>
        </dl>
      </ProfileSheetSection>

      <ProfileSheetSection title="Présentation">
        <p
          v-if="origin.biography"
          class="whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300"
        >
          {{ origin.biography }}
        </p>
        <p v-else class="text-sm text-muted">
          Aucune présentation renseignée.
        </p>
      </ProfileSheetSection>
    </div>
  </ProfileSheet>
</template>

<script setup lang="ts">
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

const displayName = computed(() => {
  const o = props.origin;
  if (!o || o.kind !== 'pro') return '';
  const parts = [o.first_name, o.last_name].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return String(o.display_name || '').trim() || 'Professionnel de santé';
});

const phoneHref = computed(() => String(props.origin?.phone ?? '').replace(/\s/g, ''));
</script>
