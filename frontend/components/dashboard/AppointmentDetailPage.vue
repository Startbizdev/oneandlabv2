<template>
  <div class="space-y-6 rdv-no-mobile-zoom">
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

    <div v-else class="space-y-6">
      <div class="mb-4 flex w-full min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        <UButton
          :to="backListPath"
          color="neutral"
          variant="outline"
          size="sm"
          leading-icon="i-lucide-arrow-left"
          class="w-fit shrink-0"
        >
          Retour à la liste
        </UButton>
        <div
          v-if="appointment && !batchIsMulti"
          class="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5"
        >
          <PatientUrgencyBadge :appointment="appointment" />
          <UBadge
            :color="appointmentDetailBadgeStatusColor(appointment.status)"
            variant="subtle"
            size="sm"
            :label="appointmentDetailBadgeStatusLabel(appointment.status)"
          />
          <UBadge
            :color="appointment.type === 'blood_test' ? 'error' : 'info'"
            variant="subtle"
            size="sm"
            :leading-icon="appointment.type === 'blood_test' ? 'i-lucide-syringe' : 'i-lucide-stethoscope'"
            :label="appointmentDetailBadgeTypeLabel(appointment.type)"
          />
        </div>
      </div>

      <div :class="['grid grid-cols-1 gap-6', hasRightColumn ? 'xl:grid-cols-3' : 'xl:grid-cols-1']">
        <div
          :class="[
            'order-2 space-y-6 xl:order-none',
            hasRightColumn ? 'xl:col-span-2' : 'xl:col-span-3',
          ]"
        >
        <!-- Une carte fusionnée (tableau unique) si lot multi-RDV ; sinon une carte par soin -->
        <template v-if="!batchIsMulti">
          <template v-for="(appt, batchIdx) in batchAppointmentsSorted" :key="appt.id">
            <AppointmentDetailRdvInfoCard
              :appt="appt"
              :categories-for-detail="categoriesForDetail"
              :is-admin="isAdmin"
              :show-cancellation-photo="showCancellationPhoto"
              :hide-map-actions="isPatientPortal"
              :hide-address-block="isPatientPortal"
              :hide-audit-dates="isPatientPortal"
            >
              <template v-if="batchIdx === 0 && !isPatientPortal" #infoExtras>
                <AppointmentDetailRdvPatientKvSection :appointment="appointment" :is-admin="isAdmin">
                  <template v-if="$slots.patientCardActions" #actions>
                    <slot name="patientCardActions" :appointment="appointment" />
                  </template>
                </AppointmentDetailRdvPatientKvSection>
              </template>
              <template v-if="batchIdx === 0 && isPatientPortal && $slots.patientPortalFooter" #footerExtras>
                <slot
                  name="patientPortalFooter"
                  :appointment="appointment"
                  :load-appointment="loadAppointment"
                  :kv-row="detailKvRow"
                  :kv-label="detailKvLabel"
                />
              </template>
              <template v-if="batchIdx === 0 && showAssignedProfessionalSection" #assignee>
                <AppointmentDetailRdvAssigneeOriginKvSection
                  :appointment="appointment"
                  :is-nursing-type="isNursingType"
                  :show-assigned-professional-section="showAssignedProfessionalSection"
                  :show-creator-origin="isPatientPortal"
                  :hide-nurse-assignee-if-self="viewerIsAssignedNurse"
                  :hide-lab-assignee-if-self="viewerIsAssignedLabEntity"
                  :hide-preleveur-assignee-if-self="viewerIsAssignedPreleveur"
                  :patient-platform-origin-display="patientPlatformOriginDisplay"
                  :creator-nurse-origin-compact="creatorNurseOriginCompact"
                  :creator-nurse-origin-compact-title="creatorNurseOriginCompactTitle"
                  :creator-lab-origin-compact="creatorLabOriginCompact"
                  :creator-pro-origin-compact="creatorProOriginCompact"
                  :viewer-is-creator="viewerIsCreator"
                  :open-assignee-sheet="openAssigneeSheet"
                  :open-creator-sheet="openCreatorSheet"
                />
              </template>
              <template v-if="batchIdx === 0 && showCreatorOrigin" #creatorOrigin>
                <AppointmentDetailRdvAssigneeOriginKvSection
                  :appointment="appointment"
                  :is-nursing-type="isNursingType"
                  :show-assigned-professional-section="false"
                  :show-creator-origin="showCreatorOrigin"
                  :hide-nurse-assignee-if-self="viewerIsAssignedNurse"
                  :hide-lab-assignee-if-self="viewerIsAssignedLabEntity"
                  :hide-preleveur-assignee-if-self="viewerIsAssignedPreleveur"
                  :patient-platform-origin-display="patientPlatformOriginDisplay"
                  :creator-nurse-origin-compact="creatorNurseOriginCompact"
                  :creator-nurse-origin-compact-title="creatorNurseOriginCompactTitle"
                  :creator-lab-origin-compact="creatorLabOriginCompact"
                  :creator-pro-origin-compact="creatorProOriginCompact"
                  :viewer-is-creator="viewerIsCreator"
                  :open-assignee-sheet="openAssigneeSheet"
                  :open-creator-sheet="openCreatorSheet"
                />
              </template>
            </AppointmentDetailRdvInfoCard>
          </template>
        </template>

        <UCard
          v-else
          class="overflow-hidden"
          :ui="{ body: 'p-0 sm:p-0' }"
        >
          <div class="space-y-4">
            <div class="divide-y divide-default">
              <AppointmentDetailRdvPatientKvSection v-if="!isPatientPortal" :appointment="appointment" :is-admin="isAdmin">
                <template v-if="$slots.patientCardActions" #actions>
                  <slot name="patientCardActions" :appointment="appointment" />
                </template>
              </AppointmentDetailRdvPatientKvSection>
              <AppointmentDetailRdvFieldRows
                v-if="!isPatientPortal && (appointment.form_data || appointment.relative)"
                :appt="appointment"
                :categories-for-detail="categoriesForDetail"
                :is-admin="isAdmin"
                variant="address-only"
              />
              <template v-for="(appt, batchIdx) in batchAppointmentsSorted" :key="'merged-' + appt.id">
                <div :class="detailKvRow">
                  <div :class="detailKvLabel">
                    {{
                      mergedHomogeneousBloodBatch
                        ? `Prélèvement #${batchIdx + 1}`
                        : mergedHomogeneousNursingBatch
                          ? `Soins prévus #${batchIdx + 1}`
                          : `Rendez-vous #${batchIdx + 1}`
                    }}
                  </div>
                  <div class="flex min-w-0 flex-wrap items-center justify-start gap-1.5">
                    <PatientUrgencyBadge :appointment="appt" />
                    <UBadge
                      :color="appointmentDetailBadgeStatusColor(appt.status)"
                      variant="subtle"
                      size="sm"
                      :label="appointmentDetailBadgeStatusLabel(appt.status)"
                    />
                    <UBadge
                      :color="appt.type === 'blood_test' ? 'error' : 'info'"
                      variant="subtle"
                      size="sm"
                      :leading-icon="appt.type === 'blood_test' ? 'i-lucide-syringe' : 'i-lucide-stethoscope'"
                      :label="appointmentDetailBadgeTypeLabel(appt.type)"
                    />
                  </div>
                </div>
                <div
                  v-if="isAppointmentStatusCanceled(appt.status)"
                  class="bg-neutral-50/95 px-4 py-3 sm:px-6 dark:bg-neutral-900/40"
                  role="status"
                >
                  <div class="flex items-center gap-3">
                    <UIcon
                      name="i-lucide-calendar-x"
                      class="size-5 shrink-0 text-neutral-500 dark:text-neutral-400"
                      aria-hidden="true"
                    />
                    <div class="min-w-0 space-y-1">
                      <p class="text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
                        Ce rendez-vous a été annulé.
                      </p>
                      <p v-if="cancellationMotifLineForAppt(appt)" class="text-xs leading-relaxed text-muted">
                        {{ cancellationMotifLineForAppt(appt) }}
                      </p>
                    </div>
                  </div>
                </div>
                <AppointmentDetailRdvFieldRows
                  :appt="appt"
                  :categories-for-detail="categoriesForDetail"
                  :is-admin="isAdmin"
                  :hide-map-actions="isPatientPortal"
                  variant="details-only"
                />
              </template>
              <AppointmentDetailRdvAssigneeOriginKvSection
                :appointment="appointment"
                :is-nursing-type="isNursingType"
                :show-assigned-professional-section="showAssignedProfessionalSection"
                :show-creator-origin="showCreatorOrigin"
                :hide-nurse-assignee-if-self="viewerIsAssignedNurse"
                :hide-lab-assignee-if-self="viewerIsAssignedLabEntity"
                :hide-preleveur-assignee-if-self="viewerIsAssignedPreleveur"
                :patient-platform-origin-display="patientPlatformOriginDisplay"
                :creator-nurse-origin-compact="creatorNurseOriginCompact"
                :creator-nurse-origin-compact-title="creatorNurseOriginCompactTitle"
                :creator-lab-origin-compact="creatorLabOriginCompact"
                :creator-pro-origin-compact="creatorProOriginCompact"
                :viewer-is-creator="viewerIsCreator"
                :open-assignee-sheet="openAssigneeSheet"
                :open-creator-sheet="openCreatorSheet"
              />
              <div
                v-if="appointment.created_at && !isPatientPortal"
                :class="detailKvRow"
              >
                <div :class="detailKvLabel">Créé le</div>
                <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">
                  {{ formatDate(appointment.created_at) }}
                </p>
              </div>
              <div
                v-if="isAdmin && appointment.updated_at"
                :class="detailKvRow"
              >
                <div :class="detailKvLabel">Modifié le</div>
                <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">
                  {{ formatDate(appointment.updated_at) }}
                </p>
              </div>
              <slot
                v-if="isPatientPortal && $slots.patientPortalFooter"
                name="patientPortalFooter"
                :appointment="appointment"
                :load-appointment="loadAppointment"
                :kv-row="detailKvRow"
                :kv-label="detailKvLabel"
              />
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

        <!-- Créer une ordonnance (slot pro/nurse) -->
        <slot
          v-if="$slots.prescriptionSection"
          name="prescriptionSection"
          :appointment="appointment"
          :documents="documents"
          :load-documents="loadDocuments"
        />

        <!-- Contenu extra colonne principale (ex: historique statuts admin) -->
        <slot v-if="$slots.mainExtra" name="mainExtra" :appointment="appointment" :load-appointment="loadAppointment" />

        <!-- Photos de soins (slot pro/nurse ; la carte est portée par le composant enfant) -->
        <RdvDocumentsEmbeddedProvide v-if="$slots.carePhotosCard">
          <slot
            name="carePhotosCard"
            :appointment="appointment"
            :documents="documents"
            :documents-loading="documentsLoading"
            :load-documents="loadDocuments"
          />
        </RdvDocumentsEmbeddedProvide>

        <!-- Documents : même chrome et liste type tableau que le bloc informations RDV -->
        <UCard
          v-if="$slots.documentsCard"
          class="overflow-hidden"
          :ui="{ body: 'p-0 sm:p-0' }"
        >
          <RdvDocumentsEmbeddedProvide>
            <slot
              name="documentsCard"
              :appointment="appointment"
              :documents="documents"
              :documents-loading="documentsLoading"
              :load-documents="loadDocuments"
            />
          </RdvDocumentsEmbeddedProvide>
        </UCard>
      </div>

      <!-- Colonne de droite (masquée si pas d’Actions ni d’assignation — ex. portail patient). -->
      <div v-if="hasRightColumn" class="order-1 space-y-6 xl:order-none xl:col-span-1">
        <UCard
          v-if="slots.sidebarActions && showSidebarActionsCard"
          class="overflow-hidden"
          :ui="{ body: 'p-4 sm:p-4' }"
        >
          <slot name="sidebarActions" :appointment="appointment" :load-appointment="loadAppointment" />
        </UCard>
        <!-- Section Assignation (colonne de droite, pas dans la carte Actions) -->
        <slot
          v-if="$slots.assignationSection"
          name="assignationSection"
          :appointment="appointment"
          :load-appointment="loadAppointment"
          :batch-appointment-ids="batchAppointmentIds"
          :batch-is-multi="batchIsMulti"
        />
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue';
import { apiFetch } from '~/utils/api';
import { CANCELLATION_REASONS } from '~/config/cancellation-reasons';
import { canViewCancellationPhoto } from '~/utils/appointment-cancellation';

