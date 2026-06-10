import { useAppColors } from '@/theme/use-app-colors';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme';
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

  if (sent) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          Si un compte existe, vous recevrez un email avec un lien et un code pour choisir un nouveau mot de
          passe.
        </Text>
        <Button title="Ouvrir ma messagerie" variant="outline" onPress={() => Linking.openURL('message:')} fullWidth />
        <Pressable onPress={() => Linking.openURL(webAppUrl('/reset-password'))}>
          <Text style={[styles.link, { color: c.primary }]}>Réinitialiser sur le web</Text>
        </Pressable>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={14} color={colors.textSecondary} strokeWidth={2} />
          <Text style={styles.backText}>Retour à la connexion</Text>
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
      <Pressable onPress={onBack} style={styles.backBtn}>
        <ArrowLeft size={14} color={colors.textSecondary} strokeWidth={2} />
        <Text style={styles.backText}>Retour à la connexion</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[3] },
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.45 },
  link: { textAlign: 'center', fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, paddingVertical: spacing[2] },
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
