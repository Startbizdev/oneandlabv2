<template>
  <div class="mx-auto w-full min-w-0 max-w-6xl">
    <AppointmentDetailPage
      ref="detailRef"
      base-path="/patient"
      @appointment-loaded="onAppointmentLoaded"
    >
      <template #patientPortalFooter="{ appointment, kvRow, kvLabel }">
        <div v-if="appointment?.relative" :class="kvRow">
          <div :class="kvLabel">Pour qui</div>
          <div class="min-w-0 space-y-0.5">
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ relativePourQuiDisplayName(appointment.relative) }}
            </p>
            <p v-if="appointment.relative.relationship_type" class="text-xs text-muted">
              {{ relationshipLabelFr(appointment.relative.relationship_type) }}
            </p>
          </div>
        </div>
        <template v-if="appointment && !['canceled', 'cancelled'].includes(String(appointment.status || ''))">
          <div v-if="resultatsDocuments.length > 0" :class="kvRow">
            <div :class="kvLabel">Résultats</div>
            <div class="min-w-0">
              <UButton
                color="primary"
                variant="soft"
                size="sm"
                class="w-full sm:w-auto justify-center"
                icon="i-lucide-file-check"
                to="#resultats"
              >
                Voir les résultats
              </UButton>
            </div>
          </div>
          <div
            v-if="anyCompletedWithoutReview || anyCompletedWithReview"
            :class="kvRow"
          >
            <div :class="kvLabel">Avis</div>
            <div class="min-w-0 flex flex-wrap gap-2">
              <UButton
                v-if="anyCompletedWithoutReview"
                color="primary"
                size="sm"
                class="justify-center"
                icon="i-lucide-star"
                @click="scrollToAvisSection"
              >
                Laisser un avis
              </UButton>
              <UButton
                v-else-if="anyCompletedWithReview"
                variant="outline"
                color="neutral"
                size="sm"
                class="justify-center"
                icon="i-lucide-message-circle"
                @click="scrollToAvisSection"
              >
                Voir {{ isMultiBatch ? 'mes avis' : 'mon avis' }}
              </UButton>
            </div>
          </div>
          <div
            v-if="appointmentsToCancelForPatient.length > 0"
            :class="kvRow"
          >
            <div :class="kvLabel">Annulation</div>
            <div class="min-w-0">
              <UButton
                color="error"
                variant="outline"
                size="sm"
                class="w-full sm:w-auto justify-center"
                icon="i-lucide-x-circle"
                @click="showCancelModal = true"
              >
                {{
                  appointmentsToCancelForPatient.length > 1
                    ? 'Annuler les rendez-vous du lot'
                    : 'Annuler le rendez-vous'
                }}
              </UButton>
            </div>
          </div>
        </template>
      </template>

      <template #mainExtra="{ appointment }">
        <template v-if="appointment">
          <div
            v-if="activePreleveurAlerts.length > 0"
            class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 divide-y divide-gray-100 dark:divide-gray-800"
          >
            <div
              v-for="item in activePreleveurAlerts"
              :key="item.id"
              class="flex items-start gap-3 px-4 py-3 sm:px-6"
              :class="preleveurBannerClassFor(item.bannerPhase)"
            >
              <div class="relative shrink-0" aria-hidden="true">
                <span
                  class="absolute inset-0 rounded-full opacity-40 motion-safe:animate-ping"
                  :class="item.bannerPhase === 'arrive' ? 'bg-emerald-400' : 'bg-sky-400'"
                />
                <UserAvatar
                  :src="profileImageUrl(item.appt?.assigned_to_profile_image_url ?? null) ?? undefined"
                  :initial="(item.appt?.assigned_to_display_name || item.appt?.assigned_to_name || 'P').charAt(0).toUpperCase()"
                  alt="Préleveur"
                  size="md"
                  class="relative ring-2 ring-white dark:ring-gray-900"
                />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold leading-snug text-gray-900 dark:text-white">
                  {{ preleveurBannerTextFor(item.appt, item.bannerPhase) }}
                </p>
                <p class="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                  {{ preleveurBannerSubtitleFor(item.appt, item.bannerPhase) }}
                </p>
              </div>
            </div>
          </div>

          <div
            v-if="showCompletedHero"
            class="flex flex-col gap-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ completedHeroSentence }}
            </p>
            <div class="flex flex-col gap-2 sm:flex-row sm:shrink-0">
              <UButton
                v-if="anyCompletedWithoutReview"
                color="primary"
                size="sm"
                icon="i-lucide-star"
                class="justify-center"
                @click="scrollToAvisSection"
              >
                Laisser un avis
              </UButton>
              <UButton
                v-else-if="anyCompletedWithReview"
                variant="outline"
                color="neutral"
                size="sm"
                icon="i-lucide-message-circle"
                class="justify-center"
                @click="scrollToAvisSection"
              >
                Voir {{ isMultiBatch ? 'mes avis' : 'mon avis' }}
              </UButton>
            </div>
          </div>

          <section
            v-if="completedAppointmentsForAvis.length > 0"
            id="section-avis"
            class="scroll-mt-24 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50"
          >
            <div class="border-b border-gray-100 dark:border-gray-800 px-4 py-3 sm:px-6">
              <h2 class="text-[11px] font-semibold uppercase tracking-wide text-muted flex items-center gap-2">
                <UIcon name="i-lucide-star" class="w-4 h-4 text-amber-500" />
                {{ isMultiBatch ? 'Vos avis' : 'Votre avis' }}
              </h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{
                  anyCompletedWithReview && !anyCompletedWithoutReview
                    ? 'Récapitulatif de vos retours.'
                    : 'Évaluez chaque intervention : chaque détail compte pour nous.'
                }}
              </p>
            </div>

            <div class="divide-y divide-gray-100 dark:divide-gray-800">
              <div
                v-for="appt in completedAppointmentsForAvis"
                :key="'avis-' + appt.id"
                class="p-4 sm:p-6 space-y-5"
              >
                <p v-if="isMultiBatch" class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ appt.category_name || appt.form_data?.category_name || 'Soin' }}
                  <span class="text-gray-500 font-normal"> · {{ formatDateShort(appt.scheduled_at) }}</span>
                </p>

                <div
                  v-if="canLeaveReviewFor(appt) || reviewHasReviewed[String(appt.id)]"
                  class="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-4"
                >
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    À qui s’adresse cet avis
                  </p>
                  <div class="flex items-center gap-3">
                    <UserAvatar
                      v-if="reviewTargetKindFor(appt) === 'nurse'"
                      :src="profileImageUrl(appt?.assigned_nurse_profile_image_url ?? null) ?? undefined"
                      :initial="(appt.assigned_nurse_display_name || 'I').charAt(0).toUpperCase()"
                      :alt="reviewTargetNameFor(appt)"
                      size="lg"
                    />
                    <UserAvatar
                      v-else
                      :src="profileImageUrl(appt?.assigned_to_profile_image_url ?? null) ?? undefined"
                      :initial="(appt.assigned_to_display_name || appt.assigned_to_name || 'P').charAt(0).toUpperCase()"
                      :alt="reviewTargetNameFor(appt)"
                      size="lg"
                    />
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {{ reviewTargetNameFor(appt) }}
                      </p>
                      <span
                        class="inline-flex mt-1 items-center rounded-md px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-950/50 dark:text-primary-200"
                      >
                        {{ reviewTargetRoleLabelFor(appt) }}
                      </span>
                    </div>
                  </div>
                </div>

                <template v-if="canLeaveReviewFor(appt) && !reviewHasReviewed[String(appt.id)] && reviewForms[String(appt.id)]">
                  <UForm
                    :state="reviewForms[String(appt.id)]"
                    class="space-y-5"
                    @submit.prevent="submitReviewForAppt(appt)"
                  >
                    <div class="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/15 p-4">
                      <UFormField label="Note globale" :name="`rating-${appt.id}`" required>
                        <div class="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            v-for="star in 5"
                            :key="star"
                            type="button"
                            :aria-label="`Noter ${star} sur 5`"
                            class="p-1.5 rounded-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            @click="ensureReviewForm(String(appt.id)); reviewForms[String(appt.id)].rating = star"
                          >
                            <UIcon
                              :name="star <= (reviewForms[String(appt.id)]?.rating ?? 5) ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                              class="w-8 h-8 sm:w-9 sm:h-9 transition-colors"
                              :class="
                                star <= (reviewForms[String(appt.id)]?.rating ?? 5)
                                  ? 'text-amber-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              "
                            />
                          </button>
                          <span class="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums ml-1">
                            {{ reviewForms[String(appt.id)]?.rating ?? 5 }}/5
                          </span>
                        </div>
                      </UFormField>
                    </div>
                    <UFormField
                      label="Commentaire (optionnel)"
                      :name="`comment-${appt.id}`"
                      description="Précisez l’accueil, la ponctualité ou la qualité des soins."
                    >
                      <UTextarea
                        :model-value="reviewForms[String(appt.id)]?.comment ?? ''"
                        rows="4"
                        autoresize
                        placeholder="Ex. : professionnel à l’écoute, soin effectué avec douceur…"
                        class="w-full"
                        @update:model-value="
                          (v: string) => {
                            ensureReviewForm(String(appt.id));
                            reviewForms[String(appt.id)].comment = v;
                          }
                        "
                      />
                    </UFormField>
                    <UButton type="submit" color="primary" size="lg" block :loading="submittingReview" icon="i-lucide-send">
                      Publier mon avis
                    </UButton>
                  </UForm>
                </template>

                <div
                  v-else-if="reviewHasReviewed[String(appt.id)]"
                  class="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex gap-3 items-start"
                >
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                    <UIcon name="i-lucide-heart" class="w-5 h-5" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Merci pour votre avis</p>
                    <p class="text-sm text-emerald-800/90 dark:text-emerald-200/90 mt-0.5">
                      Votre retour a bien été enregistré et aide la communauté à choisir des professionnels de confiance.
                    </p>
                  </div>
                </div>

                <p v-else class="text-sm text-gray-500 dark:text-gray-400">
                  <template v-if="appt.type === 'blood_test'">
                    L’avis n’est pas disponible : aucun laboratoire n’est associé à ce rendez-vous.
                  </template>
                  <template v-else>
                    L’avis en ligne n’est pas disponible pour ce créneau (aucun intervenant identifié).
                  </template>
                </p>
              </div>
            </div>
          </section>
        </template>
      </template>

      <template #documentsCard="{ appointment, documents, documentsLoading, loadDocuments }">
        <div id="resultats" class="scroll-mt-24">
          <AppointmentDocumentsSection
            :documents="patientDocumentsFilter(documents)"
            :loading="documentsLoading"
            empty-description="Aucun document médical n'a été déposé pour ce rendez-vous."
            :show-upload-area="canPatientUploadDocuments(appointment)"
            :upload-types="patientUploadDocumentTypes"
            :can-replace="canPatientUploadDocuments(appointment)"
            :uploading-types="uploadingDocTypes"
            :downloading-ids="downloadingDocIds"
            :care-photo-appointment-id="appointment?.id ?? null"
            @download="downloadDocument"
            @upload="(docType, file) => { setAppointmentForUpload(appointment); uploadPatientDocument(file, docType); }"
            @care-photo-thread-updated="() => loadDocuments()"
          />
        </div>
      </template>
    </AppointmentDetailPage>

    <AlertModal
      v-model="showCancelModal"
      title="Confirmer l'annulation"
      :message="patientCancelModalBody"
      confirm-label="Oui, annuler"
      cancel-label="Retour"
      confirm-color="error"
      icon-type="error"
      :loading="canceling"
      @confirm="confirmCancelAppointment"
    >
      <template #content>
        <div v-if="appointment" class="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <template v-if="appointmentsToCancelForPatient.length > 1">
            <p>
              <span class="font-medium text-gray-900 dark:text-gray-200">{{ appointmentsToCancelForPatient.length }} rendez-vous</span>
              seront annulés (même réservation).
            </p>
          </template>
          <p>
            Date prévue : <span class="font-medium text-gray-900 dark:text-gray-200">{{ formatDate(appointment.scheduled_at) }}</span>
          </p>
        </div>
      </template>
    </AlertModal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, unref, watch } from 'vue';
