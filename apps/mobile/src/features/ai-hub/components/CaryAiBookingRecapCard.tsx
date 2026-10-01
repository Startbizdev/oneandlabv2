import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/providers/ToastProvider';
import { AppText, MIN_TOUCH_TARGET, radius, spacing, useStyles, font, type Theme } from '@/theme';
import { buildAiDraftRecapBullets } from '../utils/build-ai-draft-recap-bullets';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import {
  cacheMedicalDocument,
  getCachedMedicalDocumentUri,
} from '@/lib/downloads/download-medical-document';

interface Props {
  draft: AiAppointmentDraft;
  confirming?: boolean;
  canConfirm?: boolean;
  onConfirm: (draft: AiAppointmentDraft) => void;
}

/** Récapitulatif de la demande de RDV préparée par Cary : libellé / valeur, puis validation. */
export function CaryAiBookingRecapCard({ draft, confirming, canConfirm = false, onConfirm }: Props) {
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const rows = useMemo(() => buildAiDraftRecapBullets(draft), [draft]);
  const [preview, setPreview] = useState<{ uri: string; fileName?: string } | null>(null);

  const openDoc = useCallback(
    async (medicalDocumentId: string, fileName?: string | null) => {
      let uri = await getCachedMedicalDocumentUri(medicalDocumentId, fileName ?? undefined);
      if (!uri) {
        const cached = await cacheMedicalDocument(medicalDocumentId, fileName ?? undefined);
        uri = cached.localUri ?? null;
      }
      if (uri) {
        setPreview({ uri, fileName: fileName ?? undefined });
      } else {
        toast('Aperçu indisponible pour le moment.', { type: 'error' });
      }
    },
    [toast],
  );

  return (
    <>
      <View style={styles.card}>
        <AppText variant="headline" style={styles.title}>
          Récapitulatif
        </AppText>
        {rows.map((row, index) => {
          const docId = row.medicalDocumentId;
          return (
            <Fragment key={`${row.label}-${index}`}>
              <View style={styles.divider} />
              <View style={styles.row}>
                <AppText variant="caption">{row.label}</AppText>
                {docId ? (
                  <Pressable
                    onPress={() => void openDoc(docId, row.value)}
                    style={styles.docLink}
                    accessibilityRole="button"
                    accessibilityLabel={`Aperçu ${row.value}`}
                  >
                    <AppText variant="body" style={styles.link}>
                      {row.value}
                    </AppText>
                  </Pressable>
                ) : (
                  <AppText variant="body">{row.value}</AppText>
                )}
              </View>
            </Fragment>
          );
        })}

        {draft.missing_fields?.length && canConfirm ? (
          <AppText variant="caption" style={styles.hint}>
            À compléter : {draft.missing_fields.join(', ')}
          </AppText>
        ) : null}

        {canConfirm ? (
          <View style={styles.footer}>
            <Button
              title="Valider"
              onPress={() => onConfirm(draft)}
              disabled={confirming}
              loading={confirming}
              fullWidth
            />
          </View>
        ) : null}
      </View>

      <MedicalDocumentPreviewModal
        visible={Boolean(preview)}
        localUri={preview?.uri ?? null}
        fileName={preview?.fileName}
        onClose={() => setPreview(null)}
      />
    </>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    card: {
      minWidth: 0,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
      paddingVertical: spacing[3],
    },
    title: { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: spacing[4],
      backgroundColor: c.borderLight,
    },
    row: {
      minWidth: 0,
      gap: spacing[0.5],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2.5],
    },
    docLink: { minHeight: MIN_TOUCH_TARGET - spacing[3], justifyContent: 'center' as const },
    link: { ...font.medium, color: c.primary, textDecorationLine: 'underline' as const },
    hint: { paddingHorizontal: spacing[4], paddingTop: spacing[2] },
    footer: { paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  };
}
