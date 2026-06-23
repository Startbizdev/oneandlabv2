import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_COLORBLIND_TYPE,
  type ColorblindType,
} from '@/theme/colorblind-types';
import { syncColorblindTheme } from '@/theme/colors';
import { syncTextScale, type TextScale } from '@/theme/text-scale';
import { clearThemedStyleCache } from '@/theme/themed-style-cache';
import type { TutorialRole } from '@oneandlab/onboarding';

export const APP_PREFERENCES_STORAGE_KEY = '@oneandlab/app-preferences';

export type OnboardingCompletionMap = Partial<Record<TutorialRole, boolean>>;

export interface AppPreferencesState {
  colorblindType: ColorblindType;
  /** Dérivé — conservé pour compatibilité des sélecteurs existants. */
  colorblindMode: boolean;
  textScale: TextScale;
  pushNotificationsEnabled: boolean;
  expoPushToken: string | null;
  onboardingCompleted: OnboardingCompletionMap;
  setColorblindType: (type: ColorblindType) => void;
  setColorblindMode: (enabled: boolean) => void;
  setTextScale: (scale: TextScale) => void;
  setPushNotificationsEnabled: (enabled: boolean) => void;
  setExpoPushToken: (token: string | null) => void;
  setOnboardingCompleted: (role: TutorialRole, completed: boolean) => void;
  isOnboardingCompleted: (role: TutorialRole) => boolean;
}

function applyColorblindType(type: ColorblindType) {
  syncColorblindTheme(type);
  clearThemedStyleCache();
}

function applyTextScale(scale: TextScale) {
  syncTextScale(scale);
  clearThemedStyleCache();
}

export const useAppPreferencesStore = create<AppPreferencesState>()(
  persist(
    (set, get) => ({
      colorblindType: 'off',
      colorblindMode: false,
      textScale: 'normal',
      pushNotificationsEnabled: true,
      expoPushToken: null,
      onboardingCompleted: {},
      setColorblindType: (colorblindType) => {
        applyColorblindType(colorblindType);
        set({ colorblindType, colorblindMode: colorblindType !== 'off' });
      },
      setTextScale: (textScale) => {
        applyTextScale(textScale);
        set({ textScale });
      },
      setColorblindMode: (enabled) => {
        const current = get().colorblindType;
        const next: ColorblindType = enabled
          ? current === 'off'
            ? DEFAULT_COLORBLIND_TYPE
            : current
          : 'off';
        get().setColorblindType(next);
      },
      setPushNotificationsEnabled: (pushNotificationsEnabled) =>
        set({ pushNotificationsEnabled }),
      setExpoPushToken: (expoPushToken) => set({ expoPushToken }),
      setOnboardingCompleted: (role, completed) =>
        set((state) => ({
          onboardingCompleted: {
            ...state.onboardingCompleted,
            [role]: completed,
          },
        })),
      isOnboardingCompleted: (role) => Boolean(get().onboardingCompleted[role]),
    }),
    {
      name: APP_PREFERENCES_STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        colorblindType: state.colorblindType,
        colorblindMode: state.colorblindMode,
        textScale: state.textScale,
        pushNotificationsEnabled: state.pushNotificationsEnabled,
        expoPushToken: state.expoPushToken,
        onboardingCompleted: state.onboardingCompleted,
      }),
      migrate: (persisted, version) => {
        const state = persisted as Partial<AppPreferencesState>;
        if (version < 1) {
          if (state.colorblindMode && (!state.colorblindType || state.colorblindType === 'off')) {
            state.colorblindType = DEFAULT_COLORBLIND_TYPE;
          } else if (!state.colorblindType) {
            state.colorblindType = 'off';
          }
          state.colorblindMode = state.colorblindType !== 'off';
        }
        if (version < 2 && !state.textScale) {
          state.textScale = 'normal';
        }
        if (version < 3 && !state.onboardingCompleted) {
          state.onboardingCompleted = {};
        }
        return state as AppPreferencesState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyColorblindType(state.colorblindType);
          applyTextScale(state.textScale ?? 'normal');
        }
      },
    },
  ),
);

/** Lecture bootstrap avant le chargement d’expo-router. */
export async function readBootstrapAppPreferences(): Promise<{
  colorblindType: ColorblindType;
  colorblindMode: boolean;
  textScale: TextScale;
  pushNotificationsEnabled: boolean;
}> {
  try {
    const raw = await AsyncStorage.getItem(APP_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return {
        colorblindType: 'off',
        colorblindMode: false,
        textScale: 'normal',
        pushNotificationsEnabled: true,
      };
    }
    const parsed = JSON.parse(raw) as {
      state?: {
        colorblindType?: ColorblindType;
        colorblindMode?: boolean;
        textScale?: TextScale;
        pushNotificationsEnabled?: boolean;
      };
    };
    const type =
      parsed.state?.colorblindType ??
      (parsed.state?.colorblindMode ? DEFAULT_COLORBLIND_TYPE : 'off');
    return {
      colorblindType: type,
      colorblindMode: type !== 'off',
      textScale: parsed.state?.textScale ?? 'normal',
      pushNotificationsEnabled: parsed.state?.pushNotificationsEnabled !== false,
    };
  } catch {
    return {
      colorblindType: 'off',
      colorblindMode: false,
      textScale: 'normal',
      pushNotificationsEnabled: true,
    };
  }
}
