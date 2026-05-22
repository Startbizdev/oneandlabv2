import { StyleSheet, Text, View } from 'react-native';
import { Layers } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { batchLotSummaryLabel } from '@/utils/appointment-batch';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  batch: Appointment[];
  /** Pendant le chargement des frères du lot (GET détail). */
  expectedCount?: number;
}

export function RdvLotSummaryBanner({ batch, expectedCount }: Props) {
  const count = batch.length > 1 ? batch.length : expectedCount ?? 0;
  if (count <= 1) return null;
  const label =
    batch.length > 1
      ? batchLotSummaryLabel(batch)
      : batchLotSummaryLabel([
          batch[0],
          ...Array.from({ length: count - 1 }, () => batch[0]),
        ]);
  if (!label) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Layers size={16} color={colors.primary} strokeWidth={2.25} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.sub}>
          Une seule fiche regroupe tous les actes du lot, comme sur le site.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryMid,
    padding: spacing[3.5],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, gap: 2 },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.primaryDark,
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.4,
  },
});
