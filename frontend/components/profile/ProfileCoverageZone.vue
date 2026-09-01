<template>
  <ProfileCoverageZonePanel
    v-if="hasValidAddress"
    :lat="Number(address!.lat)"
    :lng="Number(address!.lng)"
    :half-side-km="halfSideKm"
    :max-half-side-km="maxHalfSideKm"
    @save="emit('save', $event)"
  />
  <UCard v-else>
    <template #header>
      <CardHeader
        icon="i-lucide-map-pin"
        title="Zone de couverture"
        description="Polygone d'intervention autour de votre adresse professionnelle"
      />
    </template>
    <UAlert
      color="amber"
      variant="soft"
      icon="i-lucide-alert-circle"
      title="Adresse requise"
      description="Définissez d'abord votre adresse pour configurer votre zone de couverture."
    />
  </UCard>
</template>

<script setup lang="ts">
import type { Address } from '~/types/profile'
import type { CoverageEditorSavePayload } from '@oneandlab/shared-utils'

interface Props {
  halfSideKm: number
  maxHalfSideKm?: number
  address: Address | null
}

interface Emits {
  (e: 'save', value: CoverageEditorSavePayload): void
}

const props = withDefaults(defineProps<Props>(), {
  maxHalfSideKm: 100,
})
const emit = defineEmits<Emits>()

const hasValidAddress = computed(() => props.address?.lat != null && props.address?.lng != null)
</script>
