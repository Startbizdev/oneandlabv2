import { StyleSheet, View } from 'react-native';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { useStaffPatientProfile } from '@/features/patients/hooks/use-staff-patient-profile';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { spacing } from '@/theme';
import { PrescriptionWorkspaceScreen } from './PrescriptionWorkspaceScreen';

interface Props {
  patientId: string;
  rolePrefix: '/(pro)' | '/(nurse)';
  roleBase: 'pro' | 'nurse';
}

export function PatientPrescriptionsScreen({ patientId, rolePrefix, roleBase }: Props) {
  const patientQ = useStaffPatientProfile(patientId);

  return (
    <StackChromeScreen title="Ordonnances">
      {patientQ.isPending ? (
        <View style={styles.state}>
          <SkeletonList count={3} itemHeight={52} gap={spacing[2]} />
        </View>
      ) : patientQ.isError ? (
        <ErrorState
          title="Patient introuvable"
          error={patientQ.error}
          onRetry={() => void patientQ.refetch()}
        />
      ) : (
        <PrescriptionWorkspaceScreen
          roleBase={roleBase}
          rolePrefix={rolePrefix}
          fixedPatientId={patientId}
        />
      )}
    </StackChromeScreen>
  );
}

const styles = StyleSheet.create({
  state: { padding: spacing[4] },
});
