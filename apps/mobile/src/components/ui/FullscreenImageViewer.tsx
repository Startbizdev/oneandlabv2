import { Modal, Pressable, StyleSheet, Image, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, spacing } from '@/theme';

interface Props {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}

/** Visionneuse plein écran (tap ou croix pour fermer). */
export function FullscreenImageViewer({ visible, uri, onClose }: Props) {
  const insets = useSafeAreaInsets();

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer">
        <Pressable style={styles.imageWrap} onPress={onClose}>
          <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        </Pressable>
        <Pressable
          onPress={onClose}
          style={[styles.closeBtn, { top: insets.top + spacing[2] }]}
          accessibilityRole="button"
          accessibilityLabel="Fermer la photo"
          hitSlop={12}
        >
          <X size={22} color={colors.textInverse} strokeWidth={2.5} />
        </Pressable>
      </Pressable>
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
  imageWrap: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    right: spacing[4],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
