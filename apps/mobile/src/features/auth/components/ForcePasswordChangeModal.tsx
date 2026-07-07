import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { updatePassword } from '@/features/auth/api/auth.service';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { validatePasswordStrength, passwordsMatch } from '@oneandlab/shared-utils';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function ForcePasswordChangeModal({ visible, onDone }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_auth_components_ForcePasswordChangeModal_tsx_ForcePasswordChangeModal_styles');

  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const check = validatePasswordStrength(newPassword);
    if (!check.valid) {
      toast(check.error ?? 'Mot de passe invalide', { type: 'error' });
      return;
    }
    if (!passwordsMatch(newPassword, confirmPassword)) {
      toast('Les mots de passe ne correspondent pas', { type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await updatePassword({
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      if (res.success) {
        await fetchMe();
        onDone();
      } else {
        toast(res.error ?? 'Erreur', { type: 'error' });
      }
    } catch (e) {
      toast((e as Error).message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.shell, { backgroundColor: c.background }]}>
        <AppText style={[styles.title, { color: c.textPrimary }]}>Choisissez un nouveau mot de passe</AppText>
        <AppText style={[styles.sub, { color: c.textSecondary }]}>
          Pour continuer, définissez un mot de passe personnel.
        </AppText>
        <View style={styles.form}>
          <Input label="Nouveau mot de passe" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <Input label="Confirmation" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          <Button title="Continuer" loading={loading} onPress={() => void onSubmit()} fullWidth />
        </View>
      </View>
    </Modal>
  );
}

function buildStyles(c: AppColors) {
  return {
  shell: { minWidth: 0, flex: 1, padding: spacing[6], paddingTop: spacing[16], gap: spacing[3] },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.lg },
  sub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.45 },
  form: { marginTop: spacing[4], gap: spacing[3] },
};
}
