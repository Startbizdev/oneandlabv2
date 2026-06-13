import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Text, View } from 'react-native';
import { FilePenLine } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Zone visible tant qu'aucun RDV n'est choisi — évite l'effet « il faut scroller ». */
export function PrescriptionComposerAwaitingRdv() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionComposerAwaitingRdv');

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <FilePenLine size={20} color={c.textTertiary} strokeWidth={2} />
      </View>
      <Text style={styles.title}>Rédaction de l'ordonnance</Text>
      <Text style={styles.hint}>
        Sélectionnez d'abord un rendez-vous ci-dessus. Le formulaire s'affichera ici.
      </Text>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    wrap: {
      alignItems: 'center' as const,
      gap: spacing[2],
      paddingVertical: spacing[6],
      paddingHorizontal: spacing[4],
      borderRadius: radius.xl,
      borderWidth: 1,
      borderStyle: 'dashed' as const,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
      textAlign: 'center' as const,
    },
    hint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      textAlign: 'center' as const,
      lineHeight: fontSize.sm * 1.5,
      maxWidth: 280,
    },
  };
}
