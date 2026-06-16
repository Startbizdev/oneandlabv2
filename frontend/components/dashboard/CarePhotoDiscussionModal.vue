<template>
  <ClientOnly>
    <Teleport to="body">
      <UModal
        v-model:open="open"
        :ui="{
          content:
            'rdv-no-mobile-zoom flex min-h-0 max-h-[calc(100dvh-1rem)] w-full max-w-[min(100vw-1rem,480px)] flex-col overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl sm:p-0 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10',
        }"
      >
        <template #content="{ close: closeModal }">
          <UCard
            class="rdv-no-mobile-zoom flex min-h-0 w-full max-w-full flex-1 flex-col border-0 shadow-none ring-0 overflow-hidden"
            :ui="{ header: '!p-3 sm:!p-3', body: '!p-0 sm:!p-0 flex min-h-0 flex-1 flex-col overflow-hidden' }"
          >
            <template #header>
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0 flex items-center gap-2">
                  <span
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                  >
                    <UIcon name="i-lucide-messages-square" class="h-4 w-4" />
                  </span>
                  <div class="min-w-0 leading-tight">
                    <h2 class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {{ isThreadOnlyMode ? 'Échange' : 'Photo — échanges' }}
                    </h2>
                    <p v-if="photoDateSubtitle && !isThreadOnlyMode" class="truncate text-[11px] text-muted">
                      {{ photoDateSubtitle }}
                    </p>
                  </div>
                </div>
                <UButton
                  type="button"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-x"
                  size="xs"
                  class="shrink-0"
                  aria-label="Fermer"
                  :on-click="() => closeModal()"
                />
              </div>
            </template>

            <div class="flex min-h-0 max-h-full flex-1 flex-col overflow-hidden">
              <div
                ref="scrollRef"
                class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain px-3 pb-3 pt-3 [-webkit-overflow-scrolling:touch] sm:gap-3 sm:px-4 sm:pb-3 sm:pt-4"
              >
                <!-- Fichier dans le fil (image ou PDF) -->
                <div
                  v-if="!isThreadOnlyMode"
                  class="flex shrink-0 w-full justify-center px-0.5 pb-1"
                >
                  <button
                    v-if="!isPreviewPdf"
                    type="button"
                    class="care-photo-chat-preview group relative flex aspect-square w-full max-w-[min(13rem,78vw)] overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-gray-200/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 enabled:cursor-zoom-in disabled:cursor-not-allowed dark:bg-gray-900/80 dark:ring-gray-700 sm:max-w-[14rem]"
                    :disabled="previewLoading || !previewUrl"
                    aria-label="Ouvrir la visionneuse"
                    @click="openLightbox"
                  >
                    <div v-if="previewLoading" class="flex h-full min-h-[7rem] w-full items-center justify-center">
                      <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary-500" />
                    </div>
                    <img
                      v-else-if="previewUrl"
                      :src="previewUrl"
                      alt=""
                      class="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                      draggable="false"
                    >
                    <div v-else class="flex h-full min-h-[7rem] w-full items-center justify-center text-muted">
                      <UIcon name="i-lucide-image-off" class="h-7 w-7 shrink-0 opacity-50" aria-hidden="true" />
                    </div>
                    <span
                      v-if="previewUrl && !previewLoading"
                      class="pointer-events-none absolute bottom-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm backdrop-blur-[2px]"
                    >
                      <UIcon name="i-lucide-maximize-2" class="h-3 w-3" aria-hidden="true" />
                      Agrandir
                    </span>
                  </button>
                  <button
                    v-else
                    type="button"
                    class="group relative flex w-full max-w-[min(16rem,88vw)] flex-col overflow-hidden rounded-2xl bg-gray-50 shadow-sm ring-1 ring-gray-200/90 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed dark:bg-gray-900/80 dark:ring-gray-700 dark:hover:bg-gray-900"
                    :disabled="previewLoading || !previewUrl"
                    aria-label="Ouvrir l’aperçu PDF"
                    @click="openPdfPreview"
                  >
                    <div v-if="previewLoading" class="flex min-h-[10rem] w-full items-center justify-center py-8">
                      <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary-500" />
                    </div>
                    <template v-else-if="previewUrl">
                      <div class="relative h-44 w-full overflow-hidden bg-gray-100 dark:bg-gray-950">
                        <iframe
                          :src="pdfEmbedUrl"
                          title="Aperçu du document PDF"
                          class="pointer-events-none h-[calc(100%+2rem)] w-full border-0"
                        />
                        <span
                          class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"
                          aria-hidden="true"
                        />
                        <span
                          class="pointer-events-none absolute bottom-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm backdrop-blur-[2px]"
                        >
                          <UIcon name="i-lucide-maximize-2" class="h-3 w-3" aria-hidden="true" />
                          Aperçu
                        </span>
                      </div>
                      <div class="flex w-full flex-col gap-2 px-3 py-3">
                        <p class="line-clamp-2 text-xs font-medium text-gray-900 dark:text-gray-100">
                          {{ previewFileName }}
                        </p>
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="inline-flex items-center gap-1 text-[11px] font-medium text-primary-600 dark:text-primary-400">
                            <UIcon name="i-lucide-eye" class="h-3.5 w-3.5" aria-hidden="true" />
                            Ouvrir la visionneuse
                          </span>
                          <button
                            type="button"
                            class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                            :disabled="pdfDownloading"
                            aria-label="Télécharger le PDF"
                            @click.stop="downloadPdf"
                          >
                            <UIcon
                              :name="pdfDownloading ? 'i-lucide-loader-2' : 'i-lucide-download'"
                              class="h-3.5 w-3.5"
                              :class="{ 'animate-spin': pdfDownloading }"
                              aria-hidden="true"
                            />
                            Télécharger
                          </button>
                        </div>
                      </div>
                    </template>
                    <div v-else class="flex min-h-[10rem] w-full flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                      <UIcon name="i-lucide-file-text" class="h-10 w-10 text-primary-600 dark:text-primary-400" />
                      <p class="text-xs text-muted">Aperçu indisponible</p>
                    </div>
                  </button>
                </div>

                <div v-if="loading" class="flex min-h-[5rem] flex-1 items-center justify-center py-6">
                  <UIcon name="i-lucide-loader-2" class="h-7 w-7 animate-spin text-primary-500" />
                </div>
                <div v-else-if="!hasDiscussionContent" class="py-4 text-center text-xs text-muted">
                  Démarrez la conversation — envoyez un message ou ajoutez une photo.
                </div>
                <template v-else-if="orderedComments.length">
                  <div
                    v-for="c in orderedComments"
                    :key="c.id"
                    :class="[
                      'max-w-[min(100%,20rem)] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[85%]',
                      isMine(c)
                        ? 'ml-auto rounded-br-md bg-primary-600 text-white dark:bg-primary-500'
                        : 'mr-auto rounded-bl-md bg-white text-gray-900 ring-1 ring-gray-200/90 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700',
                    ]"
                  >
                    <div
                      class="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0 text-[11px]"
                      :class="isMine(c) ? 'text-primary-100' : 'text-muted'"
                    >
                      <span class="font-semibold">{{ c.author_name }}</span>
                      <time class="shrink-0 tabular-nums opacity-90">{{ formatShortDate(c.created_at) }}</time>
                    </div>
                    <p class="whitespace-pre-wrap leading-relaxed text-[13px]" :class="isMine(c) ? 'text-white/95' : ''">
                      {{ c.body }}
                    </p>
                  </div>
                </template>
                <p v-else class="py-4 text-center text-xs text-muted">Aucun message</p>
              </div>

              <div
                v-if="canComment || canUpload"
                class="shrink-0 border-t border-gray-100 bg-white px-3 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] dark:border-gray-800 dark:bg-gray-950 sm:px-4 sm:pb-3"
              >
                <input
                  ref="cameraInputRef"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  class="hidden"
                  @change="onAttachFileChange"
                >
                <input
                  ref="galleryInputRef"
                  type="file"
                  :accept="carePhotoAccept"
                  class="hidden"
                  @change="onAttachFileChange"
                >
                <input
                  ref="fileInputRef"
                  type="file"
                  :accept="carePhotoAccept"
                  class="hidden"
                  @change="onAttachFileChange"
                >
                <!-- Composer : + pièce jointe, message, envoyer -->
                <div class="flex w-full min-w-0 items-end gap-2">
                  <div v-if="canUpload" class="relative shrink-0">
                    <button
                      type="button"
                      class="care-chat-composer__attach inline-flex size-[2.75rem] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-200/90 bg-white text-primary-600 shadow-sm outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary-400 disabled:pointer-events-none disabled:opacity-55 dark:border-gray-700 dark:bg-gray-900 dark:text-primary-400 dark:hover:bg-gray-800"
                      :disabled="uploading"
                      aria-label="Ajouter une photo ou un document"
                      @click="attachMenuOpen = !attachMenuOpen"
                    >
                      <UIcon
                        :name="uploading ? 'i-lucide-loader-2' : 'i-lucide-plus'"
                        class="pointer-events-none size-[1.25rem] shrink-0"
                        :class="{ 'animate-spin': uploading }"
                      />
                    </button>
                    <div
                      v-if="attachMenuOpen"
                      class="absolute bottom-[calc(100%+0.35rem)] left-0 z-20 min-w-[10.5rem] overflow-hidden rounded-lg border border-gray-200/90 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                    >
                      <button
                        type="button"
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                        @click="triggerAttachPicker('camera')"
                      >
                        <UIcon name="i-lucide-camera" class="h-4 w-4 shrink-0" />
                        Appareil photo
                      </button>
                      <button
                        type="button"
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                        @click="triggerAttachPicker('gallery')"
                      >
                        <UIcon name="i-lucide-image" class="h-4 w-4 shrink-0" />
                        Galerie
                      </button>
                      <button
                        type="button"
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                        @click="triggerAttachPicker('file')"
                      >
                        <UIcon name="i-lucide-file-up" class="h-4 w-4 shrink-0" />
                        Fichier
                      </button>
                    </div>
                  </div>
                  <div v-if="canComment" class="min-h-0 min-w-0 flex-1">
                    <UTextarea
                      v-model="draft"
                      :rows="1"
                      autoresize
                      :maxrows="4"
                      color="neutral"
                      placeholder="Message…"
                      class="care-chat-composer__textarea w-full min-w-0 touch-manipulation"
                      :ui="{
                        root: 'care-chat-composer__textarea-root w-full min-w-0 flex flex-col items-stretch',
                        base: [
                          'care-chat-composer__field',
                          'box-border max-h-[5.75rem] min-h-[2.75rem] w-full min-w-0 resize-none',
                          'px-3 py-2.5 text-base leading-snug sm:py-2 sm:text-sm',
                          'rounded-lg',
                        ].join(' '),
                      }"
                      @keydown.meta.enter.prevent="sendComment"
                      @keydown.ctrl.enter.prevent="sendComment"
                    />
                  </div>
                  <button
                    v-if="canComment"
                    type="button"
                    class="care-chat-composer__send inline-flex size-[2.75rem] shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-primary-600 p-0 text-white shadow-sm outline-none transition-colors hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-55 dark:bg-primary-500 dark:hover:bg-primary-600 dark:focus-visible:ring-offset-gray-950"
                    :disabled="sending"
                    aria-label="Envoyer"
                    @click="sendComment"
                  >
                    <UIcon
                      :name="sending ? 'i-lucide-loader-2' : 'i-lucide-send'"
                      class="pointer-events-none size-[1.125rem] shrink-0"
                      :class="{ 'animate-spin': sending }"
                    />
                  </button>
                </div>
              </div>
              <div
                v-else-if="hasDiscussionContent && !canComment && !canUpload && !loading"
                class="shrink-0 border-t border-gray-100 px-3 py-1.5 text-center text-[10px] text-muted dark:border-gray-800"
              >
                Lecture seule
              </div>
            </div>
          </UCard>
        </template>
      </UModal>

      <!-- Zoom plein écran -->
      <Teleport to="body">
        <Transition
          enter-active-class="transition-opacity duration-200"
          leave-active-class="transition-opacity duration-150"
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
        >
          <div
            v-if="zoomOpen && previewUrl"
            class="care-photo-lightbox fixed inset-0 z-[9999] flex flex-col bg-black/92 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            :aria-label="isPreviewPdf ? 'Visionneuse PDF' : 'Visionneuse photo'"
            @click.self="closeLightbox"
          >
            <div class="flex shrink-0 items-center justify-between gap-3 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-5">
              <p class="min-w-0 flex-1 truncate text-sm font-medium text-white/95">
                {{ previewFileName }}
              </p>
              <div class="flex shrink-0 items-center gap-2">
                <button
                  v-if="isPreviewPdf"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-50"
                  :disabled="pdfDownloading"
                  aria-label="Télécharger le PDF"
                  @click="downloadPdf"
                >
                  <UIcon
                    :name="pdfDownloading ? 'i-lucide-loader-2' : 'i-lucide-download'"
                    class="h-4 w-4"
                    :class="{ 'animate-spin': pdfDownloading }"
                    aria-hidden="true"
                  />
                  Télécharger
                </button>
                <button
                  type="button"
                  class="rounded-full bg-white/15 p-2.5 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  aria-label="Fermer la visionneuse"
                  @click="closeLightbox"
                >
                  <UIcon name="i-lucide-x" class="h-6 w-6" />
                </button>
              </div>
            </div>
            <div class="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
              <iframe
                v-if="isPreviewPdf"
                :src="pdfEmbedUrl"
                title="Document PDF"
                class="h-full w-full max-w-5xl rounded-lg border-0 bg-white shadow-2xl"
                @click.stop
              />
              <img
                v-else
                :src="previewUrl"
                alt=""
                class="max-h-full max-w-full cursor-zoom-out select-none object-contain"
                draggable="false"
                @click.stop="closeLightbox"
              >
            </div>
          </div>
        </Transition>
      </Teleport>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';
