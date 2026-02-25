<template>
  <div class="flex flex-col h-screen bg-gray-50">
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
        'flex flex-col bg-white border-r border-gray-200 w-64 fixed md:static inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      ]"
    >
      <!-- Header Sidebar -->
      <div class="flex items-center justify-center w-full px-4 h-[60px] border-b border-gray-200">
        <NuxtLink
          to="/"
          class="flex items-center justify-center w-full transition-all duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg"
          aria-label="Retour à l'accueil"
        >
          <img
            src="/images/onelogo.png"
            alt="OneAndLab"
            class="h-9 mx-auto object-contain transition-all duration-300 ease-in-out drop-shadow-sm"
            loading="eager"
            decoding="async"
          />
        </NuxtLink>
      </div>

      <!-- Navigation -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll">
        <!-- Navigation principale -->
        <ClientOnly>
          <nav class="flex-1 px-3 py-4" aria-label="Navigation principale">
            <ul class="flex flex-col gap-1">
              <li v-for="item in navigationItems[0]" :key="item.to">
                <NuxtLink
                  :to="item.to"
                  @click="(e) => { mobileSidebarOpen = false; handleSidebarNavigate(e, item.to) }"
                  :class="[
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
                    'active:scale-[0.98]',
                    item.active
                      ? 'bg-primary-50 text-primary-600 shadow-sm'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                  ]"
                  :aria-current="item.active ? 'page' : undefined"
                >
                  <!-- Barre latérale active -->
                  <div
                    v-if="item.active"
                    class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-600 transition-all duration-200"
                  />
                  
                  <UIcon
                    :name="item.icon"
                    :class="[
                      'h-5 w-5 flex-shrink-0 transition-all duration-200',
                      item.active
                        ? 'text-primary-600 scale-105'
                        : 'text-gray-500 group-hover:text-primary-600 group-hover:scale-105'
                    ]"
                    aria-hidden="true"
                  />
                  <span class="truncate flex-1 transition-opacity duration-200">
                    {{ item.label }}
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </nav>

          <!-- Navigation secondaire -->
          <nav
            v-if="navigationItems[1]?.length"
            class="border-t border-gray-200 px-3 py-4"
            aria-label="Navigation secondaire"
          >
            <ul class="flex flex-col gap-1">
              <li v-for="item in navigationItems[1]" :key="item.to">
                <NuxtLink
                  :to="item.to"
                  @click="(e) => { mobileSidebarOpen = false; handleSidebarNavigate(e, item.to) }"
                  :class="[
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
                    'active:scale-[0.98]',
                    item.active
                      ? 'bg-primary-50 text-primary-600 shadow-sm'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                  ]"
                  :aria-current="item.active ? 'page' : undefined"
                >
                  <!-- Barre latérale active -->
                  <div
                    v-if="item.active"
                    class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-600 transition-all duration-200"
                  />
                  
                  <UIcon
                    :name="item.icon"
                    :class="[
                      'h-5 w-5 flex-shrink-0 transition-all duration-200',
                      item.active
                        ? 'text-primary-600 scale-105'
                        : 'text-gray-500 group-hover:text-primary-600 group-hover:scale-105'
                    ]"
                    aria-hidden="true"
                  />
                  <span class="truncate flex-1 transition-opacity duration-200">
                    {{ item.label }}
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </nav>
          <template #fallback>
            <nav class="flex-1 px-3 py-4" aria-label="Navigation principale">
              <div class="h-8 w-full bg-gray-100 rounded animate-pulse"></div>
            </nav>
          </template>
        </ClientOnly>
      </div>
    </aside>

    <!-- Overlay pour mobile -->
    <div
      v-if="mobileSidebarOpen"
      class="fixed inset-0 bg-black/50 z-30 md:hidden"
      @click="mobileSidebarOpen = false"
    />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 px-4 md:px-6 h-[60px] flex items-center">
        <div class="flex items-center justify-between w-full gap-4">
          <!-- Menu mobile -->
          <button
            @click="mobileSidebarOpen = !mobileSidebarOpen"
            class="md:hidden h-9 w-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <UIcon name="i-lucide-menu" class="h-5 w-5" />
          </button>

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
          <div class="flex items-center gap-1.5 sm:gap-2">
            <!-- Notifications -->
            <div class="relative" ref="notificationsMenuRef">
              <button
                type="button"
                @click.stop="notificationsMenuOpen = !notificationsMenuOpen"
                class="relative h-9 w-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                :aria-label="`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`"
                :aria-expanded="notificationsMenuOpen"
              >
                <UIcon name="i-lucide-bell" class="h-5 w-5" />
                <span
                  v-if="unreadCount > 0"
                  class="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-primary-600 text-xs font-medium text-white"
                >
                  {{ unreadCount > 9 ? '9+' : unreadCount }}
                </span>
              </button>
              
              <!-- Dropdown Notifications -->
              <div
                v-if="notificationsMenuOpen"
                class="absolute right-0 mt-2 w-80 rounded-lg bg-white border border-gray-200 shadow-lg z-50 py-1 max-h-96 overflow-y-auto"
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

            <!-- User Menu -->
            <div class="relative" ref="userMenuRef">
              <ClientOnly>
                <button
                  type="button"
                  @click="userMenuOpen = !userMenuOpen"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  :aria-label="`Menu utilisateur: ${headerUserDisplayName}`"
                  :aria-expanded="userMenuOpen"
                >
                  <UserAvatar
                    :src="headerAvatarSrc"
                    :initial="headerAvatarInitial"
                    :alt="headerUserDisplayName"
                    size="md"
                  />
                  <span class="text-sm font-medium">{{ headerUserDisplayName }}</span>
                  <UIcon name="i-lucide-chevron-down" class="h-4 w-4 transition-transform" :class="{ 'rotate-180': userMenuOpen }" />
                </button>
                <template #fallback>
                  <div class="h-8 w-24 bg-gray-100 rounded animate-pulse"></div>
                </template>
              </ClientOnly>
              
              <!-- Dropdown Menu -->
              <div
                v-if="userMenuOpen"
                class="absolute right-0 mt-2 w-56 rounded-lg bg-white border border-gray-200 shadow-lg z-50 py-1"
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

      <!-- Content -->
      <main class="flex-1 overflow-y-auto bg-gray-50 min-h-0 flex flex-col">
        <div class="flex-1 p-4 md:p-6">
          <slot />
        </div>
        <!-- Footer -->
        <footer class="flex-shrink-0 bg-white border-t border-gray-200 px-4 md:px-6 py-3">
          <div class="flex items-center justify-center text-sm text-gray-500">
            <p>&copy; {{ new Date().getFullYear() }} OneAndLab. Tous droits réservés.</p>
          </div>
        </footer>
      </main>
    </div>
    </div>
  </div>

  <!-- Popup de notification pour nouveaux RDV (infirmiers, lab, sous-compte) — s'ouvre automatiquement au polling -->
  <ClientOnly>
    <Teleport to="body">
      <AppointmentModal
        v-if="['nurse', 'lab', 'subaccount'].includes(user?.role ?? '')"
        v-model="showAppointmentModal"
        :appointment="selectedAppointment"
        :role="(user?.role === 'subaccount' ? 'subaccount' : user?.role === 'lab' ? 'lab' : 'nurse')"
        @accepted="handleAppointmentAccepted"
        @refused="handleAppointmentRefused"
      />
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { apiFetch } from "~/utils/api";

