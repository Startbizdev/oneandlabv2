import type { Appointment } from '@oneandlab/shared-types';

export function appointmentAddressLine(apt: Appointment): string {
  const fd = apt.form_data as { address?: { label?: string }; address_label?: string } | undefined;
  let line = '';
  if (fd?.address?.label) line = fd.address.label;
  else if (fd?.address_label) line = String(fd.address_label);
  else if (typeof apt.address === 'string') {
    try {
      const p = JSON.parse(apt.address) as { label?: string };
      line = p.label ?? apt.address;
    } catch {
      line = apt.address;
    }
  } else if (apt.address && typeof apt.address === 'object' && 'label' in apt.address) {
    line = String((apt.address as { label?: string }).label ?? '');
  }
  return line.trim();
}
