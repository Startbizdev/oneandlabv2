import { StyleSheet } from 'react-native';
import { font, makeStyles, radius, spacing } from '@/theme';

/** Sections de la fiche RDV : même carte que `Card` (surface blanche, trait discret, sans ombre). */
export const useRdvDetailSectionStyles = makeStyles(({ colors: c, text }) => ({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.cardBorder,
    overflow: 'hidden',
  },
  sectionRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  /** Libellé au-dessus d'une valeur (« Date », « Adresse »…). */
  fieldLabel: {
    ...text.caption,
    ...font.medium,
    color: c.textTertiary,
  },
}));
