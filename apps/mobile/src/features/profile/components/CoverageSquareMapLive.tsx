import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { getAppColors } from '@/theme/colors';
import { radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import {
  halfSideKmToBounds,
  squareAreaKm2,
  type CoverageBounds,
} from '@oneandlab/shared-utils';

export interface CoverageSquareMapMessage {
  type: 'boundsChanged' | 'dragEnd' | 'ready';
  halfSideKm?: number;
  bounds?: CoverageBounds;
}

interface Props {
  lat: number;
  lng: number;
  halfSideKm: number;
  maxHalfSideKm: number;
  height?: number;
  readOnly?: boolean;
  onHalfSideKmChange?: (km: number) => void;
  onBoundsChange?: (bounds: CoverageBounds) => void;
  onDragEnd?: (halfSideKm: number, bounds: CoverageBounds) => void;
}

function buildInteractiveMapHtml(
  lat: number,
  lng: number,
  halfSideKm: number,
  maxHalfSideKm: number,
  primary: string,
  primaryMid: string,
  readOnly: boolean,
): string {
  const bounds = halfSideKmToBounds({ lat, lng }, halfSideKm);
  const readOnlyFlag = readOnly ? 'true' : 'false';
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
html,body,#map{margin:0;padding:0;width:100%;height:100%;touch-action:none;}
.handle{width:22px;height:22px;border-radius:5px;background:${primary};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:grab;}
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var center = { lat: ${lat}, lng: ${lng} };
var maxHalf = ${maxHalfSideKm};
var minHalf = 5;
var readOnly = ${readOnlyFlag};
var KM_PER_DEG_LAT = 111.32;
function kmPerDegLng(lat){ return KM_PER_DEG_LAT * Math.max(0.01, Math.abs(Math.cos(lat * Math.PI / 180))); }
function halfToBounds(h){
  var latD = h / KM_PER_DEG_LAT, lngD = h / kmPerDegLng(center.lat);
  return { min_lat: center.lat - latD, max_lat: center.lat + latD, min_lng: center.lng - lngD, max_lng: center.lng + lngD };
}
function boundsToHalf(b){
  var latH = ((b.max_lat - b.min_lat)/2)*KM_PER_DEG_LAT;
  var lngH = ((b.max_lng - b.min_lng)/2)*kmPerDegLng(center.lat);
  return Math.min(latH, lngH);
}
function resizeFromCorner(corner){
  var dLat = Math.abs(corner.lat - center.lat) * KM_PER_DEG_LAT;
  var dLng = Math.abs(corner.lng - center.lng) * kmPerDegLng(center.lat);
  var raw = Math.max(dLat, dLng);
  var half = Math.min(maxHalf, Math.max(minHalf, raw));
  return { half: half, bounds: halfToBounds(half) };
}
function corners(b){
  return [[b.max_lat,b.min_lng],[b.max_lat,b.max_lng],[b.min_lat,b.max_lng],[b.min_lat,b.min_lng]];
}
function post(type, half, bounds){
  if(window.ReactNativeWebView){
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, halfSideKm: half, bounds: bounds }));
  }
}
var map = L.map('map',{zoomControl:true}).setView([center.lat,center.lng],10);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
  maxZoom:19, attribution:'© OSM © CARTO'
}).addTo(map);
var bounds = halfToBounds(${halfSideKm});
var rect = L.rectangle([[bounds.min_lat,bounds.min_lng],[bounds.max_lat,bounds.max_lng]],{
  color:'${primary}', fillColor:'${primaryMid}', fillOpacity:0.22, weight:2
}).addTo(map);
L.circleMarker([center.lat,center.lng],{radius:7,color:'#fff',fillColor:'${primary}',fillOpacity:1,weight:2}).addTo(map);
var markers = [];
function applyBounds(b, fit){
  rect.setBounds([[b.min_lat,b.min_lng],[b.max_lat,b.max_lng]]);
  var cs = corners(b);
  markers.forEach(function(m,i){ m.setLatLng(cs[i]); });
  if(fit) map.fitBounds([[b.min_lat,b.min_lng],[b.max_lat,b.max_lng]],{padding:[20,20],maxZoom:12});
}
if(!readOnly){
  corners(bounds).forEach(function(c, idx){
    var icon = L.divIcon({className:'', html:'<div class="handle"></div>', iconSize:[22,22], iconAnchor:[11,11]});
    var m = L.marker(c,{icon:icon, draggable:true, zIndexOffset:1000}).addTo(map);
    m.on('drag', function(){
      var r = resizeFromCorner(m.getLatLng());
      rect.setBounds([[r.bounds.min_lat,r.bounds.min_lng],[r.bounds.max_lat,r.bounds.max_lng]]);
      var cs = corners(r.bounds);
      markers.forEach(function(mm,i){ if(i!==idx) mm.setLatLng(cs[i]); });
      post('boundsChanged', r.half, r.bounds);
    });
    m.on('dragend', function(){
      var r = resizeFromCorner(m.getLatLng());
      applyBounds(r.bounds);
      post('dragEnd', r.half, r.bounds);
    });
    markers.push(m);
  });
}
map.fitBounds([[bounds.min_lat,bounds.min_lng],[bounds.max_lat,bounds.max_lng]],{padding:[20,20],maxZoom:12});
post('ready', boundsToHalf(bounds), bounds);
</script></body></html>`;
}

export function CoverageSquareMapLive({
  lat,
  lng,
  halfSideKm,
  maxHalfSideKm,
  height = 280,
  readOnly = false,
  onHalfSideKmChange,
  onBoundsChange,
  onDragEnd,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'CoverageSquareMapLive');

  const html = useMemo(() => {
    const colors = getAppColors();
    return buildInteractiveMapHtml(
      lat,
      lng,
      halfSideKm,
      maxHalfSideKm,
      colors.primary,
      colors.primaryMid,
      readOnly,
    );
  }, [lat, lng, halfSideKm, maxHalfSideKm, readOnly]);

  const areaLabel = useMemo(() => Math.round(squareAreaKm2(halfSideKm)), [halfSideKm]);

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
            if (data.halfSideKm != null) onHalfSideKmChange?.(data.halfSideKm);
            if (data.bounds) onBoundsChange?.(data.bounds);
            if (data.type === 'dragEnd' && data.halfSideKm != null && data.bounds) {
              onDragEnd?.(data.halfSideKm, data.bounds);
            }
          } catch {
            /* ignore */
          }
        }}
      />
      <AppText style={styles.summary}>
        <AppText style={styles.summaryStrong}>{Math.round(halfSideKm)} km</AppText>
        {' du centre au bord · ~'}
        {areaLabel}
        {' km²'}
      </AppText>
      {!readOnly ? (
        <AppText style={styles.hint}>Glissez un coin pour ajuster votre zone</AppText>
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
