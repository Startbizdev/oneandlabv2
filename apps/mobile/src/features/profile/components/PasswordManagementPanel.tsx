import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { Lock } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { forgotPassword, updatePassword } from '@/features/auth/api/auth.service';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { validatePasswordStrength, passwordsMatch } from '@oneandlab/shared-utils';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function PasswordManagementPanel() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PasswordManagementPanel_styles');
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();

  const hasPassword = Boolean(user?.has_password);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
        toast(res.error ?? 'Erreur', { type: 'error' });
      }
    } catch (e) {
      toast((e as Error).message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function onForgot() {
    if (!user?.email) return;
    try {
      await forgotPassword(user.email);
      toast('Email envoyé', { message: 'Consultez votre boîte de réception.', type: 'success' });
    } catch (e) {
      toast((e as Error).message, { type: 'error' });
    }
  }

  return (
    <View style={[styles.card, elevation.xs]}>
      <Cluster
        gap={spacing[3]}
        align="start"
        leading={
          <View style={[styles.iconWrap, { backgroundColor: c.primaryLight }]}>
            <Lock size={20} color={c.primary} strokeWidth={2.25} />
          </View>
        }
        style={styles.header}
      >
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: c.textPrimary }]}>Mot de passe</Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            Facultatif — le code email reste disponible
          </Text>
        </View>
      </Cluster>
      {hasPassword ? (
        <Input label="Mot de passe actuel" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
      ) : null}
      <Input
        label={hasPassword ? 'Nouveau mot de passe' : 'Mot de passe'}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <Input label="Confirmation" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
      <Button
        title={hasPassword ? 'Mettre à jour' : 'Enregistrer'}
        loading={loading}
        onPress={() => void onSave()}
        fullWidth
      />
      {hasPassword ? (
        <Button title="Envoyer un email de réinitialisation" variant="ghost" onPress={() => void onForgot()} />
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderLight,
      padding: spacing[4],
      gap: spacing[3],
    },
    header: {},
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    headerText: { gap: spacing[0.5] },
    title: { fontFamily: fontFamily.semiBold, fontSize: fontSize.base },
    sub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, lineHeight: fontSize.xs * 1.4 },
  };
}

