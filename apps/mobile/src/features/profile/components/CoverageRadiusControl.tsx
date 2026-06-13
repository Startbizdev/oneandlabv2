import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Minus, Plus } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const STEP = 5;

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

export function CoverageRadiusControl({
  value, min, max, onChange, disabled }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_profile_components_CoverageRadiusControl_tsx_styles');
  const dec = () => onChange(Math.max(min, value - STEP));
  const inc = () => onChange(Math.min(max, value + STEP));

  return (
    <View style={styles.wrap}>
      <Row justify="between" align="center" style={styles.header}>
        <Text style={styles.label}>Rayon d'intervention</Text>
        <Text style={styles.value}>{value} km</Text>
      </Row>
      <Row gap={spacing[3]} align="center" style={styles.row}>
        <Pressable
          onPress={dec}
          disabled={disabled || value <= min}
          style={[styles.btn, (disabled || value <= min) && styles.btnDisabled]}
          accessibilityLabel="Diminuer le rayon"
        >
          <Minus size={20} color={c.primary} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${((value - min) / Math.max(1, max - min)) * 100}%` },
            ]}
          />
        </View>
        <Pressable
          onPress={inc}
          disabled={disabled || value >= max}
          style={[styles.btn, (disabled || value >= max) && styles.btnDisabled]}
          accessibilityLabel="Augmenter le rayon"
        >
          <Plus size={20} color={c.primary} strokeWidth={2.5} />
        </Pressable>
      </Row>
      <Row justify="between" style={styles.limits}>
        <Text style={styles.limitText}>{min} km</Text>
        <Text style={styles.limitText}>{max} km</Text>
      </Row>
      <Text style={styles.hint}>Ajustez par pas de {STEP} km pour définir votre zone.</Text>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[2] },
  header: {},
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  value: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['2xl'],
    color: c.primary,
    fontVariant: ['tabular-nums' as const],
  },
  row: {},
  btn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primaryMid,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnDisabled: { opacity: 0.4 },
  track: {
    minWidth: 0,
    flex: 1,
    height: 8,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden' as const,
  },
  fill: {
    height: '100%' as const,
    backgroundColor: c.primary,
    borderRadius: radius.full,
  },
  limits: {},
  limitText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    lineHeight: fontSize.xs * 1.5,
  },
};
}