const { user, logout, fetchCurrentUser } = useAuth();
const route = useRoute();
const router = useRouter();
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

// Navigation sidebar : forcer navigation programmatique pour éviter blocage (ex. page Abonnements)
const handleSidebarNavigate = (e: MouseEvent, to: string) => {
  const current = route.path.replace(/\/$/, '') || '/';
  const target = to.replace(/\/$/, '') || '/';
  if (current === target) return;
  e.preventDefault();
  router.push(to);
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

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Modal pour nouveaux rendez-vous (infirmiers)
const showAppointmentModal = ref(false);
const selectedAppointment = ref<any>(null);
const lastPendingCount = ref(0);
const seenAppointmentIds = ref<Set<string>>(new Set());

/** Ouvre la popup RDV avec un rendez-vous chargé par ID (notif ou ?openAppointment=). */
async function openAppointmentModalById(appointmentId: string) {
  const role = user.value?.role;
  if (!appointmentId || !['nurse', 'lab', 'subaccount'].includes(role ?? '')) return;
  try {
    const detailRes = await apiFetch(`/appointments/${appointmentId}`, { method: 'GET' });
    if (detailRes?.success && detailRes.data) {
      selectedAppointment.value = detailRes.data;
      showAppointmentModal.value = true;
    }
  } catch (e) {
    console.error('[openAppointmentModalById]', e);
  }
}

const unreadCount = computed(
  () => notifications.value.filter(n => !n.read_at).length
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
    "/nurse/soins": { label: "Soins actifs", icon: "i-lucide-activity" },
    "/nurse/reviews": { label: "Réputation", icon: "i-lucide-star" },
    "/nurse/abonnement": { label: "Abonnement", icon: "i-lucide-credit-card" },
    
    // Routes admin
    "/admin": { label: "Tableau de bord", icon: "i-lucide-layout-dashboard" },
    "/admin/inscriptions": { label: "Inscriptions", icon: "i-lucide-user-plus" },
    "/admin/appointments": { label: "Rendez-vous", icon: "i-lucide-calendar" },
    "/admin/calendar": { label: "Calendrier", icon: "i-lucide-calendar-days" },
    "/admin/users": { label: "Utilisateurs", icon: "i-lucide-users" },
    "/admin/categories": { label: "Catégories", icon: "i-lucide-tags" },
    "/admin/coverage": { label: "Zones", icon: "i-lucide-map" },
    "/admin/reviews": { label: "Avis", icon: "i-lucide-star" },
    "/admin/notifications": { label: "Notifications", icon: "i-lucide-bell" },
    "/admin/abonnements": { label: "Abonnements", icon: "i-lucide-credit-card" },
    "/admin/logs": { label: "Logs", icon: "i-lucide-file-text" },
    
    // Routes lab
    "/lab": { label: "Tableau de bord", icon: "i-lucide-layout-dashboard" },
    "/lab/appointments": { label: "Rendez-vous", icon: "i-lucide-calendar" },
    "/lab/calendar": { label: "Calendrier", icon: "i-lucide-calendar-days" },
    "/lab/stats": { label: "Statistiques", icon: "i-lucide-bar-chart" },
    "/lab/subaccounts": { label: "Sous-comptes", icon: "i-lucide-users" },
    "/lab/preleveurs": { label: "Préleveurs", icon: "i-lucide-user-check" },
    "/lab/abonnement": { label: "Abonnement", icon: "i-lucide-credit-card" },
    
    // Routes subaccount
    "/subaccount": { label: "Tableau de bord", icon: "i-lucide-layout-dashboard" },
    "/subaccount/appointments": { label: "Rendez-vous", icon: "i-lucide-calendar" },
    "/subaccount/calendar": { label: "Calendrier", icon: "i-lucide-calendar-days" },
    "/subaccount/reviews": { label: "Réputation", icon: "i-lucide-star" },
    "/subaccount/preleveurs": { label: "Préleveurs", icon: "i-lucide-user-check" },
    
    // Routes preleveur
    "/preleveur": { label: "Tableau de bord", icon: "i-lucide-layout-dashboard" },
    "/preleveur/appointments": { label: "Rendez-vous", icon: "i-lucide-calendar" },
    "/preleveur/calendar": { label: "Calendrier", icon: "i-lucide-calendar-days" },
    
    // Routes pro
    "/pro": { label: "Tableau de bord", icon: "i-lucide-layout-dashboard" },
    "/pro/appointments": { label: "Rendez-vous", icon: "i-lucide-calendar" },
    "/pro/patients": { label: "Patients", icon: "i-lucide-users" },
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
  
  // super_admin utilise /admin comme base
  let roleBasePath = `/${role || ""}`;
  if (role === 'super_admin') {
    roleBasePath = '/admin';
  }
  if (role === 'nurse' && path === '/nurse') {
    // Rediriger vers appointments dans le breadcrumb
    items.push({
      label: "Rendez-vous",
      icon: "i-lucide-calendar",
      to: "/nurse/appointments",
    });
  } else if (role && routeLabels[roleBasePath]) {
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
      items.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "),
        icon: "i-lucide-file-text",
      });
    }
  }

  return items;
});

