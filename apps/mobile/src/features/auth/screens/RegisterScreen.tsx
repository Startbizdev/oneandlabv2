import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Shield } from 'lucide-react-native';
import { FormScreen } from '@/components/layout/FormScreen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { OtpCodeStep } from '@/features/auth/components/OtpCodeStep';
import { RegisterConsentFields } from '@/features/auth/components/RegisterConsentFields';
import { RegisterRoleFields } from '@/features/auth/components/RegisterRoleFields';
import { REGISTER_META } from '@/features/auth/constants/register-meta';
import {
  guestToUser,
  submitRegistrationRequest,
  type RegisterRole,
} from '@/features/auth/api/registration.service';
import { parseRequestOtpResponse, requestOtp, verifyOtp } from '@/features/auth/api/auth.service';
import {
  buildGuestToUserPayload,
  buildRegistrationRequestPayload,
} from '@/features/auth/utils/build-registration-payload';
import {
  formatMissingItems,
  getProfessionalIdFieldError,
  getRegisterMissingItems,
} from '@/features/auth/utils/register-form-validation';
import { showAppNotAccessibleAlert } from '@/lib/auth/mobile-access';
import { useAuthStore, isMobileRole } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { LOGIN_HREF, getRoleHome } from '@/features/auth/hooks/use-auth-guard';
import { offerBiometricEnrollmentAfterLogin } from '@/features/auth/utils/offer-biometric-enrollment';
import { registerHeaderTitle } from '@/navigation/RegisterHeaderTitle';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface RegisterScreenProps {
  role?: RegisterRole;
}

