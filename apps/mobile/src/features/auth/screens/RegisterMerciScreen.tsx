import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function RegisterMerciScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const router = useRouter();

  const roleLabel =
    type === 'nurse' ? 'infirmier·ère' : type === 'pro' ? 'professionnel de santé' : 'professionnel';

  return (
    <View style={styles.container}>
      <View style={[styles.card, elevation.sm]}>
        <View style={styles.iconWrap}>
          <CheckCircle2 size={40} color={colors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Demande bien reçue</Text>
        <Text style={styles.sub}>Merci pour votre inscription sur Cary.</Text>
        <Text style={styles.body}>
          Notre équipe va analyser votre profil {roleLabel} et reviendra vers vous dans les plus brefs
          délais pour finaliser votre accès.
        </Text>
        <Text style={styles.hint}>
          Vous recevrez un email dès que votre compte sera activé.
        </Text>
        <View style={styles.actions}>
          <Button title="Retour à l'accueil" fullWidth onPress={() => router.replace('/(auth)/welcome')} />
          <Button
            title="Se connecter"
            variant="outline"
            fullWidth
            onPress={() => router.replace('/(auth)/welcome')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing[5],
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.55,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: fontSize.xs * 1.5,
  },
  actions: {
    width: '100%',
    gap: spacing[3],
    marginTop: spacing[4],
  },
});
