<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header custom -->
    <header class="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div class="container mx-auto px-3 sm:px-4">
        <div class="flex items-center justify-between h-16 gap-2 sm:gap-3 md:gap-4">
          <!-- Left: Logo + Navigation + Hamburger mobile -->
          <div class="flex items-center gap-3 sm:gap-4 lg:gap-6 min-w-0 flex-shrink-0">
            <!-- Bouton hamburger mobile -->
            <button
              @click="mobileMenuOpen = !mobileMenuOpen"
              class="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0"
              aria-label="Ouvrir le menu"
              aria-expanded="mobileMenuOpen"
            >
              <ClientOnly>
                <template #default>
                  <UIcon 
                    :name="mobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'" 
                    class="h-5 w-5" 
                  />
                </template>
                <template #fallback>
                  <span class="h-5 w-5" />
                </template>
              </ClientOnly>
            </button>

            <!-- Logo -->
            <NuxtLink 
              to="/" 
              aria-label="OneAndLab" 
              class="flex items-center gap-2 flex-shrink-0"
            >
              <img 
                src="/images/onelogo.png" 
                alt="OneAndLab" 
                class="h-7 sm:h-8 md:h-10 w-auto object-contain" 
                loading="eager"
                decoding="async"
              />
            </NuxtLink>

            <!-- Navigation desktop -->
            <nav class="hidden lg:flex items-center min-w-0">
              <UNavigationMenu :items="navigationItems" />
            </nav>
          </div>

          <!-- Right: Actions -->
          <div class="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-shrink-0">
            <!-- Menu utilisateur si connecté -->
            <template v-if="isAuthenticated && user">
              <!-- Notifications -->
              <div class="relative flex-shrink-0" ref="notificationsMenuRef">
                <button
                  type="button"
                  @click="notificationsMenuOpen = !notificationsMenuOpen"
                  class="relative h-9 w-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0"
                  :aria-label="`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`"
                  :aria-expanded="notificationsMenuOpen"
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
                    class="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 min-w-[18px] flex items-center justify-center rounded-full bg-primary-600 text-[10px] font-semibold text-white leading-none px-0.5 border-2 border-white"
                  >
                    {{ unreadCount > 9 ? '9+' : unreadCount }}
                  </span>
                </button>
                
                <!-- Dropdown Notifications -->
                <div
                  v-if="notificationsMenuOpen"
                  class="absolute right-0 mt-2 w-72 sm:w-80 rounded-lg bg-white border border-gray-200 shadow-lg z-50 py-1 max-h-96 overflow-y-auto"
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

              <!-- Desktop: dropdown menu -->
              <div class="relative hidden sm:block flex-shrink-0" ref="userMenuRef">
                <button
                  type="button"
                  @click="userMenuOpen = !userMenuOpen"
                  class="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0 min-w-0 max-w-full"
                  :aria-label="`Menu utilisateur: ${userDisplayName}`"
                  :aria-expanded="userMenuOpen"
                >
                  <span class="text-xs sm:text-sm font-medium whitespace-nowrap truncate max-w-[100px] sm:max-w-[140px] md:max-w-[180px]">{{ userDisplayName }}</span>
                  <ClientOnly>
                    <template #default>
                      <UIcon name="i-lucide-chevron-down" class="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 transition-transform" :class="{ 'rotate-180': userMenuOpen }" />
                    </template>
                    <template #fallback>
                      <span class="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    </template>
                  </ClientOnly>
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
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                    >
                      <ClientOnly>
                        <template #default>
                          <UIcon v-if="item.icon" :name="item.icon" class="h-4 w-4 flex-shrink-0" />
                        </template>
                        <template #fallback>
                          <span v-if="item.icon" class="h-4 w-4 flex-shrink-0" />
                        </template>
                      </ClientOnly>
                      <span>{{ item.label }}</span>
                    </button>
                    <div v-else class="border-t border-gray-200 my-1" />
                  </template>
                </div>
              </div>
            </template>
            
            <!-- Bouton connexion / inscription si non connecté -->
            <template v-else>
              <UButton 
                to="/login" 
                variant="outline"
                size="lg"
                class="hidden sm:flex whitespace-nowrap flex-shrink-0"
                aria-label="Connexion ou inscription à votre compte"
              >
                <ClientOnly>
                  <template #default>
                    <UIcon name="i-lucide-log-in" class="h-4 w-4 mr-2" />
                  </template>
                  <template #fallback>
                    <span class="h-4 w-4 mr-2" />
                  </template>
                </ClientOnly>
                Connexion / Inscription
              </UButton>
              
              <!-- Bouton rendez-vous desktop -->
              <UButton 
                to="/rendez-vous/nouveau" 
                color="primary"
                size="lg"
                class="hidden sm:flex whitespace-nowrap flex-shrink-0"
              >
                <ClientOnly>
                  <template #default>
                    <UIcon name="i-lucide-calendar-plus" class="h-4 w-4 mr-2" />
                  </template>
                  <template #fallback>
                    <span class="h-4 w-4 mr-2" />
                  </template>
                </ClientOnly>
                <span class="hidden lg:inline">Prendre rendez-vous</span>
                <span class="lg:hidden">Réserver</span>
              </UButton>
            </template>
            
            <!-- Bouton rendez-vous mobile -->
            <UButton 
              to="/rendez-vous/nouveau" 
              color="primary"
              size="sm"
              icon="i-lucide-calendar-plus"
              class="sm:hidden flex-shrink-0"
              aria-label="Prendre rendez-vous"
            />
          </div>
        </div>
      </div>
    </header>
    
    <!-- Menu mobile drawer -->
    <Teleport to="body">
      <!-- Overlay -->
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
        @click="mobileMenuOpen = false"
      />
      
      <!-- Drawer -->
      <div
        :class="[
          'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        ]"
      >
        <!-- Header du drawer -->
        <div class="flex items-center justify-between px-4 h-16 border-b border-gray-200">
          <NuxtLink 
            to="/" 
            @click="mobileMenuOpen = false"
            class="flex items-center gap-2"
          >
            <img src="/images/onelogo.png" alt="OneAndLab" class="h-8 w-auto" />
          </NuxtLink>
          <button
            @click="mobileMenuOpen = false"
            class="h-9 w-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Fermer le menu"
          >
            <ClientOnly>
              <template #default>
                <UIcon name="i-lucide-x" class="h-5 w-5" />
              </template>
              <template #fallback>
                <span class="h-5 w-5" />
              </template>
            </ClientOnly>
          </button>
        </div>
        
        <!-- Contenu du drawer -->
        <div class="px-4 py-6">
          <!-- Utilisateur connecté -->
          <div v-if="isAuthenticated && user" class="mb-6 pb-6 border-b border-gray-200">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ userDisplayName }}</p>
                <p class="text-xs text-gray-500">{{ roleLabel }}</p>
              </div>
            </div>
            
            <!-- Menu utilisateur mobile -->
            <div class="space-y-1">
              <template v-for="item in userMenuItems" :key="item.label">
                <div
                  v-if="item.type === 'divider'"
                  class="border-t border-gray-200 my-2"
                />
                <button
                  v-else
                  @click="handleMenuItemClick(item)"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <ClientOnly>
                    <template #default>
                      <UIcon v-if="item.icon" :name="item.icon" class="h-5 w-5 shrink-0" />
                    </template>
                    <template #fallback>
                      <span v-if="item.icon" class="h-5 w-5 shrink-0" />
                    </template>
                  </ClientOnly>
                  <span>{{ item.label }}</span>
                </button>
              </template>
            </div>
          </div>
          
          <!-- Navigation mobile -->
          <nav class="space-y-1">
            <NuxtLink
              v-for="item in navigationItems"
              :key="item.to"
              :to="item.to"
              @click="mobileMenuOpen = false"
              :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                item.active
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-700 hover:bg-gray-100'
              ]"
            >
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>
          
          <!-- Boutons si non connecté -->
          <div v-if="!isAuthenticated" class="mt-6 space-y-3">
            <UButton 
              to="/login" 
              variant="outline"
              block
              @click="mobileMenuOpen = false"
              aria-label="Connexion ou inscription à votre compte"
            >
              <ClientOnly>
                <template #default>
                  <UIcon name="i-lucide-log-in" class="h-4 w-4 mr-2" />
                </template>
                <template #fallback>
                  <span class="h-4 w-4 mr-2" />
                </template>
              </ClientOnly>
              Connexion / Inscription
            </UButton>
            <UButton 
              to="/rendez-vous/nouveau" 
              color="primary"
              block
              @click="mobileMenuOpen = false"
            >
              <ClientOnly>
                <template #default>
                  <UIcon name="i-lucide-calendar-plus" class="h-4 w-4 mr-2" />
                </template>
                <template #fallback>
                  <span class="h-4 w-4 mr-2" />
                </template>
              </ClientOnly>
              Prendre rendez-vous
            </UButton>
          </div>
        </div>
      </div>
    </Teleport>
    
    <main class="flex-1">
      <slot />
    </main>
    
    <footer class="bg-gray-800 text-white mt-auto">
      <div class="container mx-auto px-4 py-12">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <p class="text-gray-400 mb-4 max-w-md">
              Plateforme de gestion de rendez-vous médicaux à domicile. 
              Prise de sang et soins infirmiers par des professionnels qualifiés.
            </p>
            <div class="flex space-x-4">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                class="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors"
                aria-label="Facebook"
              >
                <UIcon name="i-lucide-facebook" class="w-5 h-5" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                class="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors"
                aria-label="Twitter"
              >
                <UIcon name="i-lucide-twitter" class="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                class="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors"
                aria-label="LinkedIn"
              >
                <UIcon name="i-lucide-linkedin" class="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 class="text-lg font-semibold mb-4">Services</h3>
            <ul class="space-y-2">
              <li>
                <NuxtLink 
                  to="/rendez-vous/nouveau?type=blood_test" 
                  class="text-gray-400 hover:text-white transition-colors flex items-center"
                >
                  <UIcon name="i-lucide-droplet" class="w-4 h-4 mr-2" />
                  Prise de sang
                </NuxtLink>
              </li>
              <li>
                <NuxtLink 
                  to="/rendez-vous/nouveau?type=nursing" 
                  class="text-gray-400 hover:text-white transition-colors flex items-center"
                >
                  <UIcon name="i-lucide-stethoscope" class="w-4 h-4 mr-2" />
                  Soins infirmiers
                </NuxtLink>
              </li>
              <li>
                <NuxtLink 
                  to="/rendez-vous/nouveau" 
                  class="text-gray-400 hover:text-white transition-colors flex items-center"
                >
                  <UIcon name="i-lucide-calendar-plus" class="w-4 h-4 mr-2" />
                  Prendre un rendez-vous
                </NuxtLink>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-lg font-semibold mb-4">Professionnels</h3>
            <ul class="space-y-2">
              <li>
                <NuxtLink 
                  to="/pour-les-patients" 
                  class="text-gray-400 hover:text-white transition-colors"
                >
                  Patient
                </NuxtLink>
              </li>
              <li>
                <NuxtLink 
                  to="/pour-les-infirmiers" 
                  class="text-gray-400 hover:text-white transition-colors"
                >
                  Infirmiers
                </NuxtLink>
              </li>
              <li>
                <NuxtLink 
                  to="/pour-les-laboratoires" 
                  class="text-gray-400 hover:text-white transition-colors"
                >
                  Laboratoire
                </NuxtLink>
              </li>
              <li>
                <NuxtLink 
                  to="/pour-les-professionnels" 
                  class="text-gray-400 hover:text-white transition-colors"
                >
                  Professionnel de santé
                </NuxtLink>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-lg font-semibold mb-4">Liens utiles</h3>
            <ul class="space-y-2">
              <li>
                <NuxtLink 
                  to="/contact" 
                  class="text-gray-400 hover:text-white transition-colors"
                >
                  Contact
                </NuxtLink>
              </li>
              <li>
                <NuxtLink 
                  to="/mentions-legales" 
                  class="text-gray-400 hover:text-white transition-colors"
                >
                  Mentions légales
                </NuxtLink>
              </li>
              <li>
                <NuxtLink 
                  to="/politique-confidentialite" 
                  class="text-gray-400 hover:text-white transition-colors"
                >
                  Politique de confidentialité
                </NuxtLink>
              </li>
              <li>
                <a 
                  href="/cgv" 
                  class="text-gray-400 hover:text-white transition-colors"
                >
                  CGV
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div class="mt-8 pt-8 text-center text-gray-400" style="border-top: 1px solid rgb(55 65 81);">
          <p>&copy; {{ new Date().getFullYear() }}. Tous droits réservés.</p>
          <p class="mt-2 text-sm">
            Conforme aux normes HDS (Hébergement de Données de Santé) et RGPD
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { apiFetch } from '~/utils/api'

