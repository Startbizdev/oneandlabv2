import { useCallback, useRef } from 'react';
import * as Location from 'expo-location';

export type TourOrigin = { lat: number; lng: number };

type Options = {
  /** `false` : n'affiche jamais la demande d'autorisation (utilise la position seulement si déjà autorisée). */
  requestPermission?: boolean;
};

/** Position de départ pour l'ordre de tournée, lue au moment de la requête (hors clé de cache). */
export function useTourOrigin({ requestPermission = true }: Options = {}) {
  const originRef = useRef<TourOrigin | null>(null);

  const getOrigin = useCallback(() => originRef.current, []);

  const refreshOrigin = useCallback(async (): Promise<boolean> => {
    try {
      const perm = requestPermission
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') return false;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      originRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      return true;
    } catch (error) {
      if (__DEV__) console.warn('[tour] position indisponible', error);
      return false;
    }
  }, [requestPermission]);

  return { getOrigin, refreshOrigin };
}
