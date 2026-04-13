<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header custom -->
    <header class="sticky top-0 z-50 overflow-visible bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800 pt-[env(safe-area-inset-top)]">
      <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8">
        <div class="flex items-center justify-between min-h-[56px] sm:min-h-[64px] h-14 sm:h-16 gap-2 sm:gap-3 md:gap-4">
          <!-- Left: Logo + Navigation + Hamburger mobile -->
          <div class="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0 flex-1 lg:flex-initial">
            <!-- Bouton hamburger mobile -->
            <button
              @click="mobileMenuOpen = !mobileMenuOpen"
              class="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0 -ml-2 touch-manipulation"
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
              class="flex items-center gap-2 flex-shrink-0 min-w-0"
            >
              <img 
                src="/images/onelogo.png" 
                alt="OneAndLab" 
                class="h-7 sm:h-8 md:h-9 lg:h-10 w-auto max-h-10 object-contain object-left" 
                loading="eager"
                decoding="async"
              />
            </NuxtLink>

            <!-- Navigation desktop : liens simples + dropdowns Infirmiers / Laboratoire (icônes + descriptions) -->
            <nav class="hidden lg:flex items-center gap-1 min-w-0">
              <!-- Dropdown Patient (marketing) -->
              <UPopover mode="hover" :open-delay="100" :close-delay="80">
                <button
                  type="button"
                  class="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-600': route.path === '/pour-les-patients' || route.path.startsWith('/laboratoires') || route.path.startsWith('/infirmiers') || route.path === '/rendez-vous/nouveau' }"
                >
                  Patient
                  <UIcon name="i-lucide-chevron-down" class="h-4 w-4 shrink-0 text-gray-500" />
                </button>
                <template #content>
                  <div class="w-[320px] p-2 bg-white rounded-xl shadow-lg">
                    <NuxtLink
                      :to="appointmentNewUrl"
                      class="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-100">
                        <UIcon name="i-lucide-calendar-plus" class="h-5 w-5" />
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-gray-900">Prendre rendez-vous</p>
                        <p class="text-xs text-gray-500 mt-0.5">Réservez une prise de sang ou des soins infirmiers à domicile.</p>
                      </div>
                    </NuxtLink>
                    <NuxtLink
                      to="/laboratoires"
                      class="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-100">
                        <UIcon name="i-lucide-building-2" class="h-5 w-5" />
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-gray-900">Explorer les laboratoires</p>
                        <p class="text-xs text-gray-500 mt-0.5">Les meilleurs laboratoires de France pour vos prélèvements à domicile.</p>
                      </div>
                    </NuxtLink>
                    <NuxtLink
                      to="/infirmiers"
                      class="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-100">
                        <UIcon name="i-lucide-heart-pulse" class="h-5 w-5" />
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-gray-900">Explorer les infirmiers</p>
                        <p class="text-xs text-gray-500 mt-0.5">Trouvez un infirmier à domicile près de chez vous.</p>
                      </div>
                    </NuxtLink>
                    <NuxtLink
                      to="/pour-les-patients"
                      class="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:bg-gray-200">
                        <UIcon name="i-lucide-info" class="h-5 w-5" />
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-gray-900">Pour les patients</p>
                        <p class="text-xs text-gray-500 mt-0.5">Découvrez comment prendre rendez-vous et gérer vos soins.</p>
                      </div>
                    </NuxtLink>
                  </div>
                </template>
              </UPopover>

              <!-- Dropdown Infirmiers -->
              <UPopover mode="hover" :open-delay="100" :close-delay="80">
                <button
                  type="button"
                  class="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-600': route.path.startsWith('/pour-les-infirmiers') }"
                >
                  Infirmiers
                  <UIcon name="i-lucide-chevron-down" class="h-4 w-4 shrink-0 text-gray-500" />
                </button>
                <template #content>
                  <div class="w-[320px] p-2 bg-white rounded-xl shadow-lg">
                    <NuxtLink
                      to="/pour-les-infirmiers"
                      class="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-100">
                        <UIcon name="i-lucide-heart-pulse" class="h-5 w-5" />
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-gray-900">Présentation</p>
                        <p class="text-xs text-gray-500 mt-0.5">Découvrez les avantages pour les infirmiers et comment rejoindre le réseau.</p>
                      </div>
                    </NuxtLink>
                    <NuxtLink
                      to="/pour-les-infirmiers/tarifs"
                      class="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
                        <UIcon name="i-lucide-credit-card" class="h-5 w-5" />
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-gray-900">Tarifs</p>
                        <p class="text-xs text-gray-500 mt-0.5">Offre Découverte gratuite et Pro à 29 €/mois avec 30 jours d'essai.</p>
                      </div>
                    </NuxtLink>
                  </div>
                </template>
              </UPopover>

              <!-- Dropdown Laboratoire -->
              <UPopover mode="hover" :open-delay="100" :close-delay="80">
                <button
                  type="button"
                  class="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-600': route.path.startsWith('/pour-les-laboratoires') }"
                >
                  Laboratoire
                  <UIcon name="i-lucide-chevron-down" class="h-4 w-4 shrink-0 text-gray-500" />
                </button>
                <template #content>
                  <div class="w-[320px] p-2 bg-white rounded-xl shadow-lg">
                    <NuxtLink
                      to="/pour-les-laboratoires"
                      class="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-100">
                        <UIcon name="i-lucide-building-2" class="h-5 w-5" />
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-gray-900">Présentation</p>
                        <p class="text-xs text-gray-500 mt-0.5">Connectez votre laboratoire, gérez préleveurs et tournées à domicile.</p>
                      </div>
                    </NuxtLink>
                    <NuxtLink
                      to="/pour-les-laboratoires/tarifs"
                      class="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
                        <UIcon name="i-lucide-credit-card" class="h-5 w-5" />
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-gray-900">Tarifs</p>
                        <p class="text-xs text-gray-500 mt-0.5">Starter 49 € et Pro 129 €/mois, 30 jours d'essai gratuit.</p>
                      </div>
                    </NuxtLink>
                  </div>
                </template>
              </UPopover>

              <NuxtLink
                to="/pour-les-professionnels"
                class="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                :class="{ 'bg-primary-50 text-primary-600': route.path === '/pour-les-professionnels' }"
              >
                Professionnel
              </NuxtLink>
              <NuxtLink
                to="/contact"
                class="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                :class="{ 'bg-primary-50 text-primary-600': route.path === '/contact' }"
              >
                Contact
              </NuxtLink>
            </nav>
          </div>

          <!-- Right: Actions -->
          <div class="flex items-center gap-1 sm:gap-2 md:gap-3 min-w-0 flex-shrink-0 justify-end">
            <!-- Menu utilisateur si connecté -->
            <template v-if="isAuthenticated && user">
              <!-- Notifications -->
              <div class="relative flex-shrink-0" ref="notificationsMenuRef">
                <button
                  type="button"
                  @click.stop="toggleNotificationsMenu"
                  class="relative h-11 w-11 sm:h-9 sm:w-9 min-w-[44px] min-h-[44px] sm:min-w-9 sm:min-h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0 touch-manipulation"
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
                    class="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 min-w-[18px] flex items-center justify-center rounded-full bg-primary-600 text-[10px] font-normal text-white leading-none px-0.5 border-2 border-white"
                  >
                    {{ unreadCount > 9 ? '9+' : unreadCount }}
                  </span>
                </button>
                
                <!-- Dropdown Notifications -->
                <div
                  v-if="notificationsMenuOpen"
                  class="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-[200] w-auto max-h-[min(24rem,calc(100dvh-5rem))] overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg md:absolute md:inset-x-auto md:left-auto md:right-0 md:top-auto md:mt-2 md:z-50 md:w-80 md:max-h-96"
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

              <!-- Desktop: avatar + dropdown menu -->
              <div class="relative hidden sm:block flex-shrink-0" ref="userMenuRef">
                <button
                  type="button"
                  @click.stop="toggleUserMenu"
                  class="flex items-center gap-2 pl-1 pr-2 sm:pl-1.5 sm:pr-3 py-1.5 sm:py-2 rounded-xl text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 flex-shrink-0 min-w-0 max-w-full border border-transparent hover:border-gray-200"
                  :aria-label="`Menu utilisateur: ${userDisplayName}`"
                  :aria-expanded="userMenuOpen"
                >
                  <ClientOnly>
                    <template #default>
                      <img
                        v-if="(user?.profile_image_url ?? user?.avatar)"
                        :src="(user?.profile_image_url ?? user?.avatar)"
                        :alt="userDisplayName"
                        class="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                      <div
                        v-else
                        class="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-normal shadow-sm ring-2 ring-white"
                      >
                        {{ (user?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase() }}
                      </div>
                    </template>
                    <template #fallback>
                      <div class="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
                    </template>
                  </ClientOnly>
                  <span class="text-xs sm:text-sm font-medium whitespace-nowrap truncate max-w-[90px] sm:max-w-[120px] md:max-w-[160px]">{{ userDisplayName }}</span>
                  <UIcon name="i-lucide-chevron-down" class="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-gray-500 transition-transform duration-200" :class="{ 'rotate-180': userMenuOpen }" />
                </button>
                
                <!-- Dropdown Menu moderne -->
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
                    class="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-[200] w-auto max-h-[min(24rem,calc(100dvh-5rem))] overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200/80 bg-white shadow-xl shadow-gray-200/50 dark:border-gray-700 dark:shadow-none md:absolute md:inset-x-auto md:left-auto md:right-0 md:top-auto md:mt-2 md:z-50 md:w-64 md:max-h-none md:overflow-hidden"
                  >
                    <!-- En-tête profil -->
                    <div class="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                      <div class="flex items-center gap-3">
                        <img
                          v-if="(user?.profile_image_url ?? user?.avatar)"
                          :src="(user?.profile_image_url ?? user?.avatar)"
                          :alt="userDisplayName"
                          class="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow"
                        />
                        <div
                          v-else
                          class="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-normal ring-2 ring-white"
                        >
                          {{ (user?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase() }}
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="text-sm font-normal text-gray-900 dark:text-white truncate">{{ userDisplayName }}</p>
                          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                            {{ roleLabel }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="py-1.5">
                      <template v-for="(item, index) in userMenuItems" :key="index">
                        <button
                          v-if="item.type !== 'divider'"
                          @click="handleUserMenuItemClick(item)"
                          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                        >
                          <UIcon v-if="item.icon" :name="item.icon" class="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                          <span>{{ item.label }}</span>
                        </button>
                        <div v-else class="border-t border-gray-100 dark:border-gray-700 my-1" />
                      </template>
                    </div>
                  </div>
                </Transition>
              </div>
            </template>
            
            <!-- Lien connexion si non connecté (style Doctolib, responsive) -->
            <template v-else>
              <NuxtLink
                :to="loginWithReturnTo"
                class="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-2 min-h-[44px] sm:min-h-0 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800/50 transition-colors group touch-manipulation"
                aria-label="Se connecter pour gérer vos rendez-vous"
              >
                <UIcon name="i-lucide-user" class="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-gray-700 dark:text-gray-300" />
                <!-- Mobile: inline compact -->
                <span class="text-xs font-medium text-gray-900 dark:text-white sm:hidden">Se connecter</span>
                <!-- Desktop: stacked -->
                <div class="hidden sm:flex flex-col items-start leading-tight">
                  <span class="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">Se connecter</span>
                  <span class="text-[11px] text-gray-500 dark:text-gray-400">Gérer mes RDV</span>
                </div>
              </NuxtLink>
            </template>
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
          'fixed inset-y-0 left-0 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto overscroll-contain',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        ]"
      >
        <!-- Header du drawer -->
        <div class="flex items-center justify-between px-4 h-14 sm:h-16 border-b border-gray-200 dark:border-gray-800">
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
              <img
                v-if="(user?.profile_image_url ?? user?.avatar)"
                :src="(user?.profile_image_url ?? user?.avatar)"
                :alt="userDisplayName"
                class="h-12 w-12 rounded-full object-cover shrink-0 ring-2 ring-gray-100"
              />
              <div
                v-else
                class="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-normal shrink-0 ring-2 ring-gray-100"
              >
                {{ (user?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-normal text-gray-900 truncate">{{ userDisplayName }}</p>
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-100 text-primary-700">{{ roleLabel }}</span>
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
          
          <!-- Navigation mobile (labels clairs + descriptions marketing) -->
          <nav class="space-y-1">
            <NuxtLink
              v-for="item in mobileNavigationItems"
              :key="item.to + item.label"
              :to="item.to"
              @click="mobileMenuOpen = false"
              :class="[
                'flex flex-col gap-0.5 px-3 py-3 rounded-lg text-left transition-colors',
                route.path === item.to
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-700 hover:bg-gray-100'
              ]"
            >
              <span class="text-sm font-medium">{{ item.label }}</span>
              <span v-if="item.description" class="text-xs text-gray-500">{{ item.description }}</span>
            </NuxtLink>
          </nav>
          
          <!-- Connexion si non connecté (style Doctolib) -->
          <div v-if="!isAuthenticated" class="mt-6">
            <NuxtLink
              :to="loginWithReturnTo"
              @click="mobileMenuOpen = false"
              class="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
              aria-label="Se connecter pour gérer vos rendez-vous"
            >
              <UIcon name="i-lucide-user" class="h-5 w-5 flex-shrink-0 text-gray-700 dark:text-gray-300" />
              <div class="flex flex-col items-start leading-tight">
                <span class="text-sm font-medium text-gray-900 dark:text-white">Se connecter</span>
                <span class="text-[11px] text-gray-500 dark:text-gray-400">Gérer mes RDV</span>
              </div>
            </NuxtLink>
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
            <h3 class="text-lg font-normal mb-4">Services</h3>
            <ul class="space-y-2">
              <li>
                <NuxtLink 
                  :to="`${appointmentNewUrl}${appointmentNewUrl === '/rendez-vous/nouveau' ? '?type=blood_test' : ''}`" 
                  class="text-gray-400 hover:text-white transition-colors flex items-center"
                >
                  <UIcon name="i-lucide-droplet" class="w-4 h-4 mr-2" />
                  Prise de sang
                </NuxtLink>
              </li>
              <li>
                <NuxtLink 
                  :to="`${appointmentNewUrl}${appointmentNewUrl === '/rendez-vous/nouveau' ? '?type=nursing' : ''}`" 
                  class="text-gray-400 hover:text-white transition-colors flex items-center"
                >
                  <UIcon name="i-lucide-stethoscope" class="w-4 h-4 mr-2" />
                  Soins infirmiers
                </NuxtLink>
              </li>
              <li>
                <NuxtLink 
                  :to="appointmentNewUrl" 
                  class="text-gray-400 hover:text-white transition-colors flex items-center"
                >
                  <UIcon name="i-lucide-calendar-plus" class="w-4 h-4 mr-2" />
                  Prendre un rendez-vous
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/laboratoires" class="text-gray-400 hover:text-white transition-colors flex items-center">
                  <UIcon name="i-lucide-building-2" class="w-4 h-4 mr-2" />
                  Explorer les laboratoires
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/infirmiers" class="text-gray-400 hover:text-white transition-colors flex items-center">
                  <UIcon name="i-lucide-heart-pulse" class="w-4 h-4 mr-2" />
                  Explorer les infirmiers
                </NuxtLink>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-lg font-normal mb-4">Professionnels</h3>
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
            <h3 class="text-lg font-normal mb-4">Liens utiles</h3>
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
import { apiFetch } from '~/utils/api'

const route = useRoute()
/** Retour après connexion vers la page en cours (ex. formulaire RDV avec query provider). */
const loginWithReturnTo = computed(() => `/login?returnTo=${encodeURIComponent(route.fullPath)}`)
const { isAuthenticated } = useAuth()
const { user, roleLabel, userMenuItems, userDisplayName } = useHeaderUserMenu()
const { appointmentNewUrl } = useAppointmentNewUrl()

const mobileMenuOpen = ref(false)
const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

// État du menu notifications
const notificationsMenuOpen = ref(false)
const notificationsMenuRef = ref<HTMLElement | null>(null)

/** Un seul panneau ouvert (cloche vs avatar). */
function toggleNotificationsMenu() {
  if (!notificationsMenuOpen.value) {
    userMenuOpen.value = false
  }
  notificationsMenuOpen.value = !notificationsMenuOpen.value
}

function toggleUserMenu() {
  if (!userMenuOpen.value) {
    notificationsMenuOpen.value = false
  }
  userMenuOpen.value = !userMenuOpen.value
}
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

const handleMenuItemClick = (item: any) => {
  if (item.click) {
    item.click()
  }
  mobileMenuOpen.value = false
}

// Menu mobile : liens avec labels clairs et descriptions marketing
const mobileNavigationItems = computed(() => {
  const items: { label: string; to: string; description?: string }[] = []
  items.push({ label: 'Prendre rendez-vous', to: appointmentNewUrl.value, description: 'Réserver une prise de sang ou soins à domicile' })
  items.push({ label: 'Explorer les laboratoires', to: '/laboratoires', description: 'Les meilleurs laboratoires de France' })
  items.push({ label: 'Explorer les infirmiers', to: '/infirmiers', description: 'Trouvez un infirmier à domicile' })
  items.push({ label: 'Pour les patients', to: '/pour-les-patients', description: 'Découvrez comment prendre rendez-vous' })
  items.push({
    label: 'Présentation · Infirmiers',
    to: '/pour-les-infirmiers',
    description: 'Avantages et inscription pour les infirmiers',
  })
  items.push({
    label: 'Tarifs · Infirmiers',
    to: '/pour-les-infirmiers/tarifs',
    description: 'Découverte gratuit, Pro 29 €/mois, 30 j d\'essai',
  })
  items.push({
    label: 'Présentation · Laboratoire',
    to: '/pour-les-laboratoires',
    description: 'Connectez votre labo, préleveurs et tournées',
  })
  items.push({
    label: 'Tarifs · Laboratoire',
    to: '/pour-les-laboratoires/tarifs',
    description: 'Starter 49 €, Pro 129 €/mois, 30 j d\'essai',
  })
  items.push({ label: 'Professionnel', to: '/pour-les-professionnels' })
  items.push({ label: 'Contact', to: '/contact' })
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
    label: notif.title ? `${notif.title}${notif.message ? ` — ${notif.message}` : ''}` : (notif.message || 'Notification'),
    description: notif.created_at
      ? new Date(notif.created_at).toLocaleString('fr-FR')
      : undefined,
    isRead: !!notif.read_at,
    click: () => {
      const data = typeof notif.data === 'string'
        ? (() => { try { return JSON.parse(notif.data); } catch { return {}; } })()
        : (notif.data || {});
      const aptId = notif.appointment_id || data?.appointment_id;
      if (!aptId) return;
      const role = user.value?.role;
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
      } else if (role === 'super_admin') {
        navigateTo(`/admin/appointments/${aptId}`);
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
