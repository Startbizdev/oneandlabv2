import { useAppColors } from '@/theme/use-app-colors';
import { View } from 'react-native';
import { FilePenLine } from 'lucide-react-native';
import { radius, spacing, iconSize, AppText, useLayoutMetrics, centeredCopyMaxWidth, useStyles, font, type Theme } from '@/theme';

/** Zone visible tant qu'aucun RDV n'est choisi — évite l'effet « il faut scroller ». */
export function PrescriptionComposerAwaitingRdv() {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useStyles(buildStyles);
  const hintMaxWidth = centeredCopyMaxWidth(layout);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <FilePenLine size={iconSize.md} color={c.textTertiary} strokeWidth={2} />
      </View>
      <AppText style={styles.title}>Rédaction de l'ordonnance</AppText>
      <AppText style={[styles.hint, { maxWidth: hintMaxWidth }]}>
        Sélectionnez d'abord un rendez-vous ci-dessus. Le formulaire s'affichera ici.
      </AppText>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
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
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
      textAlign: 'center' as const,
    },
    hint: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      textAlign: 'center' as const,
      lineHeight: fontSize.sm * 1.5,
    },
  };
}