import { apiFetch } from '~/utils/api';
import { MAX_UPLOAD_BYTES } from '~/constants/upload-limits';
import { canUploadMedicalDocumentsForAppointmentStatus } from '~/utils/appointment-documents-upload';
import { formatPatientUrgentCreneauShortFr } from '~/utils/patient-urgency-display';
import {
  getAppointmentFromDetailRef,
  getBatchAppointmentsSortedFromDetailRef,
  getDocumentsFromDetailRef,
} from '~/composables/useAppointmentDetailRef';

definePageMeta({
  layout: 'patient',
  middleware: ['auth', 'role'],
  role: 'patient',
});

const route = useRoute();
const toast = useAppToast();

function relationshipLabelFr(r: string) {
  const map: Record<string, string> = {
    child: 'Enfant',
    parent: 'Parent',
    spouse: 'Conjoint(e)',
    sibling: 'Frère/Sœur',
    grandparent: 'Grand-parent',
    grandchild: 'Petit-enfant',
    other: 'Autre',
  };
  return map[r] || r;
}

function relativePourQuiDisplayName(rel: any): string {
  if (!rel) return '';
  const fn = String(rel.first_name ?? '').trim();
  const ln = String(rel.last_name ?? '').trim();
  const full = [fn, ln].filter(Boolean).join(' ');
  return full || '—';
}

