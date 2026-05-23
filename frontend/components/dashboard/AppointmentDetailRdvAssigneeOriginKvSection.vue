<template>
  <template v-if="showAssignedProfessionalSection">
    <template
      v-if="
        isNursingType &&
          (appointment.assigned_nurse_id || appointment.assigned_nurse_display_name) &&
          !hideNurseAssigneeIfSelf
      "
    >
      <div :class="kvRowCenter">
        <div :class="kvLabelTight">Infirmier(e)</div>
        <div class="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div class="flex min-w-0 items-center gap-2.5">
            <div
              class="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-default bg-default ring-1 ring-black/5 dark:ring-white/10 sm:h-9 sm:w-9"
            >
              <img
                v-if="profileImageUrl(appointment.assigned_nurse_profile_image_url)"
                :src="profileImageUrl(appointment.assigned_nurse_profile_image_url)"
                :alt="appointment.assigned_nurse_display_name || ''"
                class="h-full w-full object-cover"
              >
              <div v-else class="flex h-full w-full items-center justify-center">
                <UIcon name="i-lucide-stethoscope" class="w-4 h-4 text-muted" />
              </div>
            </div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ appointment.assigned_nurse_display_name || '·' }}
            </p>
          </div>
          <div class="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <UButton
              v-if="proOriginTelHref(appointment.assigned_nurse_phone)"
              size="xs"
              variant="outline"
              color="neutral"
              leading-icon="i-lucide-phone"
              class="shrink-0"
              :href="proOriginTelHref(appointment.assigned_nurse_phone)"
            >
              Appeler
            </UButton>
            <UButton
              v-if="proOriginSmsHref(appointment.assigned_nurse_phone)"
              size="xs"
              variant="outline"
              color="neutral"
              leading-icon="i-lucide-message-square"
              class="shrink-0"
              :href="proOriginSmsHref(appointment.assigned_nurse_phone)"
            >
              Message
            </UButton>
            <UButton
              v-if="appointment.assigned_nurse_public_slug"
              size="xs"
              variant="link"
              color="primary"
              class="px-0 py-0 h-auto min-h-0"
              @click="openAssigneeSheet('nurse', appointment.assigned_nurse_public_slug)"
            >
              Voir le profil
            </UButton>
          </div>
        </div>
      </div>
    </template>
    <template
      v-else-if="
        appointment.type === 'blood_test' &&
          (appointment.assigned_lab_id ||
            appointment.assigned_lab_display_name ||
            appointment.assigned_to ||
            appointment.assigned_to_display_name)
      "
    >
      <div
        v-if="
          (appointment.assigned_lab_id || appointment.assigned_lab_display_name) &&
            !hideLabAssigneeIfSelf
        "
        :class="kvRowCenter"
      >
        <div :class="kvLabelTight">Laboratoire</div>
        <div class="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div class="flex min-w-0 items-center gap-2.5">
            <div
              class="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-default bg-default ring-1 ring-black/5 dark:ring-white/10 sm:h-9 sm:w-9"
            >
              <img
                v-if="profileImageUrl(appointment.assigned_lab_profile_image_url)"
                :src="profileImageUrl(appointment.assigned_lab_profile_image_url)"
                :alt="appointment.assigned_lab_display_name || ''"
                class="h-full w-full object-cover"
              >
              <div v-else class="flex h-full w-full items-center justify-center">
                <UIcon name="i-lucide-flask-conical" class="w-4 h-4 text-muted" />
              </div>
            </div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ appointment.assigned_lab_display_name || '·' }}
            </p>
          </div>
          <div class="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <UButton
              v-if="proOriginTelHref(appointment.assigned_lab_phone)"
              size="xs"
              variant="outline"
              color="neutral"
              leading-icon="i-lucide-phone"
              class="shrink-0"
              :href="proOriginTelHref(appointment.assigned_lab_phone)"
            >
              Appeler
            </UButton>
            <UButton
              v-if="proOriginSmsHref(appointment.assigned_lab_phone)"
              size="xs"
              variant="outline"
              color="neutral"
              leading-icon="i-lucide-message-square"
              class="shrink-0"
              :href="proOriginSmsHref(appointment.assigned_lab_phone)"
            >
              Message
            </UButton>
            <UButton
              v-if="appointment.assigned_lab_public_slug"
              size="xs"
              variant="outline"
              color="neutral"
              leading-icon="i-lucide-id-card"
              class="shrink-0"
              @click="openAssigneeSheet('lab', appointment.assigned_lab_public_slug)"
            >
              Voir le profil
            </UButton>
          </div>
        </div>
      </div>
      <div
        v-if="
          (appointment.assigned_to || appointment.assigned_to_display_name) &&
            !hidePreleveurAssigneeIfSelf
        "
        :class="kvRow"
      >
        <div :class="kvLabel">Préleveur</div>
        <div class="min-w-0">
          <div class="flex items-start gap-2.5">
            <div
              class="mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full border border-default bg-default ring-1 ring-black/5 dark:ring-white/10 sm:mt-px sm:h-9 sm:w-9"
            >
              <img
                v-if="profileImageUrl(appointment.assigned_to_profile_image_url)"
                :src="profileImageUrl(appointment.assigned_to_profile_image_url)"
                :alt="String(appointment.assigned_to_display_name || appointment.assigned_to_name || '')"
                class="h-full w-full object-cover"
              >
              <div v-else class="flex h-full w-full items-center justify-center">
                <UIcon name="i-lucide-user" class="w-4 h-4 text-muted" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ appointment.assigned_to_display_name || appointment.assigned_to_name || '·' }}
              </p>
              <div
                v-if="proOriginTelHref(appointment.assigned_to_phone) || proOriginSmsHref(appointment.assigned_to_phone)"
                class="flex flex-wrap items-center gap-2 pt-1.5"
              >
                <UButton
                  v-if="proOriginTelHref(appointment.assigned_to_phone)"
                  size="xs"
                  variant="outline"
                  color="neutral"
                  leading-icon="i-lucide-phone"
                  class="shrink-0"
                  :href="proOriginTelHref(appointment.assigned_to_phone)"
                >
                  Appeler
                </UButton>
                <UButton
                  v-if="proOriginSmsHref(appointment.assigned_to_phone)"
                  size="xs"
                  variant="outline"
                  color="neutral"
                  leading-icon="i-lucide-message-square"
                  class="shrink-0"
                  :href="proOriginSmsHref(appointment.assigned_to_phone)"
                >
                  Message
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </template>
  <template v-if="showCreatorOrigin && !viewerIsCreator">
    <div
      v-if="appointment.creator_origin?.kind === 'patient_platform'"
      :class="kvRow"
    >
      <div :class="kvLabel">Origine</div>
      <div class="flex min-w-0 items-center gap-2.5">
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-default bg-default p-1 ring-1 ring-black/5 dark:ring-white/10 sm:h-9 sm:w-9"
        >
          <img
            src="/images/logo-cary.png"
            alt="Cary"
            class="h-full w-full object-contain"
          >
        </div>
        <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">
          {{ patientPlatformOriginDisplay }}
        </p>
      </div>
    </div>

    <div
      v-else-if="appointment.creator_origin?.kind === 'nurse'"
      :class="kvRow"
    >
      <div :class="kvLabel">Origine</div>
      <div class="min-w-0">
        <div v-if="creatorNurseOriginCompact">
          <p class="text-sm font-medium text-gray-900 dark:text-white leading-snug">
            {{ creatorNurseOriginCompactTitle }}
          </p>
        </div>
        <div
          v-else
          class="flex items-start gap-2.5"
        >
          <div
            class="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-default bg-default ring-1 ring-black/5 dark:ring-white/10 sm:h-9 sm:w-9"
          >
            <img
              v-if="profileImageUrl(appointment.creator_origin.profile_image_url)"
              :src="profileImageUrl(appointment.creator_origin.profile_image_url)"
              :alt="appointment.creator_origin.display_name || ''"
              class="h-full w-full object-cover"
            >
            <div
              v-else
              class="flex h-full w-full items-center justify-center"
            >
              <UIcon name="i-lucide-user" class="w-4 h-4 text-muted" />
            </div>
          </div>
          <div class="min-w-0 flex-1 space-y-2">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                {{ appointment.creator_origin.display_name || 'Infirmier' }}
              </p>
              <p class="text-xs text-muted">
                Saisie par un infirmier
              </p>
            </div>
            <div
              v-if="appointment.creator_origin.public_slug"
              class="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-stretch"
            >
              <UButton
                variant="outline"
                color="primary"
                size="sm"
                icon="i-lucide-id-card"
                class="justify-center w-full sm:w-auto sm:min-w-[7.5rem]"
                @click="openCreatorSheet('nurse', appointment.creator_origin.public_slug)"
              >
                Voir le profil
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else-if="appointment.creator_origin?.kind === 'pro'"
      :class="kvRow"
    >
      <div :class="kvLabel">Origine</div>
      <div class="min-w-0">
        <div
          v-if="creatorProOriginCompact"
          class="space-y-2.5"
        >
          <div class="flex items-start gap-2.5">
            <div
              class="mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full border border-default bg-default ring-1 ring-black/5 dark:ring-white/10"
            >
              <img
                v-if="profileImageUrl(appointment.creator_origin.profile_image_url)"
                :src="profileImageUrl(appointment.creator_origin.profile_image_url)"
                :alt="appointment.creator_origin.display_name || ''"
                class="h-full w-full object-cover"
              >
              <div v-else class="flex h-full w-full items-center justify-center">
                <UIcon name="i-lucide-stethoscope" class="w-4 h-4 text-muted" />
              </div>
            </div>
            <div class="min-w-0 flex-1 space-y-2">
              <p class="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                Vous avez créé ce rendez-vous en tant que professionnel de santé depuis votre espace.
              </p>
              <p class="text-xs text-muted leading-relaxed">
                L'origine du dossier est votre compte pro médical ; les informations patient et la suite du parcours sont détaillées ci‑dessous.
              </p>
            </div>
          </div>
          <UButton
            variant="outline"
            color="primary"
            size="sm"
            icon="i-lucide-id-card"
            class="w-full justify-center sm:w-auto"
            @click="proCreatorProfileOpen = true"
          >
            Voir le profil
          </UButton>
        </div>
        <div
          v-else
          class="flex items-start gap-2.5"
        >
          <div
            class="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-default bg-default ring-1 ring-black/5 dark:ring-white/10 sm:h-9 sm:w-9"
          >
            <img
              v-if="profileImageUrl(appointment.creator_origin.profile_image_url)"
              :src="profileImageUrl(appointment.creator_origin.profile_image_url)"
              :alt="appointment.creator_origin.display_name || ''"
              class="h-full w-full object-cover"
            >
            <div
              v-else
              class="flex h-full w-full items-center justify-center"
            >
              <UIcon name="i-lucide-stethoscope" class="w-4 h-4 text-muted" />
            </div>
          </div>
          <div class="min-w-0 flex-1 space-y-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Professionnel de santé
              </p>
              <p class="text-sm font-medium text-gray-900 dark:text-white leading-snug mt-0.5">
                <template v-if="appointment.creator_origin.first_name || appointment.creator_origin.last_name">
                  {{ [appointment.creator_origin.first_name, appointment.creator_origin.last_name].filter(Boolean).join(' ') }}
                </template>
                <template v-else>
                  {{ appointment.creator_origin.display_name || '·' }}
                </template>
              </p>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <UBadge
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  class="max-w-[min(100%,18rem)] truncate font-normal"
                >
                  <span class="text-muted">Profession</span><span class="text-gray-900 dark:text-gray-100"> · {{ appointment.creator_origin.emploi || 'Non renseigné' }}</span>
                </UBadge>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  class="max-w-[min(100%,18rem)] truncate font-normal"
                >
                  <span class="text-muted">N° Adeli</span><span class="text-gray-900 dark:text-gray-100 font-mono tabular-nums"> · {{ appointment.creator_origin.adeli || '—' }}</span>
                </UBadge>
              </div>
            </div>
            <div
              v-if="appointment.creator_origin.phone"
              class="flex flex-wrap items-center gap-2 pt-0.5"
            >
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                leading-icon="i-lucide-phone"
                class="shrink-0"
                :href="proOriginTelHref(appointment.creator_origin.phone)"
              >
                Appeler
              </UButton>
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                leading-icon="i-lucide-message-square"
                class="shrink-0"
                :href="proOriginSmsHref(appointment.creator_origin.phone)"
              >
                Message
              </UButton>
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              <UButton
                variant="outline"
                color="primary"
                size="sm"
                icon="i-lucide-id-card"
                class="justify-center sm:min-w-[9rem]"
                @click="proCreatorProfileOpen = true"
              >
                Voir le profil
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else-if="appointment.creator_origin?.kind === 'lab_team'"
      :class="kvRow"
    >
      <div :class="kvLabel">Origine</div>
      <div class="min-w-0">
        <div
          v-if="creatorLabOriginCompact"
          class="space-y-2"
        >
          <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {{
              viewerIsCreator
                ? "Vous avez créé ce rendez-vous depuis l'espace laboratoire (ou équipe associée)."
                : 'Ce rendez-vous a été créé par le même laboratoire que celui assigné.'
            }}
          </p>
          <p class="text-xs text-muted leading-relaxed">
            {{
              viewerIsCreator
                ? "L'origine indique une saisie côté équipe lab ; le détail ci‑dessous reprend l'assignation effective."
                : "La création et l'assignation correspondent au même établissement."
            }}
          </p>
        </div>
        <div
          v-else
          class="flex items-start gap-2.5"
        >
          <div
            class="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-default bg-default ring-1 ring-black/5 dark:ring-white/10 sm:h-9 sm:w-9"
          >
            <img
              v-if="profileImageUrl(appointment.creator_origin.profile_image_url)"
              :src="profileImageUrl(appointment.creator_origin.profile_image_url)"
              :alt="appointment.creator_origin.display_name || ''"
              class="h-full w-full object-cover"
            >
            <div
              v-else
              class="flex h-full w-full items-center justify-center"
            >
              <UIcon name="i-lucide-flask-conical" class="w-4 h-4 text-muted" />
            </div>
          </div>
          <div class="min-w-0 flex-1 space-y-2">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {{
                  appointment.creator_origin.role === 'subaccount'
                    ? 'Sous-compte laboratoire'
                    : appointment.creator_origin.role === 'preleveur'
                      ? 'Préleveur'
                      : 'Laboratoire'
                }}
              </p>
              <p class="text-sm font-medium text-gray-900 dark:text-white leading-snug mt-0.5">
                {{ appointment.creator_origin.display_name || '·' }}
              </p>
            </div>
            <div
              v-if="appointment.creator_origin.public_slug"
              class="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-stretch"
            >
              <UButton
                variant="outline"
                color="primary"
                size="sm"
                icon="i-lucide-id-card"
                class="justify-center w-full sm:w-auto sm:min-w-[7.5rem]"
                @click="openCreatorSheet('lab', appointment.creator_origin.public_slug)"
              >
                Voir le profil
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>

  <ProfessionalCreatorProfileSlideover
    v-if="appointment.creator_origin?.kind === 'pro'"
    v-model:open="proCreatorProfileOpen"
    :origin="appointment.creator_origin"
  />
