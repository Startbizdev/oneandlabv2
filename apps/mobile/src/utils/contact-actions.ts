import { Linking } from 'react-native';
import type { Appointment, AuthUser } from '@oneandlab/shared-types';
import { colors } from '@/theme';
import {
  patientContactEmail,
  patientPhone,
} from '@/features/appointments/detail/utils/patient-appointment-display';

export type PatientContactButton = {
  key: string;
  label: string;
  icon: 'phone' | 'message' | 'email';
  color: string;
  onPress: () => void;
};

export type PhoneContactAction = {
  key: string;
  label: string;
  icon: 'phone' | 'message';
  onPress: () => void;
};

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
      onPress: () => void Linking.openURL(`tel:${tel}`),
    },
    {
      key: 'sms',
      label: 'Message',
      icon: 'message',
      onPress: () => void Linking.openURL(`sms:${tel}`),
    },
  ];
}

export function buildPatientContactButtons(
  apt: Appointment,
  viewer?: AuthUser | null,
): PatientContactButton[] {
  const hideEmailForPatient = viewer?.role === 'patient';
  const email = patientContactEmail(apt, viewer ?? undefined);
  const tel = normalizePhone(patientPhone(apt));
  const buttons: PatientContactButton[] = [];

  if (tel) {
    buttons.push({
      key: 'phone',
      label: 'Appeler',
      icon: 'phone',
      color: colors.success,
      onPress: () => void Linking.openURL(`tel:${tel}`),
    });
    buttons.push({
      key: 'sms',
      label: 'Message',
      icon: 'message',
      color: colors.primary,
      onPress: () => void Linking.openURL(`sms:${tel}`),
    });
  }

  if (!hideEmailForPatient && email.href) {
    buttons.push({
      key: 'email',
      label: 'E-mail',
      icon: 'email',
      color: colors.gradientEnd,
      onPress: () => void Linking.openURL(email.href!),
    });
  }

  return buttons;
}
