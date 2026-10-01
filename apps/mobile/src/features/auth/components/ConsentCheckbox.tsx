import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { ICON_STROKE_WIDTH, AppText, font, iconSize, radius, spacing, useAppColors, useStyles, type Theme } from '@/theme';

interface Props {
  checked: boolean;
  onToggle: (next: boolean) => void;
  label: string;
}

export function ConsentCheckbox({ checked, onToggle, label }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <Pressable
      onPress={() => onToggle(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={styles.row}
    >
      <Row align="start" gap={spacing[3]}>
        <View style={[styles.box, checked && styles.boxChecked]}>
          {checked ? <Check size={iconSize.xs} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} /> : null}
        </View>
        <AppText style={styles.label}>{label}</AppText>
      </Row>
    </Pressable>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    row: { minHeight: 44, justifyContent: 'center' as const, paddingVertical: spacing[1] },
    box: {
      width: 22,
      height: 22,
      marginTop: 1,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    boxChecked: { backgroundColor: c.primary, borderColor: c.primary },
    label: {
      flex: 1,
      minWidth: 0,
      ...font.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      color: c.textSecondary,
    },
  };
}
