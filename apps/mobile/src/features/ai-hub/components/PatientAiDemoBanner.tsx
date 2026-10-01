import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Sparkles } from 'lucide-react-native';
import { H_PADDING, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
import { lh } from '@/theme/typography';

/** Bandeau « version démo » — collé au-dessus du compositeur, orange clair. */
export function PatientAiDemoBanner() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  return (
    <Row
      align="center"
      gap={spacing[1.5]}
      style={[
        styles.strip,
        {
          backgroundColor: c.warningLight,
          borderTopColor: c.warningMid,
        },
      ]}
    >
      <Sparkles size={iconSize.xs} color={c.warning} strokeWidth={2.25} />
      <AppText style={[styles.label, { color: c.warning }]} numberOfLines={1}>
        Version démo
      </AppText>
      <AppText style={[styles.dot, { color: c.warning }]}>·</AppText>
      <AppText style={[styles.message, { color: c.textSecondary }]} numberOfLines={1}>
        Votre assistant santé Cary arrive bientôt
      </AppText>
    </Row>
  );
}

function buildStyles({ fontSize }: Theme) {
  return {
    strip: {
      paddingHorizontal: H_PADDING,
      paddingVertical: spacing[2],
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    label: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      letterSpacing: 0.2,
    },
    dot: {
      ...font.bold,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      opacity: 0.7,
    },
    message: {
      flex: 1,
      minWidth: 0,
      ...font.medium,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs, 1.35),
    },
  };
}
