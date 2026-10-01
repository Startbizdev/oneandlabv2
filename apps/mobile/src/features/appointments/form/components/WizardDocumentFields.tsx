import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Check, Upload } from 'lucide-react-native';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/providers/ToastProvider';
import type { PatientDocumentRow } from '@/features/patients/api/patient-profile.service';
import { getDocumentTypeLabel } from '@/features/appointments/detail/utils/document-labels';
import {
  medicalDocumentPickErrorMessage,
  pickMedicalDocumentFile,
} from '@/lib/uploads/pick-medical-document';
import type { AppointmentDocFieldDef } from '../constants/appointment-document-fields';
import {
  hasDocumentFile,
  isLocalFileRef,
  isProfileDocRef,
  profileDocRefFromRow,
  type DocumentFileRef,
} from '../types/document-file-ref';
import {
  ICON_STROKE_WIDTH,
  radius,
  spacing,
  iconSize,
  AppText,
  useAppColors,
  useStyles,
  type Theme,
} from '@/theme';

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
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();

  async function pick(key: string) {
    try {
      const picked = await pickMedicalDocumentFile();
      if (!picked) return;
      onChange(key, {
        uri: picked.uri,
        name: picked.fileName,
        mimeType: picked.mimeType,
      });
    } catch (e) {
      toast(medicalDocumentPickErrorMessage(e), { type: 'error' });
    }
  }

  function applyProfile(key: string) {
    const row = profileDocs?.[key];
    const ref = row ? profileDocRefFromRow(key, row) : undefined;
    if (ref) onChange(key, ref);
  }

  return (
    <View style={styles.wrapper}>
      {title || subtitle ? (
        <View style={styles.header}>
          {title ? (
            <AppText variant="headline" accessibilityRole="header">
              {title}
            </AppText>
          ) : null}
          {subtitle ? <AppText variant="secondary">{subtitle}</AppText> : null}
        </View>
      ) : null}
      {loadingProfile ? (
        <Row gap={spacing[2]} align="center">
          <ActivityIndicator size="small" color={c.textSecondary} />
          <AppText variant="secondary">Chargement de votre dossier…</AppText>
        </Row>
      ) : null}

      <View style={styles.card}>
        {fields.map((f, index) => {
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
          const detail = done
            ? `${fromProfile && !local ? 'Dans votre dossier · ' : ''}${displayName}`
            : f.hint;

          const onRowPress = () => {
            if (profileRow && !local) {
              applyProfile(f.key);
              return;
            }
            void pick(f.key);
          };

          return (
            <Pressable
              key={f.key}
              onPress={onRowPress}
              accessibilityRole="button"
              accessibilityLabel={done ? `${f.label}, ajouté : ${displayName}` : `Ajouter ${f.label}`}
              style={({ pressed }) => [pressed && styles.rowPressed]}
            >
              <ListRowShell
                topBorder={index > 0}
                leading={
                  <View style={[styles.docIcon, done && styles.docIconDone]}>
                    {done ? (
                      <Check size={iconSize.md} color={c.success} strokeWidth={ICON_STROKE_WIDTH} />
                    ) : (
                      <Upload size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
                    )}
                  </View>
                }
                body={
                  <View style={styles.texts}>
                    <AppText variant="body" style={styles.label}>
                      {f.label}
                    </AppText>
                    {detail ? <AppText variant="caption" style={styles.detail}>{detail}</AppText> : null}
                  </View>
                }
                trailing={
                  done && local ? (
                    <Button
                      title={profileRow ? 'Dossier' : 'Retirer'}
                      variant="ghost"
                      size="sm"
                      accessibilityLabel={
                        profileRow ? `Reprendre ${f.label} du dossier` : `Retirer ${f.label}`
                      }
                      onPress={() => {
                        if (profileRow) applyProfile(f.key);
                        else onChange(f.key, undefined);
                      }}
                    />
                  ) : done ? null : (
                    <AppText variant="body" style={styles.addLink}>
                      Ajouter
                    </AppText>
                  )
                }
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    wrapper: { gap: spacing[2] },
    header: { gap: spacing[0.5] },
    card: {
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
      overflow: 'hidden' as const,
    },
    rowPressed: { backgroundColor: c.surfaceAlt },
    docIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    docIconDone: { backgroundColor: c.successLight },
    texts: { gap: spacing[0.5] },
    label: { color: c.textPrimary },
    detail: { color: c.textSecondary },
    addLink: { color: c.textLink },
  };
}
