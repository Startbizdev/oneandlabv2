<template>
  <div class="patient-layout-root flex min-h-screen w-full min-w-0 flex-col overflow-x-hidden bg-app-canvas dark:bg-gray-950">
    <!-- Bandeau site unique (layout patient) ; repère : classe patient-layout-site-header -->
    <header
      class="patient-layout-site-header relative z-50 overflow-visible border-b border-gray-200 bg-white pt-[env(safe-area-inset-top)] dark:border-gray-800 dark:bg-gray-900"
      :class="isRendezVousFlow ? '' : 'sticky top-0'"
    >
      <div class="container mx-auto px-4">
        <div class="flex h-12 min-h-[48px] w-full min-w-0 items-center justify-between gap-2 sm:gap-3">
          <!-- Left: Hamburger mobile (patient) + Logo — flex-1 sur mobile pour pousser cloche + menu à droite sans les écraser -->
          <div class="flex min-w-0 flex-1 items-center gap-2 md:flex-initial md:shrink-0">
            <!-- Hamburger : visible uniquement sur mobile pour le patient -->
            <ClientOnly>
              <button
                v-if="isAuthenticated && (!user || user.role === 'patient')"
                type="button"
                @click="mobileMenuOpen = !mobileMenuOpen"
                class="md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label="Ouvrir le menu"
                :aria-expanded="mobileMenuOpen"
              >
                <UIcon :name="mobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'" class="h-5 w-5" />
              </button>
              <template #fallback>
                <div class="md:hidden h-9 w-9 shrink-0" aria-hidden="true" />
              </template>
            </ClientOnly>
            <NuxtLink 
              to="/" 
              aria-label="Cary - Accueil" 
              class="flex min-w-0 items-center gap-2 shrink-0"
            >
              <img 
                src="/images/logo-cary.png" 
                alt="Cary" 
                class="h-[22px] w-auto max-w-[min(104px,32vw)] object-contain object-left sm:h-[26px] sm:max-w-[118px]"
                loading="eager"
                decoding="async"
              />
            </NuxtLink>
          </div>

          <!-- Centre (patient) : liens — ClientOnly évite mismatch SSR/client si session uniquement côté client -->
          <ClientOnly>
            <nav
              v-if="isAuthenticated && (!user || user.role === 'patient')"
              class="hidden md:flex flex-1 items-center justify-center gap-0.5 min-w-0"
              aria-label="Navigation patient"
            >
              <NuxtLink
                to="/patient"
                class="rounded-lg px-2 py-1 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                :class="{ 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white': route.path === '/patient' }"
              >
                Mes rendez-vous
              </NuxtLink>
              <NuxtLink
                to="/rendez-vous/nouveau"
                class="rounded-lg px-2 py-1 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                Nouveau RDV
              </NuxtLink>
              <NuxtLink
                to="/patient/relatives"
                class="rounded-lg px-2 py-1 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                :class="{ 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white': route.path.startsWith('/patient/relatives') }"
              >
                Mes proches
              </NuxtLink>
              <NuxtLink
                to="/patient/reviews"
                class="rounded-lg px-2 py-1 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                :class="{ 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white': route.path.startsWith('/patient/reviews') }"
              >
                Mes avis
              </NuxtLink>
              <NuxtLink
                to="/profile"
                class="rounded-lg px-2 py-1 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                :class="{ 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white': route.path.startsWith('/profile') }"
              >
                Mon profil
              </NuxtLink>
            </nav>
            <template #fallback>
              <div class="hidden md:flex flex-1 min-w-0 min-h-9" aria-hidden="true" />
            </template>
          </ClientOnly>

          <!-- Right: Notifications + Avatar — shrink-0 pour ne jamais rogner la cloche / l’avatar -->
          <div class="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <!-- Si connecté : Notifications + Avatar -->
            <template v-if="isAuthenticated">
              <!-- Notifications -->
              <div class="relative z-10 shrink-0" ref="notificationsMenuRef">
                <button
                  type="button"
                  @click.stop="toggleNotificationsMenu"
                  class="relative flex h-9 w-9 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8"
                  :aria-label="`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`"
                  :aria-expanded="notificationsMenuOpen"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="h-5 w-5 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                  <span
                    v-if="unreadCount > 0"
                    class="absolute -right-0.5 -top-0.5 inline-grid min-h-4 min-w-4 place-items-center rounded-full border-2 border-white bg-red-500 px-[3px] text-center text-[10px] font-semibold tabular-nums leading-[10px] text-white shadow-sm box-border"
                  >
                    {{ unreadCount > 9 ? '9+' : unreadCount }}
                  </span>
                </button>
                
                <!-- Dropdown Notifications -->
                <div
                  v-if="notificationsMenuOpen"
                    class="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3rem+0.5rem)] z-[200] w-auto max-h-[min(24rem,calc(100dvh-5rem))] overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900 md:absolute md:inset-x-auto md:left-auto md:right-0 md:top-auto md:mt-2 md:z-50 md:w-80 md:max-h-96"
                >
                  <div v-if="notificationItems.length === 0 || (notificationItems.length === 1 && notificationItems[0].disabled)" class="px-4 py-3 text-sm text-gray-500 text-center">
                    Aucune notification
                  </div>
                  <template v-else>
                    <button
                      v-for="(item, index) in notificationItems"
                      :key="index"
                      @click="handleNotificationClick(item)"
                      :disabled="item.disabled"
                      class="w-full flex flex-col gap-1 px-4 py-3 text-sm transition-colors text-left"
                      :class="{
                        'opacity-50 cursor-not-allowed': item.disabled,
                        'text-gray-500 hover:bg-gray-50': item.isRead,
                        'text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-medium': !item.isRead
                      }"
                    >
                      <span :class="{ 'font-medium': !item.isRead }">{{ item.label }}</span>
                      <span v-if="item.description" class="text-xs text-gray-400">{{ item.description }}</span>
                    </button>
                  </template>
                </div>
              </div>

              <!-- Avatar + dropdown menu (détection rôle, liens adaptés) -->
              <div class="relative shrink-0" ref="userMenuRef">
                <button
                  type="button"
                  @click.stop="toggleUserMenu"
                  class="relative flex h-9 w-9 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded-full p-0.5 text-gray-600 ring-1 ring-transparent transition-[background-color,box-shadow,ring-color] hover:bg-gray-100 hover:ring-gray-200/80 active:bg-gray-200 dark:hover:bg-gray-800 dark:hover:ring-gray-600 sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8"
                  :aria-label="`Menu utilisateur: ${userDisplayName}`"
                  :aria-expanded="userMenuOpen"
                >
                  <UserAvatar
                    :src="user?.profile_image_url ?? user?.avatar"
                    :initial="(user?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()"
                    :alt="userDisplayName"
                    size="sm"
                    bare
                  />
                </button>
                
                <!-- Dropdown moderne avec en-tête profil + rôle -->
                <Transition
                  enter-active-class="transition ease-out duration-150"
                  enter-from-class="opacity-0 translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition ease-in duration-100"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 translate-y-1"
                >
                  <div
                    v-if="userMenuOpen"
                    class="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3rem+0.5rem)] z-[200] w-auto max-h-[min(24rem,calc(100dvh-5rem))] overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200/80 bg-white shadow-xl shadow-gray-200/50 dark:border-gray-700 dark:bg-gray-900 dark:shadow-none md:absolute md:inset-x-auto md:left-auto md:right-0 md:top-auto md:mt-2 md:z-50 md:w-64 md:max-h-none md:overflow-hidden"
                  >
                    <div class="px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div class="flex items-center gap-3">
                        <UserAvatar
                          :src="user?.profile_image_url ?? user?.avatar"
                          :initial="(user?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()"
                          :alt="userDisplayName"
                          size="lg"
                        />
                        <div class="min-w-0 flex-1">
                          <p class="text-sm font-normal text-gray-900 truncate">{{ userDisplayName }}</p>
                          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-100 text-primary-700">{{ roleLabel }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="py-1.5">
                      <template v-for="(item, index) in userMenuItems" :key="index">
                        <button
                          v-if="item.type !== 'divider'"
                          @click="handleUserMenuItemClick(item)"
                          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                        >
                          <UIcon v-if="item.icon" :name="item.icon" class="h-4 w-4 flex-shrink-0 text-gray-500" />
                          <span>{{ item.label }}</span>
                        </button>
                        <div v-else class="border-t border-gray-100 my-1" />
                      </template>
                    </div>
                  </div>
                </Transition>
              </div>
            </template>
            
            <!-- Invité : avatar minimal (style type Linear), menu Connexion / Inscription -->
            <template v-else-if="!isSharedRdvPage">
              <div class="relative" ref="guestMenuRef">
                <button
                  type="button"
                  @click.stop="toggleGuestMenu"
                  class="relative flex h-9 w-9 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 dark:focus-visible:outline-primary-400 sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8"
                  aria-label="Connexion ou inscription à votre compte"
                  :aria-expanded="guestMenuOpen"
                >
                  <span
                    class="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100/95 text-gray-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ring-1 ring-black/[0.04] transition-[border-color,box-shadow,color,background-color] sm:h-[30px] sm:w-[30px] dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-gray-300 dark:ring-white/10"
                    :class="
                      guestMenuOpen
                        ? 'border-primary-300 text-primary-700 shadow-md dark:border-primary-500/55 dark:text-primary-300'
                        : 'hover:border-primary-200 hover:text-primary-700 dark:hover:border-primary-500/40 dark:hover:text-primary-300'
                    "
                    aria-hidden="true"
                  >
                    <UIcon name="i-lucide-user" class="h-[17px] w-[17px] sm:h-[15px] sm:w-[15px]" />
                  </span>
                </button>
                <Transition
                  enter-active-class="transition ease-out duration-150"
                  enter-from-class="opacity-0 translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition ease-in duration-100"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 translate-y-1"
                >
                  <div
                    v-if="guestMenuOpen"
                    class="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3rem+0.5rem)] z-[200] w-auto rounded-xl border border-gray-200/80 bg-white shadow-xl shadow-gray-200/50 dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/30 md:absolute md:inset-x-auto md:left-auto md:right-0 md:top-auto md:mt-2 md:z-50 md:w-56"
                  >
                    <div class="py-1.5">
                      <NuxtLink
                        :to="loginUrl"
                        class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                        @click="guestMenuOpen = false"
                      >
                        <UIcon name="i-lucide-log-in" class="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                        Connexion
                      </NuxtLink>
                      <NuxtLink
                        :to="registerUrl"
                        class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                        @click="guestMenuOpen = false"
                      >
                        <UIcon name="i-lucide-user-plus" class="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                        Inscription
                      </NuxtLink>
                    </div>
                  </div>
                </Transition>
              </div>
            </template>
          </div>
        </div>
      </div>
      <!-- Barre de progression navigation (pleine largeur viewport, sous le bandeau) -->
      <div
        class="pointer-events-none absolute bottom-0 left-1/2 z-[61] h-[2px] w-screen max-w-none -translate-x-1/2 overflow-hidden bg-gray-200/80 dark:bg-gray-700/90"
        role="presentation"
        aria-hidden="true"
      >
        <div
          class="h-full origin-left bg-gradient-to-r from-primary-500 via-primary-500 to-primary-400 will-change-transform motion-safe:transition-[transform] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] dark:from-primary-400 dark:via-primary-400 dark:to-primary-300"
          :style="{
            transform: `scaleX(${navRouteProgress})`,
            opacity: navRouteBarOn ? Math.max(0.35, navRouteProgress || 0) : 0,
          }"
        />
      </div>
    </header>

    <!-- Liste RDV patient (mobile) : recherche collée sous le bandeau, pleine largeur -->
    <div
      v-if="showPatientHomeMobileSearch"
      class="md:hidden sticky top-[calc(env(safe-area-inset-top)+3rem+2px)] z-40 w-full border-b border-gray-200 bg-white py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="px-4">
        <PatientRdvListSearchField />
      </div>
    </div>

    <!-- Menu mobile : même rail que sidebar pro — dans le layout (pas Teleport body) pour que le voile soit bien au-dessus du <main> -->
    <div
      v-if="mobileMenuOpen"
      class="fixed inset-0 z-[1040] bg-black/50 transition-opacity duration-300 md:hidden dark:bg-black/60"
      aria-hidden="true"
      @click="mobileMenuOpen = false"
    />
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-[1050] flex w-[7.25rem] min-w-[7.25rem] max-w-[7.25rem] shrink-0 flex-col overflow-x-hidden border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-950 md:hidden',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
      ]"
      aria-label="Menu patient"
      :aria-hidden="!mobileMenuOpen"
    >
        <div
          class="relative flex h-14 w-full shrink-0 items-center justify-center border-b border-gray-200 dark:border-gray-800 px-2"
        >
          <button
            type="button"
            class="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900/60"
            aria-label="Fermer le menu"
            @click="mobileMenuOpen = false"
          >
            <UIcon name="i-lucide-x" class="h-5 w-5" />
          </button>
          <NuxtLink
            to="/"
            class="rounded-lg px-2 py-1.5 text-center transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:hover:bg-gray-900/60 dark:focus-visible:ring-offset-gray-950"
            aria-label="Retour à l'accueil"
            @click="mobileMenuOpen = false"
          >
            <img
              src="/images/logo-cary.png"
              alt="Cary"
              class="h-8 w-auto max-w-[4.5rem] object-contain"
              width="120"
              height="32"
              loading="eager"
              decoding="async"
            />
          </NuxtLink>
        </div>

        <div class="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden">
          <!-- ClientOnly : évite hydratation Iconify / menu mobile incohérent (icônes absentes ou texte doublonné côté outils a11y) — même pattern que layouts/dashboard.vue -->
          <ClientOnly>
            <nav class="px-2 py-3" aria-label="Navigation patient">
              <ul class="flex flex-col gap-0.5">
                <li v-for="item in patientMobileNavItems" :key="item.to">
                  <NuxtLink
                    :to="item.to"
                    class="group relative flex flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 text-center transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 active:scale-[0.98] dark:focus-visible:ring-offset-gray-950"
                    :class="
                      isPatientMobileNavActive(item.to)
                        ? ''
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900/60'
                    "
                    :aria-current="isPatientMobileNavActive(item.to) ? 'page' : undefined"
                    @click="mobileMenuOpen = false"
                  >
                    <span class="relative inline-flex shrink-0" aria-hidden="true">
                      <UIcon
                        :name="item.icon"
                        class="h-5 w-5 transition-colors duration-200"
                        :class="
                          isPatientMobileNavActive(item.to)
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-500 group-hover:text-primary-600 dark:text-gray-400 dark:group-hover:text-primary-400'
                        "
                      />
                    </span>
                    <span
                      class="max-w-full break-words border-b-[3px] pb-0.5 text-[10px] font-semibold leading-snug transition-colors duration-200 sm:text-[11px]"
                      :class="
                        isPatientMobileNavActive(item.to)
                          ? 'border-primary-600 text-gray-900 dark:border-primary-400 dark:text-white'
                          : 'border-transparent text-gray-600 group-hover:border-primary-600/35 group-hover:text-primary-700 dark:text-gray-400 dark:group-hover:border-primary-400/40 dark:group-hover:text-primary-300'
                      "
                    >
                      {{ item.label }}
                    </span>
                  </NuxtLink>
                </li>
              </ul>
            </nav>
            <template #fallback>
              <nav class="px-2 py-3" aria-label="Navigation patient">
                <div class="flex flex-col gap-2 px-1 py-2" aria-hidden="true">
                  <div
                    v-for="i in 5"
                    :key="i"
                    class="mx-auto h-11 w-full max-w-[4.5rem] rounded-lg bg-gray-100 animate-pulse dark:bg-gray-800"
                  />
                </div>
              </nav>
            </template>
          </ClientOnly>
        </div>
    </aside>

    <!-- Contenu : une zone scroll principale (évite double bandeau + scroll fragmenté sur mobile) -->
    <main
      class="relative z-0 flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-app-canvas dark:bg-gray-950 py-4 px-3 sm:py-6 sm:px-6 lg:px-8"
    >
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api'

const { holdCount } = useBookingApiHold()
const route = useRoute()
const router = useRouter()

/** Bandeau de progression pleine largeur (navigation SPA). */
const navRouteProgress = ref(0)
const navRouteBarOn = ref(false)
let navRouteFinishTimer: ReturnType<typeof setTimeout> | undefined
let removeRouterBeforeGuard: (() => void) | undefined
let removeRouterAfterGuard: (() => void) | undefined

function clearNavRouteFinishTimer() {
  if (navRouteFinishTimer !== undefined) {
    clearTimeout(navRouteFinishTimer)
    navRouteFinishTimer = undefined
  }
}

function startPatientNavProgress() {
  clearNavRouteFinishTimer()
  navRouteBarOn.value = true
  navRouteProgress.value = 0.05
  requestAnimationFrame(() => {
    navRouteProgress.value = 0.92
  })
}

function finishPatientNavProgress() {
  if (!navRouteBarOn.value && navRouteProgress.value < 0.01) return
  navRouteProgress.value = 1
  clearNavRouteFinishTimer()
  navRouteFinishTimer = globalThis.setTimeout(() => {
    navRouteBarOn.value = false
    navRouteProgress.value = 0
    navRouteFinishTimer = undefined
  }, 280)
}

const { isAuthenticated } = useAuth()
const { searchQuery, filtersSectionActive } = usePatientRdvListSearch()

const showPatientHomeMobileSearch = computed(
  () => route.path === '/patient' && isAuthenticated.value && filtersSectionActive.value,
)

watch(
  () => route.path,
  (p) => {
    if (p !== '/patient') searchQuery.value = '';
  },
)

// Cacher le bouton Connexion/Inscription sur la page partage RDV (/p/rdv/[token])
const isSharedRdvPage = computed(() => route.path.startsWith('/p/rdv/'))
/** Parcours prise de RDV : header non sticky (scroll naturel) */
const isRendezVousFlow = computed(() => route.path.startsWith('/rendez-vous'))
const { user, roleLabel, userMenuItems, userDisplayName } = useHeaderUserMenu()

const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)
const guestMenuOpen = ref(false)
const guestMenuRef = ref<HTMLElement | null>(null)
const mobileMenuOpen = ref(false)

