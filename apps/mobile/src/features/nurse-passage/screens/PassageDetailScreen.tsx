import type { AppColors } from '@/theme/colors';

import { useThemedStyles } from '@/theme/use-themed-styles';

import { useAppColors } from '@/theme/use-app-colors';
import { layoutRowCenter } from '@/theme/layout-styles';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ClipboardList, FileText, HeartPulse, Navigation, Phone } from 'lucide-react-native';

import { StackChromeScreen } from '@/navigation/StackChromeScreen';

import { useStackContentTopInset } from '@/navigation/use-stack-scroll-config';

import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';

import { Row, Stack } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';

import { ProfileAvatar } from '@/components/ui/ProfileAvatar';

import { fetchAppointment, updateAppointment } from '@/features/appointments/api/appointments.service';

import {

  cancelAppointment,

  fetchMedicalDocuments,

} from '@/features/appointments/detail/api/appointment-detail.service';

import { DetailSegmentBar } from '@/features/appointments/detail/components/layout/DetailSegmentBar';

import { PassageDetailDocumentsPanel } from '../components/PassageDetailDocumentsPanel';

import { filterListDocuments } from '@/features/appointments/detail/utils/document-labels';

import { fetchPatientProfile } from '@/features/patients/api/patient-profile.service';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';

import { parseProfileAddress } from '@/features/profile/utils/parse-profile-address';
import {
  resolveAppointmentDetailAddressLine,
  resolveAppointmentMapCoords,
} from '@/features/appointments/detail/utils/appointment-address-display';
import { buildNavigationUrl, resolvePassageCustomTime, resolvePassageTimeRange } from '@oneandlab/shared-utils';

import { updateNurseTourStopStatus } from '@/features/tournee-nurse/api/nurse-tour.service';

import { useAuthStore } from '@/store/auth-store';

import {

  deleteNursePassageSeries,

  fetchNursePassageSeries,

  materializeNursePassageSeries,

  updateNursePassageSeries,

} from '../api/nurse-passage.service';

import { PassageDetailActionsSheet } from '../components/PassageDetailActionsSheet';
import { PatientAbsenceSheet } from '@/features/patient-absence/components/PatientAbsenceSheet';
import { fetchPatientAbsences } from '@/features/patient-absence/api/patient-absence.service';
import type { PatientAbsence } from '@oneandlab/shared-types';
import { PassageFormCareSheet } from '../components/PassageFormCareSheet';

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

  planningStateFromSeries,

  previewPassageCount,

  type PassagePlanningFormState,

} from '../utils/passage-planning';

import {
  buildAppointmentPassageUpdateBody,
  initPassageFormFromAppointment,
} from '../utils/passage-appointment-update';

import type {

  NursePassageNursingItem,

  NursePassageSeriesInput,

  PassagePlanningConfig,

  PassageTimeSlot,

} from '@oneandlab/shared-types';

import { PASSAGE_DURATION_PRESETS } from '@oneandlab/shared-types';

import { useToast } from '@/providers/ToastProvider';

import { H_PADDING, spacing, iconSize, AppText } from '@/theme';

import { fontFamily, fontSize } from '@/theme/typography';



type SheetKey =
  | 'planning'
  | 'time'
  | 'location'
  | 'duration'
  | 'care'
  | 'notes'
  | 'actions'
  | 'absence'
  | null;

type SegmentId = 'information' | 'documents' | 'health_record';



const APPOINTMENT_ONLY_SERIES_IDS = new Set(['rdv', '_', 'appointment']);

function resolveSeriesId(raw: string): string {
  const id = String(raw ?? '').trim();
  return APPOINTMENT_ONLY_SERIES_IDS.has(id) ? '' : id;
}

