<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      leave-active-class="transition-opacity duration-300 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-[130] flex flex-col items-center justify-center gap-6 px-6 bg-[#fafafa]/96 backdrop-blur-md supports-[backdrop-filter]:bg-[#fafafa]/92 dark:bg-gray-950/96 dark:supports-[backdrop-filter]:bg-gray-950/92 pointer-events-auto"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          class="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
          style="
            background-image:
              linear-gradient(to right, rgb(15 23 42 / 0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(15 23 42 / 0.06) 1px, transparent 1px);
            background-size: 28px 28px;
          "
          aria-hidden="true"
        />

        <div class="relative z-[1] flex flex-col items-center gap-5">
          <div class="relative flex h-[5.25rem] w-[5.25rem] items-center justify-center overflow-visible sm:h-24 sm:w-24">
            <!-- Images catégories (si au moins une URL valide) -->
            <template v-if="displayUrls.length > 0">
              <Transition
                mode="out-in"
                enter-active-class="transition-opacity duration-500 ease-out"
                leave-active-class="transition-opacity duration-400 ease-in"
                enter-from-class="opacity-0"
                leave-to-class="opacity-0"
              >
                <img
                  :key="`${displayUrls[activeImageIndex]}-${activeImageIndex}`"
                  :src="displayUrls[activeImageIndex]"
                  alt=""
                  class="h-full w-full object-contain opacity-[0.92] dark:opacity-90"
                  @error="onImgError"
                />
              </Transition>
            </template>
            <!-- Sinon : rotation des icônes de soins (droplet / stéthoscope / icône métier) -->
            <template v-else-if="normalizedIcons.length > 0">
              <Transition
                mode="out-in"
                enter-active-class="transition-opacity duration-450 ease-out"
                leave-active-class="transition-opacity duration-350 ease-in"
                enter-from-class="opacity-0 scale-95"
                leave-to-class="opacity-0 scale-95"
              >
                <UIcon
                  :key="`${normalizedIcons[activeIconIndex]}-${activeIconIndex}`"
                  :name="normalizedIcons[activeIconIndex]"
                  class="h-10 w-10 text-primary-600/90 dark:text-primary-400/90 sm:h-11 sm:w-11"
                />
              </Transition>
            </template>
            <div v-else class="flex flex-col items-center justify-center gap-1">
              <UIcon name="i-lucide-heart-pulse" class="h-8 w-8 text-primary-600/90 dark:text-primary-400/90" />
              <span class="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Cary</span>
            </div>
          </div>

          <div class="max-w-sm text-center">
            <Transition
              mode="out-in"
              enter-active-class="transition duration-300 ease-out"
              leave-active-class="transition duration-200 ease-in"
              enter-from-class="opacity-0 translate-y-1"
              leave-to-class="opacity-0 -translate-y-0.5"
            >
              <p :key="phraseIndex" class="text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-200">
                {{ phrases[phraseIndex] }}
              </p>
            </Transition>
          </div>

          <div class="h-0.5 w-36 overflow-hidden rounded-full bg-gray-200/90 dark:bg-gray-700">
            <div class="celebrate-bar h-full w-1/3 rounded-full bg-primary-500/80 dark:bg-primary-400/80" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { shuffleArrayInPlace } from '~/utils/shuffle-array';
import { bookingDbg } from '~/utils/booking-celebration-debug';

const props = withDefaults(
  defineProps<{
    show: boolean;
    /** URLs résolues (catégories / vignettes) */
    images: string[];
    /** Icônes Nuxt UI (ex. i-lucide-droplet) — rotation si aucune image */
    rotateIcons?: string[];
  }>(),
  {
    images: () => [],
    rotateIcons: () => [],
  },
);

const phrases = [
  'Vérification de vos informations…',
  'Transmission sécurisée (HDS)…',
  'Coordination avec les professionnels de santé…',
  'Finalisation de votre demande…',
  'Encore un instant…',
];

const IMAGE_ROTATION_MS = 2400;
const PHRASE_ROTATION_MS = 3200;

const displayUrls = ref<string[]>([]);
const failedUrls = ref<Set<string>>(new Set());
const activeImageIndex = ref(0);
const activeIconIndex = ref(0);
const phraseIndex = ref(0);

const normalizedIcons = computed(() =>
  (props.rotateIcons ?? []).filter((x) => typeof x === 'string' && String(x).trim() !== ''),
);

let imageTimer: ReturnType<typeof setInterval> | null = null;
let iconTimer: ReturnType<typeof setInterval> | null = null;
let phraseTimer: ReturnType<typeof setInterval> | null = null;

function stopTimers() {
  if (imageTimer != null) {
    clearInterval(imageTimer);
    imageTimer = null;
  }
  if (iconTimer != null) {
    clearInterval(iconTimer);
    iconTimer = null;
  }
  if (phraseTimer != null) {
    clearInterval(phraseTimer);
    phraseTimer = null;
  }
}

function usableUrls(): string[] {
  return props.images.filter((u) => Boolean(u) && !failedUrls.value.has(String(u)));
}

function syncDisplayUrls() {
  const urls = usableUrls();
  shuffleArrayInPlace(urls);
  displayUrls.value = urls;
  activeImageIndex.value = 0;
  activeIconIndex.value = 0;
  phraseIndex.value = 0;
}

function onImgError() {
  const u = displayUrls.value[activeImageIndex.value];
  if (u) {
    const nextFailed = new Set(failedUrls.value);
    nextFailed.add(String(u));
    failedUrls.value = nextFailed;
  }
  const next = usableUrls();
  displayUrls.value = next.length ? [...next] : [];
  activeImageIndex.value = 0;
  bookingDbg('image overlay erreur chargement, urls restantes', next.length);
  nextTick(() => restartTimers());
}

function restartTimers() {
  stopTimers();
  const nImg = displayUrls.value.length;
  const nIc = normalizedIcons.value.length;

  if (nImg >= 2) {
    imageTimer = setInterval(() => {
      activeImageIndex.value = (activeImageIndex.value + 1) % nImg;
    }, IMAGE_ROTATION_MS);
  }

  if (nImg === 0 && nIc >= 2) {
    iconTimer = setInterval(() => {
      activeIconIndex.value = (activeIconIndex.value + 1) % nIc;
    }, IMAGE_ROTATION_MS);
  }

  phraseTimer = setInterval(() => {
    phraseIndex.value = (phraseIndex.value + 1) % phrases.length;
  }, PHRASE_ROTATION_MS);

  if (import.meta.dev) {
    bookingDbg('timers overlay', { nImg, nIc, phraseMs: PHRASE_ROTATION_MS });
  }
}

/** Resynchronise dès que l’overlay s’affiche ou que les sources changent (références computed stables côté parent). */
watch(
  () => [props.show, props.images, props.rotateIcons] as const,
  () => {
    if (!props.show) {
      stopTimers();
      failedUrls.value = new Set();
      return;
    }
    syncDisplayUrls();
    nextTick(() => restartTimers());
    bookingDbg('overlay sync', {
      urlCount: displayUrls.value.length,
      iconCount: normalizedIcons.value.length,
    });
  },
  { deep: true },
);

onUnmounted(() => stopTimers());
</script>

<style scoped>
@keyframes celebrate-bar-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

.celebrate-bar {
  animation: celebrate-bar-slide 2.2s ease-in-out infinite;
}
</style>
