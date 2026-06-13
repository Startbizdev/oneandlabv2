import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import type { Href } from 'expo-router';
import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { AppointmentsBookCta } from '@/features/appointments/components/AppointmentsBookCta';
import {
  AppointmentsListFilterBar,
  type FilterChip,
} from '@/features/appointments/components/AppointmentsListFilterBar';
import { spacing } from '@/theme';

/** Espacement vertical uniforme entre blocs chrome (recherche, CTA, liste). */
export const RDV_LIST_CHROME_GAP = spacing[2];

/** Placeholder recherche unifié (pro / patient / préleveur). */
export const APPOINTMENTS_RDV_SEARCH_PLACEHOLDER = 'Nom, soin, adresse…';

/** Placeholder infirmier — inclut le téléphone patient. */
export const APPOINTMENTS_RDV_SEARCH_PLACEHOLDER_NURSE = 'Nom, téléphone, adresse…';

interface FilterHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onOpenFilters: () => void;
  advancedFilterCount: number;
  chips: FilterChip[];
}

/** Barre recherche + filtres (défile avec la liste). */
export function AppointmentsRdvListFilterHeader({
  search,
  onSearchChange,
  searchPlaceholder = APPOINTMENTS_RDV_SEARCH_PLACEHOLDER,
  onOpenFilters,
  advancedFilterCount,
  chips,
}: FilterHeaderProps) {
  return (
    <AppointmentsListFilterBar
      embedded
      followedByBookCta
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      onOpenFilters={onOpenFilters}
      advancedFilterCount={advancedFilterCount}
      chips={chips}
    />
  );
}

interface BookHeaderProps {
  href: Href;
  label?: string;
}

/** CTA « Prendre un rendez-vous » sous la barre de recherche. */
export function AppointmentsRdvListBookHeader({
  href,
  label,
}: BookHeaderProps) {
  return <AppointmentsBookCta href={href} {...(label != null ? { label } : {})} />;
}

function buildRdvListChromeStyles(c: AppColors) {
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
  return useThemedStyles(buildRdvListChromeStyles);
}

/** @deprecated Préférer useRdvListChromeStyles() dans les écrans fonctionnels. */
export const rdvListChromeStyles = StyleSheet.create({
  container: { minWidth: 0, flex: 1 },
  listContent: {
    minWidth: 0,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  listHeader: {
    alignSelf: 'stretch' as const,
    width: '100%' as const,
  },
  errorWrap: {
    minWidth: 0,
    flex: 1,
    paddingHorizontal: spacing[4],
    justifyContent: 'center' as const,
  },
});

export function RdvListChromeContainer({ children }: { children: ReactNode }) {
  const styles = useRdvListChromeStyles();
  return <View style={styles.container}>{children}</View>;
}
