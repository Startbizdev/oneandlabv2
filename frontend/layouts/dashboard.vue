<template>
  <div class="flex flex-col h-screen bg-app-canvas dark:bg-gray-950">
    <ClientOnly>
      <SubscriptionBanner />
      <template #fallback>
        <div class="w-full h-0" aria-hidden="true" />
      </template>
    </ClientOnly>
    <div class="flex flex-1 min-h-0">
    <!-- Sidebar -->
    <aside
      :class="[
        /* Largeur rail fixe : min/max + shrink-0 + overflow-x évite que le flex ou le contenu « élargisse » la colonne (bug flex min-width:auto). */
        'flex flex-col bg-white border-r border-gray-200 w-[7.25rem] min-w-[7.25rem] max-w-[7.25rem] shrink-0 overflow-x-hidden fixed md:static inset-y-0 left-0 z-[1000] md:z-auto transition-transform duration-300 ease-in-out',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      ]"
    >
      <!-- Header Sidebar -->
      <div class="flex h-[60px] w-full items-center justify-center border-b border-gray-200 px-2">
        <NuxtLink
          to="/"
          class="rounded-lg px-1 py-1.5 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:hover:bg-gray-900/60 dark:focus-visible:ring-offset-gray-950"
          aria-label="Cary — Accueil"
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

      <!-- Navigation -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll">
        <!-- Navigation principale : icône au-dessus, libellé souligné si actif (rail étroit) -->
        <ClientOnly>
          <nav class="flex-1 px-2 py-3" aria-label="Navigation principale">
            <ul class="flex flex-col gap-0.5">
              <li v-for="item in navigationItems[0]" :key="item.to">
                <NuxtLink
                  :to="item.to"
                  @click="(e) => handleSidebarNavigate(e, item.to)"
                  :class="[
                    'group relative flex flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 text-center transition-colors duration-200 ease-in-out',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-950',
                    'active:scale-[0.98]',
                    item.active ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-900/60',
                  ]"
                  :aria-current="item.active ? 'page' : undefined"
                  :aria-busy="sidebarPendingTo === item.to && isSidebarCalendarLink(item.to) ? 'true' : undefined"
                  :title="item.to === '/nurse/demandes' && nurseDemandesSidebarBadge > 0 ? `${nurseDemandesSidebarBadge} soin(s) à accepter` : undefined"
                >
                  <span class="relative inline-flex shrink-0">
                    <UIcon
                      :name="sidebarNavIcon(item)"
                      :class="[
                        'h-5 w-5 transition-colors duration-200',
                        sidebarPendingTo === item.to && isSidebarCalendarLink(item.to) ? 'animate-spin' : '',
                        item.active
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-500 group-hover:text-primary-600 dark:text-gray-400 dark:group-hover:text-primary-400',
                      ]"
                      aria-hidden="true"
                    />
                    <span
                      v-if="item.to === '/nurse/demandes' && nurseDemandesSidebarBadge > 0"
                      class="absolute -right-2 -top-1 flex min-h-[1rem] min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white shadow-sm tabular-nums"
                      aria-hidden="true"
                    >
                      {{ nurseDemandesSidebarBadge > 99 ? '99+' : nurseDemandesSidebarBadge }}
                    </span>
                  </span>
                  <span
                    class="max-w-full break-words border-b-[3px] pb-0.5 text-[10px] font-semibold leading-snug transition-colors duration-200 sm:text-[11px]"
                    :class="
                      item.active
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

          <!-- Navigation secondaire -->
          <nav
            v-if="navigationItems[1]?.length"
            class="border-t border-gray-200 px-2 py-3"
            aria-label="Navigation secondaire"
          >
            <ul class="flex flex-col gap-0.5">
              <li v-for="item in navigationItems[1]" :key="item.to">
                <NuxtLink
                  :to="item.to"
                  @click="(e) => handleSidebarNavigate(e, item.to)"
                  :class="[
                    'group relative flex flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 text-center transition-colors duration-200 ease-in-out',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-950',
                    'active:scale-[0.98]',
                    item.active ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-900/60',
                  ]"
                  :aria-current="item.active ? 'page' : undefined"
                  :aria-busy="sidebarPendingTo === item.to && isSidebarCalendarLink(item.to) ? 'true' : undefined"
                  :title="item.to === '/nurse/demandes' && nurseDemandesSidebarBadge > 0 ? `${nurseDemandesSidebarBadge} soin(s) à accepter` : undefined"
                >
                  <span class="relative inline-flex shrink-0">
                    <UIcon
                      :name="sidebarNavIcon(item)"
                      :class="[
                        'h-5 w-5 transition-colors duration-200',
                        sidebarPendingTo === item.to && isSidebarCalendarLink(item.to) ? 'animate-spin' : '',
                        item.active
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-500 group-hover:text-primary-600 dark:text-gray-400 dark:group-hover:text-primary-400',
                      ]"
                      aria-hidden="true"
                    />
                    <span
                      v-if="item.to === '/nurse/demandes' && nurseDemandesSidebarBadge > 0"
                      class="absolute -right-2 -top-1 flex min-h-[1rem] min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white shadow-sm tabular-nums"
                      aria-hidden="true"
                    >
                      {{ nurseDemandesSidebarBadge > 99 ? '99+' : nurseDemandesSidebarBadge }}
                    </span>
                  </span>
                  <span
                    class="max-w-full break-words border-b-[3px] pb-0.5 text-[10px] font-semibold leading-snug transition-colors duration-200 sm:text-[11px]"
                    :class="
                      item.active
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
            <nav class="flex-1 px-2 py-3" aria-label="Navigation principale">
              <div class="mx-auto h-8 w-12 rounded bg-gray-100 animate-pulse dark:bg-gray-800" />
            </nav>
          </template>
        </ClientOnly>
      </div>
    </aside>

    <!-- Overlay pour mobile (juste sous la sidebar, au-dessus du contenu / cartes) -->
    <div
      v-if="mobileSidebarOpen"
      class="fixed inset-0 bg-black/50 z-[990] md:hidden"
      @click="mobileSidebarOpen = false"
    />

    <!-- Zone principale : header et page dans le même flux scroll (pas de bandeau « collé » au-dessus) -->
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-canvas dark:bg-gray-950">
        <header class="relative z-50 shrink-0 overflow-visible bg-white border-b border-gray-200 px-4 md:px-6 h-[60px] flex items-center">
          <div class="flex w-full min-w-0 items-center justify-between gap-3 sm:gap-4">
          <!-- Menu mobile -->
          <button
            @click="mobileSidebarOpen = !mobileSidebarOpen"
            class="md:hidden shrink-0 h-9 w-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <UIcon name="i-lucide-menu" class="h-5 w-5" />
          </button>

          <!-- Mobile : occupe l’espace entre menu et actions (fil d’Ariane masqué) -->
          <div class="min-w-0 flex-1 md:hidden" aria-hidden="true" />

          <!-- Breadcrumb : masqué sur mobile pour éviter chevauchement -->
          <ClientOnly>
            <nav class="hidden md:flex items-center gap-2 flex-1 min-w-0" aria-label="Breadcrumb">
              <template v-for="(item, index) in breadcrumbItems" :key="index">
                <NuxtLink
                  v-if="item.to && index < breadcrumbItems.length - 1"
                  :to="item.to"
                  class="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 transition-colors shrink-0"
                >
                  <UIcon v-if="item.icon" :name="item.icon" class="h-4 w-4 shrink-0" />
                  <span class="truncate">{{ item.label }}</span>
                </NuxtLink>
                <span
                  v-else
                  class="flex items-center gap-2 text-sm font-medium text-gray-900 min-w-0"
                >
                  <UIcon v-if="item.icon" :name="item.icon" class="h-4 w-4 shrink-0" />
                  <span class="truncate">{{ item.label }}</span>
                </span>
                <UIcon
                  v-if="index < breadcrumbItems.length - 1"
                  name="i-lucide-chevron-right"
                  class="h-4 w-4 text-gray-400 mx-1 shrink-0"
                />
              </template>
            </nav>
            <template #fallback>
              <nav class="hidden md:flex items-center gap-2 flex-1 min-w-0" aria-label="Breadcrumb">
                <div class="h-5 w-32 bg-gray-100 rounded animate-pulse"></div>
              </nav>
            </template>
          </ClientOnly>

          <!-- Actions Header -->
          <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <!-- Notifications -->
            <div class="relative z-10 shrink-0" ref="notificationsMenuRef">
              <button
                type="button"
                @click.stop="toggleNotificationsMenu"
                class="relative flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 sm:h-9 sm:w-9 sm:min-h-9 sm:min-w-9 touch-manipulation"
                :aria-label="`Notifications${bellBadgeCount > 0 ? ` (${bellBadgeCount} en attente)` : ''}`"
                :aria-expanded="notificationsMenuOpen"
              >
                <UIcon name="i-lucide-bell" class="h-5 w-5" />
                <span
                  v-if="bellBadgeCount > 0"
                  class="absolute top-1 right-1 inline-grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-[3px] text-center text-[10px] font-semibold tabular-nums leading-[10px] text-white shadow-sm box-border"
                >
                  {{ bellBadgeCount > 9 ? '9+' : bellBadgeCount }}
                </span>
              </button>
              
              <!-- Dropdown Notifications -->
              <div
                v-if="notificationsMenuOpen"
                class="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.75rem)] z-[200] w-auto max-h-[min(24rem,calc(100dvh-5rem))] overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg md:absolute md:inset-x-auto md:left-auto md:right-0 md:top-auto md:mt-2 md:z-50 md:w-80 md:max-h-96"
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
                    class="w-full flex gap-3 px-4 py-3 text-sm transition-colors text-left"
                    :class="{
                      'opacity-50 cursor-not-allowed': item.disabled,
                      'text-gray-500 hover:bg-gray-50': item.isRead,
                      'text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-medium': !item.isRead
                    }"
                  >
                    <span class="shrink-0 mt-0.5 text-primary">
                      <UIcon :name="item.icon || 'i-lucide-bell'" class="w-4 h-4" />
                    </span>
                    <span class="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span :class="{ 'font-medium': !item.isRead }" class="whitespace-normal break-words">{{ item.label }}</span>
                      <span v-if="item.description" class="text-xs text-gray-400">{{ item.description }}</span>
                      <span v-if="item.message" class="text-xs text-gray-500 whitespace-normal break-words">{{ item.message }}</span>
                    </span>
                  </button>
                </template>
              </div>
            </div>

            <!-- User Menu (même gabarit que la cloche) -->
            <div class="relative z-10 shrink-0" ref="userMenuRef">
              <ClientOnly>
                <button
                  type="button"
                  @click.stop="toggleUserMenu"
                  class="relative flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 sm:h-9 sm:w-9 sm:min-h-9 sm:min-w-9 touch-manipulation"
                  :aria-label="`Menu utilisateur: ${headerUserDisplayName}`"
                  :aria-expanded="userMenuOpen"
                >
                  <UserAvatar
                    :src="headerAvatarSrc"
                    :initial="headerAvatarInitial"
                    :alt="headerUserDisplayName"
                    size="sm"
                    bare
                  />
                </button>
                <template #fallback>
                  <div class="h-9 w-9 rounded-lg bg-gray-100 animate-pulse shrink-0" />
                </template>
              </ClientOnly>
              
              <!-- Dropdown Menu -->
              <div
                v-if="userMenuOpen"
                class="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.75rem)] z-[200] w-auto max-h-[min(24rem,calc(100dvh-5rem))] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg md:absolute md:inset-x-auto md:left-auto md:right-0 md:top-auto md:mt-2 md:z-50 md:w-56 md:max-h-none"
              >
                <template v-for="(item, index) in headerUserMenuItems" :key="index">
                  <button
                    v-if="item.type !== 'divider'"
                    @click="handleUserMenuItemClick(item)"
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                  >
                    <UIcon v-if="item.icon" :name="item.icon" class="h-4 w-4" />
                    <span>{{ item.label }}</span>
                  </button>
                  <div v-else class="border-t border-gray-200 my-1" />
                </template>
              </div>
            </div>
          </div>
          </div>
        </header>

        <div
          class="dashboard-main-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6 md:py-6"
        >
          <slot />
        </div>
      </main>
    </div>
    </div>
  </div>

  <!-- Popup de notification pour nouveaux RDV (infirmiers, lab, sous-compte, préleveur) — s'ouvre automatiquement au polling -->
  <ClientOnly>
    <Teleport to="body">
      <AppointmentModal
        v-if="['nurse', 'lab', 'subaccount', 'preleveur'].includes(user?.role ?? '')"
        v-model="showAppointmentModal"
        :appointment="selectedAppointment"
        :role="(user?.role === 'subaccount' ? 'subaccount' : user?.role === 'lab' ? 'lab' : user?.role === 'preleveur' ? 'preleveur' : 'nurse')"
        @accepted="handleAppointmentAccepted"
        @refused="handleAppointmentRefused"
      />
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { apiFetch } from "~/utils/api";
import { isPendingIncomingOffer, isOfferModalSnoozed } from "~/utils/appointment-offer";
import { isBloodTestAppointment } from "~/utils/appointment-type-rules";
import { formatBellNotificationLines, sanitizeNotificationText } from "~/utils/notification-display";