const props = withDefaults(
  defineProps<{
    basePath: string;
    /** false = pas de carte « Actions » (évite un cadre vide quand le slot ne rend rien). */
    showSidebarActionsCard?: boolean;
  }>(),
  { showSidebarActionsCard: true },
);
const emit = defineEmits<{ (e: 'appointment-loaded', appointment: any): void }>();
const slots = useSlots();
const route = useRoute();
const router = useRouter();

const isPatientPortal = computed(() => props.basePath === '/patient');
/** Colonne droite : Actions et/ou assignation (toute la colonne masquée si aucun des deux). */
const hasRightColumn = computed(
  () =>
    !!slots.assignationSection ||
    (!!slots.sidebarActions && props.showSidebarActionsCard !== false),
);

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

const backListPath = computed(() =>
  props.basePath === '/patient' ? '/patient' : `${props.basePath}/appointments`,
);

/** Grille libellé / valeur (alignée sur la liste fiche RDV). */
const detailKvRow =
  'grid grid-cols-1 gap-x-4 gap-y-1 px-4 py-3 sm:px-6 sm:grid-cols-[minmax(9.5rem,11rem)_minmax(0,1fr)] sm:items-start sm:py-2.5';
const detailKvRowCenter =
  'grid grid-cols-1 gap-x-4 gap-y-1 px-4 py-3 sm:px-6 sm:grid-cols-[minmax(9.5rem,11rem)_minmax(0,1fr)] sm:items-center sm:py-2.5';
