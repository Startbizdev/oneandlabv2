/**
 * Liste RDV infirmier — Mes demandes (`/nurse/demandes`) et Mes rendez-vous (`/nurse/appointments`)
 * passent par le même `AppointmentListPage` avec `basePath === '/nurse'`.
 *
 * Audit design (à garder alignés) :
 * - Grille : même nombre de colonnes aux mêmes breakpoints + même gap entre cartes.
 * - Carte : padding / gap alignés sur les cartes RDV patient (`px-4 py-2.5 sm:px-5 sm:py-3`, `gap-2`).
 * - Page : même rythme vertical toolbar → liste → pagination (évite « une page aérée, l’autre tassée »).
 */

/** Espacement entre les cartes (gouttière grille) */
export const NURSE_APPOINTMENT_LIST_GRID_GAP = 'gap-4';

/** Colonnes responsive : lecture confortable, 3 cartes dès lg avec gap-4 */
export const NURSE_APPOINTMENT_LIST_GRID_COLS =
  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

/** Corps cliquable carte : aligné densité / padding cartes RDV patient (`PatientRdvListRow` + lien) */
export const NURSE_APPOINTMENT_LIST_CARD_BODY = 'gap-2 px-4 py-2.5 sm:px-5 sm:py-3';

/** Bloc résultats (grille + pagination) : espacement interne */
export const NURSE_APPOINTMENT_LIST_RESULTS_STACK = 'space-y-4';

/** Racine page liste infirmier : espacement entre barre filtres et contenu */
export const NURSE_APPOINTMENT_LIST_PAGE_STACK = 'space-y-4 lg:space-y-5';
