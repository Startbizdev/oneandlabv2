<template>
  <div class="border-t border-gray-200 bg-white p-3">
    <UDropdown :items="menuItems" :popper="{ placement: 'top', offsetDistance: 12 }">
      <button
        class="group w-full flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        <!-- Avatar -->
        <div class="relative flex-shrink-0">
          <img
            v-if="user?.avatar"
            :src="user.avatar"
            :alt="displayName"
            class="h-9 w-9 rounded-lg object-cover shadow-sm"
          />
          <div
            v-else
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 text-xs font-bold text-white shadow-sm"
          >
            {{ displayName.charAt(0).toUpperCase() }}
          </div>
          
          <!-- Status indicator -->
          <div class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
        </div>

        <!-- User info -->
        <div v-if="!collapsed" class="flex-1 min-w-0 text-left">
          <p class="truncate text-sm font-semibold text-gray-900">
            {{ displayName }}
          </p>
          <p class="truncate text-xs text-gray-500">
            {{ user?.role || 'Utilisateur' }}
          </p>
        </div>

        <!-- Chevron -->
        <UIcon
          v-if="!collapsed"
          name="i-lucide-chevron-down"
          class="h-4 w-4 flex-shrink-0 text-gray-400 transition-colors group-hover:text-gray-600"
        />
      </button>
    </UDropdown>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  collapsed?: boolean;
}>();

const { user, logout } = useAuth();

const displayName = computed(() => {
  if (user.value?.first_name && user.value?.last_name) {
    return `${user.value.first_name} ${user.value.last_name}`;
  }
  return user.value?.email || 'Utilisateur';
});

// Handler de logout
const handleLogoutClick = async () => {
  await logout();
};

const menuItems = computed(() => {
  return [
    {
      label: 'Mon profil',
      icon: 'i-lucide-user',
      click: () => navigateTo('/profile'),
    },
    {
      label: 'Aide',
      icon: 'i-lucide-help-circle',
    },
    {
      label: 'Déconnexion',
      icon: 'i-lucide-log-out',
      click: handleLogoutClick,
    },
  ];
});
</script>

<style scoped>
button {
  @apply transition-colors duration-200;
}

button:active {
  @apply scale-95;
}
</style>
