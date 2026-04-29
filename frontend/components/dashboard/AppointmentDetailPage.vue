<template>
  <div class="space-y-6">
    <UButton
      :to="`${basePath}/appointments`"
      color="neutral"
      variant="ghost"
      size="md"
      leading-icon="i-lucide-arrow-left"
      class="mb-4"
    >
      Retour à la liste
    </UButton>

    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary-500 mb-4" />
      <p class="text-gray-500 dark:text-gray-400">Chargement des détails...</p>
    </div>

    <UEmpty
      v-else-if="!appointment"
      icon="i-lucide-alert-circle"
      title="Rendez-vous introuvable"
      description="Le rendez-vous demandé n'existe pas ou vous n'avez pas les permissions pour y accéder."
      variant="outline"
    />

    <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 space-y-6">
        <!-- Informations du rendez-vous (une carte par soin si lot multisoins) -->
        <AppointmentDetailRdvInfoCard
          v-for="(appt, batchIdx) in batchAppointmentsSorted"
          :key="appt.id"
          :appt="appt"
          :categories-for-detail="categoriesForDetail"
          :is-admin="isAdmin"
          :show-cancellation-photo="showCancellationPhoto"
          :batch-index="batchIdx"
          :batch-size="batchAppointmentsSorted.length"
        />

        <!-- Origine du RDV (staff / pro) -->
        <UCard v-if="showCreatorOrigin && appointment.creator_origin">
          <template #header>
            <h2 class="text-lg font-normal flex items-center gap-2">
              <UIcon name="i-lucide-git-branch" class="w-5 h-5" />
              Origine du rendez-vous
            </h2>
          </template>
          <div class="space-y-3">
            <template v-if="appointment.creator_origin.kind === 'patient_platform'">
              <p class="text-sm text-gray-700 dark:text-gray-300">
                {{ appointment.creator_origin.label || 'Patient OneAndLab' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Demande passée depuis la plateforme (patient).
              </p>
            </template>
            <div v-else-if="appointment.creator_origin.kind === 'nurse'">
              <div v-if="creatorNurseOriginCompact" class="space-y-2">
                <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {{ creatorNurseOriginCompactTitle }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {{ creatorNurseOriginCompactHint }}
                </p>
              </div>
              <div v-else class="flex flex-wrap items-center gap-3">
                <div
                  class="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
                >
                  <img
                    v-if="appointment.creator_origin.profile_image_url"
                    :src="appointment.creator_origin.profile_image_url"
                    :alt="appointment.creator_origin.display_name || ''"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center">
                    <UIcon name="i-lucide-user" class="w-6 h-6 text-gray-400" />
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ appointment.creator_origin.display_name || 'Infirmier' }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Saisie par un infirmier</p>
                </div>
                <UButton
                  v-if="appointment.creator_origin.public_slug"
                  size="sm"
                  variant="outline"
                  color="primary"
                  class="shrink-0"
                  @click="openCreatorSheet('nurse', appointment.creator_origin.public_slug)"
                >
                  Voir la fiche
                </UButton>
              </div>
            </div>
            <div v-else-if="appointment.creator_origin.kind === 'pro'">
              <div v-if="creatorProOriginCompact" class="space-y-2.5">
                <p class="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                  Vous avez créé ce rendez-vous en tant que professionnel de santé depuis votre espace.
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  L’origine du dossier est votre compte pro ; les informations patient et la suite du parcours sont détaillées ci‑dessous.
                </p>
              </div>
              <div
                v-else
                class="rounded-lg border border-default/60 bg-default/5 p-4 sm:p-5"
              >
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                  <div
                    class="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 sm:h-12 sm:w-12"
                  >
                    <img
                      v-if="appointment.creator_origin.profile_image_url"
                      :src="appointment.creator_origin.profile_image_url"
                      :alt="appointment.creator_origin.display_name || ''"
                      class="h-full w-full object-cover"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center">
                      <UIcon name="i-lucide-stethoscope" class="w-6 h-6 text-gray-400" />
                    </div>
                  </div>
                  <div class="min-w-0 flex-1 space-y-4">
                    <header class="space-y-1">
                      <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">
                        Professionnel de santé
                      </p>
                      <p class="text-base font-semibold leading-tight text-gray-900 dark:text-white">
                        <template v-if="appointment.creator_origin.first_name || appointment.creator_origin.last_name">
                          {{ [appointment.creator_origin.first_name, appointment.creator_origin.last_name].filter(Boolean).join(' ') }}
                        </template>
                        <template v-else>
                          {{ appointment.creator_origin.display_name || '—' }}
                        </template>
                      </p>
                    </header>
                    <dl class="space-y-3">
                      <div class="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,7.5rem)_1fr] sm:gap-x-4 sm:items-start">
                        <dt class="text-xs font-medium text-muted">Profession</dt>
                        <dd class="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                          {{ appointment.creator_origin.emploi || 'Non renseigné' }}
                        </dd>
                      </div>
                      <div
                        v-if="appointment.creator_origin.phone"
                        class="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,7.5rem)_1fr] sm:gap-x-4 sm:items-start"
                      >
                        <dt class="text-xs font-medium text-muted">Téléphone</dt>
                        <dd class="text-sm">
                          <a
                            :href="`tel:${String(appointment.creator_origin.phone).replace(/\s/g, '')}`"
                            class="font-medium text-primary hover:underline break-all"
                          >
                            {{ appointment.creator_origin.phone }}
                          </a>
                        </dd>
                      </div>
                      <div
                        v-if="appointment.creator_origin.adeli"
                        class="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,7.5rem)_1fr] sm:gap-x-4 sm:items-start"
                      >
                        <dt class="text-xs font-medium text-muted">N° Adeli</dt>
                        <dd class="text-sm font-mono font-medium text-gray-800 dark:text-gray-200 tabular-nums">
                          {{ appointment.creator_origin.adeli }}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="appointment.creator_origin.kind === 'lab_team'">
              <div v-if="creatorLabOriginCompact" class="space-y-2">
                <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {{
                    viewerIsCreator
                      ? 'Vous avez créé ce rendez-vous depuis l’espace laboratoire (ou équipe associée).'
                      : 'Ce rendez-vous a été créé par le même laboratoire que celui assigné.'
                  }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {{
                    viewerIsCreator
                      ? 'L’origine indique une saisie côté équipe lab ; le détail ci‑dessous reprend l’assignation effective.'
                      : 'La création et l’assignation correspondent au même établissement.'
                  }}
                </p>
              </div>
              <div v-else class="flex flex-wrap items-center gap-3">
                <div
                  class="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
                >
                  <img
                    v-if="appointment.creator_origin.profile_image_url"
                    :src="appointment.creator_origin.profile_image_url"
                    :alt="appointment.creator_origin.display_name || ''"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center">
                    <UIcon name="i-lucide-flask-conical" class="w-6 h-6 text-gray-400" />
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ appointment.creator_origin.display_name || 'Laboratoire' }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {{ appointment.creator_origin.role === 'subaccount' ? 'Sous-compte laboratoire' : appointment.creator_origin.role === 'preleveur' ? 'Préleveur' : 'Laboratoire' }}
                  </p>
                </div>
                <UButton
                  v-if="appointment.creator_origin.public_slug"
                  size="sm"
                  variant="outline"
                  color="primary"
                  class="shrink-0"
                  @click="openCreatorSheet('lab', appointment.creator_origin.public_slug)"
                >
                  Voir la fiche
                </UButton>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Professionnel ayant accepté / pris en charge le RDV -->
        <UCard v-if="showAssignedProfessionalSection">
          <template #header>
            <div>
              <h2 class="text-lg font-normal flex items-center gap-2">
                <UIcon name="i-lucide-user-check" class="w-5 h-5" />
                Professionnel assigné
              </h2>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-normal">
                Professionnel ayant accepté ou pris en charge ce rendez-vous.
              </p>
            </div>
          </template>
          <div class="space-y-6">
            <!-- Soins infirmiers : infirmier -->
            <div
              v-if="isNursingType && (appointment.assigned_nurse_id || appointment.assigned_nurse_display_name)"
              class="flex flex-wrap items-center gap-3"
            >
              <div class="flex-shrink-0">
                <UserAvatar
                  :src="assigneeNurseImageUrl"
                  :initial="assigneeNurseInitial"
                  alt="Infirmier"
                  size="lg"
                />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                  Infirmier
                </p>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">
                  {{ appointment.assigned_nurse_display_name || '—' }}
                </p>
              </div>
              <UButton
                v-if="appointment.assigned_nurse_public_slug"
                size="sm"
                variant="outline"
                color="primary"
                class="shrink-0"
                @click="openAssigneeSheet('nurse', appointment.assigned_nurse_public_slug)"
              >
                Voir la fiche
              </UButton>
            </div>

            <!-- Prise de sang : laboratoire -->
            <div
              v-if="appointment.type === 'blood_test' && (appointment.assigned_lab_id || appointment.assigned_lab_display_name)"
              class="flex flex-col gap-3"
            >
              <div class="flex flex-wrap items-center gap-3">
                <div class="flex-shrink-0">
                  <UserAvatar
                    :src="assigneeLabImageUrl"
                    :initial="assigneeLabInitial"
                    alt="Laboratoire"
                    size="lg"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                    Laboratoire
                  </p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ appointment.assigned_lab_display_name || '—' }}
                  </p>
                </div>
                <UButton
                  v-if="appointment.assigned_lab_public_slug"
                  size="sm"
                  variant="outline"
                  color="primary"
                  class="shrink-0"
                  @click="openAssigneeSheet('lab', appointment.assigned_lab_public_slug)"
                >
                  Voir la fiche
                </UButton>
              </div>
              <p
                v-if="appointment.assigned_lab_address"
                class="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2 pl-0 sm:pl-[3.25rem]"
              >
                <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{{ appointment.assigned_lab_address }}</span>
              </p>
            </div>

            <!-- Prise de sang : préleveur -->
            <div
              v-if="appointment.type === 'blood_test' && (appointment.assigned_to || appointment.assigned_to_display_name)"
              class="flex flex-wrap items-start gap-4 pt-2 border-t border-default/60"
              :class="{ 'border-t-0 pt-0': !(appointment.assigned_lab_id || appointment.assigned_lab_display_name) }"
            >
              <div class="flex-shrink-0">
                <UserAvatar
                  :src="assigneePreleveurImageUrl"
                  :initial="assigneePreleveurInitial"
                  alt="Préleveur"
                  size="lg"
                />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                  Préleveur
                </p>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">
                  {{ appointment.assigned_to_display_name || appointment.assigned_to_name || '—' }}
                </p>
                <p v-if="appointment.assigned_to_phone" class="text-sm mt-2">
                  <a
                    :href="`tel:${String(appointment.assigned_to_phone).replace(/\s/g, '')}`"
                    class="text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {{ appointment.assigned_to_phone }}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </UCard>

        <ProviderPublicProfileSlideover
          v-if="creatorSheetSlug"
          v-model:open="creatorSheetOpen"
          :provider-type="creatorSheetType"
          :slug="creatorSheetSlug"
        />

        <ProviderPublicProfileSlideover
          v-if="assigneeSheetSlug"
          v-model:open="assigneeSheetOpen"
          :provider-type="assigneeSheetType"
          :slug="assigneeSheetSlug"
        />

        <!-- Informations patient (masqué si RDV annulé, sauf admin) -->
        <UCard v-if="(appointment.form_data || appointment.relative) && (appointment.status !== 'canceled' || isAdmin)">
          <template #header>
            <h2 class="text-lg font-normal flex items-center gap-2">
              <UIcon name="i-lucide-user" class="w-5 h-5" />
              {{ appointment.relative ? 'Informations proche' : 'Informations patient' }}
            </h2>
          </template>
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <UIcon name="i-lucide-user-circle" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Nom complet</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ appointment.relative ? `${appointment.relative.first_name} ${appointment.relative.last_name}` : `${appointment.form_data?.first_name} ${appointment.form_data?.last_name}` }}
                </p>
                <p v-if="appointment.relative" class="text-xs text-gray-500 dark:text-gray-400 mt-1">Lien: {{ getRelationshipLabel(appointment.relative.relationship_type) }}</p>
              </div>
            </div>
            <div v-if="(appointment.relative && appointment.relative.phone) || appointment.form_data?.phone" class="flex items-start gap-3">
              <UIcon name="i-lucide-phone" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Téléphone</p>
                <a
                  :href="`tel:${(appointment.relative?.phone || appointment.form_data?.phone || '').replace(/\s/g, '')}`"
                  class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline"
                >
                  {{ appointment.relative?.phone || appointment.form_data?.phone }}
                </a>
              </div>
            </div>
            <div v-if="patientContactEmailDisplay.text" class="flex items-start gap-3">
              <UIcon name="i-lucide-mail" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <a
                  v-if="patientContactEmailDisplay.href"
                  :href="patientContactEmailDisplay.href"
                  class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline break-words"
                >
                  {{ patientContactEmailDisplay.text }}
                </a>
                <p v-else class="text-sm font-medium text-gray-900 dark:text-white break-words">
                  {{ patientContactEmailDisplay.text }}
                </p>
              </div>
            </div>
            <div v-if="patientBirthDate" class="flex items-start gap-3">
              <UIcon name="i-lucide-cake" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Date de naissance</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ formatDateOnly(patientBirthDate) }}</p>
                <p v-if="patientAge != null" class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ patientAge }}</p>
              </div>
            </div>
            <div
              v-if="appointment.relative?.is_minor === true"
              class="rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/20 px-3 py-2.5"
              role="status"
            >
              <p class="text-sm text-amber-950 dark:text-amber-100 leading-snug">
                <span class="font-medium">Personne mineure</span><template v-if="appointment.relative.age_years != null && appointment.relative.age_years !== undefined">
                  ({{ appointment.relative.age_years }} an{{ appointment.relative.age_years === 1 ? '' : 's' }})
                </template>
                — le rendez-vous est réservé par le titulaire du compte (contact principal ci-dessous), habilité à représenter le patient pour la prise en charge.
              </p>
            </div>
            <div
              v-if="showBookingContactBlock"
              class="pt-4 mt-1 border-t border-gray-200 dark:border-gray-700 space-y-3"
            >
              <div>
                <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Contact principal</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Titulaire du compte — personne qui a pris le rendez-vous</p>
              </div>
              <div v-if="bookingContactFullName" class="flex items-start gap-3">
                <UIcon name="i-lucide-user-check" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-gray-500 dark:text-gray-400">Nom complet</p>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ bookingContactFullName }}</p>
                </div>
              </div>
              <div v-if="appointment.booking_contact?.phone" class="flex items-start gap-3">
                <UIcon name="i-lucide-phone" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-gray-500 dark:text-gray-400">Téléphone</p>
                  <a
                    :href="`tel:${String(appointment.booking_contact.phone).replace(/\s/g, '')}`"
                    class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline"
                  >
                    {{ appointment.booking_contact.phone }}
                  </a>
                </div>
              </div>
              <div v-if="bookingContactEmailDisplay.text" class="flex items-start gap-3">
                <UIcon name="i-lucide-mail" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <a
                    v-if="bookingContactEmailDisplay.href"
                    :href="bookingContactEmailDisplay.href"
                    class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline break-words"
                  >
                    {{ bookingContactEmailDisplay.text }}
                  </a>
                  <p v-else class="text-sm font-medium text-gray-900 dark:text-white break-words">
                    {{ bookingContactEmailDisplay.text }}
                  </p>
                </div>
              </div>
            </div>
            <div v-if="$slots.patientCardActions" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <slot name="patientCardActions" :appointment="appointment" />
            </div>
          </div>
        </UCard>

        <!-- Galerie photos de soins (masquée si annulé, sauf admin) -->
        <slot
          v-if="$slots.careGallery && (appointment.status !== 'canceled' || isAdmin)"
          name="careGallery"
          :appointment="appointment"
        />

        <!-- Créer une ordonnance (slot pro/nurse) -->
        <slot
          v-if="$slots.prescriptionSection && (appointment.status !== 'canceled' || isAdmin)"
          name="prescriptionSection"
          :appointment="appointment"
          :documents="documents"
          :load-documents="loadDocuments"
        />

        <!-- Documents médicaux (masqués si annulé, sauf admin) -->
        <UCard v-if="$slots.documentsCard && (appointment.status !== 'canceled' || isAdmin)">
          <template #header>
            <h2 class="text-lg font-normal flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="w-5 h-5" />
              Documents médicaux
            </h2>
          </template>
          <slot name="documentsCard" :appointment="appointment" :documents="documents" :documents-loading="documentsLoading" :load-documents="loadDocuments" />
        </UCard>

        <!-- Contenu extra colonne principale (ex: historique statuts admin) -->
        <slot v-if="$slots.mainExtra" name="mainExtra" :appointment="appointment" :load-appointment="loadAppointment" />
      </div>

      <!-- Colonne de droite : Actions + Section Assignation (sections séparées) -->
      <div class="xl:col-span-1 space-y-6">
        <UCard v-if="$slots.sidebarActions">
          <template #header>
            <h2 class="text-lg font-normal flex items-center gap-2">
              <UIcon name="i-lucide-zap" class="w-5 h-5" />
              Actions
            </h2>
          </template>
          <slot name="sidebarActions" :appointment="appointment" :load-appointment="loadAppointment" />
        </UCard>
        <!-- Section Assignation (colonne de droite, pas dans la carte Actions) -->
        <slot v-if="$slots.assignationSection" name="assignationSection" :appointment="appointment" :load-appointment="loadAppointment" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { apiFetch } from '~/utils/api';
