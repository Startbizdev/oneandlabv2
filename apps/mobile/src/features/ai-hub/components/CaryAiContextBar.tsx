import type { MobileRole } from '@oneandlab/shared-constants';
import type { AiReport } from '@oneandlab/shared-types';
import type { TransmissionPrefill } from '@oneandlab/shared-utils';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { CalendarDays, FileText, FlaskConical, User, type LucideIcon } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { TransmissionEntrySheet } from '@/features/patients/components/TransmissionEntrySheet';
import { useStaffPatientProfile } from '@/features/patients/hooks/use-staff-patient-profile';
import { H_PADDING, ICON_STROKE_WIDTH, iconSize, spacing, useStyles } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { contextPatientId, type AiConversationContext } from '../utils/ai-conversation-context';
import { CaryAiContextPill } from './CaryAiContextPill';
import { CaryAiPatientPickerSheet } from './CaryAiPatientPickerSheet';
import { CaryAiReportDictationSheet } from './CaryAiReportDictationSheet';

type ObjectContext = Extract<AiConversationContext, { kind: 'object' }>;
type TransmissionTarget = { patientId: string; prefill: TransmissionPrefill };

const CONTEXT_ICONS: Record<ObjectContext['contextType'], LucideIcon> = {
  appointment: CalendarDays,
  lab_result: FlaskConical,
  patient: User,
};

interface Props {
  role: MobileRole;
  /** Contexte de la conversation ouverte, `null` hors conversation d'objet. */
  context: ObjectContext | null;
  onClear: () => void;
  /** Choix du patient ouvert (aussi demandé par l'écran avant une pièce jointe). */
  pickerOpen: boolean;
  onPickerOpenChange: (open: boolean) => void;
  onPickPatient: (patientId: string) => void;
  onOpenAppointment: (appointmentId: string) => void;
}

function isStaffAiRole(role: MobileRole): boolean {
  return role === 'nurse' || role === 'pro';
}

/** Sous le rappel urgence : dossier déjà ouvert, et dictée. Pas de bouton tant qu'aucun dossier n'est choisi. */
export function CaryAiContextBar({
  role,
  context,
  onClear,
  pickerOpen,
  onPickerOpenChange,
  onPickPatient,
  onOpenAppointment,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const [dictation, setDictation] = useState<{ patientId: string; open: boolean } | null>(null);
  const [transmission, setTransmission] = useState<TransmissionTarget | null>(null);
  const nextTransmissionRef = useRef<TransmissionTarget | null>(null);
  const staff = isStaffAiRole(role);

  /** Une sheet native à la fois : la transmission s'ouvre une fois la dictée entièrement fermée. */
  const createTransmission = (report: AiReport) => {
    nextTransmissionRef.current = {
      patientId: report.patient_id,
      prefill: { body: report.content_text, ...(report.appointment_id ? { appointmentId: report.appointment_id } : {}) },
    };
    setDictation((d) => (d ? { ...d, open: false } : d));
  };
  const onDictationDismissed = () => {
    setDictation(null);
    setTransmission(nextTransmissionRef.current);
    nextTransmissionRef.current = null;
  };
  const profile = useStaffPatientProfile(context?.contextType === 'patient' ? context.contextId : '');
  if (!context && !staff) return null;

  const patientId = context ? contextPatientId(context) : undefined;
  const patientName = `${profile.data?.first_name ?? ''} ${profile.data?.last_name ?? ''}`.trim();
  const label = !context
    ? ''
    : context.contextType === 'appointment'
      ? 'Ce rendez-vous'
      : context.contextType === 'lab_result'
        ? "Ce résultat d'analyse"
        : patientName || 'Dossier patient';
  const openPicker = () => onPickerOpenChange(true);

  return (
    <View style={context ? [styles.bar, { backgroundColor: c.background }] : undefined}>
      {context ? (
        <CaryAiContextPill
          icon={CONTEXT_ICONS[context.contextType]}
          label={label}
          onClear={onClear}
          onPress={
            context.contextType === 'appointment'
              ? () => onOpenAppointment(context.contextId)
              : context.contextType === 'patient'
                ? openPicker
                : undefined
          }
          pressHint={context.contextType === 'appointment' ? 'Ouvre le rendez-vous' : 'Change de patient'}
        />
      ) : null}
      {staff && patientId ? (
        <Button
          title="Compte rendu"
          variant="ghost"
          size="sm"
          onPress={() => setDictation({ patientId, open: true })}
          leftIcon={<FileText size={iconSize.sm} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />}
        />
      ) : null}

      {staff ? (
        <CaryAiPatientPickerSheet
          visible={pickerOpen}
          onClose={() => onPickerOpenChange(false)}
          onPick={(id) => {
            onPickerOpenChange(false);
            onPickPatient(id);
          }}
        />
      ) : null}
      {dictation ? (
        <CaryAiReportDictationSheet
          visible={dictation.open}
          onClose={() => setDictation(null)}
          onDismissed={onDictationDismissed}
          patientId={dictation.patientId}
          appointmentId={context?.contextType === 'appointment' ? context.contextId : undefined}
          onCreateTransmission={createTransmission}
        />
      ) : null}
      {transmission ? (
        <TransmissionEntrySheet
          visible
          onClose={() => setTransmission(null)}
          patientId={transmission.patientId}
          prefill={transmission.prefill}
        />
      ) : null}
    </View>
  );
}

function buildStyles() {
  return {
    bar: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing[2],
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[2],
      paddingBottom: spacing[2],
    },
  };
}