const { user, logout, fetchCurrentUser } = useAuth();
const route = useRoute();
const router = useRouter();
const { holdCount } = useBookingApiHold();
const skipPollDuringBooking = () => holdCount.value > 0;

const notifications = useState<any[]>("notifications.list", () => []);

// S'assurer que les infos utilisateur sont complètes (une seule fois pour éviter boucle infinie)
const hasRefetchedIncompleteUser = ref(false);
watch(() => user.value, async (currentUser) => {
  if (!currentUser) {
    hasRefetchedIncompleteUser.value = false;
    return;
  }
  if (hasRefetchedIncompleteUser.value) return;
  if (!currentUser.first_name || !currentUser.last_name) {
    hasRefetchedIncompleteUser.value = true;
    await fetchCurrentUser();
  }
}, { immediate: true });

// État partagé : la page profil met à jour cette URL pour que le header affiche la même photo
const profileImageForHeader = useState<string | null>('profileImageForHeader', () => null);
// URL de l'avatar pour le header : priorité à la photo de la page profil, sinon user
const headerAvatarSrc = computed(() => {
  const fromProfilePage = profileImageForHeader.value;
  if (fromProfilePage) return fromProfilePage;
  const u = user.value;
  if (!u) return null;
  return u.profile_image_url ?? u.avatar ?? null;
});


