import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, CreditCard } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { buildFieldStyles } from '@/components/ui/field-styles';
import { api } from '@/api/client';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { medicalDocumentPickErrorMessage } from '@/lib/uploads/pick-medical-document';
import { uploadMedicalDocument } from '@/lib/uploads/upload-file';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import {
  filterCoverageProfileDocuments,
  type PatientDocumentRow,
} from '@/features/patients/api/patient-profile.service';
import { useAppColors } from '@/theme/use-app-colors';
import { AppText, ICON_STROKE_WIDTH, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';
import type { LocalFileRef } from '@/features/appointments/form/types';
import { pickPrescriptionPage } from '../api/prescription-pages';

const COVERAGE_SLOTS = [
  { type: 'carte_vitale', label: 'Carte Vitale' },
  { type: 'carte_mutuelle', label: 'Mutuelle' },
] as const;

type CoverageType = (typeof COVERAGE_SLOTS)[number]['type'];

interface Props {
  patientId: string;
  relativeId: string | null;
}

/**
 * Carte Vitale et mutuelle du bénéficiaire : rangées dans sa fiche patient (pas dans l'ordonnance),
 * la pharmacie destinataire les consulte depuis la commande.
 */
export function PharmacyOrderCoverageDocuments({ patientId, relativeId }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const field = useStyles(buildFieldStyles);
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [pending, setPending] = useState<CoverageType | null>(null);

  const queryKey = relativeId
    ? [...queryKeys.documents.relative(relativeId), 'coverage', patientId]
    : [...queryKeys.documents.patient(patientId), 'coverage'];

  const docsQ = useQuery({
    queryKey,
    queryFn: async () => {
      const qs = new URLSearchParams({ user_id: patientId });
      if (relativeId) qs.set('relative_id', relativeId);
      const res = await api.get<PatientDocumentRow[]>(`/patient-documents?${qs.toString()}`);
      if (!res.success) throw new Error(res.error ?? 'Documents indisponibles');
      return filterCoverageProfileDocuments(res.data);
    },
    enabled: Boolean(patientId),
    retry: false,
  });

  const uploadMut = useMutation({
    mutationFn: async ({ type, file }: { type: CoverageType; file: LocalFileRef }) => {
      const uploaded = await uploadMedicalDocument(
        { uri: file.uri, fileName: file.name, mimeType: file.mimeType },
        { user_id: patientId, relative_id: relativeId ?? undefined, document_type: type },
        '/patient-documents/upload',
      );
      if (!uploaded?.id) throw new Error('Envoi du document impossible');
    },
    onSuccess: async () => {
      toast('Ajouté à la fiche patient', { type: 'success' });
      await qc.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
    onError: (e) => handleApiError(e, toast, 'pharmacy-order-coverage-upload'),
    onSettled: () => setPending(null),
  });

  const addDocument = async (type: CoverageType) => {
    let file: LocalFileRef | null;
    try {
      file = await pickPrescriptionPage();
    } catch (e) {
      toast(medicalDocumentPickErrorMessage(e), { type: 'error' });
      return;
    }
    if (!file) return;
    setPending(type);
    uploadMut.mutate({ type, file });
  };

  // Dossier non accessible (ex. pharmacie qui prépare pour un patient hors de son périmètre) : rien à proposer.
  if (docsQ.isError) return null;

  const byType = new Map((docsQ.data ?? []).map((row) => [row.document_type, row]));

  return (
    <View style={styles.block}>
      <AppText style={field.label}>Carte Vitale et mutuelle</AppText>
      <AppText variant="secondary">
        Enregistrées dans la fiche patient : la pharmacie y a accès et vous n’aurez pas à les remettre.
      </AppText>
      {docsQ.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : (
        COVERAGE_SLOTS.map((slot) => {
          const existing = byType.get(slot.type);
          const busy = pending === slot.type;
          return (
            <View key={slot.type} style={styles.row}>
              {existing ? (
                <CircleCheck size={iconSize.md} color={c.success} strokeWidth={ICON_STROKE_WIDTH} />
              ) : (
                <CreditCard size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
              )}
              <View style={styles.body}>
                <AppText style={styles.title}>{slot.label}</AppText>
                <AppText variant="caption" numberOfLines={1}>
                  {existing ? 'Dans la fiche patient' : 'Non fournie'}
                </AppText>
              </View>
              <Button
                title={existing ? 'Remplacer' : 'Ajouter'}
                variant={existing ? 'ghost' : 'outline'}
                size="sm"
                loading={busy}
                disabled={uploadMut.isPending}
                onPress={() => void addDocument(slot.type)}
              />
            </View>
          );
        })
      )}
    </View>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    block: { gap: spacing[2] },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[3],
      paddingVertical: spacing[2],
      paddingLeft: spacing[3],
      paddingRight: spacing[1],
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    body: { flex: 1, minWidth: 0 },
    title: { ...text.body, color: c.textPrimary },
  } as const;
}
