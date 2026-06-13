import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Modal, StyleSheet, Image, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download, X } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { iconSize, spacing } from '@/theme';
import { layoutRow } from '@/theme/layout-styles';
import { inspectMedDocFile, logMedDoc } from '@/lib/uploads/medical-doc-file-debug';

const VIEWER_ACTION_SIZE = 44;

interface Props {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
  /** Affiche le bouton enregistrer / partager (Fichiers, Photos…). */
  onExport?: () => void;
  exportBusy?: boolean;
}

/** Visionneuse plein écran — barre d’actions basse (icônes, même style que l’historique). */
export function FullscreenImageViewer({
  visible,
  uri,
  onClose,
  onExport,
  exportBusy = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'FullscreenImageViewer');
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
      <View style={styles.shell}>
        <View style={styles.stage}>
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
        </View>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, spacing[3]),
              paddingTop: spacing[3],
            },
          ]}
        >
          <Row justify="center" gap={spacing[3]} style={styles.footerActions}>
            {onExport ? (
              <IconActionButton
                label="Télécharger l’image"
                onPress={onExport}
                loading={exportBusy}
                disabled={exportBusy}
                variant="secondary"
                backgroundColor={c.primaryLight}
                style={styles.actionBtn}
              >
                <Download size={iconSize.sm} color={c.primary} strokeWidth={2.25} />
              </IconActionButton>
            ) : null}
            <IconActionButton
              label="Fermer la photo"
              onPress={onClose}
              variant="muted"
              backgroundColor={c.surfaceAlt}
              style={styles.actionBtn}
            >
              <X size={iconSize.sm} color={c.textSecondary} strokeWidth={2.5} />
            </IconActionButton>
          </Row>
        </View>
      </View>
    </Modal>
  );
}

function buildStyles(c: AppColors) {
  return {
    shell: {
      minWidth: 0,
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.94)',
    },
    stage: {
      minWidth: 0,
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[3],
      paddingTop: spacing[3],
    },
    image: {
      width: '100%' as const,
      height: '100%' as const,
      maxHeight: '100%' as const,
    },
    footer: {
      paddingHorizontal: spacing[4],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: 'rgba(255, 255, 255, 0.12)',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    footerActions: {
      ...layoutRow(spacing[3]),
      alignSelf: 'center' as const,
    },
    actionBtn: {
      width: VIEWER_ACTION_SIZE,
      height: VIEWER_ACTION_SIZE,
      minWidth: VIEWER_ACTION_SIZE,
      minHeight: VIEWER_ACTION_SIZE,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderLight,
    },
  };
}
