import { colors } from '@/theme';
import { StyleSheet, Text, View } from 'react-native';
import { CircleCheck } from 'lucide-react-native';
import type { WizardRecapItem } from './BookingWizardSegmentContext';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  recaps: WizardRecapItem[];
}

/** Soins déjà planifiés (étape documents, multi-actes uniquement). */
export function BookingWizardPreviousRecaps({ recaps }: Props) {
  if (recaps.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <CircleCheck size={12} color={colors.primary} strokeWidth={2.5} />
      <View style={styles.copy}>
        <Text style={styles.title}>Déjà planifié</Text>
        {recaps.map((r) => (
          <Text key={r.serviceId} style={styles.line} numberOfLines={2}>
            <Text style={styles.bold}>{r.shortLabel}</Text>
            {r.dateLabel ? <Text style={styles.date}> — {r.dateLabel}</Text> : null}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  copy: { flex: 1, gap: 2 },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  line: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  bold: { fontFamily: fontFamily.semiBold, color: colors.textPrimary },
  date: { color: colors.textTertiary },
});
