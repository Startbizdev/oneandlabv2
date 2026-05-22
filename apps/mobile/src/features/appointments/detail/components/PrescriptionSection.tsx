import type { MedicalDocumentRow } from '../api/appointment-detail.service';
import { PrescriptionComposer } from '@/features/prescriptions/components/PrescriptionComposer';

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
  if (role !== 'pro') return null;

  return (
    <PrescriptionComposer
      appointmentId={appointmentId}
      documents={documents}
      onDocumentsChanged={onDocumentsChanged}
      initialText={initialPrescriptionText}
    />
  );
}
