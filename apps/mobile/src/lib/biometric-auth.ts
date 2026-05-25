import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { isDevBuild } from '@/config/env';
import type { AuthUser } from '@oneandlab/shared-types';

const ENABLED_KEY = 'biometric_login_enabled';
const USER_ID_KEY = 'biometric_login_user_id';
const TOKEN_KEY = 'biometric_auth_token';
const USER_KEY = 'biometric_auth_user';

/** Clés legacy (SecureStore + requireAuthentication) — migration one-shot. */
const LEGACY_SECURE_KEYS = [ENABLED_KEY, USER_ID_KEY, TOKEN_KEY, USER_KEY] as const;

const STORAGE_KEYS = [ENABLED_KEY, USER_ID_KEY, TOKEN_KEY, USER_KEY] as const;

let legacyMigrationDone = false;

export function normalizeBiometricUserId(userId: string | number | null | undefined): string {
  return String(userId ?? '').trim();
}

function compactUser(user: AuthUser): AuthUser {
  return {
    id: user.id,
    role: user.role,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

function parseStoredBiometricUser(userJson: string | null | undefined): AuthUser | null {
  if (!userJson) return null;
  try {
    const user = JSON.parse(userJson) as AuthUser;
    if (!user?.id || !user.role) return null;
    return user;
  } catch {
    return null;
  }
}

async function readStoredBiometricCredentials(): Promise<{
  token: string | null;
  user: AuthUser | null;
}> {
  try {
    const [[, token], [, userJson]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
    return { token: token || null, user: parseStoredBiometricUser(userJson) };
  } catch {
    return { token: null, user: null };
  }
}

function logBiometricLoginDev(reason: string, extra?: string): void {
  if (!isDevBuild()) return;
  console.warn(`[biometric-login] ${reason}${extra ? ` — ${extra}` : ''}`);
}

async function migrateLegacySecureStoreOnce(): Promise<void> {
  if (legacyMigrationDone) return;
  legacyMigrationDone = true;

  try {
    const legacyEnabled = await SecureStore.getItemAsync(ENABLED_KEY);
    if (legacyEnabled !== '1') {
      await Promise.all(
        LEGACY_SECURE_KEYS.map((k) => SecureStore.deleteItemAsync(k).catch(() => undefined)),
      );
      return;
    }

    const legacyUserId = await SecureStore.getItemAsync(USER_ID_KEY).catch(() => null);
    let legacyToken = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    let legacyUserJson = await SecureStore.getItemAsync(USER_KEY).catch(() => null);

    if (!legacyToken || !legacyUserJson) {
      const label = await getBiometricLabel();
      legacyToken =
        (await SecureStore.getItemAsync(TOKEN_KEY, {
          requireAuthentication: true,
          authenticationPrompt: `Confirmer ${label}`,
        }).catch(() => null)) ?? legacyToken;
      legacyUserJson =
        (await SecureStore.getItemAsync(USER_KEY, {
          requireAuthentication: true,
          authenticationPrompt: `Confirmer ${label}`,
        }).catch(() => null)) ?? legacyUserJson;
    }

    if (legacyUserId) {
      const entries: [string, string][] = [
        [ENABLED_KEY, '1'],
        [USER_ID_KEY, normalizeBiometricUserId(legacyUserId)],
      ];
      if (legacyToken && legacyUserJson) {
        entries.push([TOKEN_KEY, legacyToken], [USER_KEY, legacyUserJson]);
      }
      await AsyncStorage.multiSet(entries);
    }

    const saved = await AsyncStorage.getItem(ENABLED_KEY);
    if (saved === '1') {
      await Promise.all(
        LEGACY_SECURE_KEYS.map((k) => SecureStore.deleteItemAsync(k).catch(() => undefined)),
      );
    }
  } catch {
    /* conserver le legacy si la migration échoue */
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
  return normalizeBiometricUserId(storedUserId) === normalizeBiometricUserId(userId);
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

  const { token, user } = await readStoredBiometricCredentials();
  if (token && user) return true;

  if (await isBiometricLoginEnabled()) {
    logBiometricLoginDev('invalid_stored_credentials', 'cleanup');
    await disableBiometricLogin();
  }
  return false;
}

export type BiometricLoginResult =
  | { ok: true; token: string; user: AuthUser }
  | { ok: false; reason: 'cancelled' }
  | { ok: false; reason: 'auth_failed'; message?: string }
  | { ok: false; reason: 'missing_credentials' }
  | { ok: false; reason: 'not_available' };

export type BiometricEnableResult =
  | { ok: true }
  | { ok: false; cancelled?: boolean; message?: string };

type PromptBiometricResult =
  | { success: true }
  | { success: false; cancelled: boolean; message?: string };

/** Android Class 3 (empreinte) vs Class 2 (face 2D) — voir expo-local-authentication. */
async function resolveBiometricsSecurityLevel(): Promise<'weak' | 'strong'> {
  if (Platform.OS !== 'android') return 'strong';
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'strong';
  }
  return 'weak';
}

type PromptBiometricOptions = {
  /**
   * iOS : `disableDeviceFallback: true` → politique biométrie seule (Face ID / Touch ID),
   * sans bouton « Code appareil » — voir expo-local-authentication.
   */
  biometricsOnly?: boolean;
};

async function promptBiometric(
  message: string,
  options: PromptBiometricOptions = {},
): Promise<PromptBiometricResult> {
  const biometricsOnly = options.biometricsOnly ?? true;
  const biometricsSecurityLevel = await resolveBiometricsSecurityLevel();
  const auth = await LocalAuthentication.authenticateAsync({
    promptMessage: message,
    cancelLabel: 'Annuler',
    disableDeviceFallback: biometricsOnly,
    ...(Platform.OS === 'ios' && biometricsOnly ? { fallbackLabel: '' } : {}),
    ...(Platform.OS === 'android'
      ? {
          biometricsSecurityLevel,
          requireConfirmation: false,
          promptSubtitle: message,
        }
      : {}),
  });

  if (auth.success) return { success: true };

  const cancelled =
    auth.error === 'user_cancel' ||
    auth.error === 'app_cancel' ||
    auth.error === 'system_cancel';

  const messageByError: Record<string, string> = {
    not_enrolled: 'Biométrie non configurée sur cet appareil.',
    lockout: 'Trop de tentatives. Réessayez plus tard.',
    passcode_not_set: 'Configurez un code appareil dans les réglages.',
    unavailable: 'Biométrie indisponible sur cet appareil.',
    authentication_failed: 'Authentification refusée. Réessayez ou connectez-vous par email.',
  };

  return {
    success: false,
    cancelled,
    message: auth.error ? messageByError[auth.error] : undefined,
  };
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
  const confirmed = await promptBiometric(`Activer ${label}`, { biometricsOnly: true });
  if (!confirmed.success) {
    return {
      ok: false,
      cancelled: confirmed.cancelled,
      message: confirmed.cancelled ? undefined : confirmed.message ?? 'Authentification biométrique échouée.',
    };
  }

  try {
    await disableBiometricLogin();
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(compactUser(user))],
      [USER_ID_KEY, normalizeBiometricUserId(user.id)],
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

export async function loginWithBiometric(): Promise<BiometricLoginResult> {
  if (!(await canUseBiometricLogin())) {
    logBiometricLoginDev('not_available');
    return { ok: false, reason: 'not_available' };
  }

  const label = await getBiometricLabel();
  const confirmed = await promptBiometric(`Connexion ${label}`, { biometricsOnly: true });

  if (!confirmed.success) {
    if (confirmed.cancelled) {
      logBiometricLoginDev('cancelled');
      return { ok: false, reason: 'cancelled' };
    }
    logBiometricLoginDev('auth_failed', confirmed.message);
    return {
      ok: false,
      reason: 'auth_failed',
      message: confirmed.message ?? 'Authentification biométrique échouée.',
    };
  }

  const { token, user } = await readStoredBiometricCredentials();
  if (!token || !user) {
    logBiometricLoginDev('missing_credentials');
    await disableBiometricLogin();
    return { ok: false, reason: 'missing_credentials' };
  }

  return { ok: true, token, user };
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
