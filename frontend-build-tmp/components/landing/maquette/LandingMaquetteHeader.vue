<template>
  <header
    class="fixed top-0 left-0 right-0 z-[200] border-b border-[#E8E8F0] bg-white/92 backdrop-blur-xl backdrop-saturate-150 transition-shadow duration-200 pt-[env(safe-area-inset-top)] dark:bg-gray-950/92 dark:border-gray-800"
    :class="{ 'shadow-[0_2px_20px_rgba(0,0,0,0.06)]': scrolled }"
  >
    <div
      class="mx-auto flex h-[66px] w-full max-w-[1200px] items-center gap-4 px-6 md:gap-10 lg:px-12"
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

      <nav class="hidden min-w-0 flex-1 items-center gap-1 overflow-visible lg:flex" aria-label="Navigation principale">
        <UPopover mode="hover" :open-delay="100" :close-delay="80">
          <button
            type="button"
            class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-[#3D3D52] transition-colors hover:bg-[#F7F7FB] hover:text-[#0A0A0F] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            :class="{
              'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400':
                route.path === '/pour-les-patients' ||
                route.path.startsWith('/laboratoires') ||
                route.path.startsWith('/infirmiers') ||
                route.path === '/rendez-vous/nouveau',
            }"
          >
            Patient
            <UIcon name="i-lucide-chevron-down" class="h-4 w-4 shrink-0 text-[#9090A8]" />
          </button>
          <template #content>
            <div
              class="w-[240px] rounded-xl border border-[#E8E8F0] bg-white p-1.5 shadow-[0_8px_24px_-6px_rgb(15_23_42/0.12)] dark:border-gray-800 dark:bg-gray-900"
            >
              <NuxtLink
                v-for="item in patientMenuItems"
                :key="item.to"
                :to="item.to"
                class="block rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                :class="[
                  route.path === item.to
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400'
                    : 'text-[#3D3D52] hover:bg-[#F7F7FB] hover:text-[#0A0A0F] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
                ]"
              >
                {{ item.label }}
              </NuxtLink>
            </div>
          </template>
        </UPopover>

        <UPopover mode="hover" :open-delay="100" :close-delay="80">
          <button
            type="button"
            class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-[#3D3D52] transition-colors hover:bg-[#F7F7FB] hover:text-[#0A0A0F] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            :class="{
              'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400':
                route.path.startsWith('/pour-les-infirmiers'),
            }"
          >
            Infirmiers
            <UIcon name="i-lucide-chevron-down" class="h-4 w-4 shrink-0 text-[#9090A8]" />
          </button>
          <template #content>
            <div
              class="w-[200px] rounded-xl border border-[#E8E8F0] bg-white p-1.5 shadow-[0_8px_24px_-6px_rgb(15_23_42/0.12)] dark:border-gray-800 dark:bg-gray-900"
            >
              <NuxtLink
                v-for="item in nurseMenuItems"
                :key="item.to"
                :to="item.to"
                class="block rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                :class="[
                  route.path === item.to
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400'
                    : 'text-[#3D3D52] hover:bg-[#F7F7FB] hover:text-[#0A0A0F] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
                ]"
              >
                {{ item.label }}
              </NuxtLink>
            </div>
          </template>
        </UPopover>

        <UPopover mode="hover" :open-delay="100" :close-delay="80">
          <button
            type="button"
            class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-[#3D3D52] transition-colors hover:bg-[#F7F7FB] hover:text-[#0A0A0F] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            :class="{
              'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400':
                route.path.startsWith('/pour-les-laboratoires'),
            }"
          >
            Laboratoire
            <UIcon name="i-lucide-chevron-down" class="h-4 w-4 shrink-0 text-[#9090A8]" />
          </button>
          <template #content>
            <div
              class="w-[200px] rounded-xl border border-[#E8E8F0] bg-white p-1.5 shadow-[0_8px_24px_-6px_rgb(15_23_42/0.12)] dark:border-gray-800 dark:bg-gray-900"
            >
              <NuxtLink
                v-for="item in labMenuItems"
                :key="item.to"
                :to="item.to"
                class="block rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                :class="[
                  route.path === item.to
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400'
                    : 'text-[#3D3D52] hover:bg-[#F7F7FB] hover:text-[#0A0A0F] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
                ]"
              >
                {{ item.label }}
              </NuxtLink>
            </div>
          </template>
        </UPopover>

        <NuxtLink
          to="/pour-les-professionnels"
          class="rounded-lg px-3 py-2 text-sm text-[#3D3D52] transition-colors hover:bg-[#F7F7FB] hover:text-[#0A0A0F] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          :class="{
            'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400':
              route.path === '/pour-les-professionnels',
          }"
        >
          Professionnel
        </NuxtLink>
        <NuxtLink
          to="/contact"
          class="rounded-lg px-3 py-2 text-sm text-[#3D3D52] transition-colors hover:bg-[#F7F7FB] hover:text-[#0A0A0F] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          :class="{
            'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400':
              route.path === '/contact',
          }"
        >
          Contact
        </NuxtLink>
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
          :to="appointmentNewUrl"
          color="primary"
          icon="i-lucide-calendar-plus"
          size="md"
          class="whitespace-nowrap font-medium"
        >
          <span class="hidden sm:inline">Prendre rendez-vous</span>
          <span class="sm:hidden">RDV</span>
        </UButton>

        <button
          type="button"
          class="ml-1 flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-lg text-[#3D3D52] hover:bg-[#F7F7FB] lg:hidden dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Menu"
          :aria-expanded="mobileOpen"
          @click="mobileOpen = !mobileOpen"
        >
          <UIcon :name="mobileOpen ? 'i-lucide-x' : 'i-lucide-menu'" class="h-5 w-5" />
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="mobileOpen" class="fixed inset-0 z-[199] lg:hidden">
        <button
          type="button"
          class="absolute inset-0 bg-black/40"
          aria-label="Fermer le menu"
          @click="mobileOpen = false"
        />
        <div
          class="absolute right-0 top-0 bottom-0 flex w-[min(100%,22rem)] flex-col overflow-hidden bg-white shadow-xl dark:bg-gray-900 pt-[calc(66px+env(safe-area-inset-top))]"
        >
          <div
            v-if="isAuthenticated && user"
            class="max-h-[min(40vh,280px)] shrink-0 overflow-y-auto border-b border-gray-200 px-4 py-5 dark:border-gray-800"
          >
            <div class="mb-4 flex items-center gap-3">
              <img
                v-if="user?.profile_image_url ?? user?.avatar"
                :src="(user?.profile_image_url ?? user?.avatar) as string"
                :alt="userDisplayName"
                class="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700"
              />
              <div
                v-else
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 font-normal text-white ring-2 ring-gray-100 dark:ring-gray-700"
              >
                {{ (user?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-normal text-gray-900 dark:text-white">{{ userDisplayName }}</p>
                <span
                  class="inline-flex items-center rounded-md bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700"
                >
                  {{ roleLabel }}
                </span>
              </div>
            </div>
            <div class="space-y-1">
              <template v-for="(item, idx) in userMenuItems" :key="idx">
                <div v-if="item.type === 'divider'" class="my-2 border-t border-gray-200 dark:border-gray-700" />
                <button
                  v-else
                  type="button"
                  class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  @click="handleMobileUserItem(item)"
                >
                  <UIcon v-if="item.icon" :name="item.icon" class="h-5 w-5 shrink-0" />
                  <span>{{ item.label }}</span>
                </button>
              </template>
            </div>
          </div>

          <LandingMaquetteMarketingMobileDrill
            class="flex min-h-0 flex-1 flex-col"
            :patient-links="patientMenuItems"
            :nurse-links="nurseMenuItems"
            :lab-links="labMenuItems"
            :appointment-url="appointmentNewUrl"
            :login-href="loginHref"
            :show-login="!isAuthenticated"
            @navigate="mobileOpen = false"
          />
        </div>
      </div>
    </Teleport>
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
const userMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);
const notificationsMenuOpen = ref(false);
const notificationsMenuRef = ref<HTMLElement | null>(null);

const loginHref = computed(
  () => `/login?returnTo=${encodeURIComponent(route.fullPath)}`,
);

const patientMenuItems = computed(() => [
  { label: 'Prendre rendez-vous', to: appointmentNewUrl.value },
  { label: 'Explorer les laboratoires', to: '/laboratoires' },
  { label: 'Explorer les infirmiers', to: '/infirmiers' },
  { label: 'Pour les patients', to: '/pour-les-patients' },
]);

const nurseMenuItems = [
  { label: 'Présentation', to: '/pour-les-infirmiers' },
  { label: 'Tarifs', to: '/pour-les-infirmiers/tarifs' },
];

const labMenuItems = [
  { label: 'Présentation', to: '/pour-les-laboratoires' },
  { label: 'Tarifs', to: '/pour-les-laboratoires/tarifs' },
];

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

watch(mobileOpen, (open) => {
  if (import.meta.client) {
    document.body.style.overflow = open ? 'hidden' : '';
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('scroll', onScroll);
  if (import.meta.client) {
    document.body.style.overflow = '';
  }
});

const unreadCount = computed(() => notifications.value.filter((n) => !n.read_at).length);

const notificationItems = computed(() => {
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
