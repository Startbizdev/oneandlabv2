<template>
  <div class="map-wrapper relative" :style="{ height: height, width: '100%' }">
    <div :id="mapId" class="map-container" :style="{ height: height, width: '100%' }"></div>
    
    <!-- Instructions simples -->
    <div v-if="isDrawing" class="drawing-instructions">
      <div class="instruction-content">
        <p v-if="!isEditing" class="instruction-text">
          <UIcon name="i-lucide-circle" class="w-4 h-4" />
          Cliquez sur la carte pour ajouter des points
        </p>
        <template v-else>
          <p class="instruction-text">
            <UIcon name="i-lucide-move" class="w-4 h-4" />
            Glissez les points pour les déplacer
          </p>
          <p class="instruction-text">
            <UIcon name="i-lucide-plus" class="w-4 h-4" />
            Cliquez sur une ligne pour ajouter un point
          </p>
          <p class="instruction-text">
            <UIcon name="i-lucide-trash-2" class="w-4 h-4" />
            Double-cliquez sur un point pour le supprimer
          </p>
        </template>
        <p v-if="points.length >= 3 && !isEditing" class="instruction-text instruction-text-success">
          <UIcon name="i-lucide-check-circle-2" class="w-4 h-4" />
          Cliquez sur le point vert pour fermer votre zone
        </p>
      </div>
    </div>

    <!-- Toolbar simplifiée -->
    <div class="map-toolbar">
      <button
        v-if="!isDrawing && points.length === 0"
        @click="startDrawing"
        class="toolbar-btn toolbar-btn-primary"
        title="Commencer à dessiner votre zone"
      >
        <UIcon name="i-lucide-map-pin" class="w-5 h-5" />
        <span>Dessiner ma zone</span>
      </button>
      
      <template v-else-if="isDrawing">
        <button
          v-if="points.length >= 3"
          @click="finishPolygon"
          class="toolbar-btn toolbar-btn-success"
          title="Terminer le dessin"
        >
          <UIcon name="i-lucide-check" class="w-5 h-5" />
          <span>Terminer</span>
        </button>
        <button
          @click="cancelDrawing"
          class="toolbar-btn toolbar-btn-secondary"
          title="Annuler"
        >
          <UIcon name="i-lucide-x" class="w-5 h-5" />
          <span>Annuler</span>
        </button>
      </template>
      
      <button
        v-if="!isDrawing && points.length > 0"
        @click="startDrawing"
        class="toolbar-btn toolbar-btn-secondary"
        title="Modifier la zone"
      >
        <UIcon name="i-lucide-edit" class="w-5 h-5" />
        <span>Modifier</span>
      </button>
      
      <button
        v-if="!isDrawing && points.length > 0"
        @click="clearPolygon"
        class="toolbar-btn toolbar-btn-danger"
        title="Supprimer la zone"
      >
        <UIcon name="i-lucide-trash-2" class="w-5 h-5" />
        <span>Supprimer</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  center?: [number, number];
  zoom?: number;
  height?: string;
  initialPolygon?: Array<[number, number]>;
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  center: () => [48.8566, 2.3522], // Paris par défaut
  zoom: 13,
  height: '500px',
  initialPolygon: () => [],
  editable: true,
});

const emit = defineEmits<{
  polygonChange: [coordinates: Array<[number, number]>];
}>();

const mapId = ref(`map-polygon-${Math.random().toString(36).substr(2, 9)}`);
let map: any = null;
let L: any = null;
let polygonLayer: any = null;
let polylineLayer: any = null; // Pour le tracé en temps réel
let markersLayer: any = null;

const isDrawing = ref(false);
const isEditing = ref(false);
const points = ref<Array<[number, number]>>([]);
const markers: any[] = []; // Tous les marqueurs pour pouvoir les modifier
let firstMarker: any = null; // Premier point pour fermer le polygone
let polygon: any = null; // Le polygone actuel

onMounted(async () => {
  await loadLeaflet();
  initMap();
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
  }
});

