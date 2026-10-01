import { useState } from 'react';
import { View } from 'react-native';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { buildSettingsStyles } from '@/components/ui/SettingsRow';
import { forgotPassword, updatePassword } from '@/features/auth/api/auth.service';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { validatePasswordStrength, passwordsMatch } from '@oneandlab/shared-utils';
import { spacing, AppText, useStyles } from '@/theme';

export function PasswordManagementPanel() {
  const settings = useStyles(buildSettingsStyles);
  const styles = useStyles(buildStyles);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();

  const hasPassword = Boolean(user?.has_password);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const canSave = Boolean(newPassword && confirmPassword && (!hasPassword || currentPassword));

  async function onSave() {
    const check = validatePasswordStrength(newPassword, user?.email);
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
        ...(hasPassword ? { current_password: currentPassword } : {}),
      });
      if (res.success) {
        await fetchMe();
        toast('Mot de passe enregistré', { type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast(res.error ?? 'Mot de passe non enregistré', { type: 'error' });
      }
    } catch (e) {
      toast(getErrorMessage(e), { type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function onForgot() {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      const res = await forgotPassword(user.email);
      if (!res.success) {
        toast(res.error ?? 'Envoi impossible. Réessayez.', { type: 'error' });
        return;
      }
      toast('E-mail envoyé', { message: 'Consultez votre boîte de réception.', type: 'success' });
    } catch (e) {
      toast(getErrorMessage(e), { type: 'error' });
    } finally {
      setSendingReset(false);
    }
  }

  return (
    <View style={settings.section}>
      <AppText style={settings.sectionTitle} accessibilityRole="header">
        Mot de passe
      </AppText>
      <View style={[settings.sectionCard, styles.card]}>
        {hasPassword ? null : (
          <AppText variant="caption">Facultatif : vous pouvez toujours vous connecter avec un code reçu par e-mail.</AppText>
        )}
        {hasPassword ? (
          <PasswordInput label="Mot de passe actuel" value={currentPassword} onChangeText={setCurrentPassword} />
        ) : null}
        <PasswordInput
          label={hasPassword ? 'Nouveau mot de passe' : 'Mot de passe'}
          value={newPassword}
          onChangeText={setNewPassword}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <PasswordInput
          label="Confirmation"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Button
          title={hasPassword ? 'Mettre à jour' : 'Enregistrer'}
          loading={loading}
          disabled={!canSave}
          onPress={() => void onSave()}
          fullWidth
        />
        {hasPassword ? (
          <Button
            title="Recevoir un lien de réinitialisation"
            variant="ghost"
            loading={sendingReset}
            onPress={() => void onForgot()}
          />
        ) : null}
      </View>
    </View>
  );
}

function buildStyles() {
  return {
    card: {
      padding: spacing[4],
      gap: spacing[3],
    },
  };
}
