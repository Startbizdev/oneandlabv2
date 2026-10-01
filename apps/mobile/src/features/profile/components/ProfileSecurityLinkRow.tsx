import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, View } from 'react-native';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { useRouter } from 'expo-router';
import { ChevronRight, Lock } from 'lucide-react-native';
import { elevation, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

/** Lien visible depuis Mon profil vers mot de passe + biométrie. */
export function ProfileSecurityLinkRow() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
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
            <Lock size={iconSize.md} color={c.primary} strokeWidth={2.25} />
          </View>
        }
        body={
          <>
            <AppText style={[styles.title, { color: c.textPrimary }]}>Mot de passe et connexion</AppText>
            <AppText style={[styles.sub, { color: c.textSecondary }]}>
              Créer ou modifier votre mot de passe · biométrie
            </AppText>
          </>
        }
        actions={<ChevronRight size={iconSize.mdSm} color={c.textTertiary} strokeWidth={2} />}
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.borderLight }]}
      />
    </Pressable>
  );
}

function buildStyles({ fontSize }: Theme) {
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
    title: { ...font.semiBold, fontSize: fontSize.base },
    sub: { ...font.regular, fontSize: fontSize.xs, lineHeight: fontSize.xs * 1.4 },
  };
}