const detailRef = ref<{ loadAppointment: (m?: any, o?: { silent?: boolean }) => Promise<void>; loadDocuments?: () => Promise<void> } | null>(
  null,
);

const appointment = computed(() => getAppointmentFromDetailRef(detailRef));
const batchAppointmentsSorted = computed(() => getBatchAppointmentsSortedFromDetailRef(detailRef));

const documentsList = computed(() => getDocumentsFromDetailRef(detailRef));

const detailLoading = computed(() => unref((detailRef.value as any)?.loading ?? false));
const detailDocumentsLoading = computed(() => unref((detailRef.value as any)?.documentsLoading ?? false));

const resultatsDocuments = computed(() =>
  documentsList.value.filter((d: any) => d.document_type === 'resultats'),
);

const reviewHasReviewed = ref<Record<string, boolean>>({});
const submittingReview = ref(false);
const canceling = ref(false);
const showCancelModal = ref(false);

const reviewForms = reactive<Record<string, { rating: number; comment: string }>>({});

const preleveurBannerNow = ref(Date.now());
let preleveurBannerInterval: ReturnType<typeof setInterval> | null = null;

function patientDocumentsFilter(docs: unknown) {
  return (Array.isArray(docs) ? docs : []).filter((d: any) => d.document_type !== 'cancellation_photo');
}

