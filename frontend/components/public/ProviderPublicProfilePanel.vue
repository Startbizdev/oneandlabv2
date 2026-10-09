<template>
  <div class="divide-y divide-default">
    <div class="space-y-4 px-4 py-5 sm:px-6">
      <ProfileSheetIdentity
        :name="profile.name"
        :role-label="roleLabel"
        :image-url="profileImageUrl(profile.profile_image_url)"
        :fallback-icon="type === 'nurse' ? 'i-lucide-stethoscope' : 'i-lucide-flask-conical'"
      >
        <template v-if="ratingLabel || yearsExperience || nurseAvailability" #meta>
          <span v-if="ratingLabel" class="inline-flex items-center gap-1">
            <UIcon name="i-heroicons-star-20-solid" class="size-4 text-amber-400" />
            <span class="font-semibold text-gray-900 dark:text-white">{{ ratingLabel }}</span>
            <span class="text-muted">({{ reviewCountLabel }})</span>
          </span>
          <span v-if="yearsExperience" class="text-muted">{{ yearsExperience }}</span>
          <UBadge
            v-if="nurseAvailability"
            :color="nurseAvailability.accepting ? 'success' : 'warning'"
            variant="subtle"
            size="sm"
          >
            {{ nurseAvailability.label }}
          </UBadge>
        </template>
      </ProfileSheetIdentity>

      <div v-if="bookingUrl || shareUrl" class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <UButton
          v-if="bookingUrl"
          :to="bookingUrl"
          icon="i-lucide-calendar-plus"
          block
        >
          Prendre rendez-vous
        </UButton>
        <PublicProfileShare
          v-if="shareUrl"
          :share-url="shareUrl"
          :profile-name="profile.name"
          :profile-type="type"
        />
      </div>
    </div>

    <ProfileSheetSection v-if="profile.biography" title="Présentation">
      <p class="whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {{ profile.biography }}
      </p>
    </ProfileSheetSection>

    <ProfileSheetSection v-if="services.length > 0">
      <PublicProfileServices
        :specializations="services"
        :title="type === 'nurse' ? 'Soins proposés' : 'Prélèvements proposés'"
        narrow-panel
      />
    </ProfileSheetSection>

    <ProfileSheetSection
      v-if="addressLabel || mapsUrl"
      :title="type === 'nurse' ? 'Zone d’intervention' : 'Adresse'"
    >
      <div class="flex items-start gap-3">
        <UIcon name="i-lucide-map-pin" class="mt-0.5 size-4 shrink-0 text-muted" />
        <div class="min-w-0 flex-1 space-y-1">
          <p v-if="addressLabel" class="text-sm font-medium text-gray-900 dark:text-white">
            {{ addressLabel }}
          </p>
          <p v-if="radiusKm" class="text-sm text-muted">
            Intervient jusqu’à {{ radiusKm }} km du centre de sa zone.
          </p>
          <UButton
            v-if="mapsUrl"
            :to="mapsUrl"
            target="_blank"
            variant="link"
            size="sm"
            trailing-icon="i-lucide-external-link"
            class="px-0"
          >
            Voir sur la carte
          </UButton>
        </div>
      </div>
    </ProfileSheetSection>

    <ProfileSheetSection v-if="labProfile && (hasOpeningHours || labBookingRules.length > 0)">
      <div class="space-y-3">
        <OpeningHoursWeek v-if="hasOpeningHours" :opening-hours="labProfile.opening_hours" />
        <ul v-if="labBookingRules.length > 0" class="space-y-1.5">
          <li
            v-for="rule in labBookingRules"
            :key="rule"
            class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <UIcon name="i-lucide-info" class="mt-0.5 size-4 shrink-0 text-muted" />
            <span>{{ rule }}</span>
          </li>
        </ul>
      </div>
    </ProfileSheetSection>

    <ProfileSheetSection v-if="qualifications.length > 0" title="Diplômes et formations">
      <ul class="space-y-2">
        <li
          v-for="q in qualifications"
          :key="`${q.code}-${q.label}`"
          class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
        >
          <UIcon name="i-lucide-graduation-cap" class="mt-0.5 size-4 shrink-0 text-muted" />
          <span class="min-w-0 break-words">{{ q.label }}</span>
        </li>
      </ul>
    </ProfileSheetSection>

    <ProfileSheetSection v-if="websiteUrl || socialLinks.length > 0" title="Sur le web">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="websiteUrl"
          :to="websiteUrl"
          target="_blank"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-globe"
        >
          Site internet
        </UButton>
        <UButton
          v-for="link in socialLinks"
          :key="link.platform"
          :to="link.url"
          target="_blank"
          color="neutral"
          variant="outline"
          size="sm"
          :icon="`i-simple-icons-${link.platform}`"
          :aria-label="link.label"
        />
      </div>
    </ProfileSheetSection>

    <ProfileSheetSection v-if="reviews.length > 0" title="Avis récents">
      <ul class="divide-y divide-default">
        <li v-for="review in reviews" :key="review.id" class="py-3 first:pt-0 last:pb-0">
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              {{ formatReviewerNameForDisplay(review.patient_name) }}
            </span>
            <span class="flex shrink-0 text-amber-400" :aria-label="`${review.rating} sur 5`">
              <UIcon
                v-for="i in 5"
                :key="i"
                :name="i <= review.rating ? 'i-heroicons-star-20-solid' : 'i-heroicons-star'"
                class="size-3.5"
              />
            </span>
          </div>
          <p class="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {{ review.comment }}
          </p>
        </li>
      </ul>
    </ProfileSheetSection>
  </div>