</template>

<script setup lang="ts">
const proCreatorProfileOpen = ref(false);

const { profileImageUrl } = useProfileImageUrl();

defineProps<{
  appointment: any;
  isNursingType: boolean;
  showAssignedProfessionalSection: boolean;
  showCreatorOrigin: boolean;
  hideNurseAssigneeIfSelf?: boolean;
  hideLabAssigneeIfSelf?: boolean;
  hidePreleveurAssigneeIfSelf?: boolean;
  patientPlatformOriginDisplay: string;
  creatorNurseOriginCompact: boolean;
  creatorNurseOriginCompactTitle: string;
  creatorLabOriginCompact: boolean;
  creatorProOriginCompact: boolean;
  viewerIsCreator: boolean;
  openAssigneeSheet: (type: 'nurse' | 'lab', slug: string) => void;
  openCreatorSheet: (type: 'nurse' | 'lab', slug: string) => void;
}>();

function proOriginTelHref(phone: string | null | undefined) {
  const t = String(phone ?? '').trim();
  if (!t) return undefined;
  return `tel:${t.replace(/\s/g, '')}`;
}

function proOriginSmsHref(phone: string | null | undefined) {
  const t = String(phone ?? '').trim();
  if (!t) return undefined;
  return `sms:${t.replace(/\s/g, '')}`;
}

const kvRow =
  'grid grid-cols-1 gap-x-4 gap-y-1 px-4 py-3 sm:px-6 sm:grid-cols-[minmax(9.5rem,11rem)_minmax(0,1fr)] sm:items-start sm:py-2.5';
const kvRowCenter =
  'grid grid-cols-1 gap-x-4 gap-y-1 px-4 py-3 sm:px-6 sm:grid-cols-[minmax(9.5rem,11rem)_minmax(0,1fr)] sm:items-center sm:py-2.5';
const kvLabel = 'text-[11px] font-semibold uppercase tracking-wide text-muted shrink-0 pt-0.5';
const kvLabelTight = 'text-[11px] font-semibold uppercase tracking-wide text-muted shrink-0';
</script>
