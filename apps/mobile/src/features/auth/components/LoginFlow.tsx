import { colors } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthUser } from '@oneandlab/shared-types';
import { ArrowLeft } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  checkEmail,
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

type Step = 'email' | 'otp';

interface Props {
  onSuccess: () => void;
  onEmailNotFound?: (email: string) => void;
  onStepChange?: (step: Step, email?: string) => void;
}

export function LoginFlow({ onSuccess, onEmailNotFound, onStepChange }: Props) {
  const c = useAppColors();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
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

  function goToOtp(mail: string) {
    setStep('otp');
    onStepChange?.('otp', mail);
  }

  function goToEmail() {
    setStep('email');
    setOtp('');
    onStepChange?.('email', email);
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
      const user = (res as { user?: unknown }).user;
      if (!res.success || !token) throw new Error(res.error ?? 'Code OTP invalide');
      await setSession(token, user as Parameters<typeof setSession>[1]);
      const me = await fetchMe();
      const role = me?.role ?? (user as { role?: string })?.role;
      if (!role || !isMobileRole(role)) {
        await useAuthStore.getState().clearSession();
        showAppNotAccessibleAlert(role);
        return;
      }
      const sessionUser = (me ?? user) as AuthUser;
      const freshToken = useAuthStore.getState().token ?? token;
      void offerBiometricEnrollment(freshToken, sessionUser, onSuccess, (message) => {
        toast('Activation impossible', { message, type: 'error' });
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes("n'a pas accès")) {
        toast('Erreur', { message: msg, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === 'email') {
    return (
      <View style={styles.step}>
        <Input
          label="Adresse email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          onSubmitEditing={onEmailSubmit}
          returnKeyType="done"
          placeholder="prenom@exemple.fr"
        />
        <Button title="Recevoir le code" loading={loading} onPress={onEmailSubmit} fullWidth size="lg" />
      </View>
    );
  }

  return (
    <View style={styles.step}>
      {showDev && devOtp ? (
        <Pressable
          onPress={() => setOtp(devOtp)}
          style={[
            styles.devBanner,
            { borderColor: c.success, backgroundColor: c.successLight },
          ]}
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
      <Pressable onPress={goToEmail} style={styles.backBtn}>
        <ArrowLeft size={14} color={colors.textSecondary} strokeWidth={2} />
        <Text style={styles.backText}>Changer d&apos;email</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { gap: spacing[3] },
  devBanner: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: spacing[3],
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  backText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