const route = useRoute()
const { user, isAuthenticated, logout } = useAuth()

const mobileMenuOpen = ref(false)
const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

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

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Fermer le menu mobile quand on change de route
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})

// Empêcher le scroll du body quand le menu est ouvert
watch(mobileMenuOpen, (open) => {
  if (process.client) {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
})

// Nettoyer au démontage
onUnmounted(() => {
  if (process.client) {
    document.body.style.overflow = ''
  }
})

const roleLabel = computed(() => {
  const role = user.value?.role
  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    lab: 'Laboratoire',
    subaccount: 'Sous-compte',
    nurse: 'Infirmier',
    preleveur: 'Préleveur',
    pro: 'Professionnel',
    patient: 'Patient',
  }
  return roleLabels[role || ''] || 'Utilisateur'
})

const handleMenuItemClick = (item: any) => {
  if (item.click) {
    item.click()
  }
  mobileMenuOpen.value = false
}

const navigationItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Patient',
    to: '/pour-les-patients',
    active: route.path === '/pour-les-patients',
  },
  {
    label: 'Infirmiers',
    to: '/pour-les-infirmiers',
    active: route.path === '/pour-les-infirmiers',
  },
  {
    label: 'Laboratoire',
    to: '/pour-les-laboratoires',
    active: route.path === '/pour-les-laboratoires',
  },
  {
    label: 'Professionnel',
    to: '/pour-les-professionnels',
    active: route.path === '/pour-les-professionnels',
  },
  {
    label: 'Contact',
    to: '/contact',
    active: route.path === '/contact',
  },
])

