import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard, FileText, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { buildMedicalDocumentForm, uploadFormData } from '@/lib/uploads/upload-file';
import { fetchProfileDocuments } from '@/features/patients/api/patient-profile.service';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const DOC_TYPES = [
  { key: 'carte_vitale', label: 'Carte Vitale' },
  { key: 'carte_mutuelle', label: 'Carte mutuelle' },
  { key: 'ordonnance', label: 'Ordonnance' },
] as const;

interface Props {
  relativeId: string;
  title?: string;
}

export function PatientRelativeDocumentsSection({ relativeId, title = 'Documents' }: Props) {
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const docsQ = useQuery({
    queryKey: ['patient-documents', 'relative', relativeId],
    queryFn: async () => {
      const res = await fetchProfileDocuments({ relativeId });
      return res.data ?? [];
    },
  });

  const existing = new Set((docsQ.data ?? []).map((d) => d.document_type).filter(Boolean));

  const upload = useCallback(
    async (type: string) => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setLoading((p) => ({ ...p, [type]: true }));
      try {
        const fd = await buildMedicalDocumentForm(
          { uri: asset.uri, fileName: asset.fileName ?? `${type}.jpg` },
          { relative_id: relativeId, document_type: type },
        );
        await uploadFormData('/patient-documents/upload', fd);
        void qc.invalidateQueries({ queryKey: ['patient-documents', 'relative', relativeId] });
        toast('Document envoyé', { type: 'success' });
      } catch (e) {
        handleApiError(e, toast, 'relative-doc-upload');
      } finally {
        setLoading((p) => ({ ...p, [type]: false }));
      }
    },
    [qc, relativeId, toast],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.hint}>Carte Vitale, mutuelle, ordonnance pour ce proche.</Text>
      {DOC_TYPES.map((doc) => {
        const done = existing.has(doc.key);
        return (
          <View key={doc.key} style={[styles.card, elevation.xs]}>
            <View style={styles.row}>
              <CreditCard size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.label}>{doc.label}</Text>
              {done ? <Check size={16} color={colors.success} strokeWidth={2.5} /> : null}
            </View>
            <Pressable
              onPress={() => void upload(doc.key)}
              style={[styles.uploadBtn, done && styles.uploadBtnDone]}
              disabled={loading[doc.key]}
            >
              <Upload size={14} color={done ? colors.success : colors.primary} strokeWidth={2.5} />
              <Text style={styles.uploadLabel}>
                {loading[doc.key] ? 'Envoi…' : done ? 'Remplacer' : 'Importer'}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[2] },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing[2],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  label: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2.5],
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
  },
  uploadBtnDone: { backgroundColor: colors.successLight },
  uploadLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
});
