import { FileText } from 'lucide-react-native';
import { appointmentDocumentsRowHint, appointmentDocumentsRowVisible } from '@oneandlab/shared-utils';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import { canUploadMedicalDocumentsForAppointmentStatus } from '@/utils/appointment-documents-upload';
import type { MedicalDocumentRow } from '../api/appointment-detail.service';

type AppointmentDocumentsRowInput = {
  /** Documents listés sur la vue dédiée (même filtre que celle-ci). */
  documents: MedicalDocumentRow[];
  loading: boolean;
  failed: boolean;
  appointmentStatus: unknown;
  onPress: () => void;
};

/** Ligne « Documents » des fiches RDV et passage, qui ouvre leur vue dédiée ; `null` si rien à consulter ni à ajouter. */
export function appointmentDocumentsRow({
  documents,
  loading,
  failed,
  appointmentStatus,
  onPress,
}: AppointmentDocumentsRowInput): SettingsRowProps | null {
  const canUpload = canUploadMedicalDocumentsForAppointmentStatus(appointmentStatus);
  const settled = !loading && !failed;
  if (settled && !appointmentDocumentsRowVisible(documents.length, canUpload)) return null;
  return {
    icon: FileText,
    label: 'Documents',
    value: documents.length > 0 ? String(documents.length) : undefined,
    description: settled ? appointmentDocumentsRowHint(documents, canUpload) : undefined,
    onPress,
  };
}
