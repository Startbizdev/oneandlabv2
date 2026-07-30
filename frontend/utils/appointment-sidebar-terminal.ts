import { staffCanManageOwnPendingBloodTest } from '@oneandlab/shared-utils';

export type AppointmentSidebarTerminalEmpty = {
  icon: string;
  title: string;
  description: string;
};

/**
 * Statuts terminaux : la colonne « Actions » n’affiche qu’un empty state (pas de boutons).
 */
export function getAppointmentSidebarTerminalEmpty(status: unknown): AppointmentSidebarTerminalEmpty | null {
  const s = String(status ?? '').toLowerCase();
  if (s === 'canceled' || s === 'cancelled') {
    return {
      icon: 'i-lucide-calendar-x',
      title: 'Rendez-vous annulé',
      description: 'Ce rendez-vous a été annulé. Aucune action disponible.',
    };
  }
  if (s === 'completed') {
    return {
      icon: 'i-lucide-circle-check',
      title: 'Rendez-vous terminé',
      description: 'Ce rendez-vous est terminé. Aucune action disponible.',
    };
  }
  if (s === 'refused') {
    return {
      icon: 'i-lucide-ban',
      title: 'Rendez-vous refusé',
      description: 'Cette demande a été refusée. Aucune action disponible.',
    };
  }
  if (s === 'expired') {
    return {
      icon: 'i-lucide-timer-off',
      title: 'Rendez-vous expiré',
      description: 'Ce créneau n’est plus actif. Aucune action disponible.',
    };
  }
  return null;
}

function isSidebarTerminalStatus(status: unknown): boolean {
  return getAppointmentSidebarTerminalEmpty(status) != null;
}

/**
 * Afficher la carte « Actions » infirmier : statuts terminaux (empty state shell) ou boutons / partage utiles.
 * Évite un UCard vide (ex. prise de sang en attente sans bloc partage).
 */
export function nurseAppointmentSidebarCardVisible(
  appointment: unknown,
  viewerUserId?: string | null,
): boolean {
  const apt = appointment as Record<string, any> | null | undefined;
  if (!apt) return false;
  if (isSidebarTerminalStatus(apt.status)) return true;
  if (['confirmed', 'inProgress'].includes(apt.status)) return true;
  if (apt.type === 'nursing') return true;
  if (staffCanManageOwnPendingBloodTest(apt, viewerUserId)) return true;
  return false;
}

/** Lab / pro / sous-compte / préleveur : même grappe de boutons (hors bloc assignation séparé). */
export function standardAppointmentSidebarCardVisible(appointment: unknown): boolean {
  const apt = appointment as Record<string, any> | null | undefined;
  if (!apt) return false;
  if (isSidebarTerminalStatus(apt.status)) return true;
  return ['pending', 'confirmed', 'inProgress'].includes(apt.status);
}
