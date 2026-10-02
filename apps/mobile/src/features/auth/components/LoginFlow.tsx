import { useAppColors } from '@/theme/use-app-colors';
import React, { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import type { AuthUser } from '@oneandlab/shared-types';
import { ArrowLeft } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { ForgotPasswordPanel } from '@/features/auth/components/ForgotPasswordPanel';
import { OtpCodeStep } from '@/features/auth/components/OtpCodeStep';
import {
  checkEmail,
  forgotPassword,
  loginWithPassword,
  parseRequestOtpResponse,
  requestOtp,
  verifyOtp,
} from '@/features/auth/api/auth.service';
import {
  extractCheckEmailRole,
  isNonMobileRole,
  showAppNotAccessibleAlert,
} from '@/lib/auth/mobile-access';
import { useAuthStore, isMobileRole } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { offerBiometricEnrollmentAfterLogin } from '@/features/auth/utils/offer-biometric-enrollment';
import { spacing, iconSize, ICON_STROKE_WIDTH, AppText, useStyles, font, type Theme } from '@/theme';

export type LoginStep = 'email' | 'password' | 'otp' | 'forgot' | 'forgot-sent';

export interface LoginFlowMeta {
  step: LoginStep;
  email: string;
}

interface Props {
  onSuccess: () => void;
  onEmailNotFound?: (email: string) => void;
  onMetaChange?: (meta: LoginFlowMeta) => void;
}

/**
 * Connexion unifiée : un seul champ e-mail, puis mot de passe si le compte en a un
 * (`has_password` de `/auth/check-email`), sinon code par e-mail. Bascule possible dans les deux sens.
 */
export function LoginFlow({ onSuccess, onEmailNotFound, onMetaChange }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<TextInput>(null);

  const setSession = useAuthStore((s) => s.setSession);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();

  function goTo(next: LoginStep, mail = email) {
    setStep(next);
    onMetaChange?.({ step: next, email: mail });
  }

  function onEmailChange(value: string) {
    setEmail(value);
    onMetaChange?.({ step, email: value });
  }

  function backToEmail() {
    setOtp('');
    setPassword('');
    goTo('email');
  }

  async function finishSession(token: string, user: AuthUser) {
    await setSession(token, user);
    const me = await fetchMe();
    const role = me?.role ?? user.role;
    if (!role || !isMobileRole(role)) {
      await useAuthStore.getState().clearSession();
      showAppNotAccessibleAlert(role);
      return;
    }
    if (me?.must_change_password) {
      onSuccess();
      return;
    }
    const sessionUser = me ?? user;
    const freshToken = useAuthStore.getState().token ?? token;
    void offerBiometricEnrollmentAfterLogin(freshToken, sessionUser, onSuccess, (message) => {
      toast('Activation impossible', { message, type: 'error' });
    });
  }

  /** Envoie un code et mémorise la nouvelle session OTP (chaque demande invalide la précédente). */
  async function sendCode(mail: string): Promise<boolean> {
    try {
      const res = await requestOtp(mail);
      const { userId: uid, sessionId: sid } = parseRequestOtpResponse(res);
      if (!res.success || !uid) throw new Error(res.error ?? "Impossible d'envoyer le code");
      setUserId(uid);
      setSessionId(sid);
      return true;
    } catch (e) {
      toast('Code non envoyé', { message: (e as Error).message, type: 'error' });
      return false;
    }
  }

  function openOtpStep(mail: string) {
    setOtp('');
    goTo('otp', mail);
    setTimeout(() => otpRef.current?.focus(), 400);
  }

  async function switchToCode() {
    const trimmed = email.trim();
    setLoading(true);
    const sent = await sendCode(trimmed);
    setLoading(false);
    if (sent) openOtpStep(trimmed);
  }

  async function onEmailSubmit() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const check = await checkEmail(trimmed);
      if (!check.success) throw new Error(check.error ?? 'Email invalide');
      if (!(check.exists === true || check.data?.exists === true)) {
        onEmailNotFound?.(trimmed);
        return;
      }
      const emailRole = extractCheckEmailRole(check);
      if (isNonMobileRole(emailRole)) {
        showAppNotAccessibleAlert(emailRole);
        return;
      }
      const accountHasPassword = Boolean(check.has_password ?? check.data?.has_password);
      setHasPassword(accountHasPassword);
      if (accountHasPassword) {
        goTo('password', trimmed);
        return;
      }
      if (await sendCode(trimmed)) openOtpStep(trimmed);
    } catch (e) {
      toast('Erreur', { message: (e as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function onOtpSubmit(code: string): Promise<string | null> {
    if (code.length !== 6) return 'Entrez les 6 chiffres reçus par e-mail.';
    setLoading(true);
    try {
      const res = await verifyOtp(userId, code, sessionId);
      const token = (res as { token?: string }).token;
      const user = (res as { user?: AuthUser }).user;
      if (!res.success || !token || !user) throw new Error(res.error ?? 'Code OTP invalide');
      await finishSession(token, user);
      return null;
    } catch (e) {
      const msg = (e as Error).message;
      setOtp('');
      return msg.includes("n'a pas accès") ? null : msg;
    } finally {
      setLoading(false);
    }
  }

  async function onPasswordSubmit() {
    const trimmed = email.trim();
    if (!trimmed || !password) return;
    setLoading(true);
    try {
      const res = await loginWithPassword(trimmed, password);
      const token = res.token;
      const user = res.user ?? res.data;
      if (!res.success || !token || !user) {
        throw new Error(res.error ?? 'Email ou mot de passe incorrect');
      }
      await finishSession(token, user);
    } catch (e) {
      toast('Erreur', { message: (e as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function onForgotSubmit() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await forgotPassword(trimmed);
      goTo('forgot-sent', trimmed);
    } catch (e) {
      toast('Erreur', { message: (e as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  if (step === 'otp') {
    return (
      <OtpCodeStep
        ref={otpRef}
        value={otp}
        onChangeText={setOtp}
        onSubmit={onOtpSubmit}
        submitLabel="Se connecter"
        loading={loading}
        onResend={() => sendCode(email.trim())}
        onChangeEmail={backToEmail}
        alternative={
          hasPassword ? { label: 'Utiliser mon mot de passe', onPress: () => goTo('password') } : undefined
        }
      />
    );
  }

  if (step === 'forgot' || step === 'forgot-sent') {
    return (
      <ForgotPasswordPanel
        email={email}
        onEmailChange={onEmailChange}
        sent={step === 'forgot-sent'}
        loading={loading}
        onSubmit={() => void onForgotSubmit()}
        onBack={() => goTo('password')}
      />
    );
  }

  if (step === 'password') {
    return (
      <View style={styles.step}>
        <PasswordInput
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => void onPasswordSubmit()}
          returnKeyType="done"
          autoFocus
          autoComplete="current-password"
        />
        <Button
          title="Se connecter"
          loading={loading}
          disabled={!password}
          onPress={() => void onPasswordSubmit()}
          fullWidth
          size="lg"
        />
        <Button
          title="Recevoir un code par e-mail"
          variant="ghost"
          fullWidth
          disabled={loading}
          onPress={() => void switchToCode()}
        />
        <Row gap={spacing[3]} justify="between">
          <Pressable onPress={backToEmail} accessibilityRole="button" style={styles.linkBtn}>
            <Row gap={spacing[2]} align="center">
              <ArrowLeft size={iconSize.sm} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
              <AppText style={styles.backText}>Changer d&apos;e-mail</AppText>
            </Row>
          </Pressable>
          <Pressable onPress={() => goTo('forgot')} accessibilityRole="button" style={styles.linkBtn}>
            <AppText style={styles.forgotText}>Mot de passe oublié ?</AppText>
          </Pressable>
        </Row>
      </View>
    );
  }

  return (
    <View style={styles.step}>
      <Input
        label="Adresse e-mail"
        value={email}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="username"
        onSubmitEditing={() => void onEmailSubmit()}
        returnKeyType="next"
        placeholder="prenom@exemple.fr"
      />
      <Button
        title="Continuer"
        loading={loading}
        disabled={!email.trim()}
        onPress={() => void onEmailSubmit()}
        fullWidth
        size="lg"
      />
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    step: { gap: spacing[3] },
    linkBtn: { minHeight: 44, justifyContent: 'center' as const },
    backText: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    forgotText: { ...font.semiBold, fontSize: fontSize.sm, color: c.textLink },
  };
}
