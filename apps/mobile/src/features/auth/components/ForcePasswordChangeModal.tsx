import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Circle } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { updatePassword } from '@/features/auth/api/auth.service';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { validatePasswordStrength, passwordsMatch } from '@oneandlab/shared-utils';
import { spacing, iconSize, AppText, useAppColors, useStyles, font, type Theme } from '@/theme';

interface Props {
  visible: boolean;
  onDone: () => void;
}

/** Règles appliquées par le backend (`Validation::password`) et par `validatePasswordStrength`. */
function passwordRules(password: string, email: string | undefined) {
  const normalizedEmail = email?.trim().toLowerCase() ?? '';
  return [
    { label: '8 caractères minimum', ok: password.length >= 8 },
    { label: 'Au moins une lettre et un chiffre', ok: /[A-Za-z]/.test(password) && /[0-9]/.test(password) },
    {
      label: 'Différent de votre adresse e-mail',
      ok: password.length > 0 && (!normalizedEmail || password.toLowerCase() !== normalizedEmail),
    },
  ];
}

export function ForcePasswordChangeModal({ visible, onDone }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const clearSession = useAuthStore((s) => s.clearSession);
  const { show: toast } = useToast();
  const hasPassword = Boolean(user?.has_password);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const rules = passwordRules(newPassword, user?.email);

  async function onSubmit() {
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

  async function onLogout() {
    setLoggingOut(true);
    try {
      await clearSession();
    } catch (e) {
      toast('Déconnexion impossible', {
        message: e instanceof Error ? e.message : 'Réessayez.',
        type: 'error',
      });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AppText accessibilityRole="header" style={styles.title}>
              Choisissez un nouveau mot de passe
            </AppText>
            <AppText style={styles.sub}>
              Votre mot de passe actuel est temporaire. Pour continuer, définissez un mot de passe
              personnel.
            </AppText>

            <View style={styles.form}>
              {hasPassword ? (
                <PasswordInput
                  label="Mot de passe temporaire"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  autoComplete="current-password"
                />
              ) : null}
              <PasswordInput
                label="Nouveau mot de passe"
                value={newPassword}
                onChangeText={setNewPassword}
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <View style={styles.rules} accessibilityLabel="Règles du mot de passe">
                {rules.map((rule) => (
                  <Row key={rule.label} align="center" gap={spacing[2]}>
                    {rule.ok ? (
                      <Check size={iconSize.sm} color={c.success} strokeWidth={2.5} />
                    ) : (
                      <Circle size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />
                    )}
                    <AppText
                      style={[styles.ruleText, rule.ok && styles.ruleTextOk]}
                      accessibilityLabel={`${rule.label} : ${rule.ok ? 'respecté' : 'à respecter'}`}
                    >
                      {rule.label}
                    </AppText>
                  </Row>
                ))}
              </View>
              <PasswordInput
                label="Confirmation"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <Button title="Continuer" size="lg" loading={loading} onPress={() => void onSubmit()} fullWidth />
              <Button
                title="Se déconnecter"
                variant="ghost"
                fullWidth
                loading={loggingOut}
                disabled={loading}
                onPress={() => void onLogout()}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    safe: { minWidth: 0, flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    content: {
      flexGrow: 1,
      padding: spacing[6],
      paddingTop: spacing[8],
      gap: spacing[3],
    },
    title: { ...font.heading, fontSize: fontSize.xl, lineHeight: fontSize.xl * 1.2, color: c.textPrimary },
    sub: { ...font.regular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.45, color: c.textSecondary },
    form: { marginTop: spacing[4], gap: spacing[3] },
    rules: { gap: spacing[1.5], paddingHorizontal: spacing[1] },
    ruleText: { ...font.regular, fontSize: fontSize.sm, color: c.textSecondary },
    ruleTextOk: { color: c.textPrimary },
  };
}