export function RegisterScreen({ role: roleProp }: RegisterScreenProps) {
  const styles = useStyles(buildStyles);
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const role = roleProp ?? 'patient';
  const router = useRouter();
  const navigation = useNavigation();
  const { show: toast } = useToast();
  const setSession = useAuthStore((s) => s.setSession);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const otpRef = useRef<TextInput>(null);

  const meta = REGISTER_META[role] ?? REGISTER_META.patient;

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [professionalId, setProfessionalId] = useState('');
  const [proRpps, setProRpps] = useState('');
  const [emploi, setEmploi] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptHealthData, setAcceptHealthData] = useState(false);
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    if (emailParam?.trim()) setEmail(String(emailParam).trim());
  }, [emailParam]);

  useLayoutEffect(() => {
    if (role !== 'patient') return;
    if (step === 'otp') {
      navigation.setOptions({
        headerTitle: registerHeaderTitle(
          'Vérification',
          email ? `Code envoyé à ${email}` : 'Entrez le code reçu par email',
          Shield,
        ),
      });
    } else {
      navigation.setOptions({
        headerTitle: registerHeaderTitle(meta.headerTitle, meta.headerSubtitle, meta.Icon),
      });
    }
  }, [step, email, role, navigation, meta]);

  const formValues = {
    role,
    email,
    firstName,
    lastName,
    birthDate,
    gender,
    professionalId,
    proRpps,
    emploi,
    acceptTerms,
    acceptHealthData,
  };
  const missingItems = getRegisterMissingItems(formValues);
  const professionalIdError = getProfessionalIdFieldError(formValues);
  const canSubmit = missingItems.length === 0;

  async function onSubmitForm() {
    if (!canSubmit) return;
    setLoading(true);
    const payloadInput = { ...formValues, phone, address };
    try {
      if (role === 'patient') {
        const res = await guestToUser(buildGuestToUserPayload(payloadInput));
        const uid = res.data?.user_id ?? (res as { user_id?: string }).user_id;
        const sid = res.data?.session_id ?? (res as { session_id?: string }).session_id;
        if (!res.success || !uid) throw new Error(res.error ?? 'Impossible de créer le compte');
        setUserId(uid);
        setSessionId(sid ?? '');
        setOtp('');
        setStep('otp');
        setTimeout(() => otpRef.current?.focus(), 400);
      } else {
        const payload = buildRegistrationRequestPayload(payloadInput);
        const res = await submitRegistrationRequest(payload);
        if (!res.success) throw new Error(res.error ?? "Impossible d'envoyer la demande");
        router.replace({ pathname: '/(auth)/register/merci', params: { type: payload.role } });
      }
    } catch (e) {
      toast('Erreur', { message: (e as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  /** Le compte existe déjà (créé par guest-to-user) : un nouveau code invalide le précédent. */
  async function onResendCode(): Promise<boolean> {
    try {
      const res = await requestOtp(email.trim());
      const { userId: uid, sessionId: sid } = parseRequestOtpResponse(res);
      if (!res.success || !uid) throw new Error(res.error ?? "Impossible d'envoyer le code");
      setUserId(uid);
      setSessionId(sid ?? '');
      setOtp('');
      return true;
    } catch (e) {
      toast('Code non envoyé', { message: (e as Error).message, type: 'error' });
      return false;
    }
  }

  async function onVerifyOtp(code: string): Promise<string | null> {
    if (code.length !== 6) return 'Entrez les 6 chiffres reçus par e-mail.';
    setLoading(true);
    try {
      const res = await verifyOtp(userId, code, sessionId || undefined);
      const token = (res as { token?: string }).token;
      const user = (res as { user?: unknown }).user;
      if (!res.success || !token) throw new Error(res.error ?? 'Code incorrect');
      await setSession(token, user as Parameters<typeof setSession>[1]);
      const me = await fetchMe();
      const r = me?.role ?? 'patient';
      if (!isMobileRole(r)) {
        await useAuthStore.getState().clearSession();
        showAppNotAccessibleAlert(r);
        return null;
      }
      const sessionUser = (me ?? user) as Parameters<typeof setSession>[1];
      void offerBiometricEnrollmentAfterLogin(token, sessionUser, () => router.replace(getRoleHome(r)));
      return null;
    } catch (e) {
      setOtp('');
      return (e as Error).message;
    } finally {
      setLoading(false);
    }
  }

  if (step === 'otp' && role === 'patient') {
    return (
      <FormScreen contentContainerStyle={styles.content}>
        <OtpCodeStep
          ref={otpRef}
          value={otp}
          onChangeText={setOtp}
          onSubmit={onVerifyOtp}
          submitLabel="Valider le code"
          loading={loading}
          onResend={onResendCode}
          onChangeEmail={() => {
            setOtp('');
            setStep('form');
          }}
        />
      </FormScreen>
    );
  }

  return (
    <FormScreen contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
          <Input
            label="Adresse e-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Row gap={spacing[3]}>
            <View style={styles.half}>
              <Input label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
            </View>
            <View style={styles.half}>
              <Input label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
            </View>
          </Row>
          <Input
            label="Téléphone (optionnel)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="06 12 34 56 78"
          />

          <RegisterRoleFields
            role={role}
            birthDate={birthDate}
            onBirthDateChange={setBirthDate}
            gender={gender}
            onGenderChange={setGender}
            professionalId={professionalId}
            onProfessionalIdChange={setProfessionalId}
            proRpps={proRpps}
            onProRppsChange={setProRpps}
            emploi={emploi}
            onEmploiChange={setEmploi}
            professionalIdError={professionalIdError}
          />

          <AddressAutocomplete value={address} onChange={setAddress} label="Adresse (optionnel)" />

          <RegisterConsentFields
            role={role}
            acceptTerms={acceptTerms}
            onAcceptTermsChange={setAcceptTerms}
            acceptHealthData={acceptHealthData}
            onAcceptHealthDataChange={setAcceptHealthData}
          />

          {!canSubmit ? (
            <AppText style={styles.missing} accessibilityLiveRegion="polite">
              Pour continuer, il manque {formatMissingItems(missingItems)}.
            </AppText>
          ) : null}

          <Button
            title={meta.submit}
            loading={loading}
            disabled={!canSubmit}
            onPress={onSubmitForm}
            fullWidth
            size="lg"
          />

          <Pressable
            onPress={() => router.replace(LOGIN_HREF)}
            accessibilityRole="button"
            style={styles.loginLink}
          >
            <AppText style={styles.loginLinkText}>
              Déjà un compte ? <AppText style={styles.loginLinkAccent}>Se connecter</AppText>
            </AppText>
          </Pressable>
        </View>
    </FormScreen>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  content: {
    padding: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[3],
  },
  form: {
    gap: spacing[3],
  },
  half: { minWidth: 0, flex: 1 },
  missing: {
    ...font.medium,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.45,
    color: c.textSecondary,
  },
  loginLink: { minHeight: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
  loginLinkText: {
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  loginLinkAccent: {
    ...font.semiBold,
    color: c.primary,
  },
};
}
