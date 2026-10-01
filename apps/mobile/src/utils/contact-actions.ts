import { Linking } from 'react-native';
import type { Appointment, AuthUser } from '@oneandlab/shared-types';
import {
  patientContactEmail,
  patientPhone,
} from '@/features/appointments/detail/utils/patient-appointment-display';

export type PatientContactButton = {
  key: string;
  label: string;
  icon: 'phone' | 'message' | 'email';
  onPress: () => void;
};

export type PhoneContactAction = {
  key: string;
  label: string;
  icon: 'phone' | 'message';
  onPress: () => void;
};

/** Appareil sans téléphonie / SMS / messagerie (tablette, émulateur) : `openURL` rejette. */
function openContactUrl(url: string): void {
  Linking.openURL(url).catch((error: unknown) => {
    console.warn('[contact] lien non ouvert', url.split(':')[0], error);
  });
}

export function normalizePhone(phone?: string | null): string {
  return String(phone ?? '')
    .trim()
    .replace(/\s/g, '');
}

export function buildPhoneContactActions(phone?: string | null): PhoneContactAction[] {
  const tel = normalizePhone(phone);
  if (!tel) return [];

  return [
    {
      key: 'phone',
      label: 'Appeler',
      icon: 'phone',
      onPress: () => openContactUrl(`tel:${tel}`),
    },
    {
      key: 'sms',
      label: 'SMS',
      icon: 'message',
      onPress: () => openContactUrl(`sms:${tel}`),
    },
  ];
}

export function buildPatientContactButtons(
  apt: Appointment,
  viewer?: AuthUser | null,
): PatientContactButton[] {
  if (viewer?.role === 'patient') return [];

  const email = patientContactEmail(apt, viewer ?? undefined);
  const tel = normalizePhone(patientPhone(apt));
  const buttons: PatientContactButton[] = [];

  if (tel) {
    buttons.push({
      key: 'phone',
      label: 'Appeler',
      icon: 'phone',
      onPress: () => openContactUrl(`tel:${tel}`),
    });
    buttons.push({
      key: 'sms',
      label: 'SMS',
      icon: 'message',
      onPress: () => openContactUrl(`sms:${tel}`),
    });
  }

  const emailHref = email.href;
  if (emailHref) {
    buttons.push({
      key: 'email',
      label: 'E-mail',
      icon: 'email',
      onPress: () => openContactUrl(emailHref),
    });
  }

  return buttons;
}
