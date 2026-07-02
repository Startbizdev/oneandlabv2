import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import dayjs from 'dayjs';
import type { Appointment } from '@oneandlab/shared-types';
import { buildTourStopIcsEvent, isTourStopAbsent, wrapIcsCalendar } from '@oneandlab/shared-utils';
import { getApiBase } from '@/config/env';
import { getAuthToken } from '@/lib/auth-token';
import { fetchAppointmentsPaginated } from '@/features/appointments/api/appointments.service';
import type { NurseTourStop } from '../api/nurse-tour.service';
import type { TourCalendarImportScope } from '../components/TourCalendarImportSheet';

export type TourCalendarAddResult =
  | { ok: true; count: number; mode: 'native' | 'share' }
  | { ok: false; reason: 'permission' | 'no_events' | 'no_calendar' | 'unavailable' | 'error' };

const UPCOMING_STATUSES = new Set(['confirmed', 'planned', 'inProgress']);

type CalendarEventInput = {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  timeZone: string;
};

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

function stopToNativeEvent(stop: NurseTourStop): CalendarEventInput | null {
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

function appointmentToNativeEvent(apt: Appointment): CalendarEventInput | null {
  if (!apt.scheduled_at) return null;
  const fd = apt.form_data as Record<string, unknown> | undefined;
  const patientName = [fd?.first_name, fd?.last_name].filter(Boolean).join(' ').trim() || 'Patient';
  const title = apt.category_name ? `${patientName} — ${apt.category_name}` : patientName;
  const addrObj = fd?.address as { label?: string } | undefined;
  const location = addrObj?.label?.trim() || apt.address?.trim() || undefined;
  const complement =
    typeof fd?.address_complement === 'string' ? fd.address_complement.trim() : '';
  const start = dayjs(apt.scheduled_at);
  return {
    title,
    startDate: start.toDate(),
    endDate: start.add(45, 'minute').toDate(),
    location: [location, complement].filter(Boolean).join(', ') || undefined,
    notes: `Rendez-vous Cary${apt.category_name ? ` — ${apt.category_name}` : ''}`,
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

async function ensureCalendarPermission(): Promise<boolean> {
  const current = await Calendar.getCalendarPermissionsAsync();
  if (current.status === 'granted') return true;
  if (current.status === 'denied') return false;
  const requested = await Calendar.requestCalendarPermissionsAsync();
  return requested.status === 'granted';
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

async function fetchAllUpcomingNurseAppointments(): Promise<Appointment[]> {
  const today = dayjs().format('YYYY-MM-DD');
  const all: Appointment[] = [];
  let page = 1;

  for (;;) {
    const { appointments, pagination } = await fetchAppointmentsPaginated({
      nurse_tab: 'soins',
      nurse_segment: 'acceptes',
      date_from: today,
      page,
      limit: 100,
    });
    const filtered = appointments.filter(
      (apt) =>
        apt.type === 'nursing' &&
        Boolean(apt.scheduled_at) &&
        UPCOMING_STATUSES.has(String(apt.status ?? '')) &&
        !dayjs(apt.scheduled_at).isBefore(dayjs(), 'day'),
    );
    all.push(...filtered);
    if (!pagination.has_more) break;
    page += 1;
  }

  const seen = new Set<string>();
  return all.filter((apt) => {
    if (seen.has(apt.id)) return false;
    seen.add(apt.id);
    return true;
  });
}

async function addEventsViaNativeCalendar(events: CalendarEventInput[]): Promise<TourCalendarAddResult> {
  if (events.length === 0) return { ok: false, reason: 'no_events' };

  const granted = await ensureCalendarPermission();
  if (!granted) return { ok: false, reason: 'permission' };

  const calendarId = await resolveWritableCalendarId();
  if (!calendarId) return { ok: false, reason: 'no_calendar' };

  for (const details of events) {
    await Calendar.createEventAsync(calendarId, details);
  }

  return { ok: true, count: events.length, mode: 'native' };
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

async function resolveEventsForScope(
  scope: TourCalendarImportScope,
  date: string,
  todayStops: NurseTourStop[],
): Promise<CalendarEventInput[]> {
  if (scope === 'today') {
    return activeStopsWithSchedule(todayStops)
      .map(stopToNativeEvent)
      .filter(Boolean) as CalendarEventInput[];
  }

  const appointments = await fetchAllUpcomingNurseAppointments();
  return appointments.map(appointmentToNativeEvent).filter(Boolean) as CalendarEventInput[];
}

/** Ajoute des passages au calendrier natif après choix utilisateur (modal). */
export async function importTourToDeviceCalendar(input: {
  scope: TourCalendarImportScope;
  date: string;
  todayStops: NurseTourStop[];
}): Promise<TourCalendarAddResult> {
  try {
    const events = await resolveEventsForScope(input.scope, input.date, input.todayStops);
    const native = await addEventsViaNativeCalendar(events);
    if (native.ok) return native;
    if (native.reason === 'permission' || native.reason === 'no_events') return native;
    if (input.scope === 'today') {
      return shareDayIcsFallback(input.date, input.todayStops);
    }
    return { ok: false, reason: native.reason ?? 'error' };
  } catch {
    if (input.scope === 'today') {
      try {
        return await shareDayIcsFallback(input.date, input.todayStops);
      } catch {
        return { ok: false, reason: 'error' };
      }
    }
    return { ok: false, reason: 'error' };
  }
}

/** @deprecated Préférer importTourToDeviceCalendar */
export async function addTourDayToDeviceCalendar(
  date: string,
  stops: NurseTourStop[],
): Promise<TourCalendarAddResult> {
  return importTourToDeviceCalendar({ scope: 'today', date, todayStops: stops });
}

/** Ajoute un passage au calendrier du téléphone. */
export async function shareTourStopCalendarEvent(stop: NurseTourStop): Promise<TourCalendarAddResult> {
  if (isTourStopAbsent(stop)) return { ok: false, reason: 'no_events' };
  return importTourToDeviceCalendar({
    scope: 'today',
    date: dayjs(stop.scheduled_at).format('YYYY-MM-DD'),
    todayStops: [stop],
  });
}

/** @deprecated Préférer importTourToDeviceCalendar */
export async function shareTourDayCalendar(date: string, stops: NurseTourStop[]): Promise<boolean> {
  const result = await importTourToDeviceCalendar({ scope: 'today', date, todayStops: stops });
  return result.ok;
}

export function countTodayActiveStops(stops: NurseTourStop[]): number {
  return activeStopsWithSchedule(stops).length;
}