import { apiFetch } from '~/utils/api';
import { carePhotoCommentsDigest } from '~/utils/care-photo-thread-digest';
import {
  CARE_PHOTO_ACCEPT_ATTR,
  CARE_PHOTO_ALLOWED_MIME,
  isCarePhotoPdf,
  isCarePhotoThreadAnchor,
} from '~/utils/care-photo-file';

type CarePhotoComment = {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

type CarePhotoRow = {
  id: string;
  file_name?: string;
  mime_type?: string;
  created_at: string;
  comments: CarePhotoComment[];
};

const props = defineProps<{
  appointmentId?: string | null;
  documentId?: string | null;
  viewerUserId?: string | null;
}>();

const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{
  commentPosted: [];
  fileUploaded: [];
  threadLoaded: [payload: { documentId: string; digest: string }];
}>();

const toast = useAppToast();
const config = useRuntimeConfig();

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const carePhotoAccept = CARE_PHOTO_ACCEPT_ATTR;

const loading = ref(false);
const sending = ref(false);
const uploading = ref(false);
const photo = ref<CarePhotoRow | null>(null);
const canComment = ref(false);
const canUpload = ref(false);
const draft = ref('');
const scrollRef = ref<HTMLElement | null>(null);
const attachMenuOpen = ref(false);
const activeDocumentId = ref<string | null>(null);

const cameraInputRef = ref<HTMLInputElement | null>(null);
const galleryInputRef = ref<HTMLInputElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const previewUrl = ref<string | null>(null);
let previewBlobUrl: string | null = null;
const previewLoading = ref(false);
const zoomOpen = ref(false);
const pdfDownloading = ref(false);

const isPreviewPdf = computed(() => isCarePhotoPdf(photo.value));

const isThreadOnlyMode = computed(() => {
  if (!photo.value) return !effectiveDocumentId();
  return isCarePhotoThreadAnchor(photo.value);
});

const hasDiscussionContent = computed(
  () =>
    canComment.value ||
    canUpload.value ||
    (photo.value?.comments?.length ?? 0) > 0,
);

const previewFileName = computed(
  () => photo.value?.file_name?.trim() || 'Document PDF',
);

const pdfEmbedUrl = computed(() => {
  if (!previewUrl.value || !isPreviewPdf.value) return '';
  return `${previewUrl.value}#toolbar=1&navpanes=0&view=FitH`;
});

function openLightbox() {
  if (previewLoading.value || !previewUrl.value || isPreviewPdf.value) return;
  zoomOpen.value = true;
}

function openPdfPreview() {
  if (previewLoading.value || !previewUrl.value || !isPreviewPdf.value) return;
  zoomOpen.value = true;
}

function closeLightbox() {
  zoomOpen.value = false;
}

async function downloadPdf() {
  if (!previewUrl.value || !isPreviewPdf.value || pdfDownloading.value) return;
  pdfDownloading.value = true;
  try {
    const a = document.createElement('a');
    a.href = previewUrl.value;
    a.download = previewFileName.value.endsWith('.pdf')
      ? previewFileName.value
      : `${previewFileName.value.replace(/\.pdf$/i, '')}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.add({ title: 'Téléchargement lancé', color: 'success' });
  } catch (e: any) {
    toast.add({
      title: 'Téléchargement',
      description: e?.message || 'Impossible de télécharger le PDF.',
      color: 'error',
    });
  } finally {
    pdfDownloading.value = false;
  }
}

function revokePreviewBlob() {
  if (previewBlobUrl) {
    try {
      URL.revokeObjectURL(previewBlobUrl);
    } catch {
      /* ignore */
    }
    previewBlobUrl = null;
  }
  previewUrl.value = null;
}

async function loadPreview(docId: string) {
  previewLoading.value = true;
  revokePreviewBlob();
  try {
    const apiBase = config.public?.apiBase || 'http://localhost:8888/api';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`${apiBase}/medical-documents/${encodeURIComponent(docId)}/download`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    previewBlobUrl = URL.createObjectURL(blob);
    previewUrl.value = previewBlobUrl;
  } catch {
    /* ignore preview errors */
  } finally {
    previewLoading.value = false;
  }
}

const viewer = computed(() => (props.viewerUserId ? String(props.viewerUserId) : ''));

const photoDateSubtitle = computed(() => {
  const raw = photo.value?.created_at;
  if (!raw) return '';
  try {
    return new Date(raw).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(raw);
  }
});

function isMine(c: CarePhotoComment) {
  return viewer.value !== '' && String(c.author_id || '') === viewer.value;
}

const orderedComments = computed(() => {
  const list = [...(photo.value?.comments || [])];
  list.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  return list;
});

async function scrollToBottom() {
  await nextTick();
  const el = scrollRef.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPoll() {
  stopPoll();
  pollTimer = setInterval(() => {
    if (open.value) void loadThread(true);
  }, 8000);
}

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function emitThreadSeen() {
  if (!open.value) return;
  const did = effectiveDocumentId();
  const aid = props.appointmentId;
  if (!photo.value || !did || !aid) return;
  const digest = carePhotoCommentsDigest((photo.value.comments || []).map((c) => String(c.id)));
  emit('threadLoaded', { documentId: String(did), digest });
}

function effectiveDocumentId() {
  return activeDocumentId.value || props.documentId || null;
}

function closeAttachMenu() {
  attachMenuOpen.value = false;
}

function triggerAttachPicker(kind: 'camera' | 'gallery' | 'file') {
  closeAttachMenu();
  if (kind === 'camera') cameraInputRef.value?.click();
  else if (kind === 'gallery') galleryInputRef.value?.click();
  else fileInputRef.value?.click();
}

function onAttachFileChange(ev: Event) {
  const target = ev.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (file) void uploadCarePhotoFile(file);
}

async function uploadCarePhotoFile(file: File) {
  const aid = props.appointmentId;
  if (!aid) return;
  if (!CARE_PHOTO_ALLOWED_MIME.includes(file.type as (typeof CARE_PHOTO_ALLOWED_MIME)[number])) {
    toast.add({
      title: 'Format',
      description: 'Utilisez une image (JPG, PNG, HEIC) ou un PDF.',
      color: 'warning',
    });
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    toast.add({
      title: 'Fichier trop volumineux',
      description: 'Maximum 25 Mo.',
      color: 'error',
    });
    return;
  }
  uploading.value = true;
  try {
    const apiBase = config.public?.apiBase || '';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const csrf = (typeof window !== 'undefined' && (window as any).__csrfTokenCache) || '';
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${apiBase}/appointments/${encodeURIComponent(aid)}/care-photos`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Upload échoué');
    const newId = data?.data?.id ? String(data.data.id) : null;
    if (newId) activeDocumentId.value = newId;
    toast.add({ title: 'Fichier envoyé', color: 'success' });
    emit('fileUploaded');
    await loadThread(false);
    emit('commentPosted');
  } catch (e: any) {
    toast.add({ title: 'Upload', description: e?.message || 'Erreur', color: 'error' });
  } finally {
    uploading.value = false;
  }
}

function onDocPointerDown(ev: MouseEvent) {
  if (!attachMenuOpen.value) return;
  const target = ev.target as HTMLElement | null;
  if (target?.closest('.care-chat-composer__attach')) return;
  closeAttachMenu();
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', onDocPointerDown);
  }
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', onDocPointerDown);
  }
});

