import { useState } from 'react';
import { View } from 'react-native';
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
import { elevation, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
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
          ? 'Rappels de rendez-vous, messages et résultats sur cet appareil'
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
    if (next === colorblindMode) return;
    setColorblindMode(next);
    toast(next ? 'Couleurs accessibles activées' : 'Couleurs standard restaurées', {
      message: next
        ? 'L’interface se met à jour dans toute l’application.'
        : 'La palette Cary d’origine est rétablie.',
      type: 'info',
    });
  };

  const onTypeSelect = (type: ActiveColorblindType) => {
    if (type === colorblindType) return;
    setColorblindType(type);
    const label = COLORBLIND_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
    toast(`Profil ${label}`, { message: 'Palette adaptée appliquée.', type: 'info' });
  };

  const onTextScaleSelect = (scale: TextScale) => {
    if (scale === textScale) return;
    setTextScale(scale);
    toast(scale === 'large' ? 'Texte agrandi activé' : 'Taille de texte standard', {
      message: 'L’interface se met à jour dans toute l’application.',
      type: 'info',
    });
  };

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
            label: 'Ouvrir les réglages de l’appareil',
            description: 'Autorisation, sons et badges des notifications',
            onPress: openNotificationSettings,
            iconAccent: 'settings',
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
            description: 'Adapte les teintes de l’app si certaines couleurs se ressemblent',
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
        <SettingsChoiceGroup
          caption="Quelles couleurs confondez-vous le plus ?"
          options={COLORBLIND_CHOICES}
          selected={colorblindType}
          onSelect={onTypeSelect}
        />
      ) : null}

      <View style={[styles.previewCard, elevation.xs]}>
        <AppText style={styles.previewTitle}>Aperçu des couleurs de statut</AppText>
        <Row wrap gap={spacing[2]}>
          <View style={[styles.swatch, { backgroundColor: c.successLight }]}>
            <AppText style={[styles.swatchLabel, { color: c.success }]}>Succès</AppText>
          </View>
          <View style={[styles.swatch, { backgroundColor: c.errorLight }]}>
            <AppText style={[styles.swatchLabel, { color: c.error }]}>Erreur</AppText>
          </View>
          <View style={[styles.swatch, { backgroundColor: c.warningLight }]}>
            <AppText style={[styles.swatchLabel, { color: c.warning }]}>Alerte</AppText>
          </View>
          <View style={[styles.swatch, { backgroundColor: c.primaryLight }]}>
            <AppText style={[styles.swatchLabel, { color: c.primary }]}>Primaire</AppText>
          </View>
        </Row>
        <AppText style={styles.infoText}>
          Chaque statut reste aussi décrit par un libellé texte : la couleur n’est qu’un complément
          visuel.
        </AppText>
      </View>

      <SettingsSection
        title="À propos"
        items={[
          {
            icon: Info,
            label: 'Version de l’application',
            value: meta.buildNumber !== '—' ? `${meta.appVersion} (${meta.buildNumber})` : meta.appVersion,
            iconAccent: 'muted',
          },
        ]}
      />
    </ProfileSubScreenLayout>
  );
}

function buildStyles({ colors: c, fontSize, scale }: Theme) {
  return {
    previewCard: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[4],
      gap: spacing[3],
    },
    previewTitle: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    swatch: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.md,
      minWidth: 88,
    },
    swatchLabel: {
      ...font.semiBold,
      fontSize: fontSize.xs,
    },
    infoText: {
      ...font.regular,
      fontSize: fontSize.sm,
      lineHeight: scale(20),
      color: c.textSecondary,
    },
  };
}
