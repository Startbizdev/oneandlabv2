import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { SelectField } from '@/components/ui/SelectField';
import { buildSettingsStyles } from '@/components/ui/SettingsRow';
import { Textarea } from '@/components/ui/Textarea';
import { submitContactForm } from '@/features/help/api/contact.service';
import { SUPPORT_CONTACT_TYPES } from '@/features/help/constants/support-contact-types';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import { useAppColors } from '@/theme/use-app-colors';
import { spacing, iconSize, ICON_STROKE_WIDTH, AppText, useStyles, type Theme } from '@/theme';

const ROLE_LABELS: Record<string, string> = {
  patient: 'Patient',
  nurse: 'Infirmier ou infirmière',
  pro: 'Professionnel de santé',
  preleveur: 'Préleveur',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { name?: string; email?: string; message?: string };

function displayName(first?: string, last?: string, email?: string) {
  const full = [first?.trim(), last?.trim()].filter(Boolean).join(' ');
  return full || email?.split('@')[0] || '';
}

function validate(name: string, email: string, message: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = 'Indiquez votre nom.';
  if (!email.trim()) errors.email = 'Indiquez l’e-mail où vous répondre.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Adresse e-mail invalide.';
  if (!message.trim()) errors.message = 'Décrivez votre demande.';
  return errors;
}

export function SupportScreen() {
  const c = useAppColors();
  const settings = useStyles(buildSettingsStyles);
  const styles = useStyles(buildStyles);

  const { show: toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const defaultName = displayName(user?.first_name, user?.last_name, user?.email);
  const defaultEmail = user?.email ?? '';

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [contactType, setContactType] = useState('app_mobile');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [metaOpen, setMetaOpen] = useState(false);

  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : '';

  // Le serveur joint lui-même ces informations depuis la session ; rien n'est envoyé par l'app.
  const accountRows = [
    { label: 'Identifiant', value: user?.id ?? '—' },
    { label: 'Rôle', value: roleLabel || '—' },
    { label: 'E-mail du compte', value: user?.email ?? '—' },
  ];

  const send = useMutation({
    mutationFn: () =>
      submitContactForm({
        name: name.trim(),
        email: email.trim(),
        contactType,
        message: message.trim(),
      }),
    onSuccess: (res) => {
      toast(res.message ?? 'Message envoyé', {
        type: 'success',
        message: `Nous vous répondrons à ${email.trim()}.`,
      });
      setMessage('');
    },
    onError: (e) => handleApiError(e, toast, 'contactSupport'),
  });

  const onSubmit = () => {
    const next = validate(name, email, message);
    setErrors(next);
    if (next.name || next.email || next.message) return;
    send.mutate();
  };

  const clearError = (field: keyof FieldErrors) => setErrors((e) => ({ ...e, [field]: undefined }));
  const Chevron = metaOpen ? ChevronUp : ChevronDown;

  return (
    <ProfileSubScreenLayout saveTitle="Envoyer le message" onSave={onSubmit} saving={send.isPending}>
      <AppText variant="secondary">Notre équipe vous répond par e-mail.</AppText>

      <View style={styles.form}>
        <Input
          label="Votre nom"
          value={name}
          onChangeText={(v) => {
            setName(v);
            clearError('name');
          }}
          autoCapitalize="words"
          error={errors.name}
        />
        <Input
          label="E-mail de réponse"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            clearError('email');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email}
        />
        <SelectField
          label="Motif"
          value={contactType}
          options={SUPPORT_CONTACT_TYPES}
          onChange={setContactType}
          sheetTitle="Motif du contact"
        />
        <Textarea
          label="Message"
          value={message}
          onChangeText={(v) => {
            setMessage(v);
            clearError('message');
          }}
          placeholder="Décrivez votre question ou le problème rencontré…"
          error={errors.message}
        />
      </View>

      <View style={settings.sectionCard}>
        <Pressable
          onPress={() => setMetaOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: metaOpen }}
          style={({ pressed }) => [styles.metaHeader, pressed && settings.pressed]}
        >
          <View style={[settings.texts, styles.metaTexts]}>
            <AppText style={settings.label}>Infos jointes automatiquement</AppText>
            <AppText variant="caption">Votre compte, inutile de le recopier.</AppText>
          </View>
          <Chevron size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>
        {metaOpen
          ? accountRows.map((row) => (
              <View key={row.label}>
                <View style={styles.divider} />
                <View style={styles.metaRow}>
                  <AppText variant="caption">{row.label}</AppText>
                  <AppText variant="body" selectable>
                    {row.value}
                  </AppText>
                </View>
              </View>
            ))
          : null}
      </View>
    </ProfileSubScreenLayout>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    form: {
      gap: spacing[4],
    },
    metaHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing[3],
      minHeight: 56,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    metaTexts: {
      flex: 1,
      minWidth: 0,
    },
    metaRow: {
      gap: spacing[0.5],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: spacing[4],
      backgroundColor: c.borderLight,
    },
  };
}
