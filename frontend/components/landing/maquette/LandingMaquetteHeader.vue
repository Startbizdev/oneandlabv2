<template>
  <header
    class="fixed top-0 left-0 right-0 z-[200] border-b border-[#E8E8F0] bg-white/92 backdrop-blur-xl backdrop-saturate-150 transition-shadow duration-200 pt-[env(safe-area-inset-top)] dark:bg-gray-950/92 dark:border-gray-800"
    :class="{ 'shadow-[0_2px_20px_rgba(0,0,0,0.06)]': scrolled }"
  >
    <div
      class="mx-auto flex h-[66px] w-full max-w-[1200px] items-center gap-3 px-4 sm:px-8 lg:gap-6 lg:px-12"
    >
      <NuxtLink to="/" class="flex shrink-0 items-center gap-2" aria-label="Cary — Accueil">
        <img
          src="/images/logo-cary.png"
          alt="Cary"
          class="h-8 w-auto max-h-10 object-contain object-left sm:h-9 md:h-10"
          loading="eager"
          decoding="async"
        />
      </NuxtLink>

      <span v-if="isBooking" class="flex min-w-0 items-center gap-2 border-l border-gray-200 pl-3 text-xs font-semibold text-primary-800 dark:border-gray-700 dark:text-primary-200 sm:pl-5 sm:text-sm"><UIcon name="i-lucide-calendar" class="hidden size-4 shrink-0 sm:block" aria-hidden="true" />Votre rendez-vous</span>
      <nav v-else class="hidden min-w-0 flex-1 items-center gap-1 lg:flex" aria-label="Navigation principale">
        <UPopover v-for="group in navigationGroups" :key="group.label">
          <button type="button" class="nav-link gap-1" :class="{ 'text-primary-700 dark:text-primary-300': group.items.some(item => route.path === item.to) }">
            {{ group.label }}<UIcon name="i-lucide-chevron-down" class="size-3.5" aria-hidden="true" />
          </button>
          <template #content>
            <div class="w-60 space-y-1 p-2">
              <NuxtLink v-for="item in group.items" :key="item.to" :to="item.to" class="nav-link w-full" :aria-current="route.path === item.to ? 'page' : undefined">{{ item.label }}</NuxtLink>
            </div>
          </template>
        </UPopover>
        <NuxtLink to="/pour-les-professionnels" class="nav-link" :aria-current="route.path === '/pour-les-professionnels' ? 'page' : undefined">Médecins</NuxtLink>
        <NuxtLink to="/contact" class="nav-link" :aria-current="route.path === '/contact' ? 'page' : undefined">Contact</NuxtLink>
      </nav>

      <div class="ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
        <template v-if="isAuthenticated && user">
          <!-- Notifications (tous breakpoints, comme layout default) -->
          <div class="relative z-10 shrink-0" ref="notificationsMenuRef">
            <button
              type="button"
              class="relative flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-lg text-[#3D3D52] transition-colors hover:bg-[#F7F7FB] active:bg-[#ebebf3] dark:text-gray-300 dark:hover:bg-gray-800 sm:h-9 sm:w-9 sm:min-h-9 sm:min-w-9"
              :aria-label="`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`"
              :aria-expanded="notificationsMenuOpen"
              @click.stop="toggleNotificationsMenu"
            >
              <ClientOnly>
                <template #default>
                  <UIcon name="i-lucide-bell" class="h-5 w-5" />
                </template>
                <template #fallback>
                  <span class="h-5 w-5" />
                </template>
              </ClientOnly>
              <span
                v-if="unreadCount > 0"
                class="absolute -right-0.5 -top-0.5 box-border inline-grid min-h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-red-500 px-[3px] text-center text-[10px] font-semibold tabular-nums leading-[10px] text-white shadow-sm dark:border-gray-900"
              >
                {{ unreadCount > 9 ? '9+' : unreadCount }}
              </span>
            </button>
            <div
              v-if="notificationsMenuOpen"
              class="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-[220] max-h-[min(24rem,calc(100dvh-5rem))] w-auto overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg md:absolute md:inset-x-auto md:left-auto md:right-0 md:top-auto md:mt-2 md:z-[220] md:w-80 md:max-h-96 dark:border-gray-700 dark:bg-gray-900"
            >
              <div
                v-if="notificationItems.length === 0 || (notificationItems.length === 1 && notificationItems[0].disabled)"
                class="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                Aucune notification
              </div>
              <template v-else>
                <button
                  v-for="(item, index) in notificationItems"
                  :key="index"
                  type="button"
                  :disabled="item.disabled"
                  class="flex w-full flex-col gap-1 px-4 py-3 text-left text-sm transition-colors"
                  :class="{
                    'cursor-not-allowed opacity-50': item.disabled,
                    'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/80': item.isRead,
                    'font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800': !item.isRead,
                  }"
                  @click="handleNotificationClick(item)"
                >
                  <span :class="{ 'font-medium': !item.isRead }">{{ item.label }}</span>
                  <span v-if="item.description" class="text-xs text-gray-400">{{ item.description }}</span>
                </button>
              </template>
            </div>
          </div>

          <!-- Menu avatar (desktop) -->
          <div class="relative z-10 hidden shrink-0 sm:block" ref="userMenuRef">
            <button
              type="button"
              class="relative flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-[#F7F7FB] active:bg-[#ebebf3] dark:text-gray-300 dark:hover:bg-gray-800 sm:h-9 sm:w-9 sm:min-h-9 sm:min-w-9"
              :aria-label="`Menu utilisateur: ${userDisplayName}`"
              :aria-expanded="userMenuOpen"
              @click.stop="toggleUserMenu"
            >
              <ClientOnly>
                <template #default>
                  <UserAvatar
                    v-if="user"
                    :src="user?.profile_image_url ?? user?.avatar"
                    :initial="(user?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()"
                    :alt="userDisplayName"
                    size="sm"
                    bare
                  />
                </template>
                <template #fallback>
                  <div class="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                </template>
              </ClientOnly>
            </button>
            <Transition
              enter-active-class="transition ease-out duration-150"
              enter-from-class="translate-y-1 opacity-0"
              enter-to-class="translate-y-0 opacity-100"
              leave-active-class="transition ease-in duration-100"
              leave-from-class="translate-y-0 opacity-100"
              leave-to-class="translate-y-1 opacity-0"
            >
              <div
                v-if="userMenuOpen"
                class="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-[220] max-h-[min(24rem,calc(100dvh-5rem))] w-auto overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200/80 bg-white shadow-xl md:absolute md:inset-x-auto md:left-auto md:right-0 md:top-auto md:z-[220] md:mt-2 md:w-64 md:max-h-none md:overflow-hidden dark:border-gray-700 dark:bg-gray-900 dark:shadow-none"
              >
                <div
                  class="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50"
                >
                  <div class="flex items-center gap-3">
                    <img
                      v-if="user?.profile_image_url ?? user?.avatar"
                      :src="(user?.profile_image_url ?? user?.avatar) as string"
                      :alt="userDisplayName"
                      class="h-10 w-10 rounded-full object-cover shadow ring-2 ring-white dark:ring-gray-700"
                    />
                    <div
                      v-else
                      class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 font-normal text-white shadow ring-2 ring-white dark:ring-gray-700"
                    >
                      {{ (user?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase() }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-normal text-gray-900 dark:text-white">
                        {{ userDisplayName }}
                      </p>
                      <span
                        class="inline-flex items-center rounded-md bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                      >
                        {{ roleLabel }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="py-1.5">
                  <template v-for="(item, index) in userMenuItems" :key="index">
                    <button
                      v-if="item.type !== 'divider'"
                      type="button"
                      class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/50"
                      @click="handleUserMenuItemClick(item)"
                    >
                      <UIcon
                        v-if="item.icon"
                        :name="item.icon"
                        class="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400"
                      />
                      <span>{{ item.label }}</span>
                    </button>
                    <div v-else class="my-1 border-t border-gray-100 dark:border-gray-700" />
                  </template>
                </div>
              </div>
            </Transition>
          </div>
        </template>

        <NuxtLink
          v-else
          :to="loginHref"
          class="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#3D3D52] transition-colors hover:bg-[#F7F7FB] dark:text-gray-300 dark:hover:bg-gray-800 sm:inline-flex"
        >
          Se connecter
        </NuxtLink>

        <UButton
          v-if="!isBooking"
          :to="appointmentNewUrl"
          color="primary"
          icon="i-lucide-calendar-plus"
          size="md"
          class="min-h-11 rounded-xl whitespace-nowrap font-semibold"
        >
          <span class="hidden sm:inline">Réserver</span>
          <span class="sm:hidden">Réserver</span>
        </UButton>

        <button
          type="button"
          class="ml-1 flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-lg text-[#3D3D52] hover:bg-[#F7F7FB] lg:hidden dark:text-gray-300 dark:hover:bg-gray-800"
          ref="mobileTrigger"
          aria-label="Ouvrir le menu"
          aria-controls="public-mobile-navigation"
          :aria-expanded="mobileOpen"
          @click="mobileOpen = true"
        >
          <UIcon :name="mobileOpen ? 'i-lucide-x' : 'i-lucide-menu'" class="h-5 w-5" />
        </button>
      </div>
    </div>

    <ClientOnly>
    <Teleport to="body">
      <dialog ref="mobileDialog" id="public-mobile-navigation" aria-labelledby="mobile-navigation-title"
        class="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-gray-900 backdrop:bg-gray-950/35 dark:text-white"
        @cancel="mobileOpen = false" @close="mobileOpen = false">
        <button type="button" class="absolute inset-0 h-full w-full cursor-default" aria-label="Fermer le menu en arrière-plan" tabindex="-1" @click="mobileOpen = false" />
        <div class="relative ml-auto flex h-full w-full max-w-sm flex-col bg-white shadow-xl dark:bg-gray-950">
          <div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 dark:border-gray-800">
            <h2 id="mobile-navigation-title" class="text-lg font-semibold">Explorer Cary</h2>
            <button autofocus type="button" aria-label="Fermer le menu" class="nav-link size-11 justify-center !p-0" @click="mobileOpen = false"><UIcon name="i-lucide-x" class="size-5" /></button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <section v-if="isAuthenticated && user" class="mb-4 border-b border-gray-200 pb-4 dark:border-gray-800" aria-label="Mon compte">
              <p class="break-words text-sm font-semibold">{{ userDisplayName }}</p>
              <p class="mb-2 text-xs text-gray-500">{{ roleLabel }}</p>
              <template v-for="(item, index) in userMenuItems" :key="index">
                <button v-if="item.type !== 'divider'" type="button" class="nav-link w-full gap-3" @click="handleMobileUserItem(item)"><UIcon v-if="item.icon" :name="item.icon" class="size-4" />{{ item.label }}</button>
              </template>
            </section>
            <nav aria-label="Navigation mobile" class="space-y-1">
              <details v-for="group in navigationGroups" :key="group.label" class="group border-b border-gray-100 dark:border-gray-800">
                <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between text-base font-semibold [&::-webkit-details-marker]:hidden">{{ group.label }}<UIcon name="i-lucide-plus" class="size-4 group-open:rotate-45" aria-hidden="true" /></summary>
                <div class="space-y-1 pb-3">
                  <NuxtLink v-for="item in group.items" :key="item.to" :to="item.to" class="nav-link w-full" :aria-current="route.path === item.to ? 'page' : undefined" @click="mobileOpen = false">{{ item.label }}</NuxtLink>
                </div>
              </details>
              <NuxtLink to="/pour-les-professionnels" class="nav-link !min-h-14 w-full !px-0 !text-base !font-semibold" @click="mobileOpen = false">Médecins</NuxtLink>
              <NuxtLink to="/contact" class="nav-link !min-h-14 w-full !px-0 !text-base !font-semibold" @click="mobileOpen = false">Contact</NuxtLink>
            </nav>
          </div>
          <div class="shrink-0 space-y-2 border-t border-gray-200 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-800">
            <NuxtLink :to="appointmentNewUrl" class="flex min-h-12 items-center justify-center rounded-xl bg-primary-500 px-4 text-sm font-semibold text-primary-950 hover:bg-primary-600" @click="mobileOpen = false">Prendre rendez-vous</NuxtLink>
            <NuxtLink v-if="!isAuthenticated" :to="loginHref" class="nav-link w-full justify-center" @click="mobileOpen = false">Se connecter</NuxtLink>
          </div>
        </div>
      </dialog>
    </Teleport>
    </ClientOnly>
  </header>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

const { holdCount } = useBookingApiHold();
const route = useRoute();
const { isAuthenticated } = useAuth();
const { user, roleLabel, userMenuItems, userDisplayName } = useHeaderUserMenu();
const { appointmentNewUrl } = useAppointmentNewUrl();

const notifications = useState<any[]>('notifications.list', () => []);

const scrolled = ref(false);
const mobileOpen = ref(false);
const mobileDialog = ref<HTMLDialogElement | null>(null);
const mobileTrigger = ref<HTMLButtonElement | null>(null);
const isBooking = computed(() => route.path.startsWith('/rendez-vous'));
let previousBodyOverflow = '';
let desktopQuery: MediaQueryList | undefined;
function closeMenuOnDesktop() {
  if (desktopQuery?.matches) mobileOpen.value = false;
}
const userMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);
const notificationsMenuOpen = ref(false);
const notificationsMenuRef = ref<HTMLElement | null>(null);

const loginHref = computed(
  () => `/login?returnTo=${encodeURIComponent(route.fullPath)}`,
);

const patientMenuItems = computed(() => [
  { label: 'Réserver une visite', to: appointmentNewUrl.value },
  { label: 'Laboratoires', to: '/laboratoires' },
  { label: 'Infirmiers', to: '/infirmiers' },
  { label: 'Comment ça marche', to: '/pour-les-patients' },
]);

const nurseMenuItems = [
  { label: 'Pourquoi Cary', to: '/pour-les-infirmiers' },
  { label: 'Tarifs', to: '/pour-les-infirmiers/tarifs' },
];

const labMenuItems = [
  { label: 'Pourquoi Cary', to: '/pour-les-laboratoires' },
  { label: 'Tarifs', to: '/pour-les-laboratoires/tarifs' },
];

const navigationGroups = computed(() => [
  { label: 'Patients', items: patientMenuItems.value },
  { label: 'Infirmiers', items: nurseMenuItems },
  { label: 'Laboratoires', items: labMenuItems },
]);

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

function handleUserMenuItemClick(item: { click?: () => void }) {
  item.click?.();
  userMenuOpen.value = false;
}

function handleMobileUserItem(item: { click?: () => void }) {
  item.click?.();
  mobileOpen.value = false;
}

function handleNotificationClick(item: { disabled?: boolean; click?: () => void }) {
  if (item.disabled) return;
  item.click?.();
  notificationsMenuOpen.value = false;
}

const markAllNotificationsAsRead = async () => {
  if (!isAuthenticated.value || !notifications.value.length) return;

  const unreadNotifications = notifications.value.filter((n) => !n.read_at);
  if (!unreadNotifications.length) return;

  try {
    const now = new Date().toISOString();
    unreadNotifications.forEach((notif) => {
      notif.read_at = now;
    });

    await Promise.all(
      unreadNotifications.map(async (notif) => {
        try {
          await apiFetch(`/notifications/${notif.id}/read`, { method: 'PUT' });
        } catch {
          notif.read_at = null;
        }
      }),
    );

    const res = await apiFetch('/notifications?limit=10', { method: 'GET' });
    if (res && res.success) {
      notifications.value = res.data;
    }
  } catch (e) {
    console.error('Erreur lors du marquage des notifications:', e);
  }
};

watch(notificationsMenuOpen, async (isOpen) => {
  if (isOpen) await markAllNotificationsAsRead();
});

const handleClickOutside = (event: MouseEvent) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    userMenuOpen.value = false;
  }
  if (notificationsMenuRef.value && !notificationsMenuRef.value.contains(event.target as Node)) {
    notificationsMenuOpen.value = false;
  }
};

