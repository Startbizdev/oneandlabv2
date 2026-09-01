<template>
  <UModal v-model:open="openModel" :ui="modalUi">
    <template #content="{ close }">
      <div
        class="flex flex-col w-full h-[100dvh] sm:h-[min(92dvh,860px)] sm:max-w-4xl bg-default sm:rounded-2xl overflow-hidden shadow-2xl ring-1 ring-default/60"
      >
        <header
          class="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-default shrink-0 bg-default"
        >
          <div class="min-w-0 space-y-1 pr-2">
            <h2 class="text-lg font-semibold text-foreground">
              {{ title }}
            </h2>
            <p v-if="subtitle" class="text-sm text-muted leading-relaxed">
              {{ subtitle }}
            </p>
          </div>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            size="sm"
            aria-label="Fermer"
            class="shrink-0"
            @click="close"
          />
        </header>

        <div class="relative flex-1 min-h-0 flex flex-col bg-muted/10 p-4 sm:p-6">
          <ClientOnly>
            <ProfileCoverageSquareMap
              v-if="openModel && hasCoords"
              ref="mapRef"
              :lat="lat!"
              :lng="lng!"
              :half-side-km="halfSideKm"
              :max-half-side-km="maxHalfSideKm"
              large-handles
              fill-height
              map-min-height="min-h-[320px]"
              class="flex-1 min-h-0 rounded-xl overflow-hidden border border-default/50 bg-default shadow-sm"
              @update:half-side-km="emit('update:halfSideKm', $event)"
              @update:bounds="emit('update:bounds', $event)"
              @drag-end="emit('dragEnd')"
            />
            <template #fallback>
              <div
                class="flex flex-1 min-h-[320px] items-center justify-center rounded-xl bg-muted/30 border border-default/40"
              >
                <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
              </div>
            </template>
          </ClientOnly>
        </div>

        <footer
          class="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-t border-default bg-default"
        >
          <p class="text-xs text-muted flex items-center gap-1.5">
            <UIcon name="i-lucide-move" class="w-3.5 h-3.5 shrink-0" />
            Glissez un coin pour ajuster la zone
          </p>
          <UButton color="primary" class="w-full sm:w-auto shrink-0" @click="close">
            Terminer
          </UButton>
        </footer>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { CoverageBounds } from '@oneandlab/shared-utils';
import { nextTick } from 'vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    lat: number | null;
    lng: number | null;
    halfSideKm: number;
    maxHalfSideKm?: number;
    title?: string;
    subtitle?: string;
  }>(),
  {
    maxHalfSideKm: 100,
    title: 'Modifier le secteur',
    subtitle: 'Glissez un coin du carré pour agrandir ou réduire la zone',
  },
);

const emit = defineEmits<{
  'update:open': [boolean];
  'update:halfSideKm': [number];
  'update:bounds': [CoverageBounds];
  dragEnd: [];
}>();

const mapRef = ref<{ invalidateSize?: () => void } | null>(null);

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});

const hasCoords = computed(
  () => props.lat != null && props.lng != null && !Number.isNaN(props.lat) && !Number.isNaN(props.lng),
);

/** Plein écran mobile, panneau centré desktop — pattern Nuxt UI #content. */
const modalUi = {
  overlay: 'bg-elevated/80 backdrop-blur-sm',
  content:
    'fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 max-w-none w-full h-full sm:h-auto',
};

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;
    await nextTick();
    setTimeout(() => mapRef.value?.invalidateSize?.(), 350);
  },
);
</script>
