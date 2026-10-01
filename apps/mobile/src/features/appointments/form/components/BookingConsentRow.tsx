import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { useAppColors } from '@/theme/use-app-colors';
import { AppText, font, radius, spacing, useStyles, type Theme } from '@/theme';

interface Props {
  checked: boolean;
  onToggle: () => void;
  label: string;
  error?: boolean;
}

/** Case de consentement de la réservation (RGPD patient ou consentement recueilli par le soignant). */
export function BookingConsentRow({ checked, onToggle, label, error = false }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={[styles.row, error && styles.rowError]}
    >
      <Row align="start" gap={spacing[3]}>
        <View style={[styles.checkbox, checked && styles.checkboxActive]}>
          {checked ? <Check size={14} color={c.onPrimary} strokeWidth={3} /> : null}
        </View>
        <AppText style={styles.text}>{label}</AppText>
      </Row>
    </Pressable>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    row: {
      padding: spacing[3],
      marginHorizontal: -spacing[3],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    rowError: {
      borderColor: c.errorMid,
      backgroundColor: c.errorLight,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginTop: 1,
      flexShrink: 0,
    },
    checkboxActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    text: {
      minWidth: 0,
      flex: 1,
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.55,
    },
  };
}