import { CANCELLATION_REASONS } from '~/config/cancellation-reasons';
import {
  extractEmailFromDisplayLine,
  isTechnicalPatientEmail,
  patientUiEmailLine,
} from '~/utils/patient-address-rdv';

const props = defineProps<{ basePath: string }>();
const emit = defineEmits<{ (e: 'appointment-loaded', appointment: any): void }>();
const route = useRoute();

/** Jeton de partage (lien WhatsApp) : permet GET / PUT pour un confrère hors zone. */
const shareTokenFromRoute = computed(() => {
  const q = route.query.shareToken ?? route.query.token;
  const v = Array.isArray(q) ? q[0] : q;
  return typeof v === 'string' && v.length > 0 ? v : '';
});

function appointmentGetUrl(appointmentId: string) {
  const base = `/appointments/${encodeURIComponent(String(appointmentId))}`;
  const st = shareTokenFromRoute.value;
  if (st) return `${base}?share_token=${encodeURIComponent(st)}`;
  return base;
}
const toast = useAppToast();
const { user } = useAuth();

// Admin, lab, subaccount : accès à la photo d'annulation ; nurse, preleveur : motif uniquement
const showCancellationPhoto = computed(() =>
  user.value?.role === 'super_admin' || user.value?.role === 'lab' || user.value?.role === 'subaccount',
);

