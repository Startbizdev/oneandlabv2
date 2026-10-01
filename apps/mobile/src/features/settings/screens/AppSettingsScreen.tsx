import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Bell, Eye, Info, Settings } from 'lucide-react-native';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { getAppMeta } from '@/features/help/utils/app-meta';
import {
  obtainExpoPushToken,
  openNotificationSettings,
  registerPushTokenWithBackend,
  unregisterPushTokenWithBackend,
} from '@/features/notifications/services/push-token.service';
import { useToast } from '@/providers/ToastProvider';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { COLORBLIND_TYPE_OPTIONS, type ActiveColorblindType } from '@/theme/colorblind-types';
import { TEXT_SCALE_OPTIONS, type TextScale } from '@/theme/text-scale';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { SettingsChoiceGroup } from '../components/SettingsChoiceGroup';
import { usePushPermissionStatus } from '../hooks/use-push-permission-status';

const COLORBLIND_CHOICES = COLORBLIND_TYPE_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
  description: o.hint,
}));

export function AppSettingsScreen() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const { show: toast } = useToast();
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  const colorblindMode = colorblindType !== 'off';
  const pushEnabled = useAppPreferencesStore((s) => s.pushNotificationsEnabled);
  const expoPushToken = useAppPreferencesStore((s) => s.expoPushToken);
  const setColorblindMode = useAppPreferencesStore((s) => s.setColorblindMode);
  const setColorblindType = useAppPreferencesStore((s) => s.setColorblindType);
  const setPushEnabled = useAppPreferencesStore((s) => s.setPushNotificationsEnabled);
  const setExpoPushToken = useAppPreferencesStore((s) => s.setExpoPushToken);
  const setTextScale = useAppPreferencesStore((s) => s.setTextScale);
  const textScale = useAppPreferencesStore((s) => s.textScale);

  const { status: osPermission, refresh: refreshPermission } = usePushPermissionStatus();
  const [pushBusy, setPushBusy] = useState(false);

  const isExpoGo = Constants.appOwnership === 'expo';
  const osDenied = osPermission === 'denied';
  const pushActive = pushEnabled && (osPermission === 'granted' || osPermission === null);
  const meta = getAppMeta();

  const pushHint = !Device.isDevice
    ? 'Indisponible sur simulateur'
    : osDenied
      ? 'Autorisation refusée dans les réglages de l’appareil'
      : isExpoGo
        ? 'Notifications push complètes avec un build de développement'
        : pushActive
          ? 'Rappels, messages et résultats sur cet appareil'
          : 'Désactivées sur cet appareil';

  const enablePush = async () => {
    if (!Device.isDevice) {
      toast('Appareil requis', {
        message: 'Les notifications push ne fonctionnent pas sur simulateur.',
        type: 'info',
      });
      return;
    }
    if (osDenied) {
      toast('Autorisation refusée', {
        message: 'Activez les notifications dans les réglages de l’appareil.',
        type: 'info',
      });
      openNotificationSettings();
      return;
    }
    const token = await obtainExpoPushToken();
    await refreshPermission();
    if (!token) {
      toast('Activation impossible', {
        message: isExpoGo
          ? 'Utilisez un build de développement pour les notifications push.'
          : 'Autorisation refusée ou configuration manquante.',
        type: 'error',
      });
      setPushEnabled(false);
      return;
    }
    if (!isExpoGo) {
      await registerPushTokenWithBackend(token);
    }
    setExpoPushToken(token);
    setPushEnabled(true);
    toast('Notifications activées', { type: 'success' });
  };

  const disablePush = async () => {
    setPushEnabled(false);
    if (expoPushToken && !isExpoGo) {
      await unregisterPushTokenWithBackend(expoPushToken);
    }
    setExpoPushToken(null);
    toast('Notifications désactivées', { type: 'info' });
  };

  const onPushToggle = async (next: boolean) => {
    setPushBusy(true);
    try {
      await (next ? enablePush() : disablePush());
    } catch (err) {
      toast('Erreur', {
        message: err instanceof Error ? err.message : 'Réessayez plus tard.',
        type: 'error',
      });
    } finally {
      setPushBusy(false);
    }
  };

  const onColorblindToggle = (next: boolean) => {
    if (next !== colorblindMode) setColorblindMode(next);
  };

  const onTypeSelect = (type: ActiveColorblindType) => {
    if (type !== colorblindType) setColorblindType(type);
  };

  const onTextScaleSelect = (scale: TextScale) => {
    if (scale !== textScale) setTextScale(scale);
  };

  const swatches = [
    { label: 'Succès', color: c.success, bg: c.successLight },
    { label: 'Erreur', color: c.error, bg: c.errorLight },
    { label: 'Alerte', color: c.warning, bg: c.warningLight },
    { label: 'Action', color: c.primary, bg: c.primaryLight },
  ];

  return (
    <ProfileSubScreenLayout hideSave>
      <SettingsSection
        title="Notifications"
        items={[
          {
            icon: Bell,
            label: 'Notifications push',
            description: pushHint,
            trailing: (
              <ToggleSwitch
                value={pushActive}
                disabled={pushBusy}
                onValueChange={(v) => void onPushToggle(v)}
                accessibilityLabel="Notifications push"
              />
            ),
          },
          {
            icon: Settings,
            label: 'Réglages de l’appareil',
            description: 'Autorisation, sons et badges',
            onPress: openNotificationSettings,
          },
        ]}
      />

      <SettingsChoiceGroup
        title="Affichage"
        caption="Taille du texte"
        options={TEXT_SCALE_OPTIONS}
        selected={textScale}
        onSelect={onTextScaleSelect}
      />

      <SettingsSection
        title="Accessibilité"
        items={[
          {
            icon: Eye,
            label: 'Couleurs accessibles',
            description: 'Pour distinguer les couleurs qui se ressemblent',
            trailing: (
              <ToggleSwitch
                value={colorblindMode}
                onValueChange={onColorblindToggle}
                accessibilityLabel="Couleurs accessibles"
              />
            ),
          },
        ]}
      />

      {colorblindMode ? (
        <>
          <SettingsChoiceGroup
            caption="Quelles couleurs confondez-vous le plus ?"
            options={COLORBLIND_CHOICES}
            selected={colorblindType}
            onSelect={onTypeSelect}
          />
          <View style={styles.preview} accessibilityLabel="Aperçu des couleurs de statut">
            <AppText variant="caption">Aperçu</AppText>
            <Row wrap gap={spacing[2]}>
              {swatches.map((s) => (
                <View key={s.label} style={[styles.swatch, { backgroundColor: s.bg }]}>
                  <AppText style={[styles.swatchLabel, { color: s.color }]}>{s.label}</AppText>
                </View>
              ))}
            </Row>
          </View>
        </>
      ) : null}

      <SettingsSection
        title="À propos"
        items={[
          {
            icon: Info,
            label: 'Version de l’application',
            value: meta.buildNumber !== '—' ? `${meta.appVersion} (${meta.buildNumber})` : meta.appVersion,
          },
        ]}
      />
    </ProfileSubScreenLayout>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    preview: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      padding: spacing[4],
      gap: spacing[2],
    },
    swatch: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.md,
    },
    swatchLabel: {
      ...font.semiBold,
      fontSize: fontSize.xs,
    },
  };
}
