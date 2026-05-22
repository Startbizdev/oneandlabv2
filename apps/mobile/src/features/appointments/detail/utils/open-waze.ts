import type { Appointment } from '@oneandlab/shared-types';
import { Linking } from 'react-native';
import { appointmentAddressLine } from '@/utils/appointment-display';

export function openWazeForAppointment(apt: Appointment) {
  const addr = apt.address;
  try {
    const parsed = typeof addr === 'string' ? JSON.parse(addr) : addr;
    if (parsed?.lat != null && parsed?.lng != null) {
      void Linking.openURL(
        `https://waze.com/ul?ll=${parsed.lat},${parsed.lng}&navigate=yes`,
      );
      return;
    }
  } catch {
    /* ignore */
  }
  const line = appointmentAddressLine(apt);
  if (line) void Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(line)}&navigate=yes`);
}
