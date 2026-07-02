import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import dayjs from 'dayjs';
import { buildTourStopIcsEvent, isTourStopAbsent, wrapIcsCalendar } from '@oneandlab/shared-utils';
import { getApiBase } from '@/config/env';
import { getAuthToken } from '@/lib/auth-token';
import type { NurseTourStop } from '../api/nurse-tour.service';

export type TourCalendarAddResult =
  | { ok: true; count: number; mode: 'native' | 'share' }
  | { ok: false; reason: 'permission' | 'no_events' | 'no_calendar' | 'unavailable' | 'error' };

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

function stopToNativeEvent(stop: NurseTourStop) {
  if (!stop.scheduled_at) return null;
  const start = dayjs(stop.scheduled_at);
  const title = stop.category_name
    ? `${stop.patient_name} — ${stop.category_name}`
    : stop.patient_name;
  const location = [stop.address_line, stop.address_complement].filter(Boolean).join(', ');
  return {
    title,
    startDate: start.toDate(),
    endDate: start.add(45, 'minute').toDate(),
    location: location || undefined,
    notes: `Passage Cary${stop.category_name ? ` — ${stop.category_name}` : ''}`,
    timeZone: 'Europe/Paris',
  };
}

function activeStopsWithSchedule(stops: NurseTourStop[]): NurseTourStop[] {
  return stops.filter((stop) => !isTourStopAbsent(stop) && Boolean(stop.scheduled_at));
}

async function resolveWritableCalendarId(): Promise<string | null> {
  if (Platform.OS === 'ios') {
    try {
      const cal = await Calendar.getDefaultCalendarAsync();
      if (cal?.id && cal.allowsModifications !== false) return cal.id;
    } catch {
      /* fallback liste */
    }
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter((c) => c.allowsModifications);
  return writable.find((c) => c.isPrimary)?.id ?? writable[0]?.id ?? null;
}

async function openIcsInCalendarApp(path: string, filename: string): Promise<boolean> {
  if (Platform.OS === 'android') {
    const contentUri = await FileSystem.getContentUriAsync(path);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: 'text/calendar',
      flags: 1,
    });
    return true;
  }

  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(path, {
    mimeType: 'text/calendar',
    UTI: 'public.calendar-event',
    dialogTitle: `Ajouter ${filename}`,
  });
  return true;
}

async function shareIcsFile(path: string, filename: string): Promise<boolean> {
  try {
    return await openIcsInCalendarApp(path, filename);
  } catch {
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(path, {
      mimeType: 'text/calendar',
      UTI: 'public.calendar-event',
      dialogTitle: `Ajouter ${filename}`,
    });
    return true;
  }
}

async function addStopsViaNativeCalendar(stops: NurseTourStop[]): Promise<TourCalendarAddResult> {
  const activeStops = activeStopsWithSchedule(stops);
  if (activeStops.length === 0) return { ok: false, reason: 'no_events' };

  const perm = await Calendar.requestCalendarPermissionsAsync();
  if (perm.status !== 'granted') return { ok: false, reason: 'permission' };

  const calendarId = await resolveWritableCalendarId();
  if (!calendarId) return { ok: false, reason: 'no_calendar' };

  let count = 0;
  for (const stop of activeStops) {
    const details = stopToNativeEvent(stop);
    if (!details) continue;
    await Calendar.createEventAsync(calendarId, details);
    count += 1;
  }

  if (count === 0) return { ok: false, reason: 'no_events' };
  return { ok: true, count, mode: 'native' };
}

async function shareDayIcsFallback(date: string, stops: NurseTourStop[]): Promise<TourCalendarAddResult> {
  const activeStops = activeStopsWithSchedule(stops);
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
      const shared = await shareIcsFile(path, `tournee-${date}.ics`);
      if (!shared) return { ok: false, reason: 'unavailable' };
      return { ok: true, count: activeStops.length, mode: 'share' };
    }
  } catch {
    /* fallback client */
  }

  const events = activeStops.map(buildStopEvent).filter(Boolean) as string[];
  if (events.length === 0) return { ok: false, reason: 'no_events' };
  const ics = wrapIcsCalendar(events);
  const path = `${FileSystem.cacheDirectory}tournee-${date}.ics`;
  await FileSystem.writeAsStringAsync(path, ics, { encoding: FileSystem.EncodingType.UTF8 });
  const shared = await shareIcsFile(path, `tournee-${date}.ics`);
  if (!shared) return { ok: false, reason: 'unavailable' };
  return { ok: true, count: events.length, mode: 'share' };
}

/** Ajoute les passages actifs de la journée au calendrier natif (permission système). */
export async function addTourDayToDeviceCalendar(
  date: string,
  stops: NurseTourStop[],
): Promise<TourCalendarAddResult> {
  try {
    const native = await addStopsViaNativeCalendar(stops);
    if (native.ok) return native;
    if (native.reason === 'permission' || native.reason === 'no_events') return native;
    return shareDayIcsFallback(date, stops);
  } catch {
    try {
      return await shareDayIcsFallback(date, stops);
    } catch {
      return { ok: false, reason: 'error' };
    }
  }
}

/** Ajoute un passage au calendrier du téléphone. */
export async function shareTourStopCalendarEvent(stop: NurseTourStop): Promise<TourCalendarAddResult> {
  if (isTourStopAbsent(stop)) return { ok: false, reason: 'no_events' };
  const result = await addTourDayToDeviceCalendar(
    dayjs(stop.scheduled_at).format('YYYY-MM-DD'),
    [stop],
  );
  return result;
}

/** @deprecated Préférer addTourDayToDeviceCalendar */
export async function shareTourDayCalendar(
  date: string,
  stops: NurseTourStop[],
): Promise<boolean> {
  const result = await addTourDayToDeviceCalendar(date, stops);
  return result.ok;
}
