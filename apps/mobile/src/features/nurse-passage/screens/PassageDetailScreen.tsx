import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, HeartPulse, Navigation } from 'lucide-react-native';
import {
  appointmentDossierPatientId,
  canCancelAppointment,
  isPatientAbsenceActiveOn,
  isCoNurseViewer,
  nurseOwnerOnlyActionsVisible,
  resolvePassageCustomTime,
  resolvePassageTimeRange,
} from '@oneandlab/shared-utils';
import type {
  NursePassageNursingItem,
  NursePassageSeriesInput,
  NursePassageSeriesUpdateResult,
  PassageDailyTimeSlot,
  PassagePlanningConfig,
  PassageTimeSlot,
  PatientAbsence,
} from '@oneandlab/shared-types';
import { PASSAGE_DURATION_PRESETS } from '@oneandlab/shared-types';
import { nursePassageSeriesErrorMessage } from '@oneandlab/shared-api';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { appointmentDetailHref, staffPatientHref } from '@/navigation/role-hrefs';
import { HeaderAction } from '@/components/navigation/HeaderAction';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorState } from '@/components/ui/ErrorState';
import { FullWidthSegmentBar, type FullWidthSegment } from '@/components/ui/FullWidthSegmentBar';
import { SettingsSection } from '@/components/ui/SettingsSection';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import { SkeletonList } from '@/components/ui/skeletons';
import { updateAppointment } from '@/features/appointments/api/appointments.service';
import { cancelAppointment } from '@/features/appointments/detail/api/appointment-detail.service';
import { medicalDocumentsQueryOptions } from '@/features/appointments/detail/hooks/use-appointment-detail-extras';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';
import { filterListDocuments } from '@/features/appointments/detail/utils/document-labels';
import { appointmentDocumentsRow } from '@/features/appointments/detail/utils/appointment-documents-row';
import {
  resolveAppointmentDetailAddressLine,
  resolveAppointmentMapCoords,
} from '@/features/appointments/detail/utils/appointment-address-display';
import { parseProfileAddress } from '@/features/profile/utils/parse-profile-address';
import { updateNurseTourStopStatus } from '@/features/tournee-nurse/api/nurse-tour.service';
import {
  NURSE_TOUR_QUERY_ROOT,
  nurseTourQueryOptions,
  todayTourDate,
} from '@/features/tournee-nurse/hooks/nurse-tour-query';
import { nursePassageDocumentsHref } from '@/features/tournee-nurse/utils/passage-detail-href';
import {
  buildTourNavigationUrl,
  cachedNurseNavAppPref,
  openTourNavigation,
} from '@/features/tournee-nurse/utils/tour-navigation';
import { PatientAbsenceSheet } from '@/features/patient-absence/components/PatientAbsenceSheet';
import { TransmissionEntrySheet } from '@/features/patients/components/TransmissionEntrySheet';
import { fetchPatientAbsences } from '@/features/patient-absence/api/patient-absence.service';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { useAppColors } from '@/theme/use-app-colors';
import { H_PADDING, ICON_STROKE_WIDTH, spacing, iconSize, useStyles, type Theme } from '@/theme';
import {
  cancelNursePassageOccurrence,
  deleteNursePassageSeries,
  fetchNursePassageSeries,
  materializeNursePassageSeries,
  removeNursePassageSlot,
  updateNursePassageSeries,
} from '../api/nurse-passage.service';
import {
  invalidateNursePassageQueries,
  nursePassageSeriesQueryKey,
} from '../hooks/invalidate-nurse-passage-queries';
import { passageAppointmentQueryOptions } from '../hooks/passage-appointment-query';
import { seriesDailySlots } from '../utils/passage-daily-slots';
import { PassageDetailActionsSheet } from '../components/PassageDetailActionsSheet';
import { PassageFormDailyTimesSheet } from '../components/PassageFormDailyTimesSheet';
import { PassageFormCareSheet } from '../components/PassageFormCareSheet';
import { PassageFormDurationSheet } from '../components/PassageFormDurationSheet';
import { PassageFormHealthRecordPanel } from '../components/PassageFormHealthRecordPanel';
import { PassageFormLocationSheet } from '../components/PassageFormLocationSheet';
import { PassageFormNotesSheet } from '../components/PassageFormNotesSheet';
import { PassageFormPlanningSheet } from '../components/PassageFormPlanningSheet';
import { PassageFormTimeSheet } from '../components/PassageFormTimeSheet';
import { PassagePatientHeader } from '../components/PassagePatientHeader';
import { CoNursesSection } from '@/features/nurse-collaborations/components/CoNursesSection';
import { PASSAGE_FIELD_ICONS } from '../components/passage-field-icons';
import { usePassagePatient } from '../hooks/use-passage-patient';
import {
  formatCareSummary,
  formatDailyTimesSummary,
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
  | 'daily_times'
  | 'location'
  | 'duration'
  | 'care'
  | 'notes'
  | 'actions'
  | 'absence'
  | 'transmission'
  | 'confirm_delete_one'
  | 'confirm_remove_slot'
  | 'confirm_delete_series'
  | null;

type SegmentId = 'information' | 'health_record';

const APPOINTMENT_ONLY_SERIES_IDS = new Set(['rdv', '_', 'appointment']);

const withoutTourOrigin = () => null;

const PASSAGE_DETAIL_SEGMENTS: FullWidthSegment<SegmentId>[] = [
  { id: 'information', label: 'Informations', Icon: ClipboardList },
  { id: 'health_record', label: 'Carnet', Icon: HeartPulse },
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

function seriesUpdateToast(data: NursePassageSeriesUpdateResult): string {
  const parts = [
    data.updated_appointments > 0 ? `${data.updated_appointments} passage(s) mis à jour` : null,
    data.created_appointments > 0 ? `${data.created_appointments} ajouté(s)` : null,
    data.canceled_appointments > 0 ? `${data.canceled_appointments} annulé(s)` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Série mise à jour';
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
  const routeStopId = String(params.stop_id ?? '');

  const [segment, setSegment] = useState<SegmentId>('information');
  const [openSheet, setOpenSheet] = useState<SheetKey>(null);
  const [timeSlot, setTimeSlot] = useState<PassageTimeSlot>('morning');
  const [customTime, setCustomTime] = useState('09:00');
  const [timeRange, setTimeRange] = useState<[number, number] | null>([8, 12]);
  const [dailyTimeSlots, setDailyTimeSlots] = useState<PassageDailyTimeSlot[]>([]);
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
    queryKey: nursePassageSeriesQueryKey(seriesId),
    queryFn: () => fetchNursePassageSeries(seriesId),
    enabled: Boolean(seriesId),
  });

  const appointmentQ = useQuery(passageAppointmentQueryOptions(appointmentId));
  const docsQ = useQuery(medicalDocumentsQueryOptions(appointmentId));

  const series = seriesQ.data;
  const apt = appointmentQ.data;

  /** Ouvert depuis l'agenda (sans arrêt) : l'arrêt de la tournée du jour permet « Je pars » et « Marquer effectué ». */
  const today = todayTourDate();
  const todayTourQ = useQuery({
    ...nurseTourQueryOptions(today, withoutTourOrigin),
    enabled: !routeStopId && Boolean(appointmentId) && apt?.scheduled_at?.slice(0, 10) === today,
  });
  const stopId =
    routeStopId || todayTourQ.data?.stops.find((s) => s.appointment_id === appointmentId)?.stop_id || '';
  /** Passage d'un proche : son dossier, jamais celui du titulaire. */
  const patientId = (apt ? appointmentDossierPatientId(apt) : series?.patient_id) ?? '';
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
    return list.find((a) => isPatientAbsenceActiveOn(a, passageDate)) ?? null;
  }, [absencesQ.data, passageDate]);

  const invalidatePassage = useCallback(() => {
    invalidateNursePassageQueries(qc, appointmentId);
  }, [appointmentId, qc]);

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
    setDailyTimeSlots(seriesDailySlots(series));
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

  const formFromAppointment = isAppointmentOnly || seriesQ.isError;

  useEffect(() => {
    if (!formFromAppointment || !apt || formInitialized.current) return;
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
  }, [apt, formFromAppointment]);

  const patientName = patient
    ? [patient.first_name, patient.last_name].filter(Boolean).join(' ').trim() || 'Patient'
    : 'Patient';
  const formPhone = (apt?.form_data as Record<string, unknown> | undefined)?.phone;
  const phone = patient?.phone ?? (typeof formPhone === 'string' ? formPhone : null);

  const passageCount = useMemo(
    () => previewPassageCount(planningState, nursingItems, dailyTimeSlots.length),
    [planningState, nursingItems, dailyTimeSlots.length],
  );

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

  /** Lieu affiché = adresse réellement enregistrée sur le passage (celle de la navigation), arrondissement en avant. */
  const locationSummary = formatLocationSummary(atHome, navigationTarget?.addressLine);

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
      toast(seriesUpdateToast(data), { type: 'success' });
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
      invalidatePassage();
      toast('Passage mis à jour', { type: 'success' });
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  });

  const persistUpdate = useCallback(
    (payload: Partial<NursePassageSeriesInput>) => {
      if (isAppointmentOnly || seriesQ.isError || isCoNurseViewer(apt)) {
        saveAppointmentMut.mutate(payload);
        return;
      }
      if (!seriesId) return;
      saveMut.mutate(payload);
    },
    [apt, isAppointmentOnly, saveAppointmentMut, saveMut, seriesId, seriesQ.isError],
  );

  const materializeMut = useMutation({
    mutationFn: async () => {
      await updateNursePassageSeries(seriesId, { planning_config: { start_date: planningState.startDate } });
      return materializeNursePassageSeries(seriesId);
    },
    onSuccess: (data) => {
      invalidatePassage();
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
      if (seriesId) {
        await cancelNursePassageOccurrence(seriesId, appointmentId);
        return;
      }
      const res = await cancelAppointment(appointmentId, {
        reason: 'other',
        comment: 'Passage supprimé par infirmier',
      });
      if (!res.ok) throw new Error(res.error ?? 'Suppression impossible');
    },
    onSuccess: () => {
      invalidatePassage();
      setOpenSheet(null);
      toast('Passage supprimé', { type: 'success' });
      navigation.goBack();
    },
    onError: (e) => handleApiError(e, toast, 'passage-delete-one', 'Suppression impossible', nursePassageSeriesErrorMessage),
  });

  const removeSlotMut = useMutation({
    mutationFn: () => removeNursePassageSlot(seriesId, appointmentId),
    onSuccess: (canceled) => {
      invalidatePassage();
      setOpenSheet(null);
      toast(`Créneau retiré de la série, ${canceled} passage(s) annulé(s)`, { type: 'success' });
      navigation.goBack();
    },
    onError: (e) =>
      handleApiError(e, toast, 'passage-remove-slot', 'Retrait du créneau impossible', nursePassageSeriesErrorMessage),
  });

  const deleteSeriesMut = useMutation({
    mutationFn: () => deleteNursePassageSeries(seriesId),
    onSuccess: (canceled) => {
      invalidatePassage();
      setOpenSheet(null);
      toast(`Série supprimée, ${canceled} passage(s) annulé(s)`, { type: 'success' });
      navigation.goBack();
    },
    onError: (e) => handleApiError(e, toast, 'passage-delete', 'Suppression impossible', nursePassageSeriesErrorMessage),
  });

  const closeSheet = useCallback(() => setOpenSheet(null), []);

  const loading =
    appointmentQ.isLoading ||
    (Boolean(seriesId) && seriesQ.isLoading) ||
    (Boolean(patientId) && patientQ.isLoading);
  const loadFailed = appointmentQ.isError || !apt || Boolean(seriesId && !series && !seriesQ.isError);

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

  const ownerActions = nurseOwnerOnlyActionsVisible(apt);
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
    isAppointmentOnly
      ? {
          icon: PASSAGE_FIELD_ICONS.time,
          label: 'Heure',
          description: formatTimeSummary(timeSlot, customTime, timeRange),
          onPress: () => setOpenSheet('time'),
        }
      : {
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
  );
  const documentsRow = appointmentDocumentsRow({
    documents: filteredDocs,
    loading: docsQ.isLoading,
    failed: docsQ.isError && !docsQ.data,
    appointmentStatus: apt.status,
    onPress: () => router.push(nursePassageDocumentsHref(String(params.seriesId ?? ''), appointmentId)),
  });

  return (
    <StackChromeScreen
      headerRight={
        <HeaderAction label="Actions" accessibilityLabel="Actions du passage" onPress={() => setOpenSheet('actions')} />
      }
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <FullWidthSegmentBar
            segments={PASSAGE_DETAIL_SEGMENTS}
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
              seed={patientId || patientName}
              profileImageUrl={patient?.profile_image_url}
              gender={patient?.gender}
              phone={phone}
            />
            <SettingsSection items={fieldRows} />
            {documentsRow ? <SettingsSection items={[documentsRow]} /> : null}
            <CoNursesSection
              apt={apt}
              viewerId={user?.id}
              passageSeriesId={seriesId || null}
              onSelfRemoved={() => navigation.goBack()}
            />
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
            <PassageFormHealthRecordPanel patientId={patientId} clinicalVitalContext={{ type: 'passage' }} />
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
          persistUpdate({
            planning_type: built.planning_type,
            planning_config: embedTimeRangeInPlanningConfig(
              built.planning_config,
              series?.planning_config.time_range ?? null,
              dailyTimeSlots,
            ),
          });
        }}
      />
      <PassageFormDailyTimesSheet
        visible={openSheet === 'daily_times'}
        slots={dailyTimeSlots}
        onClose={closeSheet}
        onConfirm={(slots) => {
          setDailyTimeSlots(slots);
          const primary = slots[0];
          const built = buildPlanningPayload(planningState, nursingItems);
          persistUpdate({
            time_slot: primary.time_slot,
            custom_time: primary.time_slot === 'all_day' ? null : primary.custom_time ?? null,
            time_range: null,
            planning_config: embedTimeRangeInPlanningConfig(built.planning_config, null, slots),
          });
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
        removeSlotLoading={removeSlotMut.isPending}
        showDeleteSeries={!isAppointmentOnly && ownerActions}
        showDeleteOne={ownerActions && canCancelAppointment(apt, { role: user?.role, id: user?.id })}
        showRemoveSlot={!isAppointmentOnly && ownerActions && dailyTimeSlots.length > 1}
        onMaterialize={() => materializeMut.mutate()}
        onEnRoute={() => enRouteMut.mutate()}
        onMarkDone={() => markDoneMut.mutate()}
        onManageAbsence={() => setOpenSheet('absence')}
        onAddTransmission={() => setOpenSheet('transmission')}
        onOpenTransmissions={() => router.push(staffPatientHref('/(nurse)', patientId, 'transmissions'))}
        onOpenFullAppointment={() => router.push(appointmentDetailHref('/(nurse)', appointmentId))}
        onDeleteOne={() => setOpenSheet('confirm_delete_one')}
        onRemoveSlot={() => setOpenSheet('confirm_remove_slot')}
        onDeleteSeries={() => setOpenSheet('confirm_delete_series')}
      />

      <ConfirmSheet
        visible={openSheet === 'confirm_delete_one'}
        title="Supprimer ce passage ?"
        message={
          isAppointmentOnly
            ? 'Ce rendez-vous sera annulé.'
            : 'Seul ce passage est annulé ; il ne sera pas recréé. Les autres passages de la série sont conservés.'
        }
        confirmLabel="Supprimer"
        tone="destructive"
        loading={deleteOneMut.isPending}
        onConfirm={() => deleteOneMut.mutate()}
        onClose={closeSheet}
      />
      <ConfirmSheet
        visible={openSheet === 'confirm_remove_slot'}
        title="Retirer ce créneau de la série ?"
        message="Ce créneau ne sera plus planifié : ce passage et les suivants à la même heure sont annulés. Les autres créneaux sont conservés."
        confirmLabel="Retirer le créneau"
        tone="destructive"
        loading={removeSlotMut.isPending}
        onConfirm={() => removeSlotMut.mutate()}
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
      {patientId ? (
        <TransmissionEntrySheet
          visible={openSheet === 'transmission'}
          patientId={patientId}
          prefill={{ appointmentId, occurredOn: passageDate }}
          onClose={closeSheet}
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
