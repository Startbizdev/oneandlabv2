import { View } from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { ICON_STROKE_WIDTH, iconSize, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

/** Lecture en cours plus haut dans le fil : retour au dernier message. */
export function CaryAiScrollToBottomButton({ onPress }: { onPress: () => void }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Button
        title="Revenir en bas"
        variant="outline"
        size="sm"
        onPress={onPress}
        style={styles.button}
        leftIcon={<ArrowDown size={iconSize.sm} color={c.textPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
      />
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    wrap: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: spacing[3],
      alignItems: 'center' as const,
    },
    button: { backgroundColor: c.surface },
  };
}
