import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '@oneandlab/shared-types';

const ENABLED_KEY = 'biometric_login_enabled';
const USER_ID_KEY = 'biometric_login_user_id';
const TOKEN_KEY = 'biometric_auth_token';
const USER_KEY = 'biometric_auth_user';

const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Connexion à Cary',
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function compactUser(user: AuthUser): AuthUser {
  return {
    id: user.id,
    role: user.role,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

export async function getBiometricLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Touch ID';
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
  try {
    return (await SecureStore.getItemAsync(ENABLED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function getBiometricStoredUserId(): Promise<string | null> {
  try {
    return (await SecureStore.getItemAsync(USER_ID_KEY)) || null;
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
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return Boolean(token);
  } catch {
    return false;
  }
}

export async function enableBiometricLogin(token: string, user: AuthUser): Promise<boolean> {
  if (!(await isBiometricHardwareReady())) return false;

  const auth = await LocalAuthentication.authenticateAsync({
    promptMessage: `Activer ${await getBiometricLabel()}`,
    cancelLabel: 'Annuler',
    disableDeviceFallback: false,
  });
  if (!auth.success) return false;

  await SecureStore.setItemAsync(TOKEN_KEY, token, SECURE_OPTS);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(compactUser(user)), SECURE_OPTS);
  await SecureStore.setItemAsync(USER_ID_KEY, user.id);
  await SecureStore.setItemAsync(ENABLED_KEY, '1');
  return true;
}

export async function loginWithBiometric(): Promise<{ token: string; user: AuthUser } | null> {
  if (!(await canUseBiometricLogin())) return null;

  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY, SECURE_OPTS);
    const userJson = await SecureStore.getItemAsync(USER_KEY, SECURE_OPTS);
    if (!token || !userJson) return null;
    const user = JSON.parse(userJson) as AuthUser;
    if (!user?.id || !user.role) return null;
    return { token, user };
  } catch {
    return null;
  }
}

export async function disableBiometricLogin(): Promise<void> {
  await SecureStore.deleteItemAsync(ENABLED_KEY).catch(() => undefined);
  await SecureStore.deleteItemAsync(USER_ID_KEY).catch(() => undefined);
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
  await SecureStore.deleteItemAsync(USER_KEY).catch(() => undefined);
}

export async function refreshBiometricCredentials(token: string, user: AuthUser): Promise<void> {
  if (!(await isBiometricEnabledForUser(user.id))) return;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token, SECURE_OPTS);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(compactUser(user)), SECURE_OPTS);
  } catch {
    await disableBiometricLogin();
  }
}