const loadLeaflet = async () => {
  if ((window as any).L) {
    L = (window as any).L;
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  link.crossOrigin = '';
  document.head.appendChild(link);

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

  map = L.map(mapId.value).setView(props.center, props.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  // Couches pour le dessin
  markersLayer = L.layerGroup().addTo(map);
  polylineLayer = L.layerGroup().addTo(map);
  polygonLayer = L.layerGroup().addTo(map);

  // Si un polygone initial est fourni, l'afficher
  if (props.initialPolygon && props.initialPolygon.length > 0) {
    setTimeout(() => {
      loadPolygon(props.initialPolygon);
    }, 100);
  }
};

watch(() => props.initialPolygon, (newPolygon) => {
  if (newPolygon && newPolygon.length > 0 && map && L && !isDrawing.value) {
    loadPolygon(newPolygon);
  }
}, { deep: true });

watch(() => props.center, (newCenter) => {
  if (newCenter && map && L) {
    map.setView(newCenter, props.zoom);
  }
}, { deep: true });

const startDrawing = () => {
  if (!L || !map || !props.editable) return;
  
  // Si on a déjà un polygone, passer en mode édition
  if (points.value.length > 0) {
    startEditing();
    return;
  }
  
  clearPolygon();
  isDrawing.value = true;
  isEditing.value = false;
  points.value = [];
  markers.length = 0;
  
  // Écouter seulement les clics, pas le zoom
  map.on('click', addPoint);
  
  // Désactiver seulement le déplacement de la carte, garder le zoom actif
  map.dragging.disable();
  
  // Changer le curseur
  map.getContainer().style.cursor = 'crosshair';
};

const startEditing = () => {
  if (!L || !map || !props.editable || points.value.length < 3) return;
  
  isDrawing.value = true;
  isEditing.value = true;
  
  // Nettoyer le polygone existant pour le redessiner en temps réel
  if (polygon) {
    polygonLayer.removeLayer(polygon);
    polygon = null;
  }
  
  // Rendre tous les marqueurs déplaçables
  markers.forEach((marker, index) => {
    marker.draggable = true;
    marker.dragging.enable();
    
    // Écouter le déplacement
    marker.off('drag');
    marker.off('dragend');
    marker.on('drag', () => {
      updatePointFromMarker(index);
      updatePolygonLive();
    });
    marker.on('dragend', () => {
      updatePointFromMarker(index);
      updatePolygonLive();
      emit('polygonChange', points.value);
    });
    
    // Double-clic pour supprimer un point
    marker.off('dblclick');
    marker.on('dblclick', () => {
      if (points.value.length > 3) {
        removePoint(index);
      }
    });
  });
  
  // Permettre d'ajouter des points en cliquant sur les segments
  map.off('click');
  map.on('click', addPointOnSegment);
  
  map.dragging.disable();
  map.getContainer().style.cursor = 'crosshair';
  
  // Redessiner le polygone en mode édition
  updatePolygonLive();
};

const updatePointFromMarker = (index: number) => {
  if (!markers[index] || index >= points.value.length) return;
  const latlng = markers[index].getLatLng();
  points.value[index] = [latlng.lat, latlng.lng];
  
  // Si c'est le premier point, mettre à jour firstMarker
  if (index === 0 && firstMarker) {
    firstMarker = markers[0];
  }
};

const removePoint = (index: number) => {
  if (points.value.length <= 3) return;
  
  // Supprimer le marqueur
  if (markers[index]) {
    markersLayer.removeLayer(markers[index]);
    markers.splice(index, 1);
  }
  
  // Supprimer le point
  points.value.splice(index, 1);
  
  // Mettre à jour firstMarker si nécessaire
  if (index === 0 && markers.length > 0) {
    firstMarker = markers[0];
    updateMarkerIcons();
  }
  
  updatePolygonLive();
  emit('polygonChange', points.value);
};

const updateMarkerIcons = () => {
  markers.forEach((marker, index) => {
    const isFirst = index === 0;
    marker.setIcon(L.divIcon({
      className: isFirst ? 'polygon-marker polygon-marker-first' : 'polygon-marker',
      html: `<div class="marker-dot ${isFirst ? 'marker-dot-first' : ''}"></div>`,
      iconSize: isFirst ? [20, 20] : [16, 16],
      iconAnchor: isFirst ? [10, 10] : [8, 8],
    }));
    if (isFirst) {
      firstMarker = marker;
    }
  });
};

const addPointOnSegment = (e: any) => {
  if (!isDrawing.value || !L || !map) return;
  
  const clickLatlng = e.latlng;
  
  // Trouver le segment le plus proche du clic
  let minDistance = Infinity;
  let insertIndex = -1;
  const threshold = 50; // Distance en mètres
  
  for (let i = 0; i < points.value.length; i++) {
    const p1 = L.latLng(points.value[i][0], points.value[i][1]);
    const p2 = L.latLng(points.value[(i + 1) % points.value.length][0], points.value[(i + 1) % points.value.length][1]);
    
    // Distance du point de clic aux extrémités du segment
    const distToP1 = clickLatlng.distanceTo(p1);
    const distToP2 = clickLatlng.distanceTo(p2);
    const segmentLength = p1.distanceTo(p2);
    
    // Si le segment est trop court, ignorer
    if (segmentLength < 10) continue;
    
    // Calculer la distance perpendiculaire au segment (formule de distance point-ligne)
    // Utiliser la formule de Heron pour calculer l'aire du triangle
    const s = (distToP1 + distToP2 + segmentLength) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - distToP1) * (s - distToP2) * (s - segmentLength)));
    const perpendicularDistance = (2 * area) / segmentLength;
    
    // Vérifier si le point est proche du segment (pas trop près des extrémités)
    if (perpendicularDistance < threshold && distToP1 < segmentLength && distToP2 < segmentLength) {
      if (perpendicularDistance < minDistance) {
        minDistance = perpendicularDistance;
        insertIndex = i + 1;
      }
    }
  }
  
  // Si on est proche d'un segment, ajouter un point
  if (insertIndex > 0 && minDistance < threshold) {
    const newPoint: [number, number] = [clickLatlng.lat, clickLatlng.lng];
    points.value.splice(insertIndex, 0, newPoint);
    
    // Créer un nouveau marqueur
    const marker = L.marker(clickLatlng, {
      draggable: true,
      icon: L.divIcon({
        className: 'polygon-marker',
        html: '<div class="marker-dot"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    }).addTo(markersLayer);
    
    markers.splice(insertIndex, 0, marker);
    
    // Configurer le marqueur
    marker.on('drag', () => {
      updatePointFromMarker(insertIndex);
      updatePolygonLive();
    });
    marker.on('dragend', () => {
      updatePointFromMarker(insertIndex);
      updatePolygonLive();
      emit('polygonChange', points.value);
    });
    marker.on('dblclick', () => {
      if (points.value.length > 3) {
        removePoint(insertIndex);
      }
    });
    
    updateMarkerIcons();
    updatePolygonLive();
    emit('polygonChange', points.value);
  } else {
    // Sinon, vérifier si on clique sur le premier point pour fermer
    if (firstMarker && points.value.length >= 3) {
      const firstPoint = points.value[0];
      const distance = map.distance(clickLatlng, L.latLng(firstPoint[0], firstPoint[1]));
      
      if (distance < 50) {
        finishPolygon();
        return;
      }
    }
  }
};

const cancelDrawing = () => {
  if (!L || !map) return;
  
  // Si on était en mode édition, restaurer le polygone
  if (isEditing.value && points.value.length >= 3) {
    // Recharger le polygone depuis les points actuels
    const currentPoints = [...points.value];
    
    // Nettoyer les marqueurs et recréer le polygone
    markersLayer.clearLayers();
    polylineLayer.clearLayers();
    if (polygon) {
      polygonLayer.removeLayer(polygon);
    }
    
    // Recréer les marqueurs non déplaçables
    markers.length = 0;
    currentPoints.forEach((coord, index) => {
      const marker = L.marker([coord[0], coord[1]], {
        draggable: false,
        icon: L.divIcon({
          className: index === 0 ? 'polygon-marker polygon-marker-first' : 'polygon-marker',
          html: `<div class="marker-dot ${index === 0 ? 'marker-dot-first' : ''}"></div>`,
          iconSize: index === 0 ? [20, 20] : [16, 16],
          iconAnchor: index === 0 ? [10, 10] : [8, 8],
        }),
      }).addTo(markersLayer);
      
      markers.push(marker);
      if (index === 0) {
        firstMarker = marker;
      }
    });
    
    // Recréer le polygone
    const closedCoords = [...currentPoints, currentPoints[0]];
    polygon = L.polygon(closedCoords, {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.25,
      weight: 3,
    }).addTo(polygonLayer);
  } else {
    // Sinon, tout nettoyer
    points.value = [];
    markers.length = 0;
    firstMarker = null;
    polygon = null;
    markersLayer.clearLayers();
    polylineLayer.clearLayers();
    polygonLayer.clearLayers();
  }
  
  isDrawing.value = false;
  isEditing.value = false;
  
  map.off('click', addPoint);
  map.off('click', addPointOnSegment);
  map.dragging.enable();
  
  map.getContainer().style.cursor = '';
  
  // Désactiver le déplacement des marqueurs
  markers.forEach(marker => {
    marker.draggable = false;
    if (marker.dragging) {
      marker.dragging.disable();
    }
  });
  
  // Si on avait un polygone, ne pas émettre de changement (on annule juste l'édition)
  // Sinon, émettre un tableau vide
  if (points.value.length === 0) {
    emit('polygonChange', []);
  }
};

const addPoint = (e: any) => {
  if (!isDrawing.value || !L || !map) return;

  const latlng = e.latlng;
  const point: [number, number] = [latlng.lat, latlng.lng];
  
  // Vérifier si on clique sur le premier point pour fermer
  if (points.value.length > 0 && firstMarker) {
    const firstPoint = points.value[0];
    const distance = map.distance(latlng, L.latLng(firstPoint[0], firstPoint[1]));
    
    // Si on est proche du premier point (moins de 50m), fermer le polygone
    if (distance < 50 && points.value.length >= 3) {
      finishPolygon();
      return;
    }
  }
  
  points.value.push(point);
  
  // Créer un marqueur déplaçable
  const marker = L.marker(latlng, {
    draggable: isEditing.value,
    icon: L.divIcon({
      className: 'polygon-marker',
      html: '<div class="marker-dot"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    }),
  }).addTo(markersLayer);
  
  markers.push(marker);
  
  // Si en mode édition, configurer les événements
  if (isEditing.value) {
    const index = markers.length - 1;
    marker.on('drag', () => {
      updatePointFromMarker(index);
      updatePolygonLive();
    });
    marker.on('dragend', () => {
      updatePointFromMarker(index);
      updatePolygonLive();
      emit('polygonChange', points.value);
    });
    marker.on('dblclick', () => {
      if (points.value.length > 3) {
        removePoint(index);
      }
    });
  }
  
  // Premier point spécial (plus grand, pour indiquer qu'on peut cliquer dessus pour fermer)
  if (points.value.length === 1) {
    firstMarker = marker;
    marker.setIcon(L.divIcon({
      className: 'polygon-marker polygon-marker-first',
      html: '<div class="marker-dot marker-dot-first"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    }));
  }
  
  // Dessiner la ligne en temps réel dès le 2ème point
  updatePolyline();
};

const updatePolyline = () => {
  if (!L || !map || points.value.length < 2) return;
  
  // Nettoyer la ligne précédente
  polylineLayer.clearLayers();
  
  // Dessiner la ligne entre tous les points
  const polyline = L.polyline(points.value, {
    color: '#3b82f6',
    weight: 3,
    opacity: 0.7,
    dashArray: '10, 5',
  }).addTo(polylineLayer);
  
  // Si on a au moins 3 points, dessiner aussi le polygone temporaire
  if (points.value.length >= 3) {
    const closedCoords = [...points.value, points.value[0]];
    const tempPolygon = L.polygon(closedCoords, {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      weight: 2,
      dashArray: '5, 5',
    }).addTo(polylineLayer);
  }
};

const updatePolygonLive = () => {
  if (!L || !map || points.value.length < 3) return;
  
  // Nettoyer le polygone précédent
  if (polygon) {
    polygonLayer.removeLayer(polygon);
  }
  
  // Créer le polygone en temps réel
  const closedCoords = [...points.value, points.value[0]];
  polygon = L.polygon(closedCoords, {
    color: '#3b82f6',
    fillColor: '#3b82f6',
    fillOpacity: 0.25,
    weight: 3,
  }).addTo(polygonLayer);
  
  // Redessiner aussi les lignes
  updatePolyline();
};

const finishPolygon = () => {
  if (!L || !map || points.value.length < 3) return;
  
  isDrawing.value = false;
  isEditing.value = false;
  
  map.off('click', addPoint);
  map.off('click', addPointOnSegment);
  map.dragging.enable();
  
  map.getContainer().style.cursor = '';
  
  // Désactiver le déplacement des marqueurs
  markers.forEach(marker => {
    marker.draggable = false;
    marker.dragging.disable();
  });
  
  // Nettoyer les lignes temporaires
  polylineLayer.clearLayers();
  
  // Créer le polygone final si pas déjà créé
  if (!polygon) {
    const closedCoords = [...points.value, points.value[0]];
    polygon = L.polygon(closedCoords, {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.25,
      weight: 3,
    }).addTo(polygonLayer);
  }
  
  // Ajuster la vue pour afficher tout le polygone
  map.fitBounds(polygon.getBounds());
  
  // Émettre les coordonnées
  emit('polygonChange', points.value);
};

const clearPolygon = () => {
  if (!L || !map) return;
  
  isDrawing.value = false;
  isEditing.value = false;
  points.value = [];
  markers.length = 0;
  firstMarker = null;
  polygon = null;
  
  map.off('click', addPoint);
  map.off('click', addPointOnSegment);
  map.dragging.enable();
  
  map.getContainer().style.cursor = '';
  
  markersLayer.clearLayers();
  polylineLayer.clearLayers();
  polygonLayer.clearLayers();
  
  emit('polygonChange', []);
};

const loadPolygon = (coordinates: Array<[number, number]>) => {
  if (!L || !map || coordinates.length < 3) return;
  
  // Nettoyer d'abord
  clearPolygon();
  
  points.value = [...coordinates];
  
  // Créer les marqueurs (non déplaçables par défaut)
  coordinates.forEach((coord, index) => {
    const marker = L.marker([coord[0], coord[1]], {
      draggable: false,
      icon: L.divIcon({
        className: index === 0 ? 'polygon-marker polygon-marker-first' : 'polygon-marker',
        html: `<div class="marker-dot ${index === 0 ? 'marker-dot-first' : ''}"></div>`,
        iconSize: index === 0 ? [20, 20] : [16, 16],
        iconAnchor: index === 0 ? [10, 10] : [8, 8],
      }),
    }).addTo(markersLayer);
    
    markers.push(marker);
    
    if (index === 0) {
      firstMarker = marker;
    }
  });
  
  // Créer le polygone
  const closedCoords = [...coordinates, coordinates[0]];
  polygon = L.polygon(closedCoords, {
    color: '#3b82f6',
    fillColor: '#3b82f6',
    fillOpacity: 0.25,
    weight: 3,
  }).addTo(polygonLayer);
  
  // Ajuster la vue
  map.fitBounds(polygon.getBounds());
  
  emit('polygonChange', coordinates);
};

defineExpose({
  getPolygon: () => points.value,
  clearPolygon,
});
</script>

<style scoped>
.map-wrapper {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  background: white;
}

.map-container {
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.map-toolbar {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s ease;
  pointer-events: auto;
  backdrop-filter: blur(8px);
}

.toolbar-btn:hover {
  background: #f9fafb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}

.toolbar-btn:active {
  transform: translateY(0);
}

.toolbar-btn-primary {
  background: #3b82f6;
  color: white;
}

.toolbar-btn-primary:hover {
  background: #2563eb;
}

.toolbar-btn-success {
  background: #10b981;
  color: white;
}

.toolbar-btn-success:hover {
  background: #059669;
}

.toolbar-btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.toolbar-btn-secondary:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.toolbar-btn-danger {
  color: #ef4444;
}

.toolbar-btn-danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.drawing-instructions {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1000;
  pointer-events: none;
}

.instruction-content {
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 280px;
}

.instruction-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin: 0;
}

.instruction-text-success {
  color: #10b981;
}

:deep(.polygon-marker) {
  background: transparent;
  border: none;
}

:deep(.marker-dot) {
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(59, 130, 246, 0.3);
  transition: all 0.2s ease;
  cursor: pointer;
}

:deep(.marker-dot:hover) {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 4px rgba(59, 130, 246, 0.2);
}

:deep(.marker-dot-first) {
  width: 20px;
  height: 20px;
  background: #10b981;
  border: 4px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(16, 185, 129, 0.4);
  animation: pulse 2s infinite;
}

:deep(.marker-dot-first:hover) {
  transform: scale(1.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 5px rgba(16, 185, 129, 0.3);
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 6px rgba(16, 185, 129, 0.2);
  }
}

:deep(.leaflet-control) {
  background: transparent;
  border: none;
  box-shadow: none;
}

:deep(.leaflet-popup-content-wrapper) {
  border-radius: 8px;
}
</style>