const detailKvLabel = 'text-[11px] font-semibold uppercase tracking-wide text-muted shrink-0 pt-0.5';
const detailKvLabelTight = 'text-[11px] font-semibold uppercase tracking-wide text-muted shrink-0';

/** Badges statut / type : barre au-dessus de la grille (à droite du bouton Retour). */
function appointmentDetailBadgeStatusColor(
  status: string,
): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' {
  const map: Record<string, 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'info',
    planned: 'info',
    inProgress: 'primary',
    completed: 'success',
    canceled: 'error',
    cancelled: 'error',
    refused: 'error',
    expired: 'neutral',
  };
  return map[status] || 'neutral';
}

function appointmentDetailBadgeStatusLabel(s: string) {
  const map: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    planned: 'Planifié',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    cancelled: 'Annulé',
    refused: 'Refusé',
    expired: 'Expiré',
  };
  return map[s] || s;
}

function appointmentDetailBadgeTypeLabel(t: string) {
  return t === 'blood_test' ? 'Prélèvement' : 'Soins infirmiers';
}

const showCancellationPhoto = computed(() => canViewCancellationPhoto(user.value?.role));

const isAdmin = computed(() => user.value?.role === 'super_admin');

const showCreatorOrigin = computed(() =>
  ['super_admin', 'nurse', 'lab', 'subaccount', 'preleveur', 'pro'].includes(user.value?.role ?? ''),
);

