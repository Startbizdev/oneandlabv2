<template>
  <div
    :class="[
      fillHeight ? 'flex flex-col min-h-0' : 'space-y-3',
      fillHeight && mapHeightClass ? mapHeightClass : '',
    ]"
  >
    <div
      ref="mapEl"
      class="relative z-0 isolate w-full overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 shadow-sm"
      :class="[
        fillHeight ? 'flex-1 min-h-0 h-full rounded-xl' : 'rounded-xl',
        mapMinHeight,
      ]"
    />
    <div v-if="showFooter" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        <span class="font-medium text-primary tabular-nums">{{ displayReach }} km</span>
        <span class="text-muted"> du centre au sommet le plus loin</span>
        <span class="text-muted hidden sm:inline"> · ~{{ displayArea }} km²</span>
      </p>
      <p v-if="!readOnly" class="text-xs text-muted flex items-center gap-1.5">
        <UIcon name="i-lucide-move" class="w-3.5 h-3.5 shrink-0" />
        Glissez un poignet pour former votre zone
      </p>
    </div>
    <p v-if="limitReachedHint" class="text-xs text-amber-600 dark:text-amber-400">
      {{ limitReachedHint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import {
  clampVertexToMaxKm,
  COVERAGE_MAP_TILE_ATTRIBUTION,
  COVERAGE_MAP_TILE_MAX_ZOOM,
  COVERAGE_MAP_TILE_SUBDOMAINS,
  COVERAGE_MAP_TILE_URL,
  COVERAGE_VERTEX_COUNT,
  ensureSixVertices,
  maxVertexDistanceKm,
  polygonAreaKm2,
  toPolygonPayload,
  zoomForCoverageHalfSideKm,
  type CoverageBounds,
  type CoveragePolygonPayload,
  type CoverageVertex,
} from '@oneandlab/shared-utils';

const props = withDefaults(
  defineProps<{
    lat: number;
    lng: number;
    halfSideKm: number;
    maxHalfSideKm?: number;
    vertices?: CoverageVertex[] | null;
    readOnly?: boolean;
    largeHandles?: boolean;
    mapMinHeight?: string;
    mapHeightClass?: string;
    showFooter?: boolean;
    fillHeight?: boolean;
  }>(),
  {
    maxHalfSideKm: 100,
    vertices: null,
    readOnly: false,
    largeHandles: false,
    mapMinHeight: 'min-h-[240px] sm:min-h-[280px]',
    mapHeightClass: '',
    showFooter: true,
    fillHeight: false,
  },
);

const emit = defineEmits<{
  'update:halfSideKm': [number];
  'update:bounds': [CoverageBounds];
  'update:vertices': [CoverageVertex[]];
  dragEnd: [];
}>();

const mapEl = ref<HTMLDivElement | null>(null);
let map: any = null;
let polygon: any = null;
let centerMarker: any = null;
let vertexMarkers: any[] = [];
let L: any = null;
let dragging = false;
const limitReachedHint = ref<string | null>(null);
const liveVertices = ref<CoverageVertex[]>([]);

const center = computed(() => ({ lat: props.lat, lng: props.lng }));

function resolvedVertices(): CoverageVertex[] {
  return ensureSixVertices(center.value, props.vertices ?? null, props.halfSideKm);
}

const displayReach = computed(() => {
  const verts = liveVertices.value.length === COVERAGE_VERTEX_COUNT ? liveVertices.value : resolvedVertices();
  return Math.round(maxVertexDistanceKm(center.value, verts));
});
const displayArea = computed(() => {
  const verts = liveVertices.value.length === COVERAGE_VERTEX_COUNT ? liveVertices.value : resolvedVertices();
  return Math.round(polygonAreaKm2(verts));
});

const isValid = computed(
  () => props.lat && props.lng && !Number.isNaN(props.lat) && !Number.isNaN(props.lng),
);

function latLngsFrom(vertices: CoverageVertex[]) {
  return vertices.map((v) => [v.lat, v.lng] as [number, number]);
}

function applyVertices(vertices: CoverageVertex[], fit = false) {
  if (!map || !L || !polygon) return;
  liveVertices.value = vertices;
  polygon.setLatLngs(latLngsFrom(vertices));
  vertexMarkers.forEach((m, i) => {
    if (vertices[i]) m.setLatLng([vertices[i].lat, vertices[i].lng]);
  });
  centerMarker?.setLatLng([props.lat, props.lng]);
  if (fit) {
    map.setView([props.lat, props.lng], zoomForCoverageHalfSideKm(maxVertexDistanceKm(center.value, vertices)));
  }
}

function emitZone(vertices: CoverageVertex[]) {
  const payload: CoveragePolygonPayload = toPolygonPayload(vertices);
  emit('update:bounds', payload);
  emit('update:vertices', vertices);
  emit('update:halfSideKm', maxVertexDistanceKm(center.value, vertices));
}

function vertexFromMarker(marker: any): CoverageVertex {
  const ll = marker.getLatLng();
  return clampVertexToMaxKm(center.value, { lat: ll.lat, lng: ll.lng }, props.maxHalfSideKm);
}

function currentVerticesFromMarkers(dragIndex?: number, live?: CoverageVertex): CoverageVertex[] {
  return vertexMarkers.map((m, i) => {
    if (dragIndex === i && live) return live;
    const ll = m.getLatLng();
    return { lat: ll.lat, lng: ll.lng };
  });
}

function onVertexDrag(idx: number) {
  if (!L || props.readOnly) return;
  const clamped = vertexFromMarker(vertexMarkers[idx]);
  vertexMarkers[idx].setLatLng([clamped.lat, clamped.lng]);
  const verts = currentVerticesFromMarkers(idx, clamped);
  liveVertices.value = verts;
  polygon.setLatLngs(latLngsFrom(verts));
}

function onVertexDragEnd(idx: number) {
  if (!L || props.readOnly) return;
  dragging = false;
  const before = maxVertexDistanceKm(center.value, liveVertices.value.length ? liveVertices.value : resolvedVertices());
  const clamped = vertexFromMarker(vertexMarkers[idx]);
  vertexMarkers[idx].setLatLng([clamped.lat, clamped.lng]);
  const verts = currentVerticesFromMarkers(idx, clamped);
  applyVertices(verts);
  emitZone(verts);
  const reach = maxVertexDistanceKm(center.value, verts);
  if (reach >= props.maxHalfSideKm - 0.5 && before < props.maxHalfSideKm - 0.5) {
    limitReachedHint.value =
      props.maxHalfSideKm <= 20
        ? "Offre Découverte : zone limitée à 20 km. Passez à Pro pour étendre jusqu'à 100 km."
        : `Zone limitée à ${props.maxHalfSideKm} km.`;
  } else {
    limitReachedHint.value = null;
  }
  emit('dragEnd');
}

function createHandleIcon() {
  const size = props.largeHandles ? 28 : 20;
  const dot = props.largeHandles ? 22 : 16;
  return L.divIcon({
    className: 'coverage-poly-handle',
    html: `<div class="coverage-poly-handle-dot" style="width:${dot}px;height:${dot}px"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

async function initMap() {
  if (!mapEl.value || typeof window === 'undefined' || !isValid.value) return;
  L = (await import('leaflet')).default;
  await import('leaflet/dist/leaflet.css');

  const vertices = resolvedVertices();
  liveVertices.value = vertices;
  const reach = maxVertexDistanceKm(center.value, vertices);

  map = L.map(mapEl.value, { zoomControl: true, attributionControl: true }).setView(
    [props.lat, props.lng],
    zoomForCoverageHalfSideKm(reach),
  );
  L.tileLayer(COVERAGE_MAP_TILE_URL, {
    attribution: COVERAGE_MAP_TILE_ATTRIBUTION,
    subdomains: COVERAGE_MAP_TILE_SUBDOMAINS,
    maxZoom: COVERAGE_MAP_TILE_MAX_ZOOM,
  }).addTo(map);

  polygon = L.polygon(latLngsFrom(vertices), {
    color: 'var(--color-primary-600, #0d9488)',
    fillColor: 'var(--color-primary-400, #3DD9CC)',
    fillOpacity: 0.18,
    weight: 2.5,
  }).addTo(map);

  centerMarker = L.circleMarker([props.lat, props.lng], {
    radius: 7,
    color: '#fff',
    fillColor: 'var(--color-primary-500, #1CC7B5)',
    fillOpacity: 1,
    weight: 2,
  }).addTo(map);

  vertexMarkers = vertices.map((v, idx) => {
    const m = L.marker([v.lat, v.lng], {
      icon: createHandleIcon(),
      draggable: !props.readOnly,
      zIndexOffset: 1000,
    }).addTo(map);
    if (!props.readOnly) {
      m.on('dragstart', () => {
        dragging = true;
      });
      m.on('drag', () => onVertexDrag(idx));
      m.on('dragend', () => onVertexDragEnd(idx));
    }
    return m;
  });
}

function refreshFromProps() {
  if (!map || !L || dragging || !isValid.value) return;
  applyVertices(resolvedVertices(), false);
}

function destroyMap() {
  if (map) {
    map.remove();
    map = null;
    polygon = null;
    centerMarker = null;
    vertexMarkers = [];
  }
}

onMounted(async () => {
  await initMap();
  if (props.fillHeight) {
    setTimeout(() => map?.invalidateSize?.(), 150);
  }
});

watch(
  () => [props.readOnly, props.largeHandles],
  () => {
    destroyMap();
    if (isValid.value && mapEl.value) void initMap();
  },
);

watch(
  () => [props.lat, props.lng, props.halfSideKm, props.maxHalfSideKm, props.vertices],
  () => {
    if (map && polygon) refreshFromProps();
    else if (isValid.value && mapEl.value && !map) void initMap();
  },
  { deep: true },
);

onBeforeUnmount(() => {
  destroyMap();
});

defineExpose({
  invalidateSize: () => {
    map?.invalidateSize?.();
  },
  getVertices: () =>
    liveVertices.value.length === COVERAGE_VERTEX_COUNT ? liveVertices.value : resolvedVertices(),
});
</script>

<style scoped>
:deep(.leaflet-container) {
  width: 100%;
  height: 100%;
  min-height: inherit;
}
:deep(.coverage-poly-handle) {
  background: transparent;
  border: none;
}
:deep(.coverage-poly-handle-dot) {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: var(--color-primary-500, #1cc7b5);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  cursor: grab;
}
:deep(.coverage-poly-handle-dot:active) {
  cursor: grabbing;
}
</style>
