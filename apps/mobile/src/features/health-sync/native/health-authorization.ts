import { Linking, Platform } from 'react-native';
import type { HealthReadResult } from './read-health-metrics';

const IOS_READ_TYPES = [
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierHeight',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
] as const;

const ANDROID_READ_RECORD_TYPES = [
  'Weight',
  'HeartRate',
  'Steps',
  'Distance',
  'ActiveCaloriesBurned',
] as const;

export type HealthAuthorizationResult = {
  ok: boolean;
  reason?: string;
  /** Android : types Health Connect réellement accordés (lire un type refusé lève une erreur). */
  grantedRecordTypes?: readonly string[];
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
      requestPermission?: (
        permissions: Array<{ accessType: string; recordType: string }>,
      ) => Promise<Array<{ accessType: string; recordType: string }>>;
    };

    if (!HealthConnect?.initialize || !HealthConnect.requestPermission) {
      return { ok: false, reason: 'Health Connect indisponible — utilisez un build Cary natif.' };
    }

    const ok = await HealthConnect.initialize();
    if (!ok) {
      return { ok: false, reason: 'Health Connect non disponible. Installez-le depuis le Play Store.' };
    }

    const granted = await HealthConnect.requestPermission(
      ANDROID_READ_RECORD_TYPES.map((recordType) => ({ accessType: 'read', recordType })),
    );
    const grantedRecordTypes = granted
      .filter((permission) => permission.accessType === 'read')
      .map((permission) => permission.recordType);
    if (grantedRecordTypes.length === 0) {
      return { ok: false, reason: 'Accès refusé. Autorisez Cary dans Health Connect pour importer vos mesures.' };
    }

    return { ok: true, grantedRecordTypes };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'Impossible d’ouvrir Health Connect.',
    };
  }
}

export type DeviceHealthAccess = 'granted' | 'revoked' | 'unknown';

/** Accès en lecture encore accordé sur l’appareil. iOS ne révèle pas les refus de lecture : `unknown`. */
export async function readDeviceHealthAccess(): Promise<DeviceHealthAccess> {
  if (Platform.OS !== 'android') return 'unknown';
  const HealthConnect = require('react-native-health-connect') as {
    initialize?: () => Promise<boolean>;
    getGrantedPermissions?: () => Promise<Array<{ accessType: string; recordType: string }>>;
  };
  if (!HealthConnect?.initialize || !HealthConnect.getGrantedPermissions) return 'unknown';
  if (!(await HealthConnect.initialize())) return 'revoked';
  const readable = new Set<string>(ANDROID_READ_RECORD_TYPES);
  const granted = await HealthConnect.getGrantedPermissions();
  return granted.some((p) => p.accessType === 'read' && readable.has(p.recordType)) ? 'granted' : 'revoked';
}

/** Réglages Apple Santé / Health Connect : seul recours quand l’accès a déjà été refusé. */
export async function openDeviceHealthSettings(): Promise<void> {
  if (Platform.OS === 'ios') {
    await Linking.openURL('x-apple-health://');
    return;
  }
  const HealthConnect = require('react-native-health-connect') as {
    openHealthConnectSettings?: () => void;
  };
  if (!HealthConnect?.openHealthConnectSettings) {
    throw new Error('Health Connect indisponible — utilisez un build Cary natif.');
  }
  HealthConnect.openHealthConnectSettings();
}

export { IOS_READ_TYPES };
