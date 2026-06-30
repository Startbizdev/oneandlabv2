<template>
  <section
    id="rdv-care-photos-section"
    class="scroll-mt-28 overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-gray-800 dark:bg-gray-950"
  >
    <!-- En-tête compact -->
    <header
      class="flex items-center gap-3 border-b border-gray-100 px-4 py-3 sm:px-5 dark:border-gray-800/90"
    >
      <div
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800/90"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-camera" class="h-4 w-4 text-gray-600 dark:text-gray-400" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <h3 class="text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
            Photos de soins
          </h3>
          <span
            v-if="combinedUnread > 0"
            class="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400"
            aria-live="polite"
          >
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
            {{ combinedUnread }} nouveau{{ combinedUnread > 1 ? 'x' : '' }}
          </span>
        </div>
        <p class="mt-0.5 text-[11px] leading-snug text-muted sm:text-xs">
          Partagées par l’infirmier ; discussion en direct avec le prescripteur.
        </p>
      </div>
    </header>

    <div v-if="documentsLoading" class="flex items-center gap-2 px-4 py-8 sm:px-5">
      <UIcon name="i-lucide-loader-2" class="h-4 w-4 shrink-0 animate-spin text-primary" />
      <span class="text-sm text-muted">Chargement…</span>
    </div>

    <template v-else>
      <div
        v-if="primaryCareDocs.length === 0 && !canOpenExchange"
        class="px-4 py-8 text-center text-sm text-muted sm:px-5"
      >
        Aucune photo pour ce rendez-vous.
      </div>

      <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800/80">
        <li
          v-if="primaryCareDocs.length === 0 && canOpenExchange"
          class="px-4 py-5 sm:px-5"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-50">
                Échange pro ↔ infirmier
              </p>
              <p class="mt-0.5 text-xs text-muted">
                Messages, photos ou PDF — sans envoyer de fichier pour commencer.
              </p>
              <p
                v-if="threadCommentHint"
                class="mt-1 text-[11px] text-muted/85"
              >
                {{ threadCommentHint }}
              </p>
            </div>
            <div class="relative inline-flex shrink-0 justify-end">
              <UButton
                color="primary"
                variant="solid"
                size="sm"
                class="relative pr-3 font-medium"
                icon="i-lucide-message-circle"
                aria-label="Ouvrir l’échange"
                :on-click="() => openGeneralExchange()"
              >
                Ouvrir l’échange
              </UButton>
              <span
                v-if="threadUnread > 0"
                class="pointer-events-none absolute -right-1 -top-1 z-10 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none tabular-nums text-white shadow-sm ring-2 ring-white dark:ring-gray-950"
                aria-hidden="true"
              >
                {{ threadUnread > 99 ? '99+' : threadUnread }}
              </span>
            </div>
          </div>
        </li>

        <li
          v-for="(doc, idx) in primaryCareDocs"
          :key="doc.id"
          :id="'rdv-care-photo-' + doc.id"
          :data-document-type="'care_photo'"
          class="px-4 py-4 sm:px-5 sm:py-3.5"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <div
                class="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-black/[0.04] dark:bg-gray-800/80 dark:ring-white/10"
              >
                <img
                  v-if="thumbUrls[doc.id] && !isCarePhotoPdf(doc)"
                  :src="thumbUrls[doc.id]"
                  alt=""
                  class="h-full w-full object-cover"
                >
                <div
                  v-else-if="isCarePhotoPdf(doc)"
                  class="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-primary-500/10 px-1"
                >
                  <UIcon name="i-lucide-file-text" class="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div v-else class="flex h-full w-full items-center justify-center">
                  <UIcon name="i-lucide-image" class="h-5 w-5 text-muted" />
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-50">
                  {{ isCarePhotoPdf(doc) ? 'Document' : 'Photo' }} n°{{ idx + 1 }}
                </p>
                <p v-if="formatCarePhotoMeta(doc)" class="mt-0.5 text-xs text-muted">
                  {{ formatCarePhotoMeta(doc) }}
                </p>
                <p
                  v-if="commentCountHint[String(doc.id)] && !(unreadByDoc[String(doc.id)] > 0)"
                  class="mt-0.5 text-[11px] text-muted/85"
                >
                  {{ commentCountHint[String(doc.id)] }}
                </p>
              </div>
            </div>

            <div
              class="flex shrink-0 items-center justify-end gap-2 sm:w-auto sm:justify-end sm:pl-2"
            >
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                class="!px-2 text-muted hover:text-gray-900 dark:hover:text-white"
                icon="i-lucide-download"
                :loading-auto="false"
                aria-label="Télécharger la photo"
                :on-click="() => emit('download', doc)"
              />
              <div class="relative inline-flex">
                <UButton
                  color="primary"
                  variant="solid"
                  size="sm"
                  class="relative pr-3 font-medium"
                  icon="i-lucide-message-circle"
                  aria-label="Ouvrir les échanges"
                  :on-click="() => openCareDiscussion(doc)"
                >
                  Échanges
                </UButton>
                <span
                  v-if="unreadByDoc[String(doc.id)] > 0"
                  class="pointer-events-none absolute -right-1 -top-1 z-10 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none tabular-nums text-white shadow-sm ring-2 ring-white dark:ring-gray-950"
                  aria-hidden="true"
                >
                  {{ unreadByDoc[String(doc.id)] > 99 ? '99+' : unreadByDoc[String(doc.id)] }}
                </span>
              </div>
            </div>
          </div>
        </li>

        <!-- Zone ajout (infirmier) -->
        <li
          v-if="effectiveEnableUpload && primaryAppointment?.id"
          class="border-t border-dashed border-gray-200/90 bg-gray-50/40 px-4 py-3.5 dark:border-gray-800 dark:bg-gray-900/25 sm:px-5"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-[11px] leading-relaxed text-muted sm:max-w-md sm:text-xs">
              Image ou PDF · max 25&nbsp;Mo · visible par le professionnel prescripteur.
            </p>
            <div class="flex shrink-0 justify-end">
              <input
                ref="carePhotoFileInputRef"
                type="file"
                :accept="carePhotoAccept"
                class="hidden"
                @change="onCarePhotoFileChange"
              >
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                size="sm"
                class="font-medium"
                icon="i-lucide-plus"
                :loading="carePhotoUploading"
                :loading-auto="false"
                :on-click="() => triggerCarePhotoPicker()"
              >
                Ajouter une photo
              </UButton>
            </div>
          </div>
        </li>
      </ul>
    </template>

    <CarePhotoDiscussionModal
      v-model:open="careDiscussionOpen"
      :appointment-id="primaryAppointment?.id ?? undefined"
      :document-id="careDiscussionDocId ?? undefined"
      :viewer-user-id="effectiveViewerId ?? undefined"
      @comment-posted="onDiscussionCommentPosted"
      @file-uploaded="onDiscussionCommentPosted"
      @thread-loaded="onThreadLoaded"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { apiFetch } from '~/utils/api';
