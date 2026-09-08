import type { MedicalDocumentRow } from '../api/appointment-detail.service';
import { PrescriptionComposer } from '@/features/prescriptions/components/PrescriptionComposer';
import { resolvePrescriptionKindForRole } from '@oneandlab/shared-utils';
import type { PrescriptionKind } from '@/features/prescriptions/api/prescriptions.service';

interface Props {
  appointmentId?: string;
  patientId: string;
  role: string;
  documents?: MedicalDocumentRow[];
  onDocumentsChanged?: () => void | Promise<void>;
  initialPrescriptionText?: string;
  onEditPatient?: () => void;
  embedded?: boolean;
}

export function PrescriptionSection({
  appointmentId,
  patientId,
  role,
  documents = [],
  onDocumentsChanged,
  initialPrescriptionText,
  onEditPatient,
  embedded = false,
}: Props) {
  if (role !== 'pro' && role !== 'nurse') return null;

  const prescriptionKind: PrescriptionKind = resolvePrescriptionKindForRole(role);

  return (
    <PrescriptionComposer
      patientId={patientId}
      appointmentId={appointmentId ?? null}
      documents={documents}
      onDocumentsChanged={onDocumentsChanged}
      initialText={initialPrescriptionText}
      prescriptionKind={prescriptionKind}
      onEditPatient={onEditPatient}
      embedded={embedded}
    />
  );
}
