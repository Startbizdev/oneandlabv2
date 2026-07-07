import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { ArrowLeft } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { webAppUrl } from '@/config/env';

interface Props {
  email: string;
  onEmailChange: (value: string) => void;
  sent: boolean;
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export function ForgotPasswordPanel({ email, onEmailChange, sent, loading, onSubmit, onBack }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_auth_components_ForgotPasswordPanel_tsx_ForgotPasswordPanel_styles');


  if (sent) {
    return (
      <View style={styles.wrap}>
        <AppText style={[styles.body, { color: c.textSecondary }]}>
          Si un compte existe, vous recevrez un email avec un lien et un code pour choisir un nouveau mot de
          passe.
        </AppText>
        <Button title="Ouvrir ma messagerie" variant="outline" onPress={() => Linking.openURL('message:')} fullWidth />
        <Pressable onPress={() => Linking.openURL(webAppUrl('/reset-password'))}>
          <AppText style={[styles.link, { color: c.primary }]}>Réinitialiser sur le web</AppText>
        </Pressable>
        <Pressable onPress={onBack}>
          <Row gap={spacing[2]} align="center" justify="center" style={styles.backBtn}>
            <ArrowLeft size={iconSize.xs} color={c.textSecondary} strokeWidth={2} />
            <AppText style={styles.backText}>Retour à la connexion</AppText>
          </Row>
        </Pressable>
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
      <Pressable onPress={onBack}>
        <Row gap={spacing[2]} align="center" justify="center" style={styles.backBtn}>
          <ArrowLeft size={iconSize.xs} color={c.textSecondary} strokeWidth={2} />
          <AppText style={styles.backText}>Retour à la connexion</AppText>
        </Row>
      </Pressable>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[3] },
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.45 },
  link: { textAlign: 'center' as const, fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, paddingVertical: spacing[2] },
  backBtn: {
    paddingVertical: spacing[1],
  },
  backText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
};
}
