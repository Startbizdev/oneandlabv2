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
                      Photo — échanges
                    </h2>
                    <p v-if="photoDateSubtitle" class="truncate text-[11px] text-muted">
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
                <!-- Photo dans le fil (comme une pièce jointe), pas une section séparée -->
                <div class="flex shrink-0 w-full justify-center px-0.5 pb-1">
                  <button
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
                </div>

                <div v-if="loading" class="flex min-h-[5rem] flex-1 items-center justify-center py-6">
                  <UIcon name="i-lucide-loader-2" class="h-7 w-7 animate-spin text-primary-500" />
                </div>
                <div v-else-if="!photo" class="py-4 text-center text-xs text-muted">
                  Indisponible
                </div>
                <template v-else-if="photo.comments?.length">
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
                v-if="canComment"
                class="shrink-0 border-t border-gray-100 bg-white px-3 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] dark:border-gray-800 dark:bg-gray-950 sm:px-4 sm:pb-3"
              >
                <!-- Composer : grille alignée bas, hauteur mini identique champ / bouton (44px), icône centrée au pixel près -->
                <div class="flex w-full min-w-0 items-end gap-2">
                  <div class="min-h-0 min-w-0 flex-1">
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
                v-else-if="photo && !canComment && !loading"
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
            class="care-photo-lightbox fixed inset-0 z-[9999] flex items-center justify-center bg-black/92 p-3 backdrop-blur-sm sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Visionneuse photo"
            @click.self="closeLightbox"
          >
            <button
              type="button"
              class="absolute right-3 top-3 z-10 rounded-full bg-white/15 p-2.5 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:right-5 sm:top-5"
              aria-label="Fermer la visionneuse"
              @click="closeLightbox"
            >
              <UIcon name="i-lucide-x" class="h-6 w-6" />
            </button>
            <!-- Image plein écran : pinch / zoom navigateur possibles (pas de rdv-no-mobile-zoom ici) -->
            <img
              :src="previewUrl"
              alt=""
              class="max-h-full max-w-full cursor-zoom-out select-none object-contain"
              draggable="false"
              @click.stop="closeLightbox"
            >
          </div>
        </Transition>
      </Teleport>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { apiFetch } from '~/utils/api';
import { carePhotoCommentsDigest } from '~/utils/care-photo-thread-digest';

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
  created_at: string;
  comments: CarePhotoComment[];
};

const props = defineProps<{
  appointmentId?: string | null;
  documentId?: string | null;
  viewerUserId?: string | null;
}>();

const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ commentPosted: []; threadLoaded: [payload: { documentId: string; digest: string }] }>();

const toast = useAppToast();
const config = useRuntimeConfig();

const loading = ref(false);
const sending = ref(false);
const photo = ref<CarePhotoRow | null>(null);
const canComment = ref(false);
const draft = ref('');
const scrollRef = ref<HTMLElement | null>(null);

const previewUrl = ref<string | null>(null);
let previewBlobUrl: string | null = null;
const previewLoading = ref(false);
const zoomOpen = ref(false);

function openLightbox() {
  if (previewLoading.value || !previewUrl.value) return;
  zoomOpen.value = true;
}

function closeLightbox() {
  zoomOpen.value = false;
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
  const did = props.documentId;
  const aid = props.appointmentId;
  if (!photo.value || !did || !aid) return;
  const digest = carePhotoCommentsDigest((photo.value.comments || []).map((c) => String(c.id)));
  emit('threadLoaded', { documentId: String(did), digest });
}

async function loadThread(silent = false) {
  const aid = props.appointmentId;
  const did = props.documentId;
  if (!aid || !did) {
    photo.value = null;
    return;
  }
  if (!silent) loading.value = true;
  try {
    const res = await apiFetch(`/appointments/${encodeURIComponent(aid)}/care-photos`, { method: 'GET' });
    if (!res?.success || !res.data) {
      throw new Error((res as any)?.error || 'Chargement impossible');
    }
    canComment.value = !!res.data.can_comment;
    const rows = (res.data.photos || []) as CarePhotoRow[];
    const nextPhoto = rows.find((p) => String(p.id) === String(did)) ?? null;
    const prevLen = photo.value?.comments?.length ?? 0;
    photo.value = nextPhoto;

    emitThreadSeen();

    if (silent && nextPhoto && (nextPhoto.comments?.length ?? 0) > prevLen) {
      await scrollToBottom();
    } else if (!silent) {
      await scrollToBottom();
    }

    if (!silent) {
      void loadPreview(String(did));
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
  ([isOpened]) => {
    if (isOpened) {
      draft.value = '';
      zoomOpen.value = false;
      void loadThread(false);
      startPoll();
    } else {
      stopPoll();
      photo.value = null;
      revokePreviewBlob();
      zoomOpen.value = false;
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
  const did = props.documentId;
  if (!body || !aid || !did) return;
  sending.value = true;
  try {
    const res = await apiFetch(`/appointments/${encodeURIComponent(aid)}/care-photo-comments`, {
      method: 'POST',
      body: { medical_document_id: did, body },
    });
    if (res?.success) {
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
