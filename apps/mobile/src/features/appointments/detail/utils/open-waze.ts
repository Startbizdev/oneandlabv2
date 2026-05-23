import type { Appointment } from '@oneandlab/shared-types';
import { Linking } from 'react-native';
import {
  resolveAppointmentDetailAddressLine,
  resolveAppointmentMapCoords,
} from './appointment-address-display';

export function openWazeForAppointment(apt: Appointment) {
  const coords = resolveAppointmentMapCoords(apt);
  if (coords) {
    void Linking.openURL(
      `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`,
    );
    return;
  }
  const line = resolveAppointmentDetailAddressLine(apt);
  if (line) void Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(line)}&navigate=yes`);
}
