import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { FormScheduleSection } from '@/features/appointments/form/components/FormScheduleSection';
import {
  isAvailabilityValid,
  parseAvailabilityField,
  type AvailabilityType,
} from '@/features/appointments/form/utils/availability';
import { Button } from '@/components/ui/Button';
import { SheetModal } from '@/components/ui/SheetModal';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { normalizeRescheduleDate } from '@/features/appointments/reschedule/utils/normalize-reschedule-date';
import type { NurseTourStop } from '../api/nurse-tour.service';
import { buildTourReschedulePayload } from '../utils/build-tour-reschedule-payload';

function initialDraft(stop: NurseTourStop | null) {
  if (!stop) return null;
  const parsed = parseAvailabilityField(stop.availability);
  const type: AvailabilityType = parsed.type === 'urgent' ? 'custom' : parsed.type;
  return {
    date: normalizeRescheduleDate(stop.scheduled_at?.slice(0, 10)),
    type,
    range: parsed.range,
  };
}

type Props = {
  stop: NurseTourStop | null;
  visible: boolean;
  onClose: () => void;
  onConfirm: (payload: { scheduled_at: string; availability: string }) => Promise<void>;
};

export function TourStopRescheduleSheet({ stop, visible, onClose, onConfirm }: Props) {
  const { show: toast } = useToast();
  const initial = useMemo(() => initialDraft(stop), [stop]);

  /** Brouillon (ré)initialisé pendant le rendu à chaque ouverture : jamais de premier frame vide. */
  const draftKey = visible && stop ? stop.stop_id : null;
  const [draftFor, setDraftFor] = useState(draftKey);
  const [scheduledAt, setScheduledAt] = useState(() => initial?.date ?? '');
  const [availabilityType, setAvailabilityType] = useState<AvailabilityType>(() => initial?.type ?? 'custom');
  const [range, setRange] = useState<[number, number]>(() => initial?.range ?? [9, 11]);
  const [saving, setSaving] = useState(false);

  if (draftFor !== draftKey) {
    setDraftFor(draftKey);
    if (initial) {
      setScheduledAt(initial.date);
      setAvailabilityType(initial.type);
      setRange(initial.range);
    }
  }

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
    } catch (error) {
      handleApiError(error, toast, 'tour-reschedule', 'Déplacement impossible');
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
      dismissible={!saving}
      footer={
        <Button
          title="Enregistrer le créneau"
          onPress={() => void submit()}
          loading={saving}
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
