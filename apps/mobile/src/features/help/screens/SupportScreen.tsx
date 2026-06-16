import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { UserCircle2 } from 'lucide-react-native';
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
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const ROLE_LABELS: Record<string, string> = {
  patient: 'Patient',
  nurse: 'Infirmier(ère)',
  pro: 'Professionnel de santé',
  preleveur: 'Préleveur',
};

function displayName(first?: string, last?: string, email?: string) {
  const full = [first?.trim(), last?.trim()].filter(Boolean).join(' ');
  return full || email?.split('@')[0] || '';
}

export function SupportScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_help_screens_SupportScreen_tsx_SupportScreen_styles');

  const { show: toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const appMeta = useMemo(() => getAppMeta(), []);

  const defaultName = displayName(user?.first_name, user?.last_name, user?.email);
  const defaultEmail = user?.email ?? '';

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [contactType, setContactType] = useState('app_mobile');
  const [message, setMessage] = useState('');

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
    if (!name.trim()) {
      toast('Nom requis', { type: 'error' });
      return;
    }
    if (!email.trim()) {
      toast('E-mail requis', { type: 'error' });
      return;
    }
    if (!message.trim()) {
      toast('Message requis', { type: 'error' });
      return;
    }
    send.mutate();
  };

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
        <Text style={styles.lead}>
          Décrivez votre demande. Les informations de votre compte Cary ci-dessous seront transmises
          à notre équipe pour un traitement plus rapide.
        </Text>

        <View style={[styles.card, elevation.xs]}>
          <Cluster
            gap={spacing[3]}
            leading={
              <View style={styles.cardIcon}>
                <UserCircle2 size={22} color={c.primary} strokeWidth={2} />
              </View>
            }
          >
            <Text style={styles.cardTitle}>Informations du compte</Text>
          </Cluster>
          <Text style={styles.cardHint}>
            Ces données sont jointes automatiquement — vous n’avez pas besoin de les recopier dans
            votre message.
          </Text>
          {accountRows.map((row, index) => (
            <View key={row.label}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{row.label}</Text>
                <Text style={styles.metaValue} selectable>
                  {row.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.form}>
          <Input label="Votre nom" value={name} onChangeText={setName} autoCapitalize="words" />
          <Input
            label="E-mail de réponse"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
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
            onChangeText={setMessage}
            placeholder="Décrivez votre question ou le problème rencontré…"
            numberOfLines={6}
            style={styles.textarea}
          />
        </View>
      </ProfileSubScreenLayout>
    </>
  );
}

function buildStyles(c: AppColors) {
  return {
  lead: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
  },
  cardHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    lineHeight: fontSize.xs * 1.45,
    marginBottom: spacing[1],
  },
  metaRow: {
    gap: spacing[1],
    paddingVertical: spacing[2],
  },
  metaLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    letterSpacing: 0.2,
  },
  metaValue: {
    fontFamily: fontFamily.regular,
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
