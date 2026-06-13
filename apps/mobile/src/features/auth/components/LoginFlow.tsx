import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import type { AuthUser } from '@oneandlab/shared-types';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ForgotPasswordPanel } from '@/features/auth/components/ForgotPasswordPanel';
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
import { isDevBuild } from '@/config/env';
import { offerBiometricEnrollment } from '@/features/auth/utils/offer-biometric-enrollment';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type LoginMode = 'code' | 'password';
type Step = 'email' | 'otp';
type PasswordView = 'login' | 'forgot' | 'forgot-sent';

export interface LoginFlowMeta {
  mode: LoginMode;
  step: Step;
  email: string;
  passwordView: PasswordView;
}

interface Props {
  onSuccess: () => void;
  onEmailNotFound?: (email: string) => void;
  onMetaChange?: (meta: LoginFlowMeta) => void;
}

export function LoginFlow({ onSuccess, onEmailNotFound, onMetaChange }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_auth_components_LoginFlow_tsx_LoginFlow_styles');

  const [mode, setMode] = useState<LoginMode>('code');
  const [step, setStep] = useState<Step>('email');
  const [passwordView, setPasswordView] = useState<PasswordView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [forgotSent, setForgotSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<TextInput>(null);

  const setSession = useAuthStore((s) => s.setSession);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const showDev = isDevBuild();

  function emitMeta(
    nextMode: LoginMode,
    nextStep: Step,
    mail = email,
    nextPasswordView: PasswordView = passwordView,
  ) {
    onMetaChange?.({ mode: nextMode, step: nextStep, email: mail, passwordView: nextPasswordView });
  }

  function switchMode(next: LoginMode) {
    setMode(next);
    setPasswordView('login');
    setForgotSent(false);
    if (next === 'code') {
      setStep('email');
      setPassword('');
      setHasPassword(null);
    }
    emitMeta(next, next === 'code' ? step : 'email', email, 'login');
  }

  function goToForgot() {
    setPasswordView('forgot');
    setForgotSent(false);
    emitMeta('password', 'email', email, 'forgot');
  }

  function backToPasswordLogin() {
    setPasswordView('login');
    setForgotSent(false);
    emitMeta('password', 'email', email, 'login');
  }

  function goToOtp(mail: string) {
    setStep('otp');
    emitMeta('code', 'otp', mail, 'login');
  }

  function goToEmail() {
    setStep('email');
    setOtp('');
    emitMeta('code', 'email', email, 'login');
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
    const sessionUser = (me ?? user) as AuthUser;
    const freshToken = useAuthStore.getState().token ?? token;
    void offerBiometricEnrollment(freshToken, sessionUser, onSuccess, (message) => {
      toast('Activation impossible', { message, type: 'error' });
    });
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
      const res = await requestOtp(trimmed);
      const { userId: uid, sessionId: sid, otp: code } = parseRequestOtpResponse(res);
      if (!res.success || !uid) throw new Error(res.error ?? "Impossible d'envoyer le code");
      setUserId(uid);
      setSessionId(sid);
      setDevOtp(code ?? '');
      if (code) setOtp(code);
      goToOtp(trimmed);
      setTimeout(() => otpRef.current?.focus(), 400);
      toast('Code envoyé', {
        message: code ? `Dev · ${code}` : 'Vérifiez votre boîte mail',
        type: 'success',
      });
    } catch (e) {
      toast('Erreur', { message: (e as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function onOtpSubmit() {
    if (otp.replace(/[^0-9]/g, '').length !== 6) {
      toast('Code invalide', { message: '6 chiffres requis', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOtp(userId, otp, sessionId);
      const token = (res as { token?: string }).token;
      const user = (res as { user?: AuthUser }).user;
      if (!res.success || !token || !user) throw new Error(res.error ?? 'Code OTP invalide');
      await finishSession(token, user);
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes("n'a pas accès")) {
        toast('Erreur', { message: msg, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshHasPassword(mail: string) {
    const trimmed = mail.trim();
    if (!trimmed) {
      setHasPassword(null);
      return;
    }
    try {
      const check = await checkEmail(trimmed);
      if (check.success && (check.exists === true || check.data?.exists === true)) {
        setHasPassword(Boolean(check.has_password ?? check.data?.has_password));
      } else {
        setHasPassword(null);
      }
    } catch {
      setHasPassword(null);
    }
  }

  async function onPasswordSubmit() {
    const trimmed = email.trim();
    if (!trimmed || !password) return;
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
      if (!accountHasPassword) {
        toast('Aucun mot de passe', {
          message: 'Utilisez le code par email ou créez un mot de passe depuis votre profil.',
          type: 'info',
        });
        return;
      }
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
      setForgotSent(true);
      setPasswordView('forgot-sent');
      emitMeta('password', 'email', trimmed, 'forgot-sent');
    } catch (e) {
      toast('Erreur', { message: (e as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const showTabs = passwordView === 'login';

  return (
    <View style={styles.step}>
      {showTabs ? (
        <Row gap={spacing[0.5]} style={[styles.tabs, { backgroundColor: c.surfaceAlt, borderColor: c.borderLight }]}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'code' }}
            onPress={() => switchMode('code')}
            style={[styles.tab, mode === 'code' && { backgroundColor: c.surface }]}
          >
            <Text style={[styles.tabText, { color: mode === 'code' ? c.primary : c.textSecondary }]}>
              Code email
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'password' }}
            onPress={() => switchMode('password')}
            style={[styles.tab, mode === 'password' && { backgroundColor: c.surface }]}
          >
            <Text style={[styles.tabText, { color: mode === 'password' ? c.primary : c.textSecondary }]}>
              Mot de passe
            </Text>
          </Pressable>
        </Row>
      ) : null}

      {mode === 'code' && step === 'email' ? (
        <>
          <Input
            label="Adresse email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              emitMeta('code', 'email', v);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            onSubmitEditing={onEmailSubmit}
            returnKeyType="done"
            placeholder="prenom@exemple.fr"
          />
          <Button title="Recevoir le code" loading={loading} onPress={onEmailSubmit} fullWidth size="lg" />
        </>
      ) : null}

      {mode === 'code' && step === 'otp' ? (
        <>
          {showDev && devOtp ? (
            <Pressable
              onPress={() => setOtp(devOtp)}
              style={[styles.devBanner, { borderColor: c.success, backgroundColor: c.successLight }]}
            >
              <Text style={[styles.devCode, { color: c.success }]}>Dev · {devOtp}</Text>
              <Text style={[styles.devHint, { color: c.textSecondary }]}>Appuyer pour remplir</Text>
            </Pressable>
          ) : null}
          <Input
            ref={otpRef}
            label="Code à 6 chiffres"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            onSubmitEditing={onOtpSubmit}
            placeholder="000000"
          />
          <Button title="Se connecter" loading={loading} onPress={onOtpSubmit} fullWidth size="lg" />
          <Pressable onPress={goToEmail}>
            <Row gap={spacing[2]} align="center" justify="center" style={styles.backBtn}>
              <ArrowLeft size={14} color={c.textSecondary} strokeWidth={2} />
              <Text style={styles.backText}>Changer d&apos;email</Text>
            </Row>
          </Pressable>
        </>
      ) : null}

      {mode === 'password' && passwordView === 'login' ? (
        <>
          <Input
            label="Adresse email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              emitMeta('password', 'email', v, 'login');
            }}
            onBlur={() => void refreshHasPassword(email)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="prenom@exemple.fr"
          />
          <Input
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={onPasswordSubmit}
            returnKeyType="done"
            rightIcon={
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                {showPassword ? (
                  <EyeOff size={20} color={c.textSecondary} strokeWidth={2} />
                ) : (
                  <Eye size={20} color={c.textSecondary} strokeWidth={2} />
                )}
              </Pressable>
            }
          />
          {hasPassword === false ? (
            <View style={[styles.infoBox, { backgroundColor: c.primaryLight, borderColor: c.primary }]}>
              <Text style={[styles.infoText, { color: c.primaryDark }]}>
                Aucun mot de passe sur ce compte. Utilisez le code par email ou créez un mot de passe depuis
                Mon profil après connexion.
              </Text>
              <Pressable onPress={() => switchMode('code')}>
                <Text style={[styles.infoLink, { color: c.primary }]}>Utiliser le code email</Text>
              </Pressable>
            </View>
          ) : null}
          <Button title="Se connecter" loading={loading} onPress={onPasswordSubmit} fullWidth size="lg" />
          <Pressable onPress={goToForgot} style={styles.forgotBtn}>
            <Text style={[styles.forgotText, { color: c.primary }]}>Mot de passe oublié ?</Text>
          </Pressable>
        </>
      ) : null}

      {mode === 'password' && passwordView !== 'login' ? (
        <ForgotPasswordPanel
          email={email}
          onEmailChange={(v) => {
            setEmail(v);
            emitMeta('password', 'email', v, passwordView);
          }}
          sent={forgotSent}
          loading={loading}
          onSubmit={() => void onForgotSubmit()}
          onBack={backToPasswordLogin}
        />
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  step: { gap: spacing[3] },
  tabs: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing[0.5],
    gap: spacing[0.5],
  },
  tab: {
    minWidth: 0,
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing[2],
    alignItems: 'center' as const,
  },
  tabText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  devBanner: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    padding: spacing[3],
    alignItems: 'center' as const,
    gap: 4,
  },
  devCode: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    letterSpacing: 1,
  },
  devHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
  },
  backBtn: {
    paddingVertical: spacing[1],
  },
  backText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  forgotBtn: { alignItems: 'center' as const, paddingVertical: spacing[1] },
  forgotText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm },
  infoBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing[3],
    gap: spacing[2],
  },
  infoText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, lineHeight: fontSize.xs * 1.45 },
  infoLink: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm },
};
}
