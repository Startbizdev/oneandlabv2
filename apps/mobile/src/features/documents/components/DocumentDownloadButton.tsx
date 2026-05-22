import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { CircleCheck, Download } from 'lucide-react-native';
import { colors } from '@/theme';

interface Props {
  downloaded: boolean;
  downloading: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

export function DocumentDownloadButton({
  downloaded,
  downloading,
  onPress,
  accessibilityLabel,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={downloading}
      style={styles.btn}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: downloading }}
    >
      {downloading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : downloaded ? (
        <CircleCheck size={20} color={colors.success} strokeWidth={2.25} />
      ) : (
        <Download size={18} color={colors.primary} strokeWidth={2.25} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