const isAdmin = computed(() => user.value?.role === 'super_admin');

const showCreatorOrigin = computed(() =>
  ['super_admin', 'nurse', 'lab', 'subaccount', 'preleveur', 'pro'].includes(user.value?.role ?? ''),
);

const creatorSheetOpen = ref(false);
const creatorSheetSlug = ref<string | null>(null);
const creatorSheetType = ref<'nurse' | 'lab'>('nurse');

const assigneeSheetOpen = ref(false);
const assigneeSheetSlug = ref<string | null>(null);
const assigneeSheetType = ref<'nurse' | 'lab'>('nurse');

function openCreatorSheet(type: 'nurse' | 'lab', slug: string) {
  creatorSheetType.value = type;
  creatorSheetSlug.value = slug;
  creatorSheetOpen.value = true;
}

function openAssigneeSheet(type: 'nurse' | 'lab', slug: string) {
  assigneeSheetType.value = type;
  assigneeSheetSlug.value = slug;
  assigneeSheetOpen.value = true;
}

function getCancellationReasonLabel(code: string) {
  return CANCELLATION_REASONS[code] || code;
}

const appointment = ref<any>(null);

/** E-mail patient / proche : masque delegated-…@patients.internal.local (utilise patient_email_display du détail RDV). */
const patientContactEmailDisplay = computed(() => {
  const a = appointment.value;
  if (!a) return { text: '', href: null as string | null };
  const raw = (a.relative?.email || a.form_data?.email || '') as string;
  if (!String(raw).trim()) return { text: '', href: null };
  const display = a.patient_email_display as string | undefined;
  const text = patientUiEmailLine({ email: raw, email_display: display });
  if (isTechnicalPatientEmail(raw) && display) {
    const extracted = extractEmailFromDisplayLine(display);
    return { text, href: extracted ? `mailto:${extracted}` : null };
  }
  if (!isTechnicalPatientEmail(raw)) {
    return { text: raw, href: `mailto:${raw}` };
  }
  return { text, href: null };
});

