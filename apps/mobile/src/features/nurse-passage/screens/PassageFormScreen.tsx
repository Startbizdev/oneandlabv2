import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ClipboardList, FileText, HeartPulse } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SettingsSection } from '@/components/ui/SettingsSection';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import { SkeletonList } from '@/components/ui/skeletons';
import { FullWidthSegmentBar, type FullWidthSegment } from '@/components/ui/FullWidthSegmentBar';
import { createAppointmentRequestId } from '@oneandlab/shared-utils';
import { invalidateNursePassageQueries } from '../hooks/invalidate-nurse-passage-queries';
import { usePassagePatient } from '../hooks/use-passage-patient';
import { PassagePatientHeader } from '../components/PassagePatientHeader';
import { PASSAGE_FIELD_ICONS } from '../components/passage-field-icons';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';
import { createNursePassageSeries } from '../api/nurse-passage.service';
import { PassageCreationAttempt } from '../utils/passage-creation-attempt';
import type { PassagePrescriptionDraft } from '@/features/prescriptions/api/prescriptions.service';
import { savePrescriptionPdf } from '@/features/prescriptions/api/prescriptions.service';
import { PassageFormCareSheet } from '../components/PassageFormCareSheet';
import { PassageFormDailyTimesSheet } from '../components/PassageFormDailyTimesSheet';
import { PassageFormDocumentsPanel } from '../components/PassageFormDocumentsPanel';
import { PassageFormDurationSheet } from '../components/PassageFormDurationSheet';
import { PassageFormHealthRecordPanel } from '../components/PassageFormHealthRecordPanel';
import { PassageFormLocationSheet } from '../components/PassageFormLocationSheet';
import { PassageFormNotesSheet } from '../components/PassageFormNotesSheet';
import { PassageFormPlanningSheet } from '../components/PassageFormPlanningSheet';
import {
  buildPlanningPayload,
  defaultPlanningFormState,
  embedTimeRangeInPlanningConfig,
  previewPassageCount,
  suggestPlanningFromCare,
  frequencyDailySlots,
} from '../utils/passage-planning';
import {
  formatCareSummary,
  formatDailyTimesSummary,
  formatLocationSummary,
  formatNotesSummary,
  formatPassageDurationSummary,
  formatPlanningSummary,
} from '../utils/passage-form-summaries';
import { useToast } from '@/providers/ToastProvider';
import { nursePassageCreateErrorMessage } from '@oneandlab/shared-api';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { parseProfileAddress, hasValidGeoAddress } from '@/features/profile/utils/parse-profile-address';
import { useAuthStore } from '@/store/auth-store';
import type { NursePassageNursingItem, PassageDailyTimeSlot } from '@oneandlab/shared-types';
import { H_PADDING, spacing, useStyles, type Theme } from '@/theme';

type SheetKey = 'planning' | 'daily_times' | 'location' | 'duration' | 'care' | 'notes' | null;
type SegmentId = 'information' | 'documents' | 'health_record';

const PASSAGE_FORM_SEGMENTS: FullWidthSegment<SegmentId>[] = [
  { id: 'information', label: 'Informations', Icon: ClipboardList },
  { id: 'documents', label: 'Documents', Icon: FileText },
  { id: 'health_record', label: 'Carnet', Icon: HeartPulse },
];

function paramString(v: string | string[] | undefined): string {
  const raw = Array.isArray(v) ? v[0] : v;
  return raw != null ? String(raw).trim() : '';
}

