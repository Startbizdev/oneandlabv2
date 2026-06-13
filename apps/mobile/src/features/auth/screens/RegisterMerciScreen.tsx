import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function RegisterMerciScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_auth_screens_RegisterMerciScreen_tsx_styles');
  const { type } = useLocalSearchParams<{ type?: string }>();
  const router = useRouter();

  const roleLabel =
    type === 'nurse' ? 'infirmier·ère' : type === 'pro' ? 'professionnel de santé' : 'professionnel';

  return (
    <View style={styles.container}>
      <View style={[styles.card, elevation.sm]}>
        <View style={styles.iconWrap}>
          <CheckCircle2 size={40} color={c.primary} strokeWidth={2} />
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
          <Button title="Retour à l'accueil" fullWidth size="lg" onPress={() => router.replace('/(auth)/welcome')} />
          <Button
            title="Se connecter"
            variant="outline"
            fullWidth
            size="lg"
            onPress={() => router.replace('/(auth)/welcome')}
          />
        </View>
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.background,
    padding: spacing[5],
    justifyContent: 'center' as const,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[6],
    alignItems: 'center' as const,
    gap: spacing[3],
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: spacing[2],
  },
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['2xl'],
    color: c.textPrimary,
    textAlign: 'center' as const,
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: c.textSecondary,
    textAlign: 'center' as const,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    textAlign: 'center' as const,
    lineHeight: fontSize.sm * 1.55,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textAlign: 'center' as const,
    lineHeight: fontSize.xs * 1.5,
  },
  actions: {
    width: '100%' as const,
    gap: spacing[3],
    marginTop: spacing[4],
  },
};
}