const userDisplayName = computed(() => {
  if (user.value?.first_name && user.value?.last_name) {
    return `${user.value.first_name} ${user.value.last_name}`
  }
  return user.value?.email || 'Utilisateur'
})

const userMenuItems = computed(() => {
  const role = user.value?.role
  const items: any[] = []
  
  // Menu selon le rôle
  if (role === 'patient') {
    items.push(
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
      }
    )
  } else if (role === 'nurse') {
    items.push(
      {
        label: 'Rendez-vous',
        icon: 'i-lucide-calendar',
        click: () => navigateTo('/nurse/appointments'),
      },
      {
        label: 'Soins actifs',
        icon: 'i-lucide-activity',
        click: () => navigateTo('/nurse/soins'),
      },
      {
        label: 'Paramètres',
        icon: 'i-lucide-settings',
        click: () => navigateTo('/profile'),
      }
    )
  } else if (role === 'lab') {
    items.push(
      {
        label: 'Tableau de bord',
        icon: 'i-lucide-layout-dashboard',
        click: () => navigateTo('/lab'),
      },
      {
        label: 'Rendez-vous',
        icon: 'i-lucide-calendar',
        click: () => navigateTo('/lab/appointments'),
      },
      {
        label: 'Calendrier',
        icon: 'i-lucide-calendar-days',
        click: () => navigateTo('/lab/calendar'),
      },
      {
        label: 'Statistiques',
        icon: 'i-lucide-bar-chart',
        click: () => navigateTo('/lab/stats'),
      },
      {
        label: 'Sous-comptes',
        icon: 'i-lucide-users',
        click: () => navigateTo('/lab/subaccounts'),
      },
      {
        label: 'Préleveurs',
        icon: 'i-lucide-user-check',
        click: () => navigateTo('/lab/preleveurs'),
      },
      {
        label: 'Paramètres',
        icon: 'i-lucide-settings',
        click: () => navigateTo('/profile'),
      }
    )
  } else if (role === 'subaccount') {
    items.push(
      {
        label: 'Tableau de bord',
        icon: 'i-lucide-layout-dashboard',
        click: () => navigateTo('/subaccount'),
      },
      {
        label: 'Rendez-vous',
        icon: 'i-lucide-calendar',
        click: () => navigateTo('/subaccount/appointments'),
      },
      {
        label: 'Calendrier',
        icon: 'i-lucide-calendar-days',
        click: () => navigateTo('/subaccount/calendar'),
      },
      {
        label: 'Préleveurs',
        icon: 'i-lucide-user-check',
        click: () => navigateTo('/subaccount/preleveurs'),
      },
      {
        label: 'Paramètres',
        icon: 'i-lucide-settings',
        click: () => navigateTo('/profile'),
      }
    )
  } else if (role === 'preleveur') {
    items.push(
      {
        label: 'Tableau de bord',
        icon: 'i-lucide-layout-dashboard',
        click: () => navigateTo('/preleveur'),
      },
      {
        label: 'Calendrier',
        icon: 'i-lucide-calendar-days',
        click: () => navigateTo('/preleveur/calendar'),
      }
    )
  } else if (role === 'pro') {
    items.push(
      {
        label: 'Tableau de bord',
        icon: 'i-lucide-layout-dashboard',
        click: () => navigateTo('/pro'),
      },
      {
        label: 'Rendez-vous',
        icon: 'i-lucide-calendar',
        click: () => navigateTo('/pro/appointments'),
      },
      {
        label: 'Mes patients',
        icon: 'i-lucide-users',
        click: () => navigateTo('/pro/patients'),
      },
      {
        label: 'Calendrier',
        icon: 'i-lucide-calendar-days',
        click: () => navigateTo('/pro/calendar'),
      },
      {
        label: 'Paramètres',
        icon: 'i-lucide-settings',
        click: () => navigateTo('/profile'),
      }
    )
  } else if (role === 'admin' || role === 'super_admin') {
    items.push(
      {
        label: 'Tableau de bord',
        icon: 'i-lucide-layout-dashboard',
        click: () => navigateTo('/admin'),
      },
      {
        label: 'Rendez-vous',
        icon: 'i-lucide-calendar',
        click: () => navigateTo('/admin/appointments'),
      },
      {
        label: 'Utilisateurs',
        icon: 'i-lucide-users',
        click: () => navigateTo('/admin/users'),
      },
      {
        label: 'Catégories',
        icon: 'i-lucide-tags',
        click: () => navigateTo('/admin/categories'),
      },
      {
        label: 'Zones de couverture',
        icon: 'i-lucide-map',
        click: () => navigateTo('/admin/coverage'),
      },
      {
        label: 'Logs',
        icon: 'i-lucide-file-text',
        click: () => navigateTo('/admin/logs'),
      }
    )
  }
  
  // Séparateur avant déconnexion
  if (items.length > 0) {
    items.push({ type: 'divider' })
  }
  
  // Déconnexion
  items.push({
    label: 'Déconnexion',
    icon: 'i-lucide-log-out',
    click: () => logout(),
  })
  
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
    description: notif.created_at
      ? new Date(notif.created_at).toLocaleString('fr-FR')
      : undefined,
    isRead: !!notif.read_at,
    click: () => {
      if (notif.appointment_id) {
        const role = user.value?.role
        if (role === 'patient') {
          navigateTo(`/patient/appointments/${notif.appointment_id}`)
        } else if (role === 'nurse') {
          navigateTo(`/nurse/appointments/${notif.appointment_id}`)
        }
      }
    },
  }))
})

const { start: startPolling } = usePolling(async () => {
  if (isAuthenticated.value) {
    const res = await apiFetch('/notifications?limit=10', { method: 'GET' })
    if (res && res.success) notifications.value = res.data
  }
}, 30000)

onMounted(async () => {
  if (isAuthenticated.value) {
    // Charger les notifications immédiatement
    const res = await apiFetch('/notifications?limit=10', { method: 'GET' })
    if (res && res.success) notifications.value = res.data
    // Démarrer le polling
    startPolling()
  }
})
</script>
