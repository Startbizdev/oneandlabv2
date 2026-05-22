import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Shield } from 'lucide-react-native';
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
import { PRO_SANTE_EMPLOIS } from '@/constants/pro-emploi';
import { showAppNotAccessibleAlert } from '@/lib/auth/mobile-access';
import { useAuthStore, isMobileRole } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { getRoleHome } from '@/features/auth/hooks/use-auth-guard';
import { registerHeaderTitle } from '@/navigation/RegisterHeaderTitle';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface RegisterScreenProps {
  role?: RegisterRole;
}

export function RegisterScreen({ role: roleProp }: RegisterScreenProps) {
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
  const [rpps, setRpps] = useState('');
  const [adeli, setAdeli] = useState('');
  const [emploi, setEmploi] = useState('');
  const [showEmploiList, setShowEmploiList] = useState(false);
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
    email.trim() && firstName.trim() && lastName.trim() && rpps.replace(/\s/g, '').length >= 9 && gender;
  const canSubmitPro =
    email.trim() && firstName.trim() && lastName.trim() && adeli.replace(/\s/g, '').length >= 9 && emploi.trim();
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
          address: address?.label?.trim() || undefined,
          ...(role === 'nurse'
            ? { rpps: rpps.replace(/\s/g, ''), gender }
            : { adeli: adeli.replace(/\s/g, ''), emploi: emploi.trim() }),
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
      router.replace(getRoleHome(r));
    } catch (e) {
      toast('Erreur', { message: (e as Error).message, type: 'error' });
      setOtp('');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'otp' && role === 'patient') {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <View style={styles.row2}>
            <View style={styles.half}>
              <Input label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
            </View>
            <View style={styles.half}>
              <Input label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
            </View>
          </View>
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
                label="Numéro RPPS"
                value={rpps}
                onChangeText={setRpps}
                keyboardType="number-pad"
                maxLength={11}
                placeholder="12345678901"
                hint="11 chiffres"
              />
            </>
          ) : null}

          {role === 'pro' ? (
            <>
              <Text style={styles.fieldLabel}>Profession (emploi)</Text>
              <Pressable onPress={() => setShowEmploiList((v) => !v)} style={styles.selectBtn}>
                <Text style={emploi ? styles.selectValue : styles.selectPlaceholder}>
                  {emploi || 'Rechercher votre profession…'}
                </Text>
              </Pressable>
              {showEmploiList ? (
                <View style={styles.emploiList}>
                  {PRO_SANTE_EMPLOIS.map((e) => (
                    <Pressable
                      key={e}
                      onPress={() => {
                        setEmploi(e);
                        setShowEmploiList(false);
                      }}
                      style={styles.emploiItem}
                    >
                      <Text style={styles.emploiText}>{e}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Input
                label="Numéro Adeli"
                value={adeli}
                onChangeText={setAdeli}
                keyboardType="number-pad"
                maxLength={9}
                placeholder="123456789"
                hint="9 chiffres"
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[3],
  },
  form: {
    gap: spacing[3],
  },
  row2: { flexDirection: 'row', gap: spacing[3] },
  half: { flex: 1 },
  fieldLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  selectBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
  },
  selectPlaceholder: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textTertiary,
  },
  selectValue: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  emploiList: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: -spacing[2],
  },
  emploiItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  emploiText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  loginLink: { alignItems: 'center', paddingTop: spacing[2] },
  loginLinkText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  loginLinkAccent: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
});
