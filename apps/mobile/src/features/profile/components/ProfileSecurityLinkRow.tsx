import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { useRouter } from 'expo-router';
import { ChevronRight, Lock } from 'lucide-react-native';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Lien visible depuis Mon profil vers mot de passe + biométrie. */
export function ProfileSecurityLinkRow() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'ProfileSecurityLinkRow_styles');
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/profile/security')}
      style={[elevation.xs, { backgroundColor: c.surface, borderColor: c.borderLight }]}
    >
      <ListRowShell
        leading={
          <View style={[styles.iconWrap, { backgroundColor: c.primaryLight }]}>
            <Lock size={20} color={c.primary} strokeWidth={2.25} />
          </View>
        }
        body={
          <>
            <Text style={[styles.title, { color: c.textPrimary }]}>Mot de passe et connexion</Text>
            <Text style={[styles.sub, { color: c.textSecondary }]}>
              Créer ou modifier votre mot de passe · biométrie
            </Text>
          </>
        }
        actions={<ChevronRight size={18} color={c.textTertiary} strokeWidth={2} />}
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.borderLight }]}
      />
    </Pressable>
  );
}

function buildStyles(_c: AppColors) {
  return {
    card: {
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    textWrap: { gap: spacing[0.5] },
    title: { fontFamily: fontFamily.semiBold, fontSize: fontSize.base },
    sub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, lineHeight: fontSize.xs * 1.4 },
  };
}

