import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { getAppColors } from '@/theme/colors';
import { colors, radius } from '@/theme';

interface Props {
  lat: number;
  lng: number;
  radiusKm: number;
  height?: number;
}

/** Zoom Leaflet stable : contexte autour du cercle sans serrer au maximum (évite fitBounds trop zoomé). */
function zoomForRadiusKm(km: number): number {
  const r = Math.max(5, km);
  if (r <= 12) return 11;
  if (r <= 25) return 10;
  if (r <= 45) return 9;
  if (r <= 70) return 8;
  return 7;
}

function buildMapHtml(lat: number, lng: number, radiusKm: number, primary: string, primaryMid: string): string {
  const r = Math.max(1, radiusKm) * 1000;
  const zoom = zoomForRadiusKm(radiusKm);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var lat = ${lat};
    var lng = ${lng};
    var radiusM = ${r};
    var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([lat, lng], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    L.circle([lat, lng], {
      radius: radiusM,
      color: '${primary}',
      fillColor: '${primaryMid}',
      fillOpacity: 0.25,
      weight: 2
    }).addTo(map);
    L.circleMarker([lat, lng], {
      radius: 6,
      color: '#fff',
      fillColor: '${primary}',
      fillOpacity: 1,
      weight: 2
    }).addTo(map);
    /* Pas de fitBounds : la vue reste lisible avec du contexte autour de la zone. */
  </script>
</body>
</html>`;
}

export function CoverageMapLive({ lat, lng, radiusKm, height = 260 }: Props) {
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  const html = useMemo(() => {
    const c = getAppColors();
    return buildMapHtml(lat, lng, radiusKm, c.primary, c.primaryMid);
  }, [colorblindType, lat, lng, radiusKm]);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
