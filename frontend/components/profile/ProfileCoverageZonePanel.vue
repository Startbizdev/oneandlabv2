<template>
  <UCard class="overflow-hidden">
    <template #header>
      <CardHeader
        icon="i-lucide-map-pin"
        title="Zone de couverture"
        description="Polygone d'intervention autour de votre adresse professionnelle"
      />
    </template>

    <template v-if="!hasValidAddress">
      <UAlert
        color="amber"
        variant="soft"
        icon="i-lucide-alert-circle"
        title="Adresse requise"
        description="Définissez d'abord votre adresse dans la section Coordonnées pour configurer votre zone."
        class="rounded-lg"
      />
    </template>

    <template v-else>
      <div class="space-y-4">
        <ClientOnly>
          <ProfileCoverageSquareMap
            v-if="lat != null && lng != null"
            ref="mapRef"
            :lat="lat"
            :lng="lng"
            :half-side-km="editing ? draftHalfSide : halfSideKm"
            :max-half-side-km="maxHalfSideKm"
            :vertices="editing ? draftVertices : vertices"
            :read-only="!editing"
            :large-handles="editing"
            :show-footer="false"
            fill-height
            map-min-height="min-h-[320px]"
            map-height-class="h-[min(58vh,560px)] sm:h-[min(62vh,620px)] w-full rounded-xl border border-default/40"
            class="w-full"
            @update:half-side-km="draftHalfSide = $event"
            @update:vertices="draftVertices = $event"
            @update:bounds="draftBounds = $event"
          />
          <template #fallback>
            <div
              class="w-full h-[min(58vh,560px)] min-h-[320px] rounded-xl bg-muted/30 border border-default/40 flex items-center justify-center"
            >
              <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
            </div>
          </template>
        </ClientOnly>

        <p v-if="editing" class="text-xs text-muted flex items-center gap-1.5">
          <UIcon name="i-lucide-move" class="w-3.5 h-3.5 shrink-0" />
          Carré par défaut — 4 coins + 2 milieux (nord et sud). Glissez pour ajuster, puis validez.
        </p>

        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="space-y-0.5">
            <p class="text-sm text-foreground">
              <span class="font-semibold text-primary tabular-nums">{{ displayReach }} km</span>
              <span class="text-muted"> du centre au sommet le plus loin</span>
              <span class="text-muted hidden sm:inline"> · ~{{ displayArea }} km²</span>
            </p>
            <p class="text-xs text-muted">
              Les patients dans ce polygone peuvent vous contacter via Cary.
            </p>
          </div>

          <div v-if="editing" class="flex flex-col-reverse sm:flex-row gap-2 shrink-0 self-stretch sm:self-center">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" :disabled="saving" @click="cancelEdit">
              Annuler
            </UButton>
            <UButton color="primary" class="w-full sm:w-auto" :loading="saving" @click="validateEdit">
              Valider
            </UButton>
          </div>
          <UButton
            v-else
            color="primary"
            icon="i-lucide-pencil"
            class="shrink-0 self-start sm:self-center"
            :disabled="saving"
            @click="startEdit"
          >
            Modifier mon secteur
          </UButton>
        </div>

        <p v-if="discoveryHint" class="text-sm text-amber-600 dark:text-amber-400">
          <UIcon name="i-lucide-info" class="w-4 h-4 inline-block align-middle mr-1.5 shrink-0" aria-hidden="true" />
          {{ discoveryHint }}
          <NuxtLink v-if="discoveryLink" :to="discoveryLink" class="underline font-medium">Passez en Pro</NuxtLink>
          <template v-if="discoveryLink"> pour étendre jusqu'à 100 km.</template>
        </p>

        <p v-if="saving" class="text-xs text-muted flex items-center gap-1.5">
          <UIcon name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
          Enregistrement de la zone…
        </p>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import {
  ensureSixVertices,
  maxVertexDistanceKm,
  polygonAreaKm2,
  toPolygonPayload,
  type CoverageBounds,
  type CoverageEditorSavePayload,
  type CoverageVertex,
} from '@oneandlab/shared-utils';
import { nextTick } from 'vue';

const props = withDefaults(
  defineProps<{
    lat: number | null;
    lng: number | null;
    halfSideKm: number;
    maxHalfSideKm?: number;
    vertices?: CoverageVertex[] | null;
    saving?: boolean;
    discoveryHint?: string | null;
    discoveryLink?: string | null;
  }>(),
  {
    maxHalfSideKm: 100,
    vertices: null,
    saving: false,
    discoveryHint: null,
    discoveryLink: null,
  },
);

const emit = defineEmits<{
  save: [CoverageEditorSavePayload];
}>();

const editing = ref(false);
const mapRef = ref<{ invalidateSize?: () => void; getVertices?: () => CoverageVertex[] } | null>(null);
const draftVertices = ref<CoverageVertex[]>([]);
const draftHalfSide = ref(props.halfSideKm);
const draftBounds = ref<CoverageBounds | null>(null);

const hasValidAddress = computed(() => props.lat != null && props.lng != null);

function resetDraft() {
  if (props.lat == null || props.lng == null) return;
  const center = { lat: props.lat, lng: props.lng };
  const verts = ensureSixVertices(center, props.vertices ?? null, props.halfSideKm);
  draftVertices.value = verts;
  draftHalfSide.value = maxVertexDistanceKm(center, verts);
  draftBounds.value = toPolygonPayload(verts);
}

const previewVertices = computed(() => {
  if (props.lat == null || props.lng == null) return [];
  if (editing.value && draftVertices.value.length >= 3) return draftVertices.value;
  return ensureSixVertices({ lat: props.lat, lng: props.lng }, props.vertices ?? null, props.halfSideKm);
});

const displayReach = computed(() => {
  if (props.lat == null || props.lng == null) return Math.round(props.halfSideKm);
  return Math.round(maxVertexDistanceKm({ lat: props.lat, lng: props.lng }, previewVertices.value));
});
const displayArea = computed(() => Math.round(polygonAreaKm2(previewVertices.value)));

function startEdit() {
  resetDraft();
  editing.value = true;
  nextTick(() => {
    setTimeout(() => mapRef.value?.invalidateSize?.(), 200);
  });
}

function cancelEdit() {
  editing.value = false;
  resetDraft();
}

function validateEdit() {
  if (props.lat == null || props.lng == null) return;
  const center = { lat: props.lat, lng: props.lng };
  const verts = mapRef.value?.getVertices?.() ?? draftVertices.value;
  const vertices = ensureSixVertices(center, verts, draftHalfSide.value);
  const bounds = toPolygonPayload(vertices);
  emit('save', {
    vertices,
    bounds,
    halfSideKm: maxVertexDistanceKm(center, vertices),
  });
  editing.value = false;
}

watch(
  () => [props.halfSideKm, props.vertices, props.lat, props.lng],
  () => {
    if (!editing.value) resetDraft();
  },
  { deep: true },
);

watch(
  () => props.saving,
  (isSaving, wasSaving) => {
    if (wasSaving && !isSaving) editing.value = false;
  },
);
</script>
