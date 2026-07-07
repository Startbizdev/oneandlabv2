import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Cluster, Row } from '@/components/layout/primitives';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { radius, spacing, iconSize, AppText } from '@/theme';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_patient_PatientListPrimitives_tsx_styles');
  return (
    <View style={styles.card}>
      {title ? (
        <Cluster
          gap={spacing[2]}
          align="center"
          style={styles.cardHead}
          leading={
            Icon ? (
              <View style={styles.iconWrap}>
                <Icon size={iconSize.xs} color={c.primary} strokeWidth={2} />
              </View>
            ) : undefined
          }
        >
          <AppText style={styles.cardTitle}>{title}</AppText>
        </Cluster>
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
  const styles = useThemedStyles(buildStyles, 'PatientListPrimitives.PatientListRow');
  return (
    <Row
      align="start"
      gap={spacing[3]}
      style={[
        styles.row,
        !last && styles.rowBorder,
        highlight && styles.rowHighlight,
      ]}
    >
      <AppText style={styles.rowLabel}>{label}</AppText>
      <View style={styles.rowValue}>{children}</View>
    </Row>
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
  const styles = useThemedStyles(buildStyles, 'PatientListPrimitives.PatientRowValue');
  return (
    <View style={styles.valueStack}>
      <AppText style={[styles.valueText, muted && styles.valueMuted]}>{text}</AppText>
      {sub ? <AppText style={styles.valueSub}>{sub}</AppText> : null}
    </View>
  );
}

export function PatientActionChips({
  actions,
}: {
  actions: { label: string; onPress: () => void }[];
}) {
  const styles = useThemedStyles(buildStyles, 'PatientListPrimitives.PatientActionChips');
  if (!actions.length) return null;
  return (
    <Row wrap gap={spacing[2]} style={styles.chips}>
      {actions.map((a) => (
        <Pressable key={a.label} onPress={a.onPress} style={styles.chip}>
          <AppText style={styles.chipText}>{a.label}</AppText>
        </Pressable>
      ))}
    </Row>
  );
}

function buildStyles(c: AppColors) {
  return {
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden' as const,
  },
  cardHead: {
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  cardBody: {},
  row: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
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

