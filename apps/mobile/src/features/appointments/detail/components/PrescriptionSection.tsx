import type { MedicalDocumentRow } from '../api/appointment-detail.service';
import { PrescriptionComposer } from '@/features/prescriptions/components/PrescriptionComposer';
import type { PrescriptionKind } from '@/features/prescriptions/api/prescriptions.service';

interface Props {
  appointmentId: string;
  role: string;
  documents: MedicalDocumentRow[];
  onDocumentsChanged?: () => void | Promise<void>;
  initialPrescriptionText?: string;
}

export function PrescriptionSection({
  appointmentId,
  role,
  documents,
  onDocumentsChanged,
  initialPrescriptionText,
}: Props) {
  if (role !== 'pro' && role !== 'nurse') return null;

  const prescriptionKind: PrescriptionKind = role === 'nurse' ? 'nursing' : 'medical';

  return (
    <PrescriptionComposer
      appointmentId={appointmentId}
      documents={documents}
      onDocumentsChanged={onDocumentsChanged}
      initialText={initialPrescriptionText}
      prescriptionKind={prescriptionKind}
    />
  );
}
