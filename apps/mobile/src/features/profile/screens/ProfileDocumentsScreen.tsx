import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check, CreditCard, FileText, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { buildMedicalDocumentForm, uploadFormData } from '@/lib/uploads/upload-file';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface DocType {
  key: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
}

const DOC_TYPES: DocType[] = [
  {
    key: 'carte_vitale',
    label: 'Carte Vitale',
    hint: 'Assurance maladie obligatoire',
    icon: <CreditCard size={20} color={colors.primary} strokeWidth={2} />,
  },
  {
    key: 'carte_mutuelle',
    label: 'Carte mutuelle',
    hint: 'Complémentaire santé',
    icon: <CreditCard size={20} color={colors.success} strokeWidth={2} />,
  },
  {
    key: 'ordonnance',
    label: 'Ordonnance',
    hint: 'Prescription médicale',
    icon: <FileText size={20} color={colors.warning} strokeWidth={2} />,
  },
];

function ProfileDocumentsContent({ showSubtitle }: { showSubtitle?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const { show: toast } = useToast();
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function upload(type: string) {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0] || !user?.id) return;
    const asset = result.assets[0];
    setLoading((prev) => ({ ...prev, [type]: true }));
    try {
      const fd = await buildMedicalDocumentForm(
        { uri: asset.uri, fileName: asset.fileName ?? `${type}.jpg` },
        { user_id: user.id, document_type: type },
      );
      await uploadFormData('/patient-documents/upload', fd);
      setUploaded((prev) => ({ ...prev, [type]: true }));
      toast('Document envoyé', { type: 'success' });
    } catch (e) {
      handleApiError(e, toast, 'patient-documents/upload');
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  }

  return (
    <View style={styles.contentBlock}>
      {showSubtitle ? (
        <Text style={styles.subtitle}>Importez vos documents médicaux sécurisés</Text>
      ) : null}

      <View style={styles.docList}>
          {DOC_TYPES.map((doc, i) => (
            <Animated.View
              key={doc.key}
              entering={FadeInDown.delay(i * 70 + 60).duration(300).springify()}
              style={[styles.docCard, elevation.xs]}
            >
              <View style={styles.docHeader}>
                <View style={styles.docIconWrap}>{doc.icon}</View>
                <View style={styles.docInfo}>
                  <Text style={styles.docLabel}>{doc.label}</Text>
                  <Text style={styles.docHint}>{doc.hint}</Text>
                </View>
                {uploaded[doc.key] ? (
                  <View style={styles.checkBadge}>
                    <Check size={14} color={colors.success} strokeWidth={2.5} />
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={() => upload(doc.key)}
                style={[styles.uploadBtn, uploaded[doc.key] && styles.uploadBtnDone]}
                disabled={loading[doc.key]}
              >
                <Upload size={14} color={uploaded[doc.key] ? colors.success : colors.primary} strokeWidth={2.5} />
                <Text style={[styles.uploadLabel, uploaded[doc.key] && styles.uploadLabelDone]}>
                  {loading[doc.key] ? 'Envoi…' : uploaded[doc.key] ? 'Remplacer' : 'Importer'}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(300).duration(280).springify()} style={styles.infoBox}>
          <Text style={styles.infoText}>
            Vos documents sont chiffrés et stockés de façon sécurisée. Seuls les professionnels de santé autorisés peuvent y accéder.
          </Text>
        </Animated.View>
    </View>
  );
}

/** Page dédiée documents (route /profile/documents) — patient uniquement */
export function ProfileDocumentsScreen() {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <ProfileDocumentsContent showSubtitle />
      </ScrollView>
    </View>
  );
}

/** Intégré dans ProfileScreen patient */
export function ProfileDocumentsEmbedded() {
  return <ProfileDocumentsContent />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  contentBlock: {
    gap: spacing[3],
  },
  header: {
    paddingTop: spacing[2],
    gap: spacing[1],
  },
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  docList: { gap: spacing[3] },
  docCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docInfo: { flex: 1, gap: 2 },
  docLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  docHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2.5],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  uploadBtnDone: {
    borderColor: colors.successMid,
    backgroundColor: colors.successLight,
  },
  uploadLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  uploadLabelDone: {
    color: colors.success,
  },
  infoBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  infoText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    lineHeight: fontSize.xs * 1.6,
    textAlign: 'center',
  },
});
