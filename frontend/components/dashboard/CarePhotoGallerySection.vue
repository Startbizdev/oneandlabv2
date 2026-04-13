<template>
  <UCard v-if="visible" id="care-gallery-section" class="scroll-mt-24">
    <template #header>
      <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h2 class="text-lg font-normal flex items-center gap-2">
            <UIcon name="i-lucide-images" class="w-5 h-5" />
            Photos de soins
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 font-normal mt-1">
            {{ role === 'nurse'
              ? 'Échange avec le professionnel ayant créé ce rendez-vous.'
              : 'Photos partagées par l’infirmier ; commentaires sous chaque cliché.' }}
          </p>
        </div>
        <span
          v-if="!loading && photos.length > 0"
          class="text-xs text-gray-500 dark:text-gray-400 shrink-0"
        >
          {{ photos.length }} photo{{ photos.length > 1 ? 's' : '' }}
        </span>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Loading -->
      <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          v-for="i in 2"
          :key="i"
          class="animate-pulse overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div class="aspect-[4/3] bg-gray-200 dark:bg-gray-800" />
          <div class="space-y-2 p-3 border-t border-gray-100 dark:border-gray-800">
            <div class="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div class="h-7 w-full rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>

      <template v-else>
        <!-- Zone upload infirmier : compacte, alignée documents -->
        <div v-if="canUpload && role === 'nurse'" class="relative">
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            class="hidden"
            @change="onFileChange"
          />
          <div
            role="button"
            tabindex="0"
            class="flex cursor-pointer items-stretch gap-3 rounded-lg border border-dashed px-3 py-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:items-center sm:gap-4 sm:py-2"
            :class="[
              isDragging
                ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/30'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 hover:bg-gray-50/80 dark:hover:bg-gray-900/40',
            ]"
            @click="fileInputRef?.click()"
            @keydown.enter.prevent="fileInputRef?.click()"
            @keydown.space.prevent="fileInputRef?.click()"
            @dragenter.prevent="onDragEnter"
            @dragleave.prevent="onDragLeave"
            @dragover.prevent="onDragOver"
            @drop.prevent="onDrop"
          >
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              <UIcon
                :name="isDragging ? 'i-lucide-download' : 'i-lucide-upload'"
                class="h-4 w-4"
              />
            </div>
            <div class="min-w-0 flex-1 text-left">
              <p class="text-sm text-gray-900 dark:text-white">
                {{ isDragging ? 'Déposez l’image ici' : 'Glisser-déposer ou cliquer pour ajouter' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                JPG, PNG · max 25&nbsp;Mo
              </p>
            </div>
            <UButton
              color="primary"
              size="sm"
              variant="outline"
              :loading="uploading"
              class="pointer-events-auto shrink-0 self-center"
              icon="i-lucide-plus"
              @click.stop="fileInputRef?.click()"
            >
              Ajouter
            </UButton>
          </div>
        </div>

        <UEmpty
          v-if="photos.length === 0 && role === 'pro'"
          icon="i-lucide-image-off"
          title="Aucune photo"
          description="Les photos déposées par l’infirmier assigné apparaîtront ici ; vous pourrez commenter sous chaque cliché."
          variant="naked"
          class="py-6"
        />

        <div
          v-if="photos.length === 0 && role === 'nurse' && !canUpload"
          class="rounded-lg border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200/90"
        >
          <span class="font-medium">Galerie réservée à l’infirmier assigné.</span>
          <span class="text-amber-800/90 dark:text-amber-300/90"> Seul l’assigné peut ajouter des photos.</span>
        </div>

        <p
          v-if="photos.length === 0 && canUpload && role === 'nurse'"
          class="text-xs text-gray-500 dark:text-gray-400"
        >
          Astuce : une photo par étape utile pour le suivi avec le professionnel.
        </p>

        <!-- Grille photos -->
        <div v-if="photos.length > 0" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <article
            v-for="(photo, idx) in photos"
            :key="photo.id"
            class="flex flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50"
          >
            <button
              type="button"
              class="relative aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-gray-100 dark:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
              @click="openLightbox(idx)"
            >
              <img
                v-if="blobUrls[photo.id]"
                :src="blobUrls[photo.id]"
                :alt="photo.file_name"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400"
              >
                <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
                <span class="text-xs">Chargement…</span>
              </div>
            </button>

            <div class="flex flex-1 flex-col border-t border-gray-200 dark:border-gray-700 p-3 space-y-3">
              <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <UIcon name="i-lucide-clock" class="h-3.5 w-3.5 shrink-0" />
                <time :datetime="photo.created_at">{{ formatShortDate(photo.created_at) }}</time>
              </div>

              <div v-if="photo.comments?.length" class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Commentaires
                </p>
                <ul class="max-h-40 space-y-2 overflow-y-auto pr-0.5 scrollbar-thin">
                  <li
                    v-for="c in photo.comments"
                    :key="c.id"
                    class="flex gap-2 rounded-md border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60 px-2.5 py-2"
                  >
                    <span
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary-500/10 text-[10px] font-semibold text-primary-700 dark:text-primary-300"
                      :title="c.author_name"
                    >
                      {{ initials(c.author_name) }}
                    </span>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                        <span class="text-sm font-medium text-gray-900 dark:text-white">{{ c.author_name }}</span>
                        <time class="text-[11px] text-gray-400">{{
                          formatShortDate(c.created_at)
                        }}</time>
                      </div>
                      <p class="mt-0.5 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                        {{ c.body }}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
              <div v-else-if="canComment" class="text-xs text-gray-500 dark:text-gray-400">
                Aucun commentaire pour l’instant.
              </div>

              <div v-if="canComment" class="flex gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 p-1">
                <UInput
                  v-model="commentDraft[photo.id]"
                  size="sm"
                  color="neutral"
                  placeholder="Message…"
                  class="min-w-0 flex-1"
                  :ui="{ base: 'ring-0 border-0 bg-transparent shadow-none focus:ring-0' }"
                  @keydown.enter.prevent="sendComment(photo.id)"
                />
                <UButton
                  size="sm"
                  color="primary"
                  square
                  class="shrink-0"
                  :loading="sendingId === photo.id"
                  icon="i-lucide-send"
                  aria-label="Envoyer"
                  @click="sendComment(photo.id)"
                />
              </div>
            </div>
          </article>
        </div>
      </template>
    </div>

    <UModal
      v-model:open="lightboxOpen"
      fullscreen
      :ui="{
        content:
          'flex flex-col h-[100dvh] max-h-[100dvh] w-full max-w-none p-0 overflow-hidden rounded-none border-0',
      }"
    >
      <template #content="{ close }">
        <div class="flex h-full min-h-0 flex-col bg-zinc-950 text-white">
          <p class="sr-only">Photo {{ lightboxIndex + 1 }} sur {{ photos.length }}</p>
          <!-- Barre outils -->
          <div
            class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-2 py-2 sm:px-3"
          >
            <div class="flex items-center gap-0.5 sm:gap-1">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-chevron-left"
                class="text-white hover:bg-white/10"
                aria-label="Photo précédente"
                @click="prevLightbox"
              />
              <span class="min-w-[4rem] text-center text-xs font-medium tabular-nums text-white/90 sm:text-sm">
                {{ lightboxIndex + 1 }} / {{ photos.length }}
              </span>
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-chevron-right"
                class="text-white hover:bg-white/10"
                aria-label="Photo suivante"
                @click="nextLightbox"
              />
            </div>
            <div class="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-minus"
                class="text-white hover:bg-white/10"
                aria-label="Zoom arrière"
                :disabled="lightboxZoom <= 1"
                @click="lightboxZoomOut"
              />
              <span class="min-w-[2.75rem] text-center text-[11px] text-white/60 tabular-nums sm:text-xs">
                {{ lightboxZoomPercent }}%
              </span>
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-plus"
                class="text-white hover:bg-white/10"
                aria-label="Zoom avant"
                :disabled="lightboxZoom >= LIGHTBOX_ZOOM_MAX"
                @click="lightboxZoomIn"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-maximize-2"
                class="text-white hover:bg-white/10"
                aria-label="Ajuster à l’écran"
                @click="resetLightboxView"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-x"
                class="text-white hover:bg-white/10"
                aria-label="Fermer"
                @click="close"
              />
            </div>
          </div>
          <p
            class="shrink-0 border-b border-white/5 px-3 pb-2 text-[11px] leading-snug text-white/45 sm:px-4 sm:text-xs"
          >
            Molette pour zoomer · double-clic · glisser si zoom · pincement (mobile)
          </p>

          <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
            <!-- Viewport zoom / pan -->
            <div
              ref="zoomViewportRef"
              class="relative min-h-[40vh] flex-1 overflow-hidden bg-black touch-none select-none lg:min-h-0"
              :class="
                lightboxZoom > 1
                  ? isLightboxPanning
                    ? 'cursor-grabbing'
                    : 'cursor-grab'
                  : 'cursor-zoom-in'
              "
              @wheel.prevent="onLightboxWheel"
              @pointerdown="onLightboxPointerDown"
              @dblclick.prevent="onLightboxDoubleClick"
              @touchstart="onLightboxTouchStart"
              @touchmove.prevent="onLightboxTouchMove"
              @touchend="onLightboxTouchEnd"
            >
              <div
                class="pointer-events-none absolute left-1/2 top-1/2 origin-center will-change-transform"
                :style="{
                  transform: `translate(calc(-50% + ${lightboxPanX}px), calc(-50% + ${lightboxPanY}px)) scale(${lightboxZoom})`,
                }"
              >
                <img
                  v-if="lightboxPhoto && blobUrls[lightboxPhoto.id]"
                  :src="blobUrls[lightboxPhoto.id]"
                  class="max-h-[min(88dvh,900px)] max-w-[96vw] object-contain lg:max-h-[min(92dvh,920px)]"
                  draggable="false"
                  alt=""
                />
              </div>
            </div>

            <!-- Commentaires -->
            <div
              v-if="lightboxPhoto"
              class="flex max-h-[38vh] w-full shrink-0 flex-col border-t border-white/10 lg:max-h-none lg:w-[min(100%,400px)] lg:border-l lg:border-t-0 lg:border-white/10"
            >
              <div class="shrink-0 border-b border-white/10 px-4 py-2">
                <p class="text-xs text-white/50">
                  <UIcon name="i-lucide-clock" class="mr-1 inline h-3 w-3" />
                  {{ formatShortDate(lightboxPhoto.created_at) }}
                </p>
                <p class="text-sm font-medium text-white/90">Commentaires</p>
              </div>
              <div class="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
                <template v-if="lightboxPhoto.comments?.length">
                  <div
                    v-for="c in lightboxPhoto.comments"
                    :key="c.id"
                    class="rounded-md border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <div class="flex items-baseline justify-between gap-2">
                      <span class="text-sm font-medium text-white">{{ c.author_name }}</span>
                      <time class="shrink-0 text-[11px] text-white/40">{{
                        formatShortDate(c.created_at)
                      }}</time>
                    </div>
                    <p class="mt-1 text-sm leading-snug text-white/85 whitespace-pre-wrap">
                      {{ c.body }}
                    </p>
                  </div>
                </template>
                <p v-else class="text-sm text-white/45">
                  Aucun commentaire pour cette photo.
                </p>
              </div>
              <div
                v-if="canComment"
                class="shrink-0 border-t border-white/10 p-3"
              >
                <div class="flex gap-2">
                  <UInput
                    v-model="commentDraft[lightboxPhoto.id]"
                    size="sm"
                    color="neutral"
                    placeholder="Écrire un message…"
                    class="min-w-0 flex-1"
                    :ui="{
                      base: 'bg-white/10 border-white/20 text-white placeholder:text-white/40 ring-0 focus:ring-2 focus:ring-primary-500',
                    }"
                    @keydown.enter.prevent="sendComment(lightboxPhoto.id)"
                  />
                  <UButton
                    size="sm"
                    color="primary"
                    square
                    class="shrink-0"
                    :loading="sendingId === lightboxPhoto.id"
                    icon="i-lucide-send"
                    aria-label="Envoyer"
                    @click="sendComment(lightboxPhoto.id)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue';
