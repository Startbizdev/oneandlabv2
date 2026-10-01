import { useAppColors } from '@/theme/use-app-colors';
import { Linking, Platform, Pressable, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { ArrowLeft } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/providers/ToastProvider';
import { spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
import { webAppUrl } from '@/config/env';

interface Props {
  email: string;
  onEmailChange: (value: string) => void;
  sent: boolean;
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

/** `message:` n'ouvre la boîte de réception que sur iOS (app Mail) ; Android n'a pas d'équivalent fiable. */
const CAN_OPEN_MAIL_INBOX = Platform.OS === 'ios';

export function ForgotPasswordPanel({ email, onEmailChange, sent, loading, onSubmit, onBack }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();

  function openUrl(url: string) {
    Linking.openURL(url).catch(() => {
      toast('Ouverture impossible', { message: 'Ouvrez votre messagerie manuellement.', type: 'error' });
    });
  }

  const backLink = (
    <Pressable onPress={onBack} accessibilityRole="button" style={styles.linkBtn}>
      <Row gap={spacing[2]} align="center" justify="center">
        <ArrowLeft size={iconSize.xs} color={c.textSecondary} strokeWidth={2} />
        <AppText style={styles.backText}>Retour à la connexion</AppText>
      </Row>
    </Pressable>
  );

  if (sent) {
    return (
      <View style={styles.wrap}>
        <AppText style={[styles.body, { color: c.textSecondary }]}>
          Si un compte existe, vous recevrez un email avec un lien et un code pour choisir un nouveau mot de
          passe.
        </AppText>
        {CAN_OPEN_MAIL_INBOX ? (
          <Button title="Ouvrir ma messagerie" variant="outline" onPress={() => openUrl('message:')} fullWidth />
        ) : null}
        <Pressable
          onPress={() => openUrl(webAppUrl('/reset-password'))}
          accessibilityRole="link"
          style={styles.linkBtn}
        >
          <AppText style={[styles.link, { color: c.primary }]}>Réinitialiser sur le web</AppText>
        </Pressable>
        {backLink}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Input
        label="Email"
        value={email}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="prenom@exemple.fr"
      />
      <Button title="Envoyer" loading={loading} onPress={onSubmit} fullWidth size="lg" />
      {backLink}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    wrap: { gap: spacing[3] },
    body: { ...font.regular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.45 },
    linkBtn: { minHeight: 44, justifyContent: 'center' as const },
    link: { textAlign: 'center' as const, ...font.semiBold, fontSize: fontSize.sm },
    backText: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
  };
}
