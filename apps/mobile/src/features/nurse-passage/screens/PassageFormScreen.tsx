import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { ClipboardList, FileText, HeartPulse } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackContentTopInset } from '@/navigation/use-stack-scroll-config';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { Button } from '@/components/ui/Button';
import { Row, Stack } from '@/components/layout/primitives';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { DetailSegmentBar } from '@/features/appointments/detail/components/layout/DetailSegmentBar';
import { fetchPatientProfile } from '@/features/patients/api/patient-profile.service';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';
import { createNursePassageSeries } from '../api/nurse-passage.service';
import type { PassagePrescriptionDraft } from '@/features/prescriptions/api/prescriptions.service';
import { savePrescriptionPdf } from '@/features/prescriptions/api/prescriptions.service';
import { PassageFormCareSheet } from '../components/PassageFormCareSheet';
import { PassageFormDocumentsPanel } from '../components/PassageFormDocumentsPanel';
import { PassageFormDurationSheet } from '../components/PassageFormDurationSheet';
import { PassageFormFieldRow } from '../components/PassageFormFieldRow';
import { PassageFormHealthRecordPanel } from '../components/PassageFormHealthRecordPanel';
import { PassageFormLocationSheet } from '../components/PassageFormLocationSheet';
import { PassageFormNotesSheet } from '../components/PassageFormNotesSheet';
import { PassageFormPlanningSheet } from '../components/PassageFormPlanningSheet';
import { PassageFormTimeSheet } from '../components/PassageFormTimeSheet';
import {
  formatCareSummary,
  formatLocationSummary,
  formatNotesSummary,
  formatPassageDurationSummary,
  formatPlanningSummary,
  formatTimeSummary,
} from '../utils/passage-form-summaries';
import {
  buildPlanningPayload,
  defaultPlanningFormState,
  embedTimeRangeInPlanningConfig,
  previewPassageCount,
  suggestPlanningFromCare,
} from '../utils/passage-planning';
import { useToast } from '@/providers/ToastProvider';
import { parseProfileAddress, hasValidGeoAddress } from '@/features/profile/utils/parse-profile-address';
import { useAuthStore } from '@/store/auth-store';
import type { NursePassageNursingItem, PassageTimeSlot } from '@oneandlab/shared-types';
import { H_PADDING, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type SheetKey = 'planning' | 'time' | 'location' | 'duration' | 'care' | 'notes' | null;
type SegmentId = 'information' | 'documents' | 'health_record';

const PASSAGE_FORM_SEGMENTS = [
  { id: 'information' as const, label: 'Informations', Icon: ClipboardList },
  { id: 'documents' as const, label: 'Documents', Icon: FileText },
  { id: 'health_record' as const, label: 'Carnet', Icon: HeartPulse },
];

function paramString(v: string | string[] | undefined): string {
  const raw = Array.isArray(v) ? v[0] : v;
  return raw != null ? String(raw).trim() : '';
}

export function PassageFormScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const contentTopInset = useStackContentTopInset();
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

  const patientQ = useQuery({
    queryKey: ['passage-patient', patientId],
    queryFn: async () => {
      const res = await fetchPatientProfile(patientId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Patient introuvable');
      return res.data;
    },
    enabled: Boolean(patientId),
  });

  const [timeSlot, setTimeSlot] = useState<PassageTimeSlot>('morning');
  const [customTime, setCustomTime] = useState('09:00');
  const [timeRange, setTimeRange] = useState<[number, number] | null>(null);
  const [atHome, setAtHome] = useState(true);
  const [duration, setDuration] = useState<number>(30);
  const [customDuration, setCustomDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [planningState, setPlanningState] = useState(() => {
    const base = defaultPlanningFormState(stripDate);
    if (flowMode === 'recurring') {
      return { ...base, planningMode: 'interval' as const };
    }
    return base;
  });
  const [nursingItems, setNursingItems] = useState<NursePassageNursingItem[]>([]);
  const [planningEdited, setPlanningEdited] = useState(false);
  const [openSheet, setOpenSheet] = useState<SheetKey>(null);
  const [segment, setSegment] = useState<SegmentId>('information');
  const [passagePrescriptionDraft, setPassagePrescriptionDraft] =
    useState<PassagePrescriptionDraft | null>(null);
  const prescriptionDraftRef = useRef<PassagePrescriptionDraft | null>(null);

  useEffect(() => {
    prescriptionDraftRef.current = passagePrescriptionDraft;
  }, [passagePrescriptionDraft]);

  const patientName = useMemo(() => {
    const p = patientQ.data;
    if (!p) return '…';
    return [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || 'Patient';
  }, [patientQ.data]);

  const passageCount = useMemo(
    () => previewPassageCount(planningState, nursingItems),
    [planningState, nursingItems],
  );

  const { data: careCategories = [] } = useAppointmentCareCategories();
  const careSummary = useMemo(
    () => formatCareSummary(nursingItems, careCategories),
    [nursingItems, careCategories],
  );

  useEffect(() => {
    if (planningEdited || nursingItems.length === 0) return;
    setPlanningState((prev) => {
      const patch = suggestPlanningFromCare(prev, nursingItems);
      return patch ? { ...prev, ...patch } : prev;
    });
  }, [nursingItems, planningEdited]);

  const createMut = useMutation({
    mutationFn: async (input: Parameters<typeof createNursePassageSeries>[0]) => {
      const data = await createNursePassageSeries(input);
      const draft = prescriptionDraftRef.current;
      const appointmentId = data.appointment_ids?.[0];
      if (draft && appointmentId) {
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
      return data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['nurse-tour'] });
      const ordonnanceMsg = prescriptionDraftRef.current ? ' Ordonnance ajoutée au passage.' : '';
      toast(`${data.created_appointments} passage(s) planifié(s).${ordonnanceMsg}`, { type: 'success' });
      router.replace('/(nurse)/tournee' as never);
    },
    onError: (e: Error) => {
      toast(e.message || 'Enregistrement impossible', { type: 'error' });
    },
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

    createMut.mutate({
      patient_id: patientId,
      planning_type,
      planning_config: embedTimeRangeInPlanningConfig(
        planning_config,
        timeSlot === 'all_day' ? null : timeRange,
      ),
      time_slot: timeSlot,
      custom_time: timeSlot === 'custom' ? customTime : null,
      time_range: timeSlot === 'all_day' ? null : timeRange,
      duration_minutes: durationMinutes,
      at_home: atHome,
      nursing_items: nursingItems,
      notes: notes.trim() || null,
    });
  };

  if (patientQ.isLoading) {
    return (
      <StackChromeScreen title="Prise en charge">
        <View style={[styles.centered, { paddingTop: contentTopInset }]}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen title="Prise en charge">
      <View style={[styles.screen, { paddingTop: contentTopInset, backgroundColor: c.background }]}>
        <View style={styles.header}>
          <DetailSegmentBar
            segments={PASSAGE_FORM_SEGMENTS}
            active={segment}
            onChange={(id) => setSegment(id as SegmentId)}
            compact
          />
        </View>

        {segment === 'information' ? (
          <KeyboardScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Stack gap={spacing[3]}>
              <View style={styles.patientBlock}>
                <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>Patient</Text>
                <Row gap={spacing[3]} align="center" style={styles.patientRow}>
                  <ProfileAvatar
                    profileImageUrl={patientQ.data?.profile_image_url}
                    seed={patientId || patientName}
                    gender={patientQ.data?.gender}
                    size={48}
                  />
                  <View style={styles.patientNameCol}>
                    <Text style={[styles.patientName, { color: c.textPrimary }]} numberOfLines={2}>
                      {patientName}
                    </Text>
                  </View>
                </Row>
              </View>

              <PassageFormFieldRow
                label="Planification"
                value={formatPlanningSummary(planningState, passageCount)}
                onPress={() => setOpenSheet('planning')}
              />
              <PassageFormFieldRow
                label="Heure de passage"
                value={formatTimeSummary(timeSlot, customTime, timeRange)}
                onPress={() => setOpenSheet('time')}
              />
              <PassageFormFieldRow
                label="Lieu"
                value={locationSummary}
                onPress={() => setOpenSheet('location')}
              />
              <PassageFormFieldRow
                label="Durée du passage"
                value={formatPassageDurationSummary(duration, customDuration)}
                onPress={() => setOpenSheet('duration')}
              />
              <PassageFormFieldRow
                label="Soins"
                value={careSummary}
                empty={nursingItems.length === 0}
                onPress={() => setOpenSheet('care')}
              />
              <PassageFormFieldRow
                label="Note"
                value={formatNotesSummary(notes)}
                empty={!notes.trim()}
                onPress={() => setOpenSheet('notes')}
              />

              <Button
                title={createMut.isPending ? 'Enregistrement…' : 'Enregistrer le passage'}
                onPress={handleSubmit}
                disabled={createMut.isPending}
                loading={createMut.isPending}
                fullWidth
              />
            </Stack>
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
      <PassageFormTimeSheet
        visible={openSheet === 'time'}
        timeSlot={timeSlot}
        customTime={customTime}
        timeRange={timeRange}
        passageDate={planningState.startDate}
        onClose={() => setOpenSheet(null)}
        onConfirm={(slot, time, range) => {
          setTimeSlot(slot);
          setCustomTime(time);
          setTimeRange(range);
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

function buildStyles(_c: AppColors) {
  return {
    screen: { flex: 1, minWidth: 0 },
    header: {
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[1],
      paddingBottom: spacing[2],
    },
    bodyScroll: { flex: 1, minWidth: 0 },
    scroll: {
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[1],
      paddingBottom: spacing[10],
    },
    altScrollContent: {
      paddingTop: spacing[1],
      paddingBottom: spacing[10],
    },
    centered: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
    patientBlock: { gap: spacing[2] },
    patientRow: { minWidth: 0 },
    patientNameCol: { flex: 1, minWidth: 0 },
    sectionLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    patientName: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xl,
      lineHeight: fontSize.xl * 1.2,
    },
  };
}