const patientMobileNavItems = [
  { to: '/patient', label: 'Mes rendez-vous', icon: 'i-lucide-calendar' },
  { to: '/rendez-vous/nouveau', label: 'Nouveau RDV', icon: 'i-lucide-calendar-plus' },
  { to: '/patient/relatives', label: 'Mes proches', icon: 'i-lucide-users' },
  { to: '/patient/resultats', label: 'Résultats', icon: 'i-lucide-flask-conical' },
  { to: '/patient/reviews', label: 'Mes avis', icon: 'i-lucide-star' },
  { to: '/profile', label: 'Mon profil', icon: 'i-lucide-user' },
] as const

function isPatientMobileNavActive(to: string): boolean {
  const p = route.path
  if (to === '/patient') return p === '/patient'
  if (to === '/rendez-vous/nouveau') return p.startsWith('/rendez-vous')
  if (to === '/patient/relatives') return p.startsWith('/patient/relatives')
  if (to === '/patient/resultats') return p.startsWith('/patient/resultats')
  if (to === '/patient/reviews') return p.startsWith('/patient/reviews')
  if (to === '/profile') return p.startsWith('/profile')
  return false
}

// État du menu notifications
const notificationsMenuOpen = ref(false)
const notificationsMenuRef = ref<HTMLElement | null>(null)
const notifications = useState<any[]>('notifications.list', () => [])

