<template>
  <div class="min-w-0 antialiased selection:bg-primary-100 dark:selection:bg-primary-900/30">
    
    <div v-if="loading" class="flex flex-col items-center justify-center space-y-4 px-6 py-24 text-center">
      <div class="relative flex h-12 w-12 items-center justify-center">
        <div class="absolute h-full w-full animate-ping rounded-full bg-primary-400/20" />
        <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary-500" />
      </div>
      <p class="text-sm font-medium text-gray-500 animate-pulse">Préparation du profil...</p>
    </div>

    <div v-else-if="error" class="p-6">
      <UAlert
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        title="Information manquante"
        :description="error"
        class="rounded-xl border border-red-100 dark:border-red-900/30"
      />
    </div>

    <div v-else-if="profile" class="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-8">
      
      <header class="relative mb-12">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
          
          <div class="relative mx-auto shrink-0 sm:mx-0">
            <div class="h-20 w-20 overflow-hidden rounded-2xl border-2 border-white shadow-xl dark:border-gray-800 sm:h-24 sm:w-24">
              <img
                v-if="profile.profile_image_url && !imageError"
                :src="profileImageSrc"
                :alt="profile.name"
                class="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                @error="imageError = true"
              />
              <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <UIcon
                  :name="type === 'nurse' ? 'i-lucide-user' : 'i-lucide-building-2'"
                  class="h-10 w-10 text-gray-400"
                />
              </div>
            </div>
            <div 
              class="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm dark:border-gray-950 dark:bg-gray-900"
              v-tooltip="isAccepting ? 'Disponible' : 'Indisponible'"
            >
              <div :class="['h-2.5 w-2.5 rounded-full', isAccepting ? 'bg-emerald-500' : 'bg-amber-500']" />
            </div>
          </div>

          <div class="flex-1 space-y-5 text-center sm:text-left">
            <div>
              <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span class="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                  {{ roleLabel }}
                </span>
                <span v-if="profile.years_experience" class="text-xs text-gray-400">
                   • {{ yearsExperienceLabel(profile.years_experience) }}
                </span>
              </div>
              <h1 class="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                {{ profile.name }}
              </h1>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm sm:justify-start">
              <div v-if="profile.reviews?.stats?.total_reviews" class="flex items-center gap-1.5 group cursor-default">
                <div class="flex items-center text-amber-400">
                  <UIcon name="i-heroicons-star-20-solid" class="h-4 w-4" />
                </div>
                <span class="font-bold text-gray-900 dark:text-white">{{ profile.reviews.stats.average_rating.toFixed(1) }}</span>
                <span class="text-gray-500 underline decoration-gray-200 underline-offset-4 group-hover:decoration-primary-400 transition-colors">
                  ({{ profile.reviews.stats.total_reviews }} avis)
                </span>
              </div>
              
              <a
                v-if="displayPhone"
                :href="`tel:${displayPhone.replace(/\s/g, '')}`"
                class="flex items-center gap-2 font-medium text-gray-700 transition-colors hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400"
              >
                <UIcon name="i-lucide-phone" class="h-4 w-4 text-gray-400" />
                {{ displayPhone }}
              </a>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <UButton
                v-if="bookingUrl && isAccepting"
                :to="bookingUrl"
                size="md"
                class="rounded-xl px-6 font-bold shadow-lg shadow-primary-500/20 transition-transform active:scale-95"
                icon="i-lucide-calendar-check"
              >
                Réserver une visite
              </UButton>
              <PublicProfileShare
                v-if="shareUrl"
                :share-url="shareUrl"
                :profile-name="profile.name"
                :profile-type="type"
                compact
              />
            </div>
          </div>
        </div>
      </header>

      <div class="grid gap-12 sm:gap-16">
        
        <section v-if="profile.biography" class="relative group">
          <div class="mb-4 flex items-center gap-3">
            <div class="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
            <h2 class="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              {{ type === 'nurse' ? 'Présentation' : 'Le Laboratoire' }}
            </h2>
            <div class="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
          </div>
          <p class="whitespace-pre-line text-base leading-relaxed text-gray-600 dark:text-gray-300">
            {{ profile.biography }}
          </p>
        </section>

        <section v-if="servicesToShow.length > 0">
          <div class="rounded-3xl bg-gray-50/50 p-6 ring-1 ring-gray-100 dark:bg-gray-900/30 dark:ring-gray-800">
            <PublicProfileServices
              :specializations="servicesToShow"
              :title="type === 'nurse' ? 'Expertises & Soins' : 'Prélèvements disponibles'"
              :icon="type === 'nurse' ? 'i-lucide-heart-pulse' : 'i-lucide-test-tube-2'"
              narrow-panel
            />
          </div>
        </section>

        <div class="grid gap-8 lg:grid-cols-2">
          <section class="space-y-4">
            <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <UIcon name="i-lucide-map-pin" class="h-4 w-4 text-primary-500" />
              {{ type === 'nurse' ? "Zone d'intervention" : 'Localisation' }}
            </h3>
            <div class="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
              <p class="font-medium text-gray-900 dark:text-white">{{ displayAddressFormatted }}</p>
              <p v-if="radiusKm" class="mt-1 text-sm text-gray-500">
                Intervient dans un rayon de <span class="font-bold text-gray-700 dark:text-gray-300">{{ Math.round(radiusKm) }} km</span>
              </p>
              <UButton
                v-if="mapsExternalUrl"
                :to="mapsExternalUrl"
                target="_blank"
                variant="ghost"
                color="neutral"
                size="sm"
                class="mt-4 -ml-2 text-primary-600 dark:text-primary-400"
                icon="i-lucide-navigation"
                trailing-icon="i-lucide-external-link"
              >
                Itinéraire
              </UButton>
            </div>
          </section>

          <section v-if="type === 'lab' && hasOpeningHours" class="space-y-4">
            <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <UIcon name="i-lucide-clock" class="h-4 w-4 text-primary-500" />
              Heures d'ouverture
            </h3>
            <div class="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <OpeningHoursWeek :opening-hours="profile.opening_hours" />
            </div>
          </section>
        </div>

        <section v-if="type === 'nurse' && profile.qualifications?.length" class="space-y-6">
          <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500">Diplômes & Formations</h3>
          <div class="space-y-4">
            <div 
              v-for="q in profile.qualifications" 
              :key="q.code"
              class="flex items-start gap-3 rounded-xl border border-dashed border-gray-200 p-3 dark:border-gray-700"
            >
              <UIcon name="i-lucide-graduation-cap" class="mt-1 h-5 w-5 shrink-0 text-gray-400" />
              <span class="text-sm font-medium leading-tight text-gray-700 dark:text-gray-300">{{ q.label }}</span>
            </div>
          </div>
        </section>

        <section v-if="linksVisible" class="space-y-4 text-center sm:text-left">
          <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 italic">Sur le web</h3>
          <div class="flex flex-wrap justify-center gap-3 sm:justify-start">
            <UButton
              v-if="profile.website_url"
              :to="normalizeUrl(profile.website_url)"
              target="_blank"
              color="neutral"
              variant="subtle"
              icon="i-lucide-globe"
              class="rounded-full"
            >
              Site internet
            </UButton>
            <div class="flex gap-2">
              <UButton
                v-for="(link, platform) in profile.social_links"
                :key="platform"
                v-show="link"
                :to="link"
                target="_blank"
                color="neutral"
                variant="ghost"
                :icon="`i-simple-icons-${platform}`"
                class="rounded-full transition-transform hover:-translate-y-1"
                :aria-label="platform"
              />
            </div>
          </div>
        </section>

        <section v-if="reviewPreviewItems.length > 0" class="space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500">Avis récents</h3>
            <span class="text-xs text-gray-400 italic">Vérifiés par la communauté</span>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div
              v-for="item in reviewPreviewItems"
              :key="item.id"
              class="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <p class="mb-4 text-sm italic leading-relaxed text-gray-600 dark:text-gray-400">
                "{{ item.comment }}"
              </p>
              <div class="flex items-center justify-between border-t border-gray-50 pt-3 dark:border-gray-800">
                <span class="text-xs font-bold text-gray-900 dark:text-white">
                  {{ formatReviewerNameForDisplay(item.patient_name) }}
                </span>
                <div class="flex text-amber-400">
                  <UIcon v-for="i in 5" :key="i" :name="i <= item.rating ? 'i-heroicons-star-20-solid' : 'i-heroicons-star'" class="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatAddressWithArrondissement } from '~/utils/address-display';
