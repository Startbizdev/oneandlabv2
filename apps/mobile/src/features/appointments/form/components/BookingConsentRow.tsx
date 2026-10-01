import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { ICON_STROKE_WIDTH, AppText, iconSize, radius, spacing, useAppColors, useStyles, type Theme } from '@/theme';

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
        <View style={[styles.checkbox, checked && styles.checkboxActive, error && styles.checkboxError]}>
          {checked ? <Check size={iconSize.xs} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} /> : null}
        </View>
        <View style={styles.texts}>
          <AppText variant="secondary">{label}</AppText>
          {error ? (
            <AppText variant="body" accessibilityRole="alert" style={styles.errorText}>
              Cochez cette case pour continuer.
            </AppText>
          ) : null}
        </View>
      </Row>
    </Pressable>
  );
}

const CHECKBOX = 24;

function buildStyles({ colors: c }: Theme) {
  return {
    row: {
      padding: spacing[3],
      marginHorizontal: -spacing[3],
      borderRadius: radius.lg,
    },
    rowError: {
      backgroundColor: c.errorLight,
    },
    checkbox: {
      width: CHECKBOX,
      height: CHECKBOX,
      borderRadius: radius.sm,
      borderWidth: 2,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    checkboxActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    checkboxError: { borderColor: c.error },
    texts: { flex: 1, minWidth: 0, gap: spacing[1] },
    errorText: { color: c.error },
  };
}
