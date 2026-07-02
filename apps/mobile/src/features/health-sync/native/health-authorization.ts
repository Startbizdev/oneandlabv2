import { Platform } from 'react-native';
import type { HealthReadResult } from './read-health-metrics';

const IOS_READ_TYPES = [
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierHeight',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
] as const;

export type HealthAuthorizationResult = {
  ok: boolean;
  reason?: string;
};

/**
 * Affiche la feuille système Apple Santé / Health Connect sans lire les métriques.
 */
export async function requestDeviceHealthAuthorization(): Promise<HealthAuthorizationResult> {
  if (Platform.OS === 'ios') {
    return requestIosHealthAuthorization();
  }
  if (Platform.OS === 'android') {
    return requestAndroidHealthAuthorization();
  }
  return { ok: false, reason: 'Plateforme non supportée' };
}

async function requestIosHealthAuthorization(): Promise<HealthAuthorizationResult> {
  try {
    const {
      isHealthDataAvailableAsync,
      requestAuthorization,
    } = require('@kingstinct/react-native-healthkit') as {
      isHealthDataAvailableAsync?: () => Promise<boolean>;
      requestAuthorization?: (opts: { toRead: readonly string[] }) => Promise<unknown>;
    };

    if (!requestAuthorization) {
      return { ok: false, reason: 'HealthKit indisponible — utilisez un build Cary natif.' };
    }

    const available = isHealthDataAvailableAsync ? await isHealthDataAvailableAsync() : true;
    if (!available) {
      return { ok: false, reason: 'Apple Santé n’est pas disponible sur cet appareil.' };
    }

    // Apple n’indique pas quels types « read » sont refusés — on ouvre toujours la feuille.
    await requestAuthorization({ toRead: [...IOS_READ_TYPES] });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'Impossible d’ouvrir Apple Santé.',
    };
  }
}

async function requestAndroidHealthAuthorization(): Promise<HealthAuthorizationResult> {
  try {
    const HealthConnect = require('react-native-health-connect') as {
      initialize?: () => Promise<boolean>;
      requestPermission?: (permissions: Array<{ accessType: string; recordType: string }>) => Promise<unknown>;
    };

    if (!HealthConnect?.initialize) {
      return { ok: false, reason: 'Health Connect indisponible — utilisez un build Cary natif.' };
    }

    const ok = await HealthConnect.initialize();
    if (!ok) {
      return { ok: false, reason: 'Health Connect non disponible. Installez-le depuis le Play Store.' };
    }

    if (HealthConnect.requestPermission) {
      await HealthConnect.requestPermission([
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      ]);
    }

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'Impossible d’ouvrir Health Connect.',
    };
  }
}

export { IOS_READ_TYPES };
