<template>
  <UModal
    v-model:open="openModel"
    :ui="{
      content:
        'sm:max-w-4xl w-[calc(100%-1.5rem)] max-h-[min(90dvh,720px)] flex flex-col overflow-hidden p-0 rounded-2xl shadow-xl',
    }"
  >
    <template #content="{ close }">
      <div class="flex flex-col max-h-[min(90dvh,720px)] bg-default overflow-hidden rounded-2xl">
        <header
          class="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-default shrink-0"
        >
          <div class="min-w-0 space-y-0.5 pr-2">
            <h2 class="text-base sm:text-lg font-semibold text-foreground">
              {{ title }}
            </h2>
            <p v-if="subtitle" class="text-xs sm:text-sm text-muted leading-relaxed">
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

        <div class="px-4 sm:px-5 py-4 shrink-0">
          <ClientOnly>
            <ProfileCoverageSquareMap
              v-if="openModel && hasCoords"
              ref="mapRef"
              :lat="lat!"
              :lng="lng!"
              :half-side-km="draftHalfSide"
              :max-half-side-km="maxHalfSideKm"
              :vertices="draftVertices"
              large-handles
              :show-footer="false"
              map-min-height="min-h-[340px] sm:min-h-[400px]"
              class="h-[min(48vh,440px)] sm:h-[min(52vh,480px)] rounded-xl overflow-hidden border border-default/60 shadow-sm ring-1 ring-black/5"
              @update:half-side-km="draftHalfSide = $event"
              @update:vertices="draftVertices = $event"
              @update:bounds="draftBounds = $event"
            />
            <template #fallback>
              <div
                class="flex h-[min(48vh,440px)] items-center justify-center rounded-xl bg-muted/30 border border-default/40"
              >
                <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
              </div>
            </template>
          </ClientOnly>
        </div>

        <footer
          class="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 px-4 sm:px-5 py-3.5 border-t border-default bg-default"
        >
          <p class="text-xs text-muted flex items-center gap-1.5 sm:mr-auto">
            <UIcon name="i-lucide-move" class="w-3.5 h-3.5 shrink-0" />
            Carré par défaut — 4 coins + 2 milieux de côté. Glissez pour ajuster.
          </p>
          <UButton variant="ghost" color="neutral" size="sm" class="w-full sm:w-auto" @click="close">
            Annuler
          </UButton>
          <UButton
            color="primary"
            size="sm"
            class="w-full sm:w-auto shrink-0"
            :loading="saving"
            @click="onValidate(close)"
          >
            Valider
          </UButton>
        </footer>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import {
  ensureSixVertices,
  maxVertexDistanceKm,
  toPolygonPayload,
  type CoverageBounds,
  type CoverageEditorSavePayload,
  type CoverageVertex,
} from '@oneandlab/shared-utils';
import { nextTick } from 'vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    lat: number | null;
    lng: number | null;
    halfSideKm: number;
    maxHalfSideKm?: number;
    vertices?: CoverageVertex[] | null;
    title?: string;
    subtitle?: string;
    saving?: boolean;
  }>(),
  {
    maxHalfSideKm: 100,
    vertices: null,
    title: 'Modifier le secteur',
    subtitle: 'Carré par défaut : 4 poignées aux angles + 2 au milieu des côtés nord et sud',
    saving: false,
  },
);

const emit = defineEmits<{
  'update:open': [boolean];
  save: [CoverageEditorSavePayload];
}>();

const mapRef = ref<{ invalidateSize?: () => void; getVertices?: () => CoverageVertex[] } | null>(null);
const draftVertices = ref<CoverageVertex[]>([]);
const draftHalfSide = ref(props.halfSideKm);
const draftBounds = ref<CoverageBounds | null>(null);

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});

const hasCoords = computed(
  () => props.lat != null && props.lng != null && !Number.isNaN(props.lat) && !Number.isNaN(props.lng),
);

function resetDraft() {
  if (!hasCoords.value) return;
  const center = { lat: props.lat!, lng: props.lng! };
  const verts = ensureSixVertices(center, props.vertices ?? null, props.halfSideKm);
  draftVertices.value = verts;
  draftHalfSide.value = maxVertexDistanceKm(center, verts);
  draftBounds.value = toPolygonPayload(verts);
}

function onValidate(close: () => void) {
  if (!hasCoords.value) return;
  const center = { lat: props.lat!, lng: props.lng! };
  const verts = mapRef.value?.getVertices?.() ?? draftVertices.value;
  const vertices = ensureSixVertices(center, verts, draftHalfSide.value);
  const bounds = toPolygonPayload(vertices);
  emit('save', {
    vertices,
    bounds,
    halfSideKm: maxVertexDistanceKm(center, vertices),
  });
  close();
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;
    resetDraft();
    await nextTick();
    setTimeout(() => mapRef.value?.invalidateSize?.(), 400);
  },
);
</script>
