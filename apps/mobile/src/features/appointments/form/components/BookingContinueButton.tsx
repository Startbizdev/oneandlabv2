import { useAppColors } from '@/theme/use-app-colors';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { iconSize, useStyles } from '@/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BookingContinueButton({ title, onPress, loading, disabled, fill, style }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <View style={[styles.root, fill && styles.fill, style]}>
      <Button
        title={title}
        onPress={onPress}
        loading={loading}
        disabled={disabled}
        size="lg"
        fullWidth
        rightIcon={<ArrowRight size={iconSize.mdSm} color={c.onPrimary} />}
      />
    </View>
  );
}

function buildStyles() {
  return {
    root: { minWidth: 0, alignSelf: 'stretch' as const },
    fill: { width: '100%' as const },
  };
}
