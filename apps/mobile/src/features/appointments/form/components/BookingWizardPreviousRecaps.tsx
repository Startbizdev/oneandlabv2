import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { CircleCheck } from 'lucide-react-native';
import type { WizardRecapItem } from './BookingWizardSegmentContext';
import { spacing } from '@/theme';
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
      leading={<CircleCheck size={12} color={c.primary} strokeWidth={2.5} />}
    >
      <View style={styles.copy}>
        <Text style={styles.title}>Déjà planifié</Text>
        {recaps.map((r) => (
          <Text key={r.serviceId} style={styles.line} numberOfLines={2}>
            <Text style={styles.bold}>{r.shortLabel}</Text>
            {r.dateLabel ? <Text style={styles.date}> — {r.dateLabel}</Text> : null}
          </Text>
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
