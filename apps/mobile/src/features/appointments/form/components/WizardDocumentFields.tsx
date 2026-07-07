import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { Check, FileText, Upload } from 'lucide-react-native';
import type { PatientDocumentRow } from '@/features/patients/api/patient-profile.service';
import { getDocumentTypeLabel } from '@/features/appointments/detail/utils/document-labels';
import { pickMedicalDocumentFile } from '@/lib/uploads/pick-medical-document';
import type { AppointmentDocFieldDef } from '../constants/appointment-document-fields';
import {
  hasDocumentFile,
  isLocalFileRef,
  isProfileDocRef,
  profileDocRefFromRow,
  type DocumentFileRef,
} from '../types/document-file-ref';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title?: string;
  subtitle?: string;
  fields: AppointmentDocFieldDef[];
  files: Record<string, DocumentFileRef | undefined>;
  profileDocs?: Record<string, PatientDocumentRow>;
  onChange: (key: string, file: DocumentFileRef | undefined) => void;
  loadingProfile?: boolean;
}

export function WizardDocumentFields({
  title,
  subtitle,
  fields,
  files,
  profileDocs,
  onChange,
  loadingProfile,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_WizardDocumentFields_tsx_styles');
  async function pick(key: string) {
    const picked = await pickMedicalDocumentFile();
    if (!picked) return;
    onChange(key, {
      uri: picked.uri,
      name: picked.fileName,
      mimeType: picked.mimeType,
    });
  }

  function applyProfile(key: string) {
    const row = profileDocs?.[key];
    const ref = row ? profileDocRefFromRow(key, row) : undefined;
    if (ref) onChange(key, ref);
  }

  return (
    <View style={styles.wrapper}>
      {title ? <AppText style={styles.sectionLabel}>{title}</AppText> : null}
      {subtitle ? (
        <AppText style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </AppText>
      ) : null}
      {loadingProfile ? (
        <Row gap={spacing[2]} align="center" style={styles.loadingRow}>
          <ActivityIndicator size="small" color={c.primary} />
          <AppText style={styles.loadingText}>Chargement de votre dossier…</AppText>
        </Row>
      ) : null}

      {fields.map((f) => {
        const entry = files[f.key];
        const profileRow = profileDocs?.[f.key];
        const fromProfile = isProfileDocRef(entry) || Boolean(profileRow?.medical_document_id);
        const local = isLocalFileRef(entry);
        const done = hasDocumentFile(files, f.key, profileDocs);
        const displayName =
          (local && entry.name) ||
          (isProfileDocRef(entry) && entry.file_name) ||
          profileRow?.file_name ||
          getDocumentTypeLabel(f.key);

        return (
          <Pressable
            key={f.key}
            onPress={() => {
              if (profileRow && !local) {
                applyProfile(f.key);
                return;
              }
              void pick(f.key);
            }}
            style={[styles.docRow, done && styles.docRowDone]}
          >
            <Cluster
              gap={spacing[3]}
              leading={
                <View style={[styles.docIcon, done && styles.docIconDone]}>
                  {done ? (
                    <Check size={iconSize.xs} color={c.success} strokeWidth={2.5} />
                  ) : (
                    <Upload size={iconSize.xs} color={c.primary} strokeWidth={2} />
                  )}
                </View>
              }
              actions={
                done && local ? (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      if (profileRow) applyProfile(f.key);
                      else onChange(f.key, undefined);
                    }}
                    hitSlop={8}
                  >
                    <AppText style={styles.replaceLink}>
                      {profileRow ? 'Dossier' : 'Modifier'}
                    </AppText>
                  </Pressable>
                ) : null
              }
            >
              <View style={styles.docTextCol}>
                <AppText style={[styles.docLabel, done && styles.docLabelDone]}>
                  {f.label}
                  {done ? ' · OK' : ''}
                </AppText>
                {f.hint && !done ? <AppText style={styles.docHint}>{f.hint}</AppText> : null}
                {done ? (
                  <Row gap={4} align="center">
                    <FileText size={iconSize['2xs']} color={c.textSecondary} strokeWidth={2} />
                    <AppText style={styles.fileMeta} numberOfLines={1}>
                      {fromProfile && !local ? 'Déjà enregistré — ' : ''}
                      {displayName}
                    </AppText>
                  </Row>
                ) : null}
              </View>
            </Cluster>
          </Pressable>
        );
      })}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrapper: { gap: spacing[2] },
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.primaryDark,
  },
  loadingRow: {
    paddingVertical: spacing[1],
  },
  loadingText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  docRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  docRowDone: {
    borderColor: c.successMid,
    backgroundColor: c.successLight,
  },
  docIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  docIconDone: {
    backgroundColor: c.successLight,
  },
  docTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  docLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  docLabelDone: {
    color: c.success,
  },
  docHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  fileMeta: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  replaceLink: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
  },
};
}