import { apiFetch } from '~/utils/api';

const LIGHTBOX_ZOOM_MAX = 4;

const props = defineProps<{
  appointment: { id: string; type?: string; created_by_role?: string; status?: string };
  role: 'nurse' | 'pro';
}>();

const route = useRoute();
const router = useRouter();
const toast = useAppToast();
const config = useRuntimeConfig();

const visible = computed(
  () => props.appointment?.type === 'nursing' && props.appointment?.created_by_role === 'pro',
);

const loading = ref(true);
const uploading = ref(false);
const photos = ref<
  Array<{
    id: string;
    uploaded_by: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    created_at: string;
    comments: Array<{
      id: string;
      author_id: string;
      author_name: string;
      body: string;
      created_at: string;
    }>;
  }>
>([]);
const canUpload = ref(false);
const canComment = ref(false);
const blobUrls = ref<Record<string, string>>({});
const commentDraft = reactive<Record<string, string>>({});
const sendingId = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
let dragDepth = 0;

const lightboxOpen = ref(false);
const lightboxIndex = ref(0);
const lightboxPhoto = computed(() => photos.value[lightboxIndex.value] ?? null);
const careGalleryDeepLinkHandled = ref(false);

const zoomViewportRef = ref<HTMLElement | null>(null);
const lightboxZoom = ref(1);
const lightboxPanX = ref(0);
const lightboxPanY = ref(0);
const isLightboxPanning = ref(false);
let lightboxPanPointerId: number | null = null;
let lightboxPanStartClientX = 0;
let lightboxPanStartClientY = 0;
let lightboxPanStartPanX = 0;
let lightboxPanStartPanY = 0;
let pinchStartDistance = 0;
let pinchStartZoom = 1;
let touchSinglePan = false;
let pinchActive = false;