import { readCarePhotoSeenDigest, writeCarePhotoSeenDigest } from '~/utils/care-photo-thread-digest';
import { CARE_PHOTO_ACCEPT_ATTR, isCarePhotoPdf } from '~/utils/care-photo-file';
import { useCareGalleryNotificationDeepLink } from '~/composables/useCareGalleryNotificationDeepLink';

const carePhotoAccept = CARE_PHOTO_ACCEPT_ATTR;

const props = withDefaults(
  defineProps<{
    appointment: Record<string, unknown> | null;
    appointmentsForDocs?: Record<string, unknown>[] | null;
    documents: any[];
    documentsLoading?: boolean;
    enableCarePhotoUpload?: boolean;
    carePhotoUploading?: boolean;
    viewerUserId?: string | null;
    primaryAppointmentId?: string | null;
  }>(),
  {
    appointmentsForDocs: null,
    documentsLoading: false,
    enableCarePhotoUpload: false,
    carePhotoUploading: false,
    viewerUserId: null,
    primaryAppointmentId: null,
  },
);

const { user } = useAuth();
const effectiveViewerId = computed(() => {
  if (props.viewerUserId != null && String(props.viewerUserId).length > 0) return String(props.viewerUserId);
  if (user.value?.id != null && String(user.value.id).length > 0) return String(user.value.id);
  return null;
});

