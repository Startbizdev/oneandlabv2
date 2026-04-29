<template>
  <AppointmentDetailPage
    ref="detailRef"
    base-path="/nurse"
  >
    <template #sidebarActions="{ appointment, loadAppointment }">
      <div class="flex flex-col">
        <UEmpty
          v-if="appointment.status === 'canceled'"
          icon="i-lucide-calendar-x"
          title="Rendez-vous annulé"
          description="Ce rendez-vous a été annulé. Aucune action disponible."
          variant="naked"
          size="md"
        />
        <div
          v-else
          class="flex flex-col divide-y divide-gray-100 dark:divide-gray-800"
        >
          <div
            v-if="['confirmed', 'inProgress'].includes(appointment.status)"
            class="space-y-2 pb-3"
          >
            <UButton
              v-if="appointment.status === 'confirmed'"
              color="primary"
              variant="solid"
              size="lg"
              leading-icon="i-lucide-play"
              :loading="processing"
              :loading-auto="false"
              block
              :on-click="() => startAppointment(appointment, loadAppointment)"
            >
              Commencer le soin
            </UButton>
            <p
              v-if="['confirmed', 'inProgress'].includes(appointment.status)"
              class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5 border border-gray-100 dark:border-gray-700/80"
            >
              Le rendez-vous passera automatiquement en « terminé » le jour suivant la date prévue (clôture système).
            </p>
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              size="lg"
              leading-icon="i-lucide-calendar-plus"
              block
              :on-click="() => openRescheduleModal(appointment)"
            >
              Reprendre le RDV
            </UButton>
          </div>

          <div
            v-if="appointment.status !== 'canceled' && (appointment.relative?.phone || appointment.form_data?.phone || appointment.address)"
            class="space-y-2 py-3"
          >
            <div
              class="grid gap-2 justify-items-stretch"
              :class="contactGridClass(appointment)"
            >
              <UButton
                v-if="appointment.relative?.phone || appointment.form_data?.phone"
                type="button"
                color="neutral"
                variant="soft"
                size="lg"
                leading-icon="i-lucide-phone"
                class="min-w-0 w-full justify-center"
                :on-click="() => callPatient(appointment)"
              >
                Appeler
              </UButton>
              <UButton
                v-if="appointment.relative?.phone || appointment.form_data?.phone"
                type="button"
                color="neutral"
                variant="soft"
                size="lg"
                leading-icon="i-lucide-message-square"
                class="min-w-0 w-full justify-center"
                :on-click="() => sendSMS(appointment)"
              >
                SMS
              </UButton>
              <UButton
                v-if="appointment.address"
                type="button"
                color="neutral"
                variant="soft"
                size="lg"
                leading-icon="i-lucide-navigation"
                class="min-w-0 w-full justify-center"
                :on-click="() => openInWaze(appointment)"
              >
                Waze
              </UButton>
            </div>
          </div>

          <div
            v-if="appointment.type === 'nursing' && appointment.status !== 'completed'"
            class="py-3"
          >
            <NurseRdvSharePanel
              :appointment-id="String(appointment.id)"
              @released="() => loadAppointment()"
            />
          </div>

          <div
            v-if="appointment.status === 'confirmed'"
            class="space-y-2 pt-3"
          >
            <UButton
              color="error"
              variant="solid"
              size="lg"
              leading-icon="i-lucide-x-circle"
              :loading="processing"
              :loading-auto="false"
              block
              class="justify-center"
              :on-click="() => openCancelModal(appointment, loadAppointment)"
            >
              Annuler le rendez-vous
            </UButton>
            <UButton
              color="primary"
              variant="solid"
              size="lg"
              leading-icon="i-lucide-refresh-ccw"
              :loading="processing"
              :loading-auto="false"
              block
              class="justify-center"
              :on-click="() => openRedispatchModal(appointment, loadAppointment)"
            >
              Redispatcher
            </UButton>
          </div>
        </div>
      </div>
    </template>

    <template #documentsCard="{ appointment, documents, documentsLoading, loadDocuments }">
      <AppointmentDocumentsSection
        :documents="documents || []"
        :loading="documentsLoading"
        empty-description="Aucun document médical n'a été uploadé pour ce rendez-vous."
        :show-upload-area="canUploadDocuments(appointment)"
        :upload-types="uploadDocumentTypes"
        :show-resultats="false"
        :merge-resultats-into-documents-list="appointment?.type === 'blood_test'"
        :can-replace="canUploadDocuments(appointment)"
        :downloading-ids="downloadingDocuments"
        :uploading-types="uploadingTypes"
        @download="downloadDocument"
        @upload="(docType, file) => { setAppointmentForUpload(appointment); uploadDocumentFile(file, docType); }"
      />
    </template>

    <template #careGallery="{ appointment }">
      <CarePhotoGallerySection v-if="appointment" :appointment="appointment" role="nurse" />
    </template>

  </AppointmentDetailPage>

  <CancelAppointmentModal
    v-model:open="showCancelModal"
    :loading="processing"
    @confirm="onConfirmCancel"
  />
  <RescheduleAppointmentModal
    v-model="showRescheduleModal"
    :appointment="rescheduleAppointment"
    @done="onRescheduleDone"
  />
  <RedispatchAppointmentModal
    v-model:open="showRedispatchModal"
    :loading="processing"
    :care-lines="redispatchCareLines"
    @confirm="onConfirmRedispatch"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