const lightboxZoomPercent = computed(() => Math.round(lightboxZoom.value * 100));

function clampLightboxZoom(z: number) {
  return Math.min(LIGHTBOX_ZOOM_MAX, Math.max(1, z));
}

function resetLightboxView() {
  lightboxZoom.value = 1;
  lightboxPanX.value = 0;
  lightboxPanY.value = 0;
  isLightboxPanning.value = false;
  lightboxPanPointerId = null;
  pinchActive = false;
  pinchStartDistance = 0;
  touchSinglePan = false;
  removeLightboxPanWindowListeners();
}

function removeLightboxPanWindowListeners() {
  if (typeof window === 'undefined') return;
  window.removeEventListener('pointermove', onLightboxWindowPointerMove);
  window.removeEventListener('pointerup', onLightboxWindowPointerUp);
  window.removeEventListener('pointercancel', onLightboxWindowPointerUp);
}

function onLightboxWindowPointerMove(e: PointerEvent) {
  if (!isLightboxPanning.value || e.pointerId !== lightboxPanPointerId) return;
  lightboxPanX.value = lightboxPanStartPanX + (e.clientX - lightboxPanStartClientX);
  lightboxPanY.value = lightboxPanStartPanY + (e.clientY - lightboxPanStartClientY);
}

function onLightboxWindowPointerUp(e: PointerEvent) {
  if (e.pointerId !== lightboxPanPointerId) return;
  isLightboxPanning.value = false;
  lightboxPanPointerId = null;
  removeLightboxPanWindowListeners();
}