function onScroll() {
  scrolled.value = window.scrollY > 10;
}

watch(
  () => route.path,
  () => {
    mobileOpen.value = false;
    userMenuOpen.value = false;
    notificationsMenuOpen.value = false;
  },
);

watch(mobileOpen, async (open) => {
  if (!import.meta.client) return;
  await nextTick();
  if (open) {
    userMenuOpen.value = false;
    notificationsMenuOpen.value = false;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    mobileDialog.value?.showModal();
  } else {
    mobileDialog.value?.close();
    document.body.style.overflow = previousBodyOverflow;
    mobileTrigger.value?.focus({ preventScroll: true });
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('scroll', onScroll);
  if (import.meta.client) {
    if (mobileOpen.value) document.body.style.overflow = previousBodyOverflow;
    desktopQuery?.removeEventListener('change', closeMenuOnDesktop);
  }
});

const unreadCount = computed(() => notifications.value.filter((n) => !n.read_at).length);

const notificationItems = computed<Array<{ label: string; description?: string; isRead?: boolean; disabled?: boolean; click?: () => void }>>(() => {
  if (!notifications.value.length) {
    return [{ label: 'Aucune notification', disabled: true }];
  }

  return notifications.value.slice(0, 10).map((notif) => ({
    label: notif.title
      ? `${notif.title}${notif.message ? ` — ${notif.message}` : ''}`
      : notif.message || 'Notification',
    description: notif.created_at
      ? new Date(notif.created_at).toLocaleString('fr-FR')
      : undefined,
    isRead: !!notif.read_at,
    click: () => {
      const data =
        typeof notif.data === 'string'
          ? (() => {
              try {
                return JSON.parse(notif.data);
              } catch {
                return {};
              }
            })()
          : notif.data || {};
      const aptId = notif.appointment_id || data?.appointment_id;
      if (!aptId) return;
      const role = user.value?.role;
      if (
        (notif.type === 'care_gallery_photo' || notif.type === 'care_gallery_comment') &&
        (role === 'pro' || role === 'nurse')
      ) {
        const base = role === 'pro' ? '/pro' : '/nurse';
        const pid =
          data?.photo_id != null && String(data.photo_id).trim() !== ''
            ? String(data.photo_id)
            : null;
        void navigateTo({
          path: `${base}/appointments/${aptId}`,
          query: { careGallery: '1', ...(pid ? { carePhoto: pid } : {}) },
        });
        return;
      }
      if (role === 'patient') {
        const hash = notif.type === 'results_ready' ? '#resultats' : '';
        navigateTo({ path: `/patient/appointments/${aptId}`, hash });
      } else if (role === 'nurse') {
        navigateTo(`/nurse/appointments/${aptId}`);
      } else if (role === 'lab' || role === 'subaccount') {
        navigateTo(`/lab/appointments/${aptId}`);
      } else if (role === 'pro') {
        navigateTo(`/pro/appointments/${aptId}`);
      } else if (role === 'preleveur') {
        navigateTo(`/preleveur/appointments/${aptId}`);
      } else if (role === 'super_admin' || role === 'admin') {
        navigateTo(`/admin/appointments/${aptId}`);
      }
    },
  }));
});

const { start: startPolling } = usePolling(
  async () => {
    if (isAuthenticated.value) {
      const res = await apiFetch('/notifications?limit=10', { method: 'GET' });
      if (res && res.success) notifications.value = res.data;
    }
  },
  30000,
  { shouldSkip: () => holdCount.value > 0 },
);

onMounted(async () => {
  desktopQuery = window.matchMedia('(min-width: 1024px)');
  desktopQuery.addEventListener('change', closeMenuOnDesktop);
  document.addEventListener('click', handleClickOutside);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (isAuthenticated.value) {
    const res = await apiFetch('/notifications?limit=10', { method: 'GET' });
    if (res && res.success) notifications.value = res.data;
    startPolling();
  }
});
</script>

<style scoped>
.nav-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  border-radius: 0.75rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: left;
  transition: background-color 150ms;
}
.nav-link:hover { background: color-mix(in srgb, currentColor 5%, transparent); }
.nav-link:focus-visible, summary:focus-visible { outline: 2px solid #159587; outline-offset: 2px; }
.nav-link[aria-current='page'] { background: #e9faf7; color: #12675e; }
</style>