/** Plateforme patient : sans préfixe « Patient » ; marque Cary affichée en « Cary ». */
const patientPlatformOriginDisplay = computed(() => {
  const l = appointment.value?.creator_origin?.label;
  const s = String(l ?? '')
    .trim()
    .replace(/^patient\s+/i, '')
    .trim();
  const compact = s.replace(/\s+/g, '').toLowerCase();
  if (!compact || compact === 'cary' || compact === 'oneandlab') return 'Cary';
  return s;
});

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

function isAppointmentStatusCanceled(status: unknown): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'canceled' || s === 'cancelled';
}

function cancellationMotifLineForAppt(appt: any): string {
  const code = appt?.cancellation_reason;
  if (!code || typeof code !== 'string') return '';
  const label = CANCELLATION_REASONS[code] || code;
  return `Motif : ${label}`;
}

const appointment = ref<any>(null);

/** Infirmier / labo / préleveur assigné = utilisateur connecté : masquer la ligne redondante. */
const viewerIsAssignedNurse = computed(() => {
  const a = appointment.value;
  const u = user.value;
  if (!a?.assigned_nurse_id || !u?.id) return false;
  return String(u.id) === String(a.assigned_nurse_id);
});

const viewerIsAssignedLabEntity = computed(() => {
  const a = appointment.value;
  const u = user.value;
  if (!a?.assigned_lab_id || !u?.id) return false;
  return String(u.id) === String(a.assigned_lab_id);
});

