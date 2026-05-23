import { useCallback, useLayoutEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { ScanFace } from 'lucide-react-native';
import { ProfileToggleRow } from '@/features/profile/components/ProfileToggleRow';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import {
  disableBiometricLogin,
  enableBiometricLogin,
  getBiometricSettingsForUser,
} from '@/lib/biometric-auth';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function openDeviceBiometricSettings() {
  if (Platform.OS === 'ios') {
    void Linking.openURL('App-Prefs:root=TOUCHID_PASSCODE').catch(() => Linking.openSettings());
    return;
  }
  void Linking.openSettings();
}

export function ProfileSecurityScreen() {
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
    navigation.setOptions({ title: label });
  }, [label, navigation]);

  const onToggle = async (next: boolean) => {
    if (!user?.id || !token || !hardwareReady) return;

    setBusy(true);
    try {
      if (next) {
        const result = await enableBiometricLogin(token, user);
        if (!result.ok) {
          if (!result.cancelled && result.message) {
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
      : 'Sans code email';

  if (!user?.id) {
    return (
      <ProfileSubScreenLayout hideSave>
        <Text style={styles.error}>Connectez-vous pour gérer la sécurité.</Text>
      </ProfileSubScreenLayout>
    );
  }

  const card = (
    <View style={[styles.card, elevation.xs]}>
      <View style={[styles.iconWrap, enabled && styles.iconWrapActive]}>
        <ScanFace size={22} color={colors.primary} strokeWidth={2} />
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
    </View>
  );

  return (
    <ProfileSubScreenLayout hideSave>
      {!hardwareReady ? (
        <Pressable onPress={openDeviceBiometricSettings}>{card}</Pressable>
      ) : (
        card
      )}
    </ProfileSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingLeft: spacing[3],
    paddingRight: spacing[1],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapActive: {
    backgroundColor: colors.surfaceSubtle,
  },
  rowWrap: {
    flex: 1,
    minWidth: 0,
  },
  error: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