function onLightboxPointerDown(e: PointerEvent) {
  if (e.pointerType === 'touch') return;
  if (e.button !== 0) return;
  if (lightboxZoom.value <= 1) return;
  e.preventDefault();
  isLightboxPanning.value = true;
  lightboxPanPointerId = e.pointerId;
  lightboxPanStartClientX = e.clientX;
  lightboxPanStartClientY = e.clientY;
  lightboxPanStartPanX = lightboxPanX.value;
  lightboxPanStartPanY = lightboxPanY.value;
  window.addEventListener('pointermove', onLightboxWindowPointerMove);
  window.addEventListener('pointerup', onLightboxWindowPointerUp);
  window.addEventListener('pointercancel', onLightboxWindowPointerUp);
}

function onLightboxWheel(e: WheelEvent) {
  const el = zoomViewportRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const fx = e.clientX - rect.left;
  const fy = e.clientY - rect.top;
  const ox = fx - rect.width / 2;
  const oy = fy - rect.height / 2;
  const factor = e.deltaY > 0 ? 0.92 : 1.08;
  const oldZ = lightboxZoom.value;
  let newZ = clampLightboxZoom(oldZ * factor);
  if (Math.abs(newZ - oldZ) < 0.001) return;
  const ratio = newZ / oldZ;
  lightboxPanX.value = ox + (lightboxPanX.value - ox) * ratio;
  lightboxPanY.value = oy + (lightboxPanY.value - oy) * ratio;
  lightboxZoom.value = newZ;
  if (newZ <= 1) {
    lightboxPanX.value = 0;
    lightboxPanY.value = 0;
  }
}

