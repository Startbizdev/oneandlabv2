import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { FormScheduleSection } from '@/features/appointments/form/components/FormScheduleSection';
import {
  isAvailabilityValid,
  parseAvailabilityField,
  type AvailabilityType,
} from '@/features/appointments/form/utils/availability';
import { Button } from '@/components/ui/Button';
import { SheetModal } from '@/components/ui/SheetModal';
import { normalizeRescheduleDate } from '@/features/appointments/reschedule/utils/normalize-reschedule-date';
import type { NurseTourStop } from '../api/nurse-tour.service';
import { buildTourReschedulePayload } from '../utils/build-tour-reschedule-payload';

type Props = {
  stop: NurseTourStop | null;
  visible: boolean;
  onClose: () => void;
  onConfirm: (payload: { scheduled_at: string; availability: string }) => Promise<void>;
};

export function TourStopRescheduleSheet({ stop, visible, onClose, onConfirm }: Props) {
  const initial = useMemo(() => {
    if (!stop) return null;
    const parsed = parseAvailabilityField(stop.availability);
    const type: AvailabilityType = parsed.type === 'urgent' ? 'custom' : parsed.type;
    return {
      date: normalizeRescheduleDate(stop.scheduled_at?.slice(0, 10)),
      type,
      range: parsed.range,
    };
  }, [stop]);

  const [scheduledAt, setScheduledAt] = useState('');
  const [availabilityType, setAvailabilityType] = useState<AvailabilityType>('custom');
  const [range, setRange] = useState<[number, number]>([9, 11]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setScheduledAt(initial.date);
    setAvailabilityType(initial.type);
    setRange(initial.range);
  }, [initial]);

  if (!stop || !initial) return null;

  const valid = isAvailabilityValid(availabilityType, range);

  const submit = async () => {
    const payload = buildTourReschedulePayload({
      dateYmd: scheduledAt,
      availabilityType,
      range,
    });
    if (!payload) return;
    setSaving(true);
    try {
      await onConfirm(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = dayjs(scheduledAt).isValid()
    ? dayjs(scheduledAt).format('dddd D MMMM')
    : scheduledAt;

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Modifier le créneau"
      subtitle={`${stop.patient_name} · ${dateLabel}`}
      footer={
        <Button
          title={saving ? 'Enregistrement…' : 'Enregistrer le créneau'}
          onPress={() => void submit()}
          disabled={!valid || saving}
          fullWidth
          size="lg"
        />
      }
    >
      <FormScheduleSection
        scheduledAt={scheduledAt}
        serviceType="nursing"
        availabilityType={availabilityType}
        range={range}
        showVipTab={false}
        onScheduledAt={setScheduledAt}
        onAvailabilityType={setAvailabilityType}
        onRange={setRange}
      />
    </SheetModal>
  );
}
