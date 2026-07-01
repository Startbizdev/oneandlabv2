export type NavAppPref = 'waze' | 'google_maps' | 'apple_maps' | 'system';

export type NavigationTarget = {
  lat?: number | null;
  lng?: number | null;
  addressLine?: string | null;
};

function encodeAddress(line: string): string {
  return encodeURIComponent(line.trim());
}

export function buildNavigationUrl(app: NavAppPref, target: NavigationTarget): string | null {
  const lat = target.lat != null ? Number(target.lat) : NaN;
  const lng = target.lng != null ? Number(target.lng) : NaN;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  const address = target.addressLine?.trim() ?? '';

  if (app === 'waze') {
    if (hasCoords) return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    if (address) return `https://waze.com/ul?q=${encodeAddress(address)}&navigate=yes`;
    return null;
  }

  if (app === 'google_maps') {
    if (hasCoords) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    if (address) return `https://www.google.com/maps/dir/?api=1&destination=${encodeAddress(address)}`;
    return null;
  }

  if (app === 'apple_maps') {
    if (hasCoords) return `http://maps.apple.com/?daddr=${lat},${lng}`;
    if (address) return `http://maps.apple.com/?daddr=${encodeAddress(address)}`;
    return null;
  }

  // system — Google Maps web fallback
  if (hasCoords) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeAddress(address)}`;
  return null;
}

/** Contenu ICS minimal pour un stop tournée. */
export function buildTourStopIcsEvent(input: {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startIso: string;
  endIso: string;
}): string {
  const esc = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  return [
    'BEGIN:VEVENT',
    `UID:${esc(input.uid)}`,
    `DTSTART:${input.startIso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
    `DTEND:${input.endIso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
    `SUMMARY:${esc(input.title)}`,
    input.description ? `DESCRIPTION:${esc(input.description)}` : '',
    input.location ? `LOCATION:${esc(input.location)}` : '',
    'END:VEVENT',
  ]
    .filter(Boolean)
    .join('\r\n');
}

export function wrapIcsCalendar(events: string[]): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OneAndLab//NurseTour//FR', ...events, 'END:VCALENDAR'].join(
    '\r\n',
  );
}
