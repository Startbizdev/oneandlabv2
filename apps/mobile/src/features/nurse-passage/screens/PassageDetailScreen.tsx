import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Ellipsis, FileText, HeartPulse, Navigation } from 'lucide-react-native';
import {
  canCancelAppointment,
  resolvePassageCustomTime,
  resolvePassageTimeRange,
} from '@oneandlab/shared-utils';
import type {
  NursePassageNursingItem,
  NursePassageSeriesInput,
  PassagePlanningConfig,
  PassageTimeSlot,
  PatientAbsence,
} from '@oneandlab/shared-types';
import { PASSAGE_DURATION_PRESETS } from '@oneandlab/shared-types';
import { nursePassageSeriesErrorMessage } from '@oneandlab/shared-api';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { appointmentDetailHref } from '@/navigation/role-hrefs';
import { HeaderAction } from '@/components/navigation/HeaderAction';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorState } from '@/components/ui/ErrorState';
import { SettingsSection } from '@/components/ui/SettingsSection';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import { SkeletonList } from '@/components/ui/skeletons';
import { fetchAppointment, updateAppointment } from '@/features/appointments/api/appointments.service';
import { cancelAppointment } from '@/features/appointments/detail/api/appointment-detail.service';
import { DetailSegmentBar } from '@/features/appointments/detail/components/layout/DetailSegmentBar';
import { medicalDocumentsQueryOptions } from '@/features/appointments/detail/hooks/use-appointment-detail-extras';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';
import { filterListDocuments } from '@/features/appointments/detail/utils/document-labels';
import {
  resolveAppointmentDetailAddressLine,
  resolveAppointmentMapCoords,
} from '@/features/appointments/detail/utils/appointment-address-display';
import { parseProfileAddress } from '@/features/profile/utils/parse-profile-address';
import { updateNurseTourStopStatus } from '@/features/tournee-nurse/api/nurse-tour.service';
import { NURSE_TOUR_QUERY_ROOT } from '@/features/tournee-nurse/hooks/nurse-tour-query';
import {
  buildTourNavigationUrl,
  cachedNurseNavAppPref,
  openTourNavigation,
} from '@/features/tournee-nurse/utils/tour-navigation';
import { PatientAbsenceSheet } from '@/features/patient-absence/components/PatientAbsenceSheet';
import { fetchPatientAbsences } from '@/features/patient-absence/api/patient-absence.service';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { useAppColors } from '@/theme/use-app-colors';
import { H_PADDING, ICON_STROKE_WIDTH, spacing, iconSize, useStyles, type Theme } from '@/theme';
import {
  deleteNursePassageSeries,
  fetchNursePassageSeries,
  materializeNursePassageSeries,
  updateNursePassageSeries,
} from '../api/nurse-passage.service';
import { PassageDetailActionsSheet } from '../components/PassageDetailActionsSheet';
import { PassageDetailDocumentsPanel } from '../components/PassageDetailDocumentsPanel';
import { PassageFormCareSheet } from '../components/PassageFormCareSheet';
import { PassageFormDurationSheet } from '../components/PassageFormDurationSheet';
import { PassageFormHealthRecordPanel } from '../components/PassageFormHealthRecordPanel';
import { PassageFormLocationSheet } from '../components/PassageFormLocationSheet';
import { PassageFormNotesSheet } from '../components/PassageFormNotesSheet';
import { PassageFormPlanningSheet } from '../components/PassageFormPlanningSheet';
import { PassageFormTimeSheet } from '../components/PassageFormTimeSheet';
import { PassagePatientHeader } from '../components/PassagePatientHeader';
import { PASSAGE_FIELD_ICONS } from '../components/passage-field-icons';
import { usePassagePatient } from '../hooks/use-passage-patient';
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
  planningStateFromSeries,
  previewPassageCount,
  type PassagePlanningFormState,
} from '../utils/passage-planning';
import {
  buildAppointmentPassageUpdateBody,
  initPassageFormFromAppointment,
} from '../utils/passage-appointment-update';

type SheetKey =
  | 'planning'
  | 'time'
  | 'location'
  | 'duration'
  | 'care'
  | 'notes'
  | 'actions'
  | 'absence'
  | 'confirm_delete_one'
  | 'confirm_delete_series'
  | null;

type SegmentId = 'information' | 'documents' | 'health_record';

const APPOINTMENT_ONLY_SERIES_IDS = new Set(['rdv', '_', 'appointment']);

