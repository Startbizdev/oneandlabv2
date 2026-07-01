import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { fetchMobileAppVersionPolicy } from '../api/app-version.service';
import {
  evaluateAppUpdateRequirement,
  type AppUpdateRequirement,
  type AppUpdateState,
} from '../utils/app-update-policy';

const DISMISS_KEY_PREFIX = 'app_update_optional_dismissed:';

function shouldCheckForUpdate(): boolean {
  if (__DEV__) return false;
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

async function readOptionalDismissed(version: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(`${DISMISS_KEY_PREFIX}${version}`);
    return value === '1';
  } catch {
    return false;
  }
}

export async function dismissOptionalAppUpdate(version: string): Promise<void> {
  await AsyncStorage.setItem(`${DISMISS_KEY_PREFIX}${version}`, '1');
}

export function useAppUpdateGate() {
  const [updateState, setUpdateState] = useState<AppUpdateState | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    if (!shouldCheckForUpdate()) return;

    setChecking(true);
    try {
      const policy = await fetchMobileAppVersionPolicy();
      const evaluated = evaluateAppUpdateRequirement(policy);

      if (evaluated.requirement === 'optional') {
        const dismissed = await readOptionalDismissed(evaluated.latestVersion);
        if (dismissed) {
          setUpdateState({ ...evaluated, requirement: 'none' });
          return;
        }
      }

      setUpdateState(evaluated);
    } catch {
      setUpdateState(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => sub.remove();
  }, [check]);

  const requirement: AppUpdateRequirement = updateState?.requirement ?? 'none';

  const dismissOptional = useCallback(async () => {
    if (!updateState || updateState.requirement !== 'optional') return;
    await dismissOptionalAppUpdate(updateState.latestVersion);
    setUpdateState({ ...updateState, requirement: 'none' });
  }, [updateState]);

  return {
    checking,
    requirement,
    updateState,
    recheck: check,
    dismissOptional,
  };
}
