import { useCallback, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ScanFace } from 'lucide-react-native';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { PasswordManagementPanel } from '@/features/profile/components/PasswordManagementPanel';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { loadAuthSession } from '@/lib/auth-storage';
import {
  disableBiometricLogin,
  enableBiometricLogin,
  getBiometricSettingsForUser,
} from '@/lib/biometric-auth';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { AppText } from '@/theme';

function openDeviceBiometricSettings() {
  if (Platform.OS === 'ios') {
    void Linking.openURL('App-Prefs:root=TOUCHID_PASSCODE').catch(() => Linking.openSettings());
    return;
  }
  void Linking.openSettings();
}

export function ProfileSecurityScreen() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { show: toast } = useToast();

  const [label, setLabel] = useState('Face ID');
  const [enabled, setEnabled] = useState(false);
  const [hardwareReady, setHardwareReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const settings = await getBiometricSettingsForUser(user.id);
    setLabel(settings.label);
    setEnabled(settings.enabledForUser);
    setHardwareReady(settings.hardwareReady);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const onToggle = async (next: boolean) => {
    if (!user?.id || !hardwareReady) return;

    const sessionToken = token ?? (await loadAuthSession()).token;
    if (!sessionToken) {
      toast('Session expirée', {
        message: 'Reconnectez-vous pour activer la biométrie.',
        type: 'error',
      });
      return;
    }

    setBusy(true);
    try {
      if (next) {
        const result = await enableBiometricLogin(sessionToken, user);
        if (!result.ok) {
          if (result.message) {
            toast('Activation impossible', { message: result.message, type: 'error' });
          }
          await refresh();
          return;
        }
        await refresh();
        toast(`${label} activé`, { type: 'success' });
        return;
      }

      await disableBiometricLogin();
      await refresh();
      toast(`${label} désactivé`, { type: 'info' });
    } finally {
      setBusy(false);
    }
  };

  if (!user?.id) {
    return (
      <ProfileSubScreenLayout hideSave>
        <AppText variant="secondary">Connectez-vous pour gérer la sécurité.</AppText>
      </ProfileSubScreenLayout>
    );
  }

  return (
    <ProfileSubScreenLayout hideSave>
      <SettingsSection
        title="Connexion rapide"
        items={[
          {
            icon: ScanFace,
            label,
            description: hardwareReady
              ? 'Sans code e-mail sur cet appareil'
              : Platform.OS === 'ios'
                ? 'À configurer dans Réglages'
                : 'À configurer dans les réglages',
            onPress: hardwareReady ? undefined : openDeviceBiometricSettings,
            trailing: (
              <ToggleSwitch
                value={enabled}
                disabled={busy || !hardwareReady}
                onValueChange={(v) => void onToggle(v)}
                accessibilityLabel={label}
              />
            ),
          },
        ]}
      />
      <PasswordManagementPanel />
    </ProfileSubScreenLayout>
  );
}