async function loadThread(silent = false) {
  const aid = props.appointmentId;
  if (!aid) {
    photo.value = null;
    return;
  }
  const did = effectiveDocumentId();
  if (!silent) loading.value = true;
  try {
    const res = await apiFetch(`/appointments/${encodeURIComponent(aid)}/care-photos`, { method: 'GET' });
    if (!res?.success || !res.data) {
      throw new Error((res as any)?.error || 'Chargement impossible');
    }
    canComment.value = !!res.data.can_comment;
    canUpload.value = !!res.data.can_upload;
    const rows = (res.data.photos || []) as CarePhotoRow[];
    const thread = res.data.thread as { document_id?: string; comments?: CarePhotoComment[] } | null;
    const prevLen = photo.value?.comments?.length ?? 0;

    if (did) {
      const nextPhoto = rows.find((p) => String(p.id) === String(did)) ?? null;
      photo.value = nextPhoto;
      if (!silent) void loadPreview(String(did));
    } else if (thread?.document_id) {
      activeDocumentId.value = String(thread.document_id);
      photo.value = {
        id: String(thread.document_id),
        comments: thread.comments || [],
        created_at: '',
        mime_type: 'application/vnd.cary.exchange-thread',
      };
    } else {
      photo.value = {
        id: '',
        comments: [],
        created_at: '',
      };
    }

    emitThreadSeen();

    const nextLen = photo.value?.comments?.length ?? 0;
    if (silent && nextLen > prevLen) {
      await scrollToBottom();
    } else if (!silent) {
      await scrollToBottom();
    }
  } catch (e: any) {
    if (!silent) {
      toast.add({
        title: 'Discussion',
        description: e?.message || 'Impossible de charger les messages.',
        color: 'error',
      });
    }
  } finally {
    if (!silent) loading.value = false;
  }
}

