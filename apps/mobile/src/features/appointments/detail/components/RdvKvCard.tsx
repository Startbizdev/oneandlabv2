import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import type { DetailKvRow } from '@/utils/appointment-detail-display';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function KvRow({ label, value, strikethrough }: DetailKvRow) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, strikethrough && styles.strikethrough]}
        selectable
      >
        {value}
      </Text>
    </View>
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

const styles = StyleSheet.create({
  overline: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  rowWrap: {
    paddingHorizontal: spacing[4],
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  rowLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flexShrink: 0,
    maxWidth: '40%',
  },
  rowValue: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    lineHeight: fontSize.sm * 1.45,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
    opacity: 0.85,
  },
});