function onLightboxDoubleClick() {
  if (lightboxZoom.value <= 1.05) {
    lightboxZoom.value = 2.5;
  } else {
    resetLightboxView();
  }
}

function lightboxZoomIn() {
  lightboxZoom.value = clampLightboxZoom(lightboxZoom.value * 1.2);
}

function lightboxZoomOut() {
  const z = clampLightboxZoom(lightboxZoom.value / 1.2);
  lightboxZoom.value = z;
  if (z <= 1) {
    lightboxPanX.value = 0;
    lightboxPanY.value = 0;
  }
}

function getTouchDistance(touches: TouchList) {
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function onLightboxTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    pinchActive = true;
    touchSinglePan = false;
    pinchStartDistance = getTouchDistance(e.touches);
    pinchStartZoom = lightboxZoom.value;
  } else if (e.touches.length === 1 && lightboxZoom.value > 1) {
    touchSinglePan = true;
    const t = e.touches[0];
    lightboxPanStartClientX = t.clientX;
    lightboxPanStartClientY = t.clientY;
    lightboxPanStartPanX = lightboxPanX.value;
    lightboxPanStartPanY = lightboxPanY.value;
  }
}

function onLightboxTouchMove(e: TouchEvent) {
  if (e.touches.length === 2 && pinchActive && pinchStartDistance > 0) {
    e.preventDefault();
    const d = getTouchDistance(e.touches);
    lightboxZoom.value = clampLightboxZoom(pinchStartZoom * (d / pinchStartDistance));
    return;
  }
  if (e.touches.length === 1 && touchSinglePan && lightboxZoom.value > 1) {
    e.preventDefault();
    const t = e.touches[0];
    lightboxPanX.value = lightboxPanStartPanX + (t.clientX - lightboxPanStartClientX);
    lightboxPanY.value = lightboxPanStartPanY + (t.clientY - lightboxPanStartClientY);
  }
}

function onLightboxTouchEnd(e: TouchEvent) {
  if (e.touches.length < 2) {
    pinchActive = false;
    pinchStartDistance = 0;
    if (lightboxZoom.value <= 1) {
      lightboxPanX.value = 0;
      lightboxPanY.value = 0;
    }
  }
  if (e.touches.length === 0) {
    touchSinglePan = false;
  }
}

watch(lightboxIndex, () => {
  if (lightboxOpen.value) resetLightboxView();
});

watch(lightboxOpen, () => {
  resetLightboxView();
});

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

function initials(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function onDragEnter() {
  dragDepth += 1;
  isDragging.value = true;
}

function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) isDragging.value = false;
}

function onDragOver() {
  isDragging.value = true;
}

function onDrop(e: DragEvent) {
  dragDepth = 0;
  isDragging.value = false;
  const f = e.dataTransfer?.files?.[0];
  if (f) void uploadFile(f);
}

