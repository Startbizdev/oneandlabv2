import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';

import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SkeletonStaffAppointmentDetail } from '@/components/ui/skeletons';
import { StackScrollView } from '@/components/navigation/StackScrollView';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useAuthStore } from '@/store/auth-store';
import { prescriptionGenerationEnabled } from '@/features/prescriptions/utils/prescription-access';
import { StaffPatientEditSheet } from '@/features/patients/components/StaffPatientEditSheet';
import { AppointmentDetailBlockedEmptyState } from '../detail/components/AppointmentDetailBlockedEmptyState';
import { PrescriptionSection } from '../detail/components/PrescriptionSection';
import { fetchMedicalDocuments } from '../detail/api/appointment-detail.service';
import { useAppointmentDetail } from '../hooks/use-appointment-detail';
import {
  appointmentDetailBlockReason,
  resolveAppointmentDetail,
} from '../hooks/appointment-detail-result';
import { appointmentPrescriptionTitle } from '../detail/utils/appointment-prescription-navigation';
import { isAppointmentCanceled } from '@/utils/appointment-detail-display';
import { spacing } from '@/theme';

interface Props {
  role: string;
}

export function AppointmentPrescriptionScreen({ role }: Props) {
  const styles = useThemedStyles(buildStyles, 'AppointmentPrescriptionScreen');
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [editPatientOpen, setEditPatientOpen] = useState(false);

  const detailQ = useAppointmentDetail(id);
  const detailBlock = appointmentDetailBlockReason(detailQ.data);
  const apt = resolveAppointmentDetail(detailQ.data);

  const docsQ = useQuery({
    queryKey: ['appointments', 'medical-documents', id] as const,
    queryFn: async () => {
      const res = await fetchMedicalDocuments(id!);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    enabled: Boolean(id && apt),
  });

  const title = appointmentPrescriptionTitle(role);
  const canPrescribe =
    (role === 'pro' || role === 'nurse') &&
    prescriptionGenerationEnabled(user) &&
    apt &&
    !isAppointmentCanceled(apt.status);

  if (detailBlock) {
    return (
      <StackChromeScreen title={title}>
        <AppointmentDetailBlockedEmptyState onBack={() => router.back()} block={detailBlock} />
      </StackChromeScreen>
    );
  }

  if (detailQ.isLoading || docsQ.isLoading || !apt) {
    return (
      <StackChromeScreen title={title}>
        <SkeletonStaffAppointmentDetail showAssignees={false} showActions={false} />
      </StackChromeScreen>
    );
  }

  if (!canPrescribe || !apt.patient_id) {
    return (
      <StackChromeScreen title={title}>
        <View style={styles.blocked}>
          <AppointmentDetailBlockedEmptyState
            onBack={() => router.back()}
            description="La prescription n'est pas disponible pour ce rendez-vous."
          />
        </View>
      </StackChromeScreen>
    );
  }

  const refreshDocs = () => {
    void docsQ.refetch();
  };

  return (
    <>
      <StackChromeScreen title={title}>
        <StackScrollView contentContainerStyle={styles.content}>
          <PrescriptionSection
            embedded
            appointmentId={id!}
            patientId={apt.patient_id}
            role={role}
            documents={docsQ.data ?? []}
            onDocumentsChanged={refreshDocs}
            onEditPatient={() => setEditPatientOpen(true)}
          />
        </StackScrollView>
      </StackChromeScreen>

      <StaffPatientEditSheet
        visible={editPatientOpen}
        patientId={apt.patient_id}
        onClose={() => setEditPatientOpen(false)}
        onSaved={() => void refreshDocs()}
      />
    </>
  );
}

function buildStyles(c: AppColors) {
  return {
    content: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[10],
      gap: spacing[3],
    },
    blocked: {
      flex: 1,
      backgroundColor: c.background,
      justifyContent: 'center' as const,
    },
  };
}
