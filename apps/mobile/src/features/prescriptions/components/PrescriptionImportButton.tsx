import { useMutation } from '@tanstack/react-query';
import { FileUp } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { handleApiError } from '@/lib/errors/handle-api-error';
import {
  medicalDocumentPickErrorMessage,
  pickMedicalDocumentFile,
  type PickedMedicalDocument,
} from '@/lib/uploads/pick-medical-document';
import { uploadMedicalDocument } from '@/lib/uploads/upload-file';
import { useToast } from '@/providers/ToastProvider';
import { ICON_STROKE_WIDTH, iconSize, useAppColors } from '@/theme';

type Props = {
  patientId: string;
  onImported: () => void;
};

/** Ordonnance existante (photo, galerie ou fichier) rangée dans le dossier du patient : POST /medical-documents, type `ordonnance`. */
export function PrescriptionImportButton({ patientId, onImported }: Props) {
  const c = useAppColors();
  const { show: toast } = useToast();

  const importMut = useMutation({
    mutationFn: (picked: PickedMedicalDocument) =>
      uploadMedicalDocument(picked, { document_type: 'ordonnance', patient_id: patientId }),
    onSuccess: () => {
      toast('Ordonnance ajoutée au dossier', { type: 'success' });
      onImported();
    },
    onError: (e) => handleApiError(e, toast, 'prescription-import'),
  });

  const importPrescription = async () => {
    if (importMut.isPending) return;
    try {
      const picked = await pickMedicalDocumentFile();
      if (picked) importMut.mutate(picked);
    } catch (e) {
      toast(medicalDocumentPickErrorMessage(e), { type: 'error' });
    }
  };

  return (
    <Button
      title="Ajouter une ordonnance"
      variant="secondary"
      fullWidth
      leftIcon={<FileUp size={iconSize.sm} color={c.textLink} strokeWidth={ICON_STROKE_WIDTH} />}
      loading={importMut.isPending}
      onPress={() => void importPrescription()}
      accessibilityHint="Photo ou fichier d’une ordonnance existante, rangée dans le dossier du patient"
    />
  );
}