async function loadBlobForPhoto(photoId: string) {
  if (blobUrls.value[photoId]) return;
  const apiBase = config.public?.apiBase || '';
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const res = await fetch(`${apiBase}/medical-documents/${photoId}/download`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) return;
  const blob = await res.blob();
  blobUrls.value[photoId] = URL.createObjectURL(blob);
}

async function loadGallery() {
  if (!visible.value || !props.appointment?.id) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const res = await apiFetch(`/appointments/${props.appointment.id}/care-photos`, { method: 'GET' });
    if (res?.success && res.data) {
      photos.value = res.data.photos || [];
      canUpload.value = !!res.data.can_upload;
      canComment.value = !!res.data.can_comment;
      for (const p of photos.value) {
        commentDraft[p.id] = commentDraft[p.id] ?? '';
        await loadBlobForPhoto(p.id);
      }
      const q = route.query.careGallery;
      if (
        !careGalleryDeepLinkHandled.value &&
        (q === '1' || q === 'true')
      ) {
        careGalleryDeepLinkHandled.value = true;
        await nextTick();
        document.getElementById('care-gallery-section')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        if (photos.value.length) {
          lightboxIndex.value = 0;
          lightboxOpen.value = true;
        }
        const { careGallery: _omit, ...rest } = route.query;
        void router.replace({ query: rest });
      }
    }
  } catch (e: any) {
    toast.add({ title: 'Galerie', description: e?.message || 'Impossible de charger les photos.', color: 'error' });
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.appointment?.id,
  () => {
    careGalleryDeepLinkHandled.value = false;
    loadGallery();
  },
  { immediate: true },
);

watch(
  () => route.query.careGallery,
  (q) => {
    if ((q === '1' || q === 'true') && visible.value && props.appointment?.id) {
      careGalleryDeepLinkHandled.value = false;
      void loadGallery();
    }
  },
);

onUnmounted(() => {
  removeLightboxPanWindowListeners();
  Object.values(blobUrls.value).forEach((u) => URL.revokeObjectURL(u));
});

async function uploadFile(file: File) {
  if (!props.appointment?.id) return;
  const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
  const mime = file.type || '';
  if (!allowed.includes(mime)) {
    toast.add({ title: 'Format', description: 'Utilisez une image JPG ou PNG.', color: 'warning' });
    return;
  }
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    const apiBase = config.public?.apiBase || '';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const csrf = (typeof window !== 'undefined' && (window as any).__csrfTokenCache) || '';
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const res = await fetch(`${apiBase}/appointments/${props.appointment.id}/care-photos`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Upload échoué');
    }
    toast.add({ title: 'Photo ajoutée', color: 'success' });
    await loadGallery();
  } catch (e: any) {
    toast.add({ title: 'Upload', description: e?.message || 'Erreur', color: 'error' });
  } finally {
    uploading.value = false;
  }
}

async function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  await uploadFile(file);
}

async function sendComment(photoId: string) {
  const body = (commentDraft[photoId] || '').trim();
  if (!body || !props.appointment?.id) return;
  sendingId.value = photoId;
  try {
    const res = await apiFetch(`/appointments/${props.appointment.id}/care-photo-comments`, {
      method: 'POST',
      body: { medical_document_id: photoId, body },
    });
    if (res?.success) {
      commentDraft[photoId] = '';
      toast.add({ title: 'Message envoyé', color: 'success' });
      await loadGallery();
    } else {
      throw new Error((res as any)?.error || 'Erreur');
    }
  } catch (e: any) {
    toast.add({ title: 'Commentaire', description: e?.message || 'Erreur', color: 'error' });
  } finally {
    sendingId.value = null;
  }
}

function openLightbox(idx: number) {
  lightboxIndex.value = idx;
  lightboxOpen.value = true;
}

function nextLightbox() {
  if (!photos.value.length) return;
  lightboxIndex.value = (lightboxIndex.value + 1) % photos.value.length;
}

function prevLightbox() {
  if (!photos.value.length) return;
  lightboxIndex.value = (lightboxIndex.value - 1 + photos.value.length) % photos.value.length;
}
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgb(156 163 175 / 0.5);
  border-radius: 9999px;
}
</style>