const emit = defineEmits<{
  download: [doc: any];
  carePhotoUpload: [file: File];
  carePhotoThreadUpdated: [];
  loadDocumentsNeeded: [];
}>();

const primaryAppointment = computed(() => props.appointment ?? null);

const aptIdPrimary = computed(
  () => String(props.primaryAppointmentId || primaryAppointment.value?.id || '').trim(),
);

const primaryCareDocs = computed(() =>
  !aptIdPrimary.value
    ? []
    : (props.documents || []).filter(
        (d: any) => d.document_type === 'care_photo' && String(d.appointment_id || '') === aptIdPrimary.value,
      ),
);

const effectiveEnableUpload = computed(
  () => props.enableCarePhotoUpload === true && !!aptIdPrimary.value,
);

function formatCarePhotoMeta(doc: any) {
  if (!doc?.created_at) return '';
  try {
    return new Date(doc.created_at).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(doc.created_at);
  }
}

const careDiscussionOpen = ref(false);
const careDiscussionDocId = ref<string | null>(null);
const thumbUrls = ref<Record<string, string>>({});
const thumbFetchInFlight = ref<Set<string>>(new Set());

/** Rafraîchissement discret pour approcher le temps réel sans surcharger l’API. */
const POLL_MS = 8_000;
let pollTimer: ReturnType<typeof setInterval> | null = null;

const unreadByDoc = ref<Record<string, number>>({});
const commentCountHint = ref<Record<string, string>>({});
const threadUnread = ref(0);
const threadCommentHint = ref('');
const canCommentFromApi = ref(false);
const canUploadFromApi = ref(false);

const canOpenExchange = computed(
  () => canCommentFromApi.value || effectiveEnableUpload.value,
);

const combinedUnread = computed(() => {
  const photoUnread = primaryCareDocs.value.reduce(
    (n, doc: any) => n + (unreadByDoc.value[String(doc.id)] || 0),
    0,
  );
  return photoUnread + threadUnread.value;
});

function applyPollPayload(data: {
  photos?: { id: string; comments?: { id: string; author_id?: string }[] }[];
  thread?: { document_id?: string; comments?: { id: string; author_id?: string }[] } | null;
  can_comment?: boolean;
  can_upload?: boolean;
}) {
  const viewer = effectiveViewerId.value ? String(effectiveViewerId.value) : '';
  const aid = aptIdPrimary.value;
  const nextUnread: Record<string, number> = {};
  const nextHint: Record<string, string> = {};

  canCommentFromApi.value = data.can_comment === true;
  canUploadFromApi.value = data.can_upload === true;

  for (const doc of primaryCareDocs.value) {
    nextUnread[String((doc as any).id)] = 0;
  }

  for (const p of data.photos || []) {
    const pid = String(p.id);
    const comments = p.comments || [];
    const stored = readCarePhotoSeenDigest(aid, pid) || '';
    const seenIds = new Set(stored.split('|').filter(Boolean));
    let newFromOthers = 0;
    for (const c of comments) {
      const cid = String(c.id || '');
      if (!cid || seenIds.has(cid)) continue;
      if (viewer && String(c.author_id || '') === viewer) continue;
      newFromOthers++;
    }
    nextUnread[pid] = newFromOthers;
    const n = comments.length;
    if (n > 0) {
      nextHint[pid] = `${n} message${n > 1 ? 's' : ''}`;
    } else {
      delete nextHint[pid];
    }
  }
  unreadByDoc.value = nextUnread;
  commentCountHint.value = nextHint;

  const thread = data.thread;
  if (thread?.document_id) {
    const comments = thread.comments || [];
    const stored = readCarePhotoSeenDigest(aid, String(thread.document_id)) || '';
    const seenIds = new Set(stored.split('|').filter(Boolean));
    let newFromOthers = 0;
    for (const c of comments) {
      const cid = String(c.id || '');
      if (!cid || seenIds.has(cid)) continue;
      if (viewer && String(c.author_id || '') === viewer) continue;
      newFromOthers++;
    }
    threadUnread.value = newFromOthers;
    const n = comments.length;
    threadCommentHint.value = n > 0 ? `${n} message${n > 1 ? 's' : ''}` : '';
  } else {
    threadUnread.value = 0;
    threadCommentHint.value = '';
  }
}