function toggleNotificationsMenu() {
  if (!notificationsMenuOpen.value) {
    userMenuOpen.value = false
    guestMenuOpen.value = false
  }
  notificationsMenuOpen.value = !notificationsMenuOpen.value
}

function toggleUserMenu() {
  if (!userMenuOpen.value) {
    notificationsMenuOpen.value = false
    guestMenuOpen.value = false
  }
  userMenuOpen.value = !userMenuOpen.value
}

function toggleGuestMenu() {
  if (!guestMenuOpen.value) {
    notificationsMenuOpen.value = false
    userMenuOpen.value = false
  }
  guestMenuOpen.value = !guestMenuOpen.value
}

// URL de connexion avec redirection vers la page actuelle (path + query + hash)
const loginUrl = computed(() => `/login?returnTo=${encodeURIComponent(route.fullPath)}`)
const registerUrl = computed(() => `/patient/register?returnTo=${encodeURIComponent(route.fullPath)}`)

// Handler pour les clics sur les items du menu utilisateur
const handleUserMenuItemClick = (item: any) => {
  if (item.click) {
    item.click()
  }
  userMenuOpen.value = false
}

// Handler pour les clics sur les notifications
const handleNotificationClick = (item: any) => {
  if (item.disabled) return
  if (item.click) {
    item.click()
  }
  notificationsMenuOpen.value = false
}

