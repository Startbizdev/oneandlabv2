import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable } from 'react-native';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { Stack } from '@/components/layout/primitives';
import {spacing, iconSize } from '@/theme';

type Props = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

export function TourStopReorderControls({ canMoveUp, canMoveDown, onMoveUp, onMoveDown }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  return (
    <Stack gap={spacing[0.5]} style={styles.wrap}>
      <Pressable
        onPress={onMoveUp}
        disabled={!canMoveUp}
        accessibilityRole="button"
        accessibilityLabel="Monter le passage"
        style={({ pressed }) => [
          styles.btn,
          { borderColor: c.borderLight, backgroundColor: c.surface },
          !canMoveUp && styles.btnDisabled,
          pressed && canMoveUp && styles.btnPressed,
        ]}
      >
        <ArrowUp
          size={iconSize.xs}
          color={canMoveUp ? c.textSecondary : c.textTertiary}
          strokeWidth={2.4}
        />
      </Pressable>
      <Pressable
        onPress={onMoveDown}
        disabled={!canMoveDown}
        accessibilityRole="button"
        accessibilityLabel="Descendre le passage"
        style={({ pressed }) => [
          styles.btn,
          { borderColor: c.borderLight, backgroundColor: c.surface },
          !canMoveDown && styles.btnDisabled,
          pressed && canMoveDown && styles.btnPressed,
        ]}
      >
        <ArrowDown
          size={iconSize.xs}
          color={canMoveDown ? c.textSecondary : c.textTertiary}
          strokeWidth={2.4}
        />
      </Pressable>
    </Stack>
  );
}

function buildStyles(_c: AppColors) {
  return {
    wrap: {
      flexShrink: 0,
      paddingTop: 2,
    },
    btn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    btnDisabled: {
      opacity: 0.4,
    },
    btnPressed: {
      opacity: 0.72,
    },
  };
}