export function PassageFormScreen() {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const params = useLocalSearchParams<{
    patient_id?: string | string[];
    start_date?: string | string[];
    mode?: string | string[];
  }>();

  const user = useAuthStore((s) => s.user);

  const patientId = paramString(params.patient_id);
  const stripDate = paramString(params.start_date) || new Date().toISOString().slice(0, 10);
  const flowMode = paramString(params.mode);

  const patientQ = usePassagePatient(patientId);

  const [atHome, setAtHome] = useState(true);
  const [duration, setDuration] = useState<number>(30);
  const [customDuration, setCustomDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [planningState, setPlanningState] = useState(() =>
    defaultPlanningFormState(stripDate, { recurring: flowMode === 'recurring' }),
  );
  const [dailyTimeSlots, setDailyTimeSlots] = useState<PassageDailyTimeSlot[]>([
    { time_slot: 'morning', custom_time: null },
  ]);
  const [nursingItems, setNursingItems] = useState<NursePassageNursingItem[]>([]);
  const [planningEdited, setPlanningEdited] = useState(false);
  const [openSheet, setOpenSheet] = useState<SheetKey>(null);
  const [segment, setSegment] = useState<SegmentId>('information');
  const [passagePrescriptionDraft, setPassagePrescriptionDraft] =
    useState<PassagePrescriptionDraft | null>(null);
  const prescriptionDraftRef = useRef<PassagePrescriptionDraft | null>(null);
  const creationAttempt = useRef(new PassageCreationAttempt(createAppointmentRequestId));

  useEffect(() => {
    prescriptionDraftRef.current = passagePrescriptionDraft;
  }, [passagePrescriptionDraft]);

  const patientName = useMemo(() => {
    const p = patientQ.data;
    if (!p) return '…';
    return [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || 'Patient';
  }, [patientQ.data]);

  const passageCount = useMemo(
    () => previewPassageCount(planningState, nursingItems, dailyTimeSlots.length),
    [planningState, nursingItems, dailyTimeSlots.length],
  );

  const { data: careCategories = [] } = useAppointmentCareCategories();
  const careSummary = useMemo(
    () => formatCareSummary(nursingItems, careCategories),
    [nursingItems, careCategories],
  );

  useEffect(() => {
    if (planningEdited || nursingItems.length === 0) return;
    const slots = frequencyDailySlots(nursingItems.find((item) => item.frequency)?.frequency);
    if (slots) setDailyTimeSlots(slots);
    setPlanningState((prev) => {
      const patch = suggestPlanningFromCare(prev, nursingItems);
      return patch ? { ...prev, ...patch } : prev;
    });
  }, [nursingItems, planningEdited]);

  const createMut = useMutation({
    mutationFn: async (input: Parameters<typeof createNursePassageSeries>[0]) => {
      return creationAttempt.current.run(input, createNursePassageSeries, async (data) => {
      const draft = prescriptionDraftRef.current;
      const appointmentId = data.appointment_ids?.[0];
      if (draft) {
        const saveRes = await savePrescriptionPdf(draft.pdfUri, {
          patientId: input.patient_id,
          appointmentId,
          fileName: draft.fileName,
          prescriptionKind: draft.prescriptionKind,
          prescriptionText: draft.prescriptionText,
          prescriptionNumber: draft.prescriptionNumber,
        });
        if (!saveRes.success) {
          throw new Error(saveRes.error ?? 'Passage créé mais ordonnance non enregistrée');
        }
      }
      });
    },
    onSuccess: (data) => {
      invalidateNursePassageQueries(qc);
      const ordonnanceMsg = prescriptionDraftRef.current ? (data.appointment_ids?.length ? ' Ordonnance ajoutée au passage.' : ' Ordonnance enregistrée dans les documents du patient.') : '';
      toast(`${data.created_appointments} passage(s) planifié(s).${ordonnanceMsg}`, { type: 'success' });
      router.replace('/(nurse)/(tabs)/tournee');
    },
    onError: (e) =>
      handleApiError(e, toast, 'passage-create', 'Enregistrement impossible', nursePassageCreateErrorMessage),
  });

  const handlePlanningConfirm = (next: typeof planningState) => {
    setPlanningEdited(true);
    setPlanningState(next);
  };

  const locationSummary = useMemo(() => {
    const raw = atHome ? patientQ.data?.address : user?.address;
    const parsed = parseProfileAddress(raw);
    return formatLocationSummary(atHome, parsed?.label);
  }, [atHome, patientQ.data?.address, user?.address]);

  const handleSubmit = () => {
    if (!patientId) {
      toast('Patient requis', { type: 'error' });
      return;
    }
    if (nursingItems.length === 0) {
      toast('Ajoutez au moins un soin', { type: 'error' });
      return;
    }
    if (planningState.planningMode === 'weekdays' && planningState.weekdays.length === 0) {
      toast('Sélectionnez au moins un jour de la semaine', { type: 'error' });
      return;
    }
    if (planningState.planningMode === 'custom_dates' && planningState.customDates.length === 0) {
      toast('Sélectionnez au moins une date', { type: 'error' });
      return;
    }

    const locationAddr = parseProfileAddress(atHome ? patientQ.data?.address : user?.address);
    if (!hasValidGeoAddress(locationAddr)) {
      toast('Complétez l’adresse dans Lieu (suggestion GPS requise).', { type: 'error' });
      setOpenSheet('location');
      return;
    }

    const durationMinutes =
      duration === -1 ? Math.max(5, parseInt(customDuration, 10) || 30) : duration;

    const { planning_type, planning_config } = buildPlanningPayload(planningState, nursingItems);
    const slotsPayload: PassageDailyTimeSlot[] =
      dailyTimeSlots.length > 0 ? dailyTimeSlots : [{ time_slot: 'morning', custom_time: null }];
    const primarySlot = slotsPayload[0];
    const planningWithRange = embedTimeRangeInPlanningConfig(
      planning_config,
      null,
      slotsPayload,
    );

    createMut.mutate({
      patient_id: patientId,
      planning_type,
      planning_config: planningWithRange,
      time_slot: primarySlot.time_slot,
      custom_time: primarySlot.time_slot === 'all_day' ? null : primarySlot.custom_time ?? null,
      time_range: null,
      duration_minutes: durationMinutes,
      at_home: atHome,
      nursing_items: nursingItems,
      notes: notes.trim() || null,
    });
  };

  if (!patientId) {
    return (
      <StackChromeScreen>
        <EmptyState
          illustration="patients"
          title="Aucun patient sélectionné"
          actionLabel="Choisir un patient"
          onAction={() => router.back()}
        />
      </StackChromeScreen>
    );
  }

  if (patientQ.isLoading) {
    return (
      <StackChromeScreen>
        <View style={styles.loading}>
          <SkeletonList count={5} itemHeight={56} gap={spacing[2]} />
        </View>
      </StackChromeScreen>
    );
  }

  if (patientQ.isError || !patientQ.data) {
    return (
      <StackChromeScreen>
        <ErrorState title="Patient indisponible" error={patientQ.error} onRetry={() => void patientQ.refetch()} />
      </StackChromeScreen>
    );
  }

  const patient = patientQ.data;
  const fieldRows: SettingsRowProps[] = [
    {
      icon: PASSAGE_FIELD_ICONS.planning,
      label: 'Planification',
      description: formatPlanningSummary(planningState, passageCount),
      onPress: () => setOpenSheet('planning'),
    },
    {
      icon: PASSAGE_FIELD_ICONS.time,
      label: 'Créneaux',
      description: formatDailyTimesSummary(dailyTimeSlots),
      onPress: () => setOpenSheet('daily_times'),
    },
    {
      icon: PASSAGE_FIELD_ICONS.location,
      label: 'Lieu',
      description: locationSummary,
      onPress: () => setOpenSheet('location'),
    },
    {
      icon: PASSAGE_FIELD_ICONS.duration,
      label: 'Durée',
      description: formatPassageDurationSummary(duration, customDuration),
      onPress: () => setOpenSheet('duration'),
    },
    {
      icon: PASSAGE_FIELD_ICONS.care,
      label: 'Soins',
      description: careSummary,
      onPress: () => setOpenSheet('care'),
    },
    {
      icon: PASSAGE_FIELD_ICONS.notes,
      label: 'Note',
      description: formatNotesSummary(notes),
      onPress: () => setOpenSheet('notes'),
    },
  ];

  return (
    <StackChromeScreen>
      <View style={styles.screen}>
        <View style={styles.header}>
          <FullWidthSegmentBar
            segments={PASSAGE_FORM_SEGMENTS}
            value={segment}
            onChange={setSegment}
            accessibilityLabel="Sections du passage"
          />
        </View>

        {segment === 'information' ? (
          <KeyboardScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <PassagePatientHeader
              name={patientName}
              seed={patientId}
              profileImageUrl={patient.profile_image_url}
              gender={patient.gender}
            />
            <SettingsSection items={fieldRows} />
            <Button
              title="Enregistrer le passage"
              onPress={handleSubmit}
              disabled={createMut.isPending}
              loading={createMut.isPending}
              fullWidth
            />
          </KeyboardScrollView>
        ) : (
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.altScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {segment === 'documents' ? (
              <PassageFormDocumentsPanel
                patientId={patientId}
                onPrescriptionDraft={setPassagePrescriptionDraft}
              />
            ) : (
              <PassageFormHealthRecordPanel
                patientId={patientId}
                clinicalVitalContext={{ type: 'passage' }}
              />
            )}
          </ScrollView>
        )}
      </View>

      <PassageFormPlanningSheet
        visible={openSheet === 'planning'}
        state={planningState}
        nursingItems={nursingItems}
        onClose={() => setOpenSheet(null)}
        onConfirm={handlePlanningConfirm}
      />
      <PassageFormDailyTimesSheet
        visible={openSheet === 'daily_times'}
        slots={dailyTimeSlots}
        onClose={() => setOpenSheet(null)}
        onConfirm={(slots) => {
          setDailyTimeSlots(slots);
        }}
      />
      <PassageFormLocationSheet
        visible={openSheet === 'location'}
        atHome={atHome}
        patientId={patientId}
        patientAddressRaw={patientQ.data?.address}
        onClose={() => setOpenSheet(null)}
        onConfirm={setAtHome}
      />
      <PassageFormDurationSheet
        visible={openSheet === 'duration'}
        duration={duration}
        customDuration={customDuration}
        onClose={() => setOpenSheet(null)}
        onConfirm={(d, custom) => {
          setDuration(d);
          setCustomDuration(custom);
        }}
      />
      <PassageFormCareSheet
        visible={openSheet === 'care'}
        items={nursingItems}
        onClose={() => setOpenSheet(null)}
        onConfirm={setNursingItems}
      />
      <PassageFormNotesSheet
        visible={openSheet === 'notes'}
        notes={notes}
        onClose={() => setOpenSheet(null)}
        onConfirm={setNotes}
      />
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    screen: { flex: 1, minWidth: 0, paddingTop: spacing[3], backgroundColor: c.background },
    header: {
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[1],
      paddingBottom: spacing[2],
    },
    bodyScroll: { flex: 1, minWidth: 0 },
    scroll: {
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[2],
      paddingBottom: spacing[10],
      gap: spacing[5],
    },
    altScrollContent: {
      paddingTop: spacing[1],
      paddingBottom: spacing[10],
    },
    loading: { paddingHorizontal: H_PADDING, paddingTop: spacing[4] },
  };
}
