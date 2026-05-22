import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '@oneandlab/shared-types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/** Migration one-shot depuis l’ancien SecureStore (limite 2048 o). */
async function migrateFromSecureStoreIfNeeded(): Promise<{
  token: string | null;
  user: AuthUser | null;
}> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const userJson = await SecureStore.getItemAsync(USER_KEY);
    if (!token && !userJson) return { token: null, user: null };
    let user: AuthUser | null = null;
    if (userJson) {
      try {
        user = JSON.parse(userJson) as AuthUser;
      } catch {
        user = null;
      }
    }
    if (token && user) await saveAuthSession(token, user);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => undefined);
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

/** JWT + profil peuvent dépasser 2048 o — SecureStore iOS refuse ; AsyncStorage OK. */
export async function saveAuthSession(token: string, user: AuthUser): Promise<void> {
  const compact: AuthUser = {
    id: user.id,
    role: user.role,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
  };
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(compact)],
  ]);
}

export async function loadAuthSession(): Promise<{ token: string | null; user: AuthUser | null }> {
  const [[, token], [, userJson]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  if (!token && !userJson) {
    return migrateFromSecureStoreIfNeeded();
  }
  let user: AuthUser | null = null;
  if (userJson) {
    try {
      user = JSON.parse(userJson) as AuthUser;
    } catch {
      await AsyncStorage.removeItem(USER_KEY);
    }
  }
  return { token, user };
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function saveAuthUser(user: AuthUser): Promise<void> {
  const compact: AuthUser = {
    id: user.id,
    role: user.role,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
  };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(compact));
}
