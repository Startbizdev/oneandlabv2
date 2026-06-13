import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Eye, Smartphone, Type } from 'lucide-react-native';
import { ProfileToggleRow } from '@/features/profile/components/ProfileToggleRow';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import {
  getPushPermissionStatus,
  obtainExpoPushToken,
  openNotificationSettings,
  registerPushTokenWithBackend,
  unregisterPushTokenWithBackend,
} from '@/features/notifications/services/push-token.service';
import { useToast } from '@/providers/ToastProvider';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import {
  COLORBLIND_TYPE_OPTIONS,
  type ActiveColorblindType,
} from '@/theme/colorblind-types';
import { TEXT_SCALE_OPTIONS, type TextScale } from '@/theme/text-scale';
import { elevation, radius, spacing } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { fontFamily, fontSize } from '@/theme/typography';

export function AppSettingsScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_settings_screens_AppSettingsScreen_tsx_AppSettingsScreen_styles');

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

  const [pushBusy, setPushBusy] = useState(false);
  const [colorblindBusy, setColorblindBusy] = useState(false);

  const isExpoGo = Constants.appOwnership === 'expo';
  const pushHint = isExpoGo
    ? 'Notifications push complètes avec un build de développement'
    : pushEnabled
      ? 'Alertes Cary sur cet appareil'
      : 'Notifications push désactivées';

  const onPushToggle = async (next: boolean) => {
    setPushBusy(true);
    try {
      if (next) {
        setPushEnabled(true);
        if (!Device.isDevice) {
          toast('Appareil requis', {
            message: 'Les notifications push ne fonctionnent pas sur simulateur.',
            type: 'info',
          });
          return;
        }
        const status = await getPushPermissionStatus();
        if (status === 'denied') {
          toast('Autorisation refusée', {
            message: 'Activez les notifications dans les réglages de l’appareil.',
            type: 'info',
          });
          openNotificationSettings();
          return;
        }
        const token = await obtainExpoPushToken();
        if (!token) {
          toast('Activation impossible', {
            message: isExpoGo
              ? 'Utilisez un build de développement pour les notifications push.'
              : 'Permission refusée ou configuration manquante.',
            type: 'error',
          });
          setPushEnabled(false);
          return;
        }
        if (!isExpoGo) {
          await registerPushTokenWithBackend(token);
        }
        setExpoPushToken(token);
        toast('Notifications activées', { type: 'success' });
        return;
      }

      setPushEnabled(false);
      if (expoPushToken && !isExpoGo) {
        await unregisterPushTokenWithBackend(expoPushToken);
      }
      setExpoPushToken(null);
      toast('Notifications désactivées', { type: 'info' });
    } catch (err) {
      toast('Erreur', {
        message: err instanceof Error ? err.message : 'Réessayez plus tard.',
        type: 'error',
      });
    } finally {
      setPushBusy(false);
    }
  };

  const onColorblindToggle = useCallback(
    (next: boolean) => {
      if (next === colorblindMode) return;
      setColorblindBusy(true);
      setColorblindMode(next);
      toast(next ? 'Couleurs accessibles activées' : 'Couleurs standard restaurées', {
        message: next
          ? 'L’interface se met à jour dans toute l’application.'
          : 'La palette Cary d’origine est rétablie.',
        type: 'info',
      });
      setColorblindBusy(false);
    },
    [colorblindMode, setColorblindMode, toast],
  );

  const onTypeSelect = useCallback(
    (type: ActiveColorblindType) => {
      if (type === colorblindType) return;
      setColorblindBusy(true);
      setColorblindType(type);
      const label = COLORBLIND_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
      toast(`Profil ${label}`, {
        message: 'Palette adaptée appliquée.',
        type: 'info',
      });
      setColorblindBusy(false);
    },
    [colorblindType, setColorblindType, toast],
  );

  const onTextScaleSelect = useCallback(
    (scale: TextScale) => {
      if (scale === textScale) return;
      setTextScale(scale);
      toast(scale === 'large' ? 'Texte agrandi activé' : 'Taille de texte standard', {
        message: 'L’interface se met à jour dans toute l’application.',
        type: 'info',
      });
    },
    [textScale, setTextScale, toast],
  );

  return (
    <ProfileSubScreenLayout hideSave>
      <View style={[previewStyles(c).card, elevation.xs]}>
        <Cluster
          gap={spacing[3]}
          style={styles.cardHeader}
          leading={
            <View style={previewStyles(c).iconWrap}>
              <Smartphone size={20} color={c.primary} strokeWidth={2} />
            </View>
          }
        >
          <Text style={previewStyles(c).cardTitle}>Application</Text>
        </Cluster>

        <ProfileToggleRow
          label="Notifications push"
          hint={pushHint}
          value={pushEnabled}
          busy={pushBusy}
          onValueChange={(v) => void onPushToggle(v)}
        />

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        <View style={styles.typeBlock}>
          <Row gap={spacing[2]} align="center">
            <Type size={18} color={c.primary} strokeWidth={2} />
            <Text style={[styles.typeLabel, { color: c.textSecondary }]}>Taille du texte</Text>
          </Row>
          <View style={styles.typeRow}>
            {TEXT_SCALE_OPTIONS.map((opt) => {
              const active = textScale === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => onTextScaleSelect(opt.value)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: active ? c.primaryLight : c.surfaceAlt,
                      borderColor: active ? c.primary : c.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipTitle,
                      { color: active ? c.primaryDark : c.textPrimary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={[styles.typeChipHint, { color: c.textTertiary }]}>
                    {opt.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        <ProfileToggleRow
          label="Couleurs accessibles"
          hint="Adapte les teintes de l’app si certaines couleurs se ressemblent"
          value={colorblindMode}
          busy={colorblindBusy}
          onValueChange={(v) => void onColorblindToggle(v)}
        />

        {colorblindMode ? (
          <View style={styles.typeBlock}>
            <Text style={[styles.typeLabel, { color: c.textSecondary }]}>
              Quelles couleurs confondez-vous le plus ?
            </Text>
            <View style={styles.typeRow}>
              {COLORBLIND_TYPE_OPTIONS.map((opt) => {
                const active = colorblindType === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => onTypeSelect(opt.value)}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: active ? c.primaryLight : c.surfaceAlt,
                        borderColor: active ? c.primary : c.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipTitle,
                        { color: active ? c.primaryDark : c.textPrimary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={[styles.typeChipHint, { color: c.textTertiary }]}>
                      {opt.hint}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <Row wrap gap={spacing[2]} style={previewStyles(c).swatchRow}>
          <View style={[previewStyles(c).swatch, { backgroundColor: c.successLight }]}>
            <Text style={[previewStyles(c).swatchLabel, { color: c.success }]}>Succès</Text>
            <Text style={[previewStyles(c).swatchValue, { color: c.success }]}>●</Text>
          </View>
          <View style={[previewStyles(c).swatch, { backgroundColor: c.errorLight }]}>
            <Text style={[previewStyles(c).swatchLabel, { color: c.error }]}>Erreur</Text>
            <Text style={[previewStyles(c).swatchValue, { color: c.error }]}>●</Text>
          </View>
          <View style={[previewStyles(c).swatch, { backgroundColor: c.warningLight }]}>
            <Text style={[previewStyles(c).swatchLabel, { color: c.warning }]}>Alerte</Text>
            <Text style={[previewStyles(c).swatchValue, { color: c.warning }]}>●</Text>
          </View>
          <View style={[previewStyles(c).swatch, { backgroundColor: c.primaryLight }]}>
            <Text style={[previewStyles(c).swatchLabel, { color: c.primary }]}>Primaire</Text>
            <Text style={[previewStyles(c).swatchValue, { color: c.primary }]}>●</Text>
          </View>
        </Row>
      </View>

      <Cluster
        gap={spacing[3]}
        style={[styles.infoCard, elevation.xs, { backgroundColor: c.surfaceSubtle }]}
        leading={<Eye size={18} color={c.textSecondary} strokeWidth={2} />}
      >
        <Text style={[styles.infoText, { color: c.textSecondary }]}>
          Cary ajuste les couleurs des statuts, badges et boutons pour les rendre plus faciles à
          lire. Chaque statut reste aussi décrit par un libellé texte — la couleur n’est qu’un
          complément visuel.
        </Text>
      </Cluster>

      {Platform.OS === 'ios' && pushEnabled ? (
        <Text
          style={[styles.link, { color: c.textLink }]}
          onPress={() => void Linking.openSettings()}
          accessibilityRole="link"
        >
          Ouvrir les réglages iOS des notifications
        </Text>
      ) : null}
    </ProfileSubScreenLayout>
  );
}

function previewStyles(c: ReturnType<typeof useAppColors>) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing[4],
      gap: spacing[1],
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      backgroundColor: c.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    cardTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
    },
    swatchRow: {
      marginTop: spacing[2],
    },
    swatch: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.md,
      minWidth: 88,
    },
    swatchLabel: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      marginBottom: 4,
    },
    swatchValue: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xs,
    },
  };
}

function buildStyles(c: AppColors) {
  return {
  cardHeader: {
    marginBottom: spacing[2],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing[2],
  },
  typeBlock: {
    gap: spacing[2],
    marginTop: spacing[2],
  },
  typeLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
  typeRow: {
    gap: spacing[2],
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: 2,
  },
  typeChipTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  typeChipHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.4,
  },
  infoCard: {
    borderRadius: radius.lg,
    padding: spacing[4],
    marginTop: spacing[4],
  },
  infoText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  link: {
    marginTop: spacing[4],
    textAlign: 'center' as const,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
};
}