const showBookingContactBlock = computed(() => {
  const a = appointment.value;
  const bc = a?.booking_contact;
  if (!a?.relative || !bc) return false;
  const name = `${bc.first_name ?? ''} ${bc.last_name ?? ''}`.trim();
  return !!(name || bc.phone || bc.email);
});

const bookingContactFullName = computed(() => {
  const bc = appointment.value?.booking_contact;
  if (!bc) return '';
  return [bc.first_name, bc.last_name].filter(Boolean).join(' ').trim();
});

/** E-mail du titulaire (compte) pour RDV proche — masque e-mails techniques comme pour le patient. */
const bookingContactEmailDisplay = computed(() => {
  const bc = appointment.value?.booking_contact;
  if (!bc) return { text: '', href: null as string | null };
  const raw = (bc.email || '') as string;
  if (!String(raw).trim()) return { text: '', href: null };
  const display = bc.email_display as string | undefined;
  const text = patientUiEmailLine({ email: raw, email_display: display });
  if (isTechnicalPatientEmail(raw) && display) {
    const extracted = extractEmailFromDisplayLine(display);
    return { text, href: extracted ? `mailto:${extracted}` : null };
  }
  if (!isTechnicalPatientEmail(raw)) {
    return { text: raw, href: `mailto:${raw}` };
  }
  return { text, href: null };
});

