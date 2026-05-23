import { Alert } from 'react-native';
import type { AuthUser } from '@oneandlab/shared-types';
import {
  enableBiometricLogin,
  getBiometricLabel,
  isBiometricEnabledForUser,
  isBiometricHardwareReady,
} from '@/lib/biometric-auth';

/** Propose d’activer Face ID / Touch ID après une connexion OTP réussie. */
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

  Alert.alert(
    `Activer ${label} ?`,
    'Reconnectez-vous en un instant, sans code email, pour ce compte sur cet appareil.',
    [
      { text: 'Plus tard', style: 'cancel', onPress: onDone },
      {
        text: 'Activer',
        onPress: () => {
          void (async () => {
            const result = await enableBiometricLogin(token, user);
            if (result.ok) {
              onDone();
              return;
            }
            if (!result.cancelled && result.message) {
              onError?.(result.message);
            }
            onDone();
          })();
        },
      },
    ],
  );
}