watch(
  () => [open.value, props.appointmentId, props.documentId] as const,
  ([isOpened, , docId]) => {
    if (isOpened) {
      draft.value = '';
      zoomOpen.value = false;
      attachMenuOpen.value = false;
      activeDocumentId.value = docId ? String(docId) : null;
      void loadThread(false);
      startPoll();
    } else {
      stopPoll();
      photo.value = null;
      revokePreviewBlob();
      zoomOpen.value = false;
      attachMenuOpen.value = false;
      activeDocumentId.value = null;
    }
  },
);

onBeforeUnmount(() => {
  stopPoll();
  revokePreviewBlob();
});

async function sendComment() {
  const body = draft.value.trim();
  const aid = props.appointmentId;
  const did = effectiveDocumentId();
  if (!body || !aid || !canComment.value) return;
  sending.value = true;
  try {
    const payload: { body: string; medical_document_id?: string } = { body };
    if (did) payload.medical_document_id = did;
    const res = await apiFetch(`/appointments/${encodeURIComponent(aid)}/care-photo-comments`, {
      method: 'POST',
      body: payload,
    });
    if (res?.success) {
      const newDocId = (res as any)?.data?.medical_document_id;
      if (newDocId) activeDocumentId.value = String(newDocId);
      draft.value = '';
      toast.add({ title: 'Envoyé', color: 'success' });
      await loadThread(false);
      emit('commentPosted');
    } else {
      throw new Error((res as any)?.error || 'Erreur');
    }
  } catch (e: any) {
    toast.add({ title: 'Envoi', description: e?.message || 'Erreur', color: 'error' });
  } finally {
    sending.value = false;
  }
}
</script>
