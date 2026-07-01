import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import dayjs from 'dayjs';
import { buildTourStopIcsEvent, wrapIcsCalendar } from '@oneandlab/shared-utils';
import { getApiBase } from '@/config/env';
import { getAuthToken } from '@/lib/auth-token';
import type { NurseTourStop } from '../api/nurse-tour.service';

function buildStopEvent(stop: NurseTourStop) {
  if (!stop.scheduled_at) return null;
  const start = dayjs(stop.scheduled_at);
  const end = start.add(45, 'minute');
  const title = stop.category_name
    ? `${stop.patient_name} — ${stop.category_name}`
    : stop.patient_name;
  const location = [stop.address_line, stop.address_complement].filter(Boolean).join(', ');

  return buildTourStopIcsEvent({
    uid: `${stop.appointment_id}@oneandlab.fr`,
    title,
    description: `Passage Cary${stop.category_name ? ` — ${stop.category_name}` : ''}`,
    location: location || undefined,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  });
}

async function shareIcsFile(path: string, filename: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(path, {
    mimeType: 'text/calendar',
    UTI: 'public.calendar-event',
    dialogTitle: filename,
  });
  return true;
}

/** Ajoute un passage au calendrier du téléphone (fichier .ics partagé). */
export async function shareTourStopCalendarEvent(stop: NurseTourStop): Promise<boolean> {
  const event = buildStopEvent(stop);
  if (!event) return false;

  const ics = wrapIcsCalendar([event]);
  const path = `${FileSystem.cacheDirectory}passage-${stop.appointment_id}.ics`;
  await FileSystem.writeAsStringAsync(path, ics, { encoding: FileSystem.EncodingType.UTF8 });
  return shareIcsFile(path, `passage-${stop.patient_name.replace(/\s+/g, '-')}.ics`);
}

/** Exporte toute la tournée du jour (API backend ou fallback local). */
export async function shareTourDayCalendar(
  date: string,
  stops: NurseTourStop[],
): Promise<boolean> {
  const token = getAuthToken();
  const url = `${getApiBase()}/nurse/tour/calendar.ics?date=${encodeURIComponent(date)}`;

  try {
    const res = await axios.get<string>(url, {
      responseType: 'text',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true,
    });
    const ics = res.data;
    if (ics.includes('BEGIN:VCALENDAR')) {
      const path = `${FileSystem.cacheDirectory}tournee-${date}.ics`;
      await FileSystem.writeAsStringAsync(path, ics, { encoding: FileSystem.EncodingType.UTF8 });
      return shareIcsFile(path, `tournee-${date}.ics`);
    }
  } catch {
    /* fallback client */
  }

  const events = stops.map(buildStopEvent).filter(Boolean) as string[];
  if (events.length === 0) return false;
  const ics = wrapIcsCalendar(events);
  const path = `${FileSystem.cacheDirectory}tournee-${date}.ics`;
  await FileSystem.writeAsStringAsync(path, ics, { encoding: FileSystem.EncodingType.UTF8 });
  return shareIcsFile(path, `tournee-${date}.ics`);
}