import { nextTick, onMounted, watch } from 'vue';
import { apiFetch } from '~/utils/api';
import { MAX_UPLOAD_BYTES } from '~/constants/upload-limits';
import { isPendingIncomingOffer } from '~/utils/appointment-offer';
import { formatAppointmentWhenForSms } from '~/utils/appointment-datetime-fr';
import { getAppointmentFromDetailRef } from '~/composables/useAppointmentDetailRef';

const toast = useAppToast();
const { user } = useAuth();
const route = useRoute();
const detailRef = ref<{ loadAppointment: () => Promise<void>; loadDocuments: () => Promise<void>; appointment: { value: any } } | null>(null);

const shareTokenQuery = computed(() => {
  const q = route.query.shareToken ?? route.query.token;
  const v = Array.isArray(q) ? q[0] : q;
  return typeof v === 'string' && v.length > 0 ? v : '';
});

/** Lien WhatsApp : pas d’accès à la fiche détail tant que le RDV n’est pas accepté → liste + modal. */
const shareLinkDetailRedirected = ref(false);
watch(
  () => ({
    apt: getAppointmentFromDetailRef(detailRef),
    tok: shareTokenQuery.value,
    uid: user.value?.id,
  }),
  ({ apt, tok, uid }) => {
    if (!tok || !apt || shareLinkDetailRedirected.value) return;
    if (apt.type !== 'nursing' || apt.status !== 'pending') return;
    const an =
      apt.assigned_nurse_id != null && apt.assigned_nurse_id !== '' ? String(apt.assigned_nurse_id) : '';
    const my = uid != null && uid !== '' ? String(uid) : '';
    if (an && my && an === my) return;
    if (an && my && an !== my) return;
    shareLinkDetailRedirected.value = true;
    navigateTo({
      path: '/nurse/demandes',
      query: {
        shareToken: tok,
        openAppointment: String(apt.id),
      },
      replace: true,
    });
  },
  { deep: true },
);

// Rediriger vers la liste + popup pour les offres zone — pas si lien partage (confrère hors zone)
watch(
  () => getAppointmentFromDetailRef(detailRef),
  (app) => {
    if (shareTokenQuery.value) return;
    if (app && isPendingIncomingOffer(app, user.value?.id)) {
      navigateTo(`/nurse/appointments?openAppointment=${app.id}`);
    }
  },
  { immediate: true },
);

function contactGridClass(apt: any) {
  const hasPhone = !!(apt.relative?.phone || apt.form_data?.phone);
  const hasAddr = !!apt.address;
  const n = (hasPhone ? 2 : 0) + (hasAddr ? 1 : 0);
  if (n <= 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-2';
  return 'grid-cols-3';
}

const processing = ref(false);
const showCancelModal = ref(false);
const currentAppointmentForCancel = ref<any>(null);
const currentLoadAppointmentForCancel = ref<(() => Promise<void>) | null>(null);
const currentAppointmentForUpload = ref<any>(null);
const showRescheduleModal = ref(false);
const rescheduleAppointment = ref<any>(null);
const showRedispatchModal = ref(false);
const currentAppointmentForRedispatch = ref<any>(null);

function formatRedispatchDateShort(iso: string | null | undefined) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(iso);
  }
}

