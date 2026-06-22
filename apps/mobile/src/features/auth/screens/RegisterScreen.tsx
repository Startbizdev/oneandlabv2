import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import {
  PROFESSIONAL_ID_LABEL,
  splitProfessionalId,
  validateProfessionalId,
} from '@oneandlab/shared-types';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Shield } from 'lucide-react-native';
import { FormScreen } from '@/components/layout/FormScreen';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { REGISTER_META } from '@/features/auth/constants/register-meta';
import {
  guestToUser,
  submitRegistrationRequest,
  type RegisterRole,
} from '@/features/auth/api/registration.service';
import { verifyOtp } from '@/features/auth/api/auth.service';
import { ProEmploiSelect } from '@/features/auth/components/ProEmploiSelect';
import { showAppNotAccessibleAlert } from '@/lib/auth/mobile-access';
import { useAuthStore, isMobileRole } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { getRoleHome } from '@/features/auth/hooks/use-auth-guard';
import { offerBiometricEnrollment } from '@/features/auth/utils/offer-biometric-enrollment';
import { registerHeaderTitle } from '@/navigation/RegisterHeaderTitle';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface RegisterScreenProps {
  role?: RegisterRole;
}

export function RegisterScreen({ role: roleProp }: RegisterScreenProps) {
  const styles = useThemedStyles(buildStyles, 'features_auth_screens_RegisterScreen_tsx_styles');
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

  const canSubmitPatient =
    email.trim() && firstName.trim() && lastName.trim() && birthDate.trim() && gender;
  const canSubmitNurse =
    email.trim() &&
    firstName.trim() &&
    lastName.trim() &&
    !validateProfessionalId(professionalId) &&
    gender;
  const canSubmitPro =
    email.trim() && firstName.trim() && lastName.trim() && proRpps.replace(/\s/g, '').length >= 11 && emploi.trim();
  const canSubmit =
    role === 'patient' ? canSubmitPatient : role === 'nurse' ? canSubmitNurse : canSubmitPro;

  async function onSubmitForm() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      if (role === 'patient') {
        const body: Parameters<typeof guestToUser>[0] = {
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || undefined,
          birth_date: birthDate.trim(),
          gender,
        };
        if (address?.label) {
          body.address = {
            label: address.label,
            lat: address.lat,
            lng: address.lng,
          };
        }
        const res = await guestToUser(body);
        const uid = res.data?.user_id ?? (res as { user_id?: string }).user_id;
        const sid = res.data?.session_id ?? (res as { session_id?: string }).session_id;
        if (!res.success || !uid) throw new Error(res.error ?? 'Impossible de créer le compte');
        setUserId(uid);
        setSessionId(sid ?? '');
        setStep('otp');
        setTimeout(() => otpRef.current?.focus(), 400);
        toast('Compte créé', { message: 'Un code a été envoyé à votre email', type: 'success' });
      } else {
        const payload = {
          role: role as 'nurse' | 'pro',
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || undefined,
          address: address?.label?.trim()
            ? { label: address.label.trim(), lat: address.lat, lng: address.lng }
            : undefined,
          ...(role === 'nurse'
            ? (() => {
                const split = splitProfessionalId(professionalId);
                return {
                  ...(split.rpps ? { rpps: split.rpps } : {}),
                  ...(split.adeli ? { adeli: split.adeli } : {}),
                  gender,
                };
              })()
            : { rpps: proRpps.replace(/\s/g, ''), emploi: emploi.trim() }),
        };
        const res = await submitRegistrationRequest(payload);
        if (!res.success) throw new Error(res.error ?? "Impossible d'envoyer la demande");
        router.replace(`/(auth)/register/merci?type=${role}` as never);
      }
    } catch (e) {
      toast('Erreur', { message: (e as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp() {
    const cleaned = otp.replace(/[^0-9]/g, '');
    if (cleaned.length !== 6) {
      toast('Code incomplet', { message: 'Entrez les 6 chiffres', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOtp(userId, cleaned, sessionId || undefined);
      const token = (res as { token?: string }).token;
      const user = (res as { user?: unknown }).user;
      if (!res.success || !token) throw new Error(res.error ?? 'Code incorrect');
      await setSession(token, user as Parameters<typeof setSession>[1]);
      const me = await fetchMe();
      const r = me?.role ?? 'patient';
      if (!isMobileRole(r)) {
        await useAuthStore.getState().clearSession();
        showAppNotAccessibleAlert(r);
        return;
      }
      const sessionUser = (me ?? user) as Parameters<typeof setSession>[1];
      offerBiometricEnrollment(token, sessionUser, () => router.replace(getRoleHome(r)));
    } catch (e) {
      toast('Erreur', { message: (e as Error).message, type: 'error' });
      setOtp('');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'otp' && role === 'patient') {
    return (
      <FormScreen contentContainerStyle={styles.content}>
        <Input
          ref={otpRef}
          label="Code à 6 chiffres"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
        />
        <Button title="Valider le code" loading={loading} onPress={onVerifyOtp} fullWidth size="lg" />
      </FormScreen>
    );
  }

  return (
    <FormScreen contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
          <Input
            label="Email"
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
            label="Téléphone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="06 12 34 56 78"
          />

          {role === 'patient' ? (
            <>
              <BirthDatePicker value={birthDate} onChange={setBirthDate} />
              <GenderSelect value={gender} onChange={setGender} />
            </>
          ) : null}

          {role === 'nurse' ? (
            <>
              <GenderSelect value={gender} onChange={setGender} label="Genre" />
              <Input
                label={PROFESSIONAL_ID_LABEL}
                value={professionalId}
                onChangeText={setProfessionalId}
                keyboardType="number-pad"
                maxLength={11}
                placeholder="123456789 ou 12345678901"
                hint="9 chiffres (Adeli) ou 11 chiffres (RPPS)"
              />
            </>
          ) : null}

          {role === 'pro' ? (
            <>
              <ProEmploiSelect value={emploi} onChange={setEmploi} />
              <Input
                label="Numéro RPPS"
                value={proRpps}
                onChangeText={setProRpps}
                keyboardType="number-pad"
                maxLength={11}
                placeholder="12345678901"
                hint="11 chiffres"
              />
            </>
          ) : null}

          <AddressAutocomplete value={address} onChange={setAddress} label="Adresse (optionnel)" />

          <Button
            title={meta.submit}
            loading={loading}
            disabled={!canSubmit}
            onPress={onSubmitForm}
            fullWidth
            size="lg"
          />

          <Pressable onPress={() => router.replace('/(auth)/welcome')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>
              Déjà un compte ? <Text style={styles.loginLinkAccent}>Se connecter</Text>
            </Text>
          </Pressable>
        </View>
    </FormScreen>
  );
}

function buildStyles(c: AppColors) {
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
  loginLink: { alignItems: 'center' as const, paddingTop: spacing[2] },
  loginLinkText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  loginLinkAccent: {
    fontFamily: fontFamily.semiBold,
    color: c.primary,
  },
};
}

