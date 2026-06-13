import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Button } from '@/components/ui/Button';
import { radius, spacing } from '@/theme';

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
  const styles = useThemedStyles(buildIconActionButtonStyles, 'IconActionButton');

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

function buildIconActionButtonStyles(_c: AppColors) {
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
