<template>
  <div ref="mapEl" class="w-full h-[240px] rounded-b-lg overflow-hidden bg-gray-100 dark:bg-gray-800" />
</template>

<script setup lang="ts">
import { halfSideKmToBounds, zoomForCoverageHalfSideKm } from '@oneandlab/shared-utils';

const props = defineProps<{
  lat: number;
  lng: number;
  /** Demi-côté km (centre → bord). */
  halfSideKm: number;
}>();

const mapEl = ref<HTMLDivElement | null>(null);

onMounted(() => {
  if (!mapEl.value || typeof window === 'undefined') return;
  if (!props.lat || !props.lng || !props.halfSideKm) return;

  import('leaflet').then((L) => {
    const bounds = halfSideKmToBounds({ lat: props.lat, lng: props.lng }, props.halfSideKm);
    const latLngBounds = L.default.latLngBounds(
      [bounds.min_lat, bounds.min_lng],
      [bounds.max_lat, bounds.max_lng],
    );
    const map = L.default.map(mapEl.value!).setView(
      [props.lat, props.lng],
      zoomForCoverageHalfSideKm(props.halfSideKm),
    );
    L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    L.default.rectangle(latLngBounds, {
      color: 'var(--color-primary-500)',
      fillColor: 'var(--color-primary-400)',
      fillOpacity: 0.2,
      weight: 2,
    }).addTo(map);
    L.default.circleMarker([props.lat, props.lng], {
      radius: 5,
      color: 'var(--color-primary-600)',
      fillColor: 'var(--color-primary-500)',
      fillOpacity: 1,
      weight: 2,
    }).addTo(map);
  });
});
</script>
