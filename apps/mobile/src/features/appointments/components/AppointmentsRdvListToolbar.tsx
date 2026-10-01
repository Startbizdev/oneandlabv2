import { spacing, useStyles, type Theme } from '@/theme';

/** Espacement vertical uniforme : sous le header, entre recherche / CTA / carte carnet. */
export const RDV_LIST_SEARCH_EDGE = spacing[3];

/** Placeholder recherche unifié (pro / patient / préleveur). */
export const APPOINTMENTS_RDV_SEARCH_PLACEHOLDER = 'Nom, soin, adresse…';

/** Placeholder infirmier — inclut le téléphone patient. */
export const APPOINTMENTS_RDV_SEARCH_PLACEHOLDER_NURSE = 'Nom, téléphone, adresse…';

function buildRdvListChromeStyles({ colors: c }: Theme) {
  return {
    container: { minWidth: 0, flex: 1, backgroundColor: c.background },
    listContent: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[8],
      flexGrow: 1,
    },
    listHeader: {
      alignSelf: 'stretch' as const,
      width: '100%' as const,
      gap: spacing[2],
    },
    listChrome: {
      alignSelf: 'stretch' as const,
      width: '100%' as const,
      gap: RDV_LIST_SEARCH_EDGE,
      paddingHorizontal: spacing[4],
      backgroundColor: c.background,
    },
    errorWrap: {
      minWidth: 0,
      flex: 1,
      paddingHorizontal: spacing[4],
      justifyContent: 'center' as const,
    },
  };
}

export function useRdvListChromeStyles() {
  return useStyles(buildRdvListChromeStyles);
}
