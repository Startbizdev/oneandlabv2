/**
 * Aligné sur `frontend/utils/appointment-sidebar-terminal.ts`
 */
import type { Appointment } from '@oneandlab/shared-types';
import { isNursingAppointment } from '@oneandlab/shared-utils';

export type AppointmentSidebarTerminalEmpty = {
  icon: 'calendar-x' | 'circle-check' | 'ban' | 'timer-off';
  title: string;
  description: string;
};

export function getAppointmentSidebarTerminalEmpty(
  status: unknown,
): AppointmentSidebarTerminalEmpty | null {
  const s = String(status ?? '').toLowerCase();
  if (s === 'canceled' || s === 'cancelled') {
    return {
      icon: 'calendar-x',
      title: 'Rendez-vous annulé',
      description: 'Ce rendez-vous a été annulé. Aucune action disponible.',
    };
  }
  if (s === 'completed') {
    return {
      icon: 'circle-check',
      title: 'Rendez-vous terminé',
      description: 'Ce rendez-vous est terminé. Aucune action disponible.',
    };
  }
  if (s === 'refused') {
    return {
      icon: 'ban',
      title: 'Rendez-vous refusé',
      description: 'Cette demande a été refusée. Aucune action disponible.',
    };
  }
  if (s === 'expired') {
    return {
      icon: 'timer-off',
      title: 'Rendez-vous expiré',
      description: 'Ce créneau n’est plus actif. Aucune action disponible.',
    };
  }
  return null;
}

function isSidebarTerminalStatus(status: unknown): boolean {
  return getAppointmentSidebarTerminalEmpty(status) != null;
}

export function nurseAppointmentSidebarCardVisible(apt: Appointment | null | undefined): boolean {
  if (!apt) return false;
  if (isSidebarTerminalStatus(apt.status)) return true;
  if (['confirmed', 'inProgress', 'in_progress'].includes(String(apt.status ?? ''))) return true;
  if (isNursingAppointment(apt.type)) return true;
  return false;
}

export function standardAppointmentSidebarCardVisible(apt: Appointment | null | undefined): boolean {
  if (!apt) return false;
  if (isSidebarTerminalStatus(apt.status)) return true;
  return ['pending', 'confirmed', 'inProgress', 'in_progress'].includes(String(apt.status ?? ''));
}

export function appointmentSidebarCardVisible(
  role: string,
  apt: Appointment | null | undefined,
): boolean {
  if (role === 'nurse') return nurseAppointmentSidebarCardVisible(apt);
  if (role === 'pro' || role === 'preleveur') return standardAppointmentSidebarCardVisible(apt);
  return false;
}

export function appointmentHasActiveSidebarButtons(status: unknown): boolean {
  const s = String(status ?? '');
  return ['pending', 'confirmed', 'inProgress', 'in_progress'].includes(s);
}
