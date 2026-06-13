import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useLayoutEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { useFocusEffect, useNavigation } from 'expo-router';
import { ScanFace } from 'lucide-react-native';
import { PasswordManagementPanel } from '@/features/profile/components/PasswordManagementPanel';
import { ProfileToggleRow } from '@/features/profile/components/ProfileToggleRow';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { loadAuthSession } from '@/lib/auth-storage';
import {
  disableBiometricLogin,
  enableBiometricLogin,
  getBiometricSettingsForUser,
} from '@/lib/biometric-auth';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function openDeviceBiometricSettings() {
  if (Platform.OS === 'ios') {
    void Linking.openURL('App-Prefs:root=TOUCHID_PASSCODE').catch(() => Linking.openSettings());
    return;
  }
  void Linking.openSettings();
}

export function ProfileSecurityScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_profile_screens_ProfileSecurityScreen_tsx_styles');
  const navigation = useNavigation();
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

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Mot de passe et connexion' });
  }, [navigation]);

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

  const hint = !hardwareReady
    ? Platform.OS === 'ios'
      ? 'Configurer dans Réglages iOS'
      : 'Configurer dans les réglages'
      : enabled
      ? 'Actif sur cet appareil'
      : 'Reconnexion rapide sans code email';

  if (!user?.id) {
    return (
      <ProfileSubScreenLayout hideSave>
        <Text style={styles.error}>Connectez-vous pour gérer la sécurité.</Text>
      </ProfileSubScreenLayout>
    );
  }

  const card = (
    <Row gap={spacing[2]} align="center" style={[styles.card, elevation.xs]}>
      <View style={[styles.iconWrap, enabled && styles.iconWrapActive]}>
        <ScanFace size={22} color={c.primary} strokeWidth={2} />
      </View>
      <View style={styles.rowWrap}>
        <ProfileToggleRow
          label={label}
          hint={hint}
          value={enabled}
          busy={busy}
          disabled={!hardwareReady}
          highlightWhenOn={false}
          onValueChange={(v) => void onToggle(v)}
        />
      </View>
    </Row>
  );

  return (
    <ProfileSubScreenLayout hideSave>
      <View style={styles.stack}>
        {!hardwareReady ? (
          <Pressable onPress={openDeviceBiometricSettings}>{card}</Pressable>
        ) : (
          card
        )}
        <PasswordManagementPanel />
      </View>
    </ProfileSubScreenLayout>
  );
}

function buildStyles(c: AppColors) {
  return {
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    paddingLeft: spacing[3],
    paddingRight: spacing[1],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  iconWrapActive: {
    backgroundColor: c.surfaceSubtle,
  },
  rowWrap: {
    flex: 1,
    minWidth: 0,
  },
  error: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: c.textSecondary,
    textAlign: 'center' as const,
  },
  stack: {
    gap: spacing[4],
  },
};
}