// État de la sidebar mobile
const mobileSidebarOpen = ref(false);

// État du menu utilisateur
const userMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

// État du menu notifications
const notificationsMenuOpen = ref(false);
const notificationsMenuRef = ref<HTMLElement | null>(null);

/** Un seul panneau ouvert (responsive : les deux panels fixed se superposent sinon). */
function toggleNotificationsMenu() {
  if (!notificationsMenuOpen.value) {
    userMenuOpen.value = false;
  }
  notificationsMenuOpen.value = !notificationsMenuOpen.value;
}

function toggleUserMenu() {
  if (!userMenuOpen.value) {
    notificationsMenuOpen.value = false;
  }
  userMenuOpen.value = !userMenuOpen.value;
}

/** Lien vers le calendrier : spinner dans la sidebar le temps du chargement de la page. */
const sidebarPendingTo = ref<string | null>(null);

function isSidebarCalendarLink(to: string): boolean {
  return to.includes('/calendar');
}

function sidebarNavIcon(item: { to: string; icon: string }): string {
  if (sidebarPendingTo.value === item.to && isSidebarCalendarLink(item.to)) {
    return 'i-lucide-loader-2';
  }
  return item.icon;
}

// Navigation sidebar : en général laisser NuxtLink faire le travail.
// Intervention uniquement pour le calendrier (spinner le temps du chargement) — évite preventDefault systématique
// qui peut bloquer les clics après certaines pages (ex. /admin/abonnements) si router.push échoue sans fallback.
const handleSidebarNavigate = async (e: MouseEvent, to: string) => {
  mobileSidebarOpen.value = false;
  if (!isSidebarCalendarLink(to)) {
    return;
  }
  const current = route.path.replace(/\/$/, '') || '/';
  const target = to.replace(/\/$/, '') || '/';
  if (current === target) return;
  e.preventDefault();
  sidebarPendingTo.value = to;
  try {
    await router.push(to);
  } finally {
    sidebarPendingTo.value = null;
  }
};

// Handler pour les clics sur les items du menu utilisateur
const handleUserMenuItemClick = (item: any) => {
  if (item.click) {
    item.click();
  }
  userMenuOpen.value = false;
};

// Handler pour les clics sur les notifications
const handleNotificationClick = (item: any) => {
  if (item.disabled) return;
  if (item.click) {
    item.click();
  }
  notificationsMenuOpen.value = false;
};

// Marquer toutes les notifications comme lues quand on ouvre le menu
const markAllNotificationsAsRead = async () => {
  if (!notifications.value.length) return
  
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

// Fermer les menus quand on clique en dehors
const handleClickOutside = (event: MouseEvent) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    userMenuOpen.value = false;
  }
  if (notificationsMenuRef.value && !notificationsMenuRef.value.contains(event.target as Node)) {
    notificationsMenuOpen.value = false;
  }
};

/** Fermeture au défilement du rail ou du contenu (le scroll n’émet pas de « clic extérieur »). */
function isDashboardMainScrollTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.classList.contains('sidebar-scroll') || target.classList.contains('dashboard-main-scroll'));
}

function closeHeaderMenusOnScroll(event: Event) {
  if (!isDashboardMainScrollTarget(event.target)) return;
  userMenuOpen.value = false;
  notificationsMenuOpen.value = false;
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('scroll', closeHeaderMenusOnScroll, true);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('scroll', closeHeaderMenusOnScroll, true);
});

// Modal pour nouveaux rendez-vous (infirmiers, lab, subaccount) — file d'attente FIFO
const seenAppointmentIds = ref<Set<string>>(new Set());
const { showAppointmentModal, selectedAppointment, openAppointmentModalById, openAppointmentModalByIdIfEligible, openAppointmentModalFromShareLink, enqueueMany, onModalClosed } = useAppointmentModal({
  onDisplayed: (apt) => { seenAppointmentIds.value = new Set([...seenAppointmentIds.value, apt.id]); },
});

function dedupePendingBloodTestLegacy(appointments: any[]): any[] {
  const seenBloodBatches = new Set<string>();
  return appointments.filter((apt: any) => {
    const bid = apt?.creation_batch_id;
    if (!bid || !isBloodTestAppointment(apt?.type)) return true;
    const key = `blood_test:${bid}`;
    if (seenBloodBatches.has(key)) return false;
    seenBloodBatches.add(key);
    return true;
  });
}

/** Lien partagé (WhatsApp) : ?openAppointment=&shareToken= — même modal globale que le polling, sur tout le layout infirmier. */
const shareLinkFromUrlHandled = ref(false);
watch(
  () =>
    [
      typeof route.query.openAppointment === 'string' ? route.query.openAppointment : '',
      typeof route.query.shareToken === 'string' ? route.query.shareToken : '',
      user.value?.role ?? '',
      route.path,
    ] as const,
  async ([openId, shareTok, role]) => {
    if (role !== 'nurse' || !openId || !shareTok) {
      shareLinkFromUrlHandled.value = false;
      return;
    }
    if (shareLinkFromUrlHandled.value) return;
    shareLinkFromUrlHandled.value = true;
    await openAppointmentModalFromShareLink(openId, shareTok);
    const q = { ...route.query } as Record<string, string | string[] | undefined>;
    delete q.openAppointment;
    delete q.shareToken;
    delete q.token;
    await router.replace({ path: route.path, query: q });
  },
  { immediate: true },
);

const lastPendingCount = ref(0);
const pendingAppointments = useState<any[]>('dashboard.pendingAppointments', () => []);

const unreadCount = computed(
  () => notifications.value.filter(n => !n.read_at).length
);

/** Badge cloche : notifications non lues + RDV en attente (nurse, lab, subaccount, preleveur) */
const bellBadgeCount = computed(() => {
  const notif = unreadCount.value;
  const role = user.value?.role;
  const pending = ['nurse', 'lab', 'subaccount', 'preleveur'].includes(role ?? '') ? lastPendingCount.value : 0;
  return notif + pending;
});

/** Pastille rouge « Mes demandes » (infirmier) : même périmètre que le polling RDV à accepter */
const nurseDemandesSidebarBadge = computed(() =>
  user.value?.role === 'nurse' ? lastPendingCount.value : 0,
);

const roleLabel = computed(() => {
  const role = user.value?.role;
  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    lab: "Laboratoire",
    subaccount: "Sous-compte",
    nurse: "Infirmier",
    preleveur: "Préleveur",
    pro: "Professionnel",
    patient: "Patient",
  };
  return roleLabels[role || ""] || "Utilisateur";
});

