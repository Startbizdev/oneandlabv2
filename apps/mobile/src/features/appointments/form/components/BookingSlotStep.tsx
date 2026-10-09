import type { Dispatch, SetStateAction } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BLOOD_EXTRA_DATES_KEY, isBloodTestAppointment, isNursingAppointment, type SelectedServiceInput } from '@oneandlab/shared-utils';
import { spacing, useStyles } from '@/theme';
import {
  buildAvailabilityFormPatch,
  parseAvailabilityField,
  type AvailabilityType,
  type UrgentTimingMode,
} from '../utils/availability';
import { FormScheduleSection } from './FormScheduleSection';
import { PreferredNurseGenderButtons } from './PreferredNurseGenderButtons';

type FormDataByService = Record<string, Record<string, unknown>>;
type DateMode = 'single' | 'multiple';

interface Props {
  mode: 'patient' | 'dashboard';
  role: string;
  service: SelectedServiceInput;
  formDataByService: FormDataByService;
  setFormDataByService: Dispatch<SetStateAction<FormDataByService>>;
  /** Prix « Prioritaire » du store, déjà localisé. */
  vipFeeLabel?: string;
}

function parseSlice(slice: Record<string, unknown>) {
  return parseAvailabilityField(slice.availability, {
    availability_type: slice.availability_type,
    availabilityRange: slice.availabilityRange,
    urgentHour: slice.urgentHour,
    urgentMinute: slice.urgentMinute,
    urgentTimingMode: slice.urgentTimingMode,
  });
}

function dateKey(value: unknown): string {
  const raw = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : '';
}

function selectedDates(primary: unknown, extras: unknown): string[] {
  const extraDays = Array.isArray(extras) ? extras.map(dateKey) : [];
  return [...new Set([dateKey(primary), ...extraDays].filter(Boolean))].sort();
}

function toggleDate(primary: unknown, extras: unknown, iso: string): { scheduled_at: string; extra_scheduled_dates: string[] } {
  const day = dateKey(iso);
  const current = selectedDates(primary, extras);
  const next = day === '' ? current : current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort();
  return { scheduled_at: next[0] ?? '', extra_scheduled_dates: next.slice(1) };
}

/** Étape « Créneau » d'un soin (ou d'un lot) : jour, plage horaire ou horaire prioritaire. */
export function BookingSlotStep({ mode, role, service, formDataByService, setFormDataByService, vipFeeLabel }: Props) {
  const styles = useStyles(buildStyles);
  const svcId = service.id;
  const fd = formDataByService[svcId] ?? {};
  const availability = parseSlice(fd);
  const blood = isBloodTestAppointment(service.type);
  const dateMode: DateMode = fd.date_selection_mode === 'multiple' ? 'multiple' : 'single';
  const days = selectedDates(fd.scheduled_at, fd[BLOOD_EXTRA_DATES_KEY]);

  const setFd = (patch: Record<string, unknown>) => {
    setFormDataByService((prev) => ({ ...prev, [svcId]: { ...prev[svcId], ...patch } }));
  };
  const patchVipSchedule = (patch: {
    type?: AvailabilityType;
    range?: [number, number];
    mode?: UrgentTimingMode;
    hour?: number;
    minute?: number;
  }) => {
    setFormDataByService((prev) => {
      const slice = { ...(prev[svcId] ?? {}) };
      const parsed = parseSlice(slice);
      const type = patch.type ?? parsed.type;
      const timing = {
        mode: patch.mode ?? parsed.urgentTimingMode,
        hour: patch.hour ?? parsed.urgentHour,
        minute: patch.minute ?? parsed.urgentMinute,
      };
      return {
        ...prev,
        [svcId]: {
          ...slice,
          ...buildAvailabilityFormPatch(type, patch.range ?? parsed.range, type === 'urgent' ? timing : undefined),
        },
      };
    });
  };

  const showVipTab = mode === 'patient' && blood;
  const showNurseGender =
    isNursingAppointment(service.type) && !(mode === 'dashboard' && role === 'nurse');
  const current = {
    range: availability.range,
    mode: availability.urgentTimingMode,
    hour: availability.urgentHour,
    minute: availability.urgentMinute,
  };

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(260).springify()} style={styles.section}>
      <FormScheduleSection
        autoAdvanceClosedDay
        scheduledAt={String(fd.scheduled_at ?? '')}
        serviceType={service.type}
        availabilityType={availability.type}
        range={availability.range}
        showVipTab={showVipTab}
        urgentHour={availability.urgentHour}
        urgentMinute={availability.urgentMinute}
        urgentTimingMode={availability.urgentTimingMode}
        vipFeeLabel={vipFeeLabel}
        allowMultipleDates={blood}
        selectionMode={dateMode}
        selectedDates={days}
        onSelectionModeChange={(next) =>
          setFd(
            next === 'single'
              ? { date_selection_mode: 'single', [BLOOD_EXTRA_DATES_KEY]: [] }
              : { date_selection_mode: 'multiple' },
          )
        }
        onScheduledAt={(iso) => {
          if (!blood || dateMode !== 'multiple') {
            setFd({ scheduled_at: iso, date_selection_mode: 'single', [BLOOD_EXTRA_DATES_KEY]: [] });
            return;
          }
          setFd({ ...toggleDate(fd.scheduled_at, fd[BLOOD_EXTRA_DATES_KEY], iso), date_selection_mode: 'multiple' });
        }}
        onAvailabilityType={(t) => patchVipSchedule({ ...current, type: t })}
        onRange={(r) => patchVipSchedule({ ...current, type: availability.type, range: r })}
        onUrgentHour={(h) => patchVipSchedule({ type: 'urgent', hour: h })}
        onUrgentMinute={(m) => patchVipSchedule({ type: 'urgent', minute: m })}
        onUrgentTimingMode={(m) => patchVipSchedule({ type: 'urgent', mode: m })}
      />
      {showNurseGender ? (
        <PreferredNurseGenderButtons
          value={String(fd.preferred_nurse_gender ?? 'any')}
          onChange={(v) => setFd({ preferred_nurse_gender: v })}
        />
      ) : null}
    </Animated.View>
  );
}

function buildStyles() {
  return {
    section: { gap: spacing[4] },
  };
}