/** Pièces joignables au RDV après réservation (aligné infirmier / pro ; pas de résultats lab ni photo annulation). */
const patientUploadDocumentTypes = [
  { value: 'carte_vitale', label: 'Carte Vitale', icon: 'i-lucide-credit-card', color: 'green' },
  { value: 'carte_mutuelle', label: 'Carte Mutuelle', icon: 'i-lucide-shield', color: 'blue' },
  { value: 'ordonnance', label: 'Ordonnance', icon: 'i-lucide-file-text', color: 'orange' },
  { value: 'autres_assurances', label: 'Autre prescription', icon: 'i-lucide-file-text', color: 'purple' },
  { value: 'other', label: 'Autre document', icon: 'i-lucide-file', color: 'gray' },
];

const uploadingDocTypes = ref(new Set<string>());
const currentAppointmentForUpload = ref<any>(null);

function canPatientUploadDocuments(apt: any) {
  return !!apt && canUploadMedicalDocumentsForAppointmentStatus(apt.status);
}

function setAppointmentForUpload(apt: any) {
  currentAppointmentForUpload.value = apt;
}

async function uploadPatientDocument(file: File, docType: string) {
  const appointment = currentAppointmentForUpload.value ?? getAppointmentFromDetailRef(detailRef);
  if (!appointment?.id) {
    toast.add({
      title: 'Erreur',
      description: 'Rendez-vous introuvable. Rechargez la page si le problème persiste.',
      color: 'red',
    });
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    toast.add({ title: 'Fichier trop volumineux', description: 'Le fichier dépasse 25 Mo.', color: 'red' });
    return;
  }
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowed.includes(file.type)) {
    toast.add({ title: 'Format non accepté', description: 'Formats acceptés : JPG, PNG, PDF.', color: 'red' });
    return;
  }
  uploadingDocTypes.value.add(docType);
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('appointment_id', String(appointment.id));
    formData.append('document_type', docType);
    const res = await apiFetch('/medical-documents', { method: 'POST', body: formData });
    if (res?.success) {
      toast.add({ title: 'Document ajouté', description: 'Votre fichier a bien été enregistré.', color: 'green' });
      await detailRef.value?.loadDocuments?.();
    } else {
      toast.add({ title: 'Erreur', description: (res as any)?.error || "Impossible d'envoyer le document.", color: 'red' });
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message || 'Une erreur est survenue.', color: 'red' });
  } finally {
    uploadingDocTypes.value.delete(docType);
  }
}

const isMultiBatch = computed(() => batchAppointmentsSorted.value.length > 1);

function patientCanCancelAppointmentStatus(status: unknown): boolean {
  return ['pending', 'confirmed', 'planned'].includes(String(status ?? ''));
}

/** Tous les créneaux du lot encore annulables par le patient. */
const appointmentsToCancelForPatient = computed(() =>
  batchAppointmentsSorted.value.filter((a: any) => patientCanCancelAppointmentStatus(a?.status)),
);