// Marquer toutes les notifications comme lues quand on ouvre le menu
const markAllNotificationsAsRead = async () => {
  if (!isAuthenticated.value || !notifications.value.length) return
  
  const unreadNotifications = notifications.value.filter(n => !n.read_at)
  if (!unreadNotifications.length) return

  try {
    // Mettre à jour l'état local immédiatement pour un feedback instantané
    const now = new Date().toISOString()
    unreadNotifications.forEach(notif => {
      notif.read_at = now
    })
    
    // Marquer toutes les notifications non lues comme lues sur le serveur
    await Promise.all(
      unreadNotifications.map(async (notif) => {
        try {
          await apiFetch(`/notifications/${notif.id}/read`, {
            method: 'PUT'
          })
        } catch (error) {
          // En cas d'erreur, remettre la notification comme non lue
          notif.read_at = null
        }
      })
    )
    
    // Rafraîchir les notifications depuis le serveur pour synchroniser
    const res = await apiFetch('/notifications?limit=10', { method: 'GET' })
    if (res && res.success) {
      notifications.value = res.data
    }
  } catch (error) {
    console.error('Erreur lors du marquage des notifications:', error)
  }
}

// Watcher pour marquer les notifications comme lues quand on ouvre le menu
watch(notificationsMenuOpen, async (isOpen) => {
  if (isOpen) {
    await markAllNotificationsAsRead()
  }
})

