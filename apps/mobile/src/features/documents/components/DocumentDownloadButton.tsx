import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { ExternalLink } from 'lucide-react-native';

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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_documents_components_DocumentDownloadButton_tsx_DocumentDownloadButton_styles');

  return (
    <Pressable
      onPress={onPress}
      disabled={downloading}
      style={styles.btn}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: downloading }}
    >
      {downloading ? (
        <ActivityIndicator size="small" color={c.primary} />
      ) : (
        <ExternalLink size={18} color={c.primary} strokeWidth={2.25} />
      )}
    </Pressable>
  );
}

function buildStyles(c: AppColors) {
  return {
  btn: {
    padding: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
}