const PASSAGE_DETAIL_SEGMENTS = [
  { id: 'information' as const, label: 'Informations', Icon: ClipboardList },
  { id: 'documents' as const, label: 'Documents', Icon: FileText },
  { id: 'health_record' as const, label: 'Carnet', Icon: HeartPulse },
];

function resolveSeriesId(raw: string): string {
  const id = String(raw ?? '').trim();
  return APPOINTMENT_ONLY_SERIES_IDS.has(id) ? '' : id;
}

function durationFromSeries(minutes: number): { duration: number; customDuration: string } {
  if ((PASSAGE_DURATION_PRESETS as readonly number[]).includes(minutes)) {
    return { duration: minutes, customDuration: '' };
  }
  return { duration: -1, customDuration: String(minutes) };
}

function resolveDurationMinutes(duration: number, customDuration: string): number {
  return duration === -1 ? Math.max(5, parseInt(customDuration, 10) || 30) : duration;
}

export function PassageDetailScreen() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  /** Quitte ce passage même si une sheet (route racine) est encore au premier plan, contrairement à `router.back()`. */
  const navigation = useNavigation();
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const params = useLocalSearchParams<{
    seriesId?: string;
    appointment_id?: string;
    stop_id?: string;
  }>();

  const seriesId = resolveSeriesId(String(params.seriesId ?? ''));
  const isAppointmentOnly = !seriesId;
  const appointmentId = String(params.appointment_id ?? '');
  const stopId = String(params.stop_id ?? '');

  const [segment, setSegment] = useState<SegmentId>('information');
  const [openSheet, setOpenSheet] = useState<SheetKey>(null);
  const [timeSlot, setTimeSlot] = useState<PassageTimeSlot>('morning');
  const [customTime, setCustomTime] = useState('09:00');
  const [timeRange, setTimeRange] = useState<[number, number] | null>([8, 12]);
  const [atHome, setAtHome] = useState(true);
  const [duration, setDuration] = useState<number>(30);
  const [customDuration, setCustomDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [planningState, setPlanningState] = useState<PassagePlanningFormState>(() =>
    defaultPlanningFormState(new Date().toISOString().slice(0, 10)),
  );
  const [nursingItems, setNursingItems] = useState<NursePassageNursingItem[]>([]);
  const formInitialized = useRef(false);

  const seriesQ = useQuery({
    queryKey: ['nurse-passage-series', seriesId],
    queryFn: () => fetchNursePassageSeries(seriesId),
    enabled: Boolean(seriesId),
  });

  const appointmentQ = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const res = await fetchAppointment(appointmentId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'RDV introuvable');
      return res.data;
    },
    enabled: Boolean(appointmentId),
  });

  const docsOptions = medicalDocumentsQueryOptions(appointmentId);
  const docsQ = useQuery({ ...docsOptions, enabled: docsOptions.enabled && segment === 'documents' });

  const series = seriesQ.data;
  const apt = appointmentQ.data;
  const patientId = apt?.patient_id ?? series?.patient_id ?? '';
  const patientQ = usePassagePatient(patientId);
  const patient = patientQ.data;

  const passageDate = useMemo(() => {
    if (apt?.scheduled_at) return apt.scheduled_at.slice(0, 10);
    if (series?.first_date) return series.first_date.slice(0, 10);
    return planningState.startDate;
  }, [apt?.scheduled_at, series?.first_date, planningState.startDate]);

  const absencesQ = useQuery({
    queryKey: ['patient-absences', patientId, passageDate],
    queryFn: () => fetchPatientAbsences(patientId, true),
    enabled: Boolean(patientId),
  });

  const activeAbsenceForDate = useMemo((): PatientAbsence | null => {
    const list = absencesQ.data ?? [];
    return (
      list.find(
        (a) => a.start_date.slice(0, 10) <= passageDate && a.end_date.slice(0, 10) >= passageDate,
      ) ?? null
    );
  }, [absencesQ.data, passageDate]);

  const invalidatePassage = useCallback(() => {
    void qc.invalidateQueries({ queryKey: NURSE_TOUR_QUERY_ROOT });
    void qc.invalidateQueries({ queryKey: ['nurse-passage-series', seriesId] });
    void qc.invalidateQueries({ queryKey: ['appointment', appointmentId] });
  }, [appointmentId, qc, seriesId]);

  const refreshAfterAbsenceChange = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['patient-absences', patientId] });
    invalidatePassage();
    toast('Absence enregistrée', { type: 'success' });
  }, [invalidatePassage, patientId, qc, toast]);

  const { data: careCategories = [] } = useAppointmentCareCategories();
  const careSummary = useMemo(
    () => formatCareSummary(nursingItems, careCategories),
    [nursingItems, careCategories],
  );

  useEffect(() => {
    if (!series || formInitialized.current) return;
    const cfg = series.planning_config as PassagePlanningConfig;
    const fallbackStart =
      series.first_date ?? apt?.scheduled_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    setTimeSlot(series.time_slot);
    setCustomTime(series.custom_time ?? '09:00');
    setTimeRange(
      resolvePassageTimeRange({
        time_slot: series.time_slot,
        custom_time: series.custom_time,
        planning_config: series.planning_config,
      }),
    );
    const dur = durationFromSeries(series.duration_minutes);
    setDuration(dur.duration);
    setCustomDuration(dur.customDuration);
    setAtHome(series.at_home);
    setNotes(series.notes ?? '');
    setNursingItems(series.nursing_items ?? []);
    setPlanningState(planningStateFromSeries(series.planning_type, cfg, fallbackStart));
    formInitialized.current = true;
  }, [series, apt?.scheduled_at]);

  useEffect(() => {
    if (!isAppointmentOnly || !apt || formInitialized.current) return;
    const fields = initPassageFormFromAppointment(apt);
    setTimeSlot(fields.time_slot);
    setCustomTime(fields.custom_time ?? '09:00');
    setTimeRange(
      resolvePassageTimeRange({
        time_slot: fields.time_slot,
        custom_time: fields.custom_time,
        availability: (apt.form_data as Record<string, unknown> | undefined)?.availability,
      }),
    );
    const dur = durationFromSeries(fields.duration_minutes);
    setDuration(dur.duration);
    setCustomDuration(dur.customDuration);
    setAtHome(fields.at_home);
    setNotes(fields.notes ?? '');
    setNursingItems(fields.nursing_items);
    setPlanningState(
      defaultPlanningFormState(apt.scheduled_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)),
    );
    formInitialized.current = true;
  }, [apt, isAppointmentOnly]);

  const patientName = patient
    ? [patient.first_name, patient.last_name].filter(Boolean).join(' ').trim() || 'Patient'
    : 'Patient';
  const formPhone = (apt?.form_data as Record<string, unknown> | undefined)?.phone;
  const phone = patient?.phone ?? (typeof formPhone === 'string' ? formPhone : null);

  const passageCount = useMemo(
    () => previewPassageCount(planningState, nursingItems),
    [planningState, nursingItems],
  );

  const locationSummary = useMemo(() => {
    const raw = atHome ? patient?.address : user?.address;
    return formatLocationSummary(atHome, parseProfileAddress(raw)?.label);
  }, [atHome, patient?.address, user?.address]);

  const navigationTarget = useMemo(() => {
    if (!atHome) {
      const parsed = parseProfileAddress(user?.address);
      if (!parsed?.label) return null;
      return { lat: parsed.lat, lng: parsed.lng, addressLine: parsed.label };
    }
    const line = apt ? resolveAppointmentDetailAddressLine(apt) : '';
    const coords = apt ? resolveAppointmentMapCoords(apt) : null;
    if (line || coords) {
      return { lat: coords?.lat ?? null, lng: coords?.lng ?? null, addressLine: line || null };
    }
    const parsed = parseProfileAddress(patient?.address);
    if (!parsed?.label) return null;
    return { lat: parsed.lat, lng: parsed.lng, addressLine: parsed.label };
  }, [apt, atHome, patient?.address, user?.address]);

  const canLaunchNavigation = Boolean(
    navigationTarget && buildTourNavigationUrl(cachedNurseNavAppPref(qc, stopId), navigationTarget),
  );

  const filteredDocs = useMemo(
    () => filterListDocuments(docsQ.data ?? [], { omitCarePhotos: true }),
    [docsQ.data],
  );

  const saveMut = useMutation({
    mutationFn: (payload: Partial<NursePassageSeriesInput>) => updateNursePassageSeries(seriesId, payload),
    onSuccess: (data) => {
      invalidatePassage();
      toast(
        data.created_appointments > 0
          ? `Mis à jour, ${data.created_appointments} passage(s) regénéré(s)`
          : 'Passage mis à jour',
        { type: 'success' },
      );
    },
    onError: (e) => handleApiError(e, toast, 'passage-update', 'Mise à jour impossible', nursePassageSeriesErrorMessage),
  });

  const saveAppointmentMut = useMutation({
    mutationFn: async (payload: Partial<NursePassageSeriesInput>) => {
      if (!apt) throw new Error('RDV introuvable');
      const effectiveSlot = (payload.time_slot ?? timeSlot) as PassageTimeSlot;
      const effectiveRange =
        payload.time_range !== undefined ? payload.time_range : effectiveSlot === 'all_day' ? null : timeRange;
      const snapshot = {
        time_slot: effectiveSlot,
        custom_time:
          payload.custom_time !== undefined ? payload.custom_time : effectiveSlot === 'custom' ? customTime : null,
        time_range: effectiveRange,
        duration_minutes: payload.duration_minutes ?? resolveDurationMinutes(duration, customDuration),
        at_home: payload.at_home ?? atHome,
        nursing_items: payload.nursing_items ?? nursingItems,
        notes: payload.notes !== undefined ? payload.notes : notes.trim() || null,
      };
      const body = buildAppointmentPassageUpdateBody(apt, payload, snapshot);
      const res = await updateAppointment(appointmentId, body);
      if (!res.success) throw new Error(res.error ?? 'Mise à jour impossible');
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NURSE_TOUR_QUERY_ROOT });
      void qc.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      toast('Passage mis à jour', { type: 'success' });
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  });

  const persistUpdate = useCallback(
    (payload: Partial<NursePassageSeriesInput>) => {
      if (isAppointmentOnly) {
        saveAppointmentMut.mutate(payload);
        return;
      }
      if (!seriesId) return;
      saveMut.mutate(payload);
    },
    [isAppointmentOnly, saveAppointmentMut, saveMut, seriesId],
  );

  const materializeMut = useMutation({
    mutationFn: async () => {
      await updateNursePassageSeries(seriesId, { planning_config: { start_date: planningState.startDate } });
      return materializeNursePassageSeries(seriesId);
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: NURSE_TOUR_QUERY_ROOT });
      void qc.invalidateQueries({ queryKey: ['nurse-passage-series', seriesId] });
      toast(
        data.created_appointments > 0
          ? `${data.created_appointments} passage(s) planifié(s)`
          : 'Aucun nouveau passage à générer',
        { type: 'success' },
      );
    },
    onError: (e) =>
      handleApiError(e, toast, 'passage-materialize', 'Génération impossible', nursePassageSeriesErrorMessage),
  });

  const enRouteMut = useMutation({
    mutationFn: async () => {
      if (!stopId) throw new Error('Arrêt tournée introuvable');
      await updateNurseTourStopStatus(stopId, 'en_route');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NURSE_TOUR_QUERY_ROOT });
      toast('Patient prévenu, vous êtes en route', { type: 'success' });
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  });

  const handleLaunchNavigation = useCallback(async () => {
    if (!navigationTarget) {
      toast('Adresse indisponible', { type: 'error' });
      return;
    }
    const opened = await openTourNavigation(cachedNurseNavAppPref(qc, stopId), navigationTarget);
    if (!opened) {
      toast('Impossible d’ouvrir la navigation', { type: 'error' });
      return;
    }
    if (!stopId) return;
    try {
      await updateNurseTourStopStatus(stopId, 'en_route');
      void qc.invalidateQueries({ queryKey: NURSE_TOUR_QUERY_ROOT });
      toast('Navigation lancée, patient prévenu', { type: 'success' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Notification impossible';
      toast(`Navigation lancée, mais ${message}`, { type: 'error' });
    }
  }, [navigationTarget, stopId, toast, qc]);

  const markDoneMut = useMutation({
    mutationFn: async () => {
      if (!stopId) throw new Error('Arrêt tournée introuvable');
      await updateNurseTourStopStatus(stopId, 'done', { finalizeAppointment: true });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NURSE_TOUR_QUERY_ROOT });
      toast('Passage marqué comme effectué', { type: 'success' });
      navigation.goBack();
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  });

  const deleteOneMut = useMutation({
    mutationFn: async () => {
      const res = await cancelAppointment(appointmentId, {
        reason: 'other',
        comment: 'Passage supprimé par infirmier',
      });
      if (!res.ok) throw new Error(res.error ?? 'Suppression impossible');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NURSE_TOUR_QUERY_ROOT });
      setOpenSheet(null);
      toast('Passage supprimé', { type: 'success' });
      navigation.goBack();
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  });

  const deleteSeriesMut = useMutation({
    mutationFn: () => deleteNursePassageSeries(seriesId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NURSE_TOUR_QUERY_ROOT });
      setOpenSheet(null);
      toast('Série annulée', { type: 'success' });
      navigation.goBack();
    },
    onError: (e) => handleApiError(e, toast, 'passage-delete', 'Suppression impossible', nursePassageSeriesErrorMessage),
  });

  const closeSheet = useCallback(() => setOpenSheet(null), []);

  const loading = (seriesId ? seriesQ.isLoading : false) || appointmentQ.isLoading || patientQ.isLoading;
  const loadFailed =
    appointmentQ.isError || seriesQ.isError || patientQ.isError || !apt || Boolean(seriesId && !series);

  if (!loading && loadFailed) {
    return (
      <StackChromeScreen>
        <ErrorState
          title="Passage indisponible"
          error={appointmentQ.error ?? seriesQ.error ?? patientQ.error}
          onRetry={() => {
            if (seriesId) void seriesQ.refetch();
            if (appointmentId) void appointmentQ.refetch();
            if (patientId) void patientQ.refetch();
          }}
        />
      </StackChromeScreen>
    );
  }

  if (loading || !apt) {
    return (
      <StackChromeScreen>
        <View style={styles.loading}>
          <SkeletonList count={6} itemHeight={56} gap={spacing[2]} />
        </View>
      </StackChromeScreen>
    );
  }

  const fieldRows: SettingsRowProps[] = [];
  if (!isAppointmentOnly) {
    fieldRows.push({
      icon: PASSAGE_FIELD_ICONS.planning,
      label: 'Planification',
      description: formatPlanningSummary(planningState, passageCount),
      onPress: () => setOpenSheet('planning'),
    });
  }
  fieldRows.push(
    {
      icon: PASSAGE_FIELD_ICONS.time,
      label: 'Heure',
      description: formatTimeSummary(timeSlot, customTime, timeRange),
      onPress: () => setOpenSheet('time'),
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
  );

  return (
    <StackChromeScreen
      headerRight={
        <HeaderAction icon={Ellipsis} accessibilityLabel="Actions du passage" onPress={() => setOpenSheet('actions')} />
      }
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <DetailSegmentBar
            segments={PASSAGE_DETAIL_SEGMENTS}
            active={segment}
            onChange={(id) => setSegment(id as SegmentId)}
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
              seed={patientId || patientName}
              profileImageUrl={patient?.profile_image_url}
              gender={patient?.gender}
              phone={phone}
            />
            <SettingsSection items={fieldRows} />
            {canLaunchNavigation ? (
              <Button
                title="Lancer la navigation"
                fullWidth
                leftIcon={<Navigation size={iconSize.md} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
                onPress={() => void handleLaunchNavigation()}
              />
            ) : null}
          </KeyboardScrollView>
        ) : (
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.altScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {segment === 'documents' ? (
              docsQ.isError && !docsQ.data ? (
                <ErrorState
                  title="Documents indisponibles"
                  error={docsQ.error}
                  onRetry={() => void docsQ.refetch()}
                />
              ) : (
                <PassageDetailDocumentsPanel
                  patientId={patientId}
                  appointmentId={appointmentId}
                  apt={apt}
                  docs={filteredDocs}
                  docsLoading={docsQ.isLoading}
                  onDocumentsChanged={async () => {
                    await qc.invalidateQueries({ queryKey: docsOptions.queryKey });
                  }}
                />
              )
            ) : (
              <PassageFormHealthRecordPanel patientId={patientId} clinicalVitalContext={{ type: 'passage' }} />
            )}
          </ScrollView>
        )}
      </View>

      <PassageFormPlanningSheet
        visible={openSheet === 'planning'}
        state={planningState}
        nursingItems={nursingItems}
        onClose={closeSheet}
        onConfirm={(next) => {
          setPlanningState(next);
          const built = buildPlanningPayload(next, nursingItems);
          persistUpdate({ planning_type: built.planning_type, planning_config: built.planning_config });
        }}
      />
      <PassageFormTimeSheet
        visible={openSheet === 'time'}
        timeSlot={timeSlot}
        customTime={customTime}
        timeRange={timeRange}
        passageDate={planningState.startDate}
        onClose={closeSheet}
        onConfirm={(slot, time, range) => {
          setTimeSlot(slot);
          setCustomTime(time);
          setTimeRange(range);
          const effectiveRange = slot === 'all_day' ? null : range;
          const nextPlanningConfig = embedTimeRangeInPlanningConfig(
            series?.planning_config ?? { start_date: planningState.startDate },
            effectiveRange,
          );
          persistUpdate({
            time_slot: slot,
            custom_time: resolvePassageCustomTime({
              time_slot: slot,
              custom_time: time,
              time_range: effectiveRange,
              planning_config: nextPlanningConfig,
            }),
            time_range: effectiveRange,
            planning_config: nextPlanningConfig,
          });
        }}
      />
      <PassageFormLocationSheet
        visible={openSheet === 'location'}
        atHome={atHome}
        patientId={patientId}
        patientAddressRaw={patient?.address}
        onClose={closeSheet}
        onConfirm={(nextAtHome) => {
          setAtHome(nextAtHome);
          persistUpdate({ at_home: nextAtHome });
        }}
      />
      <PassageFormDurationSheet
        visible={openSheet === 'duration'}
        duration={duration}
        customDuration={customDuration}
        onClose={closeSheet}
        onConfirm={(d, custom) => {
          setDuration(d);
          setCustomDuration(custom);
          persistUpdate({ duration_minutes: resolveDurationMinutes(d, custom) });
        }}
      />
      <PassageFormCareSheet
        visible={openSheet === 'care'}
        items={nursingItems}
        onClose={closeSheet}
        onConfirm={(items) => {
          setNursingItems(items);
          persistUpdate({ nursing_items: items });
        }}
      />
      <PassageFormNotesSheet
        visible={openSheet === 'notes'}
        notes={notes}
        onClose={closeSheet}
        onConfirm={(nextNotes) => {
          setNotes(nextNotes);
          persistUpdate({ notes: nextNotes.trim() || null });
        }}
      />

      <PassageDetailActionsSheet
        visible={openSheet === 'actions'}
        onClose={closeSheet}
        hasStop={Boolean(stopId)}
        hasPatient={Boolean(patientId)}
        isPatientAbsent={Boolean(activeAbsenceForDate)}
        showMaterialize={!isAppointmentOnly && planningState.planningMode === 'manual'}
        materializeLoading={materializeMut.isPending}
        enRouteLoading={enRouteMut.isPending}
        markDoneLoading={markDoneMut.isPending}
        deleteOneLoading={deleteOneMut.isPending}
        deleteSeriesLoading={deleteSeriesMut.isPending}
        showDeleteSeries={!isAppointmentOnly}
        showDeleteOne={canCancelAppointment(apt, { role: user?.role, id: user?.id })}
        onMaterialize={() => materializeMut.mutate()}
        onEnRoute={() => enRouteMut.mutate()}
        onMarkDone={() => markDoneMut.mutate()}
        onManageAbsence={() => setOpenSheet('absence')}
        onOpenFullAppointment={() => router.push(appointmentDetailHref('/(nurse)', appointmentId))}
        onDeleteOne={() => setOpenSheet('confirm_delete_one')}
        onDeleteSeries={() => setOpenSheet('confirm_delete_series')}
      />

      <ConfirmSheet
        visible={openSheet === 'confirm_delete_one'}
        title="Supprimer ce passage ?"
        message="Ce rendez-vous sera annulé."
        confirmLabel="Supprimer"
        tone="destructive"
        loading={deleteOneMut.isPending}
        onConfirm={() => deleteOneMut.mutate()}
        onClose={closeSheet}
      />
      <ConfirmSheet
        visible={openSheet === 'confirm_delete_series'}
        title="Supprimer toute la série ?"
        message="Les passages futurs seront annulés. Les passages déjà effectués sont conservés."
        confirmLabel="Supprimer la série"
        tone="destructive"
        loading={deleteSeriesMut.isPending}
        onConfirm={() => deleteSeriesMut.mutate()}
        onClose={closeSheet}
      />

      {patientId ? (
        <PatientAbsenceSheet
          visible={openSheet === 'absence'}
          patientId={patientId}
          patientName={patientName}
          defaultStartDate={passageDate}
          existing={activeAbsenceForDate}
          onClose={closeSheet}
          onSaved={refreshAfterAbsenceChange}
        />
      ) : null}
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