const PASSAGE_DETAIL_SEGMENTS = [

  { id: 'information' as const, label: 'Informations', Icon: ClipboardList },

  { id: 'documents' as const, label: 'Documents', Icon: FileText },

  { id: 'health_record' as const, label: 'Carnet', Icon: HeartPulse },

];



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

  const styles = useThemedStyles(buildStyles);

  const contentTopInset = useStackContentTopInset();

  const router = useRouter();

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



  const docsQ = useQuery({

    queryKey: ['appointment-docs', appointmentId],

    queryFn: async () => {

      const res = await fetchMedicalDocuments(appointmentId);

      if (!res.success) throw new Error(res.error ?? 'Documents indisponibles');

      return res.data ?? [];

    },

    enabled: Boolean(appointmentId) && segment === 'documents',

  });



  const series = seriesQ.data;

  const apt = appointmentQ.data;

  const patientId = apt?.patient_id ?? series?.patient_id ?? '';



  const patientQ = useQuery({

    queryKey: ['passage-detail-patient', patientId],

    queryFn: async () => {

      const res = await fetchPatientProfile(patientId);

      if (!res.success || !res.data) throw new Error(res.error ?? 'Patient introuvable');

      return res.data;

    },

    enabled: Boolean(patientId),

  });



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
        (a) =>
          a.start_date.slice(0, 10) <= passageDate && a.end_date.slice(0, 10) >= passageDate,
      ) ?? null
    );
  }, [absencesQ.data, passageDate]);

  const refreshAfterAbsenceChange = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['patient-absences', patientId] });
    void qc.invalidateQueries({ queryKey: ['nurse-tour'] });
    void qc.invalidateQueries({ queryKey: ['nurse-passage-series', seriesId] });
    void qc.invalidateQueries({ queryKey: ['appointment', appointmentId] });
    toast('Absence enregistrée', { type: 'success' });
  }, [appointmentId, patientId, qc, seriesId, toast]);

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



  const patientName = useMemo(() => {

    if (patient) {

      return [patient.first_name, patient.last_name].filter(Boolean).join(' ').trim();

    }

    return 'Patient';

  }, [patient]);



  const phone = patient?.phone ?? (apt?.form_data as Record<string, unknown> | undefined)?.phone;



  const passageCount = useMemo(

    () => previewPassageCount(planningState, nursingItems),

    [planningState, nursingItems],

  );



  const locationSummary = useMemo(() => {

    const raw = atHome ? patient?.address : user?.address;

    const parsed = parseProfileAddress(raw);

    return formatLocationSummary(atHome, parsed?.label);

  }, [atHome, patient?.address, user?.address]);



  const navigationTarget = useMemo(() => {
    if (!atHome) {
      const parsed = parseProfileAddress(user?.address);
      if (!parsed?.label) return null;
      return {
        lat: parsed.lat,
        lng: parsed.lng,
        addressLine: parsed.label,
      };
    }
    const line = apt ? resolveAppointmentDetailAddressLine(apt) : '';
    const coords = apt ? resolveAppointmentMapCoords(apt) : null;
    if (line || coords) {
      return {
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        addressLine: line || null,
      };
    }
    const parsed = parseProfileAddress(patient?.address);
    if (!parsed?.label) return null;
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      addressLine: parsed.label,
    };
  }, [apt, atHome, patient?.address, user?.address]);

  const canLaunchNavigation = useMemo(
    () => Boolean(navigationTarget && buildNavigationUrl('waze', navigationTarget)),
    [navigationTarget],
  );

  const filteredDocs = useMemo(

    () => filterListDocuments(docsQ.data ?? [], { omitCarePhotos: true }),

    [docsQ.data],

  );



  const saveMut = useMutation({

    mutationFn: (payload: Partial<NursePassageSeriesInput>) =>

      updateNursePassageSeries(seriesId, payload),

    onSuccess: (data) => {

      void qc.invalidateQueries({ queryKey: ['nurse-tour'] });

      void qc.invalidateQueries({ queryKey: ['nurse-passage-series', seriesId] });

      void qc.invalidateQueries({ queryKey: ['appointment', appointmentId] });

      toast(

        data.created_appointments > 0

          ? `Mis à jour — ${data.created_appointments} passage(s) regénéré(s)`

          : 'Passage mis à jour',

        { type: 'success' },

      );

    },

    onError: (e: Error) => toast(e.message, { type: 'error' }),

  });



  const saveAppointmentMut = useMutation({

    mutationFn: async (payload: Partial<NursePassageSeriesInput>) => {

      if (!apt) throw new Error('RDV introuvable');

      const effectiveSlot = (payload.time_slot ?? timeSlot) as PassageTimeSlot;

      const effectiveRange =
        payload.time_range !== undefined
          ? payload.time_range
          : effectiveSlot === 'all_day'
            ? null
            : timeRange;

      const snapshot = {

        time_slot: effectiveSlot,

        custom_time:

          payload.custom_time !== undefined

            ? payload.custom_time

            : effectiveSlot === 'custom'

              ? customTime

              : null,

        time_range: effectiveRange,

        duration_minutes:

          payload.duration_minutes ?? resolveDurationMinutes(duration, customDuration),

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

      void qc.invalidateQueries({ queryKey: ['nurse-tour'] });

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

      await updateNursePassageSeries(seriesId, {

        planning_config: { start_date: planningState.startDate },

      });

      return materializeNursePassageSeries(seriesId);

    },

    onSuccess: (data) => {

      void qc.invalidateQueries({ queryKey: ['nurse-tour'] });

      void qc.invalidateQueries({ queryKey: ['nurse-passage-series', seriesId] });

      toast(

        data.created_appointments > 0

          ? `${data.created_appointments} passage(s) planifié(s)`

          : 'Aucun nouveau passage à générer',

        { type: 'success' },

      );

    },

    onError: (e: Error) => toast(e.message, { type: 'error' }),

  });



  const enRouteMut = useMutation({

    mutationFn: async () => {

      if (!stopId) throw new Error('Arrêt tournée introuvable');

      await updateNurseTourStopStatus(stopId, 'en_route');

    },

    onSuccess: () => {

      void qc.invalidateQueries({ queryKey: ['nurse-tour'] });

      toast('Patient prévenu — vous êtes en route', { type: 'success' });

    },

    onError: (e: Error) => toast(e.message, { type: 'error' }),

  });



  const handleLaunchNavigation = useCallback(async () => {
    if (!navigationTarget) {
      toast('Adresse indisponible', { type: 'error' });
      return;
    }
    const url = buildNavigationUrl('waze', navigationTarget);
    if (!url) {
      toast('Adresse indisponible', { type: 'error' });
      return;
    }
    void Linking.openURL(url);
    if (!stopId) return;
    try {
      await updateNurseTourStopStatus(stopId, 'en_route');
      void qc.invalidateQueries({ queryKey: ['nurse-tour'] });
      toast('Navigation lancée — patient prévenu', { type: 'success' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Notification impossible';
      toast(`Navigation lancée — ${message}`, { type: 'error' });
    }
  }, [navigationTarget, stopId, toast, qc]);



  const markDoneMut = useMutation({

    mutationFn: async () => {

      if (!stopId) throw new Error('Arrêt tournée introuvable');

      await updateNurseTourStopStatus(stopId, 'done', { finalizeAppointment: true });

    },

    onSuccess: () => {

      void qc.invalidateQueries({ queryKey: ['nurse-tour'] });

      toast('Passage marqué comme effectué', { type: 'success' });

      router.back();

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

      void qc.invalidateQueries({ queryKey: ['nurse-tour'] });

      toast('Passage supprimé', { type: 'success' });

      router.back();

    },

    onError: (e: Error) => toast(e.message, { type: 'error' }),

  });



  const deleteSeriesMut = useMutation({

    mutationFn: () => deleteNursePassageSeries(seriesId),

    onSuccess: () => {

      void qc.invalidateQueries({ queryKey: ['nurse-tour'] });

      toast('Série annulée', { type: 'success' });

      router.back();

    },

    onError: (e: Error) => toast(e.message, { type: 'error' }),

  });



  const confirmDeleteOne = useCallback(() => {

    Alert.alert('Supprimer ce passage ?', 'Ce rendez-vous sera annulé.', [

      { text: 'Annuler', style: 'cancel' },

      { text: 'Supprimer', style: 'destructive', onPress: () => deleteOneMut.mutate() },

    ]);

  }, [deleteOneMut]);



  const confirmDeleteSeries = useCallback(() => {

    Alert.alert(

      'Supprimer toute la série ?',

      'Les passages futurs seront annulés. Les passages déjà effectués seront conservés.',

      [

        { text: 'Annuler', style: 'cancel' },

        { text: 'Supprimer la série', style: 'destructive', onPress: () => deleteSeriesMut.mutate() },

      ],

    );

  }, [deleteSeriesMut]);



  const loading =

    (seriesId ? seriesQ.isLoading : false) || appointmentQ.isLoading || patientQ.isLoading;



  if (loading || !apt || (seriesId && !series)) {

    return (

      <StackChromeScreen title="Détail passage">

        <View style={[styles.centered, { paddingTop: contentTopInset }]}>

          <ActivityIndicator size="large" color={c.primary} />

        </View>

      </StackChromeScreen>

    );

  }



  return (

    <StackChromeScreen title="Détail passage">

      <View style={[styles.screen, { paddingTop: contentTopInset, backgroundColor: c.background }]}>

        <View style={styles.header}>

          <DetailSegmentBar

            segments={PASSAGE_DETAIL_SEGMENTS}

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

                <AppText style={[styles.sectionLabel, { color: c.textTertiary }]}>Patient</AppText>

                <Row gap={spacing[3]} align="center" style={styles.patientRow}>

                  <ProfileAvatar

                    profileImageUrl={patient?.profile_image_url}

                    seed={patientId || patientName}

                    gender={patient?.gender}

                    size={iconSize['5xl']}

                  />

                  <View style={styles.patientNameCol}>

                    <AppText style={[styles.patientName, { color: c.textPrimary }]} numberOfLines={2}>

                      {patientName}

                    </AppText>

                    {phone ? (

                      <Pressable

                        onPress={() => void Linking.openURL(`tel:${String(phone)}`)}

                        style={styles.phoneRow}

                      >

                        <Phone size={iconSize.xs} color={c.primary} />

                        <AppText style={[styles.phoneLink, { color: c.primary }]}>{String(phone)}</AppText>

                      </Pressable>

                    ) : null}

                  </View>

                </Row>

              </View>

              {!isAppointmentOnly ? (
                <PassageFormFieldRow
                  label="Planification"
                  value={formatPlanningSummary(planningState, passageCount)}
                  onPress={() => setOpenSheet('planning')}
                />
              ) : null}

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

              {canLaunchNavigation ? (
                <Button
                  title="Lancer la navigation"
                  variant="secondary"
                  fullWidth
                  leftIcon={<Navigation size={iconSize.sm} color={c.primary} strokeWidth={2.5} />}
                  onPress={handleLaunchNavigation}
                />
              ) : null}

              <Button
                title="Actions"
                variant="primary"
                onPress={() => setOpenSheet('actions')}
                fullWidth
              />

            </Stack>

          </KeyboardScrollView>

        ) : segment === 'documents' ? (

          <ScrollView

            style={styles.bodyScroll}

            contentContainerStyle={styles.altScrollContent}

            showsVerticalScrollIndicator={false}

            keyboardShouldPersistTaps="handled"

          >

            <PassageDetailDocumentsPanel
              patientId={patientId}
              appointmentId={appointmentId}
              apt={apt}
              docs={filteredDocs}
              docsLoading={docsQ.isLoading}
              onDocumentsChanged={async () => {
                await qc.invalidateQueries({ queryKey: ['appointment-docs', appointmentId] });
              }}
            />

          </ScrollView>

        ) : (

          <ScrollView

            style={styles.bodyScroll}

            contentContainerStyle={styles.altScrollContent}

            showsVerticalScrollIndicator={false}

            keyboardShouldPersistTaps="handled"

          >

            <PassageFormHealthRecordPanel

              patientId={patientId}

              clinicalVitalContext={{ type: 'passage' }}

            />

          </ScrollView>

        )}

      </View>



      <PassageFormPlanningSheet

        visible={openSheet === 'planning'}

        state={planningState}

        nursingItems={nursingItems}

        onClose={() => setOpenSheet(null)}

        onConfirm={(next) => {

          setPlanningState(next);

          const built = buildPlanningPayload(next, nursingItems);

          persistUpdate({

            planning_type: built.planning_type,

            planning_config: built.planning_config,

          });

        }}

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

          const nextPlanningConfig = embedTimeRangeInPlanningConfig(
            series?.planning_config ?? { start_date: planningState.startDate },
            slot === 'all_day' ? null : range,
          );

          persistUpdate({

            time_slot: slot,

            custom_time: resolvePassageCustomTime({
              time_slot: slot,
              custom_time: time,
              time_range: slot === 'all_day' ? null : range,
              planning_config: nextPlanningConfig,
            }),

            time_range: slot === 'all_day' ? null : range,

            planning_config: nextPlanningConfig,

          });

        }}

      />

      <PassageFormLocationSheet

        visible={openSheet === 'location'}

        atHome={atHome}

        patientId={patientId}

        patientAddressRaw={patient?.address}

        onClose={() => setOpenSheet(null)}

        onConfirm={(nextAtHome) => {

          setAtHome(nextAtHome);

          persistUpdate({ at_home: nextAtHome });

        }}

      />

      <PassageFormDurationSheet

        visible={openSheet === 'duration'}

        duration={duration}

        customDuration={customDuration}

        onClose={() => setOpenSheet(null)}

        onConfirm={(d, custom) => {

          setDuration(d);

          setCustomDuration(custom);

          persistUpdate({ duration_minutes: resolveDurationMinutes(d, custom) });

        }}

      />

      <PassageFormCareSheet

        visible={openSheet === 'care'}

        items={nursingItems}

        onClose={() => setOpenSheet(null)}

        onConfirm={(items) => {

          setNursingItems(items);

          persistUpdate({ nursing_items: items });

        }}

      />

      <PassageFormNotesSheet

        visible={openSheet === 'notes'}

        notes={notes}

        onClose={() => setOpenSheet(null)}

        onConfirm={(nextNotes) => {

          setNotes(nextNotes);

          persistUpdate({ notes: nextNotes.trim() || null });

        }}

      />

      <PassageDetailActionsSheet
        visible={openSheet === 'actions'}
        onClose={() => setOpenSheet(null)}
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
        onMaterialize={() => materializeMut.mutate()}
        onEnRoute={() => enRouteMut.mutate()}
        onMarkDone={() => markDoneMut.mutate()}
        onManageAbsence={() => setOpenSheet('absence')}
        onOpenFullAppointment={() =>
          router.push(`/(nurse)/appointment/${appointmentId}` as never)
        }
        onDeleteOne={confirmDeleteOne}
        onDeleteSeries={confirmDeleteSeries}
      />

      {patientId ? (
        <PatientAbsenceSheet
          visible={openSheet === 'absence'}
          patientId={patientId}
          patientName={patientName}
          defaultStartDate={passageDate}
          existing={activeAbsenceForDate}
          onClose={() => setOpenSheet(null)}
          onSaved={refreshAfterAbsenceChange}
        />
      ) : null}

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

    centered: {
    minWidth: 0, flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },

    patientBlock: { gap: spacing[2] },

    patientRow: { minWidth: 0 },

    patientNameCol: { flex: 1, minWidth: 0, gap: spacing[1] },

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

    phoneRow: {

      ...layoutRowCenter(spacing[1.5]),

    },

    phoneLink: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm },

  };

}