import { formatReviewerNameForDisplay } from '~/utils/reviewer-display';

const props = defineProps<{
  loading: boolean;
  error: string | null;
  profile: any | null;
  type: 'nurse' | 'lab';
  address?: string | null;
  mapCenter?: { lat: number; lng: number } | null;
  radiusKm?: number | null;
  shareUrl?: string | null;
}>();

const { profileImageUrl } = useProfileImageUrl();
const imageError = ref(false);

watch(() => props.profile?.profile_image_url, () => { imageError.value = false; });

const profileImageSrc = computed(() => profileImageUrl(props.profile?.profile_image_url ?? null) ?? '');
const displayAddressFormatted = computed(() => formatAddressWithArrondissement(props.address ?? undefined));
const isAccepting = computed(() => props.profile?.is_accepting_appointments !== false);
const displayPhone = computed(() => props.profile?.phone?.trim() || '');
const roleLabel = computed(() => props.type === 'nurse' ? 'Infirmier à domicile' : 'Laboratoire de biologie');

const { appointmentNewUrl } = useAppointmentNewUrl();
const bookingUrl = computed(() => {
  const base = appointmentNewUrl.value;
  if (!props.profile?.id) return base;
  const params = new URLSearchParams({
    provider_id: props.profile.id,
    provider_type: props.type,
  });
  return `${base.split('?')[0]}?${params.toString()}`;
});

