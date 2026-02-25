<template>
  <div ref="mapEl" class="w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 min-h-[220px] sm:min-h-[260px]" />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    lat: number
    lng: number
    radiusKm: number
  }>(),
  { radiusKm: 20 }
)

const mapEl = ref<HTMLDivElement | null>(null)
let map: any = null
let circle: any = null
let L: any = null

const isValid = computed(() => props.lat && props.lng && !Number.isNaN(props.lat) && !Number.isNaN(props.lng))

async function initMap() {
  if (!mapEl.value || typeof window === 'undefined' || !isValid.value) return
  L = (await import('leaflet')).default
  const lat = Number(props.lat)
  const lng = Number(props.lng)
  map = L.map(mapEl.value).setView([lat, lng], 10)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
  }).addTo(map)
  const radiusMeters = (props.radiusKm || 20) * 1000
  circle = L.circle([lat, lng], {
    radius: radiusMeters,
    color: 'var(--color-primary-500)',
    fillColor: 'var(--color-primary-400)',
    fillOpacity: 0.25,
    weight: 2,
  }).addTo(map)
}

function updateCircle() {
  if (!map || !circle || !L || !isValid.value) return
  const lat = Number(props.lat)
  const lng = Number(props.lng)
  circle.setRadius((props.radiusKm || 20) * 1000)
  circle.setLatLng([lat, lng])
  map.setView([lat, lng], map.getZoom())
}

onMounted(async () => {
  await initMap()
})

watch(
  () => [props.lat, props.lng, props.radiusKm],
  () => {
    if (map && circle) updateCircle()
    else if (isValid.value && mapEl.value && !map) initMap()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
    circle = null
  }
})
</script>
