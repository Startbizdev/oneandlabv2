<template>
  <div ref="mapEl" class="w-full h-[240px] rounded-b-lg overflow-hidden bg-gray-100 dark:bg-gray-800" />
</template>

<script setup lang="ts">
const props = defineProps<{
  lat: number
  lng: number
  radiusKm: number
}>()

const mapEl = ref<HTMLDivElement | null>(null)

onMounted(() => {
  if (!mapEl.value || typeof window === 'undefined') return
  import('leaflet').then((L) => {
    const map = L.default.map(mapEl.value!).setView([props.lat, props.lng], 8)
    L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map)
    const radiusMeters = props.radiusKm * 1000
    L.default.circle([props.lat, props.lng], {
      radius: radiusMeters,
      color: 'var(--color-primary-500)',
      fillColor: 'var(--color-primary-400)',
      fillOpacity: 0.2,
      weight: 2,
    }).addTo(map)
  })
})
</script>
