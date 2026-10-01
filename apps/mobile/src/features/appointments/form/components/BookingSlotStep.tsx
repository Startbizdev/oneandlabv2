import type { Dispatch, SetStateAction } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { isBloodTestAppointment, isNursingAppointment, type SelectedServiceInput } from '@oneandlab/shared-utils';
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

/** Étape « Créneau » d'un soin (ou d'un lot) : jour, plage horaire ou horaire prioritaire. */
export function BookingSlotStep({ mode, role, service, formDataByService, setFormDataByService, vipFeeLabel }: Props) {
  const styles = useStyles(buildStyles);
  const svcId = service.id;
  const fd = formDataByService[svcId] ?? {};
  const availability = parseSlice(fd);

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

  const showVipTab = mode === 'patient' && isBloodTestAppointment(service.type);
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
        onScheduledAt={(v) => setFd({ scheduled_at: v })}
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
