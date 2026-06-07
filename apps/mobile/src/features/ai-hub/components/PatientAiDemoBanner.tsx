import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { H_PADDING, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

/** Bandeau « version démo » — collé au-dessus du compositeur, orange clair. */
export function PatientAiDemoBanner() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  return (
    <View
      style={[
        styles.strip,
        {
          backgroundColor: c.warningLight,
          borderTopColor: c.warningMid,
        },
      ]}
    >
      <Sparkles size={14} color={c.warning} strokeWidth={2.25} />
      <Text style={[styles.label, { color: c.warning }]} numberOfLines={1}>
        Version démo
      </Text>
      <Text style={[styles.dot, { color: c.warning }]}>·</Text>
      <Text style={[styles.message, { color: c.textSecondary }]} numberOfLines={1}>
        Votre assistant santé Cary arrive bientôt
      </Text>
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    strip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[1.5],
      paddingHorizontal: H_PADDING,
      paddingVertical: spacing[2],
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    label: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      letterSpacing: 0.2,
    },
    dot: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      opacity: 0.7,
    },
    message: {
      flex: 1,
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs, 1.35),
    },
  };
}
