import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUser } from '@/features/profile/api/profile.service';
import { PrescriptionProfileGapsAlert } from '@/features/prescriptions/components/PrescriptionProfileGapsAlert';
import { PrescriptionSignatureSheet } from '@/features/prescriptions/components/PrescriptionSignatureSheet';
import { getPrescriptionProfileGaps } from '@/features/prescriptions/utils/prescription-profile-gaps';
import { StaffPatientEditSheet } from '@/features/patients/components/StaffPatientEditSheet';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';

/** Alerte champs manquants (RPPS, NIR…) — affichée en tête des onglets Documents passage. */
export function usePassagePrescriptionGapsAlert(patientId: string) {
  const user = useAuthStore((s) => s.user);
  const [editPatientId, setEditPatientId] = useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);

  const prescriberQ = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id, 'full')).data,
    enabled: Boolean(user?.id),
  });

  const patientQ = useQuery({
    queryKey: queryKeys.profile.user(patientId),
    queryFn: async () => (await fetchUser(patientId, 'full')).data,
    enabled: Boolean(patientId),
  });

  const gaps = useMemo(
    () =>
      getPrescriptionProfileGaps({
        patient: patientQ.data,
        prescriber: prescriberQ.data,
        prescriptionKind: 'nursing',
        prescriberRole: user?.role,
        includeSignature: true,
      }),
    [patientQ.data, prescriberQ.data, user?.role],
  );

  const alert =
    gaps.length > 0 ? (
      <>
        <PrescriptionProfileGapsAlert
          gaps={gaps}
          onEditPatient={() => setEditPatientId(patientId)}
          onSignPrescriber={() => setSignatureOpen(true)}
          prescriberRole={user?.role}
        />
        {editPatientId ? (
          <StaffPatientEditSheet
            visible
            patientId={editPatientId}
            onClose={() => setEditPatientId(null)}
            onSaved={() => {
              void patientQ.refetch();
              setEditPatientId(null);
            }}
          />
        ) : null}
        {user?.id ? (
          <PrescriptionSignatureSheet
            visible={signatureOpen}
            onClose={() => setSignatureOpen(false)}
            userId={user.id}
            initialPng={prescriberQ.data?.prescription_signature_png}
            onSaved={() => void prescriberQ.refetch()}
          />
        ) : null}
      </>
    ) : null;

  return { gapsAlert: alert, gapsCount: gaps.length };
}
