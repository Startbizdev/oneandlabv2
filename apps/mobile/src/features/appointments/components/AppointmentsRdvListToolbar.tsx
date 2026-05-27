import { StyleSheet, View } from 'react-native';
import type { Href } from 'expo-router';
import { AppointmentsBookCta } from '@/features/appointments/components/AppointmentsBookCta';
import {
  AppointmentsListFilterBar,
  type FilterChip,
} from '@/features/appointments/components/AppointmentsListFilterBar';
import { colors, spacing } from '@/theme';

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

/** Barre recherche + filtres (sticky au-dessus de la liste). */
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
  label = 'Prendre un rendez-vous',
}: BookHeaderProps) {
  return (
    <View style={rdvListChromeStyles.listHeader}>
      <AppointmentsBookCta href={href} label={label} />
    </View>
  );
}

export const rdvListChromeStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  listHeader: {
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  errorWrap: {
    flex: 1,
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
  },
});