// Fermer le menu mobile au changement de route
watch(() => route.path, () => {
  mobileMenuOpen.value = false
  guestMenuOpen.value = false
})

// Fermer les menus quand on clique en dehors
const handleClickOutside = (event: MouseEvent) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    userMenuOpen.value = false
  }
  if (guestMenuRef.value && !guestMenuRef.value.contains(event.target as Node)) {
    guestMenuOpen.value = false
  }
  if (notificationsMenuRef.value && !notificationsMenuRef.value.contains(event.target as Node)) {
    notificationsMenuOpen.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)

  removeRouterBeforeGuard = router.beforeEach((to, from) => {
    if (to.fullPath !== from.fullPath) startPatientNavProgress()
    return true
  })
  removeRouterAfterGuard = router.afterEach(() => {
    finishPatientNavProgress()
  })

  if (isAuthenticated.value) {
    // Charger les notifications immédiatement
    const res = await apiFetch('/notifications?limit=10', { method: 'GET' })
    if (res && res.success) notifications.value = res.data
    // Démarrer le polling
    startPolling()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  clearNavRouteFinishTimer()
  removeRouterBeforeGuard?.()
  removeRouterAfterGuard?.()
})

const unreadCount = computed(
  () => notifications.value.filter(n => !n.read_at).length
)

