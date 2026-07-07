import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { ActivityIndicator, Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Footprints, Heart, Scale, Sparkles } from 'lucide-react-native';
import { Row, Stack } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { radius, spacing, iconSize, AppText, useLayoutMetrics, responsiveValue } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { hexToRgba } from '@/theme/color-utils';
import { getHealthPlatformUiConfig } from '../utils/health-platform-config';

interface Props {
  syncing?: boolean;
  autoPrompting?: boolean;
  onConnect: () => void;
}

const VALUE_ITEMS = [
  { icon: Footprints, label: 'Pas & marche', desc: 'Objectif quotidien et tendances' },
  { icon: Heart, label: 'Fréquence cardiaque', desc: 'Suivi de votre rythme' },
  { icon: Scale, label: 'Poids', desc: 'Évolution dans le temps' },
  { icon: Sparkles, label: 'Assistant Cary', desc: 'Conseils personnalisés' },
] as const;

export function HealthConnectOnboarding({ syncing = false, autoPrompting = false, onConnect }: Props) {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useThemedStyles(buildStyles);
  const heroSubMaxWidth = responsiveValue(layout, { compact: 280, default: 300, wide: 340 });
  const platform = getHealthPlatformUiConfig();

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[hexToRgba(c.primary, 0.12), hexToRgba(c.primary, 0.02)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={[styles.heroIcon, { backgroundColor: platform.iconBg }]}>
          <Heart size={iconSize.xl} color={platform.iconColor} fill={platform.iconColor} strokeWidth={0} />
        </View>
        <AppText style={styles.heroTitle}>Votre activité, au service de votre santé</AppText>
        <AppText style={[styles.heroSub, { maxWidth: heroSubMaxWidth }]}>
          Connectez {platform.name} pour visualiser vos mesures, suivre vos progrès et enrichir votre carnet Cary.
        </AppText>
      </LinearGradient>

      <Stack gap={spacing[2]} style={styles.list}>
        {VALUE_ITEMS.map(({ icon: Icon, label, desc }) => (
          <Row key={label} gap={spacing[3]} align="center" style={[styles.row, { backgroundColor: c.surface }]}>
            <View style={[styles.rowIcon, { backgroundColor: c.primaryLight }]}>
              <Icon size={iconSize.mdSm} color={c.primary} strokeWidth={2.25} />
            </View>
            <View style={styles.rowText}>
              <AppText style={styles.rowLabel}>{label}</AppText>
              <AppText style={styles.rowDesc}>{desc}</AppText>
            </View>
          </Row>
        ))}
      </Stack>

      {autoPrompting ? (
        <Row gap={spacing[2]} align="center" style={styles.promptingRow}>
          <ActivityIndicator size="small" color={c.primary} />
          <AppText style={styles.promptingText}>
            Ouverture de {platform.name}…
          </AppText>
        </Row>
      ) : (
        <Button
          title={platform.connectTitle}
          size="lg"
          fullWidth
          loading={syncing}
          onPress={onConnect}
        />
      )}

      <AppText style={styles.privacy}>
        Lecture seule — Cary n’écrit pas dans {Platform.OS === 'ios' ? 'Apple Santé' : 'Health Connect'} sans votre accord.
      </AppText>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    wrap: {
      gap: spacing[4],
      width: '100%' as const,
    },
    hero: {
      borderRadius: radius.xl,
      padding: spacing[5],
      alignItems: 'center' as const,
      gap: spacing[2],
    },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: spacing[1],
    },
    heroTitle: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
      textAlign: 'center' as const,
      letterSpacing: -0.3,
    },
    heroSub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      textAlign: 'center' as const,
      lineHeight: fontSize.sm * 1.55,
    },
    list: {
      width: '100%' as const,
    },
    row: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[3],
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
      gap: spacing[0.5],
    },
    rowLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    rowDesc: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
    promptingRow: {
      justifyContent: 'center' as const,
      paddingVertical: spacing[2],
    },
    promptingText: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    privacy: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      textAlign: 'center' as const,
      lineHeight: fontSize.xs * 1.5,
    },
  };
}