const roleIcon = computed(() => {
  const role = user.value?.role;
  const roleIcons: Record<string, string> = {
    super_admin: "i-lucide-shield-check",
    lab: "i-lucide-flask-conical",
    subaccount: "i-lucide-users",
    nurse: "i-lucide-heart-pulse",
    preleveur: "i-lucide-droplet",
    pro: "i-lucide-briefcase",
    patient: "i-lucide-user",
  };
  return roleIcons[role || ""] || "i-lucide-user";
});

const breadcrumbItems = computed(() => {
  // Ne pas calculer côté serveur si user n'est pas disponible
  if (process.server && !user.value) {
    return [];
  }
  
  const path = route.path;
  const role = user.value?.role;
  const items: Array<{ label: string; icon?: string; to?: string }> = [];

  // Mapping des routes vers leurs labels et icônes
  const routeLabels: Record<string, { label: string; icon: string }> = {
    // Routes nurse
    "/nurse/appointments": { label: "Rendez-vous", icon: "i-lucide-calendar" },
    "/nurse/demandes": { label: "Mes demandes", icon: "i-lucide-inbox" },
    "/nurse/calendar": { label: "Calendrier", icon: "i-lucide-calendar-days" },
    "/nurse/tournee": { label: "Ma tournée", icon: "i-lucide-list-ordered" },
    "/nurse/soins": { label: "Plans récurrents", icon: "i-lucide-calendar-range" },
    "/nurse/prescriptions": { label: "Ordonnances", icon: "i-lucide-file-pen-line" },
    "/nurse/reviews": { label: "Mes avis", icon: "i-lucide-star" },
    "/nurse/abonnement": { label: "Abonnement", icon: "i-lucide-credit-card" },
    
    // Routes admin
    "/admin": { label: "Tableau de bord", icon: "i-lucide-layout-dashboard" },
    "/admin/inscriptions": { label: "Inscriptions", icon: "i-lucide-user-plus" },
    "/admin/appointments": { label: "Rendez-vous", icon: "i-lucide-calendar" },
    "/admin/appointments/notifications": { label: "Renvoi emails RDV", icon: "i-lucide-mail" },
    "/admin/dispatch": { label: "Attribution RDV", icon: "i-lucide-radio-tower" },
    "/admin/calendar": { label: "Calendrier", icon: "i-lucide-calendar-days" },
    "/admin/users": { label: "Utilisateurs", icon: "i-lucide-users" },
    "/admin/categories": { label: "Catégories", icon: "i-lucide-tags" },
    "/admin/lab-brands": { label: "Marques labo", icon: "i-lucide-building-2" },
    "/admin/coverage": { label: "Zones", icon: "i-lucide-map" },
    "/admin/reviews": { label: "Avis", icon: "i-lucide-star" },
    "/admin/notifications": { label: "Notifications", icon: "i-lucide-bell" },
    "/admin/abonnements": { label: "Abonnements", icon: "i-lucide-credit-card" },
    "/admin/ai": { label: "IA Cary", icon: "i-lucide-sparkles" },
    "/admin/logs": { label: "Logs", icon: "i-lucide-file-text" },
    
    // Routes lab
    "/lab": { label: "Tableau de bord", icon: "i-lucide-layout-dashboard" },
    "/lab/appointments": { label: "Rendez-vous", icon: "i-lucide-calendar" },
    "/lab/patients": { label: "Patients", icon: "i-lucide-users" },
    "/lab/calendar": { label: "Calendrier", icon: "i-lucide-calendar-days" },
    "/lab/stats": { label: "Statistiques", icon: "i-lucide-bar-chart" },
    "/lab/subaccounts": { label: "Sous-comptes", icon: "i-lucide-users" },
    "/lab/preleveurs": { label: "Préleveurs", icon: "i-lucide-user-check" },
    "/lab/abonnement": { label: "Abonnement", icon: "i-lucide-credit-card" },
    
    // Routes subaccount
    "/subaccount": { label: "Tableau de bord", icon: "i-lucide-layout-dashboard" },
    "/subaccount/appointments": { label: "Rendez-vous", icon: "i-lucide-calendar" },
    "/subaccount/patients": { label: "Patients", icon: "i-lucide-users" },
    "/subaccount/calendar": { label: "Calendrier", icon: "i-lucide-calendar-days" },
    "/subaccount/reviews": { label: "Mes avis", icon: "i-lucide-star" },
    "/subaccount/preleveurs": { label: "Préleveurs", icon: "i-lucide-user-check" },
    
    // Routes preleveur
    "/preleveur": { label: "Mes rendez-vous", icon: "i-lucide-calendar" },
    "/preleveur/tournee": { label: "Ma tournée", icon: "i-lucide-list-ordered" },
    "/preleveur/appointments": { label: "Rendez-vous", icon: "i-lucide-calendar" },
    "/preleveur/calendar": { label: "Calendrier", icon: "i-lucide-calendar-days" },
    
    // Routes pro
    "/pro": { label: "Tableau de bord", icon: "i-lucide-layout-dashboard" },
    "/pro/appointments": { label: "Rendez-vous", icon: "i-lucide-calendar" },
    "/pro/patients": { label: "Patients", icon: "i-lucide-users" },
    "/pro/prescriptions": { label: "Prescriptions", icon: "i-lucide-file-pen-line" },
    "/pro/calendar": { label: "Calendrier", icon: "i-lucide-calendar-days" },
    "/pro/settings": { label: "Paramètres", icon: "i-lucide-settings" },
    
    // Routes patient
    "/patient": { label: "Mes rendez-vous", icon: "i-lucide-calendar" },
    "/patient/new": { label: "Nouveau Rendez-vous", icon: "i-lucide-plus" },
    "/patient/profile": { label: "Profil", icon: "i-lucide-user" },

    // Route profil partagée
    "/profile": { label: "Mon profil", icon: "i-lucide-user" },
  };

  // Construire le breadcrumb en analysant le chemin
  const pathSegments = path.split("/").filter(Boolean);
  
  // super_admin utilise /admin comme base ; infirmier : accueil = liste RDV
  let roleBasePath = `/${role || ""}`;
  if (role === 'super_admin') {
    roleBasePath = '/admin';
  }
  if (role === 'nurse') {
    roleBasePath = '/nurse/appointments';
  }
  if (role && routeLabels[roleBasePath]) {
    items.push({
      label: routeLabels[roleBasePath].label,
      icon: routeLabels[roleBasePath].icon,
      to: roleBasePath,
    });
  }

  // Label dynamique pour la dernière entrée (ex: nom du patient sur la page détail RDV)
  const breadcrumbDetailLabel = useState<string>("breadcrumbDetailLabel", () => "");

  // Ajouter les segments suivants
  let currentPath = roleBasePath;
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  for (let i = 1; i < pathSegments.length; i++) {
    const segment = pathSegments[i];

    // Page Mon profil (route /profile commune à tous les rôles)
    if (segment === "profile") {
      items.push({ label: "Mon profil", icon: "i-lucide-user" });
      break;
    }

    // ID type UUID (ex: détail rendez-vous) → afficher le label dynamique (nom patient) ou "Détails"
    if (uuidRegex.test(segment)) {
      items.push({
        label: breadcrumbDetailLabel.value || "Détails",
        icon: "i-lucide-file-text",
      });
      break;
    }

    // ID numérique
    if (/^\d+$/.test(segment)) {
      items.push({
        label: breadcrumbDetailLabel.value || "Détails",
        icon: "i-lucide-file-text",
      });
      break;
    }

    currentPath = `${currentPath}/${segment}`;

    if (routeLabels[currentPath]) {
      items.push({
        label: routeLabels[currentPath].label,
        icon: routeLabels[currentPath].icon,
        to: currentPath,
      });
    } else {
      const fallbackLabel =
        segment === "new"
          ? "Nouveau"
          : segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
      items.push({
        label: fallbackLabel,
        icon: "i-lucide-file-text",
      });
    }
  }

  return items;
});