const notificationItems = computed(() => {
  if (!notifications.value.length) {
    return [
      {
        label: 'Aucune notification',
        disabled: true,
      },
    ]
  }

  return notifications.value.slice(0, 10).map((notif) => ({
    label: notif.title ? `${notif.title}${notif.message ? ` · ${notif.message}` : ''}` : (notif.message || 'Notification'),
    description: notif.created_at ? new Date(notif.created_at).toLocaleString('fr-FR') : undefined,
    isRead: !!notif.read_at,
    click: () => {
      const data = typeof notif.data === 'string'
        ? (() => { try { return JSON.parse(notif.data); } catch { return {}; } })()
        : (notif.data || {});
      const aptId = notif.appointment_id || data?.appointment_id;
      if (!aptId) return;
      const role = user.value?.role;
      if (
        (notif.type === 'care_gallery_photo' || notif.type === 'care_gallery_comment') &&
        (role === 'pro' || role === 'nurse')
      ) {
        const base = role === 'pro' ? '/pro' : '/nurse';
        const pid = data?.photo_id != null && String(data.photo_id).trim() !== '' ? String(data.photo_id) : null;
        void navigateTo({
          path: `${base}/appointments/${aptId}`,
          query: { careGallery: '1', ...(pid ? { carePhoto: pid } : {}) },
        });
        return;
      }
      if (role === 'patient') {
        if (notif.type === 'results_ready' || notif.type === 'results_available') {
          navigateTo('/patient/resultats');
          return;
        }
        navigateTo(`/patient/appointments/${aptId}`);
      } else if (role === 'nurse') {
        if (notif.type === 'results_available') {
          navigateTo('/nurse/resultats');
          return;
        }
        navigateTo(`/nurse/appointments/${aptId}`);
      } else if (role === 'lab' || role === 'subaccount') {
        navigateTo(`/lab/appointments/${aptId}`);
      } else if (role === 'pro') {
        if (notif.type === 'results_available') {
          navigateTo('/pro/resultats');
          return;
        }
        navigateTo(`/pro/appointments/${aptId}`);
      } else if (role === 'preleveur') {
        navigateTo(`/preleveur/appointments/${aptId}`);
      } else if (role === 'super_admin') {
        navigateTo(`/admin/appointments/${aptId}`);
      }
    },
  }))
})

const { start: startPolling } = usePolling(
  async () => {
    if (isAuthenticated.value) {
      const res = await apiFetch('/notifications?limit=10', { method: 'GET' })
      if (res && res.success) notifications.value = [...res.data]
    }
  },
  30000,
  { shouldSkip: () => holdCount.value > 0 },
)
</script>

