<template>
  <aside
    v-if="visible"
    ref="bannerRef"
    aria-label="Application Cary"
    class="relative z-[210] w-full border-b border-gray-200 bg-white pt-[env(safe-area-inset-top)] dark:border-gray-800 dark:bg-gray-950"
  >
    <div class="flex items-center gap-2 py-2 pr-3 pl-1">
      <button
        type="button"
        aria-label="Fermer le bandeau de l'application"
        class="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        @click="dismiss"
      >
        <UIcon name="i-lucide-x" class="h-5 w-5" />
      </button>
      <img
        src="/apple-touch-icon.png"
        alt=""
        width="44"
        height="44"
        class="h-11 w-11 shrink-0 rounded-[10px] border border-gray-200 dark:border-gray-800"
      >
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">Cary</p>
        <p class="truncate text-xs text-gray-500 dark:text-gray-400">Plus rapide et plus simple dans l'app</p>
      </div>
      <UButton
        :to="IOS_APP_STORE_URL"
        external
        target="_blank"
        rel="noopener"
        color="primary"
        size="md"
        class="min-h-11 shrink-0 rounded-full px-4 font-semibold"
      >
        Ouvrir
      </UButton>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  APP_BANNER_DISMISS_KEY,
  APP_BANNER_EMBED_KEY,
  IOS_APP_STORE_URL,
  shouldShowCustomAppBanner,
} from '~/utils/app-banner'

const route = useRoute()
const visible = ref(false)
const bannerRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null
let frame = 0

function readStorage(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key)
  } catch {
    return null
  }
}

function writeStorage(storage: () => Storage, key: string, value: string) {
  try {
    storage().setItem(key, value)
  } catch {
    // Navigation privée / stockage bloqué : le bandeau reste fonctionnel.
  }
}

/** La WebView de l'app n'ajoute `?embed=1` qu'à la première URL : on le garde pour la session. */
function isEmbeddedSession(): boolean {
  if (route.query.embed === '1') {
    writeStorage(() => window.sessionStorage, APP_BANNER_EMBED_KEY, '1')
    return true
  }
  return readStorage(() => window.sessionStorage, APP_BANNER_EMBED_KEY) === '1'
}

/** Décale le header fixe marketing et les panneaux fixes sous le bandeau tant qu'il est visible. */
function syncOffset() {
  frame = 0
  const root = document.documentElement
  const height = visible.value ? (bannerRef.value?.offsetHeight ?? 0) : 0
  root.style.setProperty('--app-banner-height', `${height}px`)
  root.style.setProperty('--app-banner-offset', `${Math.max(0, height - window.scrollY)}px`)
}

function scheduleSync() {
  if (!frame) frame = window.requestAnimationFrame(syncOffset)
}

function dismiss() {
  writeStorage(() => window.localStorage, APP_BANNER_DISMISS_KEY, String(Date.now()))
  visible.value = false
}

function teardown() {
  window.removeEventListener('scroll', scheduleSync)
  window.removeEventListener('resize', scheduleSync)
  resizeObserver?.disconnect()
  resizeObserver = null
  if (frame) window.cancelAnimationFrame(frame)
  frame = 0
  document.documentElement.style.removeProperty('--app-banner-height')
  document.documentElement.style.removeProperty('--app-banner-offset')
}

watch(visible, async (shown) => {
  if (!shown) {
    teardown()
    return
  }
  await nextTick()
  syncOffset()
  window.addEventListener('scroll', scheduleSync, { passive: true })
  window.addEventListener('resize', scheduleSync, { passive: true })
  if (bannerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleSync)
    resizeObserver.observe(bannerRef.value)
  }
})

watch(
  () => route.query.embed,
  () => {
    if (visible.value && isEmbeddedSession()) visible.value = false
  },
)

onMounted(() => {
  visible.value = shouldShowCustomAppBanner({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    embedded: isEmbeddedSession(),
    dismissedAtRaw: readStorage(() => window.localStorage, APP_BANNER_DISMISS_KEY),
    now: Date.now(),
  })
})

onBeforeUnmount(teardown)
</script>