const isNursingType = computed(() => {
  const t = appointment.value?.type;
  return t === 'nursing' || t === 'nurse';
});

const showAssignedProfessionalSection = computed(() => {
  const a = appointment.value;
  if (!a) return false;
  if (isNursingType.value && (a.assigned_nurse_id || a.assigned_nurse_display_name)) return true;
  if (a.type === 'blood_test' && (a.assigned_lab_id || a.assigned_lab_display_name || a.assigned_to || a.assigned_to_display_name)) {
    return true;
  }
  return false;
});

/** Même utilisateur connecté que created_by (évite doublon origine / assigné). */
const viewerIsCreator = computed(() => {
  const a = appointment.value;
  const u = user.value;
  if (!a?.created_by || !u?.id) return false;
  return String(u.id) === String(a.created_by);
});

const originNurseSameAsAssignee = computed(() => {
  const a = appointment.value;
  const o = a?.creator_origin;
  if (!o || o.kind !== 'nurse' || !a?.assigned_nurse_id || !o.id) return false;
  return String(o.id) === String(a.assigned_nurse_id);
});

const originLabSameAsAssignee = computed(() => {
  const a = appointment.value;
  const o = a?.creator_origin;
  if (!o || o.kind !== 'lab_team' || !a?.assigned_lab_id || !o.id) return false;
  return String(o.id) === String(a.assigned_lab_id);
});

