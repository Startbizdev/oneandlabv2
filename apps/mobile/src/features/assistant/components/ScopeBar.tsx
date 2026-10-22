import type { MobileRole } from '@oneandlab/shared-constants';
import type { AssistantContextType } from '@oneandlab/shared-types';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { CalendarDays, FileText, FlaskConical, HeartPulse, User, UserPlus } from 'lucide-react-native';
import { useStaffPatientProfile } from '@/features/patients/hooks/use-staff-patient-profile';
import { appointmentDetailHref } from '@/navigation/role-hrefs';
import { roleRoutePrefix } from '@/navigation/role-route-prefix';
import { H_PADDING, spacing, useStyles } from '@/theme';
import { ContextPill, ScopeActionPill } from './ContextPill';

type Props = {
  role: MobileRole;
  contextType?: AssistantContextType;
  appointmentId?: string;
  patientId?: string;
  onClearContext: () => void;
  onPickPatient: () => void;
  onClearPatient: () => void;
  /** Soignant avec patient choisi : dictée d'un compte rendu. */
  onDictation?: () => void;
};

const CONTEXT_LABELS: Partial<Record<AssistantContextType, { label: string; icon: typeof CalendarDays }>> = {
  appointment: { label: 'Ce rendez-vous', icon: CalendarDays },
  lab_result: { label: "Ce résultat d'analyse", icon: FlaskConical },
  health: { label: 'Mes données santé', icon: HeartPulse },
};

/** Sous l'en-tête : sujet (RDV, résultat), patient choisi (soignant), dictée. */
export function ScopeBar(props: Props) {
  const { role, contextType, appointmentId, patientId, onClearContext, onPickPatient, onClearPatient, onDictation } =
    props;
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const staff = role !== 'patient';
  const profile = useStaffPatientProfile(staff ? (patientId ?? '') : '');
  const context = contextType ? CONTEXT_LABELS[contextType] : undefined;
  const fullName = `${profile.data?.first_name ?? ''} ${profile.data?.last_name ?? ''}`.trim();
  const patientName = fullName || (profile.isLoading ? 'Patient…' : 'Patient');

  if (!context && !staff) return null;
  return (
    <View style={styles.pills}>
      {context ? (
        <ContextPill
          icon={context.icon}
          label={context.label}
          onPress={
            appointmentId ? () => router.push(appointmentDetailHref(roleRoutePrefix(role), appointmentId)) : undefined
          }
          pressHint="Ouvre le rendez-vous"
          onClear={onClearContext}
          clearLabel="Retirer ce sujet"
        />
      ) : null}
      {staff && patientId ? (
        <ContextPill
          icon={User}
          label={patientName}
          onPress={onPickPatient}
          pressHint="Change de patient"
          onClear={onClearPatient}
          clearLabel="Retirer le patient"
        />
      ) : staff ? (
        <ScopeActionPill icon={UserPlus} label="Choisir un patient" onPress={onPickPatient} />
      ) : null}
      {onDictation ? (
        <ScopeActionPill icon={FileText} label="Compte rendu" onPress={onDictation} />
      ) : null}
    </View>
  );
}

function buildStyles() {
  return {
    pills: {
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[3],
      paddingBottom: spacing[1],
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
    },
  };
}