const redispatchCareLines = computed((): { label: string; sub: string }[] => {
  const apt = currentAppointmentForRedispatch.value;
  if (!apt) return [];
  const labelOf = (a: any) => a?.category_name || a?.form_data?.category_name || 'Soin';
  const rows: { label: string; sub: string }[] = [{ label: labelOf(apt), sub: formatRedispatchDateShort(apt.scheduled_at) }];
  const sibs = [...(apt.batch_siblings || [])].sort((a: any, b: any) =>
    String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || '')),
  );
  for (const s of sibs) {
    rows.push({ label: s.category_name || 'Soin', sub: formatRedispatchDateShort(s.scheduled_at) });
  }
  return rows;
});

function setAppointmentForUpload(apt: any) {
  currentAppointmentForUpload.value = apt;
}

function openCancelModal(apt: any, loadAppointment: () => Promise<void>) {
  currentAppointmentForCancel.value = apt;
  currentLoadAppointmentForCancel.value = loadAppointment;
  showCancelModal.value = true;
}

function openRescheduleModal(apt: any) {
  rescheduleAppointment.value = apt ?? null;
  showRescheduleModal.value = true;
}

function onRescheduleDone(newAppointmentId?: string) {
  rescheduleAppointment.value = null;
  if (newAppointmentId) {
    navigateTo(`/nurse/appointments/${newAppointmentId}`);
  } else {
    detailRef.value?.loadAppointment();
  }
}
const downloadingDocuments = ref(new Set<string>());
const uploadingTypes = ref(new Set<string>());
const draggedOver = ref<string | null>(null);
const fileInputs = ref<Record<string, HTMLInputElement>>({});

function setFileInput(docType: string, el: any) {
  if (el) fileInputs.value[docType] = el as HTMLInputElement;
}

const uploadDocumentTypes = [
  { value: 'carte_vitale', label: 'Carte Vitale', icon: 'i-lucide-credit-card', color: 'green' },
  { value: 'carte_mutuelle', label: 'Carte Mutuelle', icon: 'i-lucide-shield', color: 'blue' },
  { value: 'ordonnance', label: 'Ordonnance', icon: 'i-lucide-file-text', color: 'orange' },
  { value: 'autres_assurances', label: 'Autre prescription', icon: 'i-lucide-file-text', color: 'purple' },
  { value: 'other', label: 'Autre document', icon: 'i-lucide-file', color: 'gray' },
];

function canUploadDocuments(appointment: any) {
  return appointment && ['confirmed', 'inProgress'].includes(appointment.status);
}

function getDocumentsByType(documents: any[], docType: string) {
  if (!documents) return [];
  return documents.filter((doc: any) => doc.document_type === docType);
}

function getOtherDocuments(documents: any[]) {
  if (!documents) return [];
  const knownTypes = uploadDocumentTypes.map((t) => t.value);
  return documents.filter((doc: any) => !doc.document_type || !knownTypes.includes(doc.document_type));
}

function triggerFileInput(docType: string) {
  fileInputs.value[docType]?.click();
}

function handleDragOver(docType: string) {
  draggedOver.value = docType;
}

function handleDragLeave(docType: string) {
  if (draggedOver.value === docType) draggedOver.value = null;
}

async function handleDrop(event: DragEvent, docType: string) {
  draggedOver.value = null;
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  await uploadDocumentFile(files[0], docType);
}

async function handleFileSelectForType(event: Event, docType: string) {
  const target = event.target as HTMLInputElement;
  if (target.files?.length) {
    await uploadDocumentFile(target.files[0], docType);
    target.value = '';
  }
}