const creatorNurseOriginCompact = computed(() => {
  const a = appointment.value;
  const o = a?.creator_origin;
  if (!o || o.kind !== 'nurse') return false;
  if (viewerIsCreator.value) return true;
  if (originNurseSameAsAssignee.value) return true;
  return false;
});

const creatorNurseOriginCompactTitle = computed(() => {
  if (viewerIsCreator.value) {
    return 'Vous avez créé et saisi ce rendez-vous depuis votre espace infirmier.';
  }
  return 'Ce rendez-vous a été saisi par le même infirmier qui l’a accepté.';
});

const creatorNurseOriginCompactHint = computed(() => {
  if (viewerIsCreator.value) {
    return 'Les informations ci‑dessous sur le professionnel assigné vous concernent ; l’origine indique que la saisie ne provient pas d’une demande patient seule sur la plateforme.';
  }
  return 'La création de la fiche et la prise en charge sont assurées par le même professionnel.';
});

const creatorLabOriginCompact = computed(() => {
  const a = appointment.value;
  const o = a?.creator_origin;
  if (!o || o.kind !== 'lab_team') return false;
  if (viewerIsCreator.value) return true;
  if (originLabSameAsAssignee.value) return true;
  return false;
});

const creatorProOriginCompact = computed(() => {
  const o = appointment.value?.creator_origin;
  if (!o || o.kind !== 'pro') return false;
  return viewerIsCreator.value;
});

const { profileImageUrl } = useProfileImageUrl();

const assigneeNurseImageUrl = computed(() => {
  const url = appointment.value?.assigned_nurse_profile_image_url;
  return profileImageUrl(url ?? null) ?? undefined;
});
const assigneeNurseInitial = computed(() => {
  const name = appointment.value?.assigned_nurse_display_name || '';
  return name ? name.charAt(0).toUpperCase() : 'I';
});

