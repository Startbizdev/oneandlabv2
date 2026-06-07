import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function PatientListCard({
  title,
  Icon,
  children,
}: {
  title?: string;
  Icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      {title ? (
        <View style={styles.cardHead}>
          {Icon ? (
            <View style={styles.iconWrap}>
              <Icon size={15} color={colors.primary} strokeWidth={2} />
            </View>
          ) : null}
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
      ) : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export function PatientListRow({
  label,
  children,
  last,
  highlight,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
  highlight?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !last && styles.rowBorder,
        highlight && styles.rowHighlight,
      ]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>{children}</View>
    </View>
  );
}

export function PatientRowValue({
  text,
  sub,
  muted,
}: {
  text: string;
  sub?: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.valueStack}>
      <Text style={[styles.valueText, muted && styles.valueMuted]}>{text}</Text>
      {sub ? <Text style={styles.valueSub}>{sub}</Text> : null}
    </View>
  );
}

export function PatientActionChips({
  actions,
}: {
  actions: { label: string; onPress: () => void }[];
}) {
  if (!actions.length) return null;
  return (
    <View style={styles.chips}>
      {actions.map((a) => (
        <Pressable key={a.label} onPress={a.onPress} style={styles.chip}>
          <Text style={styles.chipText}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3.5],
    paddingBottom: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderLight,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  cardBody: {},
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderLight,
  },
  rowHighlight: {
    backgroundColor: c.warningLight,
  },
  rowLabel: {
    width: 100,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    paddingTop: 2,
  },
  rowValue: {
    flex: 1,
    minWidth: 0,
    gap: spacing[2],
  },
  valueStack: { gap: 3 },
  valueText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.45,
  },
  valueMuted: {
    fontFamily: fontFamily.regular,
    color: c.textSecondary,
  },
  valueSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  chipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textPrimary,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_patient_PatientListPrimitives_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
