<template>
  <UModal :open="open" title="Pharmacie" @update:open="(value: boolean) => { if (!value) emit('close') }">
    <template #body>
      <div v-if="loading" class="flex justify-center py-10">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
      </div>
      <p v-else-if="error" class="text-sm text-error">{{ error }}</p>
      <div v-else-if="profile" class="space-y-4">
        <div class="flex items-center gap-4">
          <img
            v-if="profile.profile_image_url"
            :src="profile.profile_image_url"
            :alt="`Logo de ${profile.display_name}`"
            class="h-16 w-16 rounded-2xl object-cover"
          >
          <div v-else class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary dark:bg-primary-950/40">
            <UIcon name="i-lucide-store" class="h-7 w-7" />
          </div>
          <div class="min-w-0">
            <p class="font-medium">{{ profile.display_name }}</p>
            <p class="text-sm text-muted">{{ profile.emploi || 'Pharmacie' }}</p>
          </div>
        </div>
        <p v-if="profile.biography" class="text-sm">{{ profile.biography }}</p>
        <dl class="space-y-2 text-sm">
          <div v-if="profile.phone">
            <dt class="text-muted">Téléphone</dt>
            <dd>
              <a :href="`tel:${profile.phone.replace(/\s/g, '')}`" class="font-medium text-primary hover:underline">
                {{ profile.phone }}
              </a>
            </dd>
          </div>
          <div v-if="profile.address_label">
            <dt class="text-muted">Adresse</dt>
            <dd>{{ profile.address_label }}</dd>
          </div>
          <div v-if="profile.accepts_click_collect">
            <dt class="text-muted">Retrait en pharmacie</dt>
            <dd>{{ dayList(profile.click_collect_days) }}</dd>
          </div>
          <div v-if="profile.accepts_home_delivery">
            <dt class="text-muted">Livraison</dt>
            <dd>{{ dayList(profile.home_delivery_days) }}</dd>
          </div>
          <div v-if="profile.website_url">
            <dt class="text-muted">Site</dt>
            <dd>
              <a :href="profile.website_url" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
                {{ profile.website_url }}
              </a>
            </dd>
          </div>
          <div v-if="profile.social_links?.facebook">
            <dt class="text-muted">Facebook</dt>
            <dd><a :href="profile.social_links.facebook" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">{{ profile.social_links.facebook }}</a></dd>
          </div>
          <div v-if="profile.social_links?.linkedin">
            <dt class="text-muted">LinkedIn</dt>
            <dd><a :href="profile.social_links.linkedin" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">{{ profile.social_links.linkedin }}</a></dd>
          </div>
          <div v-if="profile.social_links?.instagram">
            <dt class="text-muted">Instagram</dt>
            <dd><a :href="profile.social_links.instagram" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">{{ profile.social_links.instagram }}</a></dd>
          </div>
        </dl>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { PharmacyPublicProfile } from '@oneandlab/shared-types';

const props = defineProps<{
  open: boolean;
  pharmacyId: string | null;
}>();

const emit = defineEmits<{ close: [] }>();

const { fetchPharmacyProfile } = usePharmacyModule();
const profile = ref<PharmacyPublicProfile | null>(null);
const loading = ref(false);
const error = ref('');

const DAY_LABELS = ['', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

function dayList(days: number[]): string {
  const labels = days.map((day) => DAY_LABELS[day] ?? '').filter(Boolean);
  return labels.length ? labels.join(', ') : 'Selon les horaires de l’officine';
}

watch(
  () => [props.open, props.pharmacyId] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) return;
    loading.value = true;
    error.value = '';
    profile.value = null;
    try {
      profile.value = await fetchPharmacyProfile(id);
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Pharmacie introuvable';
    } finally {
      loading.value = false;
    }
  },
);
</script>