async function uploadDocumentFile(file: File, docType: string) {
  const appointment = currentAppointmentForUpload.value ?? getAppointmentFromDetailRef(detailRef);
  if (!appointment) return;
  if (file.size > MAX_UPLOAD_BYTES) {
    toast.add({ title: 'Fichier trop volumineux', description: 'Le fichier dépasse la limite de 25 Mo autorisée.', color: 'error' });
    return;
  }
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    toast.add({ title: 'Format non accepté', description: 'Formats acceptés : JPG, PNG, PDF uniquement.', color: 'error' });
    return;
  }
  uploadingTypes.value.add(docType);
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('appointment_id', appointment.id);
    formData.append('document_type', docType);
    const response = await apiFetch('/medical-documents', { method: 'POST', body: formData });
    if (response.success) {
      toast.add({ title: 'Document uploadé', description: `${getDocumentTypeLabel(docType)} ajouté avec succès.`, color: 'success' });
      await detailRef.value?.loadDocuments();
    } else {
      toast.add({ title: "Erreur d'upload", description: response.error || "Impossible d'uploader le document", color: 'error' });
    }
  } catch (error: any) {
    toast.add({ title: "Erreur d'upload", description: error.message || "Une erreur est survenue lors de l'upload", color: 'error' });
  } finally {
    uploadingTypes.value.delete(docType);
  }
}

async function downloadDocument(doc: any) {
  downloadingDocuments.value.add(doc.id);
  try {
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase || 'http://localhost:8888/api';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await fetch(`${apiBase}/medical-documents/${doc.id}/download`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erreur lors du téléchargement');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.add({ title: 'Téléchargement réussi', description: 'Le document a été téléchargé avec succès.', color: 'success' });
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message || 'Impossible de télécharger le document', color: 'error' });
  } finally {
    downloadingDocuments.value.delete(doc.id);
  }
}

function openInWaze(apt: any) {
  if (!apt?.address) return;
  const address = apt.address;
  if (typeof address === 'object' && address.lat && address.lng) {
    window.open(`https://waze.com/ul?ll=${address.lat},${address.lng}&navigate=yes`, '_blank');
  } else {
    const text = typeof address === 'object' && address.label ? address.label : address;
    window.open(`https://waze.com/ul?q=${encodeURIComponent(text)}&navigate=yes`, '_blank');
  }
}

function callPatient(apt: any) {
  const phone = apt?.relative?.phone || apt?.form_data?.phone;
  if (!phone) return;
  window.location.href = `tel:${phone.replace(/\s/g, '')}`;
}

function sendSMS(apt: any) {
  const phone = apt?.relative?.phone || apt?.form_data?.phone;
  if (!phone) return;
  const scheduledDate = formatAppointmentWhenForSms(apt);
  const address = typeof apt?.address === 'object' && apt?.address?.label ? apt.address.label : apt?.address || '';
  const firstName = apt?.form_data?.first_name || '';
  const whenLine = scheduledDate
    ? `Vous avez un rendez-vous le ${scheduledDate}.`
    : 'Rendez-vous (date à confirmer dans votre espace).';
  const message = encodeURIComponent(
    `Bonjour ${firstName},\n\n${whenLine}\nAdresse : ${address}\n\nCordialement`
  );
  window.location.href = `sms:${phone.replace(/\s/g, '')}?body=${message}`;
}

async function startAppointment(apt: any, loadAppointment: () => Promise<void>) {
  if (!apt) return;
  processing.value = true;
  try {
    const response = await apiFetch(`/appointments/${apt.id}`, { method: 'PUT', body: { status: 'inProgress' } });
    if (response.success) {
      toast.add({ title: 'Soin démarré', description: 'Le soin a été démarré avec succès.', color: 'success' });
      await loadAppointment();
      await detailRef.value?.loadDocuments();
    } else toast.add({ title: 'Erreur', description: response.error || 'Impossible de démarrer le soin', color: 'error' });
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' });
  } finally {
    processing.value = false;
  }
}

