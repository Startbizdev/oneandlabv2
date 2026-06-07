import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Image,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download, X } from 'lucide-react-native';
import { colors, iconSize, spacing } from '@/theme';
import { inspectMedDocFile, logMedDoc } from '@/lib/uploads/medical-doc-file-debug';

interface Props {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
  /** Affiche le bouton enregistrer / partager (Fichiers, Photos…). */
  onExport?: () => void;
  exportBusy?: boolean;
}

/** Visionneuse plein écran (tap ou croix pour fermer). */
export function FullscreenImageViewer({
  visible,
  uri,
  onClose,
  onExport,
  exportBusy = false,
}: Props) {
  const insets = useSafeAreaInsets();

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
      presentationStyle="overFullScreen"
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} accessibilityLabel="Fermer" />
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          onLoad={() => {
            logMedDoc('viewer:image:onLoad', { uri });
          }}
          onError={(e) => {
            logMedDoc('viewer:image:onError', { uri, error: e.nativeEvent.error });
            void inspectMedDocFile(uri, 'viewer:image:error');
          }}
        />

        {onExport ? (
          <Pressable
            onPress={onExport}
            disabled={exportBusy}
            style={[styles.actionBtn, styles.exportBtn, { top: insets.top + spacing[2] }]}
            accessibilityRole="button"
            accessibilityLabel="Enregistrer l’image"
            hitSlop={12}
          >
            {exportBusy ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Download size={iconSize.md} color={colors.textInverse} strokeWidth={2.25} />
            )}
          </Pressable>
        ) : null}

        <Pressable
          onPress={onClose}
          style={[styles.actionBtn, styles.closeBtn, { top: insets.top + spacing[2] }]}
          accessibilityRole="button"
          accessibilityLabel="Fermer la photo"
          hitSlop={12}
        >
          <X size={iconSize.md} color={colors.textInverse} strokeWidth={2.5} />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '92%',
    height: '82%',
  },
  actionBtn: {
    position: 'absolute',
    width: spacing[12],
    height: spacing[12],
    borderRadius: spacing[12] / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBtn: {
    left: spacing[4],
  },
  closeBtn: {
    right: spacing[4],
  },
});
