import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { getAppColors } from '@/theme/colors';
import { radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import {
  COVERAGE_MAP_TILE_ATTRIBUTION,
  COVERAGE_MAP_TILE_MAX_ZOOM,
  COVERAGE_MAP_TILE_SUBDOMAINS,
  COVERAGE_MAP_TILE_URL,
  COVERAGE_VERTEX_COUNT,
  ensureSixVertices,
  maxVertexDistanceKm,
  polygonAreaKm2,
  zoomForCoverageHalfSideKm,
  type CoveragePolygonPayload,
  type CoverageVertex,
} from '@oneandlab/shared-utils';

export interface CoverageSquareMapMessage {
  type: 'boundsChanged' | 'dragEnd' | 'ready';
  halfSideKm?: number;
  bounds?: CoveragePolygonPayload;
  vertices?: CoverageVertex[];
}

interface Props {
  lat: number;
  lng: number;
  halfSideKm: number;
  maxHalfSideKm: number;
  vertices?: CoverageVertex[] | null;
  height?: number;
  readOnly?: boolean;
  largeHandles?: boolean;
  showSummary?: boolean;
  showHint?: boolean;
  onHalfSideKmChange?: (km: number) => void;
  onBoundsChange?: (bounds: CoveragePolygonPayload) => void;
  onVerticesChange?: (vertices: CoverageVertex[]) => void;
  onDragEnd?: (halfSideKm: number, bounds: CoveragePolygonPayload, vertices: CoverageVertex[]) => void;
}

function buildInteractiveMapHtml(
  lat: number,
  lng: number,
  vertices: CoverageVertex[],
  maxHalfSideKm: number,
  primary: string,
  primaryMid: string,
  readOnly: boolean,
  largeHandles: boolean,
  mapZoom: number,
): string {
  const readOnlyFlag = readOnly ? 'true' : 'false';
  const handlePx = largeHandles ? 32 : 22;
  const vertsJson = JSON.stringify(vertices);
  const tileUrl = COVERAGE_MAP_TILE_URL;
  const tileAttr = COVERAGE_MAP_TILE_ATTRIBUTION.replace(/'/g, "\\'");
  const tileSub = COVERAGE_MAP_TILE_SUBDOMAINS;
  const tileMax = COVERAGE_MAP_TILE_MAX_ZOOM;
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
html,body,#map{margin:0;padding:0;width:100%;height:100%;touch-action:none;}
.handle{width:${handlePx}px;height:${handlePx}px;border-radius:999px;background:${primary};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);cursor:grab;touch-action:none;}
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var center = { lat: ${lat}, lng: ${lng} };
var maxHalf = ${maxHalfSideKm};
var minDist = 0.2;
var readOnly = ${readOnlyFlag};
var KM_PER_DEG_LAT = 111.32;
function kmPerDegLng(lat){ return KM_PER_DEG_LAT * Math.max(0.01, Math.abs(Math.cos(lat * Math.PI / 180))); }
function distKm(a,b){
  var dLat = (b.lat-a.lat)*KM_PER_DEG_LAT;
  var dLng = (b.lng-a.lng)*kmPerDegLng(a.lat);
  return Math.sqrt(dLat*dLat+dLng*dLng);
}
function bearing(from,to){
  var dLat = (to.lat-from.lat)*KM_PER_DEG_LAT;
  var dLng = (to.lng-from.lng)*kmPerDegLng(from.lat);
  return (Math.atan2(dLng,dLat)*180/Math.PI+360)%360;
}
function offset(c, km, deg){
  var rad = deg*Math.PI/180;
  return { lat: c.lat + (km*Math.cos(rad))/KM_PER_DEG_LAT, lng: c.lng + (km*Math.sin(rad))/kmPerDegLng(c.lat) };
}
function clampVertex(v){
  var d = distKm(center, v);
  var b = d < 1e-9 ? 0 : bearing(center, v);
  if (d < minDist) return offset(center, minDist, b);
  if (d > maxHalf) return offset(center, maxHalf, b);
  return { lat: v.lat, lng: v.lng };
}
function maxReach(vs){
  var m = 0;
  vs.forEach(function(v){ var d = distKm(center,v); if(d>m) m=d; });
  return m;
}
function toBounds(vs){
  var lats = vs.map(function(v){return v.lat;});
  var lngs = vs.map(function(v){return v.lng;});
  return {
    min_lat: Math.min.apply(null,lats), max_lat: Math.max.apply(null,lats),
    min_lng: Math.min.apply(null,lngs), max_lng: Math.max.apply(null,lngs),
    vertices: vs
  };
}
function post(type, vs){
  if(window.ReactNativeWebView){
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: type, halfSideKm: maxReach(vs), bounds: toBounds(vs), vertices: vs
    }));
  }
}
var vertices = ${vertsJson};
var map = L.map('map',{zoomControl:true,attributionControl:true}).setView([center.lat,center.lng],${mapZoom});
L.tileLayer('${tileUrl}',{
  maxZoom:${tileMax}, subdomains:'${tileSub}', attribution:'${tileAttr}'
}).addTo(map);
var poly = L.polygon(vertices.map(function(v){return [v.lat,v.lng];}),{
  color:'${primary}', fillColor:'${primaryMid}', fillOpacity:0.18, weight:2.5
}).addTo(map);
L.circleMarker([center.lat,center.lng],{radius:7,color:'#fff',fillColor:'${primary}',fillOpacity:1,weight:2}).addTo(map);
var markers = [];
function applyVerts(vs){
  vertices = vs;
  poly.setLatLngs(vs.map(function(v){return [v.lat,v.lng];}));
  markers.forEach(function(m,i){ if(vs[i]) m.setLatLng([vs[i].lat,vs[i].lng]); });
}
if(!readOnly){
  vertices.forEach(function(v, idx){
    var icon = L.divIcon({className:'', html:'<div class="handle"></div>', iconSize:[${handlePx},${handlePx}], iconAnchor:[${handlePx / 2},${handlePx / 2}]});
    var m = L.marker([v.lat,v.lng],{icon:icon, draggable:true, zIndexOffset:1000}).addTo(map);
    m.on('drag', function(){
      var c = clampVertex(m.getLatLng());
      m.setLatLng([c.lat,c.lng]);
      vertices[idx] = c;
      poly.setLatLngs(vertices.map(function(p){return [p.lat,p.lng];}));
      post('boundsChanged', vertices);
    });
    m.on('dragend', function(){
      var c = clampVertex(m.getLatLng());
      vertices[idx] = c;
      applyVerts(vertices);
      post('dragEnd', vertices);
    });
    markers.push(m);
  });
}
post('ready', vertices);
</script></body></html>`;
}

export function CoverageSquareMapLive({
  lat,
  lng,
  halfSideKm,
  maxHalfSideKm,
  vertices: verticesProp,
  height = 280,
  readOnly = false,
  largeHandles = false,
  showSummary = true,
  showHint = true,
  onHalfSideKmChange,
  onBoundsChange,
  onVerticesChange,
  onDragEnd,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'CoverageSquareMapLive');
  const sessionVertices = useRef<CoverageVertex[] | null>(null);
  const center = { lat, lng };
  const initialVertices = ensureSixVertices(center, verticesProp ?? null, halfSideKm);
  if (readOnly) {
    sessionVertices.current = initialVertices;
  }

  const html = useMemo(() => {
    const colors = getAppColors();
    const verts = readOnly
      ? ensureSixVertices(center, verticesProp ?? null, halfSideKm)
      : (sessionVertices.current ?? initialVertices);
    const mapZoom = zoomForCoverageHalfSideKm(maxVertexDistanceKm(center, verts));
    return buildInteractiveMapHtml(
      lat,
      lng,
      verts,
      maxHalfSideKm,
      colors.primary,
      colors.primaryMid,
      readOnly,
      largeHandles,
      mapZoom,
    );
  }, [lat, lng, maxHalfSideKm, readOnly, largeHandles, halfSideKm, verticesProp]);

  const displayVerts = verticesProp?.length === COVERAGE_VERTEX_COUNT ? verticesProp : initialVertices;
  const areaLabel = useMemo(() => Math.round(polygonAreaKm2(displayVerts)), [displayVerts]);
  const reachLabel = Math.round(maxVertexDistanceKm(center, displayVerts));

  return (
    <View style={styles.wrap}>
      <WebView
        source={{ html }}
        style={[styles.webview, { height }]}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data) as CoverageSquareMapMessage;
            if (data.vertices) {
              sessionVertices.current = data.vertices;
              onVerticesChange?.(data.vertices);
            }
            if (data.halfSideKm != null) onHalfSideKmChange?.(data.halfSideKm);
            if (data.bounds) onBoundsChange?.(data.bounds);
            if (data.type === 'dragEnd' && data.halfSideKm != null && data.bounds && data.vertices) {
              onDragEnd?.(data.halfSideKm, data.bounds, data.vertices);
            }
          } catch {
            /* ignore */
          }
        }}
      />
      {showSummary ? (
        <AppText style={styles.summary}>
          <AppText style={styles.summaryStrong}>{reachLabel} km</AppText>
          {' du centre au sommet le plus loin · ~'}
          {areaLabel}
          {' km²'}
        </AppText>
      ) : null}
      {!readOnly && showHint ? (
        <AppText style={styles.hint}>Glissez un poignet pour former votre zone</AppText>
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return StyleSheet.create({
    wrap: { gap: spacing[2] },
    webview: {
      width: '100%',
      borderRadius: radius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
    },
    summary: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    summaryStrong: {
      fontFamily: fontFamily.semiBold,
      color: c.primary,
    },
    hint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
  });
}
