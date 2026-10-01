import { View, StyleSheet } from 'react-native';
import { SERVICE_DOC_FIELDS } from '../constants/appointment-document-fields';
import type { PatientDocumentRow } from '@/features/patients/api/patient-profile.service';
import { MissingPrescriptionAlert } from './MissingPrescriptionAlert';
import { WizardDocumentFields } from './WizardDocumentFields';
import type { DocumentFileRef } from '../types/document-file-ref';
import { hasDocumentFile } from '../types/document-file-ref';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  serviceName?: string;
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
  serviceName,
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
      {profilePersonalOnFile ? (
        <View style={styles.profileBanner}>
          <AppText style={styles.profileBannerText}>
            Vos documents de couverture (Vitale, mutuelle, attestation) sont déjà enregistrés. Ajoutez
            seulement l’ordonnance pour ce rendez-vous.
          </AppText>
        </View>
      ) : null}

      <WizardDocumentFields
        title="Documents"
        subtitle={serviceName}
        fields={fields}
        files={files}
        profileDocs={profileDocs}
        onChange={onPick}
        loadingProfile={profileDocsLoading}
      />

      <MissingPrescriptionAlert serviceType={serviceType} visible={missingRx} />
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  wrapper: { gap: spacing[3] },
  profileBanner: {
    padding: spacing[3],
    borderRadius: 12,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  profileBannerText: {
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.primaryDark,
    lineHeight: fontSize.sm * 1.45,
  },
};
}

