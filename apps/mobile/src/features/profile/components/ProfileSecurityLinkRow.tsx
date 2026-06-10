import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Lock } from 'lucide-react-native';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Lien visible depuis Mon profil vers mot de passe + biométrie. */
export function ProfileSecurityLinkRow() {
  const c = useAppColors();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/profile/security')}
      style={[styles.card, elevation.xs, { backgroundColor: c.surface, borderColor: c.borderLight }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: c.primaryLight }]}>
        <Lock size={20} color={c.primary} strokeWidth={2.25} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Mot de passe et connexion</Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Créer ou modifier votre mot de passe · biométrie
        </Text>
      </View>
      <ChevronRight size={18} color={c.textTertiary} strokeWidth={2} />
    </Pressable>
  );
}

function buildStyles(_c: AppColors) {
  return {
    card: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[3],
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      padding: spacing[4],
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    textWrap: { flex: 1, gap: spacing[0.5] },
    title: { fontFamily: fontFamily.semiBold, fontSize: fontSize.base },
    sub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, lineHeight: fontSize.xs * 1.4 },
  };
}

const styles = new Proxy({} as Record<string, unknown>, {
  get(_t, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('ProfileSecurityLinkRow_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