const navigationItems = computed(() => {
  const role = user.value?.role;
  const p = route.path;
  const active = (base: string) => {
    const norm = (s: string) => s.replace(/\/+$/, '') || '/';
    const path = norm(p);
    const b = norm(base);
    return path === b || path.startsWith(`${b}/`);
  };
  const isOwnProfilePage = p === "/profile" && !route.query.userId && route.query.newPreleveur !== "1" && route.query.newPreleveur !== "true";

  const menus: Record<string, NavigationMenuItem[][]> = {
    super_admin: [
      [
        {
          label: "Tableau de bord",
          icon: "i-lucide-layout-dashboard",
          to: "/admin",
          active: p === "/admin" || p === "/admin/",
        },
        {
          label: "Inscriptions",
          icon: "i-lucide-user-plus",
          to: "/admin/inscriptions",
          active: active("/admin/inscriptions"),
        },
        {
          label: "Rendez-vous",
          icon: "i-lucide-calendar",
          to: "/admin/appointments",
          active: active("/admin/appointments"),
        },
        {
          label: "Renvoi emails RDV",
          icon: "i-lucide-mail",
          to: "/admin/appointments/notifications",
          active: active("/admin/appointments/notifications"),
        },
        {
          label: "Attribution RDV",
          icon: "i-lucide-radio-tower",
          to: "/admin/dispatch",
          active: active("/admin/dispatch"),
        },
        {
          label: "Calendrier",
          icon: "i-lucide-calendar-days",
          to: "/admin/calendar",
          active: active("/admin/calendar"),
        },
        {
          label: "Utilisateurs",
          icon: "i-lucide-users",
          to: "/admin/users",
          active: active("/admin/users"),
        },
        {
          label: "Catégories",
          icon: "i-lucide-tags",
          to: "/admin/categories",
          active: active("/admin/categories"),
        },
        {
          label: "Marques labo",
          icon: "i-lucide-building-2",
          to: "/admin/lab-brands",
          active: active("/admin/lab-brands"),
        },
        {
          label: "Zones de couverture",
          icon: "i-lucide-map",
          to: "/admin/coverage",
          active: active("/admin/coverage"),
        },
        {
          label: "Avis",
          icon: "i-lucide-star",
          to: "/admin/reviews",
          active: active("/admin/reviews"),
        },
        {
          label: "Notifications",
          icon: "i-lucide-bell",
          to: "/admin/notifications",
          active: active("/admin/notifications"),
        },
        {
          label: "Abonnements",
          icon: "i-lucide-credit-card",
          to: "/admin/abonnements",
          active: active("/admin/abonnements"),
        },
        {
          label: "IA Cary",
          icon: "i-lucide-sparkles",
          to: "/admin/ai",
          active: active("/admin/ai"),
        },
        {
          label: "Logs HDS",
          icon: "i-lucide-file-text",
          to: "/admin/logs",
          active: active("/admin/logs"),
        },
        {
          label: "QR code",
          icon: "i-lucide-qr-code",
          to: "/admin/qr-code",
          active: active("/admin/qr-code"),
        },
      ],
      [      ],
    ],
    nurse: [
      [
        {
          label: "Rendez-vous",
          icon: "i-lucide-calendar",
          to: "/nurse/appointments",
          active: active("/nurse/appointments") && !p.startsWith("/nurse/demandes"),
        },
        {
          label: "Mes demandes",
          icon: "i-lucide-inbox",
          to: "/nurse/demandes",
          active: p.startsWith("/nurse/demandes"),
        },
        {
          label: "Calendrier",
          icon: "i-lucide-calendar-days",
          to: "/nurse/calendar",
          active: active("/nurse/calendar"),
        },
        {
          label: "Ma tournée",
          icon: "i-lucide-list-ordered",
          to: "/nurse/tournee",
          active: active("/nurse/tournee"),
        },
        {
          label: "Patients",
          icon: "i-lucide-users",
          to: "/nurse/patients",
          active: active("/nurse/patients"),
        },
        {
          label: "Résultats",
          icon: "i-lucide-flask-conical",
          to: "/nurse/resultats",
          active: active("/nurse/resultats"),
        },
        {
          label: "Ordonnances",
          icon: "i-lucide-file-pen-line",
          to: "/nurse/prescriptions",
          active: active("/nurse/prescriptions"),
        },
        {
          label: "Mes avis",
          icon: "i-lucide-star",
          to: "/nurse/reviews",
          active: active("/nurse/reviews"),
        },
        {
          label: "QR code",
          icon: "i-lucide-qr-code",
          to: "/nurse/qr-code",
          active: active("/nurse/qr-code"),
        },
        {
          label: "Mon profil",
          icon: "i-lucide-user",
          to: "/profile",
          active: isOwnProfilePage,
        },
        {
          label: "Abonnement",
          icon: "i-lucide-credit-card",
          to: "/nurse/abonnement",
          active: active("/nurse/abonnement"),
        },
      ],
      [],
    ],
    subaccount: [
      [
        {
          label: "Rendez-vous",
          icon: "i-lucide-calendar",
          to: "/subaccount/appointments",
          active: active("/subaccount/appointments"),
        },
        {
          label: "Patients",
          icon: "i-lucide-users",
          to: "/subaccount/patients",
          active: active("/subaccount/patients"),
        },
        {
          label: "Calendrier",
          icon: "i-lucide-calendar-days",
          to: "/subaccount/calendar",
          active: active("/subaccount/calendar"),
        },
        {
          label: "Mes avis",
          icon: "i-lucide-star",
          to: "/subaccount/reviews",
          active: active("/subaccount/reviews"),
        },
        {
          label: "QR code",
          icon: "i-lucide-qr-code",
          to: "/subaccount/qr-code",
          active: active("/subaccount/qr-code"),
        },
        {
          label: "Préleveurs",
          icon: "i-lucide-user-check",
          to: "/subaccount/preleveurs",
          active: active("/subaccount/preleveurs"),
        },
        {
          label: "Mon profil",
          icon: "i-lucide-user",
          to: "/profile",
          active: isOwnProfilePage,
        },
      ],
      [],
    ],
    lab: [
      [
        {
          label: "Tableau de bord",
          icon: "i-lucide-layout-dashboard",
          to: "/lab",
          active: p === "/lab" || p === "/lab/",
        },
        {
          label: "Rendez-vous",
          icon: "i-lucide-calendar",
          to: "/lab/appointments",
          active: active("/lab/appointments"),
        },
        {
          label: "Patients",
          icon: "i-lucide-users",
          to: "/lab/patients",
          active: active("/lab/patients"),
        },
        {
          label: "Calendrier",
          icon: "i-lucide-calendar-days",
          to: "/lab/calendar",
          active: active("/lab/calendar"),
        },
        {
          label: "Mes avis",
          icon: "i-lucide-star",
          to: "/lab/reviews",
          active: active("/lab/reviews"),
        },
        {
          label: "QR code",
          icon: "i-lucide-qr-code",
          to: "/lab/qr-code",
          active: active("/lab/qr-code"),
        },
        {
          label: "Statistiques",
          icon: "i-lucide-bar-chart",
          to: "/lab/stats",
          active: active("/lab/stats"),
        },
        {
          label: "Sous-comptes",
          icon: "i-lucide-users",
          to: "/lab/subaccounts",
          active: active("/lab/subaccounts"),
        },
        {
          label: "Préleveurs",
          icon: "i-lucide-user-check",
          to: "/lab/preleveurs",
          active: active("/lab/preleveurs"),
        },
        {
          label: "Abonnement",
          icon: "i-lucide-credit-card",
          to: "/lab/abonnement",
          active: active("/lab/abonnement"),
        },
        {
          label: "Mon profil",
          icon: "i-lucide-user",
          to: "/profile",
          active: isOwnProfilePage,
        },
      ],
      [],
    ],
    preleveur: [
      [
        {
          label: "Mes rendez-vous",
          icon: "i-lucide-calendar",
          to: "/preleveur",
          active: p === "/preleveur" || p === "/preleveur/",
        },
        {
          label: "Ma tournée",
          icon: "i-lucide-list-ordered",
          to: "/preleveur/tournee",
          active: active("/preleveur/tournee"),
        },
        {
          label: "Calendrier",
          icon: "i-lucide-calendar-days",
          to: "/preleveur/calendar",
          active: active("/preleveur/calendar"),
        },
        {
          label: "Mon profil",
          icon: "i-lucide-user",
          to: "/profile",
          active: isOwnProfilePage,
        },
      ],
      [],
    ],
    pro: [
      [
        {
          label: "Rendez-vous",
          icon: "i-lucide-calendar",
          to: "/pro/appointments",
          active: active("/pro/appointments"),
        },
        {
          label: "Patients",
          icon: "i-lucide-users",
          to: "/pro/patients",
          active: active("/pro/patients"),
        },
        {
          label: "Résultats",
          icon: "i-lucide-flask-conical",
          to: "/pro/resultats",
          active: active("/pro/resultats"),
        },
        {
          label: "Prescriptions",
          icon: "i-lucide-file-pen-line",
          to: "/pro/prescriptions",
          active: active("/pro/prescriptions"),
        },
        {
          label: "Calendrier",
          icon: "i-lucide-calendar-days",
          to: "/pro/calendar",
          active: active("/pro/calendar"),
        },
        {
          label: "QR code",
          icon: "i-lucide-qr-code",
          to: "/pro/qr-code",
          active: active("/pro/qr-code"),
        },
        {
          label: "Mon profil",
          icon: "i-lucide-user",
          to: "/profile",
          active: isOwnProfilePage,
        },
      ],
      [],
    ],
  };

  const base = menus[role] || [[], []];
  if (
    (role === 'pro' || role === 'nurse') &&
    user.value?.prescription_generation_enabled === false
  ) {
    const blockedPath = role === 'pro' ? '/pro/prescriptions' : '/nurse/prescriptions';
    return [
      base[0].filter((item) => item.to !== blockedPath),
      base[1] ?? [],
    ];
  }
  return base;
});

