<template>
  <div :id="mapId" class="map-container" :style="{ height: height, width: '100%' }"></div>
</template>

<script setup lang="ts">
interface Props {
  center?: [number, number];
  zoom?: number;
  height?: string;
  markers?: Array<{
    lat: number;
    lng: number;
    popup?: string;
  }>;
  address?: string;
}

const props = withDefaults(defineProps<Props>(), {
  center: () => [48.8566, 2.3522], // Paris par défaut
  zoom: 13,
  height: '400px',
  markers: () => [],
  address: '',
});

const mapId = ref(`map-${Math.random().toString(36).substr(2, 9)}`);
let map: any = null;
let L: any = null;

onMounted(async () => {
  // Charger Leaflet dynamiquement
  await loadLeaflet();
  initMap();
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
  }
});

const loadLeaflet = async () => {
  // Vérifier si Leaflet est déjà chargé
  if ((window as any).L) {
    L = (window as any).L;
    return;
  }

  // Charger le CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  link.crossOrigin = '';
  document.head.appendChild(link);

  // Charger le JS
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      L = (window as any).L;
      resolve(L);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const initMap = () => {
  if (!L) return;

  // Initialiser la carte
  map = L.map(mapId.value).setView(props.center, props.zoom);

  // Ajouter le fond de carte OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  // Ajouter les marqueurs
  props.markers.forEach((marker) => {
    const m = L.marker([marker.lat, marker.lng]).addTo(map);
    if (marker.popup) {
      m.bindPopup(marker.popup);
    }
  });

  // Si une adresse est fournie, géocoder et centrer
  if (props.address) {
    geocodeAddress(props.address);
  }
};

const geocodeAddress = async (address: string) => {
  try {
    // Utiliser l'API Nominatim d'OpenStreetMap pour le géocodage
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      const { lat, lon } = data[0];
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lon);
      
      map.setView([latNum, lngNum], props.zoom);
      
      // Ajouter un marqueur pour l'adresse
      L.marker([latNum, lngNum])
        .addTo(map)
        .bindPopup(address)
        .openPopup();
    }
  } catch (error) {
    console.error('Erreur de géocodage:', error);
  }
};

// Exposer des méthodes pour contrôler la carte depuis l'extérieur
defineExpose({
  setView: (center: [number, number], zoom?: number) => {
    if (map) {
      map.setView(center, zoom || props.zoom);
    }
  },
  addMarker: (lat: number, lng: number, popup?: string) => {
    if (map && L) {
      const marker = L.marker([lat, lng]).addTo(map);
      if (popup) {
        marker.bindPopup(popup);
      }
      return marker;
    }
  },
});
</script>

<style scoped>
.map-container {
  border-radius: 8px;
  overflow: hidden;
}
</style>