async function pollCarePhotoThreads() {
  const aid = aptIdPrimary.value;
  if (!aid || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
  try {
    const res = await apiFetch(`/appointments/${encodeURIComponent(aid)}/care-photos`, { method: 'GET' });
    if (!res?.success || !res.data) return;
    applyPollPayload(res.data);
  } catch {
    /* silencieux */
  }
}

function startPolling() {
  stopPolling();
  void pollCarePhotoThreads();
  if (typeof window === 'undefined') return;
  pollTimer = setInterval(() => void pollCarePhotoThreads(), POLL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function openCareDiscussion(doc: any) {
  if (!doc?.id || !aptIdPrimary.value) return;
  careDiscussionDocId.value = String(doc.id);
  careDiscussionOpen.value = true;
}

function openGeneralExchange() {
  if (!aptIdPrimary.value) return;
  careDiscussionDocId.value = null;
  careDiscussionOpen.value = true;
}

useCareGalleryNotificationDeepLink({
  careDocs: primaryCareDocs,
  documentsLoading: computed(() => props.documentsLoading === true),
  openCareDiscussion,
  openGeneralExchange,
});

function onDiscussionCommentPosted() {
  emit('carePhotoThreadUpdated');
  emit('loadDocumentsNeeded');
  void pollCarePhotoThreads();
}

function onThreadLoaded(payload: { documentId: string; digest: string }) {
  const aid = aptIdPrimary.value;
  if (!aid) return;
  writeCarePhotoSeenDigest(aid, payload.documentId, payload.digest);
  void pollCarePhotoThreads();
}

const carePhotoFileInputRef = ref<HTMLInputElement | null>(null);

function triggerCarePhotoPicker() {
  carePhotoFileInputRef.value?.click();
}

function onCarePhotoFileChange(ev: Event) {
  const target = ev.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (file) emit('carePhotoUpload', file);
}

const config = useRuntimeConfig();

async function loadThumb(docId: string) {
  const id = String(docId);
  if (thumbUrls.value[id] || thumbFetchInFlight.value.has(id)) return;
  thumbFetchInFlight.value = new Set(thumbFetchInFlight.value).add(id);
  try {
    const apiBase = config.public?.apiBase || 'http://localhost:8888/api';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`${apiBase}/medical-documents/${encodeURIComponent(id)}/download`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    thumbUrls.value = { ...thumbUrls.value, [id]: url };
  } catch {
    /* ignore */
  } finally {
    const next = new Set(thumbFetchInFlight.value);
    next.delete(id);
    thumbFetchInFlight.value = next;
  }
}

watch(
  () => primaryCareDocs.value.map((d: any) => String(d.id)).join(','),
  (ids) => {
    if (!ids) return;
    for (const doc of primaryCareDocs.value) {
      void loadThumb(String((doc as any).id));
    }
    void pollCarePhotoThreads();
  },
  { immediate: true },
);

watch(
  () => aptIdPrimary.value,
  (aid) => {
    if (!aid) {
      stopPolling();
      return;
    }
    startPolling();
  },
  { immediate: true },
);

onMounted(() => {
  if (aptIdPrimary.value) startPolling();
});

onBeforeUnmount(() => {
  stopPolling();
  for (const u of Object.values(thumbUrls.value)) {
    try {
      URL.revokeObjectURL(u);
    } catch {
      /* ignore */
    }
  }
});
</script>
