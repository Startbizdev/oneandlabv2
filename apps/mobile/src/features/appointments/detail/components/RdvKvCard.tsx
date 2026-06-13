import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Card } from '@/components/ui/Card';
import type { DetailKvRow } from '@/utils/appointment-detail-display';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function KvRow({ label, value, strikethrough }: DetailKvRow) {
  const styles = useThemedStyles(buildStyles, 'RdvKvCard.KvRow');
  if (!value) return null;
  return (
    <Row justify="between" align="start" gap={spacing[3]} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, strikethrough && styles.strikethrough]}
        selectable
      >
        {value}
      </Text>
    </Row>
  );
}

interface Props {
  /** Si false, pas de titre dans la carte (titre fourni par `RdvSection`). */
  showTitle?: boolean;
  title?: string;
  rows: DetailKvRow[];
}

export function RdvKvCard({
  showTitle = false,
  title = 'Informations',
  rows,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_RdvKvCard_tsx_RdvKvCard_styles');

  const visible = rows.filter((r) => r.value);
  if (!visible.length) return null;

  return (
    <Card shadow="sm" padding="none">
      {showTitle ? (
        <Text style={styles.overline}>{title}</Text>
      ) : null}
      {visible.map((r, i) => (
        <View
          key={`${r.label}-${r.value.slice(0, 24)}`}
          style={[styles.rowWrap, (showTitle || i > 0) && styles.rowBorder]}
        >
          <KvRow {...r} />
        </View>
      ))}
    </Card>
  );
}

function buildStyles(c: AppColors) {
  return {
  overline: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  rowWrap: {
    paddingHorizontal: spacing[4],
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  row: {
    paddingVertical: spacing[3],
  },
  rowLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    flexShrink: 0,
    maxWidth: '40%' as const,
  },
  rowValue: {
    minWidth: 0,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    flex: 1,
    textAlign: 'right' as const,
    lineHeight: fontSize.sm * 1.45,
  },
  strikethrough: {
    textDecorationLine: 'line-through' as const,
    color: c.textTertiary,
    opacity: 0.85,
  },
};
}
