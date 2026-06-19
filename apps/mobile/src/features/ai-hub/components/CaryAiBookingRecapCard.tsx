import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';
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
  onReplaceDocument?: (docType: string) => void;
}

/** Récap RDV — liste à puces dans la bulle assistant. */
export function CaryAiBookingRecapCard({
  draft,
  confirming,
  canConfirm = false,
  onConfirm,
}: Props) {
  const styles = useThemedStyles(buildStyles);
  const bullets = useMemo(() => buildAiDraftRecapBullets(draft), [draft]);
  const [preview, setPreview] = useState<{ uri: string; fileName?: string } | null>(null);

  const openDoc = useCallback(async (medicalDocumentId: string, fileName?: string | null) => {
    let uri = await getCachedMedicalDocumentUri(medicalDocumentId, fileName ?? undefined);
    if (!uri) {
      const cached = await cacheMedicalDocument(medicalDocumentId, fileName ?? undefined);
      uri = cached.uri;
    }
    if (uri) {
      setPreview({ uri, fileName: fileName ?? undefined });
    }
  }, []);

  return (
    <>
      <View style={styles.block}>
        <Text style={styles.title}>Récapitulatif</Text>
        <View style={styles.list}>
          {bullets.map((row, index) => {
            const isDoc = Boolean(row.medicalDocumentId);
            const valueNode = isDoc ? (
              <Pressable
                onPress={() => void openDoc(row.medicalDocumentId!, row.value)}
                accessibilityRole="button"
                accessibilityLabel={`Aperçu ${row.value}`}
              >
                <Text style={[styles.value, styles.link]}>{row.value}</Text>
              </Pressable>
            ) : (
              <Text style={styles.value}>{row.value}</Text>
            );

            return (
              <Row key={`${row.label}-${index}`} align="start" gap={spacing[2]} style={styles.row}>
                <Text style={styles.bullet}>•</Text>
                <View style={styles.rowBody}>
                  <Text style={styles.label}>{row.label}</Text>
                  {valueNode}
                </View>
              </Row>
            );
          })}
        </View>

        {draft.missing_fields?.length && canConfirm ? (
          <Text style={styles.hint}>À compléter : {draft.missing_fields.join(', ')}</Text>
        ) : null}

        {canConfirm ? (
          <Row align="center" justify="end" gap={spacing[2]} style={styles.footer}>
            <Button
              title={confirming ? '…' : 'Valider'}
              onPress={() => onConfirm(draft)}
              disabled={confirming}
              loading={confirming}
              variant="primary"
              size="sm"
            />
          </Row>
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

function buildStyles(c: AppColors) {
  return {
    block: {
      minWidth: 0,
      gap: spacing[1.5],
    },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.3),
      color: c.textPrimary,
    },
    list: {
      gap: spacing[1.5],
    },
    row: {
      minWidth: 0,
    },
    bullet: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.35),
      color: c.primary,
      width: 12,
      flexShrink: 0,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
      gap: spacing[0.5],
    },
    label: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize['2xs'],
      lineHeight: lh(fontSize['2xs'], 1.3),
      color: c.textTertiary,
    },
    value: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.35),
      color: c.textPrimary,
    },
    link: {
      color: c.primary,
      textDecorationLine: 'underline' as const,
    },
    hint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize['2xs'],
      lineHeight: lh(fontSize['2xs'], 1.35),
      color: c.textTertiary,
    },
    footer: {
      marginTop: spacing[0.5],
    },
  };
}
