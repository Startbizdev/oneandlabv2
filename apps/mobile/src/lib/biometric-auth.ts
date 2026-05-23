import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthUser } from '@oneandlab/shared-types';

const ENABLED_KEY = 'biometric_login_enabled';
const USER_ID_KEY = 'biometric_login_user_id';
const TOKEN_KEY = 'biometric_auth_token';
const USER_KEY = 'biometric_auth_user';

/** Clés legacy (SecureStore + requireAuthentication) — migration one-shot. */
const LEGACY_SECURE_KEYS = [ENABLED_KEY, USER_ID_KEY, TOKEN_KEY, USER_KEY] as const;

const STORAGE_KEYS = [ENABLED_KEY, USER_ID_KEY, TOKEN_KEY, USER_KEY] as const;

let legacyMigrationDone = false;

function compactUser(user: AuthUser): AuthUser {
  return {
    id: user.id,
    role: user.role,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

async function migrateLegacySecureStoreOnce(): Promise<void> {
  if (legacyMigrationDone) return;
  legacyMigrationDone = true;

  try {
    const legacyEnabled = await SecureStore.getItemAsync(ENABLED_KEY);
    if (legacyEnabled !== '1') {
      await Promise.all(LEGACY_SECURE_KEYS.map((k) => SecureStore.deleteItemAsync(k).catch(() => undefined)));
      return;
    }

    const [legacyToken, legacyUserJson, legacyUserId] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY).catch(() => null),
      SecureStore.getItemAsync(USER_KEY).catch(() => null),
      SecureStore.getItemAsync(USER_ID_KEY).catch(() => null),
    ]);

    if (legacyToken && legacyUserJson && legacyUserId) {
      await AsyncStorage.multiSet([
        [TOKEN_KEY, legacyToken],
        [USER_KEY, legacyUserJson],
        [USER_ID_KEY, legacyUserId],
        [ENABLED_KEY, '1'],
      ]);
    }

    await Promise.all(LEGACY_SECURE_KEYS.map((k) => SecureStore.deleteItemAsync(k).catch(() => undefined)));
  } catch {
    await Promise.all(LEGACY_SECURE_KEYS.map((k) => SecureStore.deleteItemAsync(k).catch(() => undefined)));
  }
}

export async function getBiometricLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === 'ios' ? 'Face ID' : 'Reconnaissance faciale';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Empreinte digitale';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }
  return 'Biométrie';
}

export async function isBiometricHardwareReady(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  await migrateLegacySecureStoreOnce();
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function getBiometricStoredUserId(): Promise<string | null> {
  await migrateLegacySecureStoreOnce();
  try {
    return (await AsyncStorage.getItem(USER_ID_KEY)) || null;
  } catch {
    return null;
  }
}

export async function isBiometricEnabledForUser(userId: string): Promise<boolean> {
  if (!(await isBiometricLoginEnabled())) return false;
  const storedUserId = await getBiometricStoredUserId();
  return storedUserId === userId;
}

export async function getBiometricSettingsForUser(userId: string): Promise<{
  hardwareReady: boolean;
  label: string;
  enabledForUser: boolean;
}> {
  await migrateLegacySecureStoreOnce();
  const [hardwareReady, label, enabledForUser] = await Promise.all([
    isBiometricHardwareReady(),
    getBiometricLabel(),
    isBiometricEnabledForUser(userId),
  ]);
  return { hardwareReady, label, enabledForUser };
}

export async function canUseBiometricLogin(): Promise<boolean> {
  if (!(await isBiometricLoginEnabled())) return false;
  if (!(await isBiometricHardwareReady())) return false;
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return Boolean(token);
  } catch {
    return false;
  }
}

export type BiometricEnableResult =
  | { ok: true }
  | { ok: false; cancelled?: boolean; message?: string };

async function promptBiometric(message: string): Promise<boolean> {
  const auth = await LocalAuthentication.authenticateAsync({
    promptMessage: message,
    cancelLabel: 'Annuler',
    disableDeviceFallback: false,
    ...(Platform.OS === 'android'
      ? { biometricsSecurityLevel: 'weak' as const, requireConfirmation: false }
      : {}),
  });
  return auth.success;
}

/**
 * Active la connexion biométrique pour ce compte sur cet appareil.
 * Le JWT est stocké dans AsyncStorage (comme la session principale) car SecureStore
 * iOS refuse souvent les payloads > ~2048 o. L’accès reste protégé par authenticateAsync.
 */
export async function enableBiometricLogin(
  token: string,
  user: AuthUser,
): Promise<BiometricEnableResult> {
  await migrateLegacySecureStoreOnce();

  if (!(await isBiometricHardwareReady())) {
    return { ok: false, message: 'Biométrie non configurée sur cet appareil.' };
  }

  const label = await getBiometricLabel();
  const confirmed = await promptBiometric(`Activer ${label}`);
  if (!confirmed) {
    return { ok: false, cancelled: true };
  }

  try {
    await disableBiometricLogin();
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(compactUser(user))],
      [USER_ID_KEY, user.id],
      [ENABLED_KEY, '1'],
    ]);

    const saved = await AsyncStorage.getItem(ENABLED_KEY);
    if (saved !== '1') {
      return { ok: false, message: 'Enregistrement impossible. Réessayez.' };
    }

    return { ok: true };
  } catch (e) {
    await disableBiometricLogin();
    return { ok: false, message: (e as Error).message || 'Enregistrement impossible.' };
  }
}

export async function loginWithBiometric(): Promise<{ token: string; user: AuthUser } | null> {
  if (!(await canUseBiometricLogin())) return null;

  const label = await getBiometricLabel();
  const confirmed = await promptBiometric(`Connexion ${label}`);
  if (!confirmed) return null;

  try {
    const [[, token], [, userJson]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
    if (!token || !userJson) return null;
    const user = JSON.parse(userJson) as AuthUser;
    if (!user?.id || !user.role) return null;
    return { token, user };
  } catch {
    return null;
  }
}

export async function disableBiometricLogin(): Promise<void> {
  await AsyncStorage.multiRemove([...STORAGE_KEYS]).catch(() => undefined);
  await Promise.all(LEGACY_SECURE_KEYS.map((k) => SecureStore.deleteItemAsync(k).catch(() => undefined)));
}

export async function refreshBiometricCredentials(token: string, user: AuthUser): Promise<void> {
  if (!(await isBiometricEnabledForUser(user.id))) return;
  try {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(compactUser(user))],
    ]);
  } catch {
    await disableBiometricLogin();
  }
}
