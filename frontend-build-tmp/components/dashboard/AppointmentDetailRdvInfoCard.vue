<template>
  <UCard class="overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
    <div class="divide-y divide-default">
      <!-- Bannière type Linear / sobre -->
      <div
        v-if="isCanceled"
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
            <p v-if="cancellationMotifLine" class="text-xs leading-relaxed text-muted">
              {{ cancellationMotifLine }}
            </p>
          </div>
        </div>
      </div>

      <div class="divide-y divide-default">
        <slot name="infoExtras" />
        <AppointmentDetailRdvFieldRows
          :appt="appt"
          :categories-for-detail="categoriesForDetail"
          :is-admin="isAdmin"
          :hide-map-actions="hideMapActions"
          :hide-address-block="hideAddressBlock"
          variant="default"
        />
        <slot name="assignee" />
        <slot name="creatorOrigin" />
        <slot name="footerExtras" />

        <!-- Complément d’annulation (hors motif déjà dans la bannière) -->
        <template v-if="isCanceled">
          <div v-if="appt.cancellation_comment" :class="kvRow">
            <div :class="kvLabel">Commentaire d’annulation</div>
            <p class="min-w-0 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
              {{ appt.cancellation_comment }}
            </p>
          </div>
          <div v-if="showCancellationPhoto && appt.cancellation_photo_document_id" :class="kvRow">
            <div :class="kvLabel">Photo (preuve)</div>
            <div class="min-w-0">
              <UButton
                type="button"
                variant="link"
                color="primary"
                size="sm"
                class="h-auto min-h-0 px-0 py-0 text-sm underline-offset-2"
                :loading="cancellationPhotoDownloading"
                @click="openCancellationPhoto"
              >
                Voir la photo
              </UButton>
            </div>
          </div>
        </template>

        <div v-if="appt.created_at && !hideAuditDates" :class="kvRow">
          <div :class="kvLabel">Créé le</div>
          <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{ formatCreatedAt(appt.created_at) }}</p>
        </div>
        <div v-if="isAdmin && appt.updated_at && !hideAuditDates" :class="kvRow">
          <div :class="kvLabel">Modifié le</div>
          <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{ formatCreatedAt(appt.updated_at) }}</p>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CANCELLATION_REASONS } from '~/config/cancellation-reasons';
import { apiFetchBlob } from '~/utils/api';

const props = withDefaults(
  defineProps<{
    appt: any;
    categoriesForDetail: Array<{
      id: string;
      icon?: string | null;
      image_url?: string | null;
      type?: string;
      options?: Array<{ option_key: string; label: string; options?: { value: string; label: string }[] }>;
    }>;
    isAdmin: boolean;
    showCancellationPhoto: boolean;
    /** Patient sur sa propre fiche : pas de boutons Carte / Waze sous l’adresse. */
    hideMapActions?: boolean;
    hideAddressBlock?: boolean;
    /** Masquer les lignes Créé le / Modifié le (ex. portail patient). */
    hideAuditDates?: boolean;
  }>(),
  { hideMapActions: false, hideAddressBlock: false, hideAuditDates: false },
);

const kvRow =
  'grid grid-cols-1 gap-x-4 gap-y-1 px-4 py-3 sm:px-6 sm:grid-cols-[minmax(9.5rem,11rem)_minmax(0,1fr)] sm:items-start sm:py-2.5';
const kvLabel = 'text-[11px] font-semibold uppercase tracking-wide text-muted shrink-0 pt-0.5';

const PARIS_TZ = 'Europe/Paris';

const isCanceled = computed(() => {
  const s = String(props.appt?.status ?? '').toLowerCase();
  return s === 'canceled' || s === 'cancelled';
});

const cancellationMotifLine = computed(() => {
  const code = props.appt?.cancellation_reason;
  if (!code || typeof code !== 'string') return '';
  const label = CANCELLATION_REASONS[code] || code;
  return `Motif : ${label}`;
});

function formatCreatedAt(d: string) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      timeZone: PARIS_TZ,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
}

const toast = useAppToast();
const cancellationPhotoDownloading = ref(false);

async function openCancellationPhoto() {
  const id = props.appt?.cancellation_photo_document_id;
  if (!id || cancellationPhotoDownloading.value) return;
  cancellationPhotoDownloading.value = true;
  try {
    const { blob } = await apiFetchBlob(`/medical-documents/${encodeURIComponent(String(id))}/download`);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  } catch (e: any) {
    toast.add({
      title: 'Impossible d’ouvrir la photo',
      description: e?.message || 'Accès refusé ou session expirée.',
      color: 'error',
    });
  } finally {
    cancellationPhotoDownloading.value = false;
  }
}
</script>