</template>

<script setup lang="ts">
import type {
  PublicLabProfile,
  PublicNurseProfile,
  PublicProfileSocialLinks,
} from '@oneandlab/shared-types';
import { addressAreaLabel } from '@oneandlab/shared-utils';
import { formatReviewerNameForDisplay } from '~/utils/reviewer-display';

const props = defineProps<
  | { type: 'nurse'; profile: PublicNurseProfile; shareUrl?: string }
  | { type: 'lab'; profile: PublicLabProfile; shareUrl?: string }
>();

const { profileImageUrl } = useProfileImageUrl();
const { appointmentNewUrl } = useAppointmentNewUrl();

const nurseProfile = computed(() => (props.type === 'nurse' ? props.profile : null));
const labProfile = computed(() => (props.type === 'lab' ? props.profile : null));

const roleLabel = computed(() =>
  props.type === 'nurse' ? 'Infirmier(e) à domicile' : 'Laboratoire de biologie médicale',
);

const YEARS_LABELS: Record<string, string> = {
  '1': '1 an d’expérience',
  '3': '3 ans d’expérience',
  '5': '5 ans d’expérience',
  '10': '10 ans d’expérience',
  '10_plus': 'Plus de 10 ans d’expérience',
};

const yearsExperience = computed(() => {
  const value = nurseProfile.value?.years_experience;
  return value ? YEARS_LABELS[value] ?? value : '';
});

const nurseAvailability = computed(() => {
  const nurse = nurseProfile.value;
  if (!nurse) return null;
  const accepting = nurse.is_accepting_appointments !== false;
  return {
    accepting,
    label: accepting ? 'Accepte des rendez-vous' : 'Ne prend plus de rendez-vous',
  };
});

const reviewStats = computed(() => props.profile.reviews?.stats);
const reviewCount = computed(() => reviewStats.value?.total_reviews ?? 0);

const ratingLabel = computed(() => {
  const average = reviewStats.value?.average_rating;
  if (!reviewCount.value || average == null) return '';
  return Number(average).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
});

const reviewCountLabel = computed(() => `${reviewCount.value} avis`);

const bookingUrl = computed(() => {
  if (nurseAvailability.value && !nurseAvailability.value.accepting) return '';
  const params = new URLSearchParams({ provider_id: props.profile.id, provider_type: props.type });
  return `${appointmentNewUrl.value.split('?')[0]}?${params.toString()}`;
});

const services = computed(() => {
  const rows = nurseProfile.value?.specializations ?? labProfile.value?.services ?? [];
  return rows.map((s) => ({
    id: String(s.id),
    name: s.name,
    description: s.description ?? undefined,
    type: props.type === 'lab' || s.type === 'blood_test' ? 'blood_test' : 'nursing',
    icon: s.icon ?? null,
    image_url: s.image_url ?? null,
  }));
});

const addressLabel = computed(() => {
  const raw = props.profile.address ?? props.profile.city_plain ?? '';
  return addressAreaLabel(raw);
});

const radiusKm = computed(() => {
  const radius = nurseProfile.value?.radius_km;
  return radius ? Math.round(radius) : 0;
});

const mapsUrl = computed(() => {
  const address = props.profile.address?.trim();
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const center = props.profile.map_center;
  if (center) return `https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`;
  return '';
});

const hasOpeningHours = computed(() => Object.keys(labProfile.value?.opening_hours ?? {}).length > 0);

const labBookingRules = computed(() => {
  const lab = labProfile.value;
  if (!lab) return [];
  const rules: string[] = [];
  if (lab.min_booking_lead_time_hours && lab.min_booking_lead_time_hours > 0) {
    rules.push(`Rendez-vous à réserver au moins ${lab.min_booking_lead_time_hours} h à l’avance.`);
  }
  if (lab.accept_rdv_saturday === false) rules.push('Pas de rendez-vous le samedi.');
  if (lab.accept_rdv_sunday === false) rules.push('Pas de rendez-vous le dimanche.');
  return rules;
});

const qualifications = computed(() => nurseProfile.value?.qualifications ?? []);

const websiteUrl = computed(() => {
  const url = props.profile.website_url?.trim();
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
});

const SOCIAL_PLATFORMS = [
  { platform: 'facebook', label: 'Facebook' },
  { platform: 'linkedin', label: 'LinkedIn' },
  { platform: 'instagram', label: 'Instagram' },
] as const satisfies ReadonlyArray<{ platform: keyof PublicProfileSocialLinks; label: string }>;

const socialLinks = computed(() => {
  const links = props.profile.social_links ?? {};
  return SOCIAL_PLATFORMS
    .map(({ platform, label }) => ({ platform, label, url: links[platform]?.trim() ?? '' }))
    .filter((link) => link.url !== '');
});

const reviews = computed(() =>
  (props.profile.reviews?.items ?? [])
    .filter((review) => (review.comment ?? '').trim() !== '')
    .slice(0, 4),
);
</script>
