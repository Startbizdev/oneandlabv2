import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Button } from '@/components/ui/Button';
import { radius, spacing, useStyles } from '@/theme';

interface IconActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'ghost' | 'muted' | 'secondary';
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Bouton icône tokenisé — remplace les overrides agressifs de Button. */
export function IconActionButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'ghost',
  backgroundColor,
  style,
  children,
}: IconActionButtonProps) {
  const styles = useStyles(buildIconActionButtonStyles);

  return (
    <Button
      title=""
      variant={variant}
      size="mini"
      iconOnly
      disabled={disabled}
      loading={loading}
      onPress={onPress}
      accessibilityLabel={label}
      leftIcon={children}
      style={[styles.btn, backgroundColor ? { backgroundColor } : null, style]}
    />
  );
}

function buildIconActionButtonStyles() {
  const size = spacing[9];
  return {
    btn: {
      minWidth: size,
      minHeight: size,
      width: size,
      height: size,
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderRadius: radius.full,
    },
  };
}