const headerUserDisplayName = computed(() => {
  if (user.value?.first_name && user.value?.last_name)
    return `${user.value.first_name} ${user.value.last_name}`;
  return user.value?.email || "Utilisateur";
});

const headerAvatarInitial = computed(() =>
  (user.value?.first_name?.charAt(0) || user.value?.email?.charAt(0) || "U").toUpperCase()
);

const headerUserMenuItems = computed(() => [
  {
    label: "Profil",
    icon: "i-lucide-user",
    click: () => navigateTo("/profile"),
  },
  {
    label: "Déconnexion",
    icon: "i-lucide-log-out",
    click: () => logout(),
  },
]);

const formatPendingAppointmentLabel = (a: any) => {
  const date = a.scheduled_at ? new Date(a.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const type = a.type === 'nursing' ? 'Soins' : a.type === 'blood_test' ? 'Prélèvement' : '';
  const cat = a.category_name || '';
  const bits = ['Nouveau RDV', date, cat || null, type ? `(${type})` : null].filter((x): x is string => !!x && x.length > 0);
  return bits.join(', ');
};

const notificationItems = computed(() => {
  const role = user.value?.role;
  const items: any[] = [];

  // RDV en attente (nurse, lab, subaccount) — en premier, groupés par lot multi-soins
  if (['nurse', 'lab', 'subaccount'].includes(role ?? '')) {
    const pending = pendingAppointments.value || [];

    // Regrouper par creation_batch_id (un seul item par lot)
    const batchMap = new Map<string, any[]>();
    const singles: any[] = [];
    for (const a of pending) {
      if (a.creation_batch_id) {
        if (!batchMap.has(a.creation_batch_id)) batchMap.set(a.creation_batch_id, []);
        batchMap.get(a.creation_batch_id)!.push(a);
      } else {
        singles.push(a);
      }
    }

    // Construire la liste groupée (lots en premier, puis individuels)
    const groups: { appts: any[]; isBatch: boolean }[] = [
      ...[...batchMap.values()].map(appts => ({ appts, isBatch: true })),
      ...singles.map(a => ({ appts: [a], isBatch: false })),
    ];

    groups.slice(0, 5).forEach(({ appts, isBatch }) => {
      const first = appts[0];
      const n = appts.length;
      items.push({
        label: sanitizeNotificationText(
          isBatch && n > 1 ? `Lot · ${n} soins` : formatPendingAppointmentLabel(first),
        ),
        description: undefined,
        icon: isBatch && n > 1 ? 'i-lucide-layers' : 'i-lucide-calendar-clock',
        isRead: false,
        disabled: false,
        isPendingAppointment: true,
        appointmentId: first.id,
        click: async () => {
          notificationsMenuOpen.value = false;
          await openAppointmentModalByIdIfEligible(first.id);
        },
      });
    });
  }

  // Notifications classiques
  if (!notifications.value.length && items.length === 0) {
    return [{ label: "Aucune notification", disabled: true }];
  }

  const reviewsPath = role === 'nurse' ? '/nurse/reviews' : role === 'lab' ? '/lab/reviews' : role === 'subaccount' ? '/subaccount/reviews' : null;
  const pendingIds = new Set((pendingAppointments.value || []).map((a: any) => a.id));
  // Dédupliquer les notifs new_appointment_available du même lot (1 seule par creation_batch_id)
  const seenBatchNotifIds = new Set<string>();
  notifications.value
    .filter((n: any) => {
      const data = typeof n.data === 'string' ? (() => { try { return JSON.parse(n.data); } catch { return {}; } })() : (n.data || {});
      const aptId = n.appointment_id || data?.appointment_id;
      if (aptId && pendingIds.has(aptId)) return false; // Exclure les notifs dont le RDV est déjà dans pending
      // Dédupliquer les notifications new_appointment_available par lot
      if (n.type === 'new_appointment_available' && data?.creation_batch_id) {
        if (seenBatchNotifIds.has(data.creation_batch_id)) return false;
        seenBatchNotifIds.add(data.creation_batch_id);
      }
      return true;
    })
    .slice(0, 10 - items.length)
    .forEach((notif) => {
    const data = typeof notif.data === 'string' ? (() => { try { return JSON.parse(notif.data); } catch { return {}; } })() : (notif.data || {});
    const isNewReview =
      notif.type === "new_review" ||
      notif.type === "new_review_on_pro_patient" ||
      !!data.review_id;
    const isShareLinkInfo =
      notif.type === 'share_link_appointment_taken' || data?.no_navigate === true;
    const { label: notifLabel, message: notifMessage } = formatBellNotificationLines(
      notif.title,
      notif.message,
      { type: notif.type },
    );
    items.push({
      label: notifLabel,
      message: notifMessage,
      description: notif.created_at ? new Date(notif.created_at).toLocaleString("fr-FR") : undefined,
      icon:
        notif.type === "marketing"
          ? "i-lucide-megaphone"
          : notif.type === "new_review" || notif.type === "new_review_on_pro_patient"
            ? "i-lucide-star"
            : notif.type === "appointment_request_sent"
              ? "i-lucide-send"
              : notif.type === "appointment_redispatched"
                ? "i-lucide-refresh-ccw"
              : notif.type === "appointment_reassigned"
                ? "i-lucide-user-plus"
              : notif.type === "appointment_accepted_lab"
                ? "i-lucide-flask-conical"
              : notif.type === "new_appointment_created"
                ? "i-lucide-calendar-plus"
              : notif.type === "share_link_appointment_taken"
                ? "i-lucide-user-check"
              : notif.type === "care_gallery_photo" || notif.type === "care_gallery_comment"
                ? "i-lucide-images"
              : notif.type === "results_available" || notif.type === "results_ready"
                ? "i-lucide-flask-conical"
                : "i-lucide-bell",
      isRead: !!notif.read_at,
      disabled: isShareLinkInfo,
      click: () => {
        if (isShareLinkInfo) return;
        const aptId = notif.appointment_id || data?.appointment_id;
        if (notif.type === "results_available" && (role === "nurse" || role === "pro")) {
          notificationsMenuOpen.value = false;
          const base = role === "pro" ? "/pro" : "/nurse";
          void navigateTo(`${base}/resultats`);
          return;
        }
        if (
          aptId &&
          (notif.type === "care_gallery_photo" || notif.type === "care_gallery_comment") &&
          (role === "pro" || role === "nurse")
        ) {
          notificationsMenuOpen.value = false;
          const base = role === "pro" ? "/pro" : "/nurse";
          const pid = data?.photo_id != null && String(data.photo_id).trim() !== "" ? String(data.photo_id) : null;
          void navigateTo({
            path: `${base}/appointments/${aptId}`,
            query: {
              careGallery: "1",
              ...(pid ? { carePhoto: pid } : {}),
            },
          });
          return;
        }
        if (isNewReview && role === "pro" && aptId) {
          notificationsMenuOpen.value = false;
          void navigateTo({ path: `/pro/appointments/${aptId}`, query: { review: "1" } });
        } else if (isNewReview && reviewsPath) {
          notificationsMenuOpen.value = false;
          const reviewId = data?.review_id;
          const q =
            reviewId != null && String(reviewId).trim() !== ""
              ? `?review=${encodeURIComponent(String(reviewId))}`
              : aptId
                ? `?appointment=${encodeURIComponent(String(aptId))}`
                : "";
          void navigateTo(`${reviewsPath}${q}`);
        }
        else if (aptId && notif.type === 'appointment_request_sent') {
          notificationsMenuOpen.value = false;
          const base =
            role === 'pro'
              ? '/pro'
              : role === 'nurse'
                ? '/nurse'
                : role === 'subaccount'
                  ? '/subaccount'
                  : role === 'lab'
                    ? '/lab'
                    : null;
          if (base) void navigateTo(`${base}/appointments/${aptId}`);
        } else if (aptId && role === 'pro') {
          notificationsMenuOpen.value = false;
          void navigateTo(`/pro/appointments/${aptId}`);
        } else if (aptId && notif.type === 'appointment_redispatched' && ['nurse', 'lab', 'subaccount'].includes(role ?? '')) {
          notificationsMenuOpen.value = false;
          const base =
            role === 'nurse' ? '/nurse' : role === 'subaccount' ? '/subaccount' : '/lab';
          void navigateTo(`${base}/appointments`);
        } else if (aptId && ['nurse', 'lab', 'subaccount'].includes(role ?? '')) {
          notificationsMenuOpen.value = false;
          void openAppointmentModalByIdIfEligible(aptId);
        } else if (aptId && role === 'preleveur') {
          notificationsMenuOpen.value = false;
          void navigateTo(`/preleveur/appointments/${aptId}`);
        } else if (aptId && role === 'super_admin') {
          notificationsMenuOpen.value = false;
          void navigateTo(`/admin/appointments/${aptId}`);
        } else if (aptId) void navigateTo(`/patient/appointments/${aptId}`);
      },
    });
  });

  return items;
});

/** Même requête que la page « Mes demandes » infirmier ; sans ces paramètres l’API renvoie le périmètre « Mes rendez-vous » et omet les offres entrantes (pastille sidebar à 0). */
function appointmentsPendingOffersUrl(role: string | undefined): string {
  const qs = new URLSearchParams({ status: 'pending', limit: '100' });
  if (role === 'nurse') {
    qs.set('nurse_tab', 'soins');
    qs.set('nurse_segment', 'en_attente');
  }
  return `/appointments?${qs.toString()}`;
}

const { start: startPolling, stop: stopPolling } = usePolling(
  async () => {
    console.log('[NotificationPolling] Fetching notifications...');
    try {
      const res = await apiFetch("/notifications?limit=10", { method: "GET" });
      if (res && res.success) {
        const oldCount = notifications.value.filter(n => !n.read_at).length;
        const newCount = res.data.filter((n: any) => !n.read_at).length;

        // Forcer la réactivité en créant un nouveau tableau
        notifications.value = [...res.data];

        console.log('[NotificationPolling] Updated notifications', {
          total: res.data.length,
          oldUnread: oldCount,
          newUnread: newCount,
        });
      }
    } catch (error) {
      console.error('[NotificationPolling] Error:', error);
    }
  },
  10000,
  { shouldSkip: skipPollDuringBooking },
); // Réduire à 10 secondes pour les notifications

// Détecter les nouveaux rendez-vous pour infirmiers, lab et sous-compte (popup auto, file d'attente FIFO)
const { start: startAppointmentPolling, stop: stopAppointmentPolling, isPolling: isAppointmentPolling } = usePolling(async () => {
  const role = user.value?.role;
  const myId = user.value?.id;
  if (!['nurse', 'lab', 'subaccount', 'preleveur'].includes(role ?? '') || !myId) {
    return;
  }

  const res = await apiFetch(appointmentsPendingOffersUrl(role), {
    method: 'GET'
  });

    if (res?.success && res.data) {
      const pending = res.data.filter((a: any) => {
        if (isOfferModalSnoozed(a)) return false;
        if (role === 'nurse') {
          return (
            a.status === 'pending' &&
            !isBloodTestAppointment(a.type) &&
            isPendingIncomingOffer(a, myId) &&
            (a.assigned_nurse_id === myId || !a.assigned_nurse_id)
          );
        }
        if (role === 'lab' || role === 'subaccount')
          return (
            a.status === 'pending' &&
            isBloodTestAppointment(a.type) &&
            isPendingIncomingOffer(a, myId) &&
            (a.assigned_lab_id === myId || !a.assigned_lab_id)
          );
        if (role === 'preleveur')
          return (
            a.status === 'pending' &&
            isBloodTestAppointment(a.type) &&
            isPendingIncomingOffer(a, myId) &&
            (a.assigned_to === myId || !a.assigned_to)
          );
        return false;
      });

    const dedupedPending = dedupePendingBloodTestLegacy(pending);
    const newAppointments = dedupedPending.filter((a: any) => !seenAppointmentIds.value.has(a.id));
    if (newAppointments.length > 0) {
      await enqueueMany(newAppointments);
    }

    // Compter les lots distincts pour le badge (1 badge par lot, pas par RDV)
    const batchIds = new Set(dedupedPending.filter((a: any) => a.creation_batch_id).map((a: any) => a.creation_batch_id));
    const singlesCount = dedupedPending.filter((a: any) => !a.creation_batch_id).length;
    lastPendingCount.value = batchIds.size + singlesCount;
    pendingAppointments.value = dedupedPending;
  }
}, 10000, { shouldSkip: skipPollDuringBooking });

/** Déclencheur pour rafraîchir la liste RDV (nurse, lab, subaccount) après acceptation/refus dans la modal */
const appointmentListRefreshTrigger = useState<number>('appointments.listRefreshTrigger', () => 0);

const handleAppointmentAccepted = () => {
  onModalClosed();
  appointmentListRefreshTrigger.value++;
  setTimeout(() => {
    startAppointmentPolling();
  }, 500);
};

const handleAppointmentRefused = () => {
  onModalClosed();
  appointmentListRefreshTrigger.value++;
  setTimeout(() => {
    startAppointmentPolling();
  }, 500);
};

// Ouvrir la popup depuis ?openAppointment= (redirection depuis détail pour un RDV pending)
watch(
  () => ({ path: route.path, openAppointment: route.query.openAppointment }),
  async (curr) => {
    const role = user.value?.role;
    if (!['nurse', 'lab', 'subaccount', 'preleveur'].includes(role ?? '') || !curr.openAppointment) return;
    const appointmentsPath = role === 'nurse'
      ? '/nurse/appointments'
      : role === 'subaccount'
        ? '/subaccount/appointments'
        : role === 'preleveur'
          ? '/preleveur'
          : '/lab/appointments';
    if (curr.path !== appointmentsPath) return;
    const id = Array.isArray(curr.openAppointment) ? curr.openAppointment[0] : curr.openAppointment;
    await openAppointmentModalByIdIfEligible(id);
    await navigateTo(appointmentsPath, { replace: true });
  },
  { immediate: true },
);

// Initialiser et ouvrir la popup auto pour nurse / lab / subaccount / preleveur (file d'attente)
let appointmentCounterInitialized = false;
watch(() => user.value?.role, async (role) => {
  if (!['nurse', 'lab', 'subaccount', 'preleveur'].includes(role ?? '') || appointmentCounterInitialized || !user.value) return;
  appointmentCounterInitialized = true;
  try {
    const myId = user.value?.id;
    const res = await apiFetch(appointmentsPendingOffersUrl(role), { method: 'GET' });
    if (res?.success && res.data && myId) {
      const pending = res.data.filter((a: any) => {
        if (isOfferModalSnoozed(a)) return false;
        if (role === 'nurse') {
          return (
            a.status === 'pending' &&
            !isBloodTestAppointment(a.type) &&
            isPendingIncomingOffer(a, myId) &&
            (a.assigned_nurse_id === myId || !a.assigned_nurse_id)
          );
        }
        if (role === 'lab' || role === 'subaccount')
          return (
            a.status === 'pending' &&
            isBloodTestAppointment(a.type) &&
            isPendingIncomingOffer(a, myId) &&
            (a.assigned_lab_id === myId || !a.assigned_lab_id)
          );
        if (role === 'preleveur')
          return (
            a.status === 'pending' &&
            isBloodTestAppointment(a.type) &&
            isPendingIncomingOffer(a, myId) &&
            (a.assigned_to === myId || !a.assigned_to)
          );
        return false;
      });
      const dedupedPending = dedupePendingBloodTestLegacy(pending);
      const batchIdsInit = new Set(dedupedPending.filter((a: any) => a.creation_batch_id).map((a: any) => a.creation_batch_id));
      const singlesCountInit = dedupedPending.filter((a: any) => !a.creation_batch_id).length;
      lastPendingCount.value = batchIdsInit.size + singlesCountInit;
      pendingAppointments.value = dedupedPending;
      const newAppointments = dedupedPending.filter((a: any) => !seenAppointmentIds.value.has(a.id));
      if (newAppointments.length > 0) {
        await enqueueMany(newAppointments);
      }
    }
    startAppointmentPolling();
  } catch (_) {}
}, { immediate: true });

onMounted(async () => {
  // Rafraîchir l'utilisateur pour avoir la photo de profil à jour dans le header (profile_image_url)
  await fetchCurrentUser();
  // Charger les notifications immédiatement
  const res = await apiFetch('/notifications?limit=10', { method: 'GET' })
  if (res && res.success) {
    // Forcer la réactivité en créant un nouveau tableau
    notifications.value = [...res.data]
  }
  // Démarrer le polling des notifications
  startPolling()
  // S'assurer que les infos utilisateur sont complètes (éviter double appel avec le watch)
  if (user.value && (!user.value.first_name || !user.value.last_name) && !hasRefetchedIncompleteUser.value) {
    hasRefetchedIncompleteUser.value = true;
    await fetchCurrentUser();
  }
});

onUnmounted(() => {
  stopAppointmentPolling();
  stopPolling();
});
</script>
