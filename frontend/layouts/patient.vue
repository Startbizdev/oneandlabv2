<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <!-- Header patient -->
    <header class="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-16 gap-4">
          <!-- Left: Hamburger mobile (patient) + Logo → accueil -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- Hamburger : visible uniquement sur mobile pour le patient -->
            <button
              v-if="isAuthenticated && user && user.role === 'patient'"
              type="button"
              @click="mobileMenuOpen = !mobileMenuOpen"
              class="md:hidden h-9 w-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Ouvrir le menu"
              :aria-expanded="mobileMenuOpen"
            >
              <UIcon :name="mobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'" class="h-5 w-5" />
            </button>
            <NuxtLink 
              to="/" 
              aria-label="OneAndLab - Accueil" 
              class="flex items-center gap-2 shrink-0"
            >
              <img 
                src="/images/onelogo.png" 
                alt="OneAndLab" 
                class="h-8 sm:h-10 w-auto object-contain" 
                loading="eager"
                decoding="async"
              />
            </NuxtLink>
          </div>

          <!-- Centre (patient) : liens de navigation (ceux du menu avatar) -->
          <nav
            v-if="isAuthenticated && user && user.role === 'patient'"
            class="hidden md:flex flex-1 items-center justify-center gap-1 min-w-0"
            aria-label="Navigation patient"
          >
            <NuxtLink
              to="/patient"
              class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              :class="{ 'bg-gray-100 text-gray-900': route.path === '/patient' }"
            >
              Mes rendez-vous
            </NuxtLink>
            <NuxtLink
              to="/rendez-vous/nouveau"
              class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              Nouveau RDV
            </NuxtLink>
            <NuxtLink
              to="/patient/relatives"
              class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              :class="{ 'bg-gray-100 text-gray-900': route.path.startsWith('/patient/relatives') }"
            >
              Mes proches
            </NuxtLink>
            <NuxtLink
              to="/patient/reviews"
              class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              :class="{ 'bg-gray-100 text-gray-900': route.path.startsWith('/patient/reviews') }"
            >
              Mes avis
            </NuxtLink>
            <NuxtLink
              to="/profile"
              class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              :class="{ 'bg-gray-100 text-gray-900': route.path.startsWith('/profile') }"
            >
              Mon profil
            </NuxtLink>
          </nav>

          <!-- Right: Notifications + Avatar ou Bouton Connexion -->
          <div class="flex items-center gap-2 sm:gap-3 min-w-0">
            <!-- Si connecté : Notifications + Avatar -->
            <template v-if="isAuthenticated && user">
              <!-- Notifications -->
              <div class="relative" ref="notificationsMenuRef">
                <button
                  type="button"
                  @click.stop="notificationsMenuOpen = !notificationsMenuOpen"
                  class="relative h-9 w-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
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
              <div class="relative" ref="userMenuRef">
                <button
                  type="button"
                  @click="userMenuOpen = !userMenuOpen"
                  class="flex items-center gap-2 pl-1 pr-2 sm:pl-1.5 sm:pr-3 py-1.5 sm:py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-all duration-200 shrink-0 min-w-0 border border-transparent hover:border-gray-200"
                  :aria-label="`Menu utilisateur: ${userDisplayName}`"
                  :aria-expanded="userMenuOpen"
                >
                  <UserAvatar
                    :src="user?.profile_image_url ?? user?.avatar"
                    :initial="(user?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()"
                    :alt="userDisplayName"
                    size="md"
                  />
                  <span class="hidden sm:inline text-sm font-medium whitespace-nowrap min-w-0 max-w-[120px] sm:max-w-[160px] truncate">{{ userDisplayName }}</span>
                  <UIcon name="i-lucide-chevron-down" class="hidden sm:block h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200" :class="{ 'rotate-180': userMenuOpen }" />
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
                    class="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-gray-200/80 shadow-xl shadow-gray-200/50 z-50 overflow-hidden"
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
            
            <!-- Si non connecté : Bouton Connexion / Inscription (caché sur la page partage RDV) -->
            <template v-else-if="!isSharedRdvPage">
              <UButton 
                :to="loginUrl"
                variant="outline"
                aria-label="Connexion ou inscription à votre compte"
                size="lg"
                class="whitespace-nowrap flex-shrink-0"
              >
                <UIcon name="i-lucide-log-in" class="h-4 w-4 mr-2" />
                Connexion / Inscription
              </UButton>
            </template>
          </div>
        </div>
      </div>
    </header>

    <!-- Menu mobile drawer (patient) -->
    <Teleport to="body">
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
        @click="mobileMenuOpen = false"
      />
      <div
        :class="[
          'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ease-in-out md:hidden overflow-y-auto',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        ]"
      >
        <div class="flex items-center justify-between px-4 h-16 border-b border-gray-200">
          <NuxtLink to="/" @click="mobileMenuOpen = false" class="flex items-center gap-2">
            <img src="/images/onelogo.png" alt="OneAndLab" class="h-8 w-auto" />
          </NuxtLink>
          <button
            type="button"
            @click="mobileMenuOpen = false"
            class="h-9 w-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Fermer le menu"
          >
            <UIcon name="i-lucide-x" class="h-5 w-5" />
          </button>
        </div>
        <nav class="px-4 py-6 space-y-1" aria-label="Navigation patient">
          <NuxtLink
            to="/patient"
            @click="mobileMenuOpen = false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="route.path === '/patient' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'"
          >
            <UIcon name="i-lucide-calendar" class="h-5 w-5 shrink-0 text-gray-500" />
            Mes rendez-vous
          </NuxtLink>
          <NuxtLink
            to="/rendez-vous/nouveau"
            @click="mobileMenuOpen = false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <UIcon name="i-lucide-calendar-plus" class="h-5 w-5 shrink-0 text-gray-500" />
            Nouveau RDV
          </NuxtLink>
          <NuxtLink
            to="/patient/relatives"
            @click="mobileMenuOpen = false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="route.path.startsWith('/patient/relatives') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'"
          >
            <UIcon name="i-lucide-users" class="h-5 w-5 shrink-0 text-gray-500" />
            Mes proches
          </NuxtLink>
          <NuxtLink
            to="/patient/reviews"
            @click="mobileMenuOpen = false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="route.path.startsWith('/patient/reviews') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'"
          >
            <UIcon name="i-lucide-star" class="h-5 w-5 shrink-0 text-gray-500" />
            Mes avis
          </NuxtLink>
          <NuxtLink
            to="/profile"
            @click="mobileMenuOpen = false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="route.path.startsWith('/profile') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'"
          >
            <UIcon name="i-lucide-user" class="h-5 w-5 shrink-0 text-gray-500" />
            Mon profil
          </NuxtLink>
        </nav>
      </div>
    </Teleport>
    
    <!-- Main Content -->
    <main class="flex-1 py-6 px-4 sm:px-6 lg:px-8">
      <slot />
    </main>

    <!-- Footer minimaliste -->
    <footer class="bg-white border-t border-gray-200 mt-auto">
      <div class="container mx-auto px-4 py-6">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <p>&copy; {{ new Date().getFullYear() }} OneAndLab. Tous droits réservés.</p>
          <div class="flex items-center gap-4">
            <NuxtLink to="/mentions-legales" class="hover:text-primary-600 transition-colors">
              Mentions légales
            </NuxtLink>
            <NuxtLink to="/politique-confidentialite" class="hover:text-primary-600 transition-colors">
              Confidentialité
            </NuxtLink>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api'

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()