const navigationItems = computed(() => {
  const role = user.value?.role;
  const p = route.path;
  const active = (x: string) => p.startsWith(x);
  // "Mon profil" actif uniquement sur son propre profil (pas en édition préleveur/sous-compte)
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
          label: "Logs HDS",
          icon: "i-lucide-file-text",
          to: "/admin/logs",
          active: active("/admin/logs"),
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
          active: active("/nurse/appointments"),
        },
        {
          label: "Soins actifs",
          icon: "i-lucide-activity",
          to: "/nurse/soins",
          active: active("/nurse/soins"),
        },
        {
          label: "Réputation",
          icon: "i-lucide-star",
          to: "/nurse/reviews",
          active: active("/nurse/reviews"),
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
          label: "Calendrier",
          icon: "i-lucide-calendar-days",
          to: "/subaccount/calendar",
          active: active("/subaccount/calendar"),
        },
        {
          label: "Réputation",
          icon: "i-lucide-star",
          to: "/subaccount/reviews",
          active: active("/subaccount/reviews"),
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
          label: "Calendrier",
          icon: "i-lucide-calendar-days",
          to: "/lab/calendar",
          active: active("/lab/calendar"),
        },
        {
          label: "Réputation",
          icon: "i-lucide-star",
          to: "/lab/reviews",
          active: active("/lab/reviews"),
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
          label: "Tableau de bord",
          icon: "i-lucide-layout-dashboard",
          to: "/preleveur",
          active: p === "/preleveur" || p === "/preleveur/",
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
          label: "Tableau de bord",
          icon: "i-lucide-layout-dashboard",
          to: "/pro",
          active: p === "/pro" || p === "/pro/",
        },
        {
          label: "Patients",
          icon: "i-lucide-users",
          to: "/pro/patients",
          active: active("/pro/patients"),
        },
        {
          label: "Rendez-vous",
          icon: "i-lucide-calendar",
          to: "/pro/appointments",
          active: active("/pro/appointments"),
        },
        {
          label: "Calendrier",
          icon: "i-lucide-calendar-days",
          to: "/pro/calendar",
          active: active("/pro/calendar"),
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

  return menus[role] || [[], []];
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

const notificationItems = computed(() => {
  if (!notifications.value.length) {
    return [
      {
        label: "Aucune notification",
        disabled: true,
      },
    ];
  }

  const role = user.value?.role;
  const reviewsPath = role === 'nurse' ? '/nurse/reviews' : role === 'lab' ? '/lab/reviews' : role === 'subaccount' ? '/subaccount/reviews' : null;
  return notifications.value.slice(0, 10).map((notif) => {
    const data = typeof notif.data === 'string' ? (() => { try { return JSON.parse(notif.data); } catch { return {}; } })() : (notif.data || {});
    const isNewReview = notif.type === 'new_review' || data.review_id;
    return {
      label: notif.title || notif.message || "Notification",
      message: notif.title ? (notif.message || undefined) : undefined,
      description: notif.created_at
        ? new Date(notif.created_at).toLocaleString("fr-FR")
        : undefined,
      icon: notif.type === "marketing" ? "i-lucide-megaphone" : notif.type === "new_review" ? "i-lucide-star" : "i-lucide-bell",
      isRead: !!notif.read_at,
      click: () => {
        if (isNewReview && reviewsPath) navigateTo(reviewsPath);
        else if (notif.appointment_id && ['nurse', 'lab', 'subaccount'].includes(role ?? '')) {
          openAppointmentModalById(notif.appointment_id);
          const appointmentsPath = role === 'nurse' ? '/nurse/appointments' : role === 'subaccount' ? '/subaccount/appointments' : '/lab/appointments';
          navigateTo(appointmentsPath);
        } else if (notif.appointment_id) navigateTo(`/nurse/appointments/${notif.appointment_id}`);
      },
    };
  });
});

const { start: startPolling, stop: stopPolling } = usePolling(async () => {
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
}, 10000); // Réduire à 10 secondes pour les notifications

// Détecter les nouveaux rendez-vous pour infirmiers, lab et sous-compte (popup auto)
const { start: startAppointmentPolling, stop: stopAppointmentPolling, isPolling: isAppointmentPolling } = usePolling(async () => {
  const role = user.value?.role;
  if (!['nurse', 'lab', 'subaccount'].includes(role ?? '')) {
    return;
  }
  
  const shouldOpenModal = !showAppointmentModal.value;
  
  const res = await apiFetch('/appointments?status=pending&limit=100', {
    method: 'GET'
  });
  
  if (res?.success && res.data) {
    const pending = res.data.filter((a: any) => {
      if (role === 'nurse') return a.status === 'pending' && !a.assigned_nurse_id;
      if (role === 'lab' || role === 'subaccount') return a.status === 'pending' && a.type === 'blood_test' && !a.assigned_lab_id;
      return false;
    });
    
    const newAppointments = pending.filter((a: any) => !seenAppointmentIds.value.has(a.id));
    
    if (newAppointments.length > 0 && shouldOpenModal) {
      const appId = newAppointments[0].id;
      try {
        const detailRes = await apiFetch(`/appointments/${appId}`, { method: 'GET' });
        if (detailRes?.success && detailRes.data) {
          const data = detailRes.data;
          const alreadyAcceptedByOther = role === 'nurse'
            ? (data.assigned_nurse_id != null || data.assigned_lab_id != null)
            : (data.assigned_lab_id != null);
          if (alreadyAcceptedByOther) {
            // Ne pas rouvrir la popup : déjà pris par un confrère
            seenAppointmentIds.value.add(appId);
          } else {
            selectedAppointment.value = data;
            showAppointmentModal.value = true;
            seenAppointmentIds.value.add(appId);
          }
        } else {
          console.error('[AppointmentPolling] Failed to load appointment details', detailRes);
        }
      } catch (error) {
        console.error('[AppointmentPolling] Error loading appointment details', error);
      }
    }
    
    // Ne marquer comme vus que les rendez-vous qui ne peuvent pas être affichés (modal déjà ouverte)
    // Les autres resteront "non vus" jusqu'à ce qu'ils soient affichés
    if (!shouldOpenModal && newAppointments.length > 0) {
      // Si la modal est déjà ouverte, on marque les nouveaux comme vus pour éviter les doublons
      // mais on les gardera en mémoire pour les afficher après la fermeture de la modal
      newAppointments.forEach((a: any) => seenAppointmentIds.value.add(a.id));
    }
    
    lastPendingCount.value = pending.length;
  }
}, 10000);

const handleAppointmentAccepted = () => {
  showAppointmentModal.value = false;
  selectedAppointment.value = null;
  // Vérifier s'il y a d'autres rendez-vous en attente après la fermeture
  setTimeout(() => {
    startAppointmentPolling();
  }, 500);
};

const handleAppointmentRefused = () => {
  showAppointmentModal.value = false;
  selectedAppointment.value = null;
  // Vérifier s'il y a d'autres rendez-vous en attente après la fermeture
  setTimeout(() => {
    startAppointmentPolling();
  }, 500);
};

// Ouvrir la popup depuis ?openAppointment= (redirection depuis détail pour un RDV pending)
watch(
  () => ({ path: route.path, openAppointment: route.query.openAppointment }),
  async (curr) => {
    const role = user.value?.role;
    if (!['nurse', 'lab', 'subaccount'].includes(role ?? '') || !curr.openAppointment) return;
    const appointmentsPath = role === 'nurse' ? '/nurse/appointments' : role === 'subaccount' ? '/subaccount/appointments' : '/lab/appointments';
    if (curr.path !== appointmentsPath) return;
    const id = Array.isArray(curr.openAppointment) ? curr.openAppointment[0] : curr.openAppointment;
    await openAppointmentModalById(id);
    await navigateTo(appointmentsPath, { replace: true });
  },
  { immediate: true },
);

// Initialiser et ouvrir la popup auto pour nurse / lab / subaccount
let appointmentCounterInitialized = false;
watch(() => user.value?.role, async (role) => {
  if (!['nurse', 'lab', 'subaccount'].includes(role ?? '') || appointmentCounterInitialized || !user.value) return;
  appointmentCounterInitialized = true;
  try {
    const res = await apiFetch('/appointments?status=pending&limit=100', { method: 'GET' });
    if (res?.success && res.data) {
      const pending = res.data.filter((a: any) => {
        if (role === 'nurse') return a.status === 'pending' && !a.assigned_nurse_id;
        if (role === 'lab' || role === 'subaccount') return a.status === 'pending' && a.type === 'blood_test' && !a.assigned_lab_id;
        return false;
      });
      lastPendingCount.value = pending.length;
      if (pending.length > 0) {
        const firstId = pending[0].id;
        try {
          const detailRes = await apiFetch(`/appointments/${firstId}`, { method: 'GET' });
          if (detailRes?.success && detailRes.data) {
            const data = detailRes.data;
            const alreadyAcceptedByOther = role === 'nurse'
              ? (data.assigned_nurse_id != null || data.assigned_lab_id != null)
              : (data.assigned_lab_id != null);
            if (!alreadyAcceptedByOther) {
              selectedAppointment.value = data;
              showAppointmentModal.value = true;
            }
            seenAppointmentIds.value.add(firstId);
          }
        } catch (_) {}
      }
      setTimeout(() => {
        pending.forEach((a: any) => { if (a.id !== pending[0]?.id) seenAppointmentIds.value.add(a.id); });
      }, 5000);
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