const patientCancelModalBody = computed(() => {
  const n = appointmentsToCancelForPatient.value.length;
  if (n > 1) {
    return `Êtes-vous sûr de vouloir annuler les ${n} rendez-vous de ce lot ? Cette action est définitive.`;
  }
  return "Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action est définitive.";
});

type PreleveurBannerPhase = 'hidden' | 'en_route' | 'arrive';

function parisDatePartsFromMs(ms: number): { ymd: string; minutes: number } | null {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return { ymd: `${year}-${month}-${day}`, minutes: hour * 60 + minute };
}

function appointmentParisYmd(appt: any): string {
  const raw = String(appt?.scheduled_at || '').trim();
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m?.[1]) return m[1];
  if (!raw) return '';
  const parts = parisDatePartsFromMs(new Date(raw).getTime());
  return parts?.ymd ?? '';
}

function parseAvailabilityRangeForSlot(availability: unknown): [number, number] | null {
  try {
    const avail = typeof availability === 'string' ? JSON.parse(availability) : availability;
    if (avail?.type === 'custom' && Array.isArray(avail.range) && avail.range.length >= 2) {
      const start = Number(avail.range[0]);
      const end = Number(avail.range[1]);
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        return [start * 60, end * 60];
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function appointmentFallbackSlotMinutes(appt: any): [number, number] | null {
  const raw = String(appt?.scheduled_at || '').trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const parts = parisDatePartsFromMs(d.getTime());
  if (!parts) return null;
  const start = parts.minutes;
  const duration = Number(appt?.duration_minutes || 60);
  return [start, start + Math.max(30, duration)];
}

function appointmentSlotMinutes(appt: any): [number, number] | null {
  return parseAvailabilityRangeForSlot(appt?.form_data?.availability) ?? appointmentFallbackSlotMinutes(appt);
}

function formatSlotMinute(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

function formatAvailability(availability: unknown) {
  try {
    const avail = typeof availability === 'string' ? JSON.parse(availability) : availability;
    const urgentLabel = formatPatientUrgentCreneauShortFr(avail);
    if (urgentLabel) return urgentLabel;
    if (avail?.type === 'all_day') return 'Toute la journée';
    if (avail?.type === 'custom' && avail?.range) return `${avail.range[0]}h – ${avail.range[1]}h`;
  } catch {
    // ignore
  }
  return typeof availability === 'string' ? availability : '';
}

function appointmentTimeLabel(appt: any): string {
  const availability = formatAvailability(appt?.form_data?.availability);
  if (availability) return availability;
  if (!appt?.scheduled_at) return 'Horaire à confirmer';
  try {
    return new Date(appt.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Horaire à confirmer';
  }
}

function preleveurSlotLabelFor(appt: any): string {
  const slot = appointmentSlotMinutes(appt);
  if (!slot) return appointmentTimeLabel(appt);
  return `${formatSlotMinute(slot[0])} - ${formatSlotMinute(slot[1])}`;
}

function computePreleveurPatientBannerPhase(appt: any, nowMs: number): PreleveurBannerPhase {
  if (!appt || appt.type !== 'blood_test') return 'hidden';
  if (['completed', 'canceled', 'cancelled', 'expired', 'refused'].includes(String(appt.status || ''))) return 'hidden';
  const name = (appt.assigned_to_display_name || appt.assigned_to_name || '').trim();
  if (!name) return 'hidden';
  const nowParis = parisDatePartsFromMs(nowMs);
  const appointmentYmd = appointmentParisYmd(appt);
  const slot = appointmentSlotMinutes(appt);
  if (!nowParis || !appointmentYmd || !slot) return 'hidden';
  if (nowParis.ymd !== appointmentYmd) return 'hidden';
  const enRouteStartsAt = Math.max(0, slot[0] - 30);
  if (nowParis.minutes < enRouteStartsAt) return 'hidden';
  if (nowParis.minutes < slot[0]) return 'en_route';
  return 'arrive';
}

const preleveurBannerPhaseById = computed(() => {
  const nowMs = preleveurBannerNow.value;
  const out: Record<string, PreleveurBannerPhase> = {};
  for (const appt of batchAppointmentsSorted.value) {
    if (appt?.id) out[String(appt.id)] = computePreleveurPatientBannerPhase(appt, nowMs);
  }
  return out;
});

function preleveurBannerClassFor(phase: PreleveurBannerPhase | undefined): string {
  if (phase === 'arrive') {
    return 'border-emerald-200/80 bg-emerald-50/90 dark:border-emerald-900/50 dark:bg-emerald-950/30';
  }
  return 'border-sky-200/80 bg-sky-50/90 dark:border-sky-900/50 dark:bg-sky-950/30';
}

function preleveurBannerTextFor(appt: any, phase: PreleveurBannerPhase | undefined) {
  if (phase === 'en_route') {
    const name = (appt?.assigned_to_display_name || appt?.assigned_to_name || '').trim();
    return name ? `${name} est en route vers votre domicile.` : 'Votre préleveur est en route vers votre domicile.';
  }
  if (phase === 'arrive') return 'Votre préleveur est arrivé sur le créneau prévu.';
  return '';
}

function preleveurBannerSubtitleFor(appt: any, phase: PreleveurBannerPhase | undefined): string {
  const slot = preleveurSlotLabelFor(appt);
  if (phase === 'en_route') return `Trajet lancé, arrivée prévue dans la fenêtre ${slot}.`;
  if (phase === 'arrive') return `Position confirmée, passage prévu dans la fenêtre ${slot}.`;
  return '';
}

const activePreleveurAlerts = computed(() => {
  const phases = preleveurBannerPhaseById.value;
  return batchAppointmentsSorted.value
    .map((appt: any) => ({
      id: String(appt.id),
      appt,
      bannerPhase: phases[String(appt.id)] ?? 'hidden',
    }))
    .filter((x) => x.bannerPhase && x.bannerPhase !== 'hidden');
});

const completedAppointmentsForAvis = computed(() =>
  batchAppointmentsSorted.value.filter((a: any) => a.status === 'completed'),
);

function reviewTargetNameFor(a: any): string {
  if (!a) return '';
  if (a.type === 'nursing') {
    return a.assigned_nurse_display_name || a.assigned_to_name || 'Infirmier(e)';
  }
  return a.assigned_lab_display_name || a.assigned_to_display_name || a.assigned_to_name || 'Professionnel';
}

function reviewTargetKindFor(a: any): 'nurse' | 'preleveur' | 'lab' {
  if (a?.type === 'nursing') return 'nurse';
  if (a?.assigned_to && a?.type === 'blood_test') return 'preleveur';
  return 'lab';
}

function reviewTargetRoleLabelFor(a: any): string {
  const k = reviewTargetKindFor(a);
  if (k === 'nurse') return 'Infirmier(e)';
  if (k === 'preleveur') return 'Préleveur';
  return 'Laboratoire';
}

function canLeaveReviewFor(a: any): boolean {
  if (!a || a.status !== 'completed') return false;
  if (a.type === 'nursing') return !!a.assigned_nurse_id;
  if (a.type === 'blood_test') return !!a.assigned_lab_id || !!a.assigned_to;
  return false;
}

function completedBySentenceFor(a: any): string {
  if (!a) return '';
  if (a.type === 'nursing') {
    const name = a.assigned_nurse_display_name;
    return name
      ? `Ce rendez-vous est terminé. Soins réalisés par ${name}.`
      : 'Ce rendez-vous est terminé.';
  }
  if (a.type === 'blood_test' && a.assigned_lab_display_name) {
    return `L’équipe du laboratoire a terminé ce rendez-vous (${a.assigned_lab_display_name}).`;
  }
  return 'Ce rendez-vous est terminé.';
}

const completedBySentence = computed(() => completedBySentenceFor(appointment.value));

const firstCompletedInBatch = computed(() => batchAppointmentsSorted.value.find((a: any) => a.status === 'completed'));

const completedHeroSentence = computed(() => {
  if (!isMultiBatch.value) return completedBySentence.value;
  const fc = firstCompletedInBatch.value;
  return fc ? completedBySentenceFor(fc) : '';
});

const showCompletedHero = computed(() => batchAppointmentsSorted.value.some((a: any) => a.status === 'completed'));

const anyCompletedWithoutReview = computed(() =>
  batchAppointmentsSorted.value.some(
    (a: any) => a.status === 'completed' && canLeaveReviewFor(a) && !reviewHasReviewed.value[String(a.id)],
  ),
);

const anyCompletedWithReview = computed(() =>
  batchAppointmentsSorted.value.some(
    (a: any) => a.status === 'completed' && canLeaveReviewFor(a) && reviewHasReviewed.value[String(a.id)],
  ),
);

const { profileImageUrl } = useProfileImageUrl();

const downloadingDoc = ref<string | null>(null);
const downloadingDocIds = computed(() => (downloadingDoc.value ? [downloadingDoc.value] : []));

function scrollToResultatsIfHash() {
  if (route.hash !== '#resultats') return;
  nextTick(() => {
    requestAnimationFrame(() => {
      document.getElementById('resultats')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function scrollToAvisIfHash() {
  if (route.hash !== '#avis') return;
  nextTick(() => {
    requestAnimationFrame(() => {
      document.getElementById('section-avis')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function scrollToAvisSection() {
  nextTick(() => {
    requestAnimationFrame(() => {
      document.getElementById('section-avis')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try {
        history.replaceState(null, '', `${route.path}#avis`);
      } catch {
        // ignore
      }
    });
  });
}

const APPOINTMENT_POLL_MS_ACTIVE = 6000;
const APPOINTMENT_POLL_MS_QUIET = 30_000;
let appointmentPollTimer: ReturnType<typeof setInterval> | null = null;
let silentAppointmentRefreshInFlight = false;

function currentAppointmentPollIntervalMs(): number {
  const list = batchAppointmentsSorted.value;
  if (!list.length) return APPOINTMENT_POLL_MS_QUIET;
  const terminal = new Set(['canceled', 'cancelled', 'completed', 'refused', 'expired']);
  const anyActive = list.some((a: any) => !terminal.has(String(a.status || '')));
  return anyActive ? APPOINTMENT_POLL_MS_ACTIVE : APPOINTMENT_POLL_MS_QUIET;
}

function stopAppointmentPolling() {
  if (appointmentPollTimer != null) {
    clearInterval(appointmentPollTimer);
    appointmentPollTimer = null;
  }
}

async function refreshAppointmentSilently() {
  if (silentAppointmentRefreshInFlight) return;
  silentAppointmentRefreshInFlight = true;
  try {
    await detailRef.value?.loadAppointment(undefined, { silent: true });
    await detailRef.value?.loadDocuments?.();
    await checkReviewsForBatch();
  } finally {
    silentAppointmentRefreshInFlight = false;
  }
}

function startAppointmentPolling() {
  stopAppointmentPolling();
  appointmentPollTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (canceling.value) return;
    void refreshAppointmentSilently();
  }, currentAppointmentPollIntervalMs());
}

function onAppointmentDetailVisibility() {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
  if (canceling.value) return;
  void refreshAppointmentSilently();
}

function onAppointmentDetailWindowFocus() {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
  if (canceling.value) return;
  void refreshAppointmentSilently();
}

async function onAppointmentLoaded() {
  await checkReviewsForBatch();
  await nextTick();
  scrollToResultatsIfHash();
  scrollToAvisIfHash();
}

onMounted(() => {
  startAppointmentPolling();
  preleveurBannerInterval = setInterval(() => {
    preleveurBannerNow.value = Date.now();
  }, 15000);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onAppointmentDetailVisibility);
    window.addEventListener('focus', onAppointmentDetailWindowFocus);
  }
});

onUnmounted(() => {
  stopAppointmentPolling();
  if (preleveurBannerInterval) {
    clearInterval(preleveurBannerInterval);
    preleveurBannerInterval = null;
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onAppointmentDetailVisibility);
    window.removeEventListener('focus', onAppointmentDetailWindowFocus);
  }
});

watch(
  () => batchAppointmentsSorted.value.map((a: any) => String(a?.status ?? '')).join(','),
  () => {
    if (typeof document === 'undefined') return;
    startAppointmentPolling();
  },
);

watch(() => route.hash, () => {
  scrollToResultatsIfHash();
  scrollToAvisIfHash();
});

watch(
  () =>
    [detailLoading.value, detailDocumentsLoading.value, resultatsDocuments.value.length, appointment.value?.status, route.hash] as const,
  () => {
    if (!detailLoading.value && !detailDocumentsLoading.value && route.hash === '#resultats') {
      scrollToResultatsIfHash();
    }
    if (!detailLoading.value && route.hash === '#avis' && showCompletedHero.value) {
      scrollToAvisIfHash();
    }
  },
);

function ensureReviewForm(apptId: string) {
  if (!reviewForms[apptId]) {
    reviewForms[apptId] = { rating: 5, comment: '' };
  }
}

async function checkReviewsForBatch() {
  reviewHasReviewed.value = {};
  const list = batchAppointmentsSorted.value;
  for (const appt of list) {
    if (appt.status !== 'completed' || !canLeaveReviewFor(appt)) continue;
    const id = String(appt.id);
    ensureReviewForm(id);
    try {
      const response = await apiFetch(`/reviews?appointment_id=${encodeURIComponent(id)}`, { method: 'GET' });
      reviewHasReviewed.value = {
        ...reviewHasReviewed.value,
        [id]: !!(response.success && response.data?.length > 0),
      };
    } catch {
      reviewHasReviewed.value = { ...reviewHasReviewed.value, [id]: false };
    }
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function formatDateShort(date: string) {
  return date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

/** Aligné backend/api/reviews/index.php (nurse | lab | subaccount selon les FK du RDV). */
function revieweePayloadForCompletedAppt(appt: any): { reviewee_id: string; reviewee_type: string } | null {
  if (!appt || appt.status !== 'completed') return null;
  if (appt.type === 'nursing') {
    const rid = appt.assigned_nurse_id;
    if (!rid) return null;
    return { reviewee_id: String(rid), reviewee_type: 'nurse' };
  }
  if (appt.type === 'blood_test') {
    if (appt.assigned_lab_id) {
      return { reviewee_id: String(appt.assigned_lab_id), reviewee_type: 'lab' };
    }
    if (appt.assigned_to) {
      return { reviewee_id: String(appt.assigned_to), reviewee_type: 'subaccount' };
    }
    return null;
  }
  return null;
}

async function submitReviewForAppt(appt: any) {
  const id = String(appt.id);
  ensureReviewForm(id);
  const form = reviewForms[id];
  const target = revieweePayloadForCompletedAppt(appt);
  if (!target) {
    toast.add({
      title: 'Avis indisponible',
      description:
        appt?.type === 'blood_test'
          ? 'Aucun laboratoire ni intervenant n’est associé à ce rendez-vous : l’avis ne peut pas être publié.'
          : 'Aucun professionnel n’est associé à ce rendez-vous : l’avis ne peut pas être publié.',
      color: 'red',
    });
    return;
  }
  submittingReview.value = true;
  const response = await apiFetch('/reviews', {
    method: 'POST',
    body: {
      appointment_id: appt.id,
      reviewee_id: target.reviewee_id,
      reviewee_type: target.reviewee_type,
      rating: form.rating,
      comment: form.comment,
    },
  });
  if (response.success) {
    reviewHasReviewed.value = { ...reviewHasReviewed.value, [id]: true };
    toast.add({ title: 'Avis envoyé', color: 'green' });
  } else {
    toast.add({ title: 'Erreur', description: response.error ?? 'Impossible d\'envoyer l\'avis', color: 'red' });
  }
  submittingReview.value = false;
}

async function confirmCancelAppointment() {
  const targets = appointmentsToCancelForPatient.value;
  if (!targets.length) return;
  canceling.value = true;
  let ok = 0;
  let lastErr = '';
  for (const apt of targets) {
    const id = apt?.id;
    if (!id) continue;
    try {
      const response = await apiFetch(`/appointments/${id}`, {
        method: 'PUT',
        body: { status: 'canceled', note: 'Annulé par le patient' },
      });
      if (response.success) ok++;
      else lastErr = String((response as any).error || '').trim() || lastErr;
    } catch (e: any) {
      lastErr = e?.message ? String(e.message) : lastErr;
    }
  }
  const total = targets.length;
  if (ok > 0) {
    showCancelModal.value = false;
  }
  if (ok === total) {
    toast.add(
      total > 1
        ? {
            title: 'Rendez-vous annulés',
            description: `${total} rendez-vous ont été annulés.`,
            color: 'green',
          }
        : {
            title: 'Rendez-vous annulé',
            color: 'green',
          },
    );
  } else if (ok > 0) {
    toast.add({
      title: 'Annulation partielle',
      description: lastErr || `${ok} sur ${total} rendez-vous annulés.`,
      color: 'warning',
    });
  } else {
    toast.add({
      title: 'Erreur',
      description: lastErr || "Impossible d'annuler.",
      color: 'red',
    });
  }
  await refreshAppointmentSilently();
  canceling.value = false;
}

async function downloadDocument(doc: { id: string; file_name?: string }) {
  downloadingDoc.value = doc.id;
  try {
    const merged = documentsList.value.find((d: any) => d.id === doc.id);
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase || 'http://localhost:8888/api';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : '';
    const response = await fetch(`${apiBase}/medical-documents/${doc.id}/download?id=${doc.id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || 'Erreur téléchargement');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cd = response.headers.get('content-disposition');
    let name = merged?.file_name || doc.file_name || 'document';
    if (cd) {
      const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
      if (m?.[1]) name = m[1].replace(/['"]/g, '');
    }
    a.download = name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.add({ title: 'Téléchargement réussi', color: 'green' });
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Impossible de télécharger', color: 'red' });
  } finally {
    downloadingDoc.value = null;
  }
}
</script>