// Cacher le bouton Connexion/Inscription sur la page partage RDV (/p/rdv/[token])
const isSharedRdvPage = computed(() => route.path.startsWith('/p/rdv/'))
const { user, roleLabel, userMenuItems, userDisplayName } = useHeaderUserMenu()

const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)
const mobileMenuOpen = ref(false)

// URL de connexion avec redirection vers la page actuelle
const loginUrl = computed(() => {
  const currentPath = route.path
  const currentQuery = route.query
  // Construire l'URL de retour avec tous les paramètres de requête
  const returnTo = currentPath + (Object.keys(currentQuery).length > 0 ? '?' + new URLSearchParams(currentQuery as Record<string, string>).toString() : '')
  return `/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`
})

// État du menu notifications
const notificationsMenuOpen = ref(false)
const notificationsMenuRef = ref<HTMLElement | null>(null)
const notifications = useState<any[]>('notifications.list', () => [])

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
})

// Fermer les menus quand on clique en dehors
const handleClickOutside = (event: MouseEvent) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    userMenuOpen.value = false
  }
  if (notificationsMenuRef.value && !notificationsMenuRef.value.contains(event.target as Node)) {
    notificationsMenuOpen.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
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
    label: notif.message || notif.title || 'Notification',
    description: notif.created_at ? new Date(notif.created_at).toLocaleString('fr-FR') : undefined,
    isRead: !!notif.read_at,
    click: () => {
      if (notif.appointment_id) {
        const role = user.value?.role
        if (role === 'patient') navigateTo(`/patient/appointments/${notif.appointment_id}`)
        else if (role === 'nurse') navigateTo(`/nurse/appointments/${notif.appointment_id}`)
        else if (role === 'lab' || role === 'subaccount') navigateTo(`/lab/appointments/${notif.appointment_id}`)
      }
    },
  }))
})

const { start: startPolling } = usePolling(async () => {
  if (isAuthenticated.value) {
    const res = await apiFetch('/notifications?limit=10', { method: 'GET' })
    if (res && res.success) notifications.value = [...res.data]
  }
}, 30000)
</script>

