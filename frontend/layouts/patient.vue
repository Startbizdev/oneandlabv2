<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <!-- Header patient -->
    <header class="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-16 gap-4">
          <!-- Left: Logo -->
          <NuxtLink 
            to="/patient" 
            aria-label="OneAndLab" 
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

          <!-- Right: Notifications + Avatar ou Bouton Connexion -->
          <div class="flex items-center gap-2 sm:gap-3 min-w-0">
            <!-- Si connecté : Notifications + Avatar -->
            <template v-if="isAuthenticated && user">
              <!-- Notifications -->
              <div class="relative" ref="notificationsMenuRef">
                <button
                  type="button"
                  @click="notificationsMenuOpen = !notificationsMenuOpen"
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

              <!-- Avatar avec menu -->
              <div class="relative" ref="userMenuRef">
                <button
                  type="button"
                  @click="userMenuOpen = !userMenuOpen"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors shrink-0 min-w-0"
                  :aria-label="`Menu utilisateur: ${userDisplayName}`"
                  :aria-expanded="userMenuOpen"
                >
                  <ClientOnly>
                    <template #default>
                      <img
                        v-if="user?.avatar"
                        :src="user.avatar"
                        :alt="userDisplayName"
                        class="h-8 w-8 rounded-full object-cover shrink-0"
                      />
                      <div
                        v-else
                        class="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium shrink-0"
                      >
                        {{ userDisplayName.charAt(0).toUpperCase() }}
                      </div>
                    </template>
                    <template #fallback>
                      <div class="h-8 w-8 rounded-full bg-gray-300 animate-pulse shrink-0" />
                    </template>
                  </ClientOnly>
                  <ClientOnly>
                    <template #default>
                      <span class="hidden sm:inline text-sm font-medium whitespace-nowrap min-w-0 max-w-[150px] sm:max-w-[200px] truncate">{{ userDisplayName }}</span>
                    </template>
                    <template #fallback>
                      <span class="hidden sm:inline text-sm font-medium whitespace-nowrap min-w-0 max-w-[150px] sm:max-w-[200px] truncate">...</span>
                    </template>
                  </ClientOnly>
                  <UIcon name="i-lucide-chevron-down" class="hidden sm:block h-4 w-4 shrink-0 transition-transform" :class="{ 'rotate-180': userMenuOpen }" />
                </button>
                
                <!-- Dropdown Menu -->
                <div
                  v-if="userMenuOpen"
                  class="absolute right-0 mt-2 w-56 rounded-lg bg-white border border-gray-200 shadow-lg z-50 py-1"
                >
                  <template v-for="(item, index) in userMenuItems" :key="index">
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
            </template>
            
            <!-- Si non connecté : Bouton Connexion / Inscription -->
            <template v-else>
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
    
    <!-- Main Content -->
    <main class="flex-1">
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
const { user, isAuthenticated, logout } = useAuth()

const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

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

const userDisplayName = computed(() => {
  if (user.value?.first_name && user.value?.last_name) {
    return `${user.value.first_name} ${user.value.last_name}`
  }
  return user.value?.email || 'Utilisateur'
})

const userMenuItems = computed(() => {
  const items: any[] = [
    {
      label: 'Mes rendez-vous',
      icon: 'i-lucide-calendar',
      click: () => navigateTo('/patient'),
    },
    {
      label: 'Nouveau rendez-vous',
      icon: 'i-lucide-calendar-plus',
      click: () => navigateTo('/rendez-vous/nouveau'),
    },
    {
      label: 'Mes proches',
      icon: 'i-lucide-users',
      click: () => navigateTo('/patient/relatives'),
    },
    {
      label: 'Mes avis',
      icon: 'i-lucide-star',
      click: () => navigateTo('/patient/reviews'),
    },
    {
      label: 'Mon profil',
      icon: 'i-lucide-user',
      click: () => navigateTo('/profile'),
    },
    { type: 'divider' },
    {
      label: 'Déconnexion',
      icon: 'i-lucide-log-out',
      click: () => logout(),
    },
  ]
  
  return items
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
    isRead: !!notif.read_at,
    click: () => {
      if (notif.appointment_id) {
        navigateTo(`/patient/appointments/${notif.appointment_id}`)
      }
    },
  }))
})

const { start: startPolling } = usePolling(async () => {
  if (isAuthenticated.value) {
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'POLL1',
          location: 'layouts/patient.vue:330',
          message: 'Polling notifications',
          data: {
            isAuthenticated: isAuthenticated.value,
            currentNotificationsCount: notifications.value.length,
            currentUnreadCount: notifications.value.filter(n => !n.read_at).length,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
    
    const res = await apiFetch('/notifications?limit=10', { method: 'GET' })
    if (res && res.success) {
      const oldUnreadCount = notifications.value.filter(n => !n.read_at).length
      const newUnreadCount = res.data.filter((n: any) => !n.read_at).length
      
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'POLL2',
            location: 'layouts/patient.vue:345',
            message: 'Notifications fetched',
            data: {
              notificationsCount: res.data.length,
              oldUnreadCount,
              newUnreadCount,
              hasNewNotifications: newUnreadCount > oldUnreadCount,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion
      
      // Forcer la réactivité en créant un nouveau tableau
      notifications.value = [...res.data]
    }
  }
}, 10000) // Réduire à 10 secondes pour détecter plus rapidement les nouvelles notifications
</script>