async function onConfirmCancel(payload: { reason: string; comment: string; photoFile: File | null }) {
  const appointment = currentAppointmentForCancel.value;
  if (!appointment) return;
  currentAppointmentForCancel.value = null;
  currentLoadAppointmentForCancel.value = null;
  processing.value = true;
  try {
    let photoDocId: string | null = null;
    if (payload.photoFile) {
      const formData = new FormData();
      formData.append('file', payload.photoFile);
      formData.append('appointment_id', appointment.id);
      formData.append('document_type', 'cancellation_photo');
      const uploadRes = await apiFetch('/medical-documents', { method: 'POST', body: formData });
      if (uploadRes.success && uploadRes.data?.id) photoDocId = uploadRes.data.id;
    }
    const body: Record<string, unknown> = {
      status: 'canceled',
      cancellation_reason: payload.reason,
      cancellation_comment: payload.comment,
    };
    if (photoDocId) body.cancellation_photo_document_id = photoDocId;
    const response = await apiFetch(`/appointments/${appointment.id}`, { method: 'PUT', body });
    if (response.success) {
      toast.add({ title: 'Rendez-vous annulé', description: 'Le rendez-vous a été annulé avec succès.', color: 'success' });
      await navigateTo('/nurse/appointments');
    } else {
      toast.add({ title: 'Erreur', description: response.error || "Impossible d'annuler le rendez-vous", color: 'error' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' });
  } finally {
    processing.value = false;
  }
}

function openRedispatchModal(apt: any, _loadAppointment: () => Promise<void>) {
  if (!apt) return;
  currentAppointmentForRedispatch.value = apt;
  showRedispatchModal.value = true;
}

async function onConfirmRedispatch() {
  const apt = currentAppointmentForRedispatch.value;
  if (!apt) return;
  processing.value = true;
  try {
    const response = await apiFetch(`/appointments/${apt.id}`, {
      method: 'PUT',
      body: { status: 'pending', redispatch: true },
    });
    if (response.success) {
      showRedispatchModal.value = false;
      currentAppointmentForRedispatch.value = null;
      toast.add({
        title: 'Rendez-vous redispatché',
        description:
          'Il est de nouveau proposé aux autres infirmiers. Un récapitulatif (date, patient) est disponible dans vos notifications.',
        color: 'success',
      });
      await navigateTo('/nurse/appointments');
    } else {
      toast.add({ title: 'Erreur', description: response.error || 'Impossible de redispatcher le rendez-vous', color: 'error' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' });
  } finally {
    processing.value = false;
  }
}

function formatDate(date: string) {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return date;
  }
}

function getFileIcon(mimeType: string) {
  if (mimeType?.startsWith('image/')) return 'i-lucide-image';
  if (mimeType === 'application/pdf') return 'i-lucide-file-text';
  return 'i-lucide-file';
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getDocumentTypeLabel(type: string) {
  const labels: Record<string, string> = { carte_vitale: 'Carte Vitale', carte_mutuelle: 'Carte Mutuelle', ordonnance: 'Ordonnance', resultats: 'Résultats', autres_assurances: 'Autre prescription', other: 'Autre' };
  return labels[type] || 'Document';
}

function getDocumentTypeBadgeColor(type: string): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' {
  const colors: Record<string, 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    carte_vitale: 'success', carte_mutuelle: 'info', ordonnance: 'warning', resultats: 'success', autres_assurances: 'secondary', other: 'neutral',
  };
  return colors[type] || 'neutral';
}

function getDocTypeBgClass(color: string) {
  const classes: Record<string, string> = { green: 'bg-green-100 dark:bg-green-900/30', blue: 'bg-blue-100 dark:bg-blue-900/30', orange: 'bg-orange-100 dark:bg-orange-900/30', purple: 'bg-purple-100 dark:bg-purple-900/30', emerald: 'bg-emerald-100 dark:bg-emerald-900/30', gray: 'bg-gray-100 dark:bg-gray-900/30' };
  return classes[color] || 'bg-gray-100 dark:bg-gray-900/30';
}

function getDocTypeIconClass(color: string) {
  const classes: Record<string, string> = { green: 'text-green-600 dark:text-green-400', blue: 'text-blue-600 dark:text-blue-400', orange: 'text-orange-600 dark:text-orange-400', purple: 'text-purple-600 dark:text-purple-400', emerald: 'text-emerald-600 dark:text-emerald-400', gray: 'text-gray-600 dark:text-gray-400' };
  return classes[color] || 'text-gray-600 dark:text-gray-400';
}

function scrollNurseResultsIntoView() {
  const focus = route.query.focus;
  const docQ = route.query.doc;
  const docId = typeof docQ === 'string' ? docQ : Array.isArray(docQ) ? docQ[0] : '';
  if (focus !== 'resultats' && !docId) return;
  nextTick(() => {
    let el: HTMLElement | null = null;
    if (docId) el = document.getElementById(`rdv-doc-${docId}`);
    if (!el) el = document.querySelector('[data-document-type="resultats"]') as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

watch(
  () => [route.query.focus, route.query.doc, route.path] as const,
  () => scrollNurseResultsIntoView(),
  { flush: 'post' },
);

onMounted(() => scrollNurseResultsIntoView());
</script>
