import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { CircleCheck } from 'lucide-react-native';
import type { WizardRecapItem } from './BookingWizardSegmentContext';
import { spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  recaps: WizardRecapItem[];
}

/** Soins déjà planifiés (étape documents, multi-actes uniquement). */
export function BookingWizardPreviousRecaps({ recaps }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_BookingWizardPreviousRecaps_tsx_BookingWizardPreviousRecaps_styles');

  if (recaps.length === 0) return null;

  return (
    <Cluster
      align="start"
      gap={spacing[2]}
      style={styles.wrap}
      leading={<CircleCheck size={iconSize['2xs']} color={c.primary} strokeWidth={2.5} />}
    >
      <View style={styles.copy}>
        <AppText style={styles.title}>Déjà planifié</AppText>
        {recaps.map((r) => (
          <AppText key={r.serviceId} style={styles.line} numberOfLines={2}>
            <AppText style={styles.bold}>{r.shortLabel}</AppText>
            {r.dateLabel ? <AppText style={styles.date}> — {r.dateLabel}</AppText> : null}
          </AppText>
        ))}
      </View>
    </Cluster>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    paddingVertical: spacing[1],
  },
  copy: { minWidth: 0, flex: 1, gap: 2 },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  line: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  bold: { fontFamily: fontFamily.semiBold, color: c.textPrimary },
  date: { color: c.textTertiary },
};
}