const assigneeLabImageUrl = computed(() => {
  const url = appointment.value?.assigned_lab_profile_image_url;
  return profileImageUrl(url ?? null) ?? undefined;
});
const assigneeLabInitial = computed(() => {
  const name = appointment.value?.assigned_lab_display_name || '';
  return name ? name.charAt(0).toUpperCase() : 'L';
});

const assigneePreleveurImageUrl = computed(() => {
  const url = appointment.value?.assigned_to_profile_image_url;
  return profileImageUrl(url ?? null) ?? undefined;
});
const assigneePreleveurInitial = computed(() => {
  const name = appointment.value?.assigned_to_display_name || appointment.value?.assigned_to_name || '';
  return name ? name.charAt(0).toUpperCase() : 'P';
});

/** Détails complets des autres RDV du même lot (GET /appointments/:id pour chaque fratrie). */
const batchSiblingsFull = ref<any[]>([]);
const loading = ref(true);
const documents = ref<any[]>([]);
const documentsLoading = ref(false);
const categoriesForDetail = ref<Array<{ id: string; options?: Array<{ option_key: string; label: string; options?: { value: string; label: string }[] }> }>>([]);

/** Tous les RDV du lot (page courante + fratries), triés par date — une carte « Informations » par entrée. */
const batchAppointmentsSorted = computed(() => {
  const current = appointment.value;
  if (!current) return [];
  const siblings = batchSiblingsFull.value;
  if (!siblings.length) return [current];
  const all = [current, ...siblings];
  return [...all].sort((a, b) => {
    const ta = new Date(a.scheduled_at || 0).getTime();
    const tb = new Date(b.scheduled_at || 0).getTime();
    return ta - tb;
  });
});

const batchAppointmentIds = computed(() => {
  const a = appointment.value;
  if (!a?.id) return [];
  const siblings = batchSiblingsFull.value;
  if (!siblings.length) return [String(a.id)];
  return [String(a.id), ...siblings.map((s: any) => String(s.id))];
});

// Breadcrumb : afficher le nom du patient au lieu de l'ID (lu par le layout dashboard)
const breadcrumbDetailLabel = useState<string>('breadcrumbDetailLabel', () => '');
watch(appointment, (a) => {
  if (!a) {
    breadcrumbDetailLabel.value = '';
    return;
  }
  const first = a.relative?.first_name ?? a.form_data?.first_name ?? '';
  const last = a.relative?.last_name ?? a.form_data?.last_name ?? '';
  breadcrumbDetailLabel.value = [first, last].filter(Boolean).join(' ') || 'Détails';
}, { immediate: true });
onBeforeUnmount(() => {
  breadcrumbDetailLabel.value = '';
});

const patientBirthDate = computed(() => {
  const a = appointment.value;
  if (!a) return null;
  return a.relative?.birth_date || a.form_data?.birth_date || null;
});

const patientAge = computed(() => {
  const d = patientBirthDate.value;
  if (!d) return null;
  try {
    const birth = new Date(typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}/) ? d.slice(0, 10) : d);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 0) return null;
    return age === 1 ? '1 an' : `${age} ans`;
  } catch {
    return null;
  }
});

