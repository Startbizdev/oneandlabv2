<template>
  <UCard>
    <template #header>
      <CardHeader
        icon="i-lucide-map-pin"
        title="Zone de couverture"
        description="Carré d'intervention — glissez un coin sur la carte pour ajuster"
      />
    </template>

    <template v-if="!hasValidAddress">
      <UAlert
        color="amber"
        variant="soft"
        icon="i-lucide-alert-circle"
        title="Adresse requise"
        description="Définissez d'abord votre adresse dans la section ci-dessus pour configurer votre zone de couverture."
      />
    </template>

    <template v-else>
      <ClientOnly>
        <ProfileCoverageSquareMap
          v-if="address?.lat != null && address?.lng != null"
          :lat="Number(address.lat)"
          :lng="Number(address.lng)"
          :half-side-km="halfSideKm"
          :max-half-side-km="maxHalfSideKm"
          class="rounded-xl overflow-hidden shadow-sm"
          @update:half-side-km="emit('update:halfSideKm', $event)"
          @update:bounds="emit('update:bounds', $event)"
          @drag-end="emit('dragEnd')"
        />
        <template #fallback>
          <div class="w-full min-h-[280px] rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
          </div>
        </template>
      </ClientOnly>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import type { Address } from '~/types/profile'
import type { CoverageBounds } from '@oneandlab/shared-utils'

interface Props {
  halfSideKm: number
  maxHalfSideKm?: number
  address: Address | null
}

interface Emits {
  (e: 'update:halfSideKm', value: number): void
  (e: 'update:bounds', value: CoverageBounds): void
  (e: 'dragEnd'): void
}

const props = withDefaults(defineProps<Props>(), {
  maxHalfSideKm: 100,
})
const emit = defineEmits<Emits>()

const hasValidAddress = computed(() => props.address?.lat != null && props.address?.lng != null)
</script>
