<template>
  <div class="space-y-3">
    <div
      ref="mapEl"
      class="relative z-0 isolate w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      :class="mapMinHeight"
    />
    <div v-if="showFooter" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        <span class="font-medium text-primary tabular-nums">{{ displayHalfSide }} km</span>
        <span class="text-muted"> du centre au bord</span>
        <span class="text-muted hidden sm:inline"> · ~{{ displayArea }} km²</span>
      </p>
      <p v-if="!readOnly" class="text-xs text-muted flex items-center gap-1.5">
        <UIcon name="i-lucide-move" class="w-3.5 h-3.5 shrink-0" />
        Glissez un coin pour ajuster votre zone
      </p>
    </div>
    <p v-if="limitReachedHint" class="text-xs text-amber-600 dark:text-amber-400">
      {{ limitReachedHint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import {
  halfSideKmToBounds,
  boundsToHalfSideKm,
  resizeSquareFromCorner,
  squareAreaKm2,
  clampHalfSideKm,
  MIN_HALF_SIDE_KM,
  type CoverageBounds,
} from '@oneandlab/shared-utils';

const props = withDefaults(
  defineProps<{
    lat: number;
    lng: number;
    halfSideKm: number;
    maxHalfSideKm?: number;
    /** Lecture seule (pas de drag). */
    readOnly?: boolean;
    /** Poignées plus grandes (plein écran / tactile). */
    largeHandles?: boolean;
    /** Classes min-height / height du conteneur carte. */
    mapMinHeight?: string;
    /** Afficher le résumé km sous la carte. */
    showFooter?: boolean;
  }>(),
  {
    maxHalfSideKm: 100,
    readOnly: false,
    largeHandles: false,
    mapMinHeight: 'min-h-[240px] sm:min-h-[280px]',
    showFooter: true,
  },
);

const emit = defineEmits<{
  'update:halfSideKm': [number];
  'update:bounds': [CoverageBounds];
  dragEnd: [];
}>();

const mapEl = ref<HTMLDivElement | null>(null);
let map: any = null;
let rectangle: any = null;
let centerMarker: any = null;
let cornerMarkers: any[] = [];
let L: any = null;
let dragging = false;
const limitReachedHint = ref<string | null>(null);

const displayHalfSide = computed(() => Math.round(props.halfSideKm));
const displayArea = computed(() => Math.round(squareAreaKm2(props.halfSideKm)));

const isValid = computed(
  () => props.lat && props.lng && !Number.isNaN(props.lat) && !Number.isNaN(props.lng),
);

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function cornersFromBounds(bounds: CoverageBounds): Array<[number, number]> {
  return [
    [bounds.max_lat, bounds.min_lng],
    [bounds.max_lat, bounds.max_lng],
    [bounds.min_lat, bounds.max_lng],
    [bounds.min_lat, bounds.min_lng],
  ];
}

function applyBounds(bounds: CoverageBounds, fit = false) {
  if (!map || !L || !rectangle) return;
  const latLngBounds = L.latLngBounds(
    [bounds.min_lat, bounds.min_lng],
    [bounds.max_lat, bounds.max_lng],
  );
  rectangle.setBounds(latLngBounds);
  const corners = cornersFromBounds(bounds);
  cornerMarkers.forEach((m, i) => {
    m.setLatLng(corners[i]);
  });
  centerMarker?.setLatLng([props.lat, props.lng]);
  if (fit) {
    map.fitBounds(latLngBounds, { padding: [24, 24], maxZoom: 12 });
  }
}

function emitZone(bounds: CoverageBounds, half: number) {
  emit('update:bounds', bounds);
  emit('update:halfSideKm', half);
}

function onCornerDragEnd(markerIndex: number) {
  if (!L || props.readOnly) return;
  dragging = false;
  const corner = cornerMarkers[markerIndex].getLatLng();
  const before = props.halfSideKm;
  const { bounds, halfSideKm } = resizeSquareFromCorner(
    { lat: props.lat, lng: props.lng },
    { lat: corner.lat, lng: corner.lng },
    props.maxHalfSideKm,
    MIN_HALF_SIDE_KM,
  );
  applyBounds(bounds);
  emitZone(bounds, halfSideKm);
  if (halfSideKm >= props.maxHalfSideKm - 0.5 && before < props.maxHalfSideKm - 0.5) {
    limitReachedHint.value =
      props.maxHalfSideKm <= 20
        ? 'Offre Découverte : zone limitée à 20 km. Passez à Pro pour étendre jusqu\'à 100 km.'
        : `Zone limitée à ${props.maxHalfSideKm} km.`;
  } else {
    limitReachedHint.value = null;
  }
  emit('dragEnd');
}

function createCornerIcon() {
  const size = props.largeHandles ? 28 : 20;
  const dot = props.largeHandles ? 24 : 16;
  const margin = props.largeHandles ? 2 : 2;
  return L.divIcon({
    className: 'coverage-square-handle',
    html: `<div class="coverage-square-handle-dot" style="width:${dot}px;height:${dot}px;margin:${margin}px"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

async function initMap() {
  if (!mapEl.value || typeof window === 'undefined' || !isValid.value) return;
  L = (await import('leaflet')).default;
  await import('leaflet/dist/leaflet.css');

  const bounds = halfSideKmToBounds(
    { lat: props.lat, lng: props.lng },
    clampHalfSideKm(props.halfSideKm, props.maxHalfSideKm),
  );

  map = L.map(mapEl.value, { zoomControl: true }).setView([props.lat, props.lng], 10);
  L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

  rectangle = L.rectangle(
    [
      [bounds.min_lat, bounds.min_lng],
      [bounds.max_lat, bounds.max_lng],
    ],
    {
      color: 'var(--color-primary-500, #1CC7B5)',
      fillColor: 'var(--color-primary-400, #3DD9CC)',
      fillOpacity: 0.22,
      weight: 2,
    },
  ).addTo(map);

  centerMarker = L.circleMarker([props.lat, props.lng], {
    radius: 7,
    color: '#fff',
    fillColor: 'var(--color-primary-500, #1CC7B5)',
    fillOpacity: 1,
    weight: 2,
  }).addTo(map);

  if (!props.readOnly) {
    const corners = cornersFromBounds(bounds);
    cornerMarkers = corners.map((c, idx) => {
      const m = L.marker(c, {
        icon: createCornerIcon(),
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(map);
      m.on('dragstart', () => {
        dragging = true;
      });
      m.on('drag', () => {
        const corner = m.getLatLng();
        const { bounds: liveBounds } = resizeSquareFromCorner(
          { lat: props.lat, lng: props.lng },
          { lat: corner.lat, lng: corner.lng },
          props.maxHalfSideKm,
          MIN_HALF_SIDE_KM,
        );
        rectangle.setBounds(
          L.latLngBounds(
            [liveBounds.min_lat, liveBounds.min_lng],
            [liveBounds.max_lat, liveBounds.max_lng],
          ),
        );
        const liveCorners = cornersFromBounds(liveBounds);
        cornerMarkers.forEach((cm, i) => {
          if (i !== idx) cm.setLatLng(liveCorners[i]);
        });
      });
      m.on('dragend', () => onCornerDragEnd(idx));
      return m;
    });
  }

  map.fitBounds(
    L.latLngBounds([bounds.min_lat, bounds.min_lng], [bounds.max_lat, bounds.max_lng]),
    { padding: [24, 24], maxZoom: 12 },
  );
}

function refreshFromProps() {
  if (!map || !L || dragging || !isValid.value) return;
  const bounds = halfSideKmToBounds(
    { lat: props.lat, lng: props.lng },
    clampHalfSideKm(props.halfSideKm, props.maxHalfSideKm),
  );
  applyBounds(bounds);
}

onMounted(async () => {
  await initMap();
});

function destroyMap() {
  if (map) {
    map.remove();
    map = null;
    rectangle = null;
    centerMarker = null;
    cornerMarkers = [];
  }
}

watch(
  () => [props.readOnly, props.largeHandles],
  () => {
    destroyMap();
    if (isValid.value && mapEl.value) void initMap();
  },
);

watch(
  () => [props.lat, props.lng, props.halfSideKm, props.maxHalfSideKm],
  () => {
    if (map && rectangle) refreshFromProps();
    else if (isValid.value && mapEl.value && !map) void initMap();
  },
);

onBeforeUnmount(() => {
  destroyMap();
});

defineExpose({
  invalidateSize: () => {
    map?.invalidateSize?.();
  },
});
</script>

<style scoped>
:deep(.coverage-square-handle) {
  background: transparent;
  border: none;
}
:deep(.coverage-square-handle-dot) {
  width: 16px;
  height: 16px;
  margin: 2px;
  border-radius: 4px;
  background: var(--color-primary-500, #1cc7b5);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  cursor: grab;
}
:deep(.coverage-square-handle-dot:active) {
  cursor: grabbing;
}
</style>
