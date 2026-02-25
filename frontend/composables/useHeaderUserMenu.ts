/**
 * Menu utilisateur du header selon le rôle (patient, lab, nurse, admin, etc.)
 * Partagé entre layout default, layout patient et sidebar UserMenu.
 */
export function useHeaderUserMenu() {
  const { user, logout } = useAuth()

  const roleLabel = computed(() => {
    const role = user.value?.role
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Administrateur',
      lab: 'Laboratoire',
      subaccount: 'Sous-compte',
      nurse: 'Infirmier',
      preleveur: 'Préleveur',
      pro: 'Professionnel',
      patient: 'Patient',
    }
    return labels[role || ''] || 'Utilisateur'
  })

  const userMenuItems = computed(() => {
    const role = user.value?.role
    const items: Array<{ label: string; icon: string; click?: () => void; type?: string }> = []

    if (role === 'patient') {
      items.push(
        { label: 'Mes rendez-vous', icon: 'i-lucide-calendar', click: () => navigateTo('/patient') },
        { label: 'Nouveau rendez-vous', icon: 'i-lucide-calendar-plus', click: () => navigateTo('/rendez-vous/nouveau') },
        { label: 'Mes proches', icon: 'i-lucide-users', click: () => navigateTo('/patient/relatives') },
        { label: 'Mes avis', icon: 'i-lucide-star', click: () => navigateTo('/patient/reviews') },
        { label: 'Mon profil', icon: 'i-lucide-user', click: () => navigateTo('/profile') }
      )
    } else if (role === 'nurse') {
      items.push(
        { label: 'Rendez-vous', icon: 'i-lucide-calendar', click: () => navigateTo('/nurse/appointments') },
        { label: 'Soins actifs', icon: 'i-lucide-activity', click: () => navigateTo('/nurse/soins') },
        { label: 'Mon profil', icon: 'i-lucide-user', click: () => navigateTo('/profile') }
      )
    } else if (role === 'lab') {
      items.push(
        { label: 'Tableau de bord', icon: 'i-lucide-layout-dashboard', click: () => navigateTo('/lab') },
        { label: 'Rendez-vous', icon: 'i-lucide-calendar', click: () => navigateTo('/lab/appointments') },
        { label: 'Calendrier', icon: 'i-lucide-calendar-days', click: () => navigateTo('/lab/calendar') },
        { label: 'Statistiques', icon: 'i-lucide-bar-chart', click: () => navigateTo('/lab/stats') },
        { label: 'Sous-comptes', icon: 'i-lucide-users', click: () => navigateTo('/lab/subaccounts') },
        { label: 'Préleveurs', icon: 'i-lucide-user-check', click: () => navigateTo('/lab/preleveurs') },
      )
    } else if (role === 'subaccount') {
      items.push(
        { label: 'Tableau de bord', icon: 'i-lucide-layout-dashboard', click: () => navigateTo('/subaccount') },
        { label: 'Rendez-vous', icon: 'i-lucide-calendar', click: () => navigateTo('/subaccount/appointments') },
        { label: 'Calendrier', icon: 'i-lucide-calendar-days', click: () => navigateTo('/subaccount/calendar') },
        { label: 'Préleveurs', icon: 'i-lucide-user-check', click: () => navigateTo('/subaccount/preleveurs') },
        { label: 'Mon profil', icon: 'i-lucide-user', click: () => navigateTo('/profile') }
      )
    } else if (role === 'preleveur') {
      items.push(
        { label: 'Tableau de bord', icon: 'i-lucide-layout-dashboard', click: () => navigateTo('/preleveur') },
        { label: 'Calendrier', icon: 'i-lucide-calendar-days', click: () => navigateTo('/preleveur/calendar') }
      )
    } else if (role === 'pro') {
      items.push(
        { label: 'Tableau de bord', icon: 'i-lucide-layout-dashboard', click: () => navigateTo('/pro') },
        { label: 'Rendez-vous', icon: 'i-lucide-calendar', click: () => navigateTo('/pro/appointments') },
        { label: 'Mes patients', icon: 'i-lucide-users', click: () => navigateTo('/pro/patients') },
        { label: 'Calendrier', icon: 'i-lucide-calendar-days', click: () => navigateTo('/pro/calendar') },
        { label: 'Paramètres', icon: 'i-lucide-settings', click: () => navigateTo('/profile') }
      )
    } else if (role === 'admin' || role === 'super_admin') {
      items.push(
        { label: 'Tableau de bord', icon: 'i-lucide-layout-dashboard', click: () => navigateTo('/admin') },
        { label: 'Rendez-vous', icon: 'i-lucide-calendar', click: () => navigateTo('/admin/appointments') },
        { label: 'Utilisateurs', icon: 'i-lucide-users', click: () => navigateTo('/admin/users') },
        { label: 'Catégories', icon: 'i-lucide-tags', click: () => navigateTo('/admin/categories') },
        { label: 'Zones de couverture', icon: 'i-lucide-map', click: () => navigateTo('/admin/coverage') },
        { label: 'Notifications', icon: 'i-lucide-bell', click: () => navigateTo('/admin/notifications') },
        { label: 'Logs', icon: 'i-lucide-file-text', click: () => navigateTo('/admin/logs') }
      )
    } else {
      // Fallback (invité ou rôle inconnu)
      items.push(
        { label: 'Mon profil', icon: 'i-lucide-user', click: () => navigateTo('/profile') }
      )
    }

    items.push({ type: 'divider' } as any)
    items.push({
      label: 'Déconnexion',
      icon: 'i-lucide-log-out',
      click: () => logout(),
    })
    return items
  })

  const userDisplayName = computed(() => {
    if (user.value?.first_name && user.value?.last_name) {
      return `${user.value.first_name} ${user.value.last_name}`
    }
    return user.value?.email || 'Utilisateur'
  })

  return { user, roleLabel, userMenuItems, userDisplayName }
}
