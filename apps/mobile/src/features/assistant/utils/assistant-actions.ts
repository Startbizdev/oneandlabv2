import type { Href } from 'expo-router';
import type { MobileRole } from '@oneandlab/shared-constants';
import { TRANSMISSION_BODY_MAX_LENGTH, type AssistantAction } from '@oneandlab/shared-types';
import type { TransmissionPrefill } from '@oneandlab/shared-utils';
import { appointmentDetailHref, bookingNewHref, staffPatientHref } from '@/navigation/role-hrefs';
import { roleRoutePrefix } from '@/navigation/role-route-prefix';

export type AssistantActionTarget =
  | { kind: 'navigate'; href: Href }
  | { kind: 'transmission'; patientId: string; prefill: TransmissionPrefill }
  | { kind: 'call'; url: string };

const LAB_RESULTS: Partial<Record<MobileRole, Href>> = {
  // Écran empilé (pas l'onglet) : le retour ramène à la conversation.
  patient: '/(patient)/resultats',
  nurse: '/(nurse)/resultats',
  pro: '/(pro)/resultats',
};

/** Types de soin compris par l'assistant de réservation (filtre initial de l'étape soins). */
const BOOKING_CARE_TYPES = ['blood_test', 'nursing'];

/** Numéros d'urgence acceptés (SAMU, européen, prévention suicide). */
const EMERGENCY_NUMBERS = ['15', '112', '3114'];

export function emergencyTelUrl(number: string | undefined): string {
  const digits = (number ?? '').replace(/\D/g, '');
  return `tel:${EMERGENCY_NUMBERS.includes(digits) ? digits : '15'}`;
}

/** Transmission préremplie (dictée ou carte d'action), bornée à la longueur acceptée par le serveur. */
export function transmissionPrefill(body: string, appointmentId?: string): TransmissionPrefill {
  const prefill: TransmissionPrefill = { body: body.trim().slice(0, TRANSMISSION_BODY_MAX_LENGTH) };
  if (appointmentId) prefill.appointmentId = appointmentId;
  return prefill;
}

/**
 * Écran existant ouvert par une carte d'action ; `null` quand le rôle n'a pas d'écran correspondant
 * ou que la carte est incomplète (la carte n'est alors pas affichée).
 * `selectedPatientId` : patient choisi par le soignant dans l'assistant.
 */
export function resolveAssistantAction(
  role: MobileRole,
  action: AssistantAction,
  selectedPatientId?: string,
): AssistantActionTarget | null {
  const prefix = roleRoutePrefix(role);
  const staff = role !== 'patient';
  const p = action.params;
  switch (action.type) {
    case 'book_appointment': {
      const patientId = staff ? (p.patient_id ?? selectedPatientId) : undefined;
      const careType = p.care_type && BOOKING_CARE_TYPES.includes(p.care_type) ? p.care_type : undefined;
      return {
        kind: 'navigate',
        href: bookingNewHref(prefix, {
          ...(patientId ? { patient_id: patientId } : {}),
          ...(careType ? { care_type: careType } : {}),
        }),
      };
    }
    case 'open_appointment':
      return p.id ? { kind: 'navigate', href: appointmentDetailHref(prefix, p.id) } : null;
    case 'open_lab_results': {
      const href = LAB_RESULTS[role];
      return href ? { kind: 'navigate', href } : null;
    }
    case 'open_health_record': {
      if (role === 'patient') return { kind: 'navigate', href: '/(patient)/health-record' };
      const patientId = p.patient_id ?? selectedPatientId;
      if ((prefix !== '/(nurse)' && prefix !== '/(pro)') || !patientId) return null;
      return { kind: 'navigate', href: staffPatientHref(prefix, patientId, 'health-record') };
    }
    case 'open_tour': {
      const params = p.date ? { date: p.date } : {};
      if (role === 'nurse') return { kind: 'navigate', href: { pathname: '/(nurse)/(tabs)/tournee', params } };
      if (role === 'preleveur') return { kind: 'navigate', href: { pathname: '/(preleveur)/(tabs)/tournee', params } };
      return null;
    }
    case 'create_transmission': {
      const patientId = p.patient_id ?? selectedPatientId;
      if (!staff || !patientId) return null;
      return { kind: 'transmission', patientId, prefill: transmissionPrefill(p.body ?? '', p.appointment_id) };
    }
    case 'call_emergency':
      return { kind: 'call', url: emergencyTelUrl(p.number) };
    default:
      return null;
  }
}
