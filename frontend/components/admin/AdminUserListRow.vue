<template>
  <article
    :id="rowDomId"
    class="transition-colors"
    :class="[
      highlighted
        ? 'bg-primary-50/80 ring-1 ring-inset ring-primary-200/80 dark:bg-primary-950/30 dark:ring-primary-800/60'
        : 'hover:bg-gray-50/70 dark:hover:bg-gray-900/40',
    ]"
  >
    <div
      class="flex flex-col gap-3 px-3 py-3.5 sm:px-4 sm:py-4 lg:flex-row lg:items-center lg:gap-4"
    >
      <button
        type="button"
        class="flex min-w-0 flex-1 gap-3 text-left lg:cursor-default"
        :class="isMobileTapTarget ? 'cursor-pointer active:opacity-90' : 'cursor-default'"
        @click="onRowActivate"
      >
        <UAvatar
          :src="user.profile_image_url ?? undefined"
          :alt="displayName"
          size="md"
          class="shrink-0"
        />
        <div class="min-w-0 flex-1 space-y-2">
          <div class="flex flex-wrap items-start gap-x-2 gap-y-1">
            <p class="min-w-0 truncate text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">
              {{ displayName || '—' }}
            </p>
            <UBadge :color="roleColor" variant="soft" size="xs" class="shrink-0 font-medium">
              {{ roleLabel }}
            </UBadge>
          </div>
          <p class="truncate text-[13px] text-gray-500 dark:text-gray-400">
            {{ user.email_display || user.email || '—' }}
          </p>
          <div class="flex flex-wrap items-center gap-1.5">
            <template v-if="hasCareTypes">
              <UBadge
                v-if="showPriseDeSang"
                color="error"
                variant="outline"
                size="xs"
                leading-icon="i-lucide-syringe"
              >
                Prélèvement
              </UBadge>
              <UBadge
                v-if="showSoinsInfirmiers"
                color="info"
                variant="outline"
                size="xs"
                leading-icon="i-lucide-stethoscope"
              >
                Soins infirmiers
              </UBadge>
            </template>
            <UBadge v-else color="neutral" variant="outline" size="xs" class="text-muted">
              Non applicable
            </UBadge>
            <UBadge
              v-if="isBanned"
              color="error"
              variant="outline"
              size="xs"
            >
              Banni
            </UBadge>
            <UBadge v-else-if="isSuspended" color="warning" variant="outline" size="xs">
              Suspendu
            </UBadge>
            <UBadge v-else color="success" variant="outline" size="xs">
              Actif
            </UBadge>
          </div>
          <p class="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
            Inscrit le {{ createdLabel }}
          </p>
        </div>
      </button>

      <div
        class="flex w-full shrink-0 flex-row items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800 sm:border-t-0 sm:pt-0 lg:w-auto lg:justify-end"
      >
        <UButton
          size="sm"
          variant="outline"
          color="neutral"
          leading-icon="i-lucide-eye"
          class="min-h-10 flex-1 justify-center rounded-lg font-medium shadow-none sm:min-h-9 sm:flex-none sm:rounded-full sm:px-3"
          @click="onView"
        >
          Voir
        </UButton>
        <UDropdownMenu :items="actionItems">
          <UButton
            size="sm"
            variant="outline"
            color="neutral"
            trailing-icon="i-lucide-chevron-down"
            class="min-h-10 flex-1 justify-center rounded-lg font-medium shadow-none sm:min-h-9 sm:flex-none sm:rounded-full sm:px-3"
            aria-label="Actions utilisateur"
          >
            Plus
          </UButton>
        </UDropdownMenu>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
const props = defineProps<{
  user: Record<string, any>
  displayName: string
  roleLabel: string
  roleColor: string
  createdLabel: string
  hasCareTypes: boolean
  showPriseDeSang: boolean
  showSoinsInfirmiers: boolean
  isBanned: boolean
  isSuspended: boolean
  highlighted?: boolean
  actionItems: unknown[]
}>()

const emit = defineEmits<{
  view: [id: string]
  rowActivate: [id: string]
}>()

const rowDomId = computed(() => `admin-user-row-${props.user.id}`)

const isMobileTapTarget = computed(() => {
  if (!import.meta.client) return false
  return window.matchMedia('(max-width: 1023px)').matches
})

function onView() {
  emit('view', String(props.user.id))
}

function onRowActivate() {
  if (!isMobileTapTarget.value) return
  emit('rowActivate', String(props.user.id))
}
</script>