const YEARS_LABELS: Record<string, string> = {
  '1': "1 an d'expérience",
  '3': "3 ans d'exp.",
  '5': "5 ans d'exp.",
  '10': "10 ans d'exp.",
  '10_plus': "Expert (+10 ans d'exp.)",
};

const yearsExperienceLabel = (val: string) => YEARS_LABELS[val] || val;

const servicesToShow = computed(() => {
  const p = props.profile;
  if (!p) return [];
  if (props.type === 'nurse') {
    return (p.specializations || []).map((s: any) => ({
      id: String(s.id),
      name: String(s.name ?? ''),
      description: s.description ?? undefined,
      type: s.type === 'blood_test' ? 'blood_test' : 'nursing',
      icon: s.icon ?? null,
      image_url: s.image_url ?? null,
    }));
  }
  return (p.services || []).map((s: any) => ({
    id: String(s.id),
    name: String(s.name ?? ''),
    description: s.description ?? undefined,
    type: 'blood_test',
    icon: s.icon ?? null,
    image_url: s.image_url ?? null,
  }));
});

const hasOpeningHours = computed(() => Object.keys(props.profile?.opening_hours || {}).length > 0);

const mapsExternalUrl = computed(() => {
  const addr = props.address?.trim();
  if (addr) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  if (props.mapCenter?.lat) return `https://www.google.com/maps/search/?api=1&query=${props.mapCenter.lat},${props.mapCenter.lng}`;
  return '';
});

const normalizeUrl = (url: string) => url?.startsWith('http') ? url : `https://${url}`;

const linksVisible = computed(() => {
  const p = props.profile;
  return p && (p.website_url || Object.values(p.social_links || {}).some(Boolean));
});

const reviewPreviewItems = computed(() => Array.isArray(props.profile?.reviews?.items) ? props.profile.reviews.items.slice(0, 4) : []);
</script>