import { StyleSheet, Text, View } from 'react-native';
import { CircleCheck } from 'lucide-react-native';
import { formatDateCompact } from '@/utils/appointment-display';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export interface WizardRecapItem {
  serviceId: string;
  shortLabel: string;
  dateLabel?: string;
}

interface Props {
  currentLabel: string;
  kind?: 'blood' | 'nursing' | 'mixed';
  previousRecaps: WizardRecapItem[];
  lotCount?: number;
}

/** Bandeau soin compact — une ligne, pas de carte volumineuse. */
export function BookingWizardSegmentContext({
  currentLabel,
  kind,
  previousRecaps,
  lotCount,
}: Props) {
  const badge =
    kind === 'blood' ? 'Prélèvement' : kind === 'nursing' ? 'Soins infirmiers' : null;

  return (
    <View style={styles.wrap}>
      {previousRecaps.length > 0 ? (
        <View style={styles.doneRow}>
          <CircleCheck size={12} color={colors.primary} strokeWidth={2.5} />
          <Text style={styles.doneText} numberOfLines={2}>
            {previousRecaps.map((r) => r.shortLabel).join(' · ')}
          </Text>
        </View>
      ) : null}

      <View style={styles.currentRow}>
        <View style={styles.accent} />
        <View style={styles.currentCopy}>
          <Text style={styles.serviceName} numberOfLines={2}>
            {currentLabel}
          </Text>
          {badge || (lotCount && lotCount > 1) ? (
            <View style={styles.metaRow}>
              {badge ? <Text style={styles.badge}>{badge}</Text> : null}
              {lotCount && lotCount > 1 ? (
                <Text style={styles.lot}>{lotCount} actes</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function recapDateLabel(scheduledAt: string | undefined): string | undefined {
  if (!scheduledAt?.trim()) return undefined;
  return formatDateCompact(scheduledAt) || scheduledAt.slice(0, 10);
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[2],
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[1],
  },
  doneText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing[2.5],
    minHeight: 0,
  },
  accent: {
    width: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  currentCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[0.5],
    justifyContent: 'center',
  },
  serviceName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[1.5],
  },
  badge: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize['2xs'],
    color: colors.primaryDark,
  },
  lot: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
  },
});
