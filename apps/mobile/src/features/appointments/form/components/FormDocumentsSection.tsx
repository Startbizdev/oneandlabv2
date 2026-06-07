import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { View, StyleSheet, Text } from 'react-native';
import { SERVICE_DOC_FIELDS } from '../constants/appointment-document-fields';
import type { PatientDocumentRow } from '@/features/patients/api/patient-profile.service';
import { MissingPrescriptionAlert } from './MissingPrescriptionAlert';
import { WizardDocumentFields } from './WizardDocumentFields';
import type { DocumentFileRef } from '../types/document-file-ref';
import { hasDocumentFile } from '../types/document-file-ref';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { colors } from '@/theme';

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
  const fields = skipPrescription
    ? SERVICE_DOC_FIELDS.filter((f) => f.key !== 'ordonnance')
    : SERVICE_DOC_FIELDS;

  const missingRx =
    !skipPrescription &&
    !hasDocumentFile(files, 'ordonnance', profileDocs);

  const profilePersonalOnFile =
    showProfileSummary &&
    (profileDocs?.carte_vitale || profileDocs?.carte_mutuelle);

  return (
    <View style={styles.wrapper}>
      {profilePersonalOnFile ? (
        <View style={styles.profileBanner}>
          <Text style={styles.profileBannerText}>
            Votre Carte Vitale et mutuelle sont déjà enregistrées. Ajoutez seulement l’ordonnance
            pour ce rendez-vous.
          </Text>
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

function buildStyles(c: AppColors) {
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
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.primaryDark,
    lineHeight: fontSize.sm * 1.45,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_form_components_FormDocumentsSection_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
