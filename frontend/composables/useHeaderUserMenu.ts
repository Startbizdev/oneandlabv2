/**
 * Menu utilisateur du header selon le rôle (patient, lab, nurse, admin, etc.)
 * Partagé entre layout default, layout patient et sidebar UserMenu.
 * Les entrées sont alignées sur `HEADER_NAV_LINKS_BY_ROLE` (sidebar dashboard).
 */
import { HEADER_NAV_LINKS_BY_ROLE } from '~/constants/header-nav-links';
import { isTechnicalPatientEmail } from '~/utils/patient-address-rdv';

export function useHeaderUserMenu() {
  const { user, logout } = useAuth();

  const roleLabel = computed(() => {
    const role = user.value?.role;
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Administrateur',
      lab: 'Laboratoire',
      subaccount: 'Sous-compte',
      nurse: 'Infirmier',
      preleveur: 'Préleveur',
      pro: 'Professionnel',
      patient: 'Patient',
    };
    return labels[role || ''] || 'Utilisateur';
  });

  const userMenuItems = computed(() => {
    const role = user.value?.role;
    const items: Array<{ label: string; icon: string; click?: () => void; type?: string }> = [];

    const links =
      role && role in HEADER_NAV_LINKS_BY_ROLE
        ? HEADER_NAV_LINKS_BY_ROLE[role]
        : null;

    if (links?.length) {
      for (const link of links) {
        const to = link.to;
        items.push({
          label: link.label,
          icon: link.icon,
          click: () => navigateTo(to),
        });
      }
    } else {
      items.push({
        label: 'Mon profil',
        icon: 'i-lucide-user',
        click: () => navigateTo('/profile'),
      });
    }

    items.push({ type: 'divider' } as { type: string });
    items.push({
      label: 'Déconnexion',
      icon: 'i-lucide-log-out',
      click: () => logout(),
    });
    return items;
  });

  const userDisplayName = computed(() => {
    if (user.value?.first_name && user.value?.last_name) {
      return `${user.value.first_name} ${user.value.last_name}`;
    }
    const em = user.value?.email;
    if (user.value?.role === 'patient' && isTechnicalPatientEmail(em)) {
      return 'Compte patient';
    }
    return em || 'Utilisateur';
  });

  return { user, roleLabel, userMenuItems, userDisplayName };
}
