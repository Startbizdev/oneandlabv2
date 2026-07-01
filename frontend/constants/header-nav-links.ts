/**
 * Liens du menu utilisateur (header dropdown, etc.) — alignés sur `navigationItems`
 * du layout dashboard (`layouts/dashboard.vue`). Toute entrée retirée de la sidebar
 * doit disparaître ici aussi.
 */
export type HeaderNavLink = { label: string; icon: string; to: string };

const ADMIN_NAV_LINKS: HeaderNavLink[] = [
  { label: 'Tableau de bord', icon: 'i-lucide-layout-dashboard', to: '/admin' },
  { label: 'Inscriptions', icon: 'i-lucide-user-plus', to: '/admin/inscriptions' },
  { label: 'Rendez-vous', icon: 'i-lucide-calendar', to: '/admin/appointments' },
  { label: 'Calendrier', icon: 'i-lucide-calendar-days', to: '/admin/calendar' },
  { label: 'Utilisateurs', icon: 'i-lucide-users', to: '/admin/users' },
  { label: 'Catégories', icon: 'i-lucide-tags', to: '/admin/categories' },
  { label: 'Zones de couverture', icon: 'i-lucide-map', to: '/admin/coverage' },
  { label: 'Avis', icon: 'i-lucide-star', to: '/admin/reviews' },
  { label: 'Notifications', icon: 'i-lucide-bell', to: '/admin/notifications' },
  { label: 'Abonnements', icon: 'i-lucide-credit-card', to: '/admin/abonnements' },
  { label: 'Logs HDS', icon: 'i-lucide-file-text', to: '/admin/logs' },
  { label: 'Mon profil', icon: 'i-lucide-user', to: '/profile' },
];

export const HEADER_NAV_LINKS_BY_ROLE: Record<string, HeaderNavLink[]> = {
  patient: [
    { label: 'Mes rendez-vous', icon: 'i-lucide-calendar', to: '/patient' },
    { label: 'Nouveau rendez-vous', icon: 'i-lucide-calendar-plus', to: '/rendez-vous/nouveau' },
    { label: 'Mes proches', icon: 'i-lucide-users', to: '/patient/relatives' },
    { label: 'Résultats', icon: 'i-lucide-flask-conical', to: '/patient/resultats' },
    { label: 'Mes avis', icon: 'i-lucide-star', to: '/patient/reviews' },
    { label: 'Mon profil', icon: 'i-lucide-user', to: '/profile' },
  ],
  nurse: [
    { label: 'Rendez-vous', icon: 'i-lucide-calendar', to: '/nurse/appointments' },
    { label: 'Mes demandes', icon: 'i-lucide-inbox', to: '/nurse/demandes' },
    { label: 'Calendrier', icon: 'i-lucide-calendar-days', to: '/nurse/calendar' },
    { label: 'Ma tournée', icon: 'i-lucide-list-ordered', to: '/nurse/tournee' },
    { label: 'Patients', icon: 'i-lucide-users', to: '/nurse/patients' },
    { label: 'Résultats', icon: 'i-lucide-flask-conical', to: '/nurse/resultats' },
    { label: 'Ordonnances', icon: 'i-lucide-file-pen-line', to: '/nurse/prescriptions' },
    { label: 'Mes avis', icon: 'i-lucide-star', to: '/nurse/reviews' },
    { label: 'Mon profil', icon: 'i-lucide-user', to: '/profile' },
    { label: 'Abonnement', icon: 'i-lucide-credit-card', to: '/nurse/abonnement' },
  ],
  lab: [
    { label: 'Tableau de bord', icon: 'i-lucide-layout-dashboard', to: '/lab' },
    { label: 'Rendez-vous', icon: 'i-lucide-calendar', to: '/lab/appointments' },
    { label: 'Patients', icon: 'i-lucide-users', to: '/lab/patients' },
    { label: 'Calendrier', icon: 'i-lucide-calendar-days', to: '/lab/calendar' },
    { label: 'Mes avis', icon: 'i-lucide-star', to: '/lab/reviews' },
    { label: 'Statistiques', icon: 'i-lucide-bar-chart', to: '/lab/stats' },
    { label: 'Sous-comptes', icon: 'i-lucide-users', to: '/lab/subaccounts' },
    { label: 'Préleveurs', icon: 'i-lucide-user-check', to: '/lab/preleveurs' },
    { label: 'Abonnement', icon: 'i-lucide-credit-card', to: '/lab/abonnement' },
    { label: 'Mon profil', icon: 'i-lucide-user', to: '/profile' },
  ],
  subaccount: [
    { label: 'Rendez-vous', icon: 'i-lucide-calendar', to: '/subaccount/appointments' },
    { label: 'Patients', icon: 'i-lucide-users', to: '/subaccount/patients' },
    { label: 'Calendrier', icon: 'i-lucide-calendar-days', to: '/subaccount/calendar' },
    { label: 'Mes avis', icon: 'i-lucide-star', to: '/subaccount/reviews' },
    { label: 'Préleveurs', icon: 'i-lucide-user-check', to: '/subaccount/preleveurs' },
    { label: 'Mon profil', icon: 'i-lucide-user', to: '/profile' },
  ],
  preleveur: [
    { label: 'Mes rendez-vous', icon: 'i-lucide-calendar', to: '/preleveur' },
    { label: 'Ma tournée', icon: 'i-lucide-list-ordered', to: '/preleveur/tournee' },
    { label: 'Calendrier', icon: 'i-lucide-calendar-days', to: '/preleveur/calendar' },
    { label: 'Mon profil', icon: 'i-lucide-user', to: '/profile' },
  ],
  pro: [
    { label: 'Rendez-vous', icon: 'i-lucide-calendar', to: '/pro/appointments' },
    { label: 'Patients', icon: 'i-lucide-users', to: '/pro/patients' },
    { label: 'Résultats', icon: 'i-lucide-flask-conical', to: '/pro/resultats' },
    { label: 'Prescriptions', icon: 'i-lucide-file-pen-line', to: '/pro/prescriptions' },
    { label: 'Calendrier', icon: 'i-lucide-calendar-days', to: '/pro/calendar' },
    { label: 'Mon profil', icon: 'i-lucide-user', to: '/profile' },
  ],
  admin: ADMIN_NAV_LINKS,
  super_admin: ADMIN_NAV_LINKS,
};