const viewerIsAssignedPreleveur = computed(() => {
  const a = appointment.value;
  const u = user.value;
  if (!a?.assigned_to || !u?.id) return false;
  return String(u.id) === String(a.assigned_to);
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
  const o = a.creator_origin;
  if (
    isPatientPortal.value &&
    o?.kind &&
    ['nurse', 'pro', 'lab_team', 'patient_platform'].includes(String(o.kind))
  ) {
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
    return 'Créé par vous-même';
  }
  return 'Ce rendez-vous a été saisi par le même infirmier qui l’a accepté.';
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

/** Lot multi-soins : une seule carte tableau partagée (sinon une carte par RDV). */
const batchIsMulti = computed(() => batchAppointmentsSorted.value.length > 1);

/** Lot tout prélèvement : titres uniformes (#) patient + pro/admin/nurse/lab. */
const mergedHomogeneousBloodBatch = computed(
  () =>
    batchIsMulti.value &&
    batchAppointmentsSorted.value.length > 0 &&
    batchAppointmentsSorted.value.every((a: any) => a.type === 'blood_test'),
);

/** Lot tout soins infirmiers : titres uniformes (#) tous espaces. */
const mergedHomogeneousNursingBatch = computed(
  () =>
    batchIsMulti.value &&
    batchAppointmentsSorted.value.length > 0 &&
    batchAppointmentsSorted.value.every((a: any) => a.type === 'nursing' || a.type === 'nurse'),
);

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

/**
 * Recharge le RDV.
 * - `merge` : mise à jour locale (réassignation) sans refetch.
 * - `options.silent` : pas de spinner ni toasts (ex. polling).
 */
let appointmentLoadGeneration = 0;

const loadAppointment = async (
  merge?: Partial<{ assigned_lab_id: string; assigned_to: string | null; assigned_nurse_id: string | null }>,
  options?: { silent?: boolean },
) => {
  const silent = !!options?.silent;
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
  if (!silent) loading.value = true;
  const gen = ++appointmentLoadGeneration;
  try {
    const response = await apiFetch(appointmentGetUrl(String(route.params.id)), { method: 'GET' });
    if (response.success && response.alreadyAccepted) {
      const dest =
        props.basePath === '/patient'
          ? `${props.basePath}?alreadyAccepted=1`
          : `${props.basePath}/appointments?alreadyAccepted=1`;
      await navigateTo(dest);
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
        if (gen !== appointmentLoadGeneration) {
          return;
        }
        batchSiblingsFull.value = full.filter(Boolean) as any[];
      } else if (gen === appointmentLoadGeneration) {
        batchSiblingsFull.value = [];
      }
    } else if (!silent) {
      toast.add({ title: 'Erreur', description: response.error || 'Impossible de charger le rendez-vous', color: 'error' });
    }
  } catch (error: any) {
    if (!silent) {
      toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' });
    }
  } finally {
    if (!silent) loading.value = false;
  }
};

/** Libellé court pour badge ordonnance / document (homogène avec la fiche). */
function formatBatchRdvLabel(apt: any, index: number): string {
  const n = index + 1;
  if (apt?.type === 'blood_test') {
    return `Prélèvement #${n}`;
  }
  const cat = apt?.category_name || 'Soin';
  return `Soins prévus #${n} · ${cat}`;
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
      merged.sort((a, b) => {
        const t = String(a.document_type || '').localeCompare(String(b.document_type || ''));
        if (t !== 0) return t;
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
      });
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
        } else if (dt === 'care_photo') {
          merged.push({
            ...doc,
            _batchRdvLabel: sortedApts.length > 1 ? ordoLabel : undefined,
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
      if (ta === 'ordonnance' || ta === 'care_photo') {
        const o = ((a as any)._batchOrd ?? 0) - ((b as any)._batchOrd ?? 0);
        if (o !== 0) return o;
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
      }
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

onMounted(async () => {
  await loadAppointment();
  // Recharger les documents une fois le RDV chargé pour utiliser appointment.id (cohérent avec le backend)
  await loadDocuments();
});

watch(
  () => route.params.id,
  async (newId, oldId) => {
    const n = newId != null ? String(newId) : '';
    const o = oldId != null ? String(oldId) : '';
    if (!n || n === o) return;
    batchSiblingsFull.value = [];
    await loadAppointment();
    await loadDocuments();
  },
);

/** Notification galerie : scroll vers la carte « Photos de soins » (rdv-care-photo-* ou rdv-doc-*). */
watch(
  () => ({
    q: route.query.careGallery,
    carePhoto: route.query.carePhoto,
    careIds: documents.value
      .filter((d) => d.document_type === 'care_photo')
      .map((d) => String((d as { id?: string }).id || ''))
      .join(','),
    docLoading: documentsLoading.value,
    aptLoading: loading.value,
  }),
  async ({ q, carePhoto, careIds, docLoading, aptLoading }) => {
    if (q !== '1' && q !== 'true') return;
    if (aptLoading || docLoading) return;
    const list = careIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) return;

    const fromQuery =
      typeof carePhoto === 'string'
        ? carePhoto.trim()
        : Array.isArray(carePhoto)
          ? String(carePhoto[0] || '').trim()
          : '';
    const targetId =
      fromQuery && list.includes(fromQuery) ? fromQuery : list[0];

    await nextTick();
    const byCare =
      document.getElementById(`rdv-care-photo-${targetId}`) ||
      document.getElementById('rdv-care-photos-section');
    const byDoc = document.getElementById(`rdv-doc-${targetId}`);
    (byCare || byDoc)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const rest = { ...route.query } as Record<string, unknown>;
    delete rest.careGallery;
    delete rest.carePhoto;
    void router.replace({ path: route.path, query: rest as Record<string, string | string[] | undefined> });
  },
);

defineExpose({ loadAppointment, loadDocuments, appointment, documents, documentsLoading, loading, batchAppointmentsSorted });
</script>
