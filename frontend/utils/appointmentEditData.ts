/** Decode the JSON/object variants returned by historical appointment records. */
export function appointmentRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try { return appointmentRecord(JSON.parse(value)); } catch { return {}; }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

export function appointmentText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export function appointmentEditAddress(record: unknown) {
  const appointment = appointmentRecord(record);
  const fields = appointmentRecord(appointment.form_data);
  const top = appointmentRecord(appointment.address);
  const nested = appointmentRecord(fields.address);
  const label = appointmentText(top.label)
    || (typeof appointment.address === 'string' && !Object.keys(top).length ? appointment.address : '')
    || appointmentText(nested.label)
    || (typeof fields.address === 'string' && !Object.keys(nested).length ? fields.address : '')
    || appointmentText(fields.address_label);
  if (!label.trim()) return null;
  const coordinate = (values: unknown[]) => {
    for (const value of values) {
      if (value === null || value === undefined || value === '') continue;
      if ((typeof value === 'number' || typeof value === 'string') && Number.isFinite(Number(value))) return Number(value);
    }
    // Missing location must trigger address completion, never become a position at 0,0.
    return Number.NaN;
  };
  return { label: label.trim(), lat: coordinate([appointment.location_lat, top.lat, nested.lat]), lng: coordinate([appointment.location_lng, top.lng, nested.lng]) };
}

export function appointmentCareOptions(value: unknown): Record<string, string | number> {
  return Object.fromEntries(Object.entries(appointmentRecord(value))
    .filter((entry): entry is [string, string | number] => typeof entry[1] === 'string' || typeof entry[1] === 'number'));
}

export function appointmentAvailability(value: unknown): string {
  if (typeof value === 'string') return value;
  const availability = appointmentRecord(value);
  return Object.keys(availability).length ? JSON.stringify(availability) : '';
}
