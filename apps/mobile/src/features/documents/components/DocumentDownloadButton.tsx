import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { colors } from '@/theme';

interface Props {
  /** @deprecated Conservé pour compat ; l’ouverture ne dépend plus d’un état « téléchargé ». */
  downloaded?: boolean;
  downloading: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

/** Ouvre le document (PDF, image…) via le lecteur système / feuille de partage Expo. */
export function DocumentDownloadButton({
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
      ) : (
        <ExternalLink size={18} color={colors.primary} strokeWidth={2.25} />
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
