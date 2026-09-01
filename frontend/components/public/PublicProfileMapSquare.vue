<template>
  <div ref="mapEl" class="w-full h-[240px] rounded-b-lg overflow-hidden bg-slate-100 dark:bg-slate-900" />
</template>

<script setup lang="ts">
import {
  COVERAGE_MAP_TILE_ATTRIBUTION,
  COVERAGE_MAP_TILE_MAX_ZOOM,
  COVERAGE_MAP_TILE_SUBDOMAINS,
  COVERAGE_MAP_TILE_URL,
  defaultSquareVertices,
  zoomForCoverageHalfSideKm,
  type CoverageVertex,
} from '@oneandlab/shared-utils';

const props = defineProps<{
  lat: number;
  lng: number;
  halfSideKm: number;
  vertices?: CoverageVertex[] | null;
}>();

const mapEl = ref<HTMLDivElement | null>(null);

onMounted(() => {
  if (!mapEl.value || typeof window === 'undefined') return;
  if (!props.lat || !props.lng || !props.halfSideKm) return;

  import('leaflet').then((L) => {
    const verts =
      props.vertices && props.vertices.length >= 3
        ? props.vertices
        : defaultSquareVertices({ lat: props.lat, lng: props.lng }, props.halfSideKm);
    const map = L.default.map(mapEl.value!).setView(
      [props.lat, props.lng],
      zoomForCoverageHalfSideKm(props.halfSideKm),
    );
    L.default.tileLayer(COVERAGE_MAP_TILE_URL, {
      attribution: COVERAGE_MAP_TILE_ATTRIBUTION,
      subdomains: COVERAGE_MAP_TILE_SUBDOMAINS,
      maxZoom: COVERAGE_MAP_TILE_MAX_ZOOM,
    }).addTo(map);
    L.default.polygon(
      verts.map((v) => [v.lat, v.lng] as [number, number]),
      {
        color: 'var(--color-primary-600)',
        fillColor: 'var(--color-primary-400)',
        fillOpacity: 0.18,
        weight: 2.5,
      },
    ).addTo(map);
    L.default.circleMarker([props.lat, props.lng], {
      radius: 5,
      color: '#fff',
      fillColor: 'var(--color-primary-500)',
      fillOpacity: 1,
      weight: 2,
    }).addTo(map);
  });
});
</script>
