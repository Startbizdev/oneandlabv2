import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { STAFF_PATIENT_BOOKING_CONSENT_ERROR } from '@oneandlab/shared-constants';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/providers/ToastProvider';
import { AppText, MIN_TOUCH_TARGET, radius, spacing, useStyles, font, type Theme } from '@/theme';
import type { AiBookingConsent } from '../hooks/use-ai-booking-draft';
import { buildAiDraftRecapBullets } from '../utils/build-ai-draft-recap-bullets';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import { StaffPatientBookingConsentRow } from '@/features/patients/components/StaffPatientBookingConsentRow';
import {
  cacheMedicalDocument,
  getCachedMedicalDocumentUri,
} from '@/lib/downloads/download-medical-document';

interface Props {
  draft: AiAppointmentDraft;
  confirming?: boolean;
  canConfirm?: boolean;
  /** Infirmier / pro : consentement du patient à cocher avant « Confirmer la demande ». */
  consent?: AiBookingConsent | null;
  onConfirm: (draft: AiAppointmentDraft) => void;
  /** Modifier une ligne : Cary reçoit la demande de correction via le compositeur. */
  onEditRow?: (label: string) => void;
}

/** Récapitulatif de la demande de RDV préparée par Cary : chaque ligne modifiable, puis confirmation. */
export function CaryAiBookingRecapCard({ draft, confirming, canConfirm = false, consent, onConfirm, onEditRow }: Props) {
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const rows = useMemo(() => buildAiDraftRecapBullets(draft), [draft]);
  const editable = Boolean(onEditRow) && draft.status !== 'confirmed' && !confirming;
  const [preview, setPreview] = useState<{ uri: string; fileName?: string } | null>(null);

  const openDoc = useCallback(
    async (medicalDocumentId: string, fileName?: string | null) => {
      try {
        let uri = await getCachedMedicalDocumentUri(medicalDocumentId, fileName ?? undefined);
        if (!uri) {
          const cached = await cacheMedicalDocument(medicalDocumentId, fileName ?? undefined);
          uri = cached.localUri ?? null;
        }
        if (uri) {
          setPreview({ uri, fileName: fileName ?? undefined });
          return;
        }
      } catch (e) {
        console.warn('[cary-ai] aperçu du document impossible', e);
      }
      toast('Aperçu indisponible pour le moment.', { type: 'error' });
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
                <View style={styles.rowText}>
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
                {editable && onEditRow ? (
                  <Button
                    title="Modifier"
                    variant="ghost"
                    size="sm"
                    onPress={() => onEditRow(row.label)}
                    accessibilityLabel={`Modifier ${row.label}`}
                  />
                ) : null}
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
            {consent ? (
              <>
                <StaffPatientBookingConsentRow
                  checked={consent.checkedDraftId === draft.id}
                  error={consent.errorDraftId === draft.id}
                  onToggle={() => consent.toggle(draft.id)}
                />
                {consent.errorDraftId === draft.id ? (
                  <AppText variant="caption" style={styles.error} accessibilityRole="alert">
                    {STAFF_PATIENT_BOOKING_CONSENT_ERROR}
                  </AppText>
                ) : null}
              </>
            ) : null}
            <Button
              title="Confirmer la demande"
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
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
      paddingLeft: spacing[4],
      paddingRight: spacing[2],
      paddingVertical: spacing[2.5],
    },
    rowText: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    docLink: { minHeight: MIN_TOUCH_TARGET - spacing[3], justifyContent: 'center' as const },
    link: { ...font.medium, color: c.primary, textDecorationLine: 'underline' as const },
    hint: { paddingHorizontal: spacing[4], paddingTop: spacing[2] },
    footer: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[3] },
    error: { color: c.error },
  };
}
