import { useAppColors } from '@/theme/use-app-colors';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { SelectField } from '@/components/ui/SelectField';
import { Textarea } from '@/components/ui/Textarea';
import { submitContactForm } from '@/features/help/api/contact.service';
import { SUPPORT_CONTACT_TYPES } from '@/features/help/constants/support-contact-types';
import { getAppMeta } from '@/features/help/utils/app-meta';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import { elevation, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

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
  const styles = useStyles(buildStyles);

  const { show: toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const appMeta = useMemo(() => getAppMeta(), []);

  const defaultName = displayName(user?.first_name, user?.last_name, user?.email);
  const defaultEmail = user?.email ?? '';

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [contactType, setContactType] = useState('app_mobile');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [metaOpen, setMetaOpen] = useState(false);

  const accountRows = useMemo(
    () => [
      { label: 'Identifiant', value: user?.id ?? '—' },
      { label: 'Rôle', value: user?.role ? (ROLE_LABELS[user.role] ?? user.role) : '—' },
      { label: 'E-mail du compte', value: user?.email ?? '—' },
      { label: 'Application', value: `Cary mobile ${appMeta.appVersion} (${appMeta.buildNumber})` },
      { label: 'Appareil', value: `${appMeta.platform} — ${appMeta.deviceModel}` },
    ],
    [user, appMeta],
  );

  const send = useMutation({
    mutationFn: () =>
      submitContactForm({
        name: name.trim(),
        email: email.trim(),
        contactType,
        message: message.trim(),
        context: {
          'Identifiant compte': user?.id ?? '',
          Rôle: user?.role ? (ROLE_LABELS[user.role] ?? user.role) : '',
          'E-mail compte': user?.email ?? '',
          'Version app': `${appMeta.appVersion} (${appMeta.buildNumber})`,
          Plateforme: appMeta.platform,
          Appareil: appMeta.deviceModel,
        },
      }),
    onSuccess: (res) => {
      toast(res.message ?? 'Message envoyé', {
        type: 'success',
        message: 'Nous vous répondrons à contact@cary.bio.',
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

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Contacter le support',
        }}
      />
      <ProfileSubScreenLayout
        saveTitle="Envoyer le message"
        onSave={onSubmit}
        saving={send.isPending}
      >
        <AppText style={styles.lead}>
          Décrivez votre demande, notre équipe vous répond par e-mail.
        </AppText>

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
            numberOfLines={6}
            style={styles.textarea}
            error={errors.message}
          />
        </View>

        <View style={[styles.card, elevation.xs]}>
          <Pressable
            onPress={() => setMetaOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityState={{ expanded: metaOpen }}
            accessibilityLabel="Infos jointes automatiquement"
            style={styles.cardHeader}
          >
            <View style={styles.cardHeaderTexts}>
              <AppText style={styles.cardTitle}>Infos jointes automatiquement</AppText>
              <AppText style={styles.cardHint}>
                Compte et appareil, pour traiter votre demande plus vite. Inutile de les recopier.
              </AppText>
            </View>
            {metaOpen ? (
              <ChevronUp size={iconSize.mdSm} color={c.textTertiary} strokeWidth={2} />
            ) : (
              <ChevronDown size={iconSize.mdSm} color={c.textTertiary} strokeWidth={2} />
            )}
          </Pressable>
          {metaOpen
            ? accountRows.map((row) => (
                <View key={row.label}>
                  <View style={styles.divider} />
                  <View style={styles.metaRow}>
                    <AppText style={styles.metaLabel}>{row.label}</AppText>
                    <AppText style={styles.metaValue} selectable>
                      {row.value}
                    </AppText>
                  </View>
                </View>
              ))
            : null}
        </View>
      </ProfileSubScreenLayout>
    </>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    lead: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      paddingHorizontal: spacing[4],
    },
    cardHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[3],
      minHeight: 44,
      paddingVertical: spacing[3],
    },
    cardHeaderTexts: {
      flex: 1,
      minWidth: 0,
      gap: spacing[0.5],
    },
    cardTitle: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    cardHint: {
      ...font.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      lineHeight: fontSize.xs * 1.45,
    },
    metaRow: {
      gap: spacing[1],
      paddingVertical: spacing[2],
    },
    metaLabel: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      letterSpacing: 0.2,
    },
    metaValue: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      lineHeight: fontSize.sm * 1.4,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderLight,
    },
    form: {
      gap: spacing[4],
    },
    textarea: {
      minHeight: 140,
      textAlignVertical: 'top' as const,
    },
  };
}
