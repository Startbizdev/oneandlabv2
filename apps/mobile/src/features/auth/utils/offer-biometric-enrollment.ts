import { create } from 'zustand';
import type { AuthUser } from '@oneandlab/shared-types';
import { isTutorialRole } from '@oneandlab/onboarding';
import {
  getBiometricLabel,
  isBiometricEnabledForUser,
  isBiometricHardwareReady,
} from '@/lib/biometric-auth';
import { useAppPreferencesStore } from '@/store/app-preferences-store';

export type BiometricOffer = {
  token: string;
  user: AuthUser;
  label: string;
  onDone: () => void;
  onError?: (message: string) => void;
};

/**
 * Proposition en attente, affichée par `BiometricEnrollmentOfferHost` (monté à la racine) :
 * l'écran appelant est remplacé par l'accueil du rôle dès que la session existe.
 */
export const useBiometricOfferStore = create<{
  offer: BiometricOffer | null;
  setOffer: (offer: BiometricOffer | null) => void;
}>((set) => ({
  offer: null,
  setOffer: (offer) => set({ offer }),
}));

/** Propose d’activer Face ID / Touch ID / l’empreinte après une connexion réussie. */
export async function offerBiometricEnrollment(
  token: string,
  user: AuthUser,
  onDone: () => void,
  onError?: (message: string) => void,
): Promise<void> {
  if (await isBiometricEnabledForUser(user.id)) {
    onDone();
    return;
  }
  if (!(await isBiometricHardwareReady())) {
    onDone();
    return;
  }

  const label = await getBiometricLabel();
  useBiometricOfferStore.getState().setOffer({ token, user, label, onDone, onError });
}

/**
 * Au premier lancement, la proposition est faite en fin d’onboarding (après l’explication push)
 * pour ne pas empiler les sollicitations à la connexion.
 */
export async function offerBiometricEnrollmentAfterLogin(
  token: string,
  user: AuthUser,
  onDone: () => void,
  onError?: (message: string) => void,
): Promise<void> {
  const role = user.role;
  if (isTutorialRole(role) && !useAppPreferencesStore.getState().isOnboardingCompleted(role)) {
    onDone();
    return;
  }
  await offerBiometricEnrollment(token, user, onDone, onError);
}
