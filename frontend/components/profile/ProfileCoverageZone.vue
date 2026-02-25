<template>
  <UCard>
    <template #header>
      <CardHeader
        icon="i-lucide-map-pin"
        title="Zone de couverture"
        description="Rayon d'intervention autour de votre adresse (en km)"
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
      <div class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          <div class="space-y-4 order-2 lg:order-1">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Rayon</span>
              <span class="text-xl font-semibold tabular-nums text-primary">
                {{ radius }} km
              </span>
            </div>
            <USlider
              :model-value="radius"
              @update:model-value="handleRadiusChange"
              :min="MIN_RADIUS"
              :max="MAX_RADIUS"
              :step="RADIUS_STEP"
              size="lg"
              class="w-full"
            />
            <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{{ MIN_RADIUS }} km</span>
              <span>{{ MAX_RADIUS }} km</span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Ajustez le curseur pour voir la zone en direct sur la carte.
            </p>
            <div v-if="!noActions" class="flex justify-end pt-2">
              <UButton
                variant="outline"
                size="lg"
                :loading="isSaving"
                icon="i-lucide-save"
                @click="$emit('save')"
              >
                Enregistrer le rayon
              </UButton>
            </div>
          </div>

          <div class="order-1 lg:order-2 w-full min-h-[280px] sm:min-h-[320px]">
            <ClientOnly>
              <ProfileCoverageMapLive
                v-if="address?.lat != null && address?.lng != null"
                :lat="Number(address.lat)"
                :lng="Number(address.lng)"
                :radius-km="radius"
                class="rounded-xl overflow-hidden shadow-sm"
              />
              <div
                v-else
                class="w-full h-full min-h-[280px] rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-center justify-center"
              >
                <div class="text-center px-4">
                  <UIcon
                    name="i-lucide-map"
                    class="w-10 h-10 text-gray-400 mx-auto mb-2"
                  />
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Carte disponible après enregistrement de l'adresse
                  </p>
                </div>
              </div>
              <template #fallback>
                <div class="w-full h-full min-h-[280px] rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  <UIcon
                    name="i-lucide-loader-2"
                    class="w-8 h-8 animate-spin text-primary"
                  />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import type { Address } from '~/types/profile'

const MIN_RADIUS = 5
const MAX_RADIUS = 100
const RADIUS_STEP = 5

interface Props {
  radius: number
  address: Address | null
  isSaving?: boolean
  /** Masquer le bouton Enregistrer (sauvegarde globale en bas de page) */
  noActions?: boolean
}

interface Emits {
  (e: 'update:radius', value: number): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const hasValidAddress = computed(() => {
  return props.address?.lat != null && props.address?.lng != null
})

function handleRadiusChange(value: number) {
  emit('update:radius', value)
}
</script>
