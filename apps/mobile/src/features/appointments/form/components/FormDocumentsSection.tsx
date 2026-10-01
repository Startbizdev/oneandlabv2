import { View } from 'react-native';
import { SERVICE_DOC_FIELDS } from '../constants/appointment-document-fields';
import type { PatientDocumentRow } from '@/features/patients/api/patient-profile.service';
import { MissingPrescriptionAlert } from './MissingPrescriptionAlert';
import { WizardDocumentFields } from './WizardDocumentFields';
import type { DocumentFileRef } from '../types/document-file-ref';
import { hasDocumentFile } from '../types/document-file-ref';
import { spacing, AppText, useStyles } from '@/theme';

interface Props {
  serviceType?: string;
  files: Record<string, DocumentFileRef | undefined>;
  profileDocs?: Record<string, PatientDocumentRow>;
  profileDocsLoading?: boolean;
  onPick: (key: string, file: DocumentFileRef | undefined) => void;
  skipPrescription?: boolean;
  /** patient : rappel des docs déjà en dossier */
  showProfileSummary?: boolean;
}

export function FormDocumentsSection({
  serviceType,
  files,
  profileDocs,
  profileDocsLoading,
  onPick,
  skipPrescription,
  showProfileSummary,
}: Props) {
  const styles = useStyles(buildStyles);
  const fields = skipPrescription
    ? SERVICE_DOC_FIELDS.filter((f) => f.key !== 'ordonnance')
    : SERVICE_DOC_FIELDS;

  const missingRx =
    !skipPrescription &&
    !hasDocumentFile(files, 'ordonnance', profileDocs);

  const profilePersonalOnFile =
    showProfileSummary &&
    (profileDocs?.carte_vitale ||
      profileDocs?.carte_mutuelle ||
      profileDocs?.attestation_droits_ame);

  return (
    <View style={styles.wrapper}>
      <WizardDocumentFields
        fields={fields}
        files={files}
        profileDocs={profileDocs}
        onChange={onPick}
        loadingProfile={profileDocsLoading}
      />

      {profilePersonalOnFile ? (
        <AppText variant="secondary">Vos cartes Vitale et mutuelle sont déjà dans votre dossier.</AppText>
      ) : null}

      <MissingPrescriptionAlert serviceType={serviceType} visible={missingRx} />
    </View>
  );
}

function buildStyles() {
  return {
    wrapper: { gap: spacing[3] },
  };
}
