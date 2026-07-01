import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Modal, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { getAppMeta } from '@/features/help/utils/app-meta';
import { openAppStoreUrl } from '../utils/app-update-policy';

type Props = {
  visible: boolean;
  message: string;
  storeUrl: string;
  force: boolean;
  onDismiss?: () => void;
};

export function ForceAppUpdateModal({ visible, message, storeUrl, force, onDismiss }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_app_update_ForceAppUpdateModal');
  const { appVersion } = getAppMeta();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.shell, { backgroundColor: c.background }]}>
        <Text style={[styles.title, { color: c.textPrimary }]}>
          {force ? 'Mise à jour requise' : 'Mise à jour disponible'}
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>{message}</Text>
        <Text style={[styles.meta, { color: c.textSecondary }]}>Version installée : {appVersion}</Text>
        <View style={styles.actions}>
          <Button title="Mettre à jour" onPress={() => openAppStoreUrl(storeUrl)} fullWidth />
          {!force && onDismiss ? (
            <Button title="Plus tard" variant="outline" onPress={onDismiss} fullWidth />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function buildStyles(_c: AppColors) {
  return {
    shell: { minWidth: 0, flex: 1, padding: spacing[6], paddingTop: spacing[16], gap: spacing[3] },
    title: { fontFamily: fontFamily.bold, fontSize: fontSize.lg },
    sub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.45 },
    meta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, marginTop: spacing[1] },
    actions: { marginTop: spacing[4], gap: spacing[3] },
  };
}
