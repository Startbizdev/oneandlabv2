/**
 * État partagé entre `layouts/patient.vue` (recherche mobile sous le header)
 * et `pages/patient/index.vue` (filtres + même requête sur desktop).
 */
export function usePatientRdvListSearch() {
  const searchQuery = useState<string>('patient-rdv-list-search-query', () => '');
  const filtersSectionActive = useState<boolean>('patient-rdv-list-filters-active', () => false);

  return { searchQuery, filtersSectionActive };
}
