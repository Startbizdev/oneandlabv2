<template>
  <div class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
    <UDropdown :items="dropdownItems" :popper="{ placement: 'top', offsetDistance: 8 }">
      <button
        class="group w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      >
        <!-- Avatar -->
        <div class="relative flex-shrink-0">
          <UserAvatar
            :src="user?.profile_image_url ?? user?.avatar"
            :initial="avatarInitial"
            :alt="userDisplayName"
            size="md"
          />
          <span class="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900 bg-green-500" />
        </div>

        <!-- User info -->
        <div v-if="!collapsed" class="flex-1 min-w-0 text-left">
          <p class="truncate text-sm font-normal text-gray-900 dark:text-white">
            {{ userDisplayName }}
          </p>
          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
            {{ roleLabel }}
          </span>
        </div>

        <UIcon
          v-if="!collapsed"
          name="i-lucide-chevron-down"
          class="h-4 w-4 flex-shrink-0 text-gray-400 transition-colors group-hover:text-gray-600 dark:group-hover:text-gray-300"
        />
      </button>
    </UDropdown>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  collapsed?: boolean;
}>();

const { user, roleLabel, userMenuItems, userDisplayName } = useHeaderUserMenu();

const avatarInitial = computed(() =>
  (user.value?.first_name?.charAt(0) || user.value?.email?.charAt(0) || 'U').toUpperCase()
);

// Format pour UDropdown : items avec label, icon, onSelect (click)
const dropdownItems = computed(() =>
  userMenuItems.value
    .filter((item: any) => item.type !== 'divider')
    .map((item: any) => ({
      label: item.label,
      icon: item.icon,
      onSelect: item.click,
    }))
);
</script>

<style scoped>
button {
  @apply transition-colors duration-200;
}

button:active {
  @apply scale-95;
}
</style>