/** Recharge le RDV. Si merge est fourni (ex. après réassignation), met à jour l’état local immédiatement sans refetch (réponse instantanée). */
const loadAppointment = async (merge?: Partial<{ assigned_lab_id: string; assigned_to: string | null; assigned_nurse_id: string | null }>) => {
  if (merge && Object.keys(merge).length > 0) {
    if (appointment.value) {
      Object.assign(appointment.value, merge);
      if ('assigned_lab_id' in merge || 'assigned_to' in merge) {
        appointment.value.assigned_nurse_id = null;
      }
      if ('assigned_nurse_id' in merge) {
        appointment.value.assigned_lab_id = null;
        appointment.value.assigned_to = null;
      }
    }
    return;
  }
  loading.value = true;
  batchSiblingsFull.value = [];
  try {
    const response = await apiFetch(appointmentGetUrl(String(route.params.id)), { method: 'GET' });
    if (response.success && response.alreadyAccepted) {
      await navigateTo(`${props.basePath}/appointments?alreadyAccepted=1`);
      return;
    }
    if (response.success && response.data) {
      appointment.value = response.data;
      emit('appointment-loaded', response.data);
      const appType = (response.data.type === 'nursing' || response.data.type === 'nurse') ? 'nursing' : 'blood_test';
      try {
        const catRes = await apiFetch(`/categories?type=${appType}`, { method: 'GET' });
        if (catRes.success && Array.isArray(catRes.data)) {
          categoriesForDetail.value = catRes.data as any[];
        } else {
          categoriesForDetail.value = [];
        }
      } catch {
        categoriesForDetail.value = [];
      }

      const sibs = response.data.batch_siblings;
      if (Array.isArray(sibs) && sibs.length > 0) {
        const full = await Promise.all(
          sibs.map(async (s: { id: string }) => {
            try {
              const r = await apiFetch(`/appointments/${encodeURIComponent(s.id)}`, { method: 'GET' });
              if (r.success && r.data) return r.data;
            } catch {
              /* ignore */
            }
            return null;
          }),
        );
        batchSiblingsFull.value = full.filter(Boolean) as any[];
      }
    } else {
      toast.add({ title: 'Erreur', description: response.error || 'Impossible de charger le rendez-vous', color: 'error' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' });
  } finally {
    loading.value = false;
  }
};

/** Libellé court pour badge ordonnance (lot multisoins, même patient). */
function formatBatchRdvLabel(apt: any, index: number): string {
  const cat = apt?.category_name || 'Soin';
  const n = index + 1;
  return `Soin ${n} — ${cat}`;
}

const loadDocuments = async () => {
  const ids = batchAppointmentIds.value;
  if (!ids.length) return;
  documentsLoading.value = true;
  documents.value = [];
  try {
    const lists = await Promise.all(
      ids.map((id) =>
        apiFetch(`/medical-documents?appointment_id=${encodeURIComponent(id)}`, { method: 'GET' }).then((r) =>
          r.success && Array.isArray(r.data) ? r.data : [],
        ),
      ),
    );

    if (ids.length <= 1) {
      const merged: any[] = [];
      const seen = new Set<string>();
      for (const list of lists) {
        for (const doc of list) {
          const key = String((doc as any).id ?? (doc as any).medical_document_id ?? '');
          if (key && !seen.has(key)) {
            seen.add(key);
            merged.push(doc);
          }
        }
      }
      merged.sort((a, b) => String(a.document_type || '').localeCompare(String(b.document_type || '')));
      documents.value = merged;
      return;
    }

    const sortedApts = batchAppointmentsSorted.value;
    const aptById = (id: string) => sortedApts.find((x: any) => String(x.id) === id) || appointment.value;

    const merged: any[] = [];
    const seenNonOrdoType = new Set<string>();

    for (let i = 0; i < lists.length; i++) {
      const aptId = ids[i];
      const apt = aptById(aptId) || {};
      const ordoLabel = formatBatchRdvLabel(apt, i);

      for (const doc of lists[i]) {
        const dt = String((doc as any).document_type || '');
        if (dt === 'ordonnance') {
          merged.push({
            ...doc,
            _batchRdvLabel: ordoLabel,
            _batchOrd: i,
          });
        } else {
          if (seenNonOrdoType.has(dt)) continue;
          seenNonOrdoType.add(dt);
          merged.push(doc);
        }
      }
    }

    merged.sort((a, b) => {
      const ta = String(a.document_type || '');
      const tb = String(b.document_type || '');
      if (ta !== tb) return ta.localeCompare(tb);
      if (ta === 'ordonnance') return ((a as any)._batchOrd ?? 0) - ((b as any)._batchOrd ?? 0);
      return 0;
    });
    documents.value = merged;
  } catch (error: any) {
    console.error('Erreur chargement documents:', error);
  } finally {
    documentsLoading.value = false;
  }
};

const PARIS_TZ = 'Europe/Paris';

function formatDateTime(d: string) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { timeZone: PARIS_TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}
function formatDate(d: string) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { timeZone: PARIS_TZ, day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}
function formatDateOnly(d: string) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { timeZone: PARIS_TZ, day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
}
function getRelationshipLabel(r: string) {
  const map: Record<string, string> = { child: 'Enfant', parent: 'Parent', spouse: 'Conjoint(e)', sibling: 'Frère/Sœur', other: 'Autre' };
  return map[r] || r;
}

onMounted(async () => {
  await loadAppointment();
  // Recharger les documents une fois le RDV chargé pour utiliser appointment.id (cohérent avec le backend)
  await loadDocuments();
});

defineExpose({ loadAppointment, loadDocuments, appointment, documents, documentsLoading });
</script>
